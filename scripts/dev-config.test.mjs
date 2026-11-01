import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";
import { resolveDevConfig } from "./dev-config.mjs";

test("an occupied port is skipped and the desktop URL and live reload stay synchronized", async (t) => {
  const occupied = createServer();
  occupied.listen(0, "127.0.0.1");
  await once(occupied, "listening");
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  const port = occupied.address().port;
  const config = JSON.parse(await readFile(new URL("../packages/src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  config.app.security.devCsp = config.app.security.devCsp.replace("ws://127.0.0.1:3000", `ws://127.0.0.1:${port}`);
  config.build.devUrl = `http://127.0.0.1:${port}`;

  const result = await resolveDevConfig(config);
  assert.ok(result.port > port);
  assert.equal(new URL(result.override.build.devUrl).port, String(result.port));
  assert.ok(result.override.app.security.devCsp.includes(`ws://127.0.0.1:${result.port}`));
  assert.ok(!result.override.app.security.devCsp.includes(`ws://127.0.0.1:${port};`));
  assert.equal(config.build.devUrl, `http://127.0.0.1:${port}`);
});
