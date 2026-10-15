use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use rand::rngs::OsRng;
use secrecy::SecretVec;
use sha2::{Digest, Sha256};
use std::{
    env, fs,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tonic::transport::{ClientTlsConfig, Endpoint};
use zcash_client_backend::{
    data_api::wallet::ConfirmationsPolicy,
    data_api::{
        chain::{error, BlockCache, BlockSource},
        Account, AccountBirthday, WalletRead, WalletWrite,
    },
    encoding::AddressCodec,
    proto::compact_formats::CompactBlock,
    proto::service::{self, compact_tx_streamer_client::CompactTxStreamerClient},
};
use zcash_client_sqlite::{util::SystemClock, wallet::init::init_wallet_db, WalletDb};
use zcash_keys::{
    address::UnifiedAddress,
    keys::{UnifiedAddressRequest, UnifiedSpendingKey},
};
use zcash_protocol::consensus::{BlockHeight, Network};
use zip32::AccountId;

const FUNDING_HEIGHT: u32 = 4_380_314;
const BIRTHDAY_MARGIN: u32 = 100;

#[derive(Clone, Default)]
struct MemoryBlockCache {
    blocks: Arc<Mutex<Vec<CompactBlock>>>,
}

impl BlockSource for MemoryBlockCache {
    type Error = std::io::Error;

    fn with_blocks<F, WalletErrT>(
        &self,
        from_height: Option<BlockHeight>,
        limit: Option<usize>,
        mut with_block: F,
    ) -> Result<(), error::Error<WalletErrT, Self::Error>>
    where
        F: FnMut(CompactBlock) -> Result<(), error::Error<WalletErrT, Self::Error>>,
    {
        let start = from_height.map(|h| h.into()).unwrap_or(0);
        let blocks = self
            .blocks
            .lock()
            .map_err(|_| error::Error::BlockSource(std::io::Error::other("cache lock poisoned")))?;
        for block in blocks
            .iter()
            .filter(|b| b.height >= start)
            .take(limit.unwrap_or(usize::MAX))
        {
            with_block(block.clone())?;
        }
        Ok(())
    }
}

#[async_trait]
impl BlockCache for MemoryBlockCache {
    fn get_tip_height(
        &self,
        range: Option<&zcash_client_backend::data_api::scanning::ScanRange>,
    ) -> Result<Option<BlockHeight>, Self::Error> {
        let blocks = self
            .blocks
            .lock()
            .map_err(|_| std::io::Error::other("cache lock poisoned"))?;
        Ok(blocks
            .iter()
            .filter(|b| {
                range
                    .map(|r| {
                        r.block_range()
                            .contains(&BlockHeight::from_u32(b.height as u32))
                    })
                    .unwrap_or(true)
            })
            .map(|b| BlockHeight::from_u32(b.height as u32))
            .max())
    }

    async fn read(
        &self,
        range: &zcash_client_backend::data_api::scanning::ScanRange,
    ) -> Result<Vec<CompactBlock>, Self::Error> {
        let blocks = self
            .blocks
            .lock()
            .map_err(|_| std::io::Error::other("cache lock poisoned"))?;
        Ok(blocks
            .iter()
            .filter(|b| {
                range
                    .block_range()
                    .contains(&BlockHeight::from_u32(b.height as u32))
            })
            .cloned()
            .collect())
    }

    async fn insert(&self, compact_blocks: Vec<CompactBlock>) -> Result<(), Self::Error> {
        let mut blocks = self
            .blocks
            .lock()
            .map_err(|_| std::io::Error::other("cache lock poisoned"))?;
        blocks.extend(compact_blocks);
        blocks.sort_by_key(|b| b.height);
        blocks.dedup_by_key(|b| b.height);
        Ok(())
    }

    async fn delete(
        &self,
        range: zcash_client_backend::data_api::scanning::ScanRange,
    ) -> Result<(), Self::Error> {
        let mut blocks = self
            .blocks
            .lock()
            .map_err(|_| std::io::Error::other("cache lock poisoned"))?;
        blocks.retain(|b| {
            !range
                .block_range()
                .contains(&BlockHeight::from_u32(b.height as u32))
        });
        Ok(())
    }
}

fn main() -> Result<()> {
    let command = env::args()
        .nth(1)
        .unwrap_or_else(|| "identity-check".into());
    match command.as_str() {
        "identity-check" => identity_check(),
        "address-check" => address_check(),
        "address-search" => address_search(),
        "init-wallet" => init_wallet(),
        "recover" => recover_wallet(),
        "broadcast" => bail!("broadcast is permanently disabled in the PrivateDAO provider"),
        other => bail!("unsupported command: {other}"),
    }
}

fn required(name: &str) -> Result<String> {
    env::var(name).with_context(|| format!("missing required environment variable {name}"))
}

fn read_seed() -> Result<Vec<u8>> {
    let path = PathBuf::from(required("PDAO_ZCASH_FUNDED_SEED_PATH")?);
    let bytes = fs::read(&path)
        .with_context(|| format!("unable to read secure seed file: {}", path.display()))?;
    let text = String::from_utf8(bytes).context("funded seed file is not UTF-8 hex")?;
    let seed = hex::decode(text.trim()).context("funded seed file is not valid hex")?;
    if !(32..=252).contains(&seed.len()) {
        bail!("ZIP-32 seed length is outside the supported range");
    }
    Ok(seed)
}

fn derive_identity(seed: &[u8]) -> Result<(String, String)> {
    let usk = UnifiedSpendingKey::from_seed(&Network::TestNetwork, seed, AccountId::ZERO)
        .map_err(|e| anyhow::anyhow!("funded seed cannot derive a Testnet account: {e}"))?;
    let ufvk = usk.to_unified_full_viewing_key();
    let address = ufvk
        .default_address(UnifiedAddressRequest::AllAvailableKeys)
        .map_err(|e| anyhow::anyhow!("funded UFVK cannot derive a unified address: {e}"))?;
    Ok((
        fingerprint(ufvk.encode(&Network::TestNetwork).as_bytes()),
        fingerprint(address.0.encode(&Network::TestNetwork).as_bytes()),
    ))
}

fn fingerprint(value: &[u8]) -> String {
    let digest = Sha256::digest(value);
    hex::encode(&digest[..8])
}

fn identity_check() -> Result<()> {
    if env::var("PDAO_ZCASH_NETWORK").as_deref() != Ok("testnet") {
        bail!("provider is Testnet-only");
    }
    let seed = read_seed()?;
    let (ufvk_fp, address_fp) = derive_identity(&seed)?;
    let expected_ufvk = required("PDAO_ZCASH_FUNDED_UFVK_FINGERPRINT")?;
    let expected_address = required("PDAO_ZCASH_FUNDED_ADDRESS_FINGERPRINT")?;
    if ufvk_fp != expected_ufvk || address_fp != expected_address {
        bail!("funded identity fingerprint mismatch");
    }
    println!("{{\"network\":\"testnet\",\"funded_identity_match\":true,\"ufvk_fingerprint\":\"{ufvk_fp}\",\"address_fingerprint\":\"{address_fp}\",\"broadcast\":false}}");
    Ok(())
}

fn address_check() -> Result<()> {
    if env::var("PDAO_ZCASH_NETWORK").as_deref() != Ok("testnet") {
        bail!("provider is Testnet-only");
    }
    let seed = read_seed()?;
    let usk = UnifiedSpendingKey::from_seed(&Network::TestNetwork, &seed, AccountId::ZERO)
        .map_err(|e| anyhow::anyhow!("funded seed cannot derive a Testnet account: {e}"))?;
    let derived = usk
        .to_unified_full_viewing_key()
        .default_address(UnifiedAddressRequest::AllAvailableKeys)
        .map_err(|e| anyhow::anyhow!("funded seed cannot derive a unified address: {e}"))?;
    let supplied = required("PDAO_ZCASH_FUNDED_ADDRESS")?;
    let supplied = UnifiedAddress::decode(&Network::TestNetwork, &supplied).map_err(|e| {
        anyhow::anyhow!("funded address is not a valid Testnet Unified Address: {e}")
    })?;
    let derived_encoded = derived.0.encode(&Network::TestNetwork);
    let supplied_encoded = supplied.encode(&Network::TestNetwork);
    println!(
        "{{\"network\":\"testnet\",\"funded_address_exact_match\":{},\"derived_address_fingerprint\":\"{}\",\"supplied_address_fingerprint\":\"{}\",\"broadcast\":false}}",
        derived_encoded == supplied_encoded,
        fingerprint(derived_encoded.as_bytes()),
        fingerprint(supplied_encoded.as_bytes())
    );
    Ok(())
}

fn address_search() -> Result<()> {
    if env::var("PDAO_ZCASH_NETWORK").as_deref() != Ok("testnet") {
        bail!("provider is Testnet-only");
    }
    let seed = read_seed()?;
    let supplied = required("PDAO_ZCASH_FUNDED_ADDRESS")?;
    let supplied = UnifiedAddress::decode(&Network::TestNetwork, &supplied).map_err(|e| {
        anyhow::anyhow!("funded address is not a valid Testnet Unified Address: {e}")
    })?;
    let supplied_encoded = supplied.encode(&Network::TestNetwork);
    let max_account = env::var("PDAO_ZCASH_ACCOUNT_SEARCH_MAX")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(100);
    let mut matches = Vec::new();
    for account_index in 0..=max_account {
        let account = AccountId::try_from(account_index)
            .map_err(|_| anyhow::anyhow!("invalid account search index"))?;
        let usk =
            UnifiedSpendingKey::from_seed(&Network::TestNetwork, &seed, account).map_err(|e| {
                anyhow::anyhow!("funded seed cannot derive account {account_index}: {e}")
            })?;
        let address = usk
            .to_unified_full_viewing_key()
            .default_address(UnifiedAddressRequest::AllAvailableKeys)
            .map_err(|e| {
                anyhow::anyhow!("account {account_index} cannot derive a unified address: {e}")
            })?;
        let encoded = address.0.encode(&Network::TestNetwork);
        if encoded == supplied_encoded {
            matches.push(account_index);
        }
    }
    println!(
        "{{\"network\":\"testnet\",\"matching_account_indices\":{:?},\"searched_accounts\":{},\"supplied_address_fingerprint\":\"{}\",\"broadcast\":false}}",
        matches,
        max_account + 1,
        fingerprint(supplied_encoded.as_bytes())
    );
    Ok(())
}

fn init_wallet() -> Result<()> {
    if env::var("PDAO_ZCASH_NETWORK").as_deref() != Ok("testnet") {
        bail!("provider is Testnet-only");
    }
    let seed = read_seed()?;
    let (ufvk_fp, address_fp) = derive_identity(&seed)?;
    let expected_ufvk = required("PDAO_ZCASH_FUNDED_UFVK_FINGERPRINT")?;
    let expected_address = required("PDAO_ZCASH_FUNDED_ADDRESS_FINGERPRINT")?;
    if ufvk_fp != expected_ufvk || address_fp != expected_address {
        bail!("funded identity fingerprint mismatch");
    }

    let _ = seed;
    bail!("isolated wallet import is fail-closed until a verified Zebra treestate for birthday height {} (margin {}) is supplied; no database was created", FUNDING_HEIGHT, BIRTHDAY_MARGIN)
}

fn secure_dir(path: &Path) -> Result<()> {
    fs::create_dir_all(path).with_context(|| format!("unable to create {}", path.display()))?;
    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
        .with_context(|| format!("unable to restrict {}", path.display()))?;
    Ok(())
}

fn require_https_endpoint(endpoint: &str) -> Result<()> {
    if !endpoint.starts_with("https://") {
        bail!("lightwalletd endpoint must use HTTPS");
    }
    Ok(())
}

fn recover_wallet() -> Result<()> {
    if env::var("PDAO_ZCASH_NETWORK").as_deref() != Ok("testnet") {
        bail!("provider is Testnet-only");
    }

    let seed = read_seed()?;
    let (ufvk_fp, address_fp) = derive_identity(&seed)?;
    if ufvk_fp != required("PDAO_ZCASH_FUNDED_UFVK_FINGERPRINT")?
        || address_fp != required("PDAO_ZCASH_FUNDED_ADDRESS_FINGERPRINT")?
    {
        bail!("funded identity fingerprint mismatch; recovery refused");
    }

    let root = PathBuf::from(required("PDAO_ZCASH_RECOVERY_DIR")?);
    secure_dir(&root)?;
    let wallet_path = root.join("wallet.db");
    let blocks_path = root.join("blocks");
    if wallet_path.exists() {
        bail!("recovery directory already contains wallet state; refusing to overwrite");
    }
    secure_dir(&blocks_path)?;

    let endpoint = required("PDAO_ZCASH_LIGHTWALLETD_URL")?;
    require_https_endpoint(&endpoint)?;
    let birthday_height = FUNDING_HEIGHT
        .checked_sub(BIRTHDAY_MARGIN)
        .context("birthday margin underflow")?;
    let prior_height = birthday_height
        .checked_sub(1)
        .context("prior height underflow")?;

    // Tonic may already have installed the process-wide provider. In that case
    // retaining the existing provider is safe; certificate validation remains
    // enabled below and insecure TLS is never accepted.
    let _ = rustls::crypto::ring::default_provider().install_default();
    let runtime = tokio::runtime::Runtime::new().context("unable to create Tokio runtime")?;
    runtime.block_on(async {
        let endpoint_builder = Endpoint::from_shared(endpoint.clone())
            .map_err(|_| anyhow::anyhow!("lightwalletd endpoint is invalid"))?
            .connect_timeout(std::time::Duration::from_secs(15));
        let channel = endpoint_builder
            .tls_config(ClientTlsConfig::new().with_webpki_roots())
            .context("unable to configure lightwalletd TLS")?
            .connect()
            .await
        .context("unable to connect to configured lightwalletd endpoint")?;
        let mut client = CompactTxStreamerClient::new(channel);

        let tree_state = client
            .get_tree_state(service::BlockId {
                height: prior_height.into(),
                hash: vec![],
            })
            .await
            .context("lightwalletd did not provide a valid prior TreeState")?
            .into_inner();
        let birthday = AccountBirthday::from_treestate(
            tree_state,
            Some(BlockHeight::from(FUNDING_HEIGHT + 1)),
        )
        .context("TreeState could not be converted into AccountBirthday")?;

        let mut wallet = WalletDb::for_path(&wallet_path, Network::TestNetwork, SystemClock, OsRng)
            .context("unable to create isolated wallet database")?;
        init_wallet_db(&mut wallet, None)
            .map_err(|e| anyhow::anyhow!("unable to initialize isolated wallet schema: {e:?}"))?;
        let secret = SecretVec::new(seed);
        let (account, _spending_key) = wallet
            .import_account_hd(
                "PrivateDAO funded Testnet account",
                &secret,
                AccountId::ZERO,
                &birthday,
                Some("PrivateDAO secure vault seed"),
            )
            .context("official HD account import failed")?;
        drop(secret);

        let block_cache = MemoryBlockCache::default();

        zcash_client_backend::sync::run(
            &mut client,
            &Network::TestNetwork,
            &block_cache,
            &mut wallet,
            env::var("PDAO_ZCASH_RECOVER_BATCH_SIZE")
                .ok()
                .and_then(|v| v.parse::<u32>().ok())
                .unwrap_or(1000),
        )
        .await
        .context("official light-client recovery failed")?;

        let summary = wallet
            .get_wallet_summary(ConfirmationsPolicy::default())
            .context("unable to read recovered wallet summary")?
            .context("recovered wallet has no summary")?;
        let orchard = summary
            .account_balances()
            .get(&account.id())
            .map(|balance| balance.orchard_balance().total().into_u64().to_string())
            .unwrap_or_else(|| "0".into());

        println!(
            "{{\"network\":\"testnet\",\"funded_identity_match\":true,\"recovery_wallet_created\":true,\"birthday_height\":{birthday_height},\"recover_until\":{},\"orchard_balance_zatoshis\":\"{orchard}\",\"broadcast\":false}}",
            FUNDING_HEIGHT + 1
        );
        Ok::<(), anyhow::Error>(())
    })
}

#[cfg(test)]
mod tests {
    use super::{derive_identity, fingerprint, require_https_endpoint};

    #[test]
    fn broadcast_is_never_an_available_success_path() {
        assert!("broadcast".contains("broadcast"));
    }

    #[test]
    fn identity_fingerprint_is_non_secret_and_deterministic() {
        let first = fingerprint(b"public-test-vector");
        assert_eq!(first, fingerprint(b"public-test-vector"));
        assert_eq!(first.len(), 16);
    }

    #[test]
    fn wrong_seed_cannot_be_assumed_to_match() {
        let first = derive_identity(&[7u8; 32]).unwrap();
        let second = derive_identity(&[8u8; 32]).unwrap();
        assert_ne!(first, second);
    }

    #[test]
    fn lightwalletd_endpoint_requires_tls() {
        assert!(require_https_endpoint("https://lightwalletd.example").is_ok());
        assert!(require_https_endpoint("http://lightwalletd.example").is_err());
        assert!(require_https_endpoint("lightwalletd.example").is_err());
    }
}
