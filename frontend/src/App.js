import React,{useState,useCallback,useEffect,useRef} from"react";
import{evaluateFiles,evaluateText,downloadReport,getResults,getHealth}from"./utils/api";

// ─── constants ────────────────────────────────────────────────────────────────
const DEV = {
  name:"Piyush Nimbalkar",
  role:"Machine Learning Developer",
  institute:"VIT Mumbai",
  github:"piyush1519",
  linkedin:"piyush1519",
  ghUrl:"https://github.com/piyush1519",
  liUrl:"https://linkedin.com/in/piyush1519",
};

const STEPS = [
  {n:"01",icon:"📄",t:"Upload Answer",d:"Student's handwritten answer (scan/PDF) and the model answer are uploaded to the system."},
  {n:"02",icon:"🔍",t:"OCR Extraction",d:"Advanced multi-strategy OCR with adaptive preprocessing extracts text from handwritten scans."},
  {n:"03",icon:"🧠",t:"AI Teacher Analysis",d:"An integrated AI teacher engine evaluates the answer like a real examiner — accuracy, depth, concepts."},
  {n:"04",icon:"⚡",t:"Fuzzy Logic Grading",d:"8-input advanced Mamdani fuzzy inference system combines all signals to compute precise marks."},
  {n:"05",icon:"📊",t:"Report Generation",d:"A comprehensive PDF report with scores, feedback, and detailed breakdown is auto-downloaded."},
];

const FEATURES = [
  {icon:"🖊",t:"Handwriting OCR",d:"Multi-strategy preprocessing with adaptive thresholding optimised for cursive and printed text."},
  {icon:"🎓",t:"AI Teacher Evaluation",d:"Deep semantic understanding — the system judges answers the way an expert teacher would."},
  {icon:"🔀",t:"Advanced Fuzzy Logic",d:"12-rule Mamdani FIS with 8 inputs, triangular & trapezoidal MFs, centroid defuzzification."},
  {icon:"📑",t:"PDF Report",d:"Auto-downloaded professional report with full metrics, feedback, correct/incorrect point analysis."},
  {icon:"⚖",t:"5 or 10 Mark Mode",d:"Supports both 5-mark and 10-mark questions with mark-scaled fuzzy output."},
  {icon:"🗄",t:"MongoDB Storage",d:"Every evaluation stored persistently for history, audit, and analytics."},
];

// ─── tiny components ──────────────────────────────────────────────────────────
const Spinner=({s=18})=>(
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" style={{animation:"spin .7s linear infinite",flexShrink:0}}>
    <path d="M21 12a9 9 0 1 1-6.2-8.56"/>
  </svg>
);

const Tag=({children,color="var(--amber)"})=>(
  <span style={{fontFamily:"var(--mono)",fontSize:10,color,
    background:`${color}18`,border:`1px solid ${color}30`,
    borderRadius:6,padding:"2px 9px",whiteSpace:"nowrap"}}>
    {children}
  </span>
);

