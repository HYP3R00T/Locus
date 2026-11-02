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

// Excalidraw must also work offline; its font URLs use this local asset root.
const excalidraw = path.dirname(require.resolve("@excalidraw/excalidraw"));
const metadata = JSON.parse(await readFile(path.resolve(excalidraw, "../../package.json"), "utf8"));
const drawingTarget = new URL("../public/excalidraw/", import.meta.url);
let ready;
try {
  ready = await readFile(new URL(".ready", drawingTarget), "utf8");
} catch {}
if (ready !== metadata.version) {
  await mkdir(drawingTarget, { recursive: true });
  await cp(path.join(excalidraw, "fonts"), new URL("fonts", drawingTarget), { recursive: true });
  await writeFile(new URL(".ready", drawingTarget), metadata.version);
}
