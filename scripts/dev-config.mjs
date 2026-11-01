import { createServer } from "node:net";

async function isAvailable(host, port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolve(false);
      else reject(error);
    });
    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) => {
        if (error) reject(error);
        else resolve(true);
      });
    });
  });
}

export async function resolveDevConfig(config) {
  const originalUrl = new URL(config.build.devUrl);
  const url = new URL(originalUrl);
  const firstPort = Number(url.port || 80);

  for (let port = firstPort; port <= 65535; port++) {
    if (!(await isAvailable(url.hostname, port))) continue;
    url.port = String(port);
    return {
      port,
      override: {
        build: { devUrl: url.href },
        app: {
          security: {
            devCsp: config.app.security.devCsp.replace(
              `ws://${originalUrl.host}`,
              `ws://${url.host}`,
            ),
          },
        },
      },
    };
  }
  throw new Error("No available development port. Close an unused development server and retry.");
}
