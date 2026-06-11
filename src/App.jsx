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

// ── Cycle helpers ──────────────────────────────────────────────────────────
const MAIN_INC_CATS = ["Sueldo","Salario","Pago principal"];

const cycleLabel = (cycle) => {
  if (!cycle) return "Sin ciclo";
  const start = cycle.startDate;
  const end   = cycle.endDate;
  const fmt2  = (d) => {
    const dt = new Date(d+"T12:00:00");
    return `${dt.getDate()} ${months[dt.getMonth()].slice(0,3)}`;
  };
  return end ? `${fmt2(start)} → ${fmt2(end)}` : `${fmt2(start)} → hoy`;
};

const getActiveCycle = (cycles) =>
  cycles.find(c => !c.endDate) || null;

const getCycleForDate = (cycles, date) => {
  for (const c of [...cycles].sort((a,b)=>new Date(b.startDate)-new Date(a.startDate))) {
    if (date >= c.startDate && (!c.endDate || date <= c.endDate)) return c;
  }
  return null;
};

const expensesInCycle = (expenses, cycle) => {
  if (!cycle) return [];
  return expenses.filter(e =>
    e.date >= cycle.startDate && (!cycle.endDate || e.date <= cycle.endDate)
  );
};

const incomesInCycle = (incomes, cycle) => {
  if (!cycle) return [];
  return incomes.filter(i =>
    i.date >= cycle.startDate && (!cycle.endDate || i.date <= cycle.endDate)
  );
};

const daysBetween = (d1, d2) => {
  const a = new Date(d1+"T12:00:00"), b = new Date(d2+"T12:00:00");
  return Math.max(0, Math.round((b - a) / 86400000));
};

