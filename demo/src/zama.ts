import { ZamaSDK, type Hex, type Address } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/ethers";
import { web } from "@zama-fhe/sdk/web";
import { sepolia } from "@zama-fhe/sdk/chains";

/** Minimal EIP-1193 surface; cast to the SDK's expected provider at the boundary. */
export type BrowserEthereum = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type DecryptResult =
  | { ok: true; value: bigint | boolean | string | number }
  | { ok: false; error: string };

let sdkSingleton: ZamaSDK | null = null;
const sdkPath =
  "@zama-fhe/sdk (createConfig from /ethers + web() + sepolia + decryptValues)";

/**
 * Browser Zama SDK via ethers adapter.
 * Sepolia testnet relayer needs no API key (preset works as-is).
 * Uses runtime.singleThread so Vite/static hosts without COOP/COEP still work.
 */
export async function getZamaSdk(ethereum: BrowserEthereum): Promise<ZamaSDK> {
  if (sdkSingleton) return sdkSingleton;

  // Docs: Browser (ethers) — pass raw EIP-1193 provider.
  // Cast: SDK's ZamaConfigEthers discriminated union is strict about
  // viem EIP1193Provider.on/removeListener; MetaMask is compatible at runtime.
  const config = createConfig({
    chains: [sepolia],
    ethereum,
    relayers: { [sepolia.id]: web() },
    runtime: { singleThread: true },
    logger: console,
  } as Parameters<typeof createConfig>[0]);

  sdkSingleton = new ZamaSDK(config);
  return sdkSingleton;
}

export function getSdkPath(): string {
  return sdkPath;
}

export function resetZamaSdk(): void {
  if (sdkSingleton) {
    try {
      sdkSingleton.terminate();
    } catch {
      /* ignore */
    }
  }
  sdkSingleton = null;
}

function asHex(value: string): Hex {
  if (!value.startsWith("0x")) {
    throw new Error(`Expected 0x-prefixed handle, got: ${value.slice(0, 18)}…`);
  }
  return value as Hex;
}

function asAddress(value: string): Address {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return value as Address;
}

/** Decrypt a single encrypted handle for `contractAddress` with the connected wallet. */
export async function decryptHandle(
  ethereum: BrowserEthereum,
  encryptedValue: string,
  contractAddress: string,
): Promise<DecryptResult> {
  try {
    if (!encryptedValue || encryptedValue === "0x" + "0".repeat(64)) {
      return { ok: false, error: "Empty / zero handle (no proof stored yet?)" };
    }

    const sdk = await getZamaSdk(ethereum);
    const handle = asHex(encryptedValue);
    const result = await sdk.decryption.decryptValues([
      {
        encryptedValue: handle,
        contractAddress: asAddress(contractAddress),
      },
    ]);

    const value =
      (result as Record<string, unknown>)[encryptedValue] ??
      Object.values(result as Record<string, unknown>)[0];

    if (value === undefined) {
      return { ok: false, error: "Decrypt returned no value for handle" };
    }

    return { ok: true, value: value as bigint | boolean | string | number };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Interpret decrypted ebool-ish values as YES/NO. */
export function formatEbool(value: bigint | boolean | string | number): string {
  if (typeof value === "boolean") {
    return value ? "YES — clears" : "NO — does not clear";
  }
  if (typeof value === "bigint") {
    return value === 1n ? "YES — clears" : "NO — does not clear";
  }
  if (typeof value === "number") {
    return value === 1 ? "YES — clears" : "NO — does not clear";
  }
  const s = String(value).toLowerCase();
  if (s === "true" || s === "1") return "YES — clears";
  if (s === "false" || s === "0") return "NO — does not clear";
  return `YES/NO (raw: ${String(value)})`;
}
