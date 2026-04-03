#!/usr/bin/env node
/**
 * PostToolUse hook: Quick TypeScript/JSON/CSS syntax validation after Write|Edit.
 * Checks JSON parse validity and basic CSS brace matching.
 * For TS/TSX files, runs a fast tsc --noEmit check on the single file.
 * Returns findings as additionalContext so the model can self-correct.
 */

const fs = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");

function getFilePath(input) {
  return input.tool_input?.file_path || input.tool_response?.filePath || null;
}

function validateJson(content) {
  try {
    JSON.parse(content);
    return [];
  } catch (e) {
    const posMatch = e.message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const line = content.slice(0, pos).split("\n").length;
      return [`Line ~${line}: JSON parse error - ${e.message}`];
    }
    return [`JSON parse error: ${e.message}`];
  }
}

function validateCss(content) {
  const errors = [];
  let braceDepth = 0;
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // Strip template literals and comments
    const cleaned = lines[i].replace(/\/\*.*?\*\//g, "").replace(/\/\/.*/g, "");
    for (const ch of cleaned) {
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
    }
    if (braceDepth < 0) {
      errors.push(`Line ${i + 1}: Extra closing brace '}' - possible CSS syntax error`);
      braceDepth = 0;
    }
  }

  if (braceDepth > 0) {
    errors.push(`CSS has ${braceDepth} unclosed brace(s) - missing '}'`);
  }

  return errors;
}

function validateTypeScript(filePath) {
  try {
    execFileSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
      encoding: "utf-8",
      timeout: 15000,
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return [];
  } catch (e) {
    const output = (e.stdout || "") + (e.stderr || "");
    // Filter to only errors in the edited file
    const relPath = path.relative(PROJECT_ROOT, filePath);
    const errors = output
      .split("\n")
      .filter((line) => line.includes(relPath) && line.includes("error TS"))
      .slice(0, 10); // Cap at 10 errors to avoid flooding

    return errors;
  }
}

async function main() {
  let rawInput = "";
  for await (const chunk of process.stdin) {
    rawInput += chunk;
  }

  const input = JSON.parse(rawInput);
  const filePath = getFilePath(input);

  if (!filePath) {
    process.exit(0);
  }

  const ext = filePath.split(".").pop().toLowerCase();
  const relevantExts = ["ts", "tsx", "json", "css"];
  if (!relevantExts.includes(ext)) {
    process.exit(0);
  }

  if (!fs.existsSync(filePath)) {
    process.exit(0);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  let errors = [];

  if (ext === "ts" || ext === "tsx") {
    errors = validateTypeScript(filePath);
  } else if (ext === "json") {
    errors = validateJson(content);
  } else if (ext === "css") {
    errors = validateCss(content);
  }

  if (errors.length > 0) {
    const shortPath = path.relative(PROJECT_ROOT, filePath);
    const result = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `VALIDATION ERRORS in ${shortPath}:\n${errors.map((e) => `  - ${e}`).join("\n")}\n\nFix these issues before continuing.`,
      },
    };
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
