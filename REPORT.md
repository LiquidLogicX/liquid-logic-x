# Liquid Logic X — Milestone 1 Report

## Summary

Hardhat project implementing a confidential ERC7984 token (`ConfidentialToken`) with mint + transfer, local mock FHE tests, and a throwaway Sepolia funding address.

## Stack (pinned)

| Package | Version |
|--------|---------|
| `@fhevm/solidity` | `0.11.1` |
| `@openzeppelin/confidential-contracts` | `0.5.3` |
| `@zama-fhe/sdk` | `3.5.1` (installed; tests use `@fhevm/hardhat-plugin` mock helpers) |
| `@fhevm/hardhat-plugin` | `0.4.2` |

- ERC7984 import: `@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol`
- Config: `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol`
- Pattern: [Zama ERC7984 docs](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984)

## What compiled

**Command:** `npx hardhat compile` (equivalent to `npm run compile`)

**Outcome:** SUCCESS

```
Generating typings for: 20 artifacts in dir: types for target: ethers-v6
Successfully generated 76 typings!
Compiled 18 Solidity files successfully (evm target: cancun).

```

## What tests cover

File: `test/ConfidentialToken.ts` (Hardhat local mock FHE only — not Sepolia)

1. **mint** — constructor initial supply decryptable by owner; `mint()` grants recipient a decryptable balance
2. **transfer** — `confidentialTransfer(address,bytes32,bytes)` moves encrypted amount; owner/recipient balances update correctly after decrypt
3. **ACL** — an address that was **not** granted access cannot `userDecryptEuint` the owner's balance handle (`to.be.rejected`)

## Exact test command output

**Command:** `npx hardhat test`

```


  ConfidentialToken (ERC7984)
    mint
      ✔ mints initial supply to owner and owner can decrypt balance (54ms)
      ✔ owner can mint additional tokens via mint() (65ms)
    transfer
      ✔ transfers confidential amount from owner to recipient (82ms)
    access control / ACL
      ✔ address NOT granted access cannot decrypt a balance


  4 passing (278ms)

```

## Funding public address

`0x0B6aE190787C84804a40419550B1577b4d261201`

- Written to: `FUNDING_ADDRESS.txt` (public address only)
- Private key: generated locally outside this repository (never committed)

## Secrets check

- No `.env` in the project tree
- Private key is **not** in the repository
- `.gitignore` includes `.env`, `.env.*`, `node_modules`, `cache`, `artifacts`, `coverage`, `types`, etc.

## How to re-test

```bash
npm install
npm run compile
npx hardhat test
```
