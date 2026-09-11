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

### FHE / Zama context

FHE operations use Zama Gateway Testnet (`10901`, `rpc.testnet.zama.org`, relayer `relayer.testnet.zama.org`). The token contract itself is deployed on **Sepolia**, not on the Gateway chain.

### Notes

- Constructor args: `owner=deployer`, `initialAmount=1000000`, `name=Liquid Logic X Token`, `symbol=LLX`, `contractURI=https://example.com/llx`
- Deploy uses `PRIVATE_KEY` and `SEPOLIA_RPC_URL` from environment (never committed)
- No private keys or RPC credentials are stored in this repo
