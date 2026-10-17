# cLLX: confidential balances for $LLX (research and recommendation)

Status: research, docs only. Nothing here was deployed or merged. Date: Oct 17, 2026.
Sources are the vendors' own docs unless noted; figures marked (est.) are our estimates, not quotes.

## 1. What we are building

**Requirement.** Someone who receives $LLX from us and pastes our address into Basescan must not be able to see what we hold.

**Product shape (decided).** cLLX is a 1:1 wrapper of $LLX (`0xB9Dd507a5b352783b25e14c9b6E77D9f0067380f` on Base, 18 decimals, 1,000,000,000 supply). Deposit LLX into a vault and receive cLLX. Burn cLLX and withdraw LLX. No new supply and the LLX contract is untouched. Treasury and team wallets wrap first. Holders opt in through LLX Pay fee discounts and by X-Lock and X-Escrow accepting cLLX. The vault is the highest-value contract LLX will own, so it launches caps-first (per-wallet wrap cap) and after a paid audit, the same pattern as X-Escrow.

Sender and receiver addresses may stay visible. This is not a mixer or shielded pool and we will not build one.

### Honest limits of the privacy (apply to every option below)

1. **Wrap and unwrap amounts are public.** A deposit into the vault is a normal ERC-20 transfer. Anyone can see "treasury wrapped N LLX". The balance is hidden only after that, and only to the extent the holder's cLLX is mixed with amounts that were never publicly attributed.
2. **The vault's total LLX balance is public.** The split between holders is hidden, the aggregate is not.
3. **The public LLX balance of a wrapping address drops to zero.** Observers can see that it wrapped, and how much.
4. **Best practice for the stated use case:** wrap in bulk from one treasury address, then pay people in cLLX by confidential transfer. The receiver sees a transfer with a hidden amount from us, and our own LLX balance on Basescan shows nothing useful.
5. Addresses and timing stay public in every option. This hides amounts, not relationships.

## 2. Research order and findings

### 2.1 Avalanche eERC (AvaCloud Encrypted ERC-20): primary in the brief, but licence-blocked on Base

How it works: ElGamal encryption on Baby Jubjub plus Groth16 proofs (Circom and Gnark circuits). There is a Standalone mode (a new private token) and a Converter mode (wrap an existing ERC-20, which is our shape). One rotatable auditor key can decrypt every amount and balance. Senders, receivers and timestamps are public. Two audits are listed in the repo (March 2025, circuits and core protocol).

Findings:

- **Licence is the headline problem.** The repo is under Ava Labs' *Ecosystem License v1.1* (`SPDX: Ecosystem`), not an open-source licence. It permits use only with the Avalanche public network (Mainnet/Fuji, C-Chain and linked subnets), or non-commercial testing/research. It also bars use "not operationally connected to" Avalanche. **Deploying a port on Base for production is outside the licence** unless Ava Labs grants a written exception. The brief assumed "no licence"; that assumption does not hold. (This is a reading of the licence text, not legal advice.)
- **Technically it runs on Base.** Avalanche's docs say eERC runs on any EVM chain with BN254 precompiles and a gas limit above about 1M, and name Base. A confidential transfer costs about 947,000 gas, roughly 15x a plain ERC-20 transfer (Avalanche's figure). Base cost in dollars still needs measuring on a testnet deploy.
- **Alternative: cLLX lives on Avalanche.** That is licensed, but then LLX needs a bridge (LLX is Base-only today), so cLLX is no longer a simple 1:1 vault on Base. The LLX cross-chain design (CCIP vs OFT/NTT) is an open decision.
- **Wallet/UX.** Users must register a Baby Jubjub key, hold it client-side, and generate proofs in the browser through the `@avalabs/eerc-sdk`. Proof generation is client work and a new key to back up.
- **Compliance story.** The auditor key can decrypt everything, a strong "regulator-visible" story, but one key compromise exposes all history. Rotation leaves old ciphertexts under the old key.
- **Post-quantum:** not safe (see section 3).

