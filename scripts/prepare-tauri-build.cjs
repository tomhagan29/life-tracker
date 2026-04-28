const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const standaloneRoot = path.join(root, ".next", "standalone");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  }
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function removeIfExists(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function nodeDestination() {
  return path.join(
    root,
    "src-tauri",
    "bin",
    process.platform === "win32" ? "node.exe" : "node",
  );
}

function copyNodeRuntime() {
  const destination = nodeDestination();

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(process.execPath, destination);

  if (process.platform !== "win32") {
    fs.chmodSync(destination, 0o755);
  }
}

run(npmCommand, ["run", "build"]);

if (!fs.existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error("Missing .next/standalone/server.js after `npm run build`.");
}

removeIfExists(path.join(standaloneRoot, ".env"));
removeIfExists(path.join(standaloneRoot, "dev.db"));
removeIfExists(path.join(standaloneRoot, ".git"));

copyDirectory(path.join(root, ".next", "static"), path.join(standaloneRoot, ".next", "static"));
copyDirectory(path.join(root, "public"), path.join(standaloneRoot, "public"));
copyDirectory(path.join(root, "prisma", "migrations"), path.join(standaloneRoot, "prisma", "migrations"));
copyNodeRuntime();

console.log("Prepared Next standalone output and bundled Node runtime for Tauri.");
