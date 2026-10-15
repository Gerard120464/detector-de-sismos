import http from "node:http";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const CANDIDATES = ["192.168.4.1", "192.168.1.8", "192.168.1.22"];
let lastIp = "192.168.4.1";
let lastOk = 0;
let missUntil = 0;

function probe(ip: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get({ hostname: ip, port: 80, path: "/estado", timeout: timeoutMs }, (res) => {
      const ok = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 500;
      res.resume();
      resolve(ok);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findEsp(): Promise<string | null> {
  const now = Date.now();
  if (now - lastOk < 15000 && lastIp && (await probe(lastIp, 600))) {
    lastOk = now;
    return lastIp;
  }
  if (now < missUntil) return null;

  const seen = new Set<string>();
  const ordered = [lastIp, ...CANDIDATES].filter((ip) => {
    if (seen.has(ip)) return false;
    seen.add(ip);
    return true;
  });
  for (const ip of ordered) {
    if (await probe(ip, 700)) {
      lastIp = ip;
      lastOk = Date.now();
      console.log("[esp32] encontrado", ip);
      return ip;
    }
  }

  missUntil = Date.now() + 4000;
  return null;
}

function espProxy(): Plugin {
  return {
    name: "esp32-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/esp32")) return next();
        void (async () => {
          const ip = await findEsp();
          if (!ip) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error:
                  "Une el Wi-Fi del PC a SISMOS-01 (clave Detector123) y envía SSID y clave desde la app."
              })
            );
            return;
          }
          const path = url.replace(/^\/esp32/, "") || "/";
          const headers = { ...req.headers, host: ip };
          delete headers["connection"];
          const p = http.request(
            { hostname: ip, port: 80, path, method: req.method, headers },
            (er) => {
              res.statusCode = er.statusCode || 200;
              for (const [k, v] of Object.entries(er.headers)) {
                if (k && v) res.setHeader(k, v);
              }
              er.pipe(res);
            }
          );
          p.on("error", () => {
            missUntil = Date.now() + 2000;
            res.statusCode = 502;
            res.end("ESP32 no responde");
          });
          req.pipe(p);
        })();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), espProxy()],
  base: "/detector-de-sismos/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  }
});
