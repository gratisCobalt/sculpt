#!/usr/bin/env node
/**
 * Stop hook: Runs full build + lint check and reports summary.
 * Catches type errors, build failures, and lint issues before session ends.
 */

const { execFileSync } = require("child_process");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");

function runCommand(cmd, args) {
  try {
    const output = execFileSync(cmd, args, {
      encoding: "utf-8",
      timeout: 60000,
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output };
  } catch (e) {
    return { success: false, output: (e.stdout || "") + (e.stderr || "") };
  }
}

function main() {
  const lines = [];
  let hasErrors = false;

  // 1. TypeScript type check
  const tsc = runCommand("npx", ["tsc", "--noEmit", "--pretty", "false"]);
  if (!tsc.success) {
    hasErrors = true;
    const errorLines = tsc.output
      .split("\n")
      .filter((l) => l.includes("error TS"))
      .slice(0, 20);
    lines.push(`TypeScript: ${errorLines.length} error(s)`);
    for (const err of errorLines) {
      lines.push(`  ${err}`);
    }
  } else {
    lines.push("TypeScript: OK");
  }

  // 2. ESLint check
  const lint = runCommand("npx", ["eslint", ".", "--max-warnings", "0"]);
  if (!lint.success) {
    const errorCount = (lint.output.match(/\d+ problem/)?.[0]) || "issues found";
    lines.push(`ESLint: ${errorCount}`);
    const lintLines = lint.output.split("\n").filter((l) => l.trim()).slice(0, 15);
    for (const err of lintLines) {
      lines.push(`  ${err}`);
    }
  } else {
    lines.push("ESLint: OK");
  }

  // 3. Build check
  const build = runCommand("npx", ["vite", "build"]);
  if (!build.success) {
    hasErrors = true;
    lines.push("Build: FAILED");
    const buildLines = build.output.split("\n").filter((l) => l.includes("error") || l.includes("Error")).slice(0, 10);
    for (const err of buildLines) {
      lines.push(`  ${err}`);
    }
  } else {
    lines.push("Build: OK");
  }

  const summary = hasErrors
    ? `Session End Check: ISSUES FOUND\n${lines.join("\n")}`
    : `Session End Check: All clear\n${lines.join("\n")}`;

  const result = { systemMessage: summary };
  console.log(JSON.stringify(result));
  process.exit(0);
}

main();
