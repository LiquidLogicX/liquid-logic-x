/** Minimal ABI for threshold demo (ebool / euint64 return as bytes32 handles). */
export const THRESHOLD_ABI = [
  "function proveThreshold(address verifier, uint64 threshold) returns (bytes32)",
  "function thresholdProofOf(address holder, address verifier) view returns (bytes32)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
] as const;

/** M2 Sepolia deployment (see docs/deployments.md). */
export const CONTRACT_ADDRESS = "0x1132E6b5Cafe10990879Eed95e4bf10179DE9c7a";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_HEX = "0xaa36a7";
