// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ConfidentialToken — Liquid Logic X Milestone 1
/// @notice Confidential ERC7984 token with owner mint and encrypted transfers.
/// @dev Uses ZamaEthereumConfig for Sepolia-compatible FHE setup. Does not
///      fork or wrap fhevm/solidity or openzeppelin/confidential-contracts packages.
contract ConfidentialToken is ZamaEthereumConfig, ERC7984, Ownable2Step {
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
}
