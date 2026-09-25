import { useState } from "react";

const SERVICE_UUID = "7d6a1000-3c6e-4f72-9d41-8b2c5a910001";
const TX_UUID = "7d6a1000-3c6e-4f72-9d41-8b2c5a910002";
const RX_UUID = "7d6a1000-3c6e-4f72-9d41-8b2c5a910003";

export default function App() {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [status, setStatus] = useState("Desconectado");
  const [response, setResponse] = useState("");

  async function connect() {
    try {
      setStatus("Buscando...");
      const d = await navigator.bluetooth.requestDevice({
        filters: [{ name: "DETECTOR-SISMOS-01" }],
        optionalServices: [SERVICE_UUID]
      });
      const server = await d.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const tx = await service.getCharacteristic(TX_UUID);
      const rx = await service.getCharacteristic(RX_UUID);
      await tx.startNotifications();
      tx.addEventListener("characteristicvaluechanged", (e) => {
        const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
        if (v) setResponse(new TextDecoder().decode(v));
      });
      setDevice(d);
      setStatus("Conectado");
      (window as any).__detectorRx = rx;
    } catch (e) {
      setStatus("No conectado");
      setResponse(String(e));
    }
  }

  async function send(command: string) {
    try {
      const rx = (window as any).__detectorRx as BluetoothRemoteGATTCharacteristic;
      if (!rx) throw new Error("Conecte primero el detector.");
      await rx.writeValue(new TextEncoder().encode(command));
    } catch (e) {
      setResponse(String(e));
    }
  }

  return (
    <main>
      <header>
        <div>
          <h1>Detector de Sismos</h1>
          <p>Control y comunicación BLE con ESP32-C3</p>
        </div>
        <span className={device ? "ok" : "offline"}>{status}</span>
      </header>

      <section className="card">
        <h2>Detector</h2>
        <p className="device">{device?.name ?? "DETECTOR-SISMOS-01"}</p>
        <button onClick={connect}>Conectar por BLE</button>
      </section>

      <section className="card">
        <h2>Prueba de comunicación</h2>
        <div className="buttons">
          <button disabled={!device} onClick={() => send("PING")}>PING</button>
          <button disabled={!device} onClick={() => send("ESTADO")}>ESTADO</button>
        </div>
        <pre>{response || "Sin respuesta"}</pre>
      </section>
    </main>
  );
}