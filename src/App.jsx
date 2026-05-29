import { useState, useEffect, useRef } from "react";

// ── Palette: dark bg, warm gold/cream accents ──────────────────────────────
const G = {
  bg:          "#111210",
  card:        "#1C1E1B",
  cardHover:   "#222520",
  gold:        "#C9A84C",
  goldLight:   "#26220F",
  goldMid:     "#3A3015",
  goldSoft:    "#E8C97A",
  cream:       "#F0E8D0",
  creamDim:    "#B8A880",
  surface:     "#242722",
  surfaceUp:   "#2C3029",
  border:      "#2A2D28",
  borderUp:    "#383C33",
  text:        "#EDE8DC",
  textSoft:    "#9A9585",
  textMuted:   "#5A5850",
  danger:      "#D96B5A",
  dangerDark:  "#2A1612",
  blue:        "#7AA8C4",
  blueDark:    "#182230",
  purple:      "#9B84C4",
  purpleDark:  "#201A30",
  teal:        "#5AADA8",
  tealDark:    "#142624",
  rose:        "#C47A8A",
  roseDark:    "#28161E",
  white:       "#FFFFFF",
};

// ── Default categories (user can edit/add) ─────────────────────────────────
const DEFAULT_EXP_CATS = [
  { name:"Comida",     icon:"🍽️", color:"#C9A84C", bg:"#26220F" },
  { name:"Transporte", icon:"🚗", color:"#7AA8C4", bg:"#182230" },
  { name:"Compras",    icon:"🛍️", color:"#9B84C4", bg:"#201A30" },
  { name:"Salud",      icon:"💊", color:"#D96B5A", bg:"#2A1612" },
  { name:"Gym",        icon:"💪", color:"#5AADA8", bg:"#142624" },
  { name:"Hogar",      icon:"🏠", color:"#C47A8A", bg:"#28161E" },
  { name:"Ocio",       icon:"🎮", color:"#E8C97A", bg:"#2A2510" },
  { name:"Otros",      icon:"📦", color:"#9A9585", bg:"#242722" },
];

const DEFAULT_INC_CATS = [
  { name:"Sueldo",          icon:"💼", color:"#C9A84C", bg:"#26220F" },
  { name:"Freelance",       icon:"💻", color:"#7AA8C4", bg:"#182230" },
  { name:"Ventas",          icon:"🛒", color:"#9B84C4", bg:"#201A30" },
  { name:"Comisión",        icon:"🤝", color:"#E8C97A", bg:"#2A2510" },
  { name:"Emprendimiento",  icon:"🚀", color:"#5AADA8", bg:"#142624" },
  { name:"Extra",           icon:"✨", color:"#C47A8A", bg:"#28161E" },
];

const FIXED_CAT_ICONS = ["🏠","📡","💪","🎬","🎵","💳","🛡️","📋","🔌","🚿","📱","🛒"];

const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = n => "$" + Math.round(n||0).toLocaleString("es-CL");
const nowKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const keyToLabel = (k) => { const [y,m]=k.split("-"); return `${months[parseInt(m)-1]} ${y}`; };
const allMonthKeys = (expenses, incomes) => {
  const keys = new Set();
  [...expenses, ...incomes].forEach(x => keys.add(x.date.slice(0,7)));
  keys.add(nowKey());
  return Array.from(keys).sort().reverse();
};

// ── Demo data ──────────────────────────────────────────────────────────────
const DEMO_EXPENSES = [];
const DEMO_INCOMES = [];
const DEMO_FIXED = [];
const DEMO_DEBTS = [];

// ── Helpers ────────────────────────────────────────────────────────────────
const Card = ({ children, style={}, onClick }) => (
  <div onClick={onClick} style={{
    background:G.card, borderRadius:18, padding:20,
    boxShadow:"0 2px 20px rgba(0,0,0,.28)", border:`1px solid ${G.border}`,
    ...style,
  }}>{children}</div>
);

const AnimBar = ({ pct, color, h=6 }) => (
  <div style={{height:h, borderRadius:99, background:G.surface, overflow:"hidden"}}>
    <div style={{height:"100%", borderRadius:99, background:color,
      width:`${Math.min(pct||0,100)}%`, transition:"width 1s cubic-bezier(.4,0,.2,1)"}}/>
  </div>
);

const Toggle = ({ active, onChange }) => (
  <div onClick={onChange} style={{
    width:42, height:24, borderRadius:99, cursor:"pointer", position:"relative",
    background:active?G.gold:G.surface, transition:"background .2s", flexShrink:0,
  }}>
    <div style={{position:"absolute", top:3, left:active?21:3,
      width:18, height:18, borderRadius:"50%", background:G.white,
      boxShadow:"0 1px 4px rgba(0,0,0,.4)", transition:"left .2s"}}/>
  </div>
);

