import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(await readFile(path.join(source, "package.json"), "utf8"));
const target = new URL(`../public/pdfjs/${version}/`, import.meta.url);
// Assets belong to the installed PDF.js version. Publish readiness only after
// every copy succeeds, so an interrupted setup retries on the next launch.
try {
  await access(new URL(".ready", target));
} catch {
  await mkdir(target, { recursive: true });
  await Promise.all(
    ["cmaps", "standard_fonts", "wasm"].map((name) =>
      cp(path.join(source, name), new URL(name, target), { recursive: true }),
    ),
  );
  await cp(path.join(source, "build/pdf.worker.min.mjs"), new URL("pdf.worker.min.mjs", target));

  await writeFile(new URL(".ready", target), version);
}
