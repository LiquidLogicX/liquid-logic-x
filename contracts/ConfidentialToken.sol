// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, externalEuint64, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ConfidentialToken — Liquid Logic X
/// @notice Confidential ERC7984 token with mint/transfer and threshold proofs.
/// @dev Milestone 2: prove balance >= threshold by granting ACL on the encrypted
///      comparison result (ebool), not on the balance itself. Uses only audited
///      FHE.ge / FHE.allow from fhevm solidity — no custom cryptography.
contract ConfidentialToken is ZamaEthereumConfig, ERC7984, Ownable2Step {
    /// @dev Last threshold-clearance proof for (holder, verifier).
    mapping(address holder => mapping(address verifier => ebool proof)) private _thresholdProofs;

    constructor(
        address owner_,
        uint64 initialAmount,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) Ownable(owner_) {
        euint64 encryptedAmount = FHE.asEuint64(initialAmount);
        _mint(owner_, encryptedAmount);
    }

    /// @notice Mint a clear (visible) amount to `to`. Amount appears in calldata.
    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
    }

    /// @notice Mint an encrypted amount to `to` (amount stays confidential).
    function confidentialMint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint64 transferred) {
        return _mint(to, FHE.fromExternal(encryptedAmount, inputProof));
    }

    /// @notice Prove msg.sender's balance clears `threshold` without revealing the balance.
    /// @dev Computes ebool = (balance >= threshold) via FHE.ge, then grants `verifier`
    ///      ACL to decrypt that ebool only — never the balance handle.
    function proveThreshold(address verifier, uint64 threshold) external returns (ebool clears) {
        require(verifier != address(0), "verifier=0");
        euint64 balance = confidentialBalanceOf(msg.sender);
        clears = FHE.ge(balance, threshold);
        FHE.allowThis(clears);
        FHE.allow(clears, verifier);
        FHE.allow(clears, msg.sender);
        _thresholdProofs[msg.sender][verifier] = clears;
    }

    /// @notice Stored threshold-clearance proof for (holder, verifier), if any.
    function thresholdProofOf(address holder, address verifier) external view returns (ebool) {
        return _thresholdProofs[holder][verifier];
    }
}