### 2.2 Oasis Sapphire (confidential EVM, TEE): fastest demo, weakest trust model

How it works: a confidential EVM ParaTime. Contract state is encrypted and only the contract running in an attested enclave can read it. Documented implementation: Intel SGX v1.

Findings:

- **Bridging LLX in and out.** Oasis' OPL SDK links a "host" contract on Base to an "enclave" contract on Sapphire over a message bridge (Celer IM). Their cBridge docs list Ethereum, Polygon and BNB, not Base. So the Base vault locks LLX and messages Sapphire to mint cLLX. cLLX would exist **on Sapphire**, not on Base: no cLLX in a Base wallet, users need ROSE for gas, and a bridge/message layer sits between the vault and the balance. That is a significant extra trust and failure surface.
- **Trust.** Confidentiality depends on Intel SGX and Oasis' key manager. Oasis ran a public "TEE break" bounty through the end of 2025; the track record for TEE chains generally includes hardware attacks. We cannot independently verify that Sapphire was unaffected.
- **Leaks.** Oasis' own docs warn that storage access patterns can leak who sent to whom inside the compute node, and that standard ERC-20 `Transfer` events must be removed. A custom confidential token is required.
- **Ecosystem size:** small compared with Ethereum and Base. We have not measured it.
- **Post-quantum:** stored state is symmetric (OK); the transaction-encryption key exchange is not (see section 3).

### 2.3 Zama fhEVM / OpenZeppelin ERC-7984 confidential wrapper: cleanest design, open questions on Base and licence

How it works: fully homomorphic encryption. Balances are `euint64` handles; a coprocessor computes on ciphertexts. OpenZeppelin ships `ERC7984` and `ERC7984ERC20Wrapper` (fixed-rate wrap/unwrap), our product shape almost exactly. Zama's own wrapper registry maps ERC-20s to verified wrappers.

Findings:

- **Fit with our design.** The OZ wrapper is a fixed-rate 1:1 wrapper and refuses fee-on-transfer tokens. LLX needs a check that it is not fee-on-transfer; we have not checked that in the source. `euint64` caps the amount, so an 18-decimal token needs a rate (for example 1e12) to fit: with 6 decimals, a 1B supply is 1e15, well under the 1.8e19 maximum. The cost is that cLLX balances only hold whole units down to 6 decimals.
- **Is it live on Base? Not verified.** Zama's marketing says Base is a supported EVM chain, and its 2024 announcement named Base. But our search found mainnet live on **Ethereum (Dec 30, 2025) and Polygon (confidential tokens, Aug 2026)**, and no Base mainnet launch or Base confidential-token deployment. Treat Base support as unconfirmed until Zama says so.
- **Licence.** The fhEVM libraries are BSD-3-Clause-Clear for development and research only; commercial use needs Zama's patent licence **or** building on top of the Zama Protocol, which already holds it. Our understanding is that using the live Zama Protocol on a supported chain needs no extra licence, but forking or running it elsewhere does. Our licence ticket (#5115) is still unanswered (nudged Oct 16). Our existing Sepolia M1/M2 contracts already implement this model.
- **Running cost.** Fees are paid in $ZAMA, priced in USD: about $0.008 to $0.80 per confidential transfer at launch pricing (one proof check plus about three decryptions), under $0.01 for high-volume users. Someone (the app or a sponsor) has to cover that.
- **Centralisation risk, shown in practice.** L2BEAT's page for Zama confidential tokens records two incidents: a pauser halted the whole ACL (every confidential token) for 84 minutes in January 2026, and a court order made Circle blacklist the cUSDC wrapper for almost three days in May 2026, blocking every unwrap. Wrapper upgrades are by the protocol DAO. A cLLX vault built on Zama inherits a protocol-level pause and an upgrade authority we do not control. The reason to flag it: our design principle is that no admin can move user funds, and here an external party can freeze unwraps.
- **Post-quantum: safe** (lattice-based), a real plus (see section 3).

### 2.4 Aztec and TEN: brief notes only

