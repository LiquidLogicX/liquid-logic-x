import { BrowserProvider, type Eip1193Provider } from "ethers";
import { SEPOLIA_CHAIN_ID, SEPOLIA_HEX } from "./abi";
import type { BrowserEthereum } from "./zama";

export type WalletState = {
  address: string;
  chainId: number;
  provider: BrowserProvider;
  ethereum: BrowserEthereum;
};

function requireEthereum(): BrowserEthereum {
  if (!window.ethereum) {
    throw new Error(
      "No EIP-1193 wallet found. Install MetaMask (or similar) and reload.",
    );
  }
  return window.ethereum as BrowserEthereum;
}

export async function connectWallet(): Promise<WalletState> {
  const ethereum = requireEthereum();
  const provider = new BrowserProvider(ethereum as Eip1193Provider);
  await provider.send("eth_requestAccounts", []);
  let network = await provider.getNetwork();
  let chainId = Number(network.chainId);

  if (chainId !== SEPOLIA_CHAIN_ID) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_HEX }],
      });
    } catch (switchErr: unknown) {
      const code = (switchErr as { code?: number })?.code;
      if (code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_HEX,
              chainName: "Sepolia",
              nativeCurrency: {
                name: "SepoliaETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        throw new Error(
          `Please switch your wallet to Sepolia (chainId ${SEPOLIA_CHAIN_ID}). Current: ${chainId}`,
        );
      }
    }
    network = await provider.getNetwork();
    chainId = Number(network.chainId);
  }

  if (chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Wrong network: expected Sepolia ${SEPOLIA_CHAIN_ID}, got ${chainId}`,
    );
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { address, chainId, provider, ethereum };
}

export async function getSigner(provider: BrowserProvider) {
  return provider.getSigner();
}
