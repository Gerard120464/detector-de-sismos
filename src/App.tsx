import { useEffect, useRef, useState } from "react";
import ConfigDetector from "./ConfigDetector";
import { PARAMETROS_CONFIG, parsearConfig, type DetectorConfig } from "./configParametros";

const ESP32_URLS=["http://192.168.4.1","http://192.168.1.22"];
type Evento={id:number;estado?:string;duracion_s?:number;pga_t?:number;rms?:number;frecuencia_hz?:number;nivel?:string};
type HistoricoEvento={id:number;hora_inicio?:string;hora_fin?:string;duracion_s?:number;pga_h?:number;pga_t?:number;rms?:number;frecuencia_hz?:number;zc?:number;nivel?:string};
type Punto={t_s:number;x_g:number;y_g:number;z_g:number};
type Onda={id:number;frecuencia_muestreo_hz:number;muestras:Punto[]};
type WifiStatus={ap_ssid?:string;ap_ip?:string;sta_configured?:boolean;sta_ssid?:string;sta_connected?:boolean;sta_ip?:string;rssi?:number};
type WifiNetwork={ssid:string;rssi?:number;seguridad?:number};

async function espFetch(path:string,options?:RequestInit){let lastError:unknown=null;for(const base of ESP32_URLS){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),4000);try{const r=await fetch(`${base}${path}`,{cache:"no-store",...options,signal:ctl.signal});return r}catch(e){lastError=e}finally{clearTimeout(timer)}}throw lastError instanceof Error?lastError:Error("No se pudo comunicar con el ESP32");}