- **Aztec:** a separate ZK L2 with private state, Alpha mainnet live on Ethereum (the docs say early-stage, may contain critical bugs). Private bridging today is via a third party (Shield) and only for USDC. Using it for cLLX means a new chain, new language (Noir/Aztec.nr), a new wallet and a bridge. Not a near-term fit.
- **TEN:** a TEE-based confidential L2. Same trust class as Sapphire (hardware) plus a new chain and bridge. Not a near-term fit.

### 2.5 Skipped as instructed

Fhenix and Inco (Zama licence underneath), Railgun and shielded pools (a mixer, which we will not build).

## 3. Comparison table, with the post-quantum column

Encrypted balances stay on chain forever, so the question is harvest-now-decrypt-later: can someone copy today's ciphertexts and read them once quantum computers exist?

| | Hides balances? | Live on Base today | Licence for our use | Trust assumption | Post-quantum (stored balances) | ZK/crypto used |
|---|---|---|---|---|---|---|
| **eERC (Converter)** | Yes (amounts, balances). Addresses public. | Technically deployable; **no production licence** outside Avalanche | Ecosystem License: Avalanche only, or non-commercial | Math only; auditor key decrypts all | **No.** ElGamal on Baby Jubjub falls to Shor; ciphertexts are public forever | Groth16 on BN254 (curve SNARK, not PQ) |
| **Sapphire** | Yes, but the token lives on Sapphire, not Base | No (OPL bridge from Base) | Open source | Intel SGX, key manager, bridge | **Stored data: yes** (symmetric). **Key exchange: no** (x25519 for encrypted transactions, so tx contents harvested today are exposed later). | None (TEE) |
| **Zama / ERC-7984 wrapper** | Yes (amounts, balances). Addresses public. | **Unconfirmed**; live on Ethereum and Polygon | Fine on the Zama Protocol; ticket #5115 open | FHE key management and coprocessor network; DAO pause/upgrade | **Yes.** Lattice-based FHE; a real plus | FHE plus input ZK proofs |
| **Noir/UltraHonk or Circom custom ZK balance** (our own build) | Yes if we write an encrypted-balance scheme | Yes (EVM verifier) | Permissive (Noir); Circom tooling is GPL-3.0 | Math only; we own all the audit risk | **No** for any curve-based encryption (KZG on BN254 for proofs; the encryption layer is the stored-data risk) | UltraHonk (KZG, BN254) or Groth16 |

Notes:

- **STARKs** (hash-based) are post-quantum-safe, but none of the candidates above uses them for balances. Groth16 and curve SNARKs are not PQ-safe; their quantum risk is future forgery (soundness), while the confidentiality risk comes from the encryption layer, which for eERC is ElGamal.
- **If eERC (or any curve ElGamal) is chosen:** the migration path is a v2 vault on a PQ-safe scheme, with users unwrapping from v1 and rewrapping into v2 (which reveals the amounts publicly at that moment, so migration is itself a privacy event). Public wording: **"private today, post-quantum upgrade on roadmap."** Do not say "quantum-safe".
- **Wallet signature quantum risk** is chain-level (Ethereum and Base account-abstraction upgrades) and out of scope.

## 4. Recommendation

**Plain words: cLLX is doable, but no option today is both ready on Base and cleanly licensed.** The one the brief ranked first (eERC) is the one we are not allowed to ship on Base. So:

