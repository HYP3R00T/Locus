import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cli from "@tauri-apps/cli";
import { resolveDevConfig } from "./dev-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

// Explicit paths keep discovery predictable as more packages are added.
process.chdir(root);
process.env.TAURI_APP_PATH = path.join(root, "packages", "src-tauri");
process.env.TAURI_FRONTEND_PATH = root;

try {
  const args = process.argv.slice(2);
  if (args[0] === "dev") {
    const config = JSON.parse(
      await readFile(path.join(process.env.TAURI_APP_PATH, "tauri.conf.json"), "utf8"),
    );
    const { port, override } = await resolveDevConfig(config);
    // An explicit PORT prevents Next.js from falling back independently of Tauri.
    process.env.PORT = String(port);
    const separator = args.indexOf("--");
    args.splice(separator < 0 ? args.length : separator, 0, "--config", JSON.stringify(override));
    console.log(`Locus desktop development URL: ${override.build.devUrl}`);
  }
  await cli.run(args, "npm run tauri");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