function Grafica({onda}:{onda:Onda}){
 const ps=onda.muestras;
 const [modo,setModo]=useState<"completo"|"detalle">("completo");
 const [inicio,setInicio]=useState(0);
 const [cursor,setCursor]=useState(0);

 const WINDOW=3;

 const duracion=ps.length?ps[ps.length-1].t_s:0;
 const maxInicio=Math.max(0,duracion-WINDOW);

 useEffect(()=>{
   setInicio(0);
   setCursor(0);
   setModo("completo");
 },[onda.id]);

 useEffect(()=>{
   if(modo==="completo"){
     setInicio(0);
     setCursor(v=>Math.min(Math.max(0,v),duracion));
   }else{
     setInicio(v=>Math.min(Math.max(0,v),maxInicio));
     setCursor(v=>Math.min(Math.max(0,v),WINDOW));
   }
 },[modo,duracion,maxInicio]);

 if(!ps.length)return <p className="muted">Sin muestras del evento.</p>;

 const tInicio=modo==="completo"?0:inicio;
 const tFin=modo==="completo"?duracion:Math.min(duracion,inicio+WINDOW);

 const vis=ps.filter(p=>p.t_s>=tInicio&&p.t_s<=tFin);

 if(!vis.length)return <p className="muted">Sin muestras en esta ventana.</p>;

 /*
  * Eliminamos la componente continua de cada eje.
  * Esto evita que la gravedad (~1 g en Z) domine la visualización.
  */
 const baseX=ps.reduce((s,p)=>s+p.x_g,0)/ps.length;
 const baseY=ps.reduce((s,p)=>s+p.y_g,0)/ps.length;
 const baseZ=ps.reduce((s,p)=>s+p.z_g,0)/ps.length;

 const datos=vis.map(p=>{
   const x=p.x_g-baseX;
   const y=p.y_g-baseY;
   const z=p.z_g-baseZ;

   let valor=x;
   let eje="X";

   if(Math.abs(y)>Math.abs(valor)){
     valor=y;
     eje="Y";
   }

   if(Math.abs(z)>Math.abs(valor)){
     valor=z;
     eje="Z";
   }

   return {
     ...p,
     valor,
     eje,
     ax:x,
     ay:y,
     az:z
   };
 });

 const absMax=Math.max(.0001,...datos.map(p=>Math.abs(p.valor)));

 const span=Math.max(.001,tFin-tInicio);

 const W=1100;
 const H=430;
 const P=58;

 const X=(t:number)=>P+(t-tInicio)/span*(W-2*P);
 const Y=(v:number)=>H/2-v/absMax*(H/2-P);

 const path=datos.map((p,i)=>
   `${i?"L":"M"}${X(p.t_s).toFixed(1)},${Y(p.valor).toFixed(1)}`
 ).join(" ");

 /*
  * Pico máximo de toda la ventana.
  */
 let pico=datos[0];

 for(const p of datos){
   if(Math.abs(p.valor)>Math.abs(pico.valor)){
     pico=p;
   }
 }

 /*
  * Buscar los picos locales más altos para marcarlos.
  */
 const candidatos:any[]=[];

 for(let i=1;i<datos.length-1;i++){
   const a=Math.abs(datos[i-1].valor);
   const b=Math.abs(datos[i].valor);
   const c=Math.abs(datos[i+1].valor);

   if(b>=a&&b>=c){
     candidatos.push(datos[i]);
   }
 }

 candidatos.sort((a,b)=>Math.abs(b.valor)-Math.abs(a.valor));

 const picos:any[]=[];

 for(const p of candidatos){
   if(picos.length>=5)break;

   const separado=picos.every(
     q=>Math.abs(q.t_s-p.t_s)>0.20
   );

   if(separado)picos.push(p);
 }

 /*
  * Posición del dial.
  */
 const cursorTiempo=
   modo==="completo"
   ?Math.min(Math.max(0,cursor),duracion)
   :Math.min(
      Math.max(tInicio,cursor),
      tFin
    );

 let puntoCursor=datos[0];

 for(const p of datos){
   if(Math.abs(p.t_s-cursorTiempo)<
      Math.abs(puntoCursor.t_s-cursorTiempo)){
     puntoCursor=p;
   }
 }

 const cursorLocal=
   modo==="completo"
   ?cursorTiempo
   :cursorTiempo;

 const cursorX=X(puntoCursor.t_s);

 return <div className="event-chart-wrap">

   <div className="chart-key-values">

     <span>
       <strong>Máximo de la ventana:</strong>{" "}
       {Math.abs(pico.valor).toFixed(5)} g ({pico.eje})
     </span>

     <span>
       <strong>Vista:</strong>{" "}
       {modo==="completo"
        ?"Evento completo"
        :`${tInicio.toFixed(2)} – ${tFin.toFixed(2)} s`}
     </span>

     <span>
       <strong>Duración:</strong> {duracion.toFixed(2)} s
     </span>

   </div>

   <div style={{
     display:"flex",
     gap:"8px",
     flexWrap:"wrap",
     marginBottom:"10px"
   }}>

     <button
       type="button"
       onClick={()=>{
         setModo("completo");
         setInicio(0);
         setCursor(0);
       }}
       style={{
         padding:"7px 12px",
         fontSize:"12px",
         background:modo==="completo"?"#2b6cff":"#27314a"
       }}
     >
       Evento completo
     </button>

     <button
       type="button"
       onClick={()=>{
         setModo("detalle");
         setInicio(0);
         setCursor(0);
       }}
       style={{
         padding:"7px 12px",
         fontSize:"12px",
         background:modo==="detalle"?"#2b6cff":"#27314a"
       }}
     >
       Ventanas de 3 s
     </button>

   </div>

   <svg
     className="event-chart"
     viewBox={`0 0 ${W} ${H}`}
   >

     <line
       x1={P}
       x2={W-P}
       y1={H/2}
       y2={H/2}
       className="chart-grid-line"
     />

     <line
       x1={P}
       x2={P}
       y1={P}
       y2={H-P}
       className="chart-axis"
     />

     <path
       d={path}
       className="wave wave-max"
     />

     {
       picos.map((p,i)=>(
         <g key={`${p.t_s}-${i}`}>

           <circle
             cx={X(p.t_s)}
             cy={Y(p.valor)}
             r="4"
             fill="currentColor"
           />

           <text
             x={X(p.t_s)}
             y={Math.max(22,Y(p.valor)-10)}
             textAnchor="middle"
             className="chart-label"
             style={{fontSize:"11px"}}
           >
             {Math.abs(p.valor).toFixed(4)} g
           </text>

         </g>
       ))
     }

     <line
       x1={cursorX}
       x2={cursorX}
       y1={P}
       y2={H-P}
       stroke="currentColor"
       strokeWidth="1.5"
       strokeDasharray="5 4"
       opacity="0.8"
     />

     <circle
       cx={cursorX}
       cy={Y(puntoCursor.valor)}
       r="6"
       fill="currentColor"
     />

     <rect
       x={Math.min(cursorX+8,W-185)}
       y="25"
       width="175"
       height="64"
       rx="7"
       fill="#121c2e"
       stroke="#33445f"
     />

     <text
       x={Math.min(cursorX+18,W-175)}
       y="47"
       className="chart-label"
       style={{fontSize:"12px"}}
     >
       {puntoCursor.t_s.toFixed(3)} s
     </text>

     <text
       x={Math.min(cursorX+18,W-175)}
       y="65"
       className="chart-label"
       style={{fontSize:"12px"}}
     >
       {Math.abs(puntoCursor.valor).toFixed(5)} g
     </text>

     <text
       x={Math.min(cursorX+18,W-175)}
       y="83"
       className="chart-label"
       style={{fontSize:"12px"}}
     >
       Eje {puntoCursor.eje}
     </text>

     <text x={P} y="20" className="chart-label">
       +{absMax.toFixed(4)} g
     </text>

     <text x={P} y={H-8} className="chart-label">
       {tInicio.toFixed(2)} s
     </text>

     <text
       x={W-P}
       y={H-8}
       textAnchor="end"
       className="chart-label"
     >
       {tFin.toFixed(2)} s
     </text>

   </svg>

   <div style={{
     marginTop:"8px",
     padding:"8px",
     background:"#0b1526",
     borderRadius:"8px"
   }}>

     <div style={{
       fontSize:"12px",
       marginBottom:"4px"
     }}>
       <strong>Dial de análisis</strong>
       {" · "}
       {puntoCursor.t_s.toFixed(3)} s
       {" · "}
       {Math.abs(puntoCursor.valor).toFixed(5)} g
       {" · "}
       eje {puntoCursor.eje}
     </div>

     <input
       type="range"
       min={modo==="completo"?0:tInicio}
       max={modo==="completo"?duracion:tFin}
       step="0.005"
       value={cursorLocal}
       onChange={e=>setCursor(Number(e.target.value))}
       style={{width:"100%"}}
     />

   </div>

   {modo==="detalle"&&maxInicio>0&&
     <div style={{
       marginTop:"8px",
       padding:"8px",
       background:"#0b1526",
       borderRadius:"8px"
     }}>

       <div style={{
         fontSize:"12px",
         marginBottom:"4px"
       }}>
         <strong>Desplazar ventana de 3 segundos</strong>
         {" · "}
         {tInicio.toFixed(2)} – {tFin.toFixed(2)} s
       </div>

       <input
         type="range"
         min="0"
         max={maxInicio}
         step="0.01"
         value={inicio}
         onChange={e=>{
           setInicio(Number(e.target.value));
           setCursor(Number(e.target.value));
         }}
         style={{width:"100%"}}
       />

     </div>
   }

   <div className="legend">

     <span>
       <i className="legend-max"/>
       Máximo dinámico entre |X|, |Y| y |Z|
     </span>

     <span>
       {vis.length.toLocaleString()} muestras ·{" "}
       {onda.frecuencia_muestreo_hz} Hz
     </span>

     <span>
       Pico máximo: {Math.abs(pico.valor).toFixed(5)} g ({pico.eje})
     </span>

   </div>

 </div>
}
export default function App(){
 const[connected,setConnected]=useState(false),[status,setStatus]=useState("Desconectado"),[response,setResponse]=useState("");
 const[evento,setEvento]=useState<Evento|null>(null),[onda,setOnda]=useState<Onda|null>(null),[ondaError,setOndaError]=useState("");
 const[historial,setHistorial]=useState<HistoricoEvento[]>([]);const[eventoSeleccionado,setEventoSeleccionado]=useState<number|null>(null);const lastId=useRef<number|null>(null);
 const[wifi,setWifi]=useState<WifiStatus|null>(null),[redes,setRedes]=useState<WifiNetwork[]>([]),[escaneando,setEscaneando]=useState(false),[ssid,setSsid]=useState(""),[clave,setClave]=useState(""),[wifiMsg,setWifiMsg]=useState("");
 const[config,setConfig]=useState<DetectorConfig|null>(null);

 async function estado(){const r=await espFetch(`/estado`);if(!r.ok)throw Error(`HTTP ${r.status}`);const d=await r.json();setConnected(true);setStatus("Conectado por Wi-Fi");setEvento(d.ultimo_evento??null);return d}
 async function cargarOnda(id:number){try{setOndaError("");const r=await espFetch(`/evento?id=${id}`,{cache:"no-store"});if(!r.ok)throw Error(`HTTP ${r.status}`);setOnda(await r.json());lastId.current=id}catch(e){setOnda(null);setOndaError(e instanceof Error?e.message:String(e))}}
 async function cargarHistorial(){try{const r=await espFetch(`/eventos`,{cache:"no-store"});if(r.ok){const data=await r.json();setHistorial([...data].sort((a:HistoricoEvento,b:HistoricoEvento)=>b.id-a.id))}}catch{}}
 async function cargarWifi(){try{const r=await espFetch(`/wifi/status`,{cache:"no-store"});if(r.ok)setWifi(await r.json())}catch{}}
 async function leerConfig(){
  try{
   const r=await espFetch(`/config`,{cache:"no-store"});
   if(!r.ok)throw Error(`HTTP ${r.status}`);
   const d=parsearConfig(await r.json());
   setConfig(d);
   return d;
  }catch{
   return null;
  }
 }
 async function guardarConfig(valores:DetectorConfig){
  const body=new URLSearchParams();
  for(const p of PARAMETROS_CONFIG) body.set(p.key,String(valores[p.key]));
  const r=await espFetch(`/config`,{
   method:"POST",
   headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body
  });
  const texto=await r.text();
  if(!r.ok)throw Error(`HTTP ${r.status}: ${texto}`);
  const d=JSON.parse(texto) as {ok?:boolean;error?:string};
  if(d.ok!==true)throw Error(d.error||"El ESP32 rechazó los parámetros.");
  await leerConfig();
 }
 async function conectar(){try{setStatus("Buscando ESP32...");const d=await estado();setResponse(JSON.stringify(d,null,2));if(d.ultimo_evento?.id)await cargarOnda(d.ultimo_evento.id);await cargarHistorial();await cargarWifi();await leerConfig()}catch(e){setConnected(false);setStatus("No conectado");setResponse(e instanceof Error?`${e.name}: ${e.message}`:String(e))}}
 async function request(path:string,options?:RequestInit){try{const r=await espFetch(`${path}`,{cache:"no-store",...options});if(!r.ok)throw Error(`HTTP ${r.status}`);const t=await r.text();setResponse(t);return t}catch(e){setResponse(e instanceof Error?`${e.name}: ${e.message}`:String(e));throw e}}
 async function buscarRedes(){setEscaneando(true);setWifiMsg("Iniciando escaneo en el ESP32...");setRedes([]);try{const r=await espFetch(`/wifi/scan?t=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw Error(`HTTP ${r.status}`);setWifiMsg("Escaneo iniciado. Esperando resultado...");for(let i=0;i<15;i++){await new Promise(x=>setTimeout(x,1500));const q=await espFetch(`/wifi/scan?resultado=1&t=${Date.now()}`,{cache:"no-store"});if(!q.ok)throw Error(`HTTP ${q.status}`);const d=await q.json();if(d.estado==="LISTO"){setRedes(d.redes??[]);setWifiMsg(`${(d.redes??[]).length} redes encontradas.`);return}if(d.estado==="SIN_RESULTADO"){setWifiMsg("El ESP32 terminó el escaneo sin resultados.");return}}setWifiMsg("El escaneo sigue en curso. Pulse Buscar redes nuevamente en unos segundos.");}catch(e){setWifiMsg(`Error al escanear: ${e instanceof Error?e.message:String(e)}`)}finally{setEscaneando(false)}}
 async function guardarWifi(){if(!ssid){setWifiMsg("Seleccione una red.");return}setWifiMsg("Enviando configuración al ESP32...");try{const body=new URLSearchParams({ssid,password:clave});const r=await espFetch(`/wifi/config`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});if(!r.ok)throw Error(`HTTP ${r.status}`);setResponse(await r.text());setWifiMsg("Configuración guardada. El ESP32 está conectándose a Internet.");setTimeout(()=>void cargarWifi(),1500);setTimeout(()=>void cargarWifi(),5000)}catch(e){setWifiMsg(`Error: ${e instanceof Error?e.message:String(e)}`)}}
 useEffect(()=>{if(escaneando)return;let busy=false;const timer=setInterval(async()=>{if(busy)return;busy=true;try{const d=await estado();const id=d.ultimo_evento?.id as number|undefined;const seleccionado=eventoSeleccionado;if(id&&id!==lastId.current&&!seleccionado){setEventoSeleccionado(null);await cargarOnda(id);await cargarHistorial()}else if(id&&id!==lastId.current&&seleccionado===id){await cargarOnda(id);await cargarHistorial()}else if(id&&id!==lastId.current){await cargarHistorial()}await cargarWifi()}catch{setConnected(false);setStatus("Buscando ESP32...")}finally{busy=false}},2000);return()=>clearInterval(timer)},[escaneando,eventoSeleccionado]);

 return <main><header><div><h1>Detector de Sismos</h1><p>App actual · gráfica con dial de tiempo y parámetros del ESP32</p></div><span className={connected?"ok":"offline"}>{status}</span></header><section className="dashboard-grid"><div className="status-card"><span className="status-title">Estado del detector</span><strong className={connected?"status-online":"status-offline"}>{connected?"OPERATIVO":"DESCONECTADO"}</strong><small>DETECTOR-SISMOS-01</small></div><div className="status-card"><span className="status-title">Red local</span><strong>SISMOS-01</strong><small>{wifi?.ap_ip||"192.168.4.1"}</small></div><div className="status-card"><span className="status-title">Internet</span><strong className={wifi?.sta_connected?"status-online":"status-offline"}>{wifi?.sta_connected?"CONECTADO":"NO CONECTADO"}</strong><small>{wifi?.sta_ip||"Sin IP"}</small></div><div className="status-card"><span className="status-title">Último evento</span><strong>{evento?`#${evento.id}`:"—"}</strong><small>{evento?.nivel||"Sin eventos"}</small></div></section>
 <section className="card"><h2>Detector</h2><p className="device">DETECTOR-SISMOS-01</p><p>Red Wi-Fi local: <strong>SISMOS-01</strong></p><p>ESP32: <strong>192.168.4.1</strong></p><button onClick={conectar}>Conectar por Wi-Fi</button></section>
 <ConfigDetector connected={connected} config={config} onLeer={leerConfig} onGuardar={guardarConfig}/>
 <section className="card"><h2>Wi-Fi de Internet</h2><p className="muted">SISMOS-01 permanece activa mientras el ESP32 se conecta al Wi-Fi seleccionado.</p>
 <div className="wifi-status-grid"><div><strong>Red</strong><span>{wifi?.sta_ssid||"Sin configurar"}</span></div><div><strong>Internet</strong><span className={wifi?.sta_connected?"status-good":"status-warn"}>{wifi?.sta_connected?"Conectado":"No conectado"}</span></div><div><strong>IP Internet</strong><span>{wifi?.sta_ip||"-"}</span></div><div><strong>IP SISMOS-01</strong><span>{wifi?.ap_ip||"192.168.4.1"}</span></div></div>
 <div className="buttons"><button disabled={!connected||escaneando} onClick={buscarRedes}>{escaneando?"Escaneando...":"🔍 Buscar redes"}</button><button disabled={!connected} onClick={cargarWifi}>Actualizar estado</button></div>
 {redes.length>0&&<label className="field"><span>Red Wi-Fi</span><select value={ssid} onChange={e=>setSsid(e.target.value)}><option value="">Seleccione una red...</option>{redes.map((r,i)=><option key={`${r.ssid}-${i}`} value={r.ssid}>{r.ssid||"(oculta)"} {typeof r.rssi==="number"?`· ${r.rssi} dBm`:""}</option>)}</select></label>}
 <label className="field"><span>Contraseña</span><input type="password" value={clave} onChange={e=>setClave(e.target.value)} placeholder="Contraseña de la red Wi-Fi" autoComplete="off"/></label>
 <div className="buttons"><button disabled={!connected||!ssid} onClick={guardarWifi}>Conectar ESP32 a Internet</button></div>{wifiMsg&&<p className={wifiMsg.startsWith("Error")?"error":"wifi-message"}>{wifiMsg}</p>}</section>
 <section className="card"><h2>Evento registrado</h2>{!evento?<p className="muted">No hay eventos registrados.</p>:<><div className="event-summary"><strong>EVENTO #{evento.id}</strong><span>{evento.nivel??"-"}</span><span>{Number(evento.duracion_s??0).toFixed(2)} s</span><span>PGA {Number(evento.pga_t??0).toFixed(5)} g</span><span>RMS {Number(evento.rms??0).toFixed(5)} g</span><span>{Number(evento.frecuencia_hz??0).toFixed(3)} Hz</span></div>{onda?<Grafica onda={onda}/>:<p className="muted">Cargando forma de onda...</p>}{ondaError&&<p className="error">Forma de onda: {ondaError}</p>}</>}</section>
 <section className="card"><h2>Historial de eventos</h2>{historial.length===0?<p className="muted">No hay eventos históricos registrados.</p>:<div className="history-wrap"><table className="history-table"><thead><tr><th>ID</th><th>Hora</th><th>Nivel</th><th>Duración</th><th>PGA</th><th>RMS</th><th>Frecuencia</th></tr></thead><tbody>{historial.map((e,i)=><tr key={e.id} onClick={async()=>{setEventoSeleccionado(e.id);const h=historial.find(x=>x.id===e.id);if(h){setEvento({id:h.id,duracion_s:h.duracion_s,pga_t:h.pga_t,rms:h.rms,frecuencia_hz:h.frecuencia_hz,nivel:h.nivel})}await cargarOnda(e.id)}} className={`${i===0?"history-current ":""}${eventoSeleccionado===e.id?"history-selected":""}`}><td>#{e.id}</td><td>{e.hora_inicio??"SIN_RTC"}</td><td><span className="history-level">{e.nivel??"-"}</span></td><td>{Number(e.duracion_s??0).toFixed(2)} s</td><td>{Number(e.pga_t??e.pga_h??0).toFixed(5)} g</td><td>{Number(e.rms??0).toFixed(5)} g</td><td>{Number(e.frecuencia_hz??0).toFixed(3)} Hz</td></tr>)}</tbody></table></div>}<p className="muted history-note">Últimos {historial.length} eventos conservados por el ESP32. Haz clic en un evento para seleccionarlo.</p></section>
 <section className="card"><h2>Prueba de comunicación</h2><div className="buttons"><button disabled={!connected} onClick={()=>request("/ping")}>PING</button><button disabled={!connected} onClick={()=>request("/estado")}>ESTADO</button></div><pre>{response||"Sin respuesta"}</pre></section></main>
}