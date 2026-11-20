// Starts the Firebase Emulator Suite with the demo project (never touches real data).
// On Windows, the JDK's loopback pipe uses a Unix domain socket in %TEMP%, which
// fails on some setups ("Unable to establish loopback connection"). Pointing
// jdk.net.unixdomain.tmpdir at a plain folder under the home directory fixes it.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const env = { ...process.env };

if (process.platform === "win32") {
  const udsDir = join(homedir(), ".cache", "jdk-uds");
  mkdirSync(udsDir, { recursive: true });
  env.JAVA_TOOL_OPTIONS = [env.JAVA_TOOL_OPTIONS, `-Djdk.net.unixdomain.tmpdir=${udsDir}`]
    .filter(Boolean)
    .join(" ");

  // Use the installed Temurin JDK even if this shell's PATH predates the install.
  if (!env.JAVA_HOME) {
    const base = join(process.env.ProgramFiles ?? "C:/Program Files", "Eclipse Adoptium");
    const jdk = existsSync(base) && readdirSync(base).find((d) => d.startsWith("jdk-"));
    if (jdk) {
      env.JAVA_HOME = join(base, jdk);
      // Windows env keys are case-insensitive ("Path"), so update the existing key.
      const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
      env[pathKey] = `${join(env.JAVA_HOME, "bin")};${env[pathKey] ?? ""}`;
    }
  }
}

const firebaseBin = join(
  import.meta.dirname,
  "..",
  "node_modules",
  "firebase-tools",
  "lib",
  "bin",
  "firebase.js",
);
const args = [
  firebaseBin,
  "emulators:start",
  "--project",
  "demo-onebouldering",
  ...process.argv.slice(2),
];
const child = spawn(process.execPath, args, { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
