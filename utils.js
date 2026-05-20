// ─────────────────────────────────────────────
//  ReconForge — Command Engine v3.4
// ─────────────────────────────────────────────

// ── Domain Helpers ───────────────────────────
function cleanDomain(domain) {
  return domain
    .replace(/https?:\/\//i, "")
    .replace(/\/$/, "")
    .replace(/\/.*/, "")
    .trim();
}

function stripWww(domain) {
  return domain.replace(/^www\./i, "");
}

function getRootDomain(domain) {
  const parts = domain.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : domain;
}

// ── Mode Time Estimates ──────────────────────
const MODE_TIME = {
  basic:      "~3–5 min",
  advanced:   "~15–20 min",
  aggressive: "~35–45 min"
};

// ─────────────────────────────────────────────
//  Command Definitions
// ─────────────────────────────────────────────
function getCommandsByMode(domain, mode) {
  domain = cleanDomain(domain);
  const root = getRootDomain(stripWww(domain));
  const d = stripWww(domain);

  const sections = {

    // ════════════════════════════════════════
    //  BASIC MODE  (~3–5 min)
    // ════════════════════════════════════════
    basic: [
      {
        category: "WHOIS & DNS",
        icon: "🌐",
        commands: [
          { cmd: `whois ${root} 2>/dev/null || curl -s --max-time 15 "https://rdap.org/domain/${root}"`, desc: "WHOIS lookup (RDAP fallback)", save: `whois_${root}.txt` },
          { cmd: `dig ${d} A +short`, desc: "A records (IPv4)", save: `dig_a_${d}.txt` },
          { cmd: `dig ${root} NS +short`, desc: "Nameserver records", save: `dig_ns_${root}.txt` },
          { cmd: `dig ${root} MX +short`, desc: "Mail records", save: `dig_mx_${root}.txt` },
          { cmd: `dig ${root} TXT +short`, desc: "TXT records (SPF/DMARC)", save: `dig_txt_${root}.txt` },
          { cmd: `dig ${d} AAAA +short`, desc: "IPv6 records", save: `dig_ipv6_${d}.txt` },
        ]
      },
      {
        category: "CERTIFICATE RECON",
        icon: "🔐",
        commands: [
          { cmd: `curl -s --max-time 30 "https://crt.sh/?q=%25.${root}&output=json" | jq -r '.[].name_value' | sort -u`, desc: "SSL cert subdomains (crt.sh)", save: `crt_${root}.txt` },
          { cmd: `timeout 15 openssl s_client -connect ${d}:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject Alt"`, desc: "Live cert SAN check", save: `cert_san_${d}.txt` },
        ]
      },
      {
        category: "NMAP — FAST SCAN",
        icon: "📡",
        commands: [
          { cmd: `nmap -T4 -F -Pn --open ${d}`, desc: "Fast top-100 port scan", save: `nmap_fast_${d}.txt` },
        ]
      }
    ],

    // ════════════════════════════════════════
    //  ADVANCED MODE  (~15–20 min)
    // ════════════════════════════════════════
    advanced: [
      {
        category: "WHOIS & DNS",
        icon: "🌐",
        commands: [
          { cmd: `whois ${root} 2>/dev/null || curl -s --max-time 15 "https://rdap.org/domain/${root}"`, desc: "WHOIS lookup (RDAP fallback)", save: `whois_${root}.txt` },
          { cmd: `dig ${d} A +short`, desc: "A records (IPv4)", save: `dig_a_${d}.txt` },
          { cmd: `dig ${root} NS +short`, desc: "Nameserver records", save: `dig_ns_${root}.txt` },
          { cmd: `dig ${root} MX +short`, desc: "Mail records", save: `dig_mx_${root}.txt` },
          { cmd: `dig ${root} TXT +short`, desc: "TXT records (SPF/DMARC)", save: `dig_txt_${root}.txt` },
          { cmd: `dig ${d} AAAA +short`, desc: "IPv6 records", save: `dig_ipv6_${d}.txt` },
          { cmd: `dnsrecon -d ${root} -t std`, desc: "Full DNS recon", save: `dnsrecon_${root}.txt` },
        ]
      },
      {
        category: "CERTIFICATE RECON",
        icon: "🔐",
        commands: [
          { cmd: `curl -s --max-time 30 "https://crt.sh/?q=%25.${root}&output=json" | jq -r '.[].name_value' | sort -u`, desc: "SSL cert subdomains (crt.sh)", save: `crt_${root}.txt` },
          { cmd: `timeout 15 openssl s_client -connect ${d}:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject Alt"`, desc: "Live cert SAN check", save: `cert_san_${d}.txt` },
        ]
      },
      {
        category: "SUBDOMAIN ENUMERATION",
        icon: "🕸️",
        commands: [
          { cmd: `subfinder -d ${root} -o subfinder_${root}.txt 2>/dev/null`, desc: "Subfinder passive enum", save: null },
          { cmd: `cat subfinder_${root}.txt 2>/dev/null | sort -u > all_subs_${root}.txt`, desc: "Deduplicate subdomains", save: null },
          { cmd: `httpx -l all_subs_${root}.txt -o live_subs_${root}.txt 2>/dev/null`, desc: "Find live subdomains", save: null },
        ]
      },
      {
        category: "NMAP — DEEP SCAN",
        icon: "📡",
        commands: [
          { cmd: `nmap -T4 -sV -sC -Pn --open -p 21,22,23,25,53,80,110,143,443,445,3306,8080,8443 ${d}`, desc: "Service + script scan (common ports)", save: `nmap_common_${d}.txt` },
          { cmd: `nmap -T4 -F -Pn --open ${d}`, desc: "Fast top-100 scan", save: `nmap_fast_${d}.txt` },
        ]
      },
      {
        category: "TECH FINGERPRINTING",
        icon: "🧬",
        commands: [
          { cmd: `whatweb -v https://${d}`, desc: "Web tech fingerprint", save: `whatweb_${d}.txt` },
          { cmd: `curl -sI https://${d}`, desc: "HTTP headers grab", save: `headers_${d}.txt` },
          { cmd: `wafw00f https://${d}`, desc: "WAF detection", save: `waf_${d}.txt` },
        ]
      }
    ],

    // ════════════════════════════════════════
    //  AGGRESSIVE MODE  (~35–45 min)
    // ════════════════════════════════════════
    aggressive: [
      {
        category: "WHOIS & DNS",
        icon: "🌐",
        commands: [
          { cmd: `whois ${root} 2>/dev/null || curl -s --max-time 15 "https://rdap.org/domain/${root}"`, desc: "WHOIS lookup (RDAP fallback)", save: `whois_${root}.txt` },
          { cmd: `dnsrecon -d ${root} -t std,axfr`, desc: "DNS recon + zone transfer attempt", save: `dnsrecon_full_${root}.txt` },
          { cmd: `echo "${root}" | dnsx -a -aaaa -mx -ns -txt -cname -resp`, desc: "dnsx full record dump", save: `dnsx_${root}.txt` },
          { cmd: `dig axfr ${root} @$(dig ns ${root} +short | head -1) 2>/dev/null || echo "Zone transfer failed/not allowed"`, desc: "Zone transfer attempt", save: `axfr_${root}.txt` },
        ]
      },
      {
        category: "CERTIFICATE RECON",
        icon: "🔐",
        commands: [
          { cmd: `curl -s --max-time 30 "https://crt.sh/?q=%25.${root}&output=json" | jq -r '.[].name_value' | sort -u`, desc: "SSL cert subdomains (crt.sh)", save: `crt_${root}.txt` },
          { cmd: `timeout 15 openssl s_client -connect ${d}:443 2>/dev/null | openssl x509 -noout -text`, desc: "Full cert dump", save: `cert_full_${d}.txt` },
        ]
      },
      {
        category: "SUBDOMAIN ENUMERATION",
        icon: "🕸️",
        commands: [
          { cmd: `subfinder -d ${root} -all -o subfinder_${root}.txt 2>/dev/null`, desc: "Subfinder (all sources)", save: null },
          { cmd: `cat subfinder_${root}.txt 2>/dev/null | sort -u > all_subs_${root}.txt`, desc: "Deduplicate all subdomains", save: null },
          { cmd: `httpx -l all_subs_${root}.txt -tech-detect -status-code -o live_subs_${root}.txt 2>/dev/null`, desc: "Live subs + tech detect", save: null },
        ]
      },
      {
        category: "NMAP — MASTER SCAN",
        icon: "📡",
        commands: [
          { cmd: `nmap --top-ports 1000 --min-rate=500 -T3 -Pn -sV -sC --open -oN nmap_master_${d}.txt ${d} 2>&1`, desc: "Top-1000 ports + service scan (stealth)", save: null },
          { cmd: `nmap --script vuln -Pn -p 80,443,8080,8443 ${d}`, desc: "Vuln scripts on web ports", save: `nmap_vuln_${d}.txt` },
        ]
      },
      {
        category: "TECH FINGERPRINTING",
        icon: "🧬",
        commands: [
          { cmd: `whatweb -v -a 3 https://${d}`, desc: "Aggressive tech fingerprint", save: `whatweb_${d}.txt` },
          { cmd: `curl -sI https://${d}`, desc: "HTTP headers", save: `headers_${d}.txt` },
          { cmd: `wafw00f https://${d} -a`, desc: "WAF detect (all techniques)", save: `waf_${d}.txt` },
          { cmd: `nuclei -u https://${d} -tags tech -o nuclei_tech_${d}.txt`, desc: "Nuclei tech fingerprint", save: null },
        ]
      },
      {
        category: "DIRECTORY FUZZING",
        icon: "📂",
        commands: [
          { cmd: `ffuf -u https://${d}/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc 200,301,302,403 -t 40 -o ffuf_${d}.json`, desc: "ffuf dir fuzz (common.txt)", save: null },
        ]
      },
      {
        category: "URL & PARAM RECON",
        icon: "🔗",
        commands: [
          { cmd: `timeout 60 gau ${root} | tee gau_${root}.txt`, desc: "All known URLs (Wayback + OTX, 1min)", save: null },
          { cmd: `grep "=" gau_${root}.txt | sort -u`, desc: "Extract URLs with parameters", save: `params_${root}.txt` },
          { cmd: `grep -E "\\.js$" gau_${root}.txt | sort -u`, desc: "Extract all JS file URLs", save: `jsfiles_${root}.txt` },
        ]
      },
      {
        category: "VULNERABILITY SCAN",
        icon: "⚠️",
        commands: [
          { cmd: `nuclei -u https://${d} -tags cve -severity medium,high,critical -o nuclei_cves_${d}.txt`, desc: "Nuclei CVE scan (medium/high/critical)", save: null },
        ]
      }
    ]
  };

  return sections[mode] || sections.basic;
}

// ─────────────────────────────────────────────
//  Script Generator v3.4
// ─────────────────────────────────────────────
function generateScript(domain, mode) {
  domain = cleanDomain(domain);
  const d = stripWww(domain);
  const root = getRootDomain(d);
  const sections = getCommandsByMode(domain, mode);
  const modeUpper = mode.toUpperCase();
  const timeEst = MODE_TIME[mode];

  const toolsPerMode = {
    basic:      ["whois", "dig", "curl", "jq", "openssl", "nmap"],
    advanced:   ["whois", "dig", "curl", "jq", "openssl", "nmap", "dnsrecon", "subfinder", "httpx", "whatweb", "wafw00f"],
    aggressive: ["whois", "dig", "curl", "jq", "openssl", "nmap", "dnsrecon", "dnsx", "subfinder", "httpx", "whatweb", "wafw00f", "nuclei", "ffuf", "gau"]
  };

  const tools = toolsPerMode[mode] || toolsPerMode.basic;

  let script = `#!/bin/bash
# ╔══════════════════════════════════════════╗
# ║       ReconForge v3.4 Script             ║
# ║   Mode    : ${modeUpper.padEnd(28)}  ║
# ║   Target  : ${d.substring(0, 26).padEnd(26)}  ║
# ║   Est Time: ${timeEst.padEnd(26)}  ║
# ╚══════════════════════════════════════════╝

TARGET="${d}"
ROOT="${root}"
MODE="${mode}"
OUTDIR="recon_\${TARGET}_$(date +%Y%m%d_%H%M%S)"
MISSING_TOOLS=()

echo ""
echo "  ██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗"
echo "  ██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║"
echo "  ██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║"
echo "  ██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║"
echo "  ██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║"
echo "  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝"
echo "           F O R G E  v3.4"
echo ""
echo "[*] Target   : \$TARGET"
echo "[*] Root     : \$ROOT"
echo "[*] Mode     : \$MODE"
echo "[*] Est Time : ${timeEst}"
echo "[*] Output   : \$OUTDIR"
echo "[*] Started  : $(date)"
echo ""

# ── Dependency Check ────────────────────────
echo "[*] Checking dependencies..."
`;

  tools.forEach(tool => {
    script += `if ! command -v ${tool} &>/dev/null; then MISSING_TOOLS+=("${tool}"); echo "  [!] Missing: ${tool}"; else echo "  [+] Found  : ${tool}"; fi\n`;
  });

  script += `
if [ \${#MISSING_TOOLS[@]} -gt 0 ]; then
  echo ""
  echo "[!] Missing tools: \${MISSING_TOOLS[*]}"
  echo "[!] Some commands will be skipped."
  echo ""
fi

mkdir -p "\$OUTDIR"
cd "\$OUTDIR" || exit 1

`;

  sections.forEach(section => {
    script += `\n# ── ${section.category} ──────────────────────────\n`;
    script += `echo "[+] Starting: ${section.category}"\n\n`;

    section.commands.forEach(({ cmd, desc, save }) => {
      const tool = cmd.trim().split(/\s+/)[0];
      const skipCheck = ["cat", "grep", "sort", "echo", "mkdir", "cd", "tee", "dig", "curl", "openssl", "timeout"].includes(tool);

      script += `echo "  → ${desc}"\n`;
      if (!skipCheck) {
        script += `if command -v ${tool} &>/dev/null; then\n  `;
        script += save ? `${cmd} > "${save}" 2>&1\n` : `${cmd}\n`;
        script += `else\n  echo "  [!] Skipped — ${tool} not installed"\nfi\n`;
      } else {
        script += save ? `${cmd} > "${save}" 2>&1\n` : `${cmd}\n`;
      }
      script += `\n`;
    });
  });

  script += `
# ── SUMMARY ──────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ReconForge Scan Complete!  v3.4    ║"
echo "║   Target : \$TARGET"
echo "║   Mode   : \$MODE"
echo "║   Output : \$OUTDIR"
echo "╚══════════════════════════════════════╝"
echo ""
ls -lah .

# ── Desktop Notification ─────────────────────
if command -v notify-send &>/dev/null; then
  notify-send "ReconForge ✅ Scan Complete!" "Target: \$TARGET | Mode: \$MODE\\nResults: \$OUTDIR" --icon=dialog-information
fi
`;

  return script;
}
