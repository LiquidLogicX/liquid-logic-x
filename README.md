# Liquid Logic X — Milestone 1

Confidential ERC7984 token (mint + transfer) using Zama FHEVM and OpenZeppelin confidential contracts.

## Stack (pinned)

- `@fhevm/solidity@0.11.1`
- `@openzeppelin/confidential-contracts@0.5.3`
- `@zama-fhe/sdk@3.5.1`
- `@fhevm/hardhat-plugin` (local/mock FHE tests)
- Import path: `@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol`
- Config: `ZamaEthereumConfig` (Sepolia-compatible)

## Setup

```bash
npm install
npm run compile
npx hardhat test
# or
npm test
```

Tests run in **Hardhat local mock FHE mode** only. Do not deploy to Sepolia for M1 verification.

## Contract

`contracts/ConfidentialToken.sol`

- Inherits `ZamaEthereumConfig`, `ERC7984`, `Ownable2Step`
- Constructor mints initial clear supply to owner
- `mint(address,uint64)` — owner visible mint
- `confidentialMint(...)` — owner encrypted mint
- Transfers via ERC7984 `confidentialTransfer`

## Tests

`test/ConfidentialToken.ts` covers:

1. **mint** — initial mint decryptable by owner; additional `mint()`
2. **transfer** — encrypted transfer updates balances
3. **ACL** — an address without granted access cannot decrypt a balance

## Funding address

Public throwaway Sepolia address: see `FUNDING_ADDRESS.txt`.
Private key is kept outside git (never committed).
