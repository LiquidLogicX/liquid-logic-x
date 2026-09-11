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
| Etherscan | https://sepolia.etherscan.io/address/0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac |
| Tx | https://sepolia.etherscan.io/tx/0xe4765a82f4d229bb5982119954c3469a8b0d86d5cd9564c91a1d3dc39211ee63 |
| Sourcify | https://repo.sourcify.dev/11155111/0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac |

### Verification

- **Sourcify:** verified (creation + runtime match) via Sourcify Server API v2 on 2026-09-11. Hardhat's built-in `hardhat verify` still targets Sourcify API v1 (turned off), so verification was submitted with the v2 `/v2/verify/{chainId}/{address}` endpoint using the Hardhat build-info std JSON input.
- **TODO — Etherscan:** verify on Sepolia Etherscan when `ETHERSCAN_API_KEY` is available in the deploy environment. Daily source-submission limit / missing key blocked Etherscan during this deploy.

### FHE / Zama context

FHE operations use Zama Gateway Testnet (`10901`, `rpc.testnet.zama.org`, relayer `relayer.testnet.zama.org`). The token contract itself is deployed on **Sepolia**, not on the Gateway chain.

### Notes

- Constructor args: `owner=deployer`, `initialAmount=1000000`, `name=Liquid Logic X Token`, `symbol=LLX`, `contractURI=https://example.com/llx`
- Deploy uses `PRIVATE_KEY` and `SEPOLIA_RPC_URL` from environment (never committed)
- No private keys or RPC credentials are stored in this repo
