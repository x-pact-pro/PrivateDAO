# PrivateDAO Grant Evidence Index

Generated: 2026-10-13T15:26:59.744Z

This index covers the six commercial products only. Agent Exchange is intentionally excluded from this product matrix and is documented separately.

## Production boundary

- Production authority: AWS EC2.
- GitHub: source control and CI evidence, not GitHub Pages production hosting.
- Site: https://privatedao.org
- Agent Exchange: https://agents.privatedao.org

`verified` requires a transaction hash or an appropriate proof identifier in a committed evidence artifact. `ready` means preparation/runtime evidence without a broadcast proof. `missing` means no product-specific artifact was found.

## Matrix

| Network | Product | Verification | Run date | Transaction/proof | Evidence | GitHub Actions run |
| --- | --- | --- | --- | --- | --- | --- |
| solana-devnet | blind-verification | **verified** | 2026-10-12 | 51aeca834527f8b26e93648fa051fb0ca29f670c86cd92cd58bfa4d4a9fbda05 | `docs/evidence/solana-devnet-blind-verification-e2e.json` | not recorded |
| solana-devnet | record-verification | **verified** | 2026-10-12 | NZkkgh16Sd9omEpA8GLaLKaNCzy8uapWoTBRCva8mZZpJLFEoL9T5N9gPjheFeN7vpbNu97nFcTVuB7zxenctn9 | `docs/evidence/solana-devnet-record-verification-e2e.json` | not recorded |
| solana-devnet | payroll | **missing** | - | - | - | not recorded |
| solana-devnet | treasury | **missing** | 2026-09-25T01:38:47.952Z | - | - | not recorded |
| solana-devnet | governance | **missing** | 2026-09-25T01:38:47.952Z | - | - | not recorded |
| solana-devnet | auction | **missing** | 2026-09-25T01:38:47.952Z | - | - | not recorded |
| ethereum-sepolia | blind-verification | **missing** | 2026-09-16T21:53:12.853Z | - | - | not recorded |
| ethereum-sepolia | record-verification | **missing** | 2026-09-16T21:53:12.853Z | - | - | not recorded |
| ethereum-sepolia | payroll | **verified** | 2026-10-11T23:56:56.361Z | 0x1c6aa7c6dd2e7bd6644c7cb190ceb5c6ed4f0a6f6110d7628607c50406391628, 0xec6c92441594b72ca84d82eaef3586b10f12d1f21341d60a4d2a55990d332b14, 0x4d26626a2515017df8e0097984287b183e6758a308d7bef9df0bf63bcbd1116e, 0x9acc8fae4c33523798d6e5df16ae103d2b58a801febf4b6d0f5bba58de2878df | `packages/evm-verification/deployments/organizational-ethereum-sepolia.json` | not recorded |
| ethereum-sepolia | treasury | **verified** | 2026-10-11T23:56:56.361Z | 0xc1d7ec87dd5654282048c800ade47cf5f87a6a3013582668d2497b079737e667, 0xda3dccb9ac31434ab9addcbfd20ea1763649cf60265962a5269045924ee20c4f, 0xa5aa21303f48f212e56bf140ca33665d76d143542a271cc6702d653db970d974, 0x6e2465f1377d480817bbf8e771a31222ef81fd230b62a04d154de0453de4fe34, 0x9ebcf2cc11bfc000882d3bd6fc66f379cbb25b2196b758c72a05fa1a7fff9dec | `packages/evm-verification/deployments/organizational-ethereum-sepolia.json` | not recorded |
| ethereum-sepolia | governance | **verified** | 2026-10-11T23:56:56.361Z | 0xc95f278514f53a0d20ea5e472fc13f697c81668a79abed9cb8e0bb813b019362, 0xffb5a2560b601fa9044dd990e5bb0a8acaca03515a3f9c41192037ec69ed04af, 0x2eb063a2b14218d0d079ccac4ed5c7d310727303583becf0d2b6b808b2edbbd9, 0x3bdf847d5bef9528e70f7d0d4bed5ccdd1cca3404a01ececd915d23452dc2fe9 | `packages/evm-verification/deployments/organizational-ethereum-sepolia.json` | not recorded |
| ethereum-sepolia | auction | **verified** | 2026-10-11T23:56:56.361Z | 0x3d2d783386a76824004483fb6c920122d018693e764bf6dfd432c65997231d0d, 0x6877ff14a2c5fa70da10ba10fbff6e86a9cccd862ffca995d0f15bbe29b9de31, 0xc3398daf354ab959fece7907a62ee8c2091f61d1fe6dcdedbb411d47e8f5870a, 0x3b3a4d2e5a82309273e4ff4d0b34ee1d130a0d89b16e80160b52db39c97ddb38, 0x2fe9192d29a2d511cbbaa010ed20a070cadffbd71ccc79efefad048e26ed184b | `packages/evm-verification/deployments/organizational-ethereum-sepolia.json` | not recorded |
| arbitrum-sepolia | blind-verification | **missing** | 2026-09-17T07:28:40.938Z | - | - | not recorded |
| arbitrum-sepolia | record-verification | **missing** | 2026-09-17T07:28:40.938Z | - | - | not recorded |
| arbitrum-sepolia | payroll | **verified** | 2026-10-12T00:15:59.960Z | 0x80ee6dae7277f7fda2b66ca98040f9f05b0f6f05bb5a0a44033906e8c0140d20, 0x8957418aefd5fed8920db382d1c5c73b0aeb08182f613b09df5f06bcbea38fcd, 0xc24536cbd714fc368c71cd6a56111e5939cc8ac2718fb346a27fba5075bbfcd1, 0xe32403eaa748197fdd61913ec1d9f726fbe09a8aadd674e305384951c5f2c4ce | `packages/evm-verification/deployments/organizational-arbitrum-sepolia.json` | not recorded |
| arbitrum-sepolia | treasury | **verified** | 2026-10-12T00:15:59.960Z | 0xdebabd9719071f1de7bd91541a8d72b3cd5fa9bd75c648026fe267af7ac938ab, 0x5bc2ca7c7bff88d1d37f2ec68feb911a017f403adc1c96ef92d8f673360a3d54, 0x3bdc89251282c958ea7ae9bdac11671f45e76741416daaf38a92100d38040c18, 0xb528586c3f1a7e74e6a87774efbab842593462a2eb9224da44e78cd00faa7f65, 0x9366d57eee4a94b20c5b4ca7891b5666f88d8858f64c1f9fa0a48fefad43c861 | `packages/evm-verification/deployments/organizational-arbitrum-sepolia.json` | not recorded |
| arbitrum-sepolia | governance | **verified** | 2026-10-12T00:15:59.960Z | 0xd8bfeac5a4957e4521000096fb80731f4714d7f1b1224dc51b10edd592dcee63, 0x90dbf9c158073a0a42bbc88a0378cb2f4bb0ef8bcf82744195db21fa787e2f08, 0xc43d27e7238dd409c0d5feefe47290316d2288d3a95217855c1cdb2638448636, 0x2807c1fa5574f465217576b1ffbb45bcb11b64c80d8efaaff2171ee3d77430b9 | `packages/evm-verification/deployments/organizational-arbitrum-sepolia.json` | not recorded |
| arbitrum-sepolia | auction | **verified** | 2026-10-12T00:15:59.960Z | 0x4c0b8eb5f1c70bede0fe58ca74b12612327f65b4924d973afde9774e14603226, 0x9d0a3a15f2731d677c63893b42ac6e831655326d0e23fc1a44c554cb2da0d270, 0xd1a15afb7b6dee059dedd7037093329e397784a5bb07ee8780ec8ae2437c3031, 0xb50674b390d7607731a68cf62854938653135c166ce785d2a0e9c268446ebad4, 0x40a5eee3c8d20b191fe518a2914c6e647f3e850f31d9248ed212a926be0cc124 | `packages/evm-verification/deployments/organizational-arbitrum-sepolia.json` | not recorded |
| bnb-testnet | blind-verification | **missing** | 2026-10-11T15:16:22.645Z | - | - | not recorded |
| bnb-testnet | record-verification | **missing** | 2026-10-11T15:16:22.645Z | - | - | not recorded |
| bnb-testnet | payroll | **verified** | 2026-10-12T00:18:34.179Z | 0xdbe9aeb9e4acfcdacb63d828d05b5b245b4df93973b5253ce5ae87cd795c3345, 0xee3c8f8aa067e70b3caf4dd28baf9cae5957485a4536e41664107b787e0392e1, 0x2997dcef6ec0befaad20c69c7732e0d652e5c74506c4246263cd849357e51982, 0x96d33bf41270f3d04bd53d54ab68fa0bb2b4639c916e3455b68a1bf497ead23a | `packages/evm-verification/deployments/organizational-bnb-testnet.json` | not recorded |
| bnb-testnet | treasury | **verified** | 2026-10-12T00:18:34.179Z | 0x7fa2ae1c94b56bcf8d3a7a852dc50304596bb5af159cb51282fb092431efa83d, 0xbdf17e717bf565e54e0f9d81729321a15d2a03ee9046f5b160d2de1b9a556aa8, 0x85debbb86028708e8ff02d4884125f1e8bfe286a56d988b52eb128a5ceaeaeff, 0x022d09753a55c4ef5c173a45461f81935f78ff2a4f9302965ccd37d57795a8b1, 0x785fd8fd3507722b19e8ad69e25719ca98807da5c144ffabe55cb1e263be580b | `packages/evm-verification/deployments/organizational-bnb-testnet.json` | not recorded |
| bnb-testnet | governance | **verified** | 2026-10-12T00:18:34.179Z | 0x94425f034779297ac3291cf44fa16e29a6edff10e6980525cc4086df0a868889, 0x3f468161cb30312c7b5bff5a6e590f3dd7f03d714fa177c076d354263585c92d, 0x6be2b5d6028848d07fcbd36f34eeabced4a0a1c4584d019f3d01fae0a1ad9ad9, 0x523eb8810f1597a3bfe0e769202ee455462c09dbd2595c60e170644e8e702f10 | `packages/evm-verification/deployments/organizational-bnb-testnet.json` | not recorded |
| bnb-testnet | auction | **verified** | 2026-10-12T00:18:34.179Z | 0xf6354c6924ed3c8b6379d8e2cb35d9ef26482582e2579d9e28aa4fb70f431da2, 0xdab8060a9b7f791aba7e56bcc634f8943e1b888641af1a0ef30013dd44c6d290, 0x994c882224e79b3dafffcf56431b5374d4ff273768aa8fdb722775f04ce7cd0c, 0xf33258dc60ffb90ae193670848cf229fdf92f966b0add7632b4b91799560c171, 0xbfaa547e3d87bb857ac3be0d6292bdb7a06d2072b35d10500b218a489d49f7d6 | `packages/evm-verification/deployments/organizational-bnb-testnet.json` | not recorded |
| base-sepolia | blind-verification | **missing** | 2026-09-17T00:39:48.896Z | - | - | not recorded |
| base-sepolia | record-verification | **missing** | 2026-09-17T00:39:48.896Z | - | - | not recorded |
| base-sepolia | payroll | **verified** | 2026-10-12T00:13:22.254Z | 0x0873eb1ac151ff522ed26d117747199ffdda4a46232f65e7f04643809902b08f, 0xfea743eabc237be1480f9dfa01c250f5a11c240ce7c5ca23158cd96c3d0efd41, 0x8f1a6de2338a51c9b88db16db63d3ead41379a33daeba1dbaff08f40ad83f1d9, 0xabe0ef14160e13c64f0c9567c83635d880c3edffe161a0ea948e0198d395236a | `packages/evm-verification/deployments/organizational-base-sepolia.json` | not recorded |
| base-sepolia | treasury | **verified** | 2026-10-12T00:13:22.254Z | 0x09fc750b35cd224d9a1868647d4a32e65a14be964898877116ee90f5bd1d8837, 0xecd9b62874dbaeee57665e67a1ea4877360d0731677e5df63460caa530879033, 0xd156d85d44888ac084c9d4da4f6b632584d8a57f6a053d76d0d0235f01c763fd, 0xe673ec9a2f822bef670b3d27c1dc913421a7f6d92644188b6bdb649cf649c135, 0xec8765c0aacf469d71a86c2d316ad0f1075a0a68416e1c68fbfd5a0ae6c7f679 | `packages/evm-verification/deployments/organizational-base-sepolia.json` | not recorded |
| base-sepolia | governance | **verified** | 2026-10-12T00:13:22.254Z | 0x42c9dafc0dfee01ba33ab415c51c3ead7964169bc69e68d5f2175ad3e2e3b064, 0x97ba3568eaf613f4a56ddf60da1f88452841faa2091f8c958d4bca8ce3cb609d, 0xe60455ec9fced6df6203650f1f749f8e024a4e9e3ab403eb38384cd758bc63f6, 0xe3f18b8c78da1bfcbbcb96d88a6ed079fea1283e7ff79ca4a41e7ee5c6d77cd8 | `packages/evm-verification/deployments/organizational-base-sepolia.json` | not recorded |
| base-sepolia | auction | **verified** | 2026-10-12T00:13:22.254Z | 0xcaf6f8f6ea1f54317bc4b1ec093276a8b2bb5eebda33c1758f631931a8cb6b5c, 0x042a44a41004a6c24931d64c9d8f76af0483711ce05cd7075b8a46edac0b6a9f, 0x621ef89406a7f51028d6df12a23d8b31ed700e0d7ef0c6f5f6a2dfd089ecacb3, 0x6fae7d9971cf6b178b72e7faa4f76b9918fbfbb338cc60998897a01aebf85747, 0x0bdd5350ac62417c98113e66215a7e653dd3681de32a6388ad812127857ba91c | `packages/evm-verification/deployments/organizational-base-sepolia.json` | not recorded |
| robinhood-testnet | blind-verification | **missing** | 2026-10-11T12:13:57.179Z | - | - | not recorded |
| robinhood-testnet | record-verification | **missing** | 2026-10-11T12:13:57.179Z | - | - | not recorded |
| robinhood-testnet | payroll | **verified** | 2026-10-12T00:21:40.273Z | 0x2075c6d90c736376fb07d22704f0cf609ca397497a3c304b3c700008b35491f7, 0x04ade38ea50006f004fd321dd2d0f1a7d19b25da1d078a85d81ef6285c9fc321, 0xebfd2ececb0e0692b9fef23dbeea93d806c06c63f8c3a7b9ec420665aa4ac25f, 0x48c4e805621e41cd75c711eea804f3e144286c9db4a306dff42aeae57c7408bf | `packages/evm-verification/deployments/organizational-robinhood-testnet.json` | not recorded |
| robinhood-testnet | treasury | **verified** | 2026-10-12T00:21:40.273Z | 0xec48bd34c06a1339d21ab3e3d54477802b007e6500c7630e87da02aad4da6e10, 0x0cdce3529e85a9b1584d5381189f971f9fa35c39c323861c543445a63697a1ed, 0x14777e4b2df3e7cc17bdb28fe00c101b3a09f4ab2c38e4c8784ce5197e64aec9, 0x53cad5b95e4291fd0ff7b2808cb3fbfc46263bdfca7439188c50cad5cc895595, 0x58736dd6899d1fb3e5a27d87dea1b0096d85dcbcc3348102cf2355993f0f4a28 | `packages/evm-verification/deployments/organizational-robinhood-testnet.json` | not recorded |
| robinhood-testnet | governance | **verified** | 2026-10-12T00:21:40.273Z | 0xf359ee966febc68d96eaa75a6ceeb599b25c07af01159e7e13c6e6f5698553e0, 0x9e3e33d1b4296688eb1cb90e2350981ceea7365b681e935220b7763d14d23d6a, 0x612cbee84d44f3a758eef7b30ab9bd87c0bec706ab0fba7e036ce59edf909ac5, 0x9301ba3ea00d59f1480110cd887faab083bfbeb780afdc1bbfb73d24a3724f25 | `packages/evm-verification/deployments/organizational-robinhood-testnet.json` | not recorded |
| robinhood-testnet | auction | **verified** | 2026-10-12T00:21:40.273Z | 0x0cfaa2378dacb26f3a200335be1a3d1c2b2644c361174cf321ab86613fa62341, 0xf2bb9eb069f1513b7562a898022dc0d4b1ef81cc27836bd0cda39bb52c9ad894, 0x2780b6e7530f73f5e6dcd6fe38a684af0e7e6e0447c20e89d58f94a5c52f9f0b, 0x92d08182467dbbafee4703a4a4a3922720bb656fee100012b9ea3fe969645791, 0xd1c351196d64706fec9c71973ec92738dd165cb1f9a5ee2d7d205af4bc928738 | `packages/evm-verification/deployments/organizational-robinhood-testnet.json` | not recorded |
| tempo-testnet | blind-verification | **missing** | 2026-09-16T21:53:12.853Z | - | - | not recorded |
| tempo-testnet | record-verification | **missing** | 2026-09-16T21:53:12.853Z | - | - | not recorded |
| tempo-testnet | payroll | **verified** | 2026-10-12T10:26:18.617Z | 0x6233de9d9a99da7d393a0610335b855095c5bde1792fdb88c22bd2ef9c13655d, 0xde8b84c64479da6b47dc5b351cd53ba1b6f7ff1fc4752bd2c457c47acf573343, 0xee06519248baaab99f9e84950effc280f2a051de3336a98383f42e17233908c9, 0x227d1a4437dfbee4c832e0e45d6b0a4ab81160077df112fb556190ad70cc1373 | `packages/evm-verification/deployments/organizational-tempo-testnet.json` | not recorded |
| tempo-testnet | treasury | **verified** | 2026-10-12T10:26:18.617Z | 0x087f73602932a3e6df45351aa134931b898903d7861c2e08c61bee3755eebde6, 0xc0a81e99b5a4b7956491842bc634239b33d78ee2e42f70bc2b5c53f0b89de330, 0x75853fdd4e962907b8f888e645d21102b425f779cd801b9b73159b4635310e7c, 0xfb14aa515322e6e8f15963704f2193fee9eb5d576019d6ef4ab90c69db07c4a6, 0xef88f422bff7d31b51538569930a7c0366de6a785173fd94b070b568b3fea3cd, 0xacf375084781e9eaba11e713195d1fcdaef2dbd3461bc79a0552911732730a6a | `packages/evm-verification/deployments/organizational-tempo-testnet.json` | not recorded |
| tempo-testnet | governance | **verified** | 2026-10-12T10:26:18.617Z | 0x2595723373930f2b4cf1bc59ed5e62eb6ba192abcb1f595829a3392393365c7d, 0xce61afdf3e67ea3eafcb95ac0b1d1b2509adb817a6e446267381f975c120a927, 0xeca490132aba6a51fb3966657e83b9acdb5e9c2928d32a333b327a999a7b6b09, 0x7ea3b1910e2b142bcad68fb3f13be749f7ccc676572aa68d9ab3a25167eb462f | `packages/evm-verification/deployments/organizational-tempo-testnet.json` | not recorded |
| tempo-testnet | auction | **verified** | 2026-10-12T10:26:18.617Z | 0xbd14684d3a5f9169a6c93c1f78bfb6a2c39bbd49a074ded1ac16235f6be9ff2c, 0x331b0e3b895893e23e7ddbce510d2ce308025a0efd610b391e77823cbb54671a, 0x7fd3d7ee8404002f851a8d3d086b1182290fbef2e984d3b77d04facb8e4b06c4, 0x4f769c373f0d5a9dd7c412dab4152a7e38d21c46b29d551a0fee360cf7e7c22e, 0xbf49ae922c48d8640f077f8130c9f127d961ffca3a2b46968ea8262164681634, 0x557584ef4594ba5f67bff5103f9210316eeec7e8b8d58ae511075bf490141f14 | `packages/evm-verification/deployments/organizational-tempo-testnet.json` | not recorded |
| zcash-testnet | blind-verification | **ready** | 2026-10-12T20:20:59.203Z | - | `docs/evidence/zcash-testnet-products-e2e.json` | not recorded |
| zcash-testnet | record-verification | **ready** | 2026-10-12T20:20:59.203Z | - | `docs/evidence/zcash-testnet-products-e2e.json` | not recorded |
| zcash-testnet | payroll | **ready** | 2026-10-12T20:20:59.203Z | - | `docs/evidence/zcash-testnet-products-e2e.json` | not recorded |
| zcash-testnet | treasury | **ready** | 2026-10-12T20:20:59.203Z | - | `docs/evidence/zcash-testnet-products-e2e.json` | not recorded |
| zcash-testnet | governance | **ready** | 2026-10-12T20:20:59.203Z | - | `docs/evidence/zcash-testnet-products-e2e.json` | not recorded |
| zcash-testnet | auction | **ready** | 2026-10-12T20:20:59.203Z | - | `docs/evidence/zcash-testnet-products-e2e.json` | not recorded |
| hyperliquid-testnet | blind-verification | **verified** | 2026-10-11T14:08:00.682Z | 0x4b09c1bb9d80ffd50374c8d34a3f9ec61bd58af3f61c42ef45e27673386ba5c1 | `packages/evm-verification/deployments/phase-2-e2e-hyperliquid-testnet.json` | not recorded |
| hyperliquid-testnet | record-verification | **verified** | 2026-10-11T14:08:00.682Z | 0x229332900b11e0319adbf39b2aedc87de5bb570a58cce3831f2663cc9165cec7 | `packages/evm-verification/deployments/phase-2-e2e-hyperliquid-testnet.json` | not recorded |
| hyperliquid-testnet | payroll | **missing** | - | - | - | not recorded |
| hyperliquid-testnet | treasury | **missing** | - | - | - | not recorded |
| hyperliquid-testnet | governance | **missing** | - | - | - | not recorded |
| hyperliquid-testnet | auction | **missing** | - | - | - | not recorded |
| stellar-testnet | blind-verification | **verified** | 2026-10-12T01:01:52.965Z | 48f9a7c780924548ecd3caf44c117007c354de11ac03ca81b38faa5d95a39966 | `docs/evidence/stellar-testnet-product-e2e.json` | not recorded |
| stellar-testnet | record-verification | **verified** | 2026-10-12T01:01:52.965Z | 9d415e3509e6027614013ccd298a0e88091f77daa2c468fc8bae5982300acb86, 6c4fc117c39590cc92e90821f502c8ce49c6ffac6a399a12e6e8e165bca1b008 | `docs/evidence/stellar-testnet-product-e2e.json` | not recorded |
| stellar-testnet | payroll | **verified** | 2026-10-12T01:01:52.965Z | 2762c13176a65ff0ff6a1d33d68970ded7f1fe96c09e38a336009ed89f55580e, d7d5a0977741b5316936e115f3632dbb1f32b1ad285c44b4dcaabc9e279e7ae1 | `docs/evidence/stellar-testnet-product-e2e.json` | not recorded |
| stellar-testnet | treasury | **verified** | 2026-10-12T01:01:52.965Z | b69f9c0f47a443ff517edd50b12b5204effddc5c07e567df6940174e39956214 | `docs/evidence/stellar-testnet-product-e2e.json` | not recorded |
| stellar-testnet | governance | **verified** | 2026-10-12T01:01:52.965Z | 66bdc160aaae3592cda5973652ec9c978bb64eb9e0ba1034dd047d7de30ae697 | `docs/evidence/stellar-testnet-product-e2e.json` | not recorded |
| stellar-testnet | auction | **verified** | 2026-10-12T01:01:52.965Z | cd666e59728c76098e0e009d7289fd53e0b1cfc9c092732d2053c5a0b7d02f2e, e468617c87da6dd463057cd50ffb69fcbd7ac9b5ebb6676010523c7f4311b4b3 | `docs/evidence/stellar-testnet-product-e2e.json` | not recorded |
| hypercore-testnet | blind-verification | **missing** | - | - | - | not recorded |
| hypercore-testnet | record-verification | **missing** | - | - | - | not recorded |
| hypercore-testnet | payroll | **missing** | - | - | - | not recorded |
| hypercore-testnet | treasury | **missing** | - | - | - | not recorded |
| hypercore-testnet | governance | **missing** | - | - | - | not recorded |
| hypercore-testnet | auction | **missing** | - | - | - | not recorded |

## Reviewer path

1. Open the linked evidence artifact for the row under review.
2. For `verified`, compare the transaction/proof identifier with the relevant explorer or verifier.
3. Treat `ready` and `missing` as not yet proven E2E; do not infer a successful broadcast from the registry status.
4. Use the commit and CI workflow that generated the artifact when a GitHub Actions run URL is recorded.
