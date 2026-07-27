"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const firebaseCli = require.resolve("firebase-tools/lib/bin/firebase");
const result = spawnSync(process.execPath, [
  firebaseCli,
  "emulators:exec",
  "--only",
  "auth,firestore,functions",
  "node --test tests/firebase-client.emulator.mjs"
], {
  cwd: repoRoot,
  env: {
    ...process.env,
    FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || "60000"
  },
  stdio: "inherit"
});

if (result.error) throw result.error;
process.exitCode = result.status == null ? 1 : result.status;
