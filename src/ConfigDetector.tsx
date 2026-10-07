import { useEffect, useState } from "react";
import {
  PARAMETROS_CONFIG,
  parsearConfig,
  type ClaveConfig,
  type DetectorConfig,
} from "./configParametros";

type Props = {
  connected: boolean;
  config: DetectorConfig | null;
  onLeer: () => Promise<DetectorConfig | null>;
  onGuardar: (valores: DetectorConfig) => Promise<void>;
};

export default function ConfigDetector({
  connected,
  config,
  onLeer,
  onGuardar,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<DetectorConfig | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!editando) setForm(config);
  }, [config, editando]);

  const visible = editando ? form : config;

  function cambiar(key: ClaveConfig, texto: string) {
    if (!form) return;
    const n = Number(texto);
    setForm({ ...form, [key]: Number.isFinite(n) ? n : form[key] });
  }

  async function leer() {
    setMensaje("");
    const leida = await onLeer();
    if (leida) {
      setForm(leida);
      setMensaje("Configuración leída del ESP32.");
    } else {
      setMensaje("No se pudo leer /config.");
    }
  }

  function cancelar() {
    setForm(config);
    setEditando(false);
    setMensaje("Edición cancelada. El ESP32 no se modificó.");
  }

  async function guardar() {
    if (!form) return;
    setGuardando(true);
    setMensaje("");
    try {
      await onGuardar(form);
      setEditando(false);
      setMensaje("Guardado en NVS del ESP32.");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const deteccion = PARAMETROS_CONFIG.filter((p) => p.grupo === "deteccion");
  const trabajo = PARAMETROS_CONFIG.filter((p) => p.grupo === "trabajo");

  return (
    <section className="card">
      <h2>Configuración del detector</h2>
      <p className="muted">
        Los valores viven en el ESP32. Editar no cambia nada hasta pulsar Guardar.
      </p>

      {config && !editando && (
        <div className="config-resumen">
          <span>
            Energía/ruido {config.energia_ruido_ratio_min.toFixed(1)}×
          </span>
          <span>F_CONT {(config.f_cont * 100).toFixed(0)}%</span>
          <span>Ventana {config.analysis_ms} ms</span>
          <span>Calma {config.end_quiet_ms / 1000} s</span>
        </div>
      )}

      <div className="buttons">
        <button type="button" disabled={!connected} onClick={() => void leer()}>
          ↻ Leer configuración
        </button>
        {!editando ? (
          <button
            type="button"
            disabled={!connected || !visible}
            onClick={() => {
              setForm(config ? { ...config } : parsearConfig({}));
              setEditando(true);
              setMensaje("");
            }}
          >
            Editar configuración
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={!connected || guardando}
              onClick={() => void guardar()}
            >
              {guardando ? "Guardando…" : "Guardar en ESP32"}
            </button>
            <button type="button" className="danger" onClick={cancelar}>
              Cancelar
            </button>
          </>
        )}
      </div>

      {!visible ? (
        <p className="muted">Conecte el ESP32 y pulse Leer configuración.</p>
      ) : (
        <>
          <h3 className="config-grupo">Detección</h3>
          <div className="config-grid">
            {deteccion.map((p) => (
              <label className="config-campo" key={p.key}>
                <span>
                  {p.label} <em>({p.unidad})</em>
                </span>
                <input
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  disabled={!editando || guardando}
                  value={visible[p.key]}
                  onChange={(e) => cambiar(p.key, e.target.value)}
                />
                <small>{p.definicion}</small>
              </label>
            ))}
          </div>
          <h3 className="config-grupo">Parámetros de trabajo (19)</h3>
          <div className="config-grid">
            {trabajo.map((p) => (
              <label className="config-campo" key={p.key}>
                <span>
                  {p.label} <em>({p.unidad})</em>
                </span>
                <input
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  disabled={!editando || guardando}
                  value={visible[p.key]}
                  onChange={(e) => cambiar(p.key, e.target.value)}
                />
                <small>{p.definicion}</small>
              </label>
            ))}
          </div>
        </>
      )}

      {mensaje && (
        <p className={mensaje.includes("No se pudo") || mensaje.includes("Error") ? "error" : "wifi-message"}>
          {mensaje}
        </p>
      )}
    </section>
  );
}
