# Crew brief — confidential allowance (`setAllowance` / `spend` / `revoke` / `grantView`)

Status: ready to implement. Spec these so implementers do not guess.

Shipped so far: M1 confidential balance + ACL, M2 threshold `ebool` viewing key, M3 Sepolia `/demo`. This brief is the **next contracts milestone** (treasury allowance), not the Vite demo.

## Interface (acceptance)

### `setAllowance(agent, encryptedCap)`

- Cap stored as an `euint` (encrypted).
- ACL: grant decrypt / ACL to the **principal only**.
- The **agent must never** receive ACL on the cap.
- Input is an encrypted cap (`externalEuint` + proof), not a cleartext amount.

### `spend(amount)`

Must **fail closed and silent**. Easy to get subtly wrong.

- On overspend: **no revert**. Prefer a no-op path that looks like success from the outside.
- **No event** that differs by outcome (do not emit success-only or failure-only logs an agent can branch on).
- **No observable outcome channel** the agent can use to learn whether the spend cleared the cap — including avoiding intentional gas asymmetry between success and failure paths where the stack allows.
- Encrypted amount in; audited fhEVM ops only.

This is the critical privacy property: an agent must not learn its remaining budget by probing.

### `revoke(agent)`

- Immediate.
- Single transaction.
- After revoke, further spends against that allowance must not move funds (still fail closed / silent — do not leak “revoked” vs “overspend” if both are silent no-ops).

### `grantView(auditor)`

- Principal delegates **read on the balance**, **not** the cap.
- Auditor ACL must not include the encrypted allowance/cap handle.
- Scope to the relevant agent balance as designed in the contract layout.

## Required tests

Minimum set:

1. Principal sets encrypted cap; principal can decrypt / use ACL on cap; agent cannot.
2. Spend under cap moves value; overspend is a silent no-op (no revert).
3. Events (if any) do not differ by spend success vs failure.
4. `revoke` in one tx; subsequent spend cannot drain.
5. `grantView` lets auditor decrypt **balance** only; auditor cannot decrypt **cap**.
6. **Binary-search test (most important):** an agent that repeatedly tries spends of varying sizes (or adaptive amounts) **cannot distinguish success from failure** and therefore cannot recover its cap. Encode this as an explicit Hardhat test with an adversarial agent helper.

## Non-goals (this milestone)

- Mainnet, real assets, custody.
- Custom cryptography (audited Zama / OZ confidential contracts only).
- Per-query micropayments.
- Changing root `index.html` marketing page.

## Hygiene

- Root `package-lock.json` must be committed for reproducible Hardhat installs (demo lockfile alone is not enough for the contracts tree).