const Bar=({v,c="var(--amber)",h=5})=>(
  <div style={{height:h,background:"var(--bg2)",borderRadius:99,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.round((v||0)*100)}%`,background:c,
      borderRadius:99,transition:"width 1.2s cubic-bezier(.4,0,.2,1)",
      boxShadow:`0 0 10px ${c}55`}}/>
  </div>
);

const P=v=>Math.round((v||0)*100)+"%";

function grade(m,mx=10){
  const r=m/mx;
  if(r>=.9)return{l:"A+",c:"#34d399"};if(r>=.8)return{l:"A",c:"#34d399"};
  if(r>=.7)return{l:"B+",c:"#2dd4bf"};if(r>=.6)return{l:"B",c:"#2dd4bf"};
  if(r>=.5)return{l:"C",c:"#f59e0b"}; if(r>=.4)return{l:"D",c:"#fb923c"};
  return{l:"F",c:"#f87171"};
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({label,color,file,onFile}){
  const[drag,setDrag]=useState(false);const[err,setErr]=useState("");const ref=useRef();
  const validate=f=>{setErr("");if(!f)return;
    const ext=f.name.split(".").pop().toLowerCase();
    if(!["pdf","txt","png","jpg","jpeg"].includes(ext)){setErr("PDF, TXT or image only");return;}
    if(f.size>20*1024*1024){setErr("Max 20MB");return;}
    onFile(f);};
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</span>
        {file&&<Tag color={color}>{file.name} · {(file.size/1024).toFixed(0)}KB</Tag>}
      </div>
      <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);validate(e.dataTransfer.files[0])}}
        onClick={()=>ref.current?.click()}
        style={{border:`1.5px dashed ${drag||file?color:"var(--bord2)"}`,borderRadius:"var(--rl)",
          background:drag?`${color}12`:file?`${color}07`:"transparent",
          padding:"26px 20px",cursor:"pointer",textAlign:"center",
          transition:"all .2s",minHeight:100,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",gap:8}}>
        <input ref={ref} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg" hidden onChange={e=>validate(e.target.files[0])}/>
        {file?(
          <>
            <span style={{fontSize:22}}>📄</span>
            <span style={{fontSize:13,color:"var(--tx1)",fontWeight:500}}>{file.name}</span>
            <span style={{fontSize:11,color:"var(--tx3)",fontFamily:"var(--mono)"}}>Click to replace</span>
          </>
        ):(
          <>
            <span style={{fontSize:22,opacity:.4}}>⬆</span>
            <span style={{fontSize:13,color:"var(--tx2)"}}>{drag?"Drop here":"Drag & drop or click to browse"}</span>
            <span style={{fontSize:11,color:"var(--tx3)",fontFamily:"var(--mono)"}}>PDF · TXT · PNG · JPG · max 20MB</span>
          </>
        )}
      </div>
      {err&&<span style={{fontSize:11,color:"var(--red)",marginTop:4,display:"block"}}>{err}</span>}
    </div>
  );
}

// ─── Gauge ────────────────────────────────────────────────────────────────────
function Gauge({marks,maxMarks}){
  const{l,c}=grade(marks,maxMarks);
  const R=50,CIRC=2*Math.PI*R;
  const dash=(marks/maxMarks)*CIRC;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <div style={{position:"relative",width:130,height:130}}>
        <svg width="130" height="130" viewBox="0 0 130 130" style={{transform:"rotate(-90deg)"}}>
          <circle cx="65" cy="65" r={R} fill="none" stroke="var(--bg2)" strokeWidth="10"/>
          <circle cx="65" cy="65" r={R} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",
              filter:`drop-shadow(0 0 10px ${c}88)`}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center"}}>
          <span style={{fontFamily:"var(--mono)",fontSize:28,fontWeight:500,color:"var(--tx1)",lineHeight:1}}>
            {marks.toFixed(1)}
          </span>
          <span style={{fontSize:11,color:"var(--tx3)",fontFamily:"var(--mono)"}}>/{maxMarks}</span>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"var(--head)",fontSize:24,fontWeight:700,color:c,
          textShadow:`0 0 24px ${c}55`}}>{l}</div>
        <div style={{fontSize:11,color:"var(--tx3)"}}>Grade</div>
      </div>
    </div>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
const MRow=({label,v,c,note})=>(
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    <div style={{display:"flex",justifyContent:"space-between"}}>
      <span style={{fontSize:12,color:"var(--tx2)"}}>{label}</span>
      <span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:500,color:"var(--tx1)"}}>{P(v)}</span>
    </div>
    <Bar v={v} c={c}/>
    {note&&<span style={{fontSize:10,color:"var(--tx3)"}}>{note}</span>}
  </div>
);

// ─── Teacher Score Panel ──────────────────────────────────────────────────────
function TeacherScores({ts}){
  if(!ts)return null;
  const rows=[
    {l:"Content Accuracy",     v:ts.content_accuracy,       c:"var(--grn)"},
    {l:"Concept Coverage",     v:ts.concept_coverage,       c:"var(--teal)"},
    {l:"Depth of Understanding",v:ts.depth_of_understanding,c:"var(--pur)"},
    {l:"Presentation Quality", v:ts.presentation_quality,   c:"var(--blu)"},
    {l:"Factual Correctness",  v:ts.factual_correctness,    c:"var(--amber)"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {rows.map(r=><MRow key={r.l} label={r.l} v={r.v} c={r.c}/>)}
    </div>
  );
}

// ─── Feedback Panel ───────────────────────────────────────────────────────────
function FeedbackPanel({fb}){
  if(!fb)return null;
  const Section=({title,c,items,prefix="▸"})=>items?.length?(
    <div>
      <div style={{fontFamily:"var(--mono)",fontSize:10,color:c,letterSpacing:"0.1em",
        textTransform:"uppercase",marginBottom:8}}>{title}</div>
      {items.map((x,i)=>(
        <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
          <span style={{color:c,fontSize:12,flexShrink:0}}>{prefix}</span>
          <span style={{fontSize:13,color:"var(--tx1)",lineHeight:1.5}}>{x}</span>
        </div>
      ))}
    </div>
  ):null;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* Verdict */}
      {fb.verdict&&(
        <div style={{background:"var(--amberG)",border:"1px solid rgba(245,158,11,0.2)",
          borderRadius:"var(--r)",padding:"13px 16px",borderLeft:"3px solid var(--amber)"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",
            letterSpacing:"0.1em",marginBottom:5}}>EVALUATION VERDICT</div>
          <div style={{fontSize:14,color:"var(--tx1)",fontWeight:500,lineHeight:1.5}}>{fb.verdict}</div>
        </div>
      )}

      {/* Mark reason */}
      {fb.mark_reason&&(
        <div style={{background:"rgba(96,165,250,0.06)",border:"1px solid rgba(96,165,250,0.15)",
          borderRadius:"var(--r)",padding:"13px 16px",borderLeft:"3px solid var(--blu)"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--blu)",
            letterSpacing:"0.1em",marginBottom:5}}>WHY THESE MARKS</div>
          <div style={{fontSize:13,color:"var(--tx1)",lineHeight:1.6}}>{fb.mark_reason}</div>
        </div>
      )}

      {/* Strengths + Weaknesses */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.15)",
          borderRadius:"var(--r)",padding:"14px"}}>
          <Section title="✅ Strengths" c="var(--grn)" items={fb.strengths}/>
        </div>
        <div style={{background:"rgba(248,113,113,0.05)",border:"1px solid rgba(248,113,113,0.15)",
          borderRadius:"var(--r)",padding:"14px"}}>
          <Section title="❌ Weaknesses" c="var(--red)" items={fb.weaknesses}/>
        </div>
      </div>

      {/* Correct / Incorrect */}
      {(fb.correct_points?.length||fb.incorrect_points?.length)&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{background:"rgba(52,211,153,0.04)",borderRadius:"var(--r)",padding:"14px",
            border:"1px solid rgba(52,211,153,0.1)"}}>
            <Section title="✓ Got Right" c="var(--grn)" items={fb.correct_points}/>
          </div>
          <div style={{background:"rgba(248,113,113,0.04)",borderRadius:"var(--r)",padding:"14px",
            border:"1px solid rgba(248,113,113,0.1)"}}>
            <Section title="✗ Needs Work" c="var(--red)" items={fb.incorrect_points}/>
          </div>
        </div>
      )}

      {/* Missing concepts */}
      {fb.missing_concepts?.length>0&&(
        <div style={{background:"var(--amberG)",border:"1px solid rgba(245,158,11,0.2)",
          borderRadius:"var(--r)",padding:"12px 16px"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",
            letterSpacing:"0.1em",marginBottom:8}}>MISSING CONCEPTS</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {fb.missing_concepts.map((c,i)=><Tag key={i}>{c}</Tag>)}
          </div>
        </div>
      )}

      {/* Suggestion */}
      {fb.teacher_suggestion&&(
        <div style={{background:"var(--tealG)",border:"1px solid rgba(45,212,191,0.2)",
          borderRadius:"var(--r)",padding:"13px 16px",borderLeft:"3px solid var(--teal)"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--teal)",
            letterSpacing:"0.1em",marginBottom:5}}>💡 TEACHER'S SUGGESTION</div>
          <div style={{fontSize:13,color:"var(--tx1)",lineHeight:1.6}}>{fb.teacher_suggestion}</div>
        </div>
      )}
    </div>
  );
}

// ─── Text Preview ─────────────────────────────────────────────────────────────
function TextPreview({s,m}){
  const[tab,setTab]=useState("s");
  const text=tab==="s"?s:m,color=tab==="s"?"var(--amber)":"var(--teal)";
  return(
    <div style={{border:"1px solid var(--bord)",borderRadius:"var(--rl)",overflow:"hidden"}}>
      <div style={{display:"flex",background:"var(--bg2)",borderBottom:"1px solid var(--bord)"}}>
        {[["s","Student Answer"],["m","Model Answer"]].map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px",background:"transparent",
            border:"none",borderBottom:`2px solid ${tab===k?(k==="s"?"var(--amber)":"var(--teal)"):"transparent"}`,
            color:tab===k?(k==="s"?"var(--amber)":"var(--teal)"):"var(--tx3)",
            fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.1em",
            textTransform:"uppercase",cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>
      <div style={{padding:14,background:"var(--bg2)",maxHeight:140,overflowY:"auto"}}>
        <pre style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--tx2)",
          whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:1.7}}>
          {text||"No text extracted."}
        </pre>
      </div>
      <div style={{padding:"5px 14px",background:"var(--bg)",borderTop:"1px solid var(--bord)",
        display:"flex",justifyContent:"flex-end"}}>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)"}}>
          {text?text.split(/\s+/).filter(Boolean).length:0} words
        </span>
      </div>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function Landing({onStart}){
  return(
    <div style={{fontFamily:"var(--body)"}}>

      {/* Hero */}
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",textAlign:"center",
        padding:"80px 32px 60px",position:"relative",overflow:"hidden"}}>

        {/* Background grid */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:"linear-gradient(rgba(245,158,11,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.04) 1px,transparent 1px)",
          backgroundSize:"60px 60px",zIndex:0}}/>
        <div style={{position:"absolute",inset:0,
          background:"radial-gradient(ellipse 80% 60% at 50% 40%,rgba(245,158,11,0.06) 0%,transparent 70%)",
          zIndex:0}}/>

        <div style={{position:"relative",zIndex:1,maxWidth:780,
          animation:"fadeUp .8s ease"}}>
          {/* Logo pill */}
          <div style={{display:"inline-flex",alignItems:"center",gap:10,
            background:"var(--bg3)",border:"1px solid var(--bord2)",
            borderRadius:99,padding:"8px 20px 8px 12px",marginBottom:32}}>
            <div style={{width:28,height:28,background:"linear-gradient(135deg,#f59e0b,#d97706)",
              borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"var(--mono)",fontSize:12,fontWeight:500,color:"#07080f"}}>AG</div>
            <span style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--tx1)"}}>AutoGrade</span>
            <Tag>v3.0</Tag>
          </div>

          <h1 style={{fontFamily:"var(--head)",fontSize:"clamp(36px,6vw,68px)",
            fontWeight:800,lineHeight:1.08,letterSpacing:"-0.03em",
            color:"var(--tx1)",marginBottom:24}}>
            Evaluate Handwritten<br/>
            <span style={{color:"var(--amber)"}}>Answers Intelligently</span>
          </h1>

          <p style={{fontSize:17,color:"var(--tx2)",lineHeight:1.7,maxWidth:540,
            margin:"0 auto 40px"}}>
            AutoGrade scans student handwritten answers, extracts text via OCR,
            applies intelligent evaluation, and uses advanced fuzzy logic to
            assign precise marks — instantly.
          </p>

          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={onStart} style={{
              padding:"14px 32px",background:"var(--amber)",color:"#07080f",
              border:"none",borderRadius:"var(--r)",fontFamily:"var(--head)",
              fontSize:15,fontWeight:700,cursor:"pointer",letterSpacing:"-0.01em",
              boxShadow:"0 0 32px rgba(245,158,11,0.3)",transition:"all .2s"}}>
              Start Evaluating →
            </button>
            <a href="#how" style={{
              padding:"14px 28px",background:"transparent",color:"var(--tx1)",
              border:"1px solid var(--bord2)",borderRadius:"var(--r)",
              fontFamily:"var(--body)",fontSize:15,cursor:"pointer",
              textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
              How it works ↓
            </a>
          </div>

          {/* Stats */}
          <div style={{display:"flex",gap:32,justifyContent:"center",marginTop:56,flexWrap:"wrap"}}>
            {[["8","Fuzzy Inputs"],["12","Inference Rules"],["5+","OCR Strategies"],["A–F","Grade Scale"]].map(([n,l])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:"var(--amber)"}}>{n}</div>
                <div style={{fontSize:12,color:"var(--tx3)"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{padding:"80px 32px",background:"var(--bg2)"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <Tag>Process</Tag>
            <h2 style={{fontFamily:"var(--head)",fontSize:"clamp(24px,4vw,40px)",
              fontWeight:800,color:"var(--tx1)",marginTop:14,letterSpacing:"-0.02em"}}>
              How AutoGrade Works
            </h2>
            <p style={{color:"var(--tx2)",fontSize:15,marginTop:12,maxWidth:480,margin:"12px auto 0"}}>
              From handwritten scan to detailed report in seconds
            </p>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:0,position:"relative"}}>
            {/* vertical line */}
            <div style={{position:"absolute",left:32,top:40,bottom:40,width:1,
              background:"linear-gradient(to bottom,var(--amber),var(--teal))",opacity:.3}}/>

            {STEPS.map((step,i)=>(
              <div key={step.n} style={{display:"flex",gap:24,alignItems:"flex-start",
                padding:"28px 0",borderBottom:i<STEPS.length-1?"1px solid var(--bord)":"none"}}>
                <div style={{width:64,height:64,borderRadius:16,flexShrink:0,
                  background:i%2===0?"var(--amberG)":"var(--tealG)",
                  border:`1px solid ${i%2===0?"rgba(245,158,11,0.25)":"rgba(45,212,191,0.2)"}`,
                  display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:2}}>
                  <span style={{fontSize:20}}>{step.icon}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,
                    color:i%2===0?"var(--amber)":"var(--teal)"}}>{step.n}</span>
                </div>
                <div style={{flex:1,paddingTop:8}}>
                  <h3 style={{fontFamily:"var(--head)",fontSize:17,fontWeight:700,
                    color:"var(--tx1)",marginBottom:6}}>{step.t}</h3>
                  <p style={{fontSize:14,color:"var(--tx2)",lineHeight:1.65}}>{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{padding:"80px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <Tag color="var(--teal)">Features</Tag>
            <h2 style={{fontFamily:"var(--head)",fontSize:"clamp(24px,4vw,38px)",
              fontWeight:800,color:"var(--tx1)",marginTop:14,letterSpacing:"-0.02em"}}>
              What Makes AutoGrade Different
            </h2>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
            {FEATURES.map((f,i)=>(
              <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--bord)",
                borderRadius:"var(--rl)",padding:"22px",transition:"border-color .2s"}}>
                <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
                <h3 style={{fontFamily:"var(--head)",fontSize:15,fontWeight:700,
                  color:"var(--tx1)",marginBottom:6}}>{f.t}</h3>
                <p style={{fontSize:13,color:"var(--tx2)",lineHeight:1.65}}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section style={{padding:"80px 32px",background:"var(--bg2)"}}>
        <div style={{maxWidth:820,margin:"0 auto",textAlign:"center"}}>
          <Tag color="var(--pur)">Technology</Tag>
          <h2 style={{fontFamily:"var(--head)",fontSize:"clamp(22px,3.5vw,36px)",
            fontWeight:800,color:"var(--tx1)",marginTop:14,letterSpacing:"-0.02em",marginBottom:12}}>
            Advanced AI Integration
          </h2>
          <p style={{fontSize:15,color:"var(--tx2)",lineHeight:1.7,maxWidth:580,margin:"0 auto 40px"}}>
            AutoGrade integrates a cutting-edge AI evaluation engine that understands
            answers the way a teacher does — beyond simple keyword matching.
            Combined with an 8-input Mamdani fuzzy inference system, it delivers
            nuanced, fair, and explainable grading.
          </p>

          <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
            {["React","Node.js","Python FastAPI","MongoDB","Tesseract OCR",
              "OpenCV","Advanced FIS","ReportLab"].map(t=>(
              <Tag key={t} color="var(--pur)">{t}</Tag>
            ))}
          </div>
        </div>
      </section>

      {/* Developer */}
      <section style={{padding:"80px 32px"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <div style={{background:"var(--bg3)",border:"1px solid var(--bord2)",
            borderRadius:20,padding:"36px",textAlign:"center"}}>

            {/* Avatar */}
            <div style={{width:80,height:80,borderRadius:"50%",
              background:"linear-gradient(135deg,#f59e0b,#2dd4bf)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:"#07080f",
              margin:"0 auto 20px",
              boxShadow:"0 0 32px rgba(245,158,11,0.3)"}}>
              PN
            </div>

            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",
              letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>
              Developer
            </div>

            <h3 style={{fontFamily:"var(--head)",fontSize:24,fontWeight:800,
              color:"var(--tx1)",marginBottom:4}}>{DEV.name}</h3>
            <p style={{fontSize:14,color:"var(--tx2)",marginBottom:4}}>{DEV.role}</p>
            <p style={{fontSize:13,color:"var(--tx3)",marginBottom:24}}>{DEV.institute}</p>

            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <a href={DEV.ghUrl} target="_blank" rel="noreferrer" style={{
                display:"flex",alignItems:"center",gap:8,padding:"10px 20px",
                background:"var(--bg4)",border:"1px solid var(--bord2)",
                borderRadius:"var(--r)",color:"var(--tx1)",textDecoration:"none",
                fontSize:13,fontFamily:"var(--mono)",transition:"border-color .2s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--amber)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bord2)"}>
                <span>⌥</span> github/{DEV.github}
              </a>
              <a href={DEV.liUrl} target="_blank" rel="noreferrer" style={{
                display:"flex",alignItems:"center",gap:8,padding:"10px 20px",
                background:"var(--bg4)",border:"1px solid var(--bord2)",
                borderRadius:"var(--r)",color:"var(--tx1)",textDecoration:"none",
                fontSize:13,fontFamily:"var(--mono)",transition:"border-color .2s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--teal)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bord2)"}>
                <span>in</span> {DEV.linkedin}
              </a>
            </div>

            <div style={{marginTop:28,padding:"16px",background:"var(--amberG)",
              borderRadius:"var(--r)",border:"1px solid rgba(245,158,11,0.15)"}}>
              <p style={{fontSize:13,color:"var(--tx2)",lineHeight:1.65}}>
                This project was built as an end-to-end ML system combining computer vision,
                natural language processing, intelligent evaluation, and fuzzy logic —
                demonstrating real-world applied AI for education.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:"60px 32px",background:"var(--bg2)",textAlign:"center"}}>
        <h2 style={{fontFamily:"var(--head)",fontSize:"clamp(22px,4vw,36px)",
          fontWeight:800,color:"var(--tx1)",marginBottom:16,letterSpacing:"-0.02em"}}>
          Ready to Evaluate?
        </h2>
        <p style={{color:"var(--tx2)",fontSize:15,marginBottom:28}}>
          Upload your student and model answers and get a full report in seconds.
        </p>
        <button onClick={onStart} style={{padding:"14px 36px",background:"var(--amber)",
          color:"#07080f",border:"none",borderRadius:"var(--r)",fontFamily:"var(--head)",
          fontSize:16,fontWeight:700,cursor:"pointer",
          boxShadow:"0 0 32px rgba(245,158,11,0.3)"}}>
          Launch AutoGrade →
        </button>
      </section>

      {/* Footer */}
      <footer style={{borderTop:"1px solid var(--bord)",padding:"20px 32px",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--tx3)"}}>
          AutoGrade v3.0 · Advanced Answer Evaluation
        </span>
        <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--tx3)"}}>
          {DEV.name} · {DEV.institute}
        </span>
      </footer>
    </div>
  );
}

// ─── EVALUATOR PAGE ───────────────────────────────────────────────────────────
function Evaluator({onBack}){
  const[mode,setMode]=useState("file");
  const[sFile,setSFile]=useState(null);
  const[mFile,setMFile]=useState(null);
  const[sTxt,setSTxt]=useState("");
  const[mTxt,setMTxt]=useState("");
  const[maxMarks,setMaxMarks]=useState(10);
  const[loading,setLoading]=useState(false);
  const[progress,setProgress]=useState(0);
  const[result,setResult]=useState(null);
  const[error,setError]=useState("");
  const[downloading,setDownloading]=useState(false);
  const[history,setHistory]=useState([]);
  const[tab,setTab]=useState("eval"); // eval | history

  useEffect(()=>{if(tab==="history")getResults().then(setHistory).catch(()=>{});},[tab]);

  const run=useCallback(async()=>{
    setError("");setResult(null);setLoading(true);setProgress(0);
    try{
      let r;
      if(mode==="file"){
        if(!sFile||!mFile){setError("Upload both files.");return;}
        r=await evaluateFiles(sFile,mFile,maxMarks,setProgress);
      }else{
        if(!sTxt.trim()||!mTxt.trim()){setError("Enter both answers.");return;}
        r=await evaluateText(sTxt,mTxt,maxMarks);
      }
      setResult(r);
      setTimeout(()=>doDownload(r),600);
    }catch(e){setError(e.response?.data?.error||e.message||"Evaluation failed.");}
    finally{setLoading(false);setProgress(0);}
  },[mode,sFile,mFile,sTxt,mTxt,maxMarks]);

  const doDownload=async(d)=>{
    setDownloading(true);
    try{await downloadReport(d||result);}
    catch(e){alert("Report failed: "+e.message);}
    finally{setDownloading(false);}
  };

  const canRun=!loading&&(mode==="file"?sFile&&mFile:sTxt.trim()&&mTxt.trim());

  const card=(extra={})=>({background:"var(--bg3)",border:"1px solid var(--bord)",
    borderRadius:"var(--rl)",padding:"24px",...extra});

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>

      {/* Eval header */}
      <header style={{borderBottom:"1px solid var(--bord)",padding:"0 28px",height:56,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,background:"rgba(7,8,15,0.94)",
        backdropFilter:"blur(16px)",zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",
            color:"var(--tx3)",cursor:"pointer",fontSize:13,fontFamily:"var(--mono)",
            padding:"4px 8px",borderRadius:6,transition:"color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="var(--tx1)"}
            onMouseLeave={e=>e.currentTarget.style.color="var(--tx3)"}>
            ← Back
          </button>
          <div style={{width:1,height:20,background:"var(--bord)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,background:"var(--amber)",borderRadius:7,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"var(--mono)",fontSize:11,fontWeight:500,color:"#07080f"}}>AG</div>
            <span style={{fontFamily:"var(--head)",fontSize:15,fontWeight:700,color:"var(--tx1)"}}>
              AutoGrade
            </span>
          </div>
        </div>

        <div style={{display:"flex",gap:20,alignItems:"center"}}>
          {[["eval","Evaluate"],["history","History"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)} style={{background:"transparent",border:"none",
              fontFamily:"var(--mono)",fontSize:11,color:tab===v?"var(--tx1)":"var(--tx3)",
              cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase",
              borderBottom:`2px solid ${tab===v?"var(--amber)":"transparent"}`,
              paddingBottom:2,transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main style={{flex:1,maxWidth:1220,margin:"0 auto",width:"100%",
        padding:"32px 28px 80px",
        display:tab==="eval"?"grid":"block",
        gridTemplateColumns:"1fr 370px",gap:28,alignItems:"start"}}>

        {tab==="eval"?(
          <>
            {/* ── LEFT ── */}
            <div style={{display:"flex",flexDirection:"column",gap:22}}>
              <div>
                <h1 style={{fontFamily:"var(--head)",fontSize:24,fontWeight:800,
                  color:"var(--tx1)",letterSpacing:"-0.02em",marginBottom:6}}>
                  Answer Evaluation
                </h1>
                <p style={{color:"var(--tx2)",fontSize:13}}>
                  Upload or paste answers · Select marks · Get instant detailed report
                </p>
              </div>

              {/* Marks selector + mode */}
              <div style={card()}>
                {/* Max marks */}
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)",
                    letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>
                    Question Type
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    {[5,10].map(v=>(
                      <button key={v} onClick={()=>setMaxMarks(v)} style={{
                        flex:1,padding:"11px",
                        background:maxMarks===v?"var(--amberG)":"var(--bg2)",
                        border:`1.5px solid ${maxMarks===v?"var(--amber)":"var(--bord)"}`,
                        borderRadius:"var(--r)",
                        color:maxMarks===v?"var(--amber)":"var(--tx2)",
                        fontFamily:"var(--head)",fontSize:15,fontWeight:700,
                        cursor:"pointer",transition:"all .15s",
                        boxShadow:maxMarks===v?"0 0 16px rgba(245,158,11,0.15)":"none"}}>
                        {v} Marks
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input mode */}
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)",
                  letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>
                  Input Mode
                </div>
                <div style={{display:"flex",border:"1px solid var(--bord)",borderRadius:"var(--r)",
                  overflow:"hidden",marginBottom:20,background:"var(--bg2)"}}>
                  {[["file","📄 File / Scan"],["text","✏️ Paste Text"]].map(([m,l])=>(
                    <button key={m} onClick={()=>{setMode(m);setError("");setResult(null);}}
                      style={{flex:1,padding:"10px",background:mode===m?"var(--amberG)":"transparent",
                        border:"none",borderRight:m==="file"?"1px solid var(--bord)":"none",
                        color:mode===m?"var(--amber)":"var(--tx3)",
                        fontFamily:"var(--mono)",fontSize:11,cursor:"pointer",letterSpacing:"0.05em"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {mode==="file"?(
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>
                    <DropZone label="Student Answer (Scan/PDF)" color="var(--amber)" file={sFile} onFile={setSFile}/>
                    <DropZone label="Model Answer (PDF/Text)"   color="var(--teal)"  file={mFile} onFile={setMFile}/>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    {[{l:"Student Answer",v:sTxt,s:setSTxt,c:"var(--amber)"},
                      {l:"Model Answer",  v:mTxt,s:setMTxt,c:"var(--teal)"}].map(({l,v,s,c})=>(
                      <div key={l}>
                        <div style={{fontFamily:"var(--mono)",fontSize:10,color:c,
                          letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>{l}</div>
                        <textarea value={v} onChange={e=>s(e.target.value)} rows={5}
                          placeholder={`Paste ${l.toLowerCase()}…`}
                          style={{width:"100%",background:"var(--bg2)",border:`1.5px solid var(--bord2)`,
                            borderRadius:"var(--r)",padding:"11px",color:"var(--tx1)",
                            fontFamily:"var(--mono)",fontSize:12,resize:"vertical",outline:"none",
                            lineHeight:1.7,transition:"border-color .15s"}}
                          onFocus={e=>e.target.style.borderColor=c}
                          onBlur={e=>e.target.style.borderColor="var(--bord2)"}/>
                      </div>
                    ))}
                  </div>
                )}

                {loading&&progress>0&&<div style={{marginTop:12}}><Bar v={progress/100} h={3}/></div>}

                {error&&(
                  <div style={{marginTop:12,padding:"10px 14px",
                    background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",
                    borderRadius:"var(--r)",color:"var(--red)",fontSize:13}}>
                    {error}
                  </div>
                )}

                <button onClick={run} disabled={!canRun} style={{
                  width:"100%",padding:"13px",marginTop:18,
                  background:canRun?"var(--amber)":"var(--bg2)",
                  color:canRun?"#07080f":"var(--tx3)",
                  border:"none",borderRadius:"var(--r)",fontFamily:"var(--head)",
                  fontSize:14,fontWeight:700,cursor:canRun?"pointer":"not-allowed",
                  letterSpacing:"-0.01em",transition:"all .2s",
                  boxShadow:canRun?"0 0 24px rgba(245,158,11,0.25)":"none",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {loading?<><Spinner/> Evaluating…</>:`▶ Evaluate (${maxMarks} marks) + Download Report`}
                </button>
              </div>

              {/* ── RESULT ── */}
              {result&&(
                <div style={{...card({border:"1px solid rgba(245,158,11,0.15)"}),
                  animation:"fadeUp .5s ease",display:"flex",flexDirection:"column",gap:22}}>

                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)",
                      letterSpacing:"0.12em",textTransform:"uppercase"}}>Result</span>
                    <div style={{display:"flex",gap:10}}>
                      <Tag>{result.evaluation_time_ms}ms</Tag>
                      <button onClick={()=>doDownload()} disabled={downloading} style={{
                        fontFamily:"var(--mono)",fontSize:11,padding:"6px 14px",
                        background:"var(--bg2)",color:"var(--teal)",
                        border:"1px solid rgba(45,212,191,0.3)",borderRadius:"var(--r)",
                        cursor:downloading?"not-allowed":"pointer",
                        display:"flex",alignItems:"center",gap:6}}>
                        {downloading?<><Spinner s={12}/> Generating…</>:"⬇ PDF Report"}
                      </button>
                    </div>
                  </div>

                  {/* Score + teacher scores */}
                  <div style={{display:"grid",gridTemplateColumns:"150px 1fr",gap:28,alignItems:"center"}}>
                    <Gauge marks={result.marks} maxMarks={result.max_marks||10}/>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)",
                        letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2}}>
                        Evaluation Scores
                      </div>
                      <TeacherScores ts={result.teacher_scores}/>
                      <div style={{borderTop:"1px solid var(--bord)",paddingTop:10,
                        display:"flex",flexDirection:"column",gap:10}}>
                        <MRow label="Similarity Score" v={result.similarity_score} c="var(--amber)" note="NLP cosine similarity"/>
                        <MRow label="Keyword Match"    v={result.keyword_match_ratio} c="var(--teal)" note="Key term coverage"/>
                      </div>
                    </div>
                  </div>

                  {/* Text preview */}
                  <TextPreview s={result.student_answer_text} m={result.model_answer_text}/>

                  {/* Feedback */}
                  <div style={{borderTop:"1px solid var(--bord)",paddingTop:20}}>
                    <FeedbackPanel fb={result.feedback}/>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div style={{display:"flex",flexDirection:"column",gap:18}}>

              {/* Evaluation pipeline */}
              <div style={card()}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)",
                  letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16}}>Pipeline</div>
                {STEPS.map((s,i)=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:14}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",minWidth:20}}>{s.n}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--tx1)",marginBottom:2}}>{s.icon} {s.t}</div>
                      <div style={{fontSize:11,color:"var(--tx3)",lineHeight:1.55}}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fuzzy rules */}
              <div style={card()}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)",
                  letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>Fuzzy Rules</div>
                {[
                  {id:"R1",c:"accuracy=HIGH ∧ coverage=GOOD ∧ depth=DEEP",o:"VERY HIGH",col:"var(--grn)"},
                  {id:"R2",c:"accuracy=HIGH ∧ depth=DEEP ∧ similarity=HIGH",o:"VERY HIGH",col:"var(--grn)"},
                  {id:"R3",c:"accuracy=MEDIUM ∧ coverage=AVG",o:"MEDIUM",col:"var(--amber)"},
                  {id:"R4",c:"accuracy=LOW ∧ factual=WRONG",o:"LOW",col:"var(--red)"},
                  {id:"R5",c:"similarity=LOW ∧ coverage=POOR",o:"LOW",col:"var(--red)"},
                ].map(({id,c,o,col})=>(
                  <div key={id} style={{display:"flex",gap:8,padding:"7px 10px",
                    background:"var(--bg2)",borderRadius:"var(--r)",marginBottom:6,
                    border:"1px solid var(--bord)"}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",minWidth:18}}>{id}</span>
                    <div>
                      <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--tx2)",lineHeight:1.5}}>IF {c}</div>
                      <div style={{fontFamily:"var(--mono)",fontSize:9,color:col,marginTop:1}}>→ MARKS = {o}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Developer card */}
              <div style={card()}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:"50%",
                    background:"linear-gradient(135deg,#f59e0b,#2dd4bf)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontFamily:"var(--head)",fontSize:15,fontWeight:800,color:"#07080f",flexShrink:0}}>
                    PN
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--tx1)"}}>{DEV.name}</div>
                    <div style={{fontSize:11,color:"var(--tx3)"}}>{DEV.role} · {DEV.institute}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                  <a href={DEV.ghUrl} target="_blank" rel="noreferrer" style={{
                    fontFamily:"var(--mono)",fontSize:10,color:"var(--tx2)",
                    textDecoration:"none",padding:"4px 10px",
                    background:"var(--bg2)",border:"1px solid var(--bord)",
                    borderRadius:6,transition:"border-color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="var(--amber)"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bord)"}>
                    ⌥ github/{DEV.github}
                  </a>
                  <a href={DEV.liUrl} target="_blank" rel="noreferrer" style={{
                    fontFamily:"var(--mono)",fontSize:10,color:"var(--tx2)",
                    textDecoration:"none",padding:"4px 10px",
                    background:"var(--bg2)",border:"1px solid var(--bord)",
                    borderRadius:6,transition:"border-color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="var(--teal)"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bord)"}>
                    in {DEV.linkedin}
                  </a>
                </div>
              </div>
            </div>
          </>
        ):(
          /* HISTORY */
          <div>
            <h2 style={{fontFamily:"var(--head)",fontSize:20,fontWeight:800,
              color:"var(--tx1)",marginBottom:20}}>Evaluation History</h2>
            <div style={{background:"var(--bg3)",border:"1px solid var(--bord)",
              borderRadius:"var(--rl)",padding:"20px"}}>
              {history.length?(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {history.map((r,i)=>{
                    const{l,c}=grade(r.marks,r.max_marks||10);
                    return(
                      <div key={r._id||i} style={{display:"flex",alignItems:"center",gap:14,
                        padding:"12px 16px",background:"var(--bg4)",
                        border:"1px solid var(--bord)",borderRadius:"var(--r)"}}>
                        <div style={{width:36,height:36,borderRadius:8,background:`${c}18`,
                          border:`1px solid ${c}44`,display:"flex",alignItems:"center",
                          justifyContent:"center",fontFamily:"var(--mono)",fontWeight:700,
                          fontSize:12,color:c,flexShrink:0}}>{l}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--tx1)"}}>
                            {r.marks?.toFixed(2)}/{r.max_marks||10}
                          </div>
                          <div style={{fontSize:11,color:"var(--tx3)",overflow:"hidden",
                            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {new Date(r.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8,fontFamily:"var(--mono)",
                          fontSize:10,color:"var(--tx3)"}}>
                          {[["S",r.similarity_score],["K",r.keyword_match_ratio]].map(([k,v])=>(
                            <span key={k}>{k}:<span style={{color:"var(--tx2)"}}>{P(v)}</span></span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ):(
                <div style={{textAlign:"center",padding:"40px",
                  color:"var(--tx3)",fontFamily:"var(--mono)",fontSize:13}}>
                  No evaluations yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const[page,setPage]=useState("landing"); // landing | eval
  return page==="landing"
    ?<Landing onStart={()=>setPage("eval")}/>
    :<Evaluator onBack={()=>setPage("landing")}/>;
}
