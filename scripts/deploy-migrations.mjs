import { spawn } from "node:child_process";

const attempts = 5;
const waitMs = 5000;
const command = process.platform === "win32" ? "npx.cmd" : "npx";

function runMigration() {
  return new Promise((resolve) => {
    const child = spawn(command, ["prisma", "migrate", "deploy"], {
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

function wait() {
  return new Promise((resolve) => setTimeout(resolve, waitMs));
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = await runMigration();
  if (result.code === 0) process.exit(0);
  if (!result.output.includes("P1002") || attempt === attempts) process.exit(result.code);
  console.warn(`Migration advisory lock busy. Retrying in ${waitMs / 1000}s (${attempt}/${attempts - 1})...`);
  await wait();
}
