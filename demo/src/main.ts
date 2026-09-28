import "./style.css";
import { Contract } from "ethers";
import {
  CONTRACT_ADDRESS,
  SEPOLIA_CHAIN_ID,
  THRESHOLD_ABI,
} from "./abi";
import { connectWallet, getSigner, type WalletState } from "./wallet";
import {
  decryptHandle,
  formatEbool,
  getSdkPath,
  resetZamaSdk,
} from "./zama";

let wallet: WalletState | null = null;

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header>
    <h1>Liquid Logic Agent — Threshold demo</h1>
    <p>
      Prove <code>balance &gt;= threshold</code> by decrypting an ACL-granted
      <code>ebool</code> — never the confidential balance.
    </p>
    <p class="meta">
      Contract <a href="https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}" target="_blank" rel="noreferrer">${CONTRACT_ADDRESS}</a>
      · Sepolia ${SEPOLIA_CHAIN_ID}
      · SDK path: <span id="sdk-path">${getSdkPath()}</span>
    </p>
  </header>

  <section id="section-a">
    <h2>A. Connect wallet</h2>
    <p style="margin:0 0 0.75rem;color:var(--muted);font-size:0.92rem">
      Must be Sepolia (<code>${SEPOLIA_CHAIN_ID}</code>). The demo will prompt a switch if needed.
    </p>
    <button id="btn-connect" type="button">Connect wallet</button>
    <div id="connect-status" class="status">Not connected.</div>
  </section>

  <section id="section-b">
    <h2>B. Grant proof (holder)</h2>
    <p style="margin:0 0 0.5rem;color:var(--muted);font-size:0.92rem">
      Calls <code>proveThreshold(verifier, threshold)</code> as the connected holder.
      ACL is granted on the comparison <code>ebool</code> only.
    </p>
    <div class="row">
      <div>
        <label for="verifier">Verifier address</label>
        <input id="verifier" type="text" placeholder="0x…" spellcheck="false" />
      </div>
      <div>
        <label for="threshold">Threshold (uint64)</label>
        <input id="threshold" type="number" min="0" step="1" value="1000" />
      </div>
    </div>
    <div style="margin-top:0.9rem">
      <button id="btn-prove" type="button" disabled>Call proveThreshold</button>
    </div>
    <div id="prove-status" class="status">Waiting for wallet…</div>
  </section>

  <section id="section-c">
    <h2>C. Verify (verifier)</h2>
    <p style="margin:0 0 0.5rem;color:var(--muted);font-size:0.92rem">
      As the connected verifier: read <code>thresholdProofOf(holder, you)</code>,
      decrypt the ebool via Zama SDK → YES/NO. Then attempt to decrypt
      <code>confidentialBalanceOf(holder)</code> — expected <strong>DENIED</strong>.
    </p>
    <div>
      <label for="holder">Holder address</label>
      <input id="holder" type="text" placeholder="0x…" spellcheck="false" />
    </div>
    <div style="margin-top:0.9rem">
      <button id="btn-check" type="button" disabled>Check threshold</button>
    </div>
    <div id="check-status" class="status">Waiting for wallet…</div>
  </section>
`;

const el = {
  connectBtn: document.querySelector<HTMLButtonElement>("#btn-connect")!,
  connectStatus: document.querySelector<HTMLDivElement>("#connect-status")!,
  verifier: document.querySelector<HTMLInputElement>("#verifier")!,
  threshold: document.querySelector<HTMLInputElement>("#threshold")!,
  proveBtn: document.querySelector<HTMLButtonElement>("#btn-prove")!,
  proveStatus: document.querySelector<HTMLDivElement>("#prove-status")!,
  holder: document.querySelector<HTMLInputElement>("#holder")!,
  checkBtn: document.querySelector<HTMLButtonElement>("#btn-check")!,
  checkStatus: document.querySelector<HTMLDivElement>("#check-status")!,
};

function setEnabled(connected: boolean) {
  el.proveBtn.disabled = !connected;
  el.checkBtn.disabled = !connected;
}

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function onConnect() {
  el.connectBtn.disabled = true;
  el.connectStatus.className = "status warn";
  el.connectStatus.textContent = "Connecting…";
  try {
    resetZamaSdk();
    wallet = await connectWallet();
    el.verifier.value = wallet.address;
    if (!el.holder.value) el.holder.value = wallet.address;
    el.connectStatus.className = "status ok";
    el.connectStatus.innerHTML =
      `<span class="pill ok">CONNECTED</span> ${wallet.address}\n` +
      `Network: Sepolia (${wallet.chainId})`;
    el.proveStatus.className = "status";
    el.proveStatus.textContent = `Ready as holder ${short(wallet.address)}.`;
    el.checkStatus.className = "status";
    el.checkStatus.textContent = `Ready as verifier ${short(wallet.address)}.`;
    setEnabled(true);
  } catch (err) {
    wallet = null;
    setEnabled(false);
    el.connectStatus.className = "status bad";
    el.connectStatus.textContent =
      err instanceof Error ? err.message : String(err);
  } finally {
    el.connectBtn.disabled = false;
  }
}

async function onProve() {
  if (!wallet) return;
  el.proveBtn.disabled = true;
  el.proveStatus.className = "status warn";
  el.proveStatus.textContent = "Submitting proveThreshold…";
  try {
    const verifier = el.verifier.value.trim();
    const threshold = BigInt(el.threshold.value || "0");
    if (!/^0x[a-fA-F0-9]{40}$/.test(verifier)) {
      throw new Error("Verifier must be a 0x-prefixed 20-byte address");
    }
    const signer = await getSigner(wallet.provider);
    const contract = new Contract(CONTRACT_ADDRESS, THRESHOLD_ABI, signer);
    const tx = await contract.proveThreshold(verifier, threshold);
    el.proveStatus.textContent = `Tx sent: ${tx.hash}\nWaiting for confirmation…`;
    const receipt = await tx.wait();
    el.proveStatus.className = "status ok";
    el.proveStatus.innerHTML =
      `<span class="pill ok">MINED</span> proveThreshold\n` +
      `tx: <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" rel="noreferrer">${tx.hash}</a>\n` +
      `block: ${receipt?.blockNumber ?? "?"}`;
  } catch (err) {
    el.proveStatus.className = "status bad";
    el.proveStatus.textContent =
      err instanceof Error ? err.message : String(err);
  } finally {
    el.proveBtn.disabled = false;
  }
}

