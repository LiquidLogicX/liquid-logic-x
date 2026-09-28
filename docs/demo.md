# Threshold demo UI

Milestone 3 browser demo for confidential threshold proofs on Sepolia.

- **Live path:** [`/demo`](/demo/) (Vite app with `base: '/demo/'`)
- **Source:** [`demo/`](../demo/)
- **Contract:** [`0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a`](https://sepolia.etherscan.io/address/0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a) (M2 Sepolia)

## What it shows

1. Connect a wallet on Sepolia (`11155111`)
2. Holder grants a threshold proof via `proveThreshold(verifier, threshold)`
3. Verifier decrypts `thresholdProofOf(holder, verifier)` → YES/NO (`ebool` only)
4. Same verifier attempts `confidentialBalanceOf(holder)` decrypt → expected **DENIED**

## Local run

```bash
cd demo
npm install
npm run dev
```

See [`demo/README.md`](../demo/README.md) for build notes and SDK path details.
