export type ClaveConfig =
  | "energia_ruido_ratio_min"
  | "f_cont"
  | "cresta_max"
  | "freq_min_hz"
  | "freq_max_hz"
  | "amplitud_min_g"
  | "pga_min_g"
  | "rms_min_g"
  | "energia_min_g2s"
  | "duracion_min_s"
  | "zc_min"
  | "zc_cv_max"
  | "hom_min"
  | "ratio_bg_min"
  | "acel_alta_g"
  | "acel_muy_alta_g"
  | "n_picos_altos"
  | "densidad_picos_min"
  | "valle_pico_max"
  | "analysis_ms"
  | "end_quiet_ms"
  | "cooldown_ms"
  | "lta_start_cap_g";

export type DetectorConfig = Record<ClaveConfig, number>;

export type ParametroConfig = {
  key: ClaveConfig;
  label: string;
  unidad: string;
  definicion: string;
  min: number;
  max: number;
  step: number;
  grupo: "deteccion" | "trabajo";
};

/** Valores iniciales del documento + mandos de detección del firmware. */
export const PARAMETROS_CONFIG: ParametroConfig[] = [
  {
    key: "energia_ruido_ratio_min",
    label: "Relación energía / ruido",
    unidad: "×",
    definicion: "Energía de la onda debe ser al menos N veces la del ruido en 3 s.",
    min: 1,
    max: 100,
    step: 0.1,
    grupo: "deteccion",
  },
  {
    key: "f_cont",
    label: "Continuidad F_CONT",
    unidad: "fracción",
    definicion: "Fracción mínima de los 3 s por encima del ruido (CONT).",
    min: 0,
    max: 1,
    step: 0.01,
    grupo: "deteccion",
  },
  {
    key: "cresta_max",
    label: "Cresta máxima PGA/RMS",
    unidad: "×",
    definicion: "Diagnóstico PGA/RMS. Senoide 10 Hz ~1.4; golpes juntos ~6-10. No veta DET en V15.3.",
    min: 1.5,
    max: 50,
    step: 0.1,
    grupo: "deteccion",
  },
  {
    key: "freq_min_hz",
    label: "FREQ_MIN",
    unidad: "Hz",
    definicion: "Frecuencia mínima considerada para la estimación.",
    min: 0.01,
    max: 30,
    step: 0.01,
    grupo: "trabajo",
  },
  {
    key: "freq_max_hz",
    label: "FREQ_MAX",
    unidad: "Hz",
    definicion: "Frecuencia máxima considerada para la estimación.",
    min: 0.1,
    max: 60,
    step: 0.1,
    grupo: "trabajo",
  },
  {
    key: "amplitud_min_g",
    label: "AMPLITUD_MIN",
    unidad: "g",
    definicion: "Umbral mínimo de amplitud de trabajo.",
    min: 0.000001,
    max: 2,
    step: 0.0001,
    grupo: "trabajo",
  },
  {
    key: "pga_min_g",
    label: "PGA_MIN",
    unidad: "g",
    definicion: "PGA mínima de trabajo.",
    min: 0.000001,
    max: 2,
    step: 0.0001,
    grupo: "trabajo",
  },
  {
    key: "rms_min_g",
    label: "RMS_MIN",
    unidad: "g",
    definicion: "RMS mínimo de trabajo.",
    min: 0.000001,
    max: 2,
    step: 0.0001,
    grupo: "trabajo",
  },
  {
    key: "energia_min_g2s",
    label: "ENERGIA_MIN",
    unidad: "g²·s",
    definicion: "Piso de forma OSCILATORIA. No cierra DET (DET usa R_E y oscilación).",
    min: 0,
    max: 10,
    step: 0.00001,
    grupo: "trabajo",
  },
  {
    key: "duracion_min_s",
    label: "DURACION_MIN",
    unidad: "s",
    definicion: "Duración activa mínima antes de permitir el cierre.",
    min: 0.5,
    max: 120,
    step: 0.1,
    grupo: "trabajo",
  },
  {
    key: "zc_min",
    label: "ZC_MIN",
    unidad: "cruces",
    definicion: "Evidencia mínima de oscilación (no es veto de detección).",
    min: 0,
    max: 65535,
    step: 1,
    grupo: "trabajo",
  },
  {
    key: "zc_cv_max",
    label: "ZC_CV_MAX",
    unidad: "—",
    definicion: "Límite de variabilidad de intervalos ZC. Diagnóstico, no veto.",
    min: 0,
    max: 5,
    step: 0.01,
    grupo: "trabajo",
  },
  {
    key: "hom_min",
    label: "HOM_MIN",
    unidad: "0–1",
    definicion: "Indicador de distribución uniforme de energía. No veto absoluto.",
    min: 0,
    max: 1,
    step: 0.01,
    grupo: "trabajo",
  },
  {
    key: "ratio_bg_min",
    label: "RATIO_BG_MIN",
    unidad: "—",
    definicion: "Relación mínima señal / fondo.",
    min: 0,
    max: 20,
    step: 0.01,
    grupo: "trabajo",
  },
  {
    key: "acel_alta_g",
    label: "ACEL_ALTA",
    unidad: "g",
    definicion: "Umbral de aceleración alta (ruta FUERTE).",
    min: 0.000001,
    max: 2,
    step: 0.001,
    grupo: "trabajo",
  },
  {
    key: "acel_muy_alta_g",
    label: "ACEL_MUY_ALTA",
    unidad: "g",
    definicion: "Umbral de aceleración muy alta.",
    min: 0.000001,
    max: 2,
    step: 0.001,
    grupo: "trabajo",
  },
  {
    key: "n_picos_altos",
    label: "N_PICOS_ALTOS",
    unidad: "picos",
    definicion: "Mínimo de picos altos independientes (valle ≤ VALLE_PICO_MAX).",
    min: 1,
    max: 100,
    step: 1,
    grupo: "trabajo",
  },
  {
    key: "densidad_picos_min",
    label: "DENSIDAD_PICOS_MIN",
    unidad: "picos/s",
    definicion: "Densidad mínima de picos independientes.",
    min: 0,
    max: 100,
    step: 0.1,
    grupo: "trabajo",
  },
  {
    key: "valle_pico_max",
    label: "VALLE_PICO_MAX",
    unidad: "—",
    definicion: "Relación máxima valle/pico para contar golpes independientes.",
    min: 0,
    max: 1,
    step: 0.01,
    grupo: "trabajo",
  },
  {
    key: "analysis_ms",
    label: "VENTANA_ANALISIS",
    unidad: "ms",
    definicion: "Ventana inicial común de evaluación.",
    min: 500,
    max: 30000,
    step: 100,
    grupo: "trabajo",
  },
  {
    key: "end_quiet_ms",
    label: "END_QUIET",
    unidad: "ms",
    definicion: "Tiempo de calma para confirmar cierre. Se descuenta de la duración activa.",
    min: 1000,
    max: 120000,
    step: 1000,
    grupo: "trabajo",
  },
  {
    key: "cooldown_ms",
    label: "COOLDOWN",
    unidad: "ms",
    definicion: "Tiempo de bloqueo entre eventos.",
    min: 0,
    max: 120000,
    step: 1000,
    grupo: "trabajo",
  },
  {
    key: "lta_start_cap_g",
    label: "LTA_CAP",
    unidad: "g",
    definicion: "Tope del LTA al abrir PREALERTA y tope del ruido N. Una 1X no puede volverse fondo.",
    min: 0.0001,
    max: 0.05,
    step: 0.0001,
    grupo: "deteccion",
  },
];

export const CONFIG_VACIA: DetectorConfig = {
  energia_ruido_ratio_min: 2.5,
  f_cont: 0.5,
  cresta_max: 8,
  freq_min_hz: 0.15,
  freq_max_hz: 30,
  amplitud_min_g: 0.0035,
  pga_min_g: 0.0035,
  rms_min_g: 0.0035,
  energia_min_g2s: 0.0001,
  duracion_min_s: 3,
  zc_min: 2,
  zc_cv_max: 0.45,
  hom_min: 0.8,
  ratio_bg_min: 1.2,
  acel_alta_g: 0.03,
  acel_muy_alta_g: 0.1,
  n_picos_altos: 3,
  densidad_picos_min: 1,
  valle_pico_max: 0.5,
  analysis_ms: 3000,
  end_quiet_ms: 10000,
  cooldown_ms: 6000,
  lta_start_cap_g: 0.0035,
};

export function parsearConfig(raw: Record<string, unknown>): DetectorConfig {
  const next = { ...CONFIG_VACIA };
  for (const param of PARAMETROS_CONFIG) {
    const v = Number(raw[param.key]);
    if (Number.isFinite(v)) next[param.key] = v;
  }
  return next;
}
