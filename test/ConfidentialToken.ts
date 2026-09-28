import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  owner: HardhatEthersSigner;
  recipient: HardhatEthersSigner;
  other: HardhatEthersSigner;
};

const INITIAL_AMOUNT = 1000n;
const MINT_AMOUNT = 250n;
const TRANSFER_AMOUNT = 100n;

describe("ConfidentialToken (ERC7984)", function () {
  let signers: Signers;
  let token: any;
  let tokenAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      owner: ethSigners[0],
      recipient: ethSigners[1],
      other: ethSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This suite requires FHEVM mock mode (local Hardhat)");
      this.skip();
    }

    token = await ethers.deployContract("ConfidentialToken", [
      signers.owner.address,
      INITIAL_AMOUNT,
      "Liquid Logic X Token",
      "LLX",
      "https://example.com/llx",
    ]);
    tokenAddress = await token.getAddress();
  });

  describe("mint", function () {
    it("mints initial supply to owner and owner can decrypt balance", async function () {
      const balanceHandle = await token.confidentialBalanceOf(signers.owner.address);
      expect(balanceHandle).to.not.eq(ethers.ZeroHash);

      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balanceHandle,
        tokenAddress,
        signers.owner,
      );
      expect(clearBalance).to.eq(INITIAL_AMOUNT);
    });

    it("owner can mint additional tokens via mint()", async function () {
      const tx = await token.connect(signers.owner).mint(signers.recipient.address, MINT_AMOUNT);
      await tx.wait();

      const recipientHandle = await token.confidentialBalanceOf(signers.recipient.address);
      const clearRecipient = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        recipientHandle,
        tokenAddress,
        signers.recipient,
      );
      expect(clearRecipient).to.eq(MINT_AMOUNT);

      const ownerHandle = await token.confidentialBalanceOf(signers.owner.address);
      const clearOwner = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        ownerHandle,
        tokenAddress,
        signers.owner,
      );
      expect(clearOwner).to.eq(INITIAL_AMOUNT);
    });
  });

  describe("transfer", function () {
    it("transfers confidential amount from owner to recipient", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(tokenAddress, signers.owner.address)
        .add64(Number(TRANSFER_AMOUNT))
        .encrypt();

      await expect(
        token
          .connect(signers.owner)
          ["confidentialTransfer(address,bytes32,bytes)"](
            signers.recipient.address,
            encryptedInput.handles[0],
            encryptedInput.inputProof,
          ),
      ).to.not.be.reverted;

      const recipientHandle = await token.confidentialBalanceOf(signers.recipient.address);
      const clearRecipient = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        recipientHandle,
        tokenAddress,
        signers.recipient,
      );
      expect(clearRecipient).to.eq(TRANSFER_AMOUNT);

      const ownerHandle = await token.confidentialBalanceOf(signers.owner.address);
      const clearOwner = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        ownerHandle,
        tokenAddress,
        signers.owner,
      );
      expect(clearOwner).to.eq(INITIAL_AMOUNT - TRANSFER_AMOUNT);
    });
  });

  describe("access control / ACL", function () {
    it("address NOT granted access cannot decrypt a balance", async function () {
      const ownerHandle = await token.confidentialBalanceOf(signers.owner.address);
      expect(ownerHandle).to.not.eq(ethers.ZeroHash);

      await expect(
        fhevm.userDecryptEuint(
          FhevmType.euint64,
          ownerHandle,
          tokenAddress,
          signers.other,
        ),
      ).to.be.rejected;
    });
  });

  describe("threshold proof (Milestone 2)", function () {
    const THRESHOLD = 500n;

    it("verifier decrypts ebool true when balance >= threshold, cannot decrypt balance", async function () {
      const tx = await token.connect(signers.owner).proveThreshold(signers.other.address, Number(THRESHOLD));
      await tx.wait();

      const proofHandle = await token.thresholdProofOf(signers.owner.address, signers.other.address);
      expect(proofHandle).to.not.eq(ethers.ZeroHash);

      const clears = await fhevm.userDecryptEbool(proofHandle, tokenAddress, signers.other);
      expect(clears).to.eq(true);

      const balanceHandle = await token.confidentialBalanceOf(signers.owner.address);
      await expect(
        fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, tokenAddress, signers.other),
      ).to.be.rejected;
    });

    it("verifier decrypts ebool false when balance < threshold, cannot decrypt balance", async function () {
      await (await token.connect(signers.owner).mint(signers.recipient.address, 100)).wait();

      const tx = await token
        .connect(signers.recipient)
        .proveThreshold(signers.other.address, Number(THRESHOLD));
      await tx.wait();

      const proofHandle = await token.thresholdProofOf(
        signers.recipient.address,
        signers.other.address,
      );
      const clears = await fhevm.userDecryptEbool(proofHandle, tokenAddress, signers.other);
      expect(clears).to.eq(false);

      const balanceHandle = await token.confidentialBalanceOf(signers.recipient.address);
      await expect(
        fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, tokenAddress, signers.other),
      ).to.be.rejected;
    });

    it("address NOT granted the ebool cannot decrypt the proof", async function () {
      await (await token.connect(signers.owner).proveThreshold(signers.other.address, Number(THRESHOLD))).wait();
      const proofHandle = await token.thresholdProofOf(signers.owner.address, signers.other.address);

      await expect(
        fhevm.userDecryptEbool(proofHandle, tokenAddress, signers.recipient),
      ).to.be.rejected;
    });
  });
});