const todayStr = () => new Date().toISOString().split("T")[0];

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
  const [list,     setList]     = useState(cats.map(c=>({...c})));
  const [newName,  setNewName]  = useState("");
  const [newIcon,  setNewIcon]  = useState("📦");
  const [newColor, setNewColor] = useState("#C9A84C");
  const [tab,      setTab]      = useState("list"); // "list" | "new"
  const [saved,    setSaved]    = useState(false);
  const nameRef = useRef();

  const ICONS = [
    "🍽️","🚗","🛍️","💊","💪","🏠","🎮","📦","☕","🍕","🎵","✈️",
    "💇","🎓","🐾","🌿","⚡","🎁","🍺","🏋️","💅","🎯","🛒","📱",
    "💼","💻","🤝","🚀","✨","🏦","💰","📈","🎬","🎨","🐶","🏖️",
    "🚀","🔧","🏥","🎂","🍷","🏊","🚴","🎸","📚","🖥️","🛵","🚂",
  ];
  const COLORS = [
    "#C9A84C","#E8C97A","#7AA8C4","#9B84C4","#D96B5A",
    "#5AADA8","#C47A8A","#7CC47A","#C48A5A","#9A9585",
    "#E88C4C","#8CB4C4","#B4C47A","#C4A87A","#4CC4A8",
  ];
  const BG_FOR = (col) => {
    const r=parseInt(col.slice(1,3),16);
    const g=parseInt(col.slice(3,5),16);
    const b=parseInt(col.slice(5,7),16);
    return `rgba(${r},${g},${b},0.15)`;
  };

  const addCat = () => {
    const n = newName.trim();
    if (!n) { nameRef.current?.focus(); return; }
    if (list.find(c=>c.name.toLowerCase()===n.toLowerCase())) return;
    setList(p=>[...p, { name:n, icon:newIcon, color:newColor, bg:BG_FOR(newColor) }]);
    setNewName(""); setNewIcon("📦"); setNewColor("#C9A84C");
    setTab("list");
    setSaved(false);
  };

  const remove = (i) => { setList(p=>p.filter((_,idx)=>idx!==i)); setSaved(false); };

  const saveAll = () => {
    onSave([...list]);
    setSaved(true);
    setTimeout(()=>{ onClose(); }, 600);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1500,backdropFilter:"blur(8px)"}}>
      <div style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"20px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.6)",
        maxHeight:"92vh",overflowY:"auto",
        border:`1px solid ${G.border}`,borderBottom:"none",
        animation:"slideUp .28s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Handle + header */}
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 18px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:17,fontWeight:700,color:G.text}}>{title}</h2>
          <button onClick={onClose} style={{background:G.surface,border:"none",borderRadius:10,
            width:32,height:32,cursor:"pointer",fontSize:16,color:G.textMuted,
            display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {/* Tab switcher */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
          {[["list","📋 Ver categorías"],["new","➕ Nueva categoría"]].map(([k,lbl])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              padding:"10px",borderRadius:12,border:`1px solid ${tab===k?G.gold:G.border}`,
              background:tab===k?G.goldLight:G.surface,
              color:tab===k?G.goldSoft:G.textSoft,
              fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .15s",
            }}>{lbl}</button>
          ))}
        </div>

        {/* LIST TAB */}
        {tab==="list" && (
          <div>
            {list.length===0 && (
              <p style={{textAlign:"center",color:G.textMuted,fontSize:14,padding:"20px 0"}}>
                Sin categorías — agrega una nueva
              </p>
            )}
            {list.map((cat,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,
                padding:"12px 0",borderBottom:`1px solid ${G.border}`}}>
                <div style={{width:40,height:40,borderRadius:13,background:cat.bg||BG_FOR(cat.color),
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {cat.icon}
                </div>
                <span style={{flex:1,fontSize:14,fontWeight:600,color:G.text}}>{cat.name}</span>
                <div style={{width:14,height:14,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                <button onClick={()=>remove(i)} style={{
                  background:G.dangerDark,border:"none",borderRadius:8,
                  width:30,height:30,cursor:"pointer",fontSize:15,color:G.danger,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* NEW CATEGORY TAB */}
        {tab==="new" && (
          <div>
            {/* Name input */}
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:6}}>
              NOMBRE DE LA CATEGORÍA
            </p>
            <input
              ref={nameRef}
              value={newName}
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>e.key==="Enter" && addCat()}
              placeholder="Ej: Mascota, Gasolina, Farmacia…"
              style={{width:"100%",padding:"13px 14px",borderRadius:13,
                border:`1.5px solid ${newName?G.gold:G.border}`,
                background:G.surface,color:G.text,fontSize:15,outline:"none",
                marginBottom:16,boxSizing:"border-box",transition:"border-color .15s"}}
            />

            {/* Preview */}
            {newName.trim() && (
              <div style={{display:"flex",alignItems:"center",gap:12,
                background:G.goldLight,borderRadius:14,padding:"12px 16px",
                marginBottom:16,border:`1px solid ${G.gold}33`}}>
                <div style={{width:40,height:40,borderRadius:13,background:BG_FOR(newColor),
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                  {newIcon}
                </div>
                <div>
                  <p style={{fontSize:15,fontWeight:700,color:G.cream}}>{newName}</p>
                  <p style={{fontSize:11,color:G.creamDim}}>Vista previa</p>
                </div>
              </div>
            )}

            {/* Icon picker */}
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>
              ÍCONO
            </p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
              {ICONS.map(ico=>(
                <button key={ico} onClick={()=>setNewIcon(ico)} style={{
                  width:40,height:40,borderRadius:11,border:"none",cursor:"pointer",fontSize:20,
                  background:newIcon===ico?G.goldLight:G.surface,
                  outline:newIcon===ico?`2px solid ${G.gold}`:"2px solid transparent",
                  outlineOffset:1,transition:"all .1s",
                }}>{ico}</button>
              ))}
            </div>

            {/* Color picker */}
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>
              COLOR
            </p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
              {COLORS.map(col=>(
                <button key={col} onClick={()=>setNewColor(col)} style={{
                  width:32,height:32,borderRadius:"50%",border:"none",cursor:"pointer",
                  background:col,flexShrink:0,
                  outline:newColor===col?`2.5px solid ${G.cream}`:"2.5px solid transparent",
                  outlineOffset:2,transition:"outline .1s",
                }}/>
              ))}
            </div>

            <button
              onClick={addCat}
              disabled={!newName.trim()}
              style={{
                width:"100%",padding:14,borderRadius:14,border:"none",
                background:newName.trim()
                  ?`linear-gradient(135deg,${G.gold},${G.goldSoft})`
                  :G.surface,
                color:newName.trim()?G.bg:G.textMuted,
                fontSize:15,fontWeight:700,cursor:newName.trim()?"pointer":"default",
                transition:"all .15s",marginBottom:8,
              }}>
              ➕ Agregar categoría
            </button>
            <p style={{fontSize:12,color:G.textMuted,textAlign:"center"}}>
              Después guarda los cambios abajo
            </p>
          </div>
        )}

        {/* Save button — always visible */}
        <div style={{marginTop:20}}>
          <button onClick={saveAll} style={{
            width:"100%",padding:15,borderRadius:14,border:"none",
            background:saved
              ?G.tealDark
              :`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
            color:saved?G.teal:G.bg,
            fontSize:16,fontWeight:700,cursor:"pointer",
            border:saved?`1px solid ${G.teal}44`:"none",
            transition:"all .2s",
          }}>
            {saved ? "✅ Guardado" : `Guardar ${list.length} categoría${list.length!==1?"s":""}`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Expense Detail Modal ───────────────────────────────────────────────────
function ExpenseDetailModal({ expense, expCats, onClose, onEdit, onDelete }) {
  const cat = expCats.find(c=>c.name===expense.category)||{icon:"📦",color:G.gold,bg:G.goldLight};
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      zIndex:1000,backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:G.card,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",
        width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.5)",
        animation:"slideUp .28s cubic-bezier(.4,0,.2,1)",maxHeight:"92vh",overflowY:"auto",
        border:`1px solid ${G.border}`,borderBottom:"none",
      }}>
        <div style={{width:36,height:3,borderRadius:99,background:G.border,margin:"0 auto 20px"}}/>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{width:52,height:52,borderRadius:16,background:cat.bg,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
            {cat.icon}
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:18,fontWeight:700,color:G.text}}>{expense.note||expense.category}</p>
            <p style={{fontSize:13,color:G.textMuted}}>{expense.category} · {expense.date.slice(5).replace("-","/")}</p>
          </div>
          <p style={{fontSize:22,fontWeight:800,color:G.cream}}>-{fmt(expense.amount)}</p>
        </div>

        {/* Type badge */}
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <span style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:99,
            background:expense.type==="fijo"?G.blueDark:G.goldLight,
            color:expense.type==="fijo"?G.blue:G.gold,
            border:`1px solid ${expense.type==="fijo"?G.blue+"33":G.gold+"33"}`}}>
            {expense.type==="fijo"?"📌 Gasto fijo":"📊 Gasto variable"}
          </span>
        </div>

        {/* Photo */}
        {expense.photo ? (
          <div style={{marginBottom:20}}>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>BOLETA ADJUNTA</p>
            <img src={expense.photo} alt="boleta" style={{
              width:"100%",borderRadius:16,border:`1px solid ${G.border}`,
              maxHeight:320,objectFit:"contain",background:G.surface,
            }}/>
            <button onClick={()=>{
              const a=document.createElement("a");
              a.href=expense.photo;
              a.download=`boleta_${expense.date}_${expense.category}.jpg`;
              a.click();
            }} style={{
              width:"100%",marginTop:10,padding:"11px",borderRadius:12,
              border:`1px solid ${G.gold}44`,background:G.goldLight,
              color:G.goldSoft,fontSize:13,fontWeight:600,cursor:"pointer",
            }}>
              ⬇️ Descargar boleta
            </button>
          </div>
        ) : (
          <div style={{background:G.surface,borderRadius:14,padding:"16px",
            textAlign:"center",marginBottom:20,border:`1px solid ${G.border}`}}>
            <p style={{fontSize:13,color:G.textMuted}}>Sin boleta adjunta</p>
          </div>
        )}

        {/* Actions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onEdit} style={{padding:13,borderRadius:13,
            border:`1px solid ${G.border}`,background:G.surface,
            color:G.textSoft,fontSize:14,fontWeight:600,cursor:"pointer"}}>
            ✏️ Editar
          </button>
          <button onClick={()=>setConfirmDel(true)} style={{padding:13,borderRadius:13,
            border:"none",background:G.dangerDark,
            color:G.danger,fontSize:14,fontWeight:600,cursor:"pointer"}}>
            🗑️ Eliminar
          </button>
        </div>

        {confirmDel && <Confirm msg="¿Eliminar este gasto?"
          onOk={()=>{onDelete(expense.id);onClose();}}
          onCancel={()=>setConfirmDel(false)}/>}
      </div>
    </div>
  );
}


// ── New Cycle Prompt Modal ─────────────────────────────────────────────────
function NewCyclePrompt({ income, onYes, onNo }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:2000,backdropFilter:"blur(8px)",padding:"0 24px"}}>
      <div style={{background:G.card,borderRadius:24,padding:"28px 24px",
        width:"100%",maxWidth:360,boxShadow:"0 16px 48px rgba(0,0,0,.5)",
        border:`1px solid ${G.gold}44`,animation:"pop .2s ease"}}>

        <div style={{width:52,height:52,borderRadius:18,background:G.goldLight,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:26,margin:"0 auto 16px",border:`1px solid ${G.gold}44`}}>🔄</div>

        <h2 style={{fontSize:17,fontWeight:700,color:G.text,textAlign:"center",marginBottom:8}}>
          ¿Iniciar nuevo ciclo?
        </h2>
        <p style={{fontSize:13,color:G.textMuted,textAlign:"center",lineHeight:1.6,marginBottom:8}}>
          Registraste un ingreso de
        </p>
        <p style={{fontSize:24,fontWeight:800,color:G.gold,textAlign:"center",marginBottom:8}}>
          {fmt(income.amount)}
        </p>
        <p style={{fontSize:13,color:G.textMuted,textAlign:"center",lineHeight:1.6,marginBottom:24}}>
          ¿Deseas iniciar un nuevo ciclo financiero desde el <strong style={{color:G.cream}}>{income.date.slice(8)} de {months[parseInt(income.date.slice(5,7))-1]}</strong>?
        </p>
        <p style={{fontSize:12,color:G.textMuted,textAlign:"center",marginBottom:20,
          background:G.surface,borderRadius:10,padding:"8px 12px",lineHeight:1.5}}>
          El ciclo anterior se cerrará y todos los movimientos futuros quedarán asociados a este nuevo ciclo.
        </p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onNo} style={{padding:13,borderRadius:13,
            border:`1px solid ${G.border}`,background:G.surface,
            color:G.textSoft,fontSize:14,fontWeight:600,cursor:"pointer"}}>
            No, gracias
          </button>
          <button onClick={onYes} style={{padding:13,borderRadius:13,border:"none",
            background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
            color:G.bg,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Sí, nuevo ciclo
          </button>
        </div>
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
  const [photo,    setPhoto]    = useState(editItem?.photo    || null);
  const photoRef = useRef();

  const handlePhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!amount) return;
    onSave({...editItem, amount:parseFloat(amount), category:cat, note, date, type:expType, photo, id:editItem?.id||Date.now()});
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

        {/* Photo upload */}
        <p style={{fontSize:11,color:G.textMuted,fontWeight:700,letterSpacing:1,marginBottom:8}}>BOLETA / COMPROBANTE (opcional)</p>
        {photo ? (
          <div style={{position:"relative",marginBottom:20}}>
            <img src={photo} alt="boleta" style={{
              width:"100%",maxHeight:200,objectFit:"cover",
              borderRadius:14,border:`1px solid ${G.border}`,
            }}/>
            <button onClick={()=>setPhoto(null)} style={{
              position:"absolute",top:8,right:8,
              width:28,height:28,borderRadius:"50%",
              background:"rgba(0,0,0,.6)",border:"none",
              color:"white",fontSize:16,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>×</button>
          </div>
        ) : (
          <div onClick={()=>photoRef.current.click()} style={{
            border:`1.5px dashed ${G.gold}44`,borderRadius:14,
            padding:"16px",textAlign:"center",cursor:"pointer",
            background:G.goldLight,marginBottom:20,
            display:"flex",alignItems:"center",gap:12,justifyContent:"center",
          }}>
            <span style={{fontSize:22}}>📷</span>
            <span style={{fontSize:13,color:G.creamDim,fontWeight:600}}>Adjuntar foto de boleta</span>
          </div>
        )}
        <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>

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

// ═══════════════════════════════════════════════════════════════════════════
// ── SCREENS ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function HomeScreen({ expenses, incomes, fixedExpenses, debts, cycles, notifs, onDismiss,
  onAddExpense, expCats, onGoScreen }) {
  const now   = new Date();
  const today = todayStr();
  const cycle = getActiveCycle(cycles);

  const cExp  = cycle ? expensesInCycle(expenses, cycle) : [];
  const cInc  = cycle ? incomesInCycle(incomes, cycle)   : [];
  const totalInc  = cInc.reduce((s,i)=>s+i.amount, 0);
  const totalExp  = cExp.reduce((s,e)=>s+e.amount, 0);
  const totalFixed= fixedExpenses.filter(f=>f.active).reduce((s,f)=>s+f.amount,0);
  const available = totalInc - totalExp;
  const savings   = totalInc - totalExp - totalFixed;
  const pct = totalInc ? Math.round((totalExp/totalInc)*100) : 0;

  // Days info
  const daysIn  = cycle ? daysBetween(cycle.startDate, today) + 1 : 0;
  const avgDaily= daysIn > 0 ? Math.round(totalExp / daysIn) : 0;

  const byCat = {};
  cExp.forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
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
              {cycle ? cycleLabel(cycle) : months[now.getMonth()]+" "+now.getFullYear()}
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
        <div style={{position:"absolute",top:-24,right:-24,width:100,height:100,borderRadius:"50%",background:`${G.gold}09`}}/>
        <p style={{fontSize:12,color:G.creamDim,fontWeight:600,letterSpacing:"0.8px",marginBottom:4}}>DISPONIBLE</p>
        <p style={{fontSize:40,fontWeight:800,color:available>=0?G.cream:G.danger,letterSpacing:"-1px",marginBottom:4}}>
          {totalInc>0 ? fmt(available) : "—"}
        </p>
        {totalInc>0 && (
          <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,.1)",overflow:"hidden",marginBottom:14}}>
            <div style={{height:"100%",borderRadius:99,
              background:`linear-gradient(90deg,${G.gold},${G.goldSoft})`,
              width:`${Math.min(pct,100)}%`,transition:"width 1.2s"}}/>
          </div>
        )}
        <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
          <div><p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.6px"}}>INGRESOS</p>
            <p style={{fontSize:16,fontWeight:700,color:G.cream}}>{fmt(totalInc)}</p></div>
          <div><p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.6px"}}>GASTADO</p>
            <p style={{fontSize:16,fontWeight:700,color:G.cream}}>{fmt(totalExp)}</p></div>
          {totalInc>0&&<div><p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.6px"}}>USADO</p>
            <p style={{fontSize:16,fontWeight:700,color:pct>80?G.danger:G.gold}}>{pct}%</p></div>}
        </div>
        {!cycle && <p style={{fontSize:13,color:G.creamDim,marginTop:8}}>
          Registra un ingreso para iniciar tu primer ciclo 👆
        </p>}
      </div>

      {/* Cycle info card */}
      {cycle && (
        <Card style={{marginBottom:14,background:G.surface,border:`1px solid ${G.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{fontSize:12,color:G.gold,fontWeight:700,letterSpacing:"0.8px"}}>CICLO ACTUAL</p>
            <span style={{fontSize:11,color:G.textMuted,fontWeight:600,
              background:G.goldLight,padding:"2px 8px",borderRadius:99,border:`1px solid ${G.gold}33`}}>
              Día {daysIn}
            </span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
            <div style={{background:G.card,borderRadius:13,padding:"10px 12px",textAlign:"center"}}>
              <p style={{fontSize:10,color:G.textMuted,fontWeight:600,marginBottom:3}}>AHORRO EST.</p>
              <p style={{fontSize:14,fontWeight:700,color:savings>=0?G.gold:G.danger}}>{fmt(Math.max(savings,0))}</p>
            </div>
            <div style={{background:G.card,borderRadius:13,padding:"10px 12px",textAlign:"center"}}>
              <p style={{fontSize:10,color:G.textMuted,fontWeight:600,marginBottom:3}}>PROM/DÍA</p>
              <p style={{fontSize:14,fontWeight:700,color:G.cream}}>{fmt(avgDaily)}</p>
            </div>
            <div style={{background:G.card,borderRadius:13,padding:"10px 12px",textAlign:"center"}}>
              <p style={{fontSize:10,color:G.textMuted,fontWeight:600,marginBottom:3}}>GASTOS FIJOS</p>
              <p style={{fontSize:14,fontWeight:700,color:G.cream}}>{fmt(totalFixed)}</p>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontSize:12,color:G.textMuted}}>Inicio: <span style={{color:G.cream,fontWeight:600}}>{cycle.startDate.slice(8)} de {months[parseInt(cycle.startDate.slice(5,7))-1]}</span></p>
            <button onClick={()=>onGoScreen("cycles")} style={{background:"none",border:"none",
              cursor:"pointer",fontSize:12,color:G.gold,fontWeight:600}}>Ver historial →</button>
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <button onClick={onAddExpense} style={{
          background:G.goldLight,border:`1px solid ${G.gold}44`,borderRadius:18,
          padding:"18px 16px",color:G.goldSoft,fontSize:14,fontWeight:700,
          cursor:"pointer",textAlign:"left",
        }}>
          <div style={{fontSize:26,marginBottom:6}}>➕</div>Agregar gasto
        </button>
        <button onClick={()=>onGoScreen("expenses")} style={{
          background:G.surface,border:`1px solid ${G.border}`,borderRadius:18,
          padding:"18px 16px",color:G.creamDim,fontSize:14,fontWeight:700,
          cursor:"pointer",textAlign:"left",
        }}>
          <div style={{fontSize:26,marginBottom:6}}>📋</div>Ver gastos
        </button>
      </div>

      {/* Top categories */}
      {topCats.length>0 && (
        <Card style={{marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:16}}>Top categorías del ciclo</p>
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

      {!cycle && expenses.length===0 && (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <div style={{fontSize:56,marginBottom:14}}>🌙</div>
          <p style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:8}}>Bienvenido a Finza</p>
          <p style={{fontSize:14,color:G.textMuted,lineHeight:1.6}}>
            Registra tu primer ingreso en la sección<br/>
            <strong style={{color:G.gold}}>Ingresos</strong> para iniciar tu ciclo financiero.
          </p>
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
  const [detailItem, setDetailItem] = useState(null);

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
            <Card key={e.id} style={{marginBottom:10,padding:16,cursor:"pointer"}}
              onClick={()=>setDetailItem(e)}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:14,background:cat.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {cat.icon}
                  {e.photo && <span style={{position:"absolute",bottom:0,right:0,fontSize:10}}>📎</span>}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:G.text}}>{e.note||e.category}</p>
                  <div style={{display:"flex",gap:7,alignItems:"center",marginTop:2}}>
                    <p style={{fontSize:12,color:G.textMuted}}>{e.category} · {e.date.slice(5).replace("-","/")}</p>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99,
                      background:e.type==="fijo"?G.blueDark:G.goldLight,
                      color:e.type==="fijo"?G.blue:G.gold}}>
                      {e.type==="fijo"?"fijo":"variable"}
                    </span>
                    {e.photo&&<span style={{fontSize:10,color:G.gold}}>📎</span>}
                  </div>
                </div>
                <p style={{fontSize:15,fontWeight:700,color:G.text}}>-{fmt(e.amount)}</p>
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
      {detailItem&&<ExpenseDetailModal expense={detailItem} expCats={expCats}
        onClose={()=>setDetailItem(null)}
        onEdit={()=>{setEditItem(detailItem);setDetailItem(null);setShowAdd(true);}}
        onDelete={(id)=>{onDelete(id);setDetailItem(null);}}/>}
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
          <p style={{fontSize:42,marginBottom:12}}>💳</p>
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


// ── Donut Chart ────────────────────────────────────────────────────────────
function DonutChart({ data, total }) {
  const size = 200;
  const cx = size / 2, cy = size / 2;
  const outerR = 80, innerR = 52;
  let cumAngle = -Math.PI / 2;

  const slices = data.map(({ value, color }) => {
    const angle = (value / total) * 2 * Math.PI;
    const x1 = cx + outerR * Math.cos(cumAngle);
    const y1 = cy + outerR * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + outerR * Math.cos(cumAngle);
    const y2 = cy + outerR * Math.sin(cumAngle);
    const ix1 = cx + innerR * Math.cos(cumAngle);
    const iy1 = cy + innerR * Math.sin(cumAngle);
    const prevAngle = cumAngle - angle;
    const ix2 = cx + innerR * Math.cos(prevAngle);
    const iy2 = cy + innerR * Math.sin(prevAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { color, d: `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z` };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke={G.card} strokeWidth={2}/>
      ))}
      <circle cx={cx} cy={cy} r={innerR - 2} fill={G.card}/>
      <text x={cx} y={cy - 8} textAnchor="middle" fill={G.cream} fontSize="13" fontWeight="700" fontFamily="DM Sans, sans-serif">Total</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={G.gold} fontSize="13" fontWeight="800" fontFamily="DM Sans, sans-serif">{fmt(total).replace("$","$")}</text>
    </svg>
  );
}

function StatsScreen({ expenses, incomes, expCats, cycles, fixed }) {
  const today  = todayStr();
  const cycle  = getActiveCycle(cycles);
  const prevCycle = cycles.filter(c=>c.endDate).sort((a,b)=>new Date(b.startDate)-new Date(a.startDate))[0]||null;

  const cExp   = cycle ? expensesInCycle(expenses, cycle) : [];
  const cInc   = cycle ? incomesInCycle(incomes, cycle)   : [];
  const pExp   = prevCycle ? expensesInCycle(expenses, prevCycle) : [];
  const pInc   = prevCycle ? incomesInCycle(incomes, prevCycle)   : [];

  const totalExp  = cExp.reduce((s,e)=>s+e.amount,0);
  const totalInc  = cInc.reduce((s,i)=>s+i.amount,0);
  const totalFixed= fixed.filter(f=>f.active).reduce((s,f)=>s+f.amount,0);
  const savings   = Math.max(totalInc - totalExp - totalFixed, 0);
  const available = totalInc - totalExp;

  const prevExp   = pExp.reduce((s,e)=>s+e.amount,0);
  const prevInc   = pInc.reduce((s,i)=>s+i.amount,0);

  const byCat={};cExp.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount;});
  const sCats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const topCat=sCats[0];

  const daysIn = cycle ? daysBetween(cycle.startDate, today)+1 : 0;
  const pct = totalInc ? Math.round((totalExp/totalInc)*100) : 0;

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{padding:"20px 0 14px"}}>
        <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Estadísticas</h1>
        <p style={{fontSize:13,color:G.textMuted}}>{cycle?cycleLabel(cycle):"Sin ciclo activo"}</p>
      </div>

      {!cycle && (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <p style={{fontSize:42,marginBottom:12}}>📊</p>
          <p style={{fontSize:15,color:G.textMuted}}>Sin ciclo activo aún</p>
        </div>
      )}

      {cycle && (<>
        {/* Summary row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <Card style={{background:G.goldLight,border:`1px solid ${G.gold}33`}}>
            <p style={{fontSize:11,color:G.creamDim,fontWeight:600,marginBottom:4}}>INGRESOS</p>
            <p style={{fontSize:22,fontWeight:800,color:G.gold}}>{fmt(totalInc)}</p>
          </Card>
          <Card style={{background:available>=0?G.surface:G.dangerDark,border:`1px solid ${available>=0?G.border:G.danger+"33"}`}}>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:600,marginBottom:4}}>DISPONIBLE</p>
            <p style={{fontSize:22,fontWeight:800,color:available>=0?G.cream:G.danger}}>{fmt(available)}</p>
          </Card>
          <Card style={{background:G.surface,border:`1px solid ${G.border}`}}>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:600,marginBottom:4}}>GASTADO</p>
            <p style={{fontSize:22,fontWeight:800,color:G.cream}}>{fmt(totalExp)}</p>
            <p style={{fontSize:11,color:G.textMuted,marginTop:2}}>{pct}% del ingreso</p>
          </Card>
          <Card style={{background:savings>0?G.tealDark:G.surface,border:`1px solid ${savings>0?G.teal+"33":G.border}`}}>
            <p style={{fontSize:11,color:G.textMuted,fontWeight:600,marginBottom:4}}>AHORRO EST.</p>
            <p style={{fontSize:22,fontWeight:800,color:savings>0?G.teal:G.textMuted}}>{fmt(savings)}</p>
          </Card>
        </div>

        {/* Progress bar */}
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <p style={{fontSize:13,fontWeight:700,color:G.text}}>Dinero utilizado</p>
            <p style={{fontSize:13,fontWeight:700,color:pct>80?G.danger:G.gold}}>{pct}%</p>
          </div>
          <AnimBar pct={pct} color={pct>80?G.danger:G.gold} h={10}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
            <p style={{fontSize:11,color:G.textMuted}}>Día {daysIn} del ciclo</p>
            <p style={{fontSize:11,color:G.textMuted}}>Prom. {fmt(daysIn>0?Math.round(totalExp/daysIn):0)}/día</p>
          </div>
        </Card>

        {/* Donut */}
        {sCats.length>0 && totalExp>0 && (
          <Card style={{marginBottom:14}}>
            <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:16}}>Distribución por categoría</p>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <DonutChart
                data={sCats.slice(0,6).map(([name,amt])=>({
                  value:amt,
                  color:expCats.find(c=>c.name===name)?.color||G.gold,
                }))}
                total={totalExp}
              />
              <div style={{flex:1}}>
                {sCats.slice(0,5).map(([catName,amt])=>{
                  const cat=expCats.find(c=>c.name===catName)||{icon:"📦",color:G.gold};
                  return (
                    <div key={catName} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:10,height:10,borderRadius:3,background:cat.color,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <p style={{fontSize:12,fontWeight:600,color:G.text}}>{cat.icon} {catName}</p>
                        <p style={{fontSize:11,color:G.textMuted}}>{totalExp?Math.round((amt/totalExp)*100):0}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Comparison with previous cycle */}
        {prevCycle && (
          <Card style={{marginBottom:14}}>
            <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>
              Comparación con ciclo anterior
            </p>
            <p style={{fontSize:11,color:G.textMuted,marginBottom:12}}>{cycleLabel(prevCycle)}</p>
            {[
              ["Ingresos",  totalInc, prevInc, G.gold],
              ["Gastos",    totalExp, prevExp, G.danger],
            ].map(([label,cur,prev,col])=>{
              const diff = cur - prev;
              return (
                <div key={label} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:600,color:G.text}}>{label}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:diff>=0?G.teal:G.danger,fontWeight:600}}>
                        {diff>=0?"+":""}{fmt(diff)}
                      </span>
                      <span style={{fontSize:13,fontWeight:700,color:G.cream}}>{fmt(cur)}</span>
                    </div>
                  </div>
                  <AnimBar pct={prev>0?(cur/prev)*100:0} color={col} h={6}/>
                </div>
              );
            })}
          </Card>
        )}

        {/* Top categories bar */}
        {sCats.length>0 && (
          <Card>
            <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>Por categoría</p>
            {sCats.map(([catName,amt])=>{
              const cat=expCats.find(c=>c.name===catName)||{icon:"📦",color:G.gold};
              return (
                <div key={catName} style={{marginBottom:13}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:600,color:G.text}}>{cat.icon} {catName}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:G.textMuted}}>{totalExp?Math.round((amt/totalExp)*100):0}%</span>
                      <span style={{fontSize:13,fontWeight:700,color:G.text}}>{fmt(amt)}</span>
                    </div>
                  </div>
                  <AnimBar pct={totalExp?(amt/totalExp)*100:0} color={cat.color}/>
                </div>
              );
            })}
          </Card>
        )}
      </>)}
    </div>
  );
}
function CyclesScreen({ cycles, expenses, incomes, fixed, debts, expCats, onExport }) {
  const [selId, setSelId] = useState(null);
  const sorted = [...cycles].sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
  const selCycle = sorted.find(c=>c.id===selId) || sorted[0] || null;
  const activeCycle = getActiveCycle(cycles);

  const cExp = selCycle ? expensesInCycle(expenses, selCycle) : [];
  const cInc = selCycle ? incomesInCycle(incomes,  selCycle) : [];
  const totalExp = cExp.reduce((s,e)=>s+e.amount,0);
  const totalInc = cInc.reduce((s,i)=>s+i.amount,0);
  const totalFixed = fixed.filter(f=>f.active).reduce((s,f)=>s+f.amount,0);
  const balance  = totalInc - totalExp;
  const savings  = Math.max(totalInc - totalExp - totalFixed, 0);

  const byCat = {};
  cExp.forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
  const catList = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxCat  = catList[0]?.[1]||1;

  const daysLen = selCycle
    ? daysBetween(selCycle.startDate, selCycle.endDate||todayStr())+1
    : 0;

  return (
    <div style={{padding:"0 16px 100px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0 14px"}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:G.text}}>Ciclos</h1>
          <p style={{fontSize:13,color:G.textMuted}}>Historial financiero</p>
        </div>
        {selCycle && (
          <button onClick={()=>onExport(selCycle)} style={{
            background:G.goldLight,border:`1px solid ${G.gold}44`,
            borderRadius:12,padding:"9px 14px",color:G.goldSoft,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            ⬇️ Exportar
          </button>
        )}
      </div>

      {cycles.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <p style={{fontSize:42,marginBottom:12}}>🔄</p>
          <p style={{fontSize:15,color:G.textMuted}}>Aún no tienes ciclos registrados</p>
        </div>
      ) : (<>
        {/* Cycle selector */}
        <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:12,marginBottom:16,scrollbarWidth:"none"}}>
          {sorted.map(c=>(
            <button key={c.id} onClick={()=>setSelId(c.id)} style={{
              padding:"7px 14px",borderRadius:99,
              border:`1px solid ${(selCycle?.id===c.id)?G.gold:G.border}`,
              background:(selCycle?.id===c.id)?G.goldLight:G.surface,
              color:(selCycle?.id===c.id)?G.goldSoft:G.textMuted,
              fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
            }}>
              {c.endDate?"":"🟢 "}{cycleLabel(c)}
            </button>
          ))}
        </div>

        {selCycle && (<>
          {/* Cycle header */}
          <div style={{background:"linear-gradient(135deg,#1C1A0E,#26210A)",borderRadius:20,
            padding:"22px",marginBottom:14,border:`1px solid ${G.gold}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <p style={{fontSize:11,color:G.creamDim,fontWeight:600,letterSpacing:"0.8px",marginBottom:4}}>
                  {!selCycle.endDate?"CICLO ACTIVO":"CICLO CERRADO"}
                </p>
                <p style={{fontSize:13,color:G.cream,fontWeight:600}}>{cycleLabel(selCycle)}</p>
                <p style={{fontSize:11,color:G.textMuted,marginTop:2}}>{daysLen} días</p>
              </div>
              <p style={{fontSize:30,fontWeight:800,color:balance>=0?G.gold:G.danger}}>{fmt(balance)}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[
                ["Ingresos",  fmt(totalInc), G.gold],
                ["Gastos",    fmt(totalExp), G.danger],
                ["Ahorro",    fmt(savings),  G.teal],
              ].map(([label,val,col])=>(
                <div key={label} style={{background:"rgba(255,255,255,.04)",borderRadius:11,padding:"10px 8px",textAlign:"center"}}>
                  <p style={{fontSize:10,color:G.creamDim,fontWeight:600,marginBottom:3}}>{label.toUpperCase()}</p>
                  <p style={{fontSize:14,fontWeight:700,color:col}}>{val}</p>
                </div>
              ))}
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

          {/* Incomes */}
          {cInc.length>0 && (
            <Card style={{marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>Ingresos</p>
              {[...cInc].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((inc,i)=>(
                <div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  paddingBottom:i<cInc.length-1?11:0,marginBottom:i<cInc.length-1?11:0,
                  borderBottom:i<cInc.length-1?`1px solid ${G.border}`:"none"}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:600,color:G.text}}>{inc.description||inc.category}</p>
                    <p style={{fontSize:11,color:G.textMuted}}>{inc.category} · {inc.date.slice(5).replace("-","/")}</p>
                  </div>
                  <p style={{fontSize:14,fontWeight:700,color:G.gold}}>+{fmt(inc.amount)}</p>
                </div>
              ))}
            </Card>
          )}

          {/* Expenses */}
          {cExp.length>0 && (
            <Card style={{marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:14}}>Gastos</p>
              {[...cExp].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((e,i)=>{
                const cat=expCats.find(c=>c.name===e.category)||{icon:"📦"};
                return (
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,
                    paddingBottom:i<cExp.length-1?11:0,marginBottom:i<cExp.length-1?11:0,
                    borderBottom:i<cExp.length-1?`1px solid ${G.border}`:"none"}}>
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

          {cExp.length===0 && cInc.length===0 && (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <p style={{fontSize:42,marginBottom:12}}>📂</p>
              <p style={{fontSize:15,color:G.textMuted}}>Sin movimientos en este ciclo</p>
            </div>
          )}
        </>)}
      </>)}
    </div>
  );
}

function ExportModal({ onClose, expenses, incomes, fixed, debts, expCats, targetCycle }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const mExp = targetCycle ? expensesInCycle(expenses, targetCycle) : expenses;
  const mInc = targetCycle ? incomesInCycle(incomes,  targetCycle) : incomes;
  const totalExp = mExp.reduce((s,e)=>s+e.amount,0);
  const totalInc = mInc.reduce((s,i)=>s+i.amount,0);
  const activeFixed = fixed.filter(f=>f.active);
  const totalFixed  = activeFixed.reduce((s,f)=>s+f.amount,0);
  const activeDebts = debts.filter(d=>d.paid<d.total);
  const exportLabel = targetCycle ? cycleLabel(targetCycle) : "Todos";
  const fileName2   = targetCycle
    ? `Finza_Ciclo_${targetCycle.startDate}.xlsx`
    : `Finza_Reporte_Completo.xlsx`;

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
    const label = exportLabel;

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

    const fileName = fileName2;
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

        {/* Cycle info */}
        <div style={{background:G.goldLight,borderRadius:13,padding:"12px 14px",
          marginBottom:20,border:`1px solid ${G.gold}33`}}>
          <p style={{fontSize:11,color:G.textMuted,fontWeight:600,marginBottom:4}}>CICLO A EXPORTAR</p>
          <p style={{fontSize:15,fontWeight:700,color:G.cream}}>{exportLabel}</p>
        </div>

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
              {fileName2}
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
  { key:"fixed",    icon:"$",  label:"Fijos"     },
  { key:"more",     icon:"⋯",  label:"Más"       },
];
const MORE_TABS = [
  { key:"debts",    icon:"↩",  label:"Deudas"        },
  { key:"stats",    icon:"📊", label:"Estadísticas"  },
  { key:"cycles",   icon:"🔄", label:"Ciclos"        },
  { key:"calendar", icon:"📅", label:"Calendario"    },
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
  const [expenses, setExpenses] = useLocalStorage("finza_expenses", []);
  const [incomes,  setIncomes]  = useLocalStorage("finza_incomes",  []);
  const [fixed,    setFixed]    = useLocalStorage("finza_fixed",    []);
  const [debts,    setDebts]    = useLocalStorage("finza_debts",    []);
  const [expCats,  setExpCats]  = useLocalStorage("finza_expCats",  DEFAULT_EXP_CATS);
  const [incCats,  setIncCats]  = useLocalStorage("finza_incCats",  DEFAULT_INC_CATS);
  const [cycles,   setCycles]   = useLocalStorage("finza_cycles",   []);

  const [screen,      setScreen]      = useState("home");
  const [showAdd,     setShowAdd]     = useState(false);
  const [showExport,  setShowExport]  = useState(false);
  const [exportCycle, setExportCycle] = useState(null);
  const [cyclePrompt, setCyclePrompt] = useState(null); // pending income
  const [notifs,      setNotifs]      = useState([]);

  // Auto-notifications
  useEffect(()=>{
    const n=[], today=todayStr();
    debts.filter(d=>d.paid<d.total&&d.dueDate).forEach(d=>{
      const days=Math.ceil((new Date(d.dueDate)-new Date())/86400000);
      if(days>=0&&days<=5) n.push({icon:"⚠️",message:`${d.name} vence en ${days===0?"hoy":days+"d"} — ${fmt(d.total-d.paid)} pendientes.`,type:"warning"});
    });
    const active = getActiveCycle(cycles);
    if(!active && incomes.length===0)
      n.push({icon:"💡",message:"Registra tu primer ingreso para iniciar tu ciclo financiero.",type:"info"});
    setNotifs(n);
  },[debts,incomes,cycles]);

  // ── Mutations ──────────────────────────────────────────────────────
  const addExp    = e  => setExpenses(p=>[e,...p]);
  const editExp   = e  => setExpenses(p=>p.map(x=>x.id===e.id?e:x));
  const delExp    = id => setExpenses(p=>p.filter(x=>x.id!==id));

  const addInc = (inc) => {
    setIncomes(p=>[inc,...p]);
    // Ask to start cycle if it's a main income category
    if (MAIN_INC_CATS.includes(inc.category)) {
      setCyclePrompt(inc);
    }
  };
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

  // Start new cycle from income
  const startCycle = (income) => {
    setCycles(prev => {
      const updated = prev.map(c =>
        !c.endDate
          ? { ...c, endDate: getPrevDay(income.date) }
          : c
      );
      const newCycle = {
        id:        Date.now(),
        startDate: income.date,
        endDate:   null,
        incomeId:  income.id,
        label:     income.description || income.category,
      };
      return [...updated, newCycle];
    });
    setCyclePrompt(null);
  };

  const getPrevDay = (dateStr) => {
    const d = new Date(dateStr+"T12:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  // ── Navigation ──────────────────────────────────────────────────────
  const moreScreens = ["debts","stats","cycles","calendar"];
  const activeTab   = moreScreens.includes(screen) ? "more" : screen;

  const goTab = (key) => {
    if (key === "more") {
      if (moreScreens.includes(screen)) {
        const idx = moreScreens.indexOf(screen);
        setScreen(moreScreens[(idx+1)%moreScreens.length]);
      } else {
        setScreen("debts");
      }
    } else {
      setScreen(key);
    }
  };

  const handleExportCycle = (cycle) => {
    setExportCycle(cycle);
    setShowExport(true);
  };

  return (
    <div style={{minHeight:"100vh",background:"#111210",
      fontFamily:"'DM Sans',system-ui,sans-serif",maxWidth:480,margin:"0 auto",position:"relative",
      paddingTop:"env(safe-area-inset-top)"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{display:none;}
        ::selection{background:#C9A84C33;color:#E8C97A;}
        input,select{font-family:inherit;}
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
        html,body{background:#111210;padding-top:env(safe-area-inset-top);}
        @keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
      `}</style>

      {/* Screen content */}
      <div style={{paddingTop: moreScreens.includes(screen) ? 68 : 4}}>
        {screen==="home"     && <HomeScreen expenses={expenses} incomes={incomes}
          fixedExpenses={fixed} debts={debts} cycles={cycles} notifs={notifs}
          onDismiss={i=>setNotifs(p=>p.filter((_,idx)=>idx!==i))}
          onAddExpense={()=>setShowAdd(true)}
          expCats={expCats} onGoScreen={setScreen}/>}
        {screen==="incomes"  && <IncomesScreen incomes={incomes} incCats={incCats}
          onAdd={addInc} onEdit={editInc} onDelete={delInc}
          onManageCats={setIncCats}/>}
        {screen==="expenses" && <ExpensesScreen expenses={expenses} expCats={expCats}
          onAdd={addExp} onEdit={editExp} onDelete={delExp}
          onManageCats={setExpCats}/>}
        {screen==="fixed"    && <FixedScreen fixedExpenses={fixed}
          onAdd={addFix} onEdit={editFix} onDelete={delFix} onToggle={togFix}/>}
        {screen==="debts"    && <DebtsScreen debts={debts}
          onAdd={addDebt} onEdit={editDebt} onDelete={delDebt} onPayment={payDebt}/>}
        {screen==="stats"    && <StatsScreen expenses={expenses} incomes={incomes}
          expCats={expCats} cycles={cycles} fixed={fixed}/>}
        {screen==="cycles"   && <CyclesScreen cycles={cycles} expenses={expenses}
          incomes={incomes} fixed={fixed} debts={debts} expCats={expCats}
          onExport={handleExportCycle}/>}
        {screen==="calendar" && <CalendarScreen expenses={expenses} expCats={expCats}/>}
      </div>

      {/* More sub-nav */}
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
            }}>
              <span style={{fontSize:20,fontWeight:700,color:isActive?G.gold:G.textMuted,transition:"color .2s"}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:600,color:isActive?G.gold:G.textMuted,transition:"color .2s"}}>{t.label}</span>
              {isActive&&<div style={{width:18,height:2,borderRadius:99,background:G.gold}}/>}
            </button>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={()=>setShowAdd(true)} style={{
        position:"fixed",bottom:84,right:20,
        width:50,height:50,borderRadius:"50%",border:"none",
        background:`linear-gradient(135deg,${G.gold},${G.goldSoft})`,
        color:G.bg,fontSize:26,cursor:"pointer",
        boxShadow:`0 6px 24px ${G.gold}44`,
        display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300,
        zIndex:501,
      }}>+</button>

      {/* Modals */}
      {showAdd&&(
        <AddExpenseModal
          onClose={()=>setShowAdd(false)}
          onSave={addExp} expCats={expCats}/>
      )}
      {showExport&&(
        <ExportModal onClose={()=>{setShowExport(false);setExportCycle(null);}}
          expenses={expenses} incomes={incomes}
          fixed={fixed} debts={debts} expCats={expCats}
          targetCycle={exportCycle}/>
      )}
      {cyclePrompt&&(
        <NewCyclePrompt
          income={cyclePrompt}
          onYes={()=>startCycle(cyclePrompt)}
          onNo={()=>setCyclePrompt(null)}/>
      )}
    </div>
  );
}