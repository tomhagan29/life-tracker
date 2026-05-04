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

function walkFiles(directory, visitor) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walkFiles(filePath, visitor);
    } else if (entry.isFile()) {
      visitor(filePath);
    }
  }
}

function packageNameFromAlias(alias) {
  return alias.replace(/-[a-f0-9]{16,}$/, "");
}

function copyTurbopackPackageAliases() {
  const serverRoot = path.join(standaloneRoot, ".next", "server");
  const nodeModulesRoot = path.join(standaloneRoot, "node_modules");
  const aliases = new Set();
  const aliasPattern = /((?:@[^/\\\s"'`]+[/\\])?[^/\\\s"'`]+-[a-f0-9]{16,})(?=[/\\"'`])/g;

  walkFiles(serverRoot, (filePath) => {
    if (!filePath.endsWith(".js") && !filePath.endsWith(".json")) {
      return;
    }

    const contents = fs.readFileSync(filePath, "utf8");

    for (const match of contents.matchAll(aliasPattern)) {
      aliases.add(match[1].replaceAll("\\", "/"));
    }
  });

  for (const alias of aliases) {
    const packageName = packageNameFromAlias(alias);
    const source = path.join(nodeModulesRoot, ...packageName.split("/"));
    const destination = path.join(nodeModulesRoot, ...alias.split("/"));

    if (source === destination || !fs.existsSync(source)) {
      continue;
    }

    copyDirectory(source, destination);
  }
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
copyTurbopackPackageAliases();
copyNodeRuntime();

console.log("Prepared Next standalone output and bundled Node runtime for Tauri.");
