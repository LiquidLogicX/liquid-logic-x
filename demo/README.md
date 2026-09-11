# Liquid Logic X — Threshold demo (Milestone 3)

Browser demo at `/demo` that:

1. Connects a wallet on **Sepolia** (`11155111`)
2. Lets a holder call `proveThreshold(verifier, threshold)` on
   [`0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a`](https://sepolia.etherscan.io/address/0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a)
3. Lets a verifier read `thresholdProofOf(holder, verifier)`, decrypt the `ebool`
   via **`@zama-fhe/sdk`**, and show YES/NO
4. Attempts to decrypt `confidentialBalanceOf(holder)` as that verifier and shows
   the expected **DENIED** / error (balance ACL not granted)

## Run locally

```bash
cd demo
npm install
npm run dev
```

Open the printed URL (Vite serves with `base: '/demo/'`).

Build:

```bash
cd demo
npm run build
npm run preview
```

## SDK path

Primary (wired):

- `createConfig` from `@zama-fhe/sdk/ethers`
- `web` from `@zama-fhe/sdk/web`
- `sepolia` from `@zama-fhe/sdk/chains`
- `ZamaSDK` + `sdk.decryption.decryptValues([{ encryptedValue, contractAddress }])`
- `runtime: { singleThread: true }` so hosts without COOP/COEP still initialize WASM

Fallback (if browser WASM/Vite blocks `@zama-fhe/sdk`): `@zama-fhe/relayer-sdk`
with `SepoliaConfig` + `createInstance` + `userDecrypt` — not used unless the
primary path fails; document the exact error in the PR if that happens.

## Notes

- No secrets in this package. Sepolia testnet relayer needs no API key.
- Do not fake decrypt by reading plaintext — only Zama SDK user-decrypt.
- Root marketing `index.html` is untouched; this app lives entirely under `demo/`.