async function onCheck() {
  if (!wallet) return;
  el.checkBtn.disabled = true;
  el.checkStatus.className = "status warn";
  el.checkStatus.textContent = "Reading handles + decrypting…";

  const lines: string[] = [];
  try {
    const holder = el.holder.value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(holder)) {
      throw new Error("Holder must be a 0x-prefixed 20-byte address");
    }

    const contract = new Contract(
      CONTRACT_ADDRESS,
      THRESHOLD_ABI,
      wallet.provider,
    );

    const proofHandle: string = await contract.thresholdProofOf(
      holder,
      wallet.address,
    );
    lines.push(`thresholdProofOf(${short(holder)}, you) → ${proofHandle}`);

    const proofDecrypt = await decryptHandle(
      wallet.ethereum,
      proofHandle,
      CONTRACT_ADDRESS,
    );

    if (proofDecrypt.ok) {
      const label = formatEbool(proofDecrypt.value);
      lines.push(`\nThreshold ebool decrypt: ${label}`);
      lines.push(`(raw cleartext: ${String(proofDecrypt.value)})`);
    } else {
      lines.push(`\nThreshold ebool decrypt FAILED: ${proofDecrypt.error}`);
    }

    const balanceHandle: string = await contract.confidentialBalanceOf(holder);
    lines.push(`\nconfidentialBalanceOf(${short(holder)}) → ${balanceHandle}`);
    lines.push("Attempting balance decrypt as verifier (expected DENIED)…");

    const balanceDecrypt = await decryptHandle(
      wallet.ethereum,
      balanceHandle,
      CONTRACT_ADDRESS,
    );

    if (balanceDecrypt.ok) {
      // Unexpected — ACL should block this for a pure verifier.
      lines.push(
        `Balance decrypt unexpectedly SUCCEEDED: ${String(balanceDecrypt.value)}`,
      );
      el.checkStatus.className = "status warn";
    } else {
      lines.push(
        `Balance decrypt: DENIED / error (expected)\n→ ${balanceDecrypt.error}`,
      );
      el.checkStatus.className = proofDecrypt.ok ? "status ok" : "status bad";
    }

    const header = proofDecrypt.ok
      ? `<span class="pill ok">THRESHOLD</span> ${formatEbool(proofDecrypt.value)}\n` +
        `<span class="pill bad">BALANCE</span> not readable\n\n`
      : `<span class="pill warn">CHECK</span>\n\n`;

    el.checkStatus.innerHTML = header + lines.join("\n");
  } catch (err) {
    el.checkStatus.className = "status bad";
    el.checkStatus.textContent =
      (lines.length ? lines.join("\n") + "\n\n" : "") +
      (err instanceof Error ? err.message : String(err));
  } finally {
    el.checkBtn.disabled = false;
  }
}

el.connectBtn.addEventListener("click", () => void onConnect());
el.proveBtn.addEventListener("click", () => void onProve());
el.checkBtn.addEventListener("click", () => void onCheck());

if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", () => {
    wallet = null;
    resetZamaSdk();
    setEnabled(false);
    el.connectStatus.className = "status warn";
    el.connectStatus.textContent = "Account changed — reconnect.";
  });
  window.ethereum.on("chainChanged", () => {
    wallet = null;
    resetZamaSdk();
    setEnabled(false);
    el.connectStatus.className = "status warn";
    el.connectStatus.textContent = "Network changed — reconnect (need Sepolia).";
  });
}
