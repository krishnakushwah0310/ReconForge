// ─────────────────────────────────────────────
//  ReconForge — UI Controller v4.0
// ─────────────────────────────────────────────

let selectedMode = "basic";
let isGenerating = false;

const modeInfo = {
  basic: {
    desc: "WHOIS · DNS · Certificate recon · Fast Nmap scan",
    time: "~3–5 min",
    color: "basic"
  },
  advanced: {
    desc: "Basic + Subdomain enum · Service scan · Tech fingerprint · WAF",
    time: "~15–20 min",
    color: "advanced"
  },
  aggressive: {
    desc: "Advanced + Full port scan · Dir fuzz · Vuln scan · Nuclei",
    time: "~35–45 min",
    color: "aggressive"
  }
};

// ── Mode Button Logic ────────────────────────
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
    const info = modeInfo[selectedMode];
    document.getElementById("modeDesc").textContent = info.desc;
    document.getElementById("modeTime").textContent = "⏱ Est. time: " + info.time;
    document.getElementById("modeTime").className = "mode-time time-" + selectedMode;
  });
});

// ── Domain Input Auto-fill from Active Tab ───
chrome.tabs?.query({ active: true, currentWindow: true }, tabs => {
  if (tabs && tabs[0]?.url) {
    try {
      const url = new URL(tabs[0].url);
      if (!url.hostname.includes("chrome") && !url.hostname.includes("extension")) {
        document.getElementById("domain").value = url.hostname;
      }
    } catch (e) {}
  }
});

// ── Generate Button ──────────────────────────
document.getElementById("generate").addEventListener("click", () => {
  if (isGenerating) return;

  const rawDomain = document.getElementById("domain").value.trim();
  const errorEl = document.getElementById("error");

  if (!rawDomain) { showError("Please enter a target domain"); return; }

  const domain = cleanDomain(rawDomain);
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) { showError("Invalid domain format"); return; }

  errorEl.textContent = "";
  startGenerate(domain);
});

function showError(msg) {
  const errorEl = document.getElementById("error");
  errorEl.textContent = msg;
  errorEl.classList.add("shake");
  setTimeout(() => errorEl.classList.remove("shake"), 500);
}

function startGenerate(domain) {
  isGenerating = true;
  const btn = document.getElementById("generate");
  btn.textContent = "SCANNING...";
  btn.classList.add("loading");

  setTimeout(() => {
    renderOutput(domain);
    isGenerating = false;
    btn.textContent = "GENERATE";
    btn.classList.remove("loading");
  }, 300);
}

function renderOutput(domain) {
  const sections = getCommandsByMode(domain, selectedMode);
  const container = document.getElementById("commands");
  container.innerHTML = "";

  const totalCmds = sections.reduce((acc, s) => acc + s.commands.length, 0);
  const info = modeInfo[selectedMode];

  document.getElementById("statsBar").innerHTML =
    `<span class="stat-item">📁 ${sections.length} categories</span>
     <span class="stat-sep">·</span>
     <span class="stat-item">⚡ ${totalCmds} commands</span>
     <span class="stat-sep">·</span>
     <span class="stat-item">⏱ ${info.time}</span>
     <span class="stat-sep">·</span>
     <span class="stat-mode mode-${selectedMode}">${selectedMode.toUpperCase()}</span>`;
  document.getElementById("statsBar").style.display = "flex";

  sections.forEach((section, sIdx) => {
    const sectionEl = document.createElement("div");
    sectionEl.className = "cmd-section";
    sectionEl.style.animationDelay = `${sIdx * 80}ms`;

    const header = document.createElement("div");
    header.className = "section-header";
    header.innerHTML = `
      <span class="section-icon">${section.icon}</span>
      <span class="section-title">${section.category}</span>
      <span class="section-count">${section.commands.length} cmd${section.commands.length > 1 ? "s" : ""}</span>
    `;
    sectionEl.appendChild(header);

    section.commands.forEach((cmdObj, cIdx) => {
      const box = document.createElement("div");
      box.className = "cmd-box";
      box.style.animationDelay = `${sIdx * 80 + cIdx * 40}ms`;

      const saveTag = cmdObj.save ? `<span class="save-tag">→ ${cmdObj.save}</span>` : "";

      box.innerHTML = `
        <div class="cmd-meta">
          <span class="cmd-desc">${cmdObj.desc}</span>
          ${saveTag}
        </div>
        <div class="cmd-row">
          <code class="cmd-text">${escapeHtml(cmdObj.cmd)}</code>
          <button class="copy-btn" title="Copy command">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      `;

      box.querySelector(".copy-btn").addEventListener("click", (e) => {
        navigator.clipboard.writeText(cmdObj.cmd).then(() => {
          const btn = e.currentTarget;
          btn.classList.add("copied");
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
          }, 1500);
        });
      });

      sectionEl.appendChild(box);
    });

    container.appendChild(sectionEl);
  });

  const script = generateScript(domain, selectedMode);
  document.getElementById("scriptOutput").textContent = script;
  document.getElementById("outputPanel").classList.add("visible");
  setTimeout(() => document.getElementById("outputPanel").scrollIntoView({ behavior: "smooth" }), 100);

  document.getElementById("copyScript").onclick = () => {
    navigator.clipboard.writeText(script).then(() => {
      const btn = document.getElementById("copyScript");
      const orig = btn.textContent;
      btn.textContent = "✓ COPIED";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1500);
    });
  };

  document.getElementById("downloadScript").onclick = () => {
    const d = stripWww(cleanDomain(document.getElementById("domain").value.trim()));
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconforge_${d}_${selectedMode}.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