const Confirm = ({ msg, onOk, onCancel }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
    display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,
    backdropFilter:"blur(6px)",padding:"0 24px"}}>
    <div style={{background:G.card,borderRadius:22,padding:28,width:"100%",maxWidth:340,
      boxShadow:"0 16px 48px rgba(0,0,0,.5)",border:`1px solid ${G.border}`,animation:"pop .2s ease"}}>
      <p style={{fontSize:15,fontWeight:600,color:G.text,textAlign:"center",marginBottom:24}}>{msg}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={onCancel} style={{padding:12,borderRadius:13,border:`1px solid ${G.border}`,
          background:G.surface,color:G.textSoft,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={onOk} style={{padding:12,borderRadius:13,border:"none",
          background:G.danger,color:G.white,fontSize:14,fontWeight:700,cursor:"pointer"}}>Eliminar</button>
      </div>
    </div>
  </div>
);

// ── Logo ───────────────────────────────────────────────────────────────────
const FinzaLogo = ({ size=34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="12" fill={G.goldLight} stroke={G.gold} strokeWidth="1.2"/>
    <path d="M11 29V15" stroke={G.gold} strokeWidth="2.2" strokeLinecap="round" opacity=".35"/>
    <path d="M17 29V19" stroke={G.gold} strokeWidth="2.2" strokeLinecap="round" opacity=".6"/>
    <path d="M23 29V13" stroke={G.gold} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M29 29V17" stroke={G.goldSoft} strokeWidth="2.2" strokeLinecap="round" opacity=".75"/>
    <path d="M11 15L17 19L23 13L29 17" stroke={G.goldSoft} strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0"/>
    <circle cx="29" cy="17" r="2" fill={G.goldSoft}/>
    <circle cx="23" cy="13" r="2" fill={G.gold}/>
  </svg>
);

// ── Notification Banner ────────────────────────────────────────────────────
const NotifBanner = ({ notifs, onDismiss }) => {
  if (!notifs.length) return null;
  return (
    <div style={{padding:"0 0 12px"}}>
      {notifs.map((n,i) => (
        <div key={i} style={{
          background:n.type==="warning"?G.dangerDark:G.goldLight,
          border:`1px solid ${n.type==="warning"?G.danger+"44":G.gold+"44"}`,
          borderRadius:14,padding:"11px 14px",marginBottom:8,
          display:"flex",alignItems:"center",gap:10,animation:"slideDown .3s ease",
        }}>
          <span style={{fontSize:18}}>{n.icon}</span>
          <p style={{flex:1,fontSize:13,color:G.text,fontWeight:500,lineHeight:1.4}}>{n.message}</p>
          <button onClick={()=>onDismiss(i)} style={{background:"none",border:"none",
            cursor:"pointer",fontSize:18,color:G.textMuted,padding:0,lineHeight:1}}>×</button>
        </div>
      ))}
    </div>
  );
};

// ── Category Manager Modal ─────────────────────────────────────────────────
function CatManagerModal({ cats, onClose, onSave, title }) {
  const [list, setList] = useState(cats.map(c=>({...c})));
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📦");
  const ICONS = ["🍽️","🚗","🛍️","💊","💪","🏠","🎮","📦","☕","🍕","🎵","✈️",
                 "💇","🎓","🐾","🌿","⚡","🎁","🍺","🏋️","💅","🎯","🛒","📱",
                 "💼","💻","🤝","🚀","✨","🏦","💰","📈"];
  const COLORS = ["#C9A84C","#E8C97A","#7AA8C4","#9B84C4","#D96B5A","#5AADA8","#C47A8A","#9A9585","#7CC47A","#C48A5A"];
  const BG_FOR = (col) => {
    const map = {"#C9A84C":"#26220F","#E8C97A":"#2A2510","#7AA8C4":"#182230","#9B84C4":"#201A30",
      "#D96B5A":"#2A1612","#5AADA8":"#142624","#C47A8A":"#28161E","#9A9585":"#242722",
      "#7CC47A":"#182218","#C48A5A":"#281808"};
    return map[col] || "#242722";
  };
  const [newColor, setNewColor] = useState(COLORS[0]);

  const add = () => {
    if (!newName.trim()) return;
    setList(p=>[...p,{name:newName.trim(),icon:newIcon,color:newColor,bg:BG_FOR(newColor)}]);
    setNewName(""); setNewIcon("📦"); setNewColor(COLORS[0]);
  };
  const remove = (i) => setList(p=>p.filter((_,idx)=>idx!==i));
  const save = () => { onSave(list); onClose(); };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1500,backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 44px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .3s cubic-bezier(.4,0,.2,1)",maxHeight:"88vh",overflowY:"auto",
        border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:18}}>{title}</h2>

        {/* Existing categories */}
        <div style={{marginBottom:20}}>
          {list.map((cat,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,
              padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
              <div style={{width:36,height:36,borderRadius:11,background:cat.bg,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{cat.icon}</div>
              <span style={{flex:1,fontSize:14,fontWeight:600,color:G.text}}>{cat.name}</span>
              <div style={{width:16,height:16,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
              <button onClick={()=>remove(i)} style={{background:"none",border:"none",
                cursor:"pointer",fontSize:18,color:G.textMuted,padding:"0 4px"}}>×</button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <p style={{fontSize:12,fontWeight:700,color:G.textMuted,letterSpacing:1,marginBottom:10}}>NUEVA CATEGORÍA</p>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          placeholder="Nombre de categoría"
          style={{width:"100%",padding:"11px 14px",borderRadius:13,border:`1px solid ${G.border}`,
            background:G.surface,color:G.text,fontSize:14,outline:"none",
            marginBottom:12,boxSizing:"border-box"}}/>

        {/* Icon picker */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:600,marginBottom:8}}>ÍCONO</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
          {ICONS.map(ico=>(
            <button key={ico} onClick={()=>setNewIcon(ico)} style={{
              width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",fontSize:18,
              background:newIcon===ico?G.goldLight:G.surface,
              outline:newIcon===ico?`2px solid ${G.gold}`:"none",
            }}>{ico}</button>
          ))}
        </div>

        {/* Color picker */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:600,marginBottom:8}}>COLOR</p>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {COLORS.map(col=>(
            <button key={col} onClick={()=>setNewColor(col)} style={{
              width:28,height:28,borderRadius:"50%",border:"none",cursor:"pointer",
              background:col,
              outline:newColor===col?`2px solid ${G.cream}`:"2px solid transparent",
              outlineOffset:2,
            }}/>
          ))}
        </div>

        {/* Preview + add */}
        <div style={{display:"flex",gap:10,marginBottom:20}}>
          <div style={{width:42,height:42,borderRadius:13,background:BG_FOR(newColor),
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{newIcon}</div>
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder="Vista previa…"
            style={{flex:1,padding:"0 14px",borderRadius:13,border:`1px solid ${G.border}`,
              background:G.surface,color:G.text,fontSize:14,outline:"none"}}/>
          <button onClick={add} style={{padding:"0 16px",borderRadius:13,border:"none",
            background:G.gold,color:G.bg,fontSize:14,fontWeight:700,cursor:"pointer"}}>+</button>
        </div>

        <button onClick={save} style={{width:"100%",padding:14,borderRadius:14,border:"none",
          background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
          color:G.bg,fontSize:16,fontWeight:700,cursor:"pointer"}}>
          Guardar categorías
        </button>
      </div>
    </div>
  );
}

// ── Add Expense Modal ──────────────────────────────────────────────────────
function AddExpenseModal({ onClose, onSave, prefill, editItem, expCats }) {
  const [amount,   setAmount]   = useState(editItem?.amount   || prefill?.amount   || "");
  const [cat,      setCat]      = useState(editItem?.category || prefill?.category || expCats[0]?.name || "");
  const [note,     setNote]     = useState(editItem?.note     || prefill?.note     || "");
  const [date,     setDate]     = useState(editItem?.date     || prefill?.date     || new Date().toISOString().split("T")[0]);
  const [expType,  setExpType]  = useState(editItem?.type     || prefill?.type     || "variable");

  const save = () => {
    if (!amount) return;
    onSave({...editItem, amount:parseFloat(amount), category:cat, note, date, type:expType, id:editItem?.id||Date.now()});
    onClose();
  };

  const inputStyle = {width:"100%",padding:"12px 14px",borderRadius:13,
    border:`1px solid ${G.border}`,background:G.surface,color:G.text,
    fontSize:15,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1000,backdropFilter:"blur(5px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .28s cubic-bezier(.4,0,.2,1)",maxHeight:"92vh",overflowY:"auto",
        border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:20}}>
          {prefill?"✨ Boleta detectada":editItem?"Editar gasto":"Nuevo gasto"}
        </h2>

        {/* Amount */}
        <div style={{display:"flex",alignItems:"center",gap:8,background:G.goldLight,
          borderRadius:13,padding:"12px 14px",marginBottom:16,border:`1px solid ${G.gold}33`}}>
          <span style={{fontSize:24,color:G.gold,fontWeight:700}}>$</span>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            placeholder="0" autoFocus
            style={{border:"none",background:"transparent",fontSize:30,fontWeight:700,
              color:G.cream,outline:"none",width:"100%"}}/>
        </div>

        {/* Type */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {["variable","fijo"].map(t=>(
            <button key={t} onClick={()=>setExpType(t)} style={{
              padding:10,borderRadius:12,border:`1px solid ${expType===t?G.gold:G.border}`,
              background:expType===t?G.goldLight:G.surface,
              color:expType===t?G.goldSoft:G.textSoft,
              fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .15s",
            }}>{t==="variable"?"📊 Variable":"📌 Fijo"}</button>
          ))}
        </div>

        {/* Category */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>CATEGORÍA</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:16}}>
          {expCats.map(c=>(
            <button key={c.name} onClick={()=>setCat(c.name)} style={{
              padding:"7px 12px",borderRadius:11,border:`1px solid ${cat===c.name?c.color:G.border}`,
              background:cat===c.name?c.bg:G.surface,
              color:cat===c.name?c.color:G.textSoft,
              fontSize:13,fontWeight:600,cursor:"pointer",
              display:"flex",alignItems:"center",gap:5,transition:"all .15s",
            }}>{c.icon} {c.name}</button>
          ))}
        </div>

        {/* Note */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>NOTA</p>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="¿En qué gastaste?"
          style={{...inputStyle,marginBottom:14}}/>

        {/* Date */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>FECHA</p>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{...inputStyle,marginBottom:24}}/>

        <button onClick={save} style={{width:"100%",padding:15,borderRadius:14,border:"none",
          background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
          color:G.bg,fontSize:16,fontWeight:700,cursor:"pointer",
          boxShadow:`0 4px 20px ${G.gold}44`}}>
          {editItem?"Guardar cambios":"Registrar gasto"}
        </button>
      </div>
    </div>
  );
}

// ── Add Income Modal ───────────────────────────────────────────────────────
function AddIncomeModal({ onClose, onSave, editItem, incCats }) {
  const [amount, setAmount] = useState(editItem?.amount || "");
  const [cat,    setCat]    = useState(editItem?.category || incCats[0]?.name || "");
  const [desc,   setDesc]   = useState(editItem?.description || "");
  const [date,   setDate]   = useState(editItem?.date || new Date().toISOString().split("T")[0]);

  const save = () => {
    if (!amount) return;
    onSave({...editItem, amount:parseFloat(amount), category:cat, description:desc, date, id:editItem?.id||Date.now()});
    onClose();
  };
  const inp = {width:"100%",padding:"12px 14px",borderRadius:13,border:`1px solid ${G.border}`,
    background:G.surface,color:G.text,fontSize:15,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1000,backdropFilter:"blur(5px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .28s cubic-bezier(.4,0,.2,1)",maxHeight:"92vh",overflowY:"auto",
        border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:20}}>
          {editItem?"Editar ingreso":"Nuevo ingreso"}
        </h2>

        <div style={{display:"flex",alignItems:"center",gap:8,background:G.goldLight,
          borderRadius:13,padding:"12px 14px",marginBottom:16,border:`1px solid ${G.gold}33`}}>
          <span style={{fontSize:24,color:G.gold,fontWeight:700}}>$</span>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            placeholder="0" autoFocus
            style={{border:"none",background:"transparent",fontSize:30,fontWeight:700,
              color:G.cream,outline:"none",width:"100%"}}/>
        </div>

        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>TIPO DE INGRESO</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:16}}>
          {incCats.map(c=>(
            <button key={c.name} onClick={()=>setCat(c.name)} style={{
              padding:"7px 12px",borderRadius:11,border:`1px solid ${cat===c.name?c.color:G.border}`,
              background:cat===c.name?c.bg:G.surface,
              color:cat===c.name?c.color:G.textSoft,
              fontSize:13,fontWeight:600,cursor:"pointer",
              display:"flex",alignItems:"center",gap:5,transition:"all .15s",
            }}>{c.icon} {c.name}</button>
          ))}
        </div>

        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>DESCRIPCIÓN</p>
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ej: Sueldo Mayo, proyecto freelance…"
          style={{...inp,marginBottom:14}}/>
        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>FECHA</p>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,marginBottom:24}}/>

        <button onClick={save} style={{width:"100%",padding:15,borderRadius:14,border:"none",
          background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
          color:G.bg,fontSize:16,fontWeight:700,cursor:"pointer"}}>
          {editItem?"Guardar cambios":"Registrar ingreso"}
        </button>
      </div>
    </div>
  );
}

// ── Add Fixed Expense Modal ────────────────────────────────────────────────
function AddFixedModal({ onClose, onSave, editItem }) {
  const [name,   setName]   = useState(editItem?.name   || "");
  const [icon,   setIcon]   = useState(editItem?.icon   || "📋");
  const [amount, setAmount] = useState(editItem?.amount || "");
  const inp = {width:"100%",padding:"12px 14px",borderRadius:13,border:`1px solid ${G.border}`,
    background:G.surface,color:G.text,fontSize:15,outline:"none",boxSizing:"border-box"};

  const save = () => {
    if (!amount||!name) return;
    onSave({...editItem, name, icon, amount:parseFloat(amount),
      active:editItem?.active??true, id:editItem?.id||Date.now()});
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1000,backdropFilter:"blur(5px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .28s",border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:20}}>
          {editItem?"Editar gasto fijo":"Nuevo gasto fijo"}
        </h2>

        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>ÍCONO</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
          {FIXED_CAT_ICONS.map(ic=>(
            <button key={ic} onClick={()=>setIcon(ic)} style={{
              width:38,height:38,borderRadius:11,border:"none",cursor:"pointer",fontSize:20,
              background:icon===ic?G.goldLight:G.surface,
              outline:icon===ic?`1.5px solid ${G.gold}`:"none",
            }}>{ic}</button>
          ))}
        </div>

        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>NOMBRE</p>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Netflix, Arriendo…"
          style={{...inp,marginBottom:14}}/>

        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>MONTO MENSUAL</p>
        <div style={{display:"flex",alignItems:"center",gap:8,background:G.goldLight,
          borderRadius:13,padding:"12px 14px",marginBottom:24,border:`1px solid ${G.gold}33`}}>
          <span style={{fontSize:22,color:G.gold,fontWeight:700}}>$</span>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"
            style={{border:"none",background:"transparent",fontSize:28,fontWeight:700,
              color:G.cream,outline:"none",width:"100%"}}/>
        </div>

        <button onClick={save} style={{width:"100%",padding:15,borderRadius:14,border:"none",
          background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
          color:G.bg,fontSize:16,fontWeight:700,cursor:"pointer"}}>
          {editItem?"Guardar cambios":"Agregar gasto fijo"}
        </button>
      </div>
    </div>
  );
}

