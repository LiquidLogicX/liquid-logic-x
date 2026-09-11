# Deployments

## ConfidentialToken (Milestone 1) — Ethereum Sepolia

| Field | Value |
|-------|-------|
| Network | Ethereum Sepolia (`11155111`) |
| Contract | `0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac` |
| Tx hash | `0xe4765a82f4d229bb5982119954c3469a8b0d86d5cd9564c91a1d3dc39211ee63` |
| Block | `11679973` |
| Gas used | `2400130` |
| Deployer | `0x0B6aE190787C84804a40419550B1577b4d261201` |
| Commit SHA (main tip at deploy) | `d16e5d3393c9bf83fd2ea42e063bdcf81f997360` |
| Etherscan | https://sepolia.etherscan.io/address/0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac#code |
| Tx | https://sepolia.etherscan.io/tx/0xe4765a82f4d229bb5982119954c3469a8b0d86d5cd9564c91a1d3dc39211ee63 |
| Sourcify | https://repo.sourcify.dev/11155111/0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac |

### Verification

- **Sourcify:** verified (creation + runtime match) via Sourcify Server API v2 on 2026-09-11. Hardhat's built-in `hardhat verify` still targets Sourcify API v1 (turned off), so verification was submitted with the v2 `/v2/verify/{chainId}/{address}` endpoint using the Hardhat build-info std JSON input.
- **Etherscan:** verified on Sepolia Etherscan on 2026-09-11 via Etherscan API v2 (`verifysourcecode` with `solidity-standard-json-input`). Contract tab: https://sepolia.etherscan.io/address/0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac#code

### FHE / Zama context

FHE operations use Zama Gateway Testnet (`10901`, `rpc.testnet.zama.org`, relayer `relayer.testnet.zama.org`). The token contract itself is deployed on **Sepolia**, not on the Gateway chain.

### Notes

- Constructor args: `owner=deployer`, `initialAmount=1000000`, `name=Liquid Logic X Token`, `symbol=LLX`, `contractURI=https://example.com/llx`
- Deploy uses `PRIVATE_KEY` and `SEPOLIA_RPC_URL` from environment (never committed)
- No private keys or RPC credentials are stored in this repo

## ConfidentialToken (Milestone 2) — Ethereum Sepolia

| Field | Value |
|-------|-------|
| Network | Ethereum Sepolia (`11155111`) |
| Contract | `0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a` |
| Tx hash | `0xd7454a8a115dad5b2b1843449b48c75dc7c5182683a5ed61363385e1b1e16841` |
| Block | `11683621` |
| Gas used | `2476676` |
| Deployer | `0x0B6aE190787C84804a40419550B1577b4d261201` |
| Etherscan | https://sepolia.etherscan.io/address/0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a#code |
| Tx | https://sepolia.etherscan.io/tx/0xd7454a8a115dad5b2b1843449b48c75dc7c5182683a5ed61363385e1b1e16841 |
| Sourcify | https://repo.sourcify.dev/11155111/0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a |
| Routescan | https://routescan.io/address/0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a?chainid=11155111 |

### Verification

- **Sourcify:** full match (creation + runtime) via Server API v2 on 2026-09-11; matchId `49509322`.
- **Etherscan:** verified on Sepolia Etherscan on 2026-09-11 via Etherscan API v2 (`verifysourcecode` with Hardhat build-info std JSON). Contract name `ConfidentialToken`, compiler `v0.8.27+commit.40a35a09`. Contract tab: https://sepolia.etherscan.io/address/0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a#code
- **Routescan:** verified (ABI available) after Sourcify external verification.
- **Blockscout:** was pending at first write; re-check if needed for the grant packet.

### Notes

- Constructor args same as M1: `owner=deployer`, `initialAmount=1000000`, `name=Liquid Logic X Token`, `symbol=LLX`, `contractURI=https://example.com/llx`
- M1 address remains `0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac`
- Deploy uses `PRIVATE_KEY` and `SEPOLIA_RPC_URL` from environment (never committed)
- No private keys or RPC credentials are stored in this repo
