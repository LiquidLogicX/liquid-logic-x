import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Sepolia deploy for ConfidentialToken.
 * Requires env: PRIVATE_KEY, SEPOLIA_RPC_URL (never commit).
 * Optional: ETHERSCAN_API_KEY for verification.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  if (network.name === "sepolia") {
    if (!process.env.PRIVATE_KEY?.trim()) {
      throw new Error("PRIVATE_KEY env is required for Sepolia deploy");
    }
    if (!process.env.SEPOLIA_RPC_URL?.trim()) {
      throw new Error("SEPOLIA_RPC_URL env is required for Sepolia deploy");
    }
  }

  const balance = await ethers.provider.getBalance(deployer);
  log(`Network: ${network.name} (chainId ${network.config.chainId})`);
  log(`Deployer: ${deployer}`);
  log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (network.name === "sepolia" && balance === 0n) {
    throw new Error(
      `Deployer ${deployer} has 0 Sepolia ETH — fund the address before deploying`,
    );
  }

  const initialAmount = 1_000_000;
  const name_ = "Liquid Logic X Token";
  const symbol_ = "LLX";
  const contractURI_ = "https://example.com/llx";

  const deployed = await deploy("ConfidentialToken", {
    from: deployer,
    args: [deployer, initialAmount, name_, symbol_, contractURI_],
    log: true,
    waitConfirmations: network.name === "sepolia" ? 2 : 1,
  });

  log(`ConfidentialToken: ${deployed.address}`);
  log(`Tx hash: ${deployed.transactionHash}`);
  log(`Gas used: ${deployed.receipt?.gasUsed?.toString() ?? "n/a"}`);
  log(`Block: ${deployed.receipt?.blockNumber ?? "n/a"}`);
};

export default func;
func.id = "deploy_confidentialToken";
func.tags = ["ConfidentialToken"];