1. **Pick Zama ERC-7984 as the target stack, subject to two answers we do not yet have:** (a) does the Zama Protocol support Base mainnet, and when? (b) does the unanswered licence ticket confirm we can use it commercially on the live protocol? It is the only option with a near-exact match to our wrapper, post-quantum-safe storage, no new key for users and a standard wallet flow. Its weak points are the external pause/upgrade authority and the per-transfer fee.
2. **Start the testnet prototype now on Zama's Sepolia,** in a new repo (not a frozen one). We already have M1/M2 contracts that use this model. Build the vault so that the cLLX backend sits behind a small interface; that keeps a switch to another backend cheap. This needs no extra licence for testnet research.
3. **Send two short emails this week** (drafts for Miles to approve, nothing is sent): one to Zama asking for Base mainnet timing and licence confirmation (this chases ticket #5115); one to Ava Labs asking for a written exception to run eERC on Base. A yes from Ava Labs would make eERC a real, audited-circuit option; a no closes it.
4. **Keep Sapphire as the "demo this week" fallback only,** and tell users plainly that it is a different chain with hardware trust. We do not recommend it for the vault that holds the most LLX.
5. **Do not write our own encrypted-balance scheme.** A custom crypto build adds months and a much larger audit than a wrapper.
6. **Be honest in public copy:** "hides your balance after you wrap, not the wrap itself; addresses stay visible; this is not a mixer."

### Prototype plan (testnet, new repo)

- `LLXVault` (deposit/withdraw, 1:1 rate, per-wallet wrap cap, global cap, no admin path to user funds, owner can only lower caps or pause new wraps, never block withdrawals).
- `cLLX` as an ERC-7984 token minted/burned by the vault only.
- A mock LLX on testnet, plus a test that confirms the real LLX has no fee-on-transfer behaviour.
- A web page for wrap, confidential send, reveal-my-balance and unwrap. Basescan/explorer check: the tester confirms a second wallet cannot read the balance.
- Exit criteria: all vault invariants fuzzed (total cLLX supply equals LLX in vault; withdraw always possible), and a written threat model including the pause/upgrade authority.

### Effort and cost to mainnet (est., not quotes)

| Step | Effort (est.) |
|---|---|
| Testnet vault + cLLX + web UI on the chosen stack | 2 to 3 weeks |
| Fuzz/invariant tests, threat model, public docs | 1 week |
| Paid external audit of the vault and cLLX integration (scope below) | 2 to 4 weeks elapsed; price from quotes, not estimated here |
| Caps-first mainnet launch (needs Miles's per-chain "deploy") | days, after audit fixes |
| If Zama does not support Base in time: wait, or choose Sapphire (about +2 weeks for the bridge) or eERC on Avalanche (needs an LLX bridge, a separate project) | n/a |

**Audit scope.** (1) The vault: accounting, rounding at the rate scale, caps, reentrancy, non-standard-token behaviour, pause semantics. (2) The cLLX token contract and its mint/burn authority. (3) The integration with the confidential layer: input-proof handling, access-control (ACL) grants, and what happens if the confidential layer pauses (withdrawal and recovery paths). (4) Any LLX Pay/X-Lock/X-Escrow code that accepts cLLX. (5) Key and admin custody: crew never holds keys. Third-party libraries (OZ, Zama) are in scope only as to how we use them.

## 5. Also in scope: $LLX in LLX Pay

- **Fee discount.** Offer a fee discount when LLX Pay is paid in $LLX, at the same ratio X-Lock already uses; cLLX becomes the first token private mode supports.
- **Optional settlement token.** LLX as a settlement option alongside USDC, with the usual caps. Confidential settlement stays out until the vault is audited.
- **ZK stays for policy proofs.** Spend-cap and proof-of-funds proofs (Noir; see the earlier privacy options doc) are unchanged and reusable across escrow, lock, proof-of-funds and settlement proofs.
- Nothing in LLX Pay changes during the judging hold.

## 6. What was not verified

- Whether Zama Protocol supports Base mainnet right now (search found Ethereum and Polygon only).
- Whether the LLX token has any fee-on-transfer or hook behaviour (the wrapper refuses those; a source read is needed).
- Base gas cost in dollars for an eERC transfer (Avalanche's gas figure only).
- The Sapphire claim that it was unaffected by recent SGX attacks (Oasis' own statement).
- Audit pricing. Any dollar figure for audits must come from quotes.

## 7. Boundaries

Docs only. Nothing touches liquid-logic-treasurer-web, arc-settlement-recorder, llx-pay or proofs during judging. No mainnet deploy without Miles's per-chain "deploy". The crew never holds keys. Claude reviews before any merge.
