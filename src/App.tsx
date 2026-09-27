import { useEffect, useRef, useState } from "react";

const ESP32_URL = "http://192.168.4.1";
type Evento={id:number;estado?:string;duracion_s?:number;pga_t?:number;rms?:number;frecuencia_hz?:number;nivel?:string};
type Punto={t_s:number;x_g:number;y_g:number;z_g:number};
type Onda={id:number;frecuencia_muestreo_hz:number;muestras:Punto[]};

function Grafica({onda}:{onda:Onda}){
  const W=900,H=300,P=34,ps=onda.muestras;
  if(!ps.length)return <p className="muted">Sin muestras del evento.</p>;
  const max=Math.max(.001,...ps.map(p=>Math.max(Math.abs(p.x_g),Math.abs(p.y_g),Math.abs(p.z_g))));
  const tmax=Math.max(.1,ps[ps.length-1].t_s);
  const X=(t:number)=>P+t/tmax*(W-2*P),Y=(v:number)=>H/2-v/max*(H/2-P);
  const path=(a:"x_g"|"y_g"|"z_g")=>ps.map((p,i)=>`${i?"L":"M"}${X(p.t_s).toFixed(1)},${Y(p[a]).toFixed(1)}`).join(" ");
  return <div className="event-chart-wrap"><svg className="event-chart" viewBox={`0 0 ${W} ${H}`} aria-label="Forma de onda del evento">
    <line x1={P} x2={W-P} y1={H/2} y2={H/2} className="chart-axis"/><line x1={P} x2={P} y1={P} y2={H-P} className="chart-axis"/>
    <path d={path("x_g")} className="wave wave-x"/><path d={path("y_g")} className="wave wave-y"/><path d={path("z_g")} className="wave wave-z"/>
    <text x={P} y="18" className="chart-label">+{max.toFixed(3)} g</text><text x={P} y={H-8} className="chart-label">-{max.toFixed(3)} g</text><text x={W-P} y={H-8} textAnchor="end" className="chart-label">{tmax.toFixed(1)} s</text>
  </svg><div className="legend"><span><i className="legend-x"/> X</span><span><i className="legend-y"/> Y</span><span><i className="legend-z"/> Z</span><span>{ps.length} muestras · {onda.frecuencia_muestreo_hz} Hz</span></div></div>;
}

export default function App(){
  const[connected,setConnected]=useState(false),[status,setStatus]=useState("Desconectado"),[response,setResponse]=useState("");
  const[evento,setEvento]=useState<Evento|null>(null),[onda,setOnda]=useState<Onda|null>(null),[ondaError,setOndaError]=useState("");
  const lastId=useRef<number|null>(null);

  async function estado(){
    const c=new AbortController(),to=setTimeout(()=>c.abort(),5000);
    try{const r=await fetch(`${ESP32_URL}/estado`,{cache:"no-store",signal:c.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);
      const d=await r.json();setConnected(true);setStatus("Conectado por Wi-Fi");setEvento(d.ultimo_evento??null);return d;
    }finally{clearTimeout(to);}
  }
  async function cargarOnda(id:number){
    try{setOndaError("");const r=await fetch(`${ESP32_URL}/evento?id=${id}`,{cache:"no-store"});if(!r.ok)throw Error(`HTTP ${r.status}`);
      setOnda(await r.json());lastId.current=id;
    }catch(e){setOnda(null);setOndaError(e instanceof Error?e.message:String(e));}
  }
  async function connectWiFi(){
    try{setStatus("Buscando ESP32...");const d=await estado();setResponse(JSON.stringify(d,null,2));if(d.ultimo_evento?.id)await cargarOnda(d.ultimo_evento.id);}
    catch(e){setConnected(false);setStatus("No conectado");setResponse(e instanceof Error?`${e.name}: ${e.message}`:String(e));}
  }
  async function request(path:string){
    try{const r=await fetch(`${ESP32_URL}${path}`,{cache:"no-store"});if(!r.ok)throw Error(`HTTP ${r.status}`);setResponse(await r.text());}
    catch(e){setResponse(e instanceof Error?`${e.name}: ${e.message}`:String(e));}
  }
  useEffect(()=>{if(!connected)return;const timer=setInterval(async()=>{try{const d=await estado();const id=d.ultimo_evento?.id as number|undefined;if(id&&id!==lastId.current)await cargarOnda(id);}catch{setConnected(false);setStatus("Sin comunicación");}},1000);return()=>clearInterval(timer);},[connected]);

  return <main><header><div><h1>Detector de Sismos</h1><p>Control y comunicación Wi-Fi con ESP32 de 38 pines</p></div><span className={connected?"ok":"offline"}>{status}</span></header>
    <section className="card"><h2>Detector</h2><p className="device">DETECTOR-SISMOS-01</p><p>Red Wi-Fi: <strong>SISMOS-01</strong></p><p>ESP32: <strong>192.168.4.1</strong></p><button onClick={connectWiFi}>Conectar por Wi-Fi</button></section>
    <section className="card"><h2>Evento registrado</h2>{!evento?<p className="muted">No hay eventos registrados.</p>:<><div className="event-summary"><strong>EVENTO #{evento.id}</strong><span>{evento.nivel??"-"}</span><span>{Number(evento.duracion_s??0).toFixed(2)} s</span><span>PGA {Number(evento.pga_t??0).toFixed(5)} g</span><span>RMS {Number(evento.rms??0).toFixed(5)} g</span><span>{Number(evento.frecuencia_hz??0).toFixed(3)} Hz</span></div>{onda?<Grafica onda={onda}/>:<p className="muted">Cargando forma de onda...</p>}{ondaError&&<p className="error">Forma de onda: {ondaError}</p>}</>}</section>
    <section className="card"><h2>Prueba de comunicación</h2><div className="buttons"><button disabled={!connected} onClick={()=>request("/ping")}>PING</button><button disabled={!connected} onClick={()=>request("/estado")}>ESTADO</button></div><pre>{response||"Sin respuesta"}</pre></section>
  </main>;
}
