import { useState } from "react";

const ESP32_URL = "http://192.168.4.1";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Desconectado");
  const [response, setResponse] = useState("");

  async function connectWiFi() {
    try {
      setStatus("Buscando ESP32...");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const r = await fetch(`${ESP32_URL}/estado`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }

      const data = await r.json();

      setConnected(true);
      setStatus("Conectado por Wi-Fi");
      setResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setConnected(false);
      setStatus("No conectado");
      setResponse(
        e instanceof Error
          ? `${e.name}: ${e.message}`
          : String(e)
      );
    }
  }

  async function request(path: string) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const r = await fetch(`${ESP32_URL}${path}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }

      const text = await r.text();
      setResponse(text);
    } catch (e) {
      setResponse(
        e instanceof Error
          ? `${e.name}: ${e.message}`
          : String(e)
      );
    }
  }

  return (
    <main>
      <header>
        <div>
          <h1>Detector de Sismos</h1>
          <p>Control y comunicación Wi-Fi con ESP32-C3</p>
        </div>
        <span className={connected ? "ok" : "offline"}>
          {status}
        </span>
      </header>

      <section className="card">
        <h2>Detector</h2>
        <p className="device">DETECTOR-SISMOS-01</p>
        <p>Red Wi-Fi: <strong>SISMOS-01</strong></p>
        <p>ESP32: <strong>192.168.4.1</strong></p>

        <button onClick={connectWiFi}>
          Conectar por Wi-Fi
        </button>
      </section>

      <section className="card">
        <h2>Prueba de comunicación</h2>

        <div className="buttons">
          <button
            disabled={!connected}
            onClick={() => request("/ping")}
          >
            PING
          </button>

          <button
            disabled={!connected}
            onClick={() => request("/estado")}
          >
            ESTADO
          </button>
        </div>

        <pre>{response || "Sin respuesta"}</pre>
      </section>
    </main>
  );
}