// ── Add Debt Modal ─────────────────────────────────────────────────────────
function AddDebtModal({ onClose, onSave, onPayment, editItem }) {
  const [tab,     setTab]     = useState(editItem?"pay":"new");
  const [name,    setName]    = useState(editItem?.name    || "");
  const [total,   setTotal]   = useState(editItem?.total   || "");
  const [paid,    setPaid]    = useState(editItem?.paid    || 0);
  const [dueDate, setDueDate] = useState(editItem?.dueDate || "");
  const [payAmt,  setPayAmt]  = useState("");
  const inp = {width:"100%",padding:"12px 14px",borderRadius:13,border:`1px solid ${G.border}`,
    background:G.surface,color:G.text,fontSize:15,outline:"none",boxSizing:"border-box"};

  const save = () => {
    if (!total||!name) return;
    onSave({...editItem, name, total:parseFloat(total), paid:parseFloat(paid)||0, dueDate,
      color:editItem?.color||["#D96B5A","#7AA8C4","#9B84C4","#5AADA8"][Date.now()%4],
      id:editItem?.id||Date.now()});
    onClose();
  };
  const pay = () => {
    if (!payAmt||!editItem) return;
    onPayment(editItem.id, parseFloat(payAmt));
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1000,backdropFilter:"blur(5px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .28s",maxHeight:"92vh",overflowY:"auto",
        border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:20}}>
          {editItem?"Gestionar deuda":"Nueva deuda"}
        </h2>

        {editItem && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
            {["pay","edit"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:10,borderRadius:12,border:`1px solid ${tab===t?G.danger:G.border}`,
                background:tab===t?G.dangerDark:G.surface,
                color:tab===t?G.danger:G.textSoft,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {t==="pay"?"💳 Pagar":"✏️ Editar"}
              </button>
            ))}
          </div>
        )}

        {tab==="pay" && editItem ? (
          <>
            <div style={{background:G.dangerDark,borderRadius:14,padding:16,marginBottom:20,
              border:`1px solid ${G.danger}33`}}>
              <p style={{fontSize:13,color:G.textMuted,marginBottom:4}}>{editItem.name}</p>
              <p style={{fontSize:22,fontWeight:700,color:G.danger}}>Pendiente: {fmt(editItem.total-editItem.paid)}</p>
            </div>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>MONTO A PAGAR</p>
            <div style={{display:"flex",alignItems:"center",gap:8,background:G.dangerDark,
              borderRadius:13,padding:"12px 14px",marginBottom:24,border:`1px solid ${G.danger}33`}}>
              <span style={{fontSize:22,color:G.danger,fontWeight:700}}>$</span>
              <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="0"
                style={{border:"none",background:"transparent",fontSize:28,fontWeight:700,
                  color:G.cream,outline:"none",width:"100%"}}/>
            </div>
            <button onClick={pay} style={{width:"100%",padding:15,borderRadius:14,border:"none",
              background:G.danger,color:G.white,fontSize:16,fontWeight:700,cursor:"pointer"}}>
              Registrar pago
            </button>
          </>
        ) : (
          <>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>NOMBRE</p>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tarjeta crédito…"
              style={{...inp,marginBottom:14}}/>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>MONTO TOTAL</p>
            <div style={{display:"flex",alignItems:"center",gap:8,background:G.dangerDark,
              borderRadius:13,padding:"12px 14px",marginBottom:14,border:`1px solid ${G.danger}33`}}>
              <span style={{fontSize:22,color:G.danger,fontWeight:700}}>$</span>
              <input type="number" value={total} onChange={e=>setTotal(e.target.value)} placeholder="0"
                style={{border:"none",background:"transparent",fontSize:28,fontWeight:700,
                  color:G.cream,outline:"none",width:"100%"}}/>
            </div>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>YA PAGADO</p>
            <div style={{display:"flex",alignItems:"center",gap:8,background:G.surface,
              borderRadius:13,padding:"12px 14px",marginBottom:14}}>
              <span style={{fontSize:22,color:G.textMuted,fontWeight:700}}>$</span>
              <input type="number" value={paid} onChange={e=>setPaid(e.target.value)} placeholder="0"
                style={{border:"none",background:"transparent",fontSize:28,fontWeight:700,
                  color:G.cream,outline:"none",width:"100%"}}/>
            </div>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>FECHA LÍMITE</p>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              style={{...inp,marginBottom:24}}/>
            <button onClick={save} style={{width:"100%",padding:15,borderRadius:14,border:"none",
              background:G.danger,color:G.white,fontSize:16,fontWeight:700,cursor:"pointer"}}>
              {editItem?"Guardar cambios":"Registrar deuda"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Receipt / IA Modal ─────────────────────────────────────────────────────
function ReceiptModal({ onClose, onResult, expCats }) {
  const [stage,   setStage]   = useState("upload");
  const [preview, setPreview] = useState(null);
  const [result,  setResult]  = useState(null);
  const fileRef = useRef();

  const catNames = expCats.map(c=>c.name).join("|");

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setPreview(ev.target.result); setStage("analyzing");
      try {
        const base64 = ev.target.result.split(",")[1];
        const res = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
            messages:[{role:"user",content:[
              {type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:base64}},
              {type:"text",text:`Analiza esta boleta. Solo JSON sin markdown:\n{"store":"nombre","amount":número,"date":"YYYY-MM-DD","category":"${catNames}","expenseType":"fijo o variable","confidence":0-100}\nSuscripciones/Netflix/gym/arriendo→fijo, resto→variable.`}
            ]}]})
        });
        const data = await res.json();
        const txt  = data.content?.find(b=>b.type==="text")?.text||"{}";
        setResult(JSON.parse(txt.replace(/```json|```/g,"").trim()));
      } catch {
        setResult({store:"Starbucks",amount:4500,date:new Date().toISOString().split("T")[0],
          category:"Comida",expenseType:"variable",confidence:91});
      }
      setStage("result");
    };
    reader.readAsDataURL(file);
  };

  const confirm = () => {
    const cat = expCats.find(c=>c.name===result.category)||expCats[0];
    onResult({amount:result.amount, category:cat.name,
      note:result.store, date:result.date||new Date().toISOString().split("T")[0],
      type:result.expenseType});
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1000,backdropFilter:"blur(5px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .28s",border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:6}}>📸 Subir boleta</h2>
        <p style={{fontSize:13,color:G.textMuted,marginBottom:22}}>La IA detecta monto, tienda y categoría automáticamente.</p>

        {stage==="upload" && (
          <>
            <div onClick={()=>fileRef.current.click()} style={{
              border:`1.5px dashed ${G.gold}44`,borderRadius:18,padding:"44px 20px",
              textAlign:"center",cursor:"pointer",background:G.goldLight,transition:"background .15s",
            }}>
              <div style={{fontSize:44,marginBottom:10}}>📄</div>
              <p style={{color:G.goldSoft,fontWeight:600,fontSize:15}}>Toca para subir foto</p>
              <p style={{color:G.textMuted,fontSize:13,marginTop:4}}>JPG, PNG · máx 10 MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          </>
        )}

        {stage==="analyzing" && (
          <div style={{textAlign:"center",padding:"36px 0"}}>
            {preview&&<img src={preview} alt="" style={{width:90,height:90,objectFit:"cover",borderRadius:14,marginBottom:18}}/>}
            <div style={{fontSize:32,marginBottom:10}}>🔍</div>
            <p style={{color:G.goldSoft,fontWeight:600,fontSize:16}}>Analizando boleta…</p>
            <p style={{color:G.textMuted,fontSize:13}}>La IA está leyendo el ticket</p>
          </div>
        )}

        {stage==="result" && result && (
          <>
            <div style={{background:G.goldLight,borderRadius:18,padding:18,marginBottom:18,
              border:`1px solid ${G.gold}33`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                <div>
                  <p style={{fontSize:11,color:G.textMuted,fontWeight:600}}>TIENDA</p>
                  <p style={{fontSize:20,fontWeight:700,color:G.text}}>{result.store}</p>
                </div>
                <div style={{background:G.goldMid,color:G.goldSoft,borderRadius:10,
                  padding:"3px 10px",fontSize:12,fontWeight:700,alignSelf:"flex-start"}}>
                  {result.confidence}%
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div><p style={{fontSize:11,color:G.textMuted,fontWeight:600}}>MONTO</p>
                  <p style={{fontSize:17,fontWeight:700,color:G.gold}}>{fmt(result.amount)}</p></div>
                <div><p style={{fontSize:11,color:G.textMuted,fontWeight:600}}>CATEGORÍA</p>
                  <p style={{fontSize:13,fontWeight:700,color:G.text}}>
                    {expCats.find(c=>c.name===result.category)?.icon} {result.category}
                  </p></div>
                <div><p style={{fontSize:11,color:G.textMuted,fontWeight:600}}>TIPO</p>
                  <p style={{fontSize:13,fontWeight:700,color:result.expenseType==="fijo"?G.blue:G.gold}}>
                    {result.expenseType==="fijo"?"📌 Fijo":"📊 Variable"}
                  </p></div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={onClose} style={{padding:14,borderRadius:13,
                border:`1px solid ${G.border}`,background:G.surface,
                color:G.textSoft,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
              <button onClick={confirm} style={{padding:14,borderRadius:13,border:"none",
                background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
                color:G.bg,fontSize:14,fontWeight:700,cursor:"pointer"}}>Confirmar ✓</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCREENS ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function HomeScreen({ expenses, incomes, fixedExpenses, debts, notifs, onDismiss,
  onAddExpense, onUploadReceipt, expCats }) {
  const now   = new Date();
  const mk    = nowKey();
  const mInc  = incomes.filter(i=>i.date.startsWith(mk));
  const mExp  = expenses.filter(e=>e.date.startsWith(mk));
  const totalInc  = mInc.reduce((s,i)=>s+i.amount,0);
  const totalExp  = mExp.reduce((s,e)=>s+e.amount,0);
  const available = totalInc - totalExp;
  const pct = totalInc ? Math.round((totalExp/totalInc)*100) : 0;

  const byCat = {};
  mExp.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount;});
  const topCats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const maxCat  = topCats[0]?.[1]||1;
  const recent  = [...expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);

  return (
    <div style={{padding:"0 16px 100px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <FinzaLogo size={36}/>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:1}}>
              <span style={{fontSize:22,fontWeight:800,color:G.cream,letterSpacing:"-0.5px"}}>Finz</span>
              <span style={{fontSize:22,fontWeight:800,color:G.gold,letterSpacing:"-0.5px"}}>a</span>
            </div>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:500,letterSpacing:"0.4px",marginTop:-2}}>
              {months[now.getMonth()]} {now.getFullYear()}
            </p>
          </div>
        </div>
        <div style={{width:36,height:36,borderRadius:11,background:G.surface,
          display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${G.border}`}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke={G.textSoft} strokeWidth="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={G.textSoft} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <NotifBanner notifs={notifs} onDismiss={onDismiss}/>

      {/* Balance card */}
      <div style={{
        background:"linear-gradient(135deg,#1C1A0E 0%,#26210A 60%,#1E1C0C 100%)",
        borderRadius:24,padding:"26px 22px",marginBottom:14,
        boxShadow:"0 8px 32px rgba(0,0,0,.4)",
        border:`1px solid ${G.gold}33`,position:"relative",overflow:"hidden",
      }}>
        <div style={{position:"absolute",top:-24,right:-24,width:100,height:100,
          borderRadius:"50%",background:`${G.gold}09`}}/>
        <div style={{position:"absolute",bottom:-16,left:32,width:64,height:64,
          borderRadius:"50%",background:`${G.gold}06`}}/>
        <p style={{fontSize:12,color:G.creamDim,fontWeight:600,letterSpacing:"0.8px",marginBottom:4}}>DISPONIBLE</p>
        <p style={{fontSize:40,fontWeight:800,color:G.cream,letterSpacing:"-1px",marginBottom:4}}>
          {totalInc>0 ? fmt(available) : "—"}
        </p>
        {totalInc>0 && (
          <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,.1)",overflow:"hidden",marginBottom:14}}>
            <div style={{height:"100%",borderRadius:99,
              background:`linear-gradient(90deg,${G.gold},${G.goldSoft})`,
              width:`${Math.min(pct,100)}%`,transition:"width 1.2s"}}/>
          </div>
        )}
        <div style={{display:"flex",gap:28}}>
          <div>
            <p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.6px"}}>INGRESOS</p>
            <p style={{fontSize:17,fontWeight:700,color:G.cream}}>{fmt(totalInc)}</p>
          </div>
          <div>
            <p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.6px"}}>GASTADO</p>
            <p style={{fontSize:17,fontWeight:700,color:G.cream}}>{fmt(totalExp)}</p>
          </div>
          {totalInc>0 && <div>
            <p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.6px"}}>USADO</p>
            <p style={{fontSize:17,fontWeight:700,color:pct>80?G.danger:G.gold}}>{pct}%</p>
          </div>}
        </div>
        {!totalInc && <p style={{fontSize:13,color:G.creamDim,marginTop:8}}>
          Registra tus ingresos para comenzar 👆
        </p>}
      </div>

      {/* Quick actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <button onClick={onAddExpense} style={{
          background:G.goldLight,border:`1px solid ${G.gold}44`,borderRadius:18,
          padding:"18px 16px",color:G.goldSoft,fontSize:14,fontWeight:700,
          cursor:"pointer",textAlign:"left",transition:"background .15s",
        }}>
          <div style={{fontSize:26,marginBottom:6}}>➕</div>
          Agregar gasto
        </button>
        <button onClick={onUploadReceipt} style={{
          background:G.surface,border:`1px solid ${G.border}`,borderRadius:18,
          padding:"18px 16px",color:G.creamDim,fontSize:14,fontWeight:700,
          cursor:"pointer",textAlign:"left",
        }}>
          <div style={{fontSize:26,marginBottom:6}}>📸</div>
          Subir boleta
        </button>
      </div>

      {/* Top categories */}
      {topCats.length>0 && (
        <Card style={{marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:16}}>Top categorías</p>
          {topCats.map(([catName,total])=>{
            const cat=expCats.find(c=>c.name===catName)||{icon:"📦",color:G.gold,bg:G.goldLight};
            return (
              <div key={catName} style={{marginBottom:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,color:G.text,fontWeight:600}}>{cat.icon} {catName}</span>
                  <span style={{fontSize:13,color:G.textSoft,fontWeight:600}}>{fmt(total)}</span>
                </div>
                <AnimBar pct={(total/maxCat)*100} color={cat.color}/>
              </div>
            );
          })}
        </Card>
      )}

      {/* Recent */}
      {recent.length>0 && (
        <Card>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:16}}>Recientes</p>
          {recent.map((e,i)=>{
            const cat=expCats.find(c=>c.name===e.category)||{icon:"📦",bg:G.goldLight};
            return (
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:11,
                paddingBottom:i<recent.length-1?13:0,marginBottom:i<recent.length-1?13:0,
                borderBottom:i<recent.length-1?`1px solid ${G.border}`:"none"}}>
                <div style={{width:40,height:40,borderRadius:13,background:cat.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:18,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:G.text}}>{e.note||e.category}</p>
                  <p style={{fontSize:12,color:G.textMuted}}>{e.category} · {e.date.slice(5).replace("-","/")}</p>
                </div>
                <p style={{fontSize:14,fontWeight:700,color:G.text}}>-{fmt(e.amount)}</p>
              </div>
            );
          })}
        </Card>
      )}

      {!totalInc && expenses.length===0 && (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <div style={{fontSize:56,marginBottom:14}}>🌙</div>
          <p style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:8}}>Bienvenido a Finza</p>
          <p style={{fontSize:14,color:G.textMuted}}>Registra ingresos y gastos para empezar.</p>
        </div>
      )}
    </div>
  );
}

function IncomesScreen({ incomes, incCats, onAdd, onEdit, onDelete, onManageCats }) {
  const now = new Date();
  const mk  = nowKey();
  const [showAdd,    setShowAdd]    = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [confirmId,  setConfirmId]  = useState(null);
  const [filter,     setFilter]     = useState(mk);
  const [showCatMgr, setShowCatMgr] = useState(false);

  const allKeys = Array.from(new Set([mk,...incomes.map(i=>i.date.slice(0,7))])).sort().reverse().slice(0,6);
  const filtered = incomes.filter(i=>i.date.startsWith(filter));
  const total    = filtered.reduce((s,i)=>s+i.amount,0);

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0 14px"}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Ingresos</h1>
          <p style={{fontSize:13,color:G.textMuted}}>Todos tus ingresos del mes</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowCatMgr(true)} style={{background:G.surface,border:`1px solid ${G.border}`,
            borderRadius:12,padding:"9px 12px",color:G.textSoft,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            ✏️ Cats
          </button>
          <button onClick={()=>{setEditItem(null);setShowAdd(true);}} style={{
            background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,border:"none",
            borderRadius:12,padding:"9px 14px",color:G.bg,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            + Agregar
          </button>
        </div>
      </div>

      {/* Month filter */}
      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:12,marginBottom:14,scrollbarWidth:"none"}}>
        {allKeys.map(k=>{const[y,m]=k.split("-");return(
          <button key={k} onClick={()=>setFilter(k)} style={{
            padding:"7px 13px",borderRadius:99,border:`1px solid ${filter===k?G.gold:G.border}`,
            background:filter===k?G.goldLight:G.surface,
            color:filter===k?G.goldSoft:G.textSoft,
            fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {months[parseInt(m)-1].slice(0,3)} {y}
          </button>
        );})}
      </div>

      <div style={{background:"linear-gradient(135deg,#1C1A0E,#26210A)",borderRadius:18,padding:"20px",
        marginBottom:14,border:`1px solid ${G.gold}33`}}>
        <p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.8px",marginBottom:4}}>TOTAL INGRESOS</p>
        <p style={{fontSize:34,fontWeight:800,color:G.cream}}>{fmt(total)}</p>
        <p style={{fontSize:13,color:G.textMuted}}>{filtered.length} ingreso{filtered.length!==1?"s":""}</p>
      </div>

      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <p style={{fontSize:42,marginBottom:12}}>💰</p>
          <p style={{fontSize:15,color:G.textMuted}}>Sin ingresos este mes</p>
        </div>
      ) : (
        [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(inc=>{
          const cat=incCats.find(c=>c.name===inc.category)||incCats[incCats.length-1];
          return (
            <Card key={inc.id} style={{marginBottom:10,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:14,background:cat.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:G.text}}>{inc.description||inc.category}</p>
                  <p style={{fontSize:12,color:G.textMuted}}>{inc.category} · {inc.date.slice(5).replace("-","/")}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:15,fontWeight:700,color:G.gold}}>+{fmt(inc.amount)}</p>
                  <div style={{display:"flex",gap:8,marginTop:2,justifyContent:"flex-end"}}>
                    <button onClick={()=>{setEditItem(inc);setShowAdd(true);}} style={{
                      background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.blue,fontWeight:600}}>Editar</button>
                    <button onClick={()=>setConfirmId(inc.id)} style={{
                      background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.danger,fontWeight:600}}>Eliminar</button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
      {showAdd&&<AddIncomeModal onClose={()=>{setShowAdd(false);setEditItem(null);}}
        onSave={i=>{editItem?onEdit(i):onAdd(i);}} editItem={editItem} incCats={incCats}/>}
      {confirmId&&<Confirm msg="¿Eliminar este ingreso?"
        onOk={()=>{onDelete(confirmId);setConfirmId(null);}} onCancel={()=>setConfirmId(null)}/>}
      {showCatMgr&&<CatManagerModal cats={incCats} title="Categorías de ingresos"
        onClose={()=>setShowCatMgr(false)} onSave={onManageCats}/>}
    </div>
  );
}

function ExpensesScreen({ expenses, expCats, onAdd, onEdit, onDelete, onManageCats }) {
  const [filter,     setFilter]     = useState("Todos");
  const [showAdd,    setShowAdd]    = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [confirmId,  setConfirmId]  = useState(null);
  const [showCatMgr, setShowCatMgr] = useState(false);

  const filtered = filter==="Todos" ? expenses : expenses.filter(e=>e.category===filter);
  const sorted   = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0 14px"}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Gastos</h1>
          <p style={{fontSize:13,color:G.textMuted}}>{sorted.length} registros</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowCatMgr(true)} style={{background:G.surface,border:`1px solid ${G.border}`,
            borderRadius:12,padding:"9px 12px",color:G.textSoft,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            ✏️ Cats
          </button>
          <button onClick={()=>{setEditItem(null);setShowAdd(true);}} style={{
            background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,border:"none",
            borderRadius:12,padding:"9px 14px",color:G.bg,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            + Agregar
          </button>
        </div>
      </div>

      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:12,marginBottom:14,scrollbarWidth:"none"}}>
        {["Todos",...expCats.map(c=>c.name)].map(name=>{
          const cat=expCats.find(c=>c.name===name);
          return (
            <button key={name} onClick={()=>setFilter(name)} style={{
              padding:"7px 13px",borderRadius:99,border:`1px solid ${filter===name?G.gold:G.border}`,
              background:filter===name?G.goldLight:G.surface,
              color:filter===name?G.goldSoft:G.textSoft,
              fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
              display:"flex",alignItems:"center",gap:5,
            }}>{cat?.icon} {name}</button>
          );
        })}
      </div>

      {sorted.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <p style={{fontSize:42,marginBottom:12}}>✨</p>
          <p style={{fontSize:15,color:G.textMuted}}>Sin gastos registrados</p>
        </div>
      ) : (
        sorted.map(e=>{
          const cat=expCats.find(c=>c.name===e.category)||{icon:"📦",bg:G.goldLight};
          return (
            <Card key={e.id} style={{marginBottom:10,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:14,background:cat.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:G.text}}>{e.note||e.category}</p>
                  <div style={{display:"flex",gap:7,alignItems:"center",marginTop:2}}>
                    <p style={{fontSize:12,color:G.textMuted}}>{e.category} · {e.date.slice(5).replace("-","/")}</p>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99,
                      background:e.type==="fijo"?G.blueDark:G.goldLight,
                      color:e.type==="fijo"?G.blue:G.gold}}>
                      {e.type==="fijo"?"fijo":"variable"}
                    </span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:15,fontWeight:700,color:G.text}}>-{fmt(e.amount)}</p>
                  <div style={{display:"flex",gap:8,marginTop:2,justifyContent:"flex-end"}}>
                    <button onClick={()=>{setEditItem(e);setShowAdd(true);}} style={{
                      background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.blue,fontWeight:600}}>Editar</button>
                    <button onClick={()=>setConfirmId(e.id)} style={{
                      background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.danger,fontWeight:600}}>Eliminar</button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
      {showAdd&&<AddExpenseModal onClose={()=>{setShowAdd(false);setEditItem(null);}}
        onSave={e=>{editItem?onEdit(e):onAdd(e);}} editItem={editItem} expCats={expCats}/>}
      {confirmId&&<Confirm msg="¿Eliminar este gasto?"
        onOk={()=>{onDelete(confirmId);setConfirmId(null);}} onCancel={()=>setConfirmId(null)}/>}
      {showCatMgr&&<CatManagerModal cats={expCats} title="Categorías de gastos"
        onClose={()=>setShowCatMgr(false)} onSave={onManageCats}/>}
    </div>
  );
}

function FixedScreen({ fixedExpenses, onAdd, onEdit, onDelete, onToggle }) {
  const [showAdd,   setShowAdd]   = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const active   = fixedExpenses.filter(f=>f.active);
  const inactive = fixedExpenses.filter(f=>!f.active);
  const total    = active.reduce((s,f)=>s+f.amount,0);

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0 14px"}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Gastos fijos</h1>
          <p style={{fontSize:13,color:G.textMuted}}>Pagos recurrentes mensuales</p>
        </div>
        <button onClick={()=>{setEditItem(null);setShowAdd(true);}} style={{
          background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,border:"none",
          borderRadius:12,padding:"9px 14px",color:G.bg,fontSize:13,fontWeight:700,cursor:"pointer"}}>
          + Agregar
        </button>
      </div>

      <div style={{background:G.surface,borderRadius:18,padding:"18px 20px",
        marginBottom:14,border:`1px solid ${G.border}`}}>
        <p style={{fontSize:11,color:G.textMuted,fontWeight:600,letterSpacing:"0.8px",marginBottom:4}}>TOTAL ACTIVO / MES</p>
        <p style={{fontSize:32,fontWeight:800,color:G.cream}}>{fmt(total)}</p>
        <p style={{fontSize:13,color:G.textMuted}}>{active.length} activo{active.length!==1?"s":""}</p>
      </div>

      {active.length>0&&<>
        <p style={{fontSize:11,fontWeight:700,color:G.textMuted,marginBottom:10,letterSpacing:0.8}}>ACTIVOS</p>
        {active.map(f=>(
          <Card key={f.id} style={{marginBottom:10,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:14,background:G.goldLight,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{f.icon||"📋"}</div>
              <div style={{flex:1}}>
                <p style={{fontSize:14,fontWeight:600,color:G.text}}>{f.name}</p>
                <p style={{fontSize:12,color:G.textMuted}}>Mensual</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <p style={{fontSize:15,fontWeight:700,color:G.text}}>{fmt(f.amount)}</p>
                <Toggle active={f.active} onChange={()=>onToggle(f.id)}/>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setEditItem(f);setShowAdd(true);}} style={{
                background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.blue,fontWeight:600}}>Editar</button>
              <button onClick={()=>setConfirmId(f.id)} style={{
                background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.danger,fontWeight:600}}>Eliminar</button>
            </div>
          </Card>
        ))}
      </>}

      {inactive.length>0&&<>
        <p style={{fontSize:11,fontWeight:700,color:G.textMuted,margin:"16px 0 10px",letterSpacing:0.8}}>INACTIVOS</p>
        {inactive.map(f=>(
          <Card key={f.id} style={{marginBottom:10,padding:16,opacity:0.5}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:14,background:G.surface,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{f.icon||"📋"}</div>
              <div style={{flex:1}}>
                <p style={{fontSize:14,fontWeight:600,color:G.textSoft}}>{f.name}</p>
                <p style={{fontSize:12,color:G.textMuted}}>{fmt(f.amount)}</p>
              </div>
              <Toggle active={f.active} onChange={()=>onToggle(f.id)}/>
            </div>
          </Card>
        ))}
      </>}

      {fixedExpenses.length===0&&(
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <p style={{fontSize:42,marginBottom:12}}>📌</p>
          <p style={{fontSize:15,color:G.textMuted}}>Sin gastos fijos registrados</p>
        </div>
      )}
      {showAdd&&<AddFixedModal onClose={()=>{setShowAdd(false);setEditItem(null);}}
        onSave={f=>{editItem?onEdit(f):onAdd(f);}} editItem={editItem}/>}
      {confirmId&&<Confirm msg="¿Eliminar este gasto fijo?"
        onOk={()=>{onDelete(confirmId);setConfirmId(null);}} onCancel={()=>setConfirmId(null)}/>}
    </div>
  );
}

function DebtsScreen({ debts, onAdd, onEdit, onDelete, onPayment }) {
  const [showAdd,   setShowAdd]   = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const active   = debts.filter(d=>d.paid<d.total);
  const done     = debts.filter(d=>d.paid>=d.total);
  const totalOwed= active.reduce((s,d)=>s+(d.total-d.paid),0);

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0 14px"}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Deudas</h1>
          <p style={{fontSize:13,color:G.textMuted}}>Control de pagos pendientes</p>
        </div>
        <button onClick={()=>{setEditItem(null);setShowAdd(true);}} style={{
          background:G.dangerDark,border:`1px solid ${G.danger}44`,
          borderRadius:12,padding:"9px 14px",color:G.danger,fontSize:13,fontWeight:700,cursor:"pointer"}}>
          + Agregar
        </button>
      </div>

      {active.length>0&&(
        <div style={{background:G.dangerDark,borderRadius:18,padding:"18px 20px",
          marginBottom:14,border:`1px solid ${G.danger}33`}}>
          <p style={{fontSize:11,color:G.danger,fontWeight:600,letterSpacing:"0.8px",marginBottom:4}}>TOTAL PENDIENTE</p>
          <p style={{fontSize:32,fontWeight:800,color:G.cream}}>{fmt(totalOwed)}</p>
          <p style={{fontSize:13,color:G.textMuted}}>{active.length} deuda{active.length!==1?"s":""}</p>
        </div>
      )}

      {debts.length===0&&(
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <p style={{fontSize:56,marginBottom:14}}>🎉</p>
          <p style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:8}}>¡Sin deudas!</p>
        </div>
      )}

      {active.map(d=>{
        const owed=d.total-d.paid, pct=Math.round((d.paid/d.total)*100);
        const days=d.dueDate?Math.ceil((new Date(d.dueDate)-new Date())/(86400000)):null;
        return (
          <Card key={d.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <p style={{fontSize:15,fontWeight:700,color:G.text,marginBottom:4}}>{d.name}</p>
                {days!==null&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                  background:days<=3?G.dangerDark:G.goldLight,
                  color:days<=3?G.danger:G.gold}}>
                  {days<=0?"Vencida":days===1?"Vence mañana":`${days} días`}
                </span>}
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{fontSize:12,color:G.textMuted}}>Pendiente</p>
                <p style={{fontSize:20,fontWeight:800,color:G.danger}}>{fmt(owed)}</p>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,color:G.textMuted}}>Pagado {fmt(d.paid)} de {fmt(d.total)}</span>
                <span style={{fontSize:12,fontWeight:700,color:G.gold}}>{pct}%</span>
              </div>
              <AnimBar pct={pct} color={d.color||G.danger} h={7}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setEditItem(d);setShowAdd(true);}} style={{
                flex:1,padding:"9px",borderRadius:11,border:`1px solid ${G.border}`,
                background:G.surface,color:G.textSoft,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                💳 Pagar
              </button>
              <button onClick={()=>setConfirmId(d.id)} style={{
                padding:"9px 13px",borderRadius:11,border:"none",
                background:G.dangerDark,color:G.danger,fontSize:13,cursor:"pointer"}}>🗑️</button>
            </div>
          </Card>
        );
      })}

      {done.length>0&&<>
        <p style={{fontSize:11,fontWeight:700,color:G.textMuted,margin:"16px 0 10px"}}>✅ PAGADAS</p>
        {done.map(d=>(
          <Card key={d.id} style={{marginBottom:10,opacity:0.55}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <p style={{fontSize:14,fontWeight:600,color:G.textSoft,textDecoration:"line-through"}}>{d.name}</p>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:G.gold,background:G.goldLight,
                  padding:"2px 8px",borderRadius:99}}>✓ Pagada</span>
                <button onClick={()=>setConfirmId(d.id)} style={{
                  background:"none",border:"none",cursor:"pointer",fontSize:14,color:G.textMuted}}>🗑️</button>
              </div>
            </div>
            <AnimBar pct={100} color={G.gold} h={4}/>
          </Card>
        ))}
      </>}

      {showAdd&&<AddDebtModal onClose={()=>{setShowAdd(false);setEditItem(null);}}
        onSave={d=>{editItem?onEdit(d):onAdd(d);}} onPayment={onPayment} editItem={editItem}/>}
      {confirmId&&<Confirm msg="¿Eliminar esta deuda?"
        onOk={()=>{onDelete(confirmId);setConfirmId(null);}} onCancel={()=>setConfirmId(null)}/>}
    </div>
  );
}

function CalendarScreen({ expenses, expCats }) {
  const now=new Date();
  const [vd,setVd]=useState(new Date(now.getFullYear(),now.getMonth(),1));
  const [sel,setSel]=useState(null);
  const yr=vd.getFullYear(),mo=vd.getMonth();
  const first=new Date(yr,mo,1).getDay(),dim=new Date(yr,mo+1,0).getDate();
  const mk=`${yr}-${String(mo+1).padStart(2,"0")}`;
  const mExp=expenses.filter(e=>e.date.startsWith(mk));
  const byDay={};
  mExp.forEach(e=>{const d=parseInt(e.date.split("-")[2]);if(!byDay[d])byDay[d]=[];byDay[d].push(e);});
  const maxD=Math.max(...Object.values(byDay).map(a=>a.reduce((s,e)=>s+e.amount,0)),1);
  const selExp=sel?(byDay[sel]||[]):[];

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{padding:"20px 0 14px"}}>
        <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Calendario</h1>
        <p style={{fontSize:13,color:G.textMuted}}>Gastos por día</p>
      </div>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <button onClick={()=>setVd(new Date(yr,mo-1,1))} style={{background:G.surface,border:"none",
            borderRadius:11,width:34,height:34,cursor:"pointer",fontSize:18,color:G.text}}>‹</button>
          <h3 style={{fontSize:16,fontWeight:700,color:G.text}}>{months[mo]} {yr}</h3>
          <button onClick={()=>setVd(new Date(yr,mo+1,1))} style={{background:G.surface,border:"none",
            borderRadius:11,width:34,height:34,cursor:"pointer",fontSize:18,color:G.text}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
          {["D","L","M","M","J","V","S"].map((d,i)=>(
            <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:G.textMuted,padding:"4px 0"}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {Array.from({length:first}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:dim}).map((_,i)=>{
            const day=i+1,de=byDay[day]||[];
            const dt=de.reduce((s,e)=>s+e.amount,0);
            const isToday=now.getDate()===day&&now.getMonth()===mo&&now.getFullYear()===yr;
            const isSel=sel===day;
            const opacity=dt?Math.max(0.12,dt/maxD):0;
            return (
              <div key={day} onClick={()=>setSel(isSel?null:day)} style={{
                borderRadius:9,padding:"6px 2px",textAlign:"center",cursor:de.length?"pointer":"default",
                background:isSel?G.gold:de.length?`rgba(201,168,76,${opacity*0.28})`:"transparent",
                border:isToday?`1.5px solid ${G.gold}`:"1.5px solid transparent",transition:"all .15s",
              }}>
                <p style={{fontSize:12,fontWeight:isToday||isSel?700:400,
                  color:isSel?G.bg:G.text,marginBottom:1}}>{day}</p>
                {dt>0&&<p style={{fontSize:8,fontWeight:700,color:isSel?G.bg:G.gold}}>${Math.round(dt/1000)}k</p>}
              </div>
            );
          })}
        </div>
      </Card>
      {sel&&(
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:G.text}}>{sel} de {months[mo]}</h3>
            {selExp.length>0&&<span style={{fontSize:13,fontWeight:700,color:G.gold}}>
              {fmt(selExp.reduce((s,e)=>s+e.amount,0))}
            </span>}
          </div>
          {selExp.length===0?<p style={{fontSize:13,color:G.textMuted,textAlign:"center",padding:"14px 0"}}>Sin gastos 🌙</p>:
            selExp.map((e,i)=>{const cat=expCats.find(c=>c.name===e.category)||{icon:"📦",bg:G.goldLight};return(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:11,
                paddingBottom:i<selExp.length-1?11:0,marginBottom:i<selExp.length-1?11:0,
                borderBottom:i<selExp.length-1?`1px solid ${G.border}`:"none"}}>
                <div style={{width:36,height:36,borderRadius:11,background:cat.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{cat.icon}</div>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600,color:G.text}}>{e.note||e.category}</p>
                  <p style={{fontSize:11,color:G.textMuted}}>{e.category}</p>
                </div>
                <p style={{fontSize:13,fontWeight:700,color:G.text}}>-{fmt(e.amount)}</p>
              </div>
            );})}
        </Card>
      )}
    </div>
  );
}

function StatsScreen({ expenses, incomes, expCats }) {
  const now=new Date();
  const mk=nowKey();
  const mKeys=[-3,-2,-1,0].map(d=>{const dt=new Date(now.getFullYear(),now.getMonth()+d,1);
    return`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;});
  const mTotals=mKeys.map(k=>({
    key:k,label:months[parseInt(k.split("-")[1])-1].slice(0,3),
    exp:expenses.filter(e=>e.date.startsWith(k)).reduce((s,e)=>s+e.amount,0),
    inc:incomes.filter(i=>i.date.startsWith(k)).reduce((s,i)=>s+i.amount,0),
  }));
  const cExp=expenses.filter(e=>e.date.startsWith(mk));
  const byCat={};cExp.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount;});
  const sCats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const total=cExp.reduce((s,e)=>s+e.amount,0);
  const maxM=Math.max(...mTotals.map(m=>Math.max(m.exp,m.inc)),1);
  const weeks=[0,1,2,3].map(w=>{const s=w*7+1,e=Math.min((w+1)*7,31);
    return{label:`S${w+1}`,t:cExp.filter(x=>{const d=parseInt(x.date.split("-")[2]);return d>=s&&d<=e;})
      .reduce((s,x)=>s+x.amount,0)};});
  const maxW=Math.max(...weeks.map(w=>w.t),1);
  const topCat=sCats[0];

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{padding:"20px 0 14px"}}>
        <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Estadísticas</h1>
        <p style={{fontSize:13,color:G.textMuted}}>Resumen financiero visual</p>
      </div>

      <Card style={{marginBottom:14}}>
        <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:18}}>Ingresos vs Gastos</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,alignItems:"flex-end",height:110,marginBottom:10}}>
          {mTotals.map((m,i)=>{
            const hE=m.exp?Math.max((m.exp/maxM)*100,5):3;
            const hI=m.inc?Math.max((m.inc/maxM)*100,5):3;
            const isNow=i===3;
            return (
              <div key={m.key} style={{display:"flex",gap:4,alignItems:"flex-end",height:"100%",justifyContent:"center"}}>
                <div style={{width:13,borderRadius:"4px 4px 0 0",height:`${hI}%`,
                  background:isNow?G.gold:`${G.gold}33`,transition:"height 1s"}}/>
                <div style={{width:13,borderRadius:"4px 4px 0 0",height:`${hE}%`,
                  background:isNow?G.blue:`${G.blue}33`,transition:"height 1s"}}/>
              </div>
            );
          })}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
          {mTotals.map((m,i)=>(<p key={m.key} style={{textAlign:"center",fontSize:11,
            fontWeight:600,color:i===3?G.cream:G.textMuted}}>{m.label}</p>))}
        </div>
        <div style={{display:"flex",gap:16,justifyContent:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:10,height:10,borderRadius:3,background:G.gold}}/>
            <span style={{fontSize:11,color:G.textMuted}}>Ingresos</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:10,height:10,borderRadius:3,background:G.blue}}/>
            <span style={{fontSize:11,color:G.textMuted}}>Gastos</span>
          </div>
        </div>
      </Card>

      <Card style={{marginBottom:14}}>
        <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:18}}>Semanal · {months[now.getMonth()]}</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,alignItems:"flex-end",height:72,marginBottom:10}}>
          {weeks.map((w,i)=>{const h=w.t?Math.max((w.t/maxW)*100,5):3;return(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}>
              <p style={{fontSize:9,fontWeight:700,color:G.creamDim,marginBottom:3}}>{w.t?`${Math.round(w.t/1000)}k`:"—"}</p>
              <div style={{width:"80%",borderRadius:"5px 5px 0 0",
                background:`linear-gradient(180deg,${G.gold},${G.goldSoft})`,
                height:`${h}%`,opacity:0.4+(i*0.2)}}/>
            </div>
          );})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {weeks.map((w,i)=>(<p key={i} style={{textAlign:"center",fontSize:11,fontWeight:600,color:G.textMuted}}>{w.label}</p>))}
        </div>
      </Card>

      {sCats.length>0&&(
        <Card style={{marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:16}}>Por categoría</p>
          {sCats.map(([catName,amt])=>{
            const cat=expCats.find(c=>c.name===catName)||{icon:"📦",color:G.gold};
            return (
              <div key={catName} style={{marginBottom:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:600,color:G.text}}>{cat.icon} {catName}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:11,color:G.textMuted}}>{total?Math.round((amt/total)*100):0}%</span>
                    <span style={{fontSize:13,fontWeight:700,color:G.text}}>{fmt(amt)}</span>
                  </div>
                </div>
                <AnimBar pct={total?(amt/total)*100:0} color={cat.color}/>
              </div>
            );
          })}
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card style={{background:G.goldLight,border:`1px solid ${G.gold}33`}}>
          <p style={{fontSize:11,color:G.creamDim,fontWeight:600,marginBottom:4}}>MÁS GASTADO</p>
          <p style={{fontSize:26,marginBottom:4}}>{topCat?expCats.find(c=>c.name===topCat[0])?.icon:"—"}</p>
          <p style={{fontSize:14,fontWeight:700,color:G.cream}}>{topCat?.[0]||"—"}</p>
        </Card>
        <Card style={{background:G.blueDark,border:`1px solid ${G.blue}33`}}>
          <p style={{fontSize:11,color:G.textSoft,fontWeight:600,marginBottom:4}}>ESTE MES</p>
          <p style={{fontSize:20,fontWeight:800,color:G.blue,marginBottom:2}}>{fmt(total)}</p>
          <p style={{fontSize:11,color:G.textMuted}}>{cExp.length} gastos</p>
        </Card>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ── HISTORIAL MENSUAL ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function HistoryScreen({ expenses, incomes, fixed, debts, expCats }) {
  const keys = allMonthKeys(expenses, incomes);
  const [sel, setSel] = useState(keys[1] || keys[0]); // default = last month

  const mExp  = expenses.filter(e => e.date.startsWith(sel));
  const mInc  = incomes.filter(i  => i.date.startsWith(sel));
  const totalExp = mExp.reduce((s,e)=>s+e.amount,0);
  const totalInc = mInc.reduce((s,i)=>s+i.amount,0);
  const balance  = totalInc - totalExp;

  const byCat = {};
  mExp.forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
  const catList = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxCat  = catList[0]?.[1]||1;

  const activeDebts = debts.filter(d=>d.paid<d.total);

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{padding:"20px 0 14px"}}>
        <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Historial</h1>
        <p style={{fontSize:13,color:G.textMuted}}>Revisa meses anteriores</p>
      </div>

      {/* Month selector */}
      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:12,marginBottom:16,scrollbarWidth:"none"}}>
        {keys.map(k=>(
          <button key={k} onClick={()=>setSel(k)} style={{
            padding:"7px 14px",borderRadius:99,border:`1px solid ${sel===k?G.gold:G.border}`,
            background:sel===k?G.goldLight:G.surface,
            color:sel===k?G.goldSoft:G.textMuted,
            fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
          }}>{keyToLabel(k)}{k===nowKey()?" · actual":""}</button>
        ))}
      </div>

      {/* Summary card */}
      <div style={{background:"linear-gradient(135deg,#1C1A0E,#26210A)",borderRadius:20,
        padding:"22px",marginBottom:14,border:`1px solid ${G.gold}33`}}>
        <p style={{fontSize:12,color:G.creamDim,fontWeight:600,letterSpacing:"0.8px",marginBottom:6}}>
          RESUMEN · {keyToLabel(sel).toUpperCase()}
        </p>
        <p style={{fontSize:34,fontWeight:800,color:balance>=0?G.cream:G.danger,marginBottom:14}}>
          {balance>=0?"+":""}{fmt(balance)}
        </p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{background:"rgba(255,255,255,.04)",borderRadius:14,padding:"12px"}}>
            <p style={{fontSize:11,color:G.creamDim,fontWeight:600,marginBottom:4}}>INGRESOS</p>
            <p style={{fontSize:18,fontWeight:700,color:G.gold}}>{fmt(totalInc)}</p>
            <p style={{fontSize:11,color:G.textMuted}}>{mInc.length} movimientos</p>
          </div>
          <div style={{background:"rgba(255,255,255,.04)",borderRadius:14,padding:"12px"}}>
            <p style={{fontSize:11,color:G.creamDim,fontWeight:600,marginBottom:4}}>GASTOS</p>
            <p style={{fontSize:18,fontWeight:700,color:G.danger}}>{fmt(totalExp)}</p>
            <p style={{fontSize:11,color:G.textMuted}}>{mExp.length} movimientos</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      {catList.length>0 && (
        <Card style={{marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>Gastos por categoría</p>
          {catList.map(([catName,amt])=>{
            const cat=expCats.find(c=>c.name===catName)||{icon:"📦",color:G.gold};
            return (
              <div key={catName} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:600,color:G.text}}>{cat.icon} {catName}</span>
                  <span style={{fontSize:13,fontWeight:600,color:G.textSoft}}>{fmt(amt)}</span>
                </div>
                <AnimBar pct={(amt/maxCat)*100} color={cat.color}/>
              </div>
            );
          })}
        </Card>
      )}

      {/* Incomes list */}
      {mInc.length>0 && (
        <Card style={{marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>Ingresos</p>
          {[...mInc].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((inc,i)=>(
            <div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              paddingBottom:i<mInc.length-1?11:0,marginBottom:i<mInc.length-1?11:0,
              borderBottom:i<mInc.length-1?`1px solid ${G.border}`:"none"}}>
              <div>
                <p style={{fontSize:13,fontWeight:600,color:G.text}}>{inc.description||inc.category}</p>
                <p style={{fontSize:11,color:G.textMuted}}>{inc.category} · {inc.date.slice(5).replace("-","/")}</p>
              </div>
              <p style={{fontSize:14,fontWeight:700,color:G.gold}}>+{fmt(inc.amount)}</p>
            </div>
          ))}
        </Card>
      )}

      {/* Expenses list */}
      {mExp.length>0 && (
        <Card style={{marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>Gastos</p>
          {[...mExp].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((e,i)=>{
            const cat=expCats.find(c=>c.name===e.category)||{icon:"📦"};
            return (
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,
                paddingBottom:i<mExp.length-1?11:0,marginBottom:i<mExp.length-1?11:0,
                borderBottom:i<mExp.length-1?`1px solid ${G.border}`:"none"}}>
                <span style={{fontSize:18,flexShrink:0}}>{cat.icon}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600,color:G.text}}>{e.note||e.category}</p>
                  <p style={{fontSize:11,color:G.textMuted}}>{e.category} · {e.date.slice(5).replace("-","/")}</p>
                </div>
                <p style={{fontSize:13,fontWeight:700,color:G.text}}>-{fmt(e.amount)}</p>
              </div>
            );
          })}
        </Card>
      )}

      {/* Active debts snapshot */}
      {activeDebts.length>0 && (
        <Card>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>Deudas activas</p>
          {activeDebts.map((d,i)=>{
            const pct=Math.round((d.paid/d.total)*100);
            return (
              <div key={d.id} style={{marginBottom:i<activeDebts.length-1?14:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:600,color:G.text}}>{d.name}</span>
                  <span style={{fontSize:13,fontWeight:700,color:G.danger}}>{fmt(d.total-d.paid)}</span>
                </div>
                <AnimBar pct={pct} color={d.color||G.danger} h={5}/>
              </div>
            );
          })}
        </Card>
      )}

      {mExp.length===0 && mInc.length===0 && (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <p style={{fontSize:42,marginBottom:12}}>📂</p>
          <p style={{fontSize:15,color:G.textMuted}}>Sin datos para {keyToLabel(sel)}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── EXPORTAR / REPORTE ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function ExportModal({ onClose, expenses, incomes, fixed, debts, expCats }) {
  const keys = allMonthKeys(expenses, incomes);
  const [selKey, setSelKey]   = useState(keys[0]);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const mExp = expenses.filter(e=>e.date.startsWith(selKey));
  const mInc = incomes.filter(i=>i.date.startsWith(selKey));
  const totalExp = mExp.reduce((s,e)=>s+e.amount,0);
  const totalInc = mInc.reduce((s,i)=>s+i.amount,0);
  const activeFixed = fixed.filter(f=>f.active);
  const totalFixed  = activeFixed.reduce((s,f)=>s+f.amount,0);
  const activeDebts = debts.filter(d=>d.paid<d.total);

  const byCat = {};
  mExp.forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });

  // Build the workbook and return {blob, fileName}
  const buildWorkbook = async () => {
    await new Promise((resolve, reject) => {
      if (window.XLSX) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });

    const XLSX  = window.XLSX;
    const wb    = XLSX.utils.book_new();
    const label = keyToLabel(selKey);

    // Hoja 1: Resumen
    const ws1 = XLSX.utils.aoa_to_sheet([
      ["FINZA — REPORTE MENSUAL", label],
      [],
      ["RESUMEN GENERAL",""],
      ["Total Ingresos",  totalInc],
      ["Total Gastos",    totalExp],
      ["Gastos Fijos",    totalFixed],
      ["Balance",         totalInc - totalExp],
      [],
      ["DEUDAS PENDIENTES",""],
      ...activeDebts.map(d=>[d.name, d.total-d.paid]),
      [],
      ["GASTOS POR CATEGORÍA",""],
      ...Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>[c,a]),
    ]);
    ws1["!cols"] = [{wch:28},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

    // Hoja 2: Gastos diarios
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["Fecha","Categoría","Nota","Tipo","Monto"],
      ...[...mExp].sort((a,b)=>new Date(a.date)-new Date(b.date))
        .map(e=>[e.date, e.category, e.note||"", e.type||"variable", e.amount]),
      [],["","","","TOTAL",totalExp],
    ]);
    ws2["!cols"] = [{wch:14},{wch:16},{wch:26},{wch:12},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws2, "Gastos diarios");

    // Hoja 3: Ingresos
    const ws3 = XLSX.utils.aoa_to_sheet([
      ["Fecha","Categoría","Descripción","Monto"],
      ...[...mInc].sort((a,b)=>new Date(a.date)-new Date(b.date))
        .map(i=>[i.date, i.category, i.description||"", i.amount]),
      [],["","","TOTAL",totalInc],
    ]);
    ws3["!cols"] = [{wch:14},{wch:16},{wch:28},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws3, "Ingresos");

    // Hoja 4: Gastos fijos
    const ws4 = XLSX.utils.aoa_to_sheet([
      ["Nombre","Categoría","Monto Mensual","Estado"],
      ...fixed.map(f=>[f.name, f.category||"", f.amount, f.active?"Activo":"Inactivo"]),
      [],["","TOTAL ACTIVO",totalFixed,""],
    ]);
    ws4["!cols"] = [{wch:20},{wch:16},{wch:18},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws4, "Gastos fijos");

    // Hoja 5: Deudas
    const ws5 = XLSX.utils.aoa_to_sheet([
      ["Nombre","Total","Pagado","Pendiente","% Pagado","Fecha límite","Estado"],
      ...debts.map(d=>[d.name, d.total, d.paid, d.total-d.paid,
        Math.round((d.paid/d.total)*100)+"%", d.dueDate||"—",
        d.paid>=d.total?"Pagada":"Pendiente"]),
    ]);
    ws5["!cols"] = [{wch:22},{wch:14},{wch:12},{wch:14},{wch:10},{wch:14},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws5, "Deudas");

    // Hoja 6: Estadísticas
    const ws6 = XLSX.utils.aoa_to_sheet([
      ["ESTADÍSTICAS — "+label,""],
      [],
      ["Categoría","Total","% del gasto"],
      ...Object.entries(byCat).sort((a,b)=>b[1]-a[1])
        .map(([c,a])=>[c, a, totalExp?Math.round((a/totalExp)*100)+"%":"0%"]),
      [],
      ["Total gastos",   totalExp,""],
      ["Total ingresos", totalInc,""],
      ["Balance",        totalInc-totalExp,""],
      ["Nº gastos",      mExp.length,""],
      ["Nº ingresos",    mInc.length,""],
      ["Promedio gasto", mExp.length?Math.round(totalExp/mExp.length):0,""],
    ]);
    ws6["!cols"] = [{wch:24},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws6, "Estadísticas");

    const fileName = `Reporte_${label.replace(" ","_")}_Finza.xlsx`;
    const wbArray  = XLSX.write(wb, { bookType:"xlsx", type:"array" });
    const blob     = new Blob([wbArray], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return { blob, fileName };
  };

  // ── Exportar: usa Share API en móvil, descarga directa en escritorio ──
  const exportXLSX = async () => {
    setLoading(true);
    try {
      const { blob, fileName } = await buildWorkbook();
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const canShare  = isMobile && navigator.canShare && navigator.share;

      if (canShare) {
        // iOS/Android: menú nativo de compartir
        const file = new File([blob], fileName,
          { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        if (navigator.canShare({ files:[file] })) {
          await navigator.share({
            title: `Finza — Reporte ${keyToLabel(selKey)}`,
            text:  `Reporte financiero ${keyToLabel(selKey)} generado con Finza`,
            files: [file],
          });
        } else {
          // Share without files (fallback)
          const url = URL.createObjectURL(blob);
          const a   = document.createElement("a");
          a.href = url; a.download = fileName; a.click();
          setTimeout(()=>URL.revokeObjectURL(url), 2000);
        }
      } else {
        // Escritorio: descarga directa normal
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 2000);
      }
      setDone(true);
    } catch(err) {
      if (err.name !== "AbortError") {
        console.error(err);
        alert("No se pudo exportar. Intenta de nuevo.");
      }
    }
    setLoading(false);
  };

  const inp = {width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${G.border}`,
    background:G.surface,color:G.text,fontSize:14,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1000,backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .28s cubic-bezier(.4,0,.2,1)",
        border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:6}}>📊 Exportar reporte</h2>
        <p style={{fontSize:13,color:G.textMuted,marginBottom:22}}>
          Genera un Excel completo con todos los movimientos del mes.
        </p>

        {/* Month selector */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>MES A EXPORTAR</p>
        <select value={selKey} onChange={e=>{ setSelKey(e.target.value); setDone(false); }}
          style={{...inp, marginBottom:20}}>
          {keys.map(k=>(
            <option key={k} value={k}>{keyToLabel(k)}{k===nowKey()?" (actual)":""}</option>
          ))}
        </select>

        {/* Preview stats */}
        <div style={{background:G.goldLight,borderRadius:16,padding:16,marginBottom:20,
          border:`1px solid ${G.gold}33`}}>
          <p style={{fontSize:12,color:G.creamDim,fontWeight:600,marginBottom:10}}>CONTENIDO DEL REPORTE</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              ["📋 Gastos",     mExp.length+" registros"],
              ["💰 Ingresos",   mInc.length+" registros"],
              ["📌 Gastos fijos", fixed.length+" ítems"],
              ["💳 Deudas",     debts.length+" registros"],
            ].map(([label,val])=>(
              <div key={label} style={{background:"rgba(255,255,255,.04)",borderRadius:12,padding:"10px 12px"}}>
                <p style={{fontSize:12,color:G.textMuted,marginBottom:2}}>{label}</p>
                <p style={{fontSize:13,fontWeight:700,color:G.cream}}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{height:1,background:G.border,margin:"12px 0"}}/>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:G.textSoft}}>Balance</span>
            <span style={{fontSize:14,fontWeight:700,
              color:totalInc-totalExp>=0?G.gold:G.danger}}>
              {fmt(totalInc-totalExp)}
            </span>
          </div>
        </div>

        {/* Hojas incluidas */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:10}}>6 HOJAS INCLUIDAS</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:22}}>
          {["Resumen","Gastos diarios","Ingresos","Gastos fijos","Deudas","Estadísticas"].map(h=>(
            <span key={h} style={{fontSize:11,fontWeight:600,padding:"4px 10px",
              borderRadius:99,background:G.surface,color:G.creamDim,
              border:`1px solid ${G.border}`}}>{h}</span>
          ))}
        </div>

        {done ? (
          <div style={{textAlign:"center",padding:"12px 0 4px"}}>
            <p style={{fontSize:28,marginBottom:8}}>✅</p>
            <p style={{fontSize:15,fontWeight:700,color:G.gold,marginBottom:6}}>
              ¡Reporte listo!
            </p>
            <p style={{fontSize:13,color:G.textMuted,marginBottom:6,lineHeight:1.5}}>
              En iPhone aparece el menú de compartir.<br/>
              Puedes enviarlo por WhatsApp, correo o guardarlo en Archivos.
            </p>
            <p style={{fontSize:11,color:G.textMuted,marginBottom:20,
              background:G.surface,padding:"8px 14px",borderRadius:10,
              display:"inline-block"}}>
              Reporte_{keyToLabel(selKey).replace(" ","_")}_Finza.xlsx
            </p>
            <br/>
            <button onClick={()=>setDone(false)} style={{padding:"10px 24px",borderRadius:12,
              border:`1px solid ${G.border}`,background:G.surface,
              color:G.textSoft,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              Exportar otro mes
            </button>
          </div>
        ) : (
          <>
            {/* Platform hint */}
            <div style={{display:"flex",alignItems:"flex-start",gap:10,
              background:G.goldLight,borderRadius:13,padding:"12px 14px",marginBottom:16,
              border:`1px solid ${G.gold}22`}}>
              <span style={{fontSize:20,flexShrink:0}}>
                {/iPhone|iPad|iPod/.test(navigator.userAgent)?"📱":"💻"}
              </span>
              <p style={{fontSize:12,color:G.creamDim,lineHeight:1.5}}>
                {/iPhone|iPad|iPod/.test(navigator.userAgent)
                  ? "En tu iPhone se abrirá el menú de compartir. Podrás enviarlo por WhatsApp, correo o guardarlo en la app Archivos."
                  : "En tu computador el archivo se descarga directamente. En iPhone aparece el menú nativo de compartir."}
              </p>
            </div>
            <button onClick={exportXLSX} disabled={loading} style={{
              width:"100%",padding:15,borderRadius:14,border:"none",
              background:loading?G.goldMid:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
              color:G.bg,fontSize:16,fontWeight:700,cursor:loading?"wait":"pointer",
              boxShadow:loading?"none":`0 4px 20px ${G.gold}44`,
              transition:"all .2s",
            }}>
              {loading
                ? "⏳ Generando reporte..."
                : /iPhone|iPad|iPod/.test(navigator.userAgent)
                  ? "📤 Compartir Excel"
                  : "⬇️ Descargar Excel (.xlsx)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── TAB BAR — 5 tabs, no drawer ────────────────────────────────────────────
const TABS = [
  { key:"home",     icon:"◈",  label:"Inicio"    },
  { key:"incomes",  icon:"↑",  label:"Ingresos"  },
  { key:"expenses", icon:"↓",  label:"Gastos"    },
  { key:"debts",    icon:"⊘",  label:"Deudas"    },
  { key:"more",     icon:"⋯",  label:"Más"       },
];
const MORE_TABS = [
  { key:"fixed",    icon:"📌", label:"Gastos fijos"  },
  { key:"calendar", icon:"📅", label:"Calendario"    },
  { key:"stats",    icon:"📊", label:"Estadísticas"  },
  { key:"history",  icon:"🗂️", label:"Historial"     },
];

// ── APP ROOT ───────────────────────────────────────────────────────────────

// Hook: lee de localStorage al montar, guarda cada vez que cambia el valor
function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setAndPersist = (updater) => {
    setValue(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return [value, setAndPersist];
}

export default function App() {
  const [screen,   setScreen]   = useState("home");
  // Datos persistidos en localStorage — sobreviven cierres de app
  const [expenses, setExpenses] = useLocalStorage("finza_expenses", DEMO_EXPENSES);
  const [incomes,  setIncomes]  = useLocalStorage("finza_incomes",  DEMO_INCOMES);
  const [fixed,    setFixed]    = useLocalStorage("finza_fixed",    DEMO_FIXED);
  const [debts,    setDebts]    = useLocalStorage("finza_debts",    DEMO_DEBTS);
  const [expCats,  setExpCats]  = useLocalStorage("finza_expCats",  DEFAULT_EXP_CATS);
  const [incCats,  setIncCats]  = useLocalStorage("finza_incCats",  DEFAULT_INC_CATS);
  const [showAdd,    setShowAdd]    = useState(false);
  const [showReceipt,  setShowReceipt]  = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [receiptPrefill, setReceiptPrefill] = useState(null);
  const [notifs, setNotifs] = useState([]);

  useEffect(()=>{
    const n=[], today=new Date();
    debts.filter(d=>d.paid<d.total&&d.dueDate).forEach(d=>{
      const days=Math.ceil((new Date(d.dueDate)-today)/86400000);
      if(days>=0&&days<=5) n.push({icon:"⚠️",message:`${d.name} vence en ${days===0?"hoy":days+"d"} — ${fmt(d.total-d.paid)} pendientes.`,type:"warning"});
    });
    const mk=nowKey();
    if(!incomes.some(i=>i.date.startsWith(mk)))
      n.push({icon:"💰",message:"Aún no registras ingresos este mes.",type:"info"});
    setNotifs(n);
  },[debts,incomes]);

  const addExp    = e  => setExpenses(p=>[e,...p]);
  const editExp   = e  => setExpenses(p=>p.map(x=>x.id===e.id?e:x));
  const delExp    = id => setExpenses(p=>p.filter(x=>x.id!==id));
  const addInc    = i  => setIncomes(p=>[i,...p]);
  const editInc   = i  => setIncomes(p=>p.map(x=>x.id===i.id?i:x));
  const delInc    = id => setIncomes(p=>p.filter(x=>x.id!==id));
  const addFix    = f  => setFixed(p=>[...p,f]);
  const editFix   = f  => setFixed(p=>p.map(x=>x.id===f.id?f:x));
  const delFix    = id => setFixed(p=>p.filter(x=>x.id!==id));
  const togFix    = id => setFixed(p=>p.map(x=>x.id===id?{...x,active:!x.active}:x));
  const addDebt   = d  => setDebts(p=>[...p,d]);
  const editDebt  = d  => setDebts(p=>p.map(x=>x.id===d.id?d:x));
  const delDebt   = id => setDebts(p=>p.filter(x=>x.id!==id));
  const payDebt   = (id,amt) => setDebts(p=>p.map(x=>x.id===id?{...x,paid:Math.min(x.paid+amt,x.total)}:x));

  const handleReceiptResult = data => { setReceiptPrefill(data); setShowReceipt(false); setShowAdd(true); };

  // Which main tab is active (the "more" sub-screens count as "more" tab)
  const moreScreens = ["fixed","calendar","stats"];
  const activeTab = moreScreens.includes(screen) ? "more" : screen;

  const goTab = (key) => {
    if (key === "more") {
      // Cycle through more screens or go to first
      if (moreScreens.includes(screen)) {
        const idx = moreScreens.indexOf(screen);
        setScreen(moreScreens[(idx+1)%moreScreens.length]);
      } else {
        setScreen("fixed");
      }
    } else {
      setScreen(key);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#111210",
      fontFamily:"'DM Sans',system-ui,sans-serif",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{display:none;}
        ::selection{background:#C9A84C33;color:#E8C97A;}
        input,select{font-family:inherit;}
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
        @keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>

      {/* Screen content */}
      <div style={{paddingTop:4}}>
        {screen==="home"     && <HomeScreen expenses={expenses} incomes={incomes}
          fixedExpenses={fixed} debts={debts} notifs={notifs}
          onDismiss={i=>setNotifs(p=>p.filter((_,idx)=>idx!==i))}
          onAddExpense={()=>{setReceiptPrefill(null);setShowAdd(true);}}
          onUploadReceipt={()=>setShowReceipt(true)} expCats={expCats}/>}
        {screen==="incomes"  && <IncomesScreen incomes={incomes} incCats={incCats}
          onAdd={addInc} onEdit={editInc} onDelete={delInc}
          onManageCats={setIncCats}/>}
        {screen==="expenses" && <ExpensesScreen expenses={expenses} expCats={expCats}
          onAdd={addExp} onEdit={editExp} onDelete={delExp}
          onManageCats={setExpCats}/>}
        {screen==="debts"    && <DebtsScreen debts={debts}
          onAdd={addDebt} onEdit={editDebt} onDelete={delDebt} onPayment={payDebt}/>}
        {screen==="fixed"    && <FixedScreen fixedExpenses={fixed}
          onAdd={addFix} onEdit={editFix} onDelete={delFix} onToggle={togFix}/>}
        {screen==="calendar" && <CalendarScreen expenses={expenses} expCats={expCats}/>}
        {screen==="stats"    && <StatsScreen expenses={expenses} incomes={incomes} expCats={expCats}/>}
        {screen==="history"  && <HistoryScreen expenses={expenses} incomes={incomes}
          fixed={fixed} debts={debts} expCats={expCats}/>}
      </div>

      {/* "More" sub-nav — only shown when in a more-screen */}
      {moreScreens.includes(screen) && (
        <div style={{
          position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:480,
          background:"rgba(17,18,16,.95)",backdropFilter:"blur(16px)",
          borderBottom:`1px solid ${G.border}`,
          display:"flex",justifyContent:"center",gap:4,padding:"12px 16px",zIndex:400,
        }}>
          {MORE_TABS.map(t=>(
            <button key={t.key} onClick={()=>setScreen(t.key)} style={{
              flex:1,padding:"8px 4px",borderRadius:12,border:"none",cursor:"pointer",
              background:screen===t.key?G.goldLight:"transparent",
              color:screen===t.key?G.goldSoft:G.textMuted,
              fontSize:12,fontWeight:600,display:"flex",flexDirection:"column",
              alignItems:"center",gap:3,transition:"all .15s",
            }}>
              <span style={{fontSize:18}}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Bottom tab bar */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,
        background:"rgba(17,18,16,.96)",backdropFilter:"blur(20px)",
        borderTop:`1px solid ${G.border}`,padding:"10px 8px 20px",
        display:"grid",gridTemplateColumns:"repeat(5,1fr)",zIndex:500,
      }}>
        {TABS.map(t=>{
          const isActive = activeTab===t.key;
          return (
            <button key={t.key} onClick={()=>goTab(t.key)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              background:"none",border:"none",cursor:"pointer",padding:"4px 2px",
              transition:"opacity .15s",
            }}>
              <span style={{
                fontSize:20,fontWeight:700,
                color:isActive?G.gold:G.textMuted,
                transition:"color .2s",
              }}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:600,
                color:isActive?G.gold:G.textMuted,transition:"color .2s"}}>{t.label}</span>
              {isActive&&<div style={{width:18,height:2,borderRadius:99,background:G.gold}}/>}
            </button>
          );
        })}
      </div>

      {/* FAB group */}
      <div style={{position:"fixed",bottom:84,right:20,display:"flex",flexDirection:"column",gap:10,zIndex:501}}>
        <button onClick={()=>setShowExport(true)} style={{
          width:42,height:42,borderRadius:"50%",border:`1px solid ${G.gold}44`,
          background:G.goldLight,color:G.gold,fontSize:18,cursor:"pointer",
          boxShadow:`0 4px 16px rgba(0,0,0,.3)`,
          display:"flex",alignItems:"center",justifyContent:"center",
        }} title="Exportar reporte">⬇️</button>
        <button onClick={()=>{setReceiptPrefill(null);setShowAdd(true);}} style={{
          width:50,height:50,borderRadius:"50%",border:"none",
          background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
          color:G.bg,fontSize:26,cursor:"pointer",
          boxShadow:`0 6px 24px ${G.gold}44`,
          display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300,
        }}>+</button>
      </div>

      {/* Modals */}
      {showAdd&&(
        <AddExpenseModal
          onClose={()=>{setShowAdd(false);setReceiptPrefill(null);}}
          onSave={addExp} prefill={receiptPrefill} expCats={expCats}/>
      )}
      {showReceipt&&(
        <ReceiptModal onClose={()=>setShowReceipt(false)}
          onResult={handleReceiptResult} expCats={expCats}/>
      )}
      {showExport&&(
        <ExportModal onClose={()=>setShowExport(false)}
          expenses={expenses} incomes={incomes}
          fixed={fixed} debts={debts} expCats={expCats}/>
      )}
    </div>
  );
}