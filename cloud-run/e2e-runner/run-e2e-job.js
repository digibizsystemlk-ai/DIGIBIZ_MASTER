const { spawn } = require("child_process");
const { Storage } = require("@google-cloud/storage");

function nowIso() {
  return new Date().toISOString();
}

function toGrepPattern(selectedTests) {
  const map = {
    grn: "GRN flow",
    "grn-flow": "GRN flow",
    grnflow: "GRN flow",
    "stock-transfer": "stock transfer",
    stocktransfer: "stock transfer",
    "order-with-lorry": "order with lorry",
    orderwithlorry: "order with lorry",
    "cheque-management": "cheque management",
    chequemanagement: "cheque management",
    "accounting-dashboard": "accounting dashboard",
    accountingdashboard: "accounting dashboard",
  };
  const list = selectedTests
    .map((x) => String(x || "").trim().toLowerCase())
    .map((x) => map[x] || "")
    .filter(Boolean);
  return list.length ? list.join("|") : "GRN flow|stock transfer|order with lorry|cheque management|accounting dashboard";
}

function parseResults(raw) {
  const text = String(raw || "");
  const lines = text.split(/\r?\n/);
  const results = [];
  for (const lineRaw of lines) {
    const line = lineRaw.replace(/\u001b\[[0-9;]*m/g, "");
    // [chromium] › tests\e2e\grn-flow.spec.js:13:3 › Distributor E2E - GRN flow › save GRN ...
    const m = line.match(/\[\w+\]\s+›\s+.+\s+›\s+(.+?)\s+›\s+(.+)$/);
    if (m) {
      results.push({
        testName: `${m[1]} › ${m[2]}`,
        passed: true,
        duration: 0,
      });
    }
    // 1) [chromium] › ... (failure)
    if (/^\s*\d+\)\s+\[\w+\]\s+›/.test(line) && results.length) {
      results[results.length - 1].passed = false;
      results[results.length - 1].error = line.trim();
    }
  }
  return results;
}

async function uploadResults(bucketName, runId, payload, logs) {
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const jsonPath = `e2e-results/${runId}.json`;
  const logPath = `e2e-results/${runId}.log`;

  await bucket.file(jsonPath).save(JSON.stringify(payload, null, 2), {
    contentType: "application/json",
    resumable: false,
  });
  await bucket.file(logPath).save(logs || "", {
    contentType: "text/plain",
    resumable: false,
  });
  return { jsonPath, logPath };
}

async function run() {
  const runId = process.env.RUN_ID || `run_${Date.now()}`;
  const bucketName = process.env.E2E_RESULTS_BUCKET || "";
  const selectedTests = String(process.env.E2E_SELECTED_TESTS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!bucketName) {
    throw new Error("E2E_RESULTS_BUCKET is required.");
  }

  const grep = toGrepPattern(selectedTests);
  const startedAt = Date.now();
  const cmd = "npx";
  const args = [
    "playwright",
    "test",
    "tests/e2e",
    "--project=chromium",
    "--grep",
    grep,
  ];

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || "https://digibiz-sys.web.app",
    E2E_BDK_EMAIL: process.env.E2E_BDK_EMAIL || process.env.E2E_TARGET_EMAIL || "",
    E2E_BDK_BUSINESS_ID: process.env.E2E_BDK_BUSINESS_ID || process.env.E2E_TARGET_BUSINESS_ID || "",
  };

  let stdout = "";
  let stderr = "";
  const child = spawn(cmd, args, { cwd: process.cwd(), env, shell: false });

  const exitCode = await new Promise((resolve, reject) => {
    child.stdout.on("data", (d) => {
      stdout += String(d || "");
    });
    child.stderr.on("data", (d) => {
      stderr += String(d || "");
    });
    child.on("error", reject);
    child.on("close", resolve);
  });

  const duration = Date.now() - startedAt;
  const logs = `${stdout}\n${stderr}`.trim();
  const success = Number(exitCode || 0) === 0;
  const parsed = parseResults(logs);
  const payload = {
    runId,
    success,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: nowIso(),
    durationMs: duration,
    selectedTests,
    results: parsed,
  };

  const uploaded = await uploadResults(bucketName, runId, payload, logs);
  console.log(JSON.stringify({ ...payload, uploaded }, null, 2));
  if (!success) process.exitCode = 1;
}

run().catch((err) => {
  console.error("run-e2e-job failed:", err && err.message ? err.message : err);
  process.exitCode = 1;
});
