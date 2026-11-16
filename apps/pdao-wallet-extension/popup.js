const $ = (id) => document.getElementById(id);
const RPC = 'https://api.mainnet-beta.solana.com';
const EXCHANGE = 'https://agents.privatedao.org';

async function json(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function refresh() {
  $('marketStatus').textContent = 'Fetching live prices…';
  $('agentStatus').textContent = 'Checking the production catalog…';
  const [prices, catalog] = await Promise.allSettled([
    json('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'),
    json(`${EXCHANGE}/api/services`)
  ]);
  if (prices.status === 'fulfilled') {
    const p = prices.value;
    $('sol').textContent = `SOL $${Number(p.solana.usd).toLocaleString()}`;
    $('btc').textContent = `BTC $${Number(p.bitcoin.usd).toLocaleString()}`;
    $('eth').textContent = `ETH $${Number(p.ethereum.usd).toLocaleString()}`;
    $('marketStatus').textContent = `Live · CoinGecko · ${new Date().toLocaleTimeString()}`;
  } else {
    $('marketStatus').textContent = 'Live price endpoint unavailable; no demo price substituted.';
  }
  if (catalog.status === 'fulfilled') {
    const body = catalog.value;
    const services = Array.isArray(body) ? body : (body.services || body.items || []);
    const count = services.length || body.count || body.total || 0;
    $('serviceCount').textContent = `LIVE ${count || 'READY'}`;
    $('agentStatus').textContent = `${count || 'Production'} services discovered from the live exchange.`;
  } else {
    $('serviceCount').textContent = 'OFFLINE';
    $('agentStatus').textContent = 'Catalog unavailable; no simulated service state shown.';
  }
}

async function checkBalance() {
  const address = $('address').value.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    $('balance').textContent = 'Enter a valid public Solana address. Private keys are never accepted.';
    return;
  }
  await chrome.storage.local.set({ publicAddress: address });
  $('balance').textContent = 'Reading confirmed Mainnet balance…';
  try {
    const body = await json(RPC, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[address,{commitment:'confirmed'}]})});
    if (body.error) throw new Error(body.error.message);
    $('balance').textContent = `Confirmed: ${(body.result.value / 1e9).toLocaleString(undefined,{maximumFractionDigits:9})} SOL`;
  } catch {
    $('balance').textContent = 'Mainnet read failed; no cached or simulated balance shown.';
  }
}

document.querySelectorAll('[data-url]').forEach(button => button.addEventListener('click', () => chrome.tabs.create({url:button.dataset.url})));
$('balanceBtn').addEventListener('click', checkBalance);
$('refresh').addEventListener('click', refresh);
chrome.storage.local.get('publicAddress').then(({publicAddress}) => { if (publicAddress) $('address').value = publicAddress; });
refresh();
