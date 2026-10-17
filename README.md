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

## License

The contracts in this repository are licensed under the Business Source License 1.1 (see [LICENSE](LICENSE)). Licensor: Liquid Logic X LLC. Additional Use Grant: none (non-production evaluation only). Change Date: 2028-10-17 (provisional), after which the Licensed Work is available under the MIT License. This is source-available, not open source, until the Change Date.

`contracts/ConfidentialToken.sol` currently carries an `SPDX-License-Identifier: BSD-3-Clause-Clear` header, which is unchanged. The BUSL header applies from the next contract version. Third-party dependencies (Zama FHEVM, OpenZeppelin confidential contracts) keep their own licenses.
