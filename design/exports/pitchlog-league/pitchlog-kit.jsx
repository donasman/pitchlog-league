const {useState} = React;
const DS = window.WantedDesignSystem_200007 || {};

const BADGES = {
  sched:{c:"b-sched",t:"예정"},
  live:{c:"b-live",t:"LIVE",dot:"dot-pulse"},
  half:{c:"b-half",t:"하프타임",dot:"dot-ring"},
  ft:{c:"b-ft",t:"종료"},
  recheck:{c:"b-recheck",t:"재검증 중",spin:true},
  final:{c:"b-final",t:"확정",check:true},
  post:{c:"b-post",t:"연기"},
  cancel:{c:"b-cancel",t:"취소"}
};
function Badge({k}){
  const b=BADGES[k];
  return <span className={"badge "+b.c}>
    {b.dot&&<i className={"dot "+b.dot}/>}
    {b.spin&&<svg className="spin" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1a5 5 0 1 0 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
    {b.check&&<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4 4.6 9 10 3.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    {b.t}
  </span>;
}
function Chip({children,on,m,onClick}){return <button className={"chip"+(m?" chip-m":"")} aria-pressed={!!on} onClick={onClick}>{children}</button>;}
function Btn({children,ghost,sm,onClick,style}){return <button className={"btn"+(ghost?" btn-ghost":"")+(sm?" btn-sm":"")} onClick={onClick} style={style}>{children}</button>;}

const ZONES={ucl:{c:"var(--z-ucl)",t:"UCL 직행"},uclpo:{c:"var(--z-uclpo)",t:"UCL 플레이오프"},uel:{c:"var(--z-uel)",t:"유로파리그"},uecl:{c:"var(--z-uecl)",t:"컨퍼런스리그"},relpo:{c:"var(--z-relpo)",t:"강등 플레이오프"},rel:{c:"var(--z-rel)",t:"강등"}};
function ZoneLegend({sm}){
  return <div className={"legend"+(sm?" legend-sm":"")}>
    {Object.keys(ZONES).map(k=><span className="legend-i" key={k} style={{"--zc":ZONES[k].c}}><i/>{ZONES[k].t}</span>)}
  </div>;
}
function StandRow({r}){
  const z=r.zone?ZONES[r.zone]:null;
  return <div className="zrow num" data-zone={r.zone||undefined} style={z?{"--zc":z.c}:{}}>
    <span style={{fontWeight:700}}>{r.no}</span>
    <span style={{fontWeight:600,fontVariantNumeric:"normal",display:"flex",alignItems:"center",gap:8}}><Crest t={r.team}/>{r.team}</span>
    <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.pl}</span>
    <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.w}</span>
    <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.d}</span>
    <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.l}</span>
    <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.gd>0?"+"+r.gd:r.gd}</span>
    <span style={{textAlign:"right",fontWeight:700}}>{r.pts}</span>
  </div>;
}
function StandHead(){
  return <div className="zrow t-cap" style={{height:32,color:"var(--pl-sub)"}}>
    <span>#</span><span>팀</span><span style={{textAlign:"center"}}>경기</span><span style={{textAlign:"center"}}>승</span><span style={{textAlign:"center"}}>무</span><span style={{textAlign:"center"}}>패</span><span style={{textAlign:"center"}}>득실</span><span style={{textAlign:"right"}}>승점</span>
  </div>;
}
function Crest({t,size=18}){
  const hue=[...t].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return <span aria-hidden="true" style={{width:size,height:size,borderRadius:4,flex:"none",background:`hsl(${hue} 42% 52%)`,display:"inline-block",boxShadow:"inset 0 0 0 1px rgba(0,0,0,.12)"}}/>;
}
const COMPS=["전체","UCL","EPL","라리가","분데스리가","세리에 A","리그 1"];

function MatchRow({m,compact,onClick}){
  return <div onClick={onClick} style={{display:"grid",gridTemplateColumns:"58px 1fr auto",alignItems:"center",gap:12,padding:compact?"10px 14px":"12px 16px",cursor:onClick?"pointer":"default"}}>
    <span className="t-cap" style={{color:"var(--pl-sub)"}}>{m.comp}</span>
    <div style={{display:"grid",gap:4}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><Crest t={m.home}/><span className="t-body" style={{fontWeight:m.hw?700:500}}>{m.home}</span><span className="num t-body" style={{marginLeft:"auto",fontWeight:700}}>{m.hs}</span></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}><Crest t={m.away}/><span className="t-body" style={{fontWeight:m.aw?700:500}}>{m.away}</span><span className="num t-body" style={{marginLeft:"auto",fontWeight:700}}>{m.as}</span></div>
    </div>
    <div style={{display:"grid",gap:6,justifyItems:"end",minWidth:78}}><Badge k={m.st}/><span className="t-cap num">{m.time}</span></div>
  </div>;
}
function SecHead({title,action,onAction,sm,mobile}){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:sm?"10px 14px 8px":"14px 16px 10px"}}>
    <h3 className={sm?"t-card":"t-sec"} style={{margin:0,fontWeight:700}}>{title}</h3>
    {action&&<button className={"link"+(mobile?" link-m":"")} onClick={onAction}>{action}</button>}
  </div>;
}
function SkelList({n=4,h=64}){
  return <div style={{display:"grid",gap:1,background:"var(--pl-line)"}}>
    {Array.from({length:n}).map((_,i)=><div key={i} style={{background:"var(--pl-card)",height:h,display:"grid",gridTemplateColumns:"58px 1fr 78px",alignItems:"center",gap:12,padding:"0 16px"}}>
      <div className="sk" style={{height:10,width:40}}/>
      <div style={{display:"grid",gap:8}}><div className="sk" style={{height:12,width:"62%"}}/><div className="sk" style={{height:12,width:"48%"}}/></div>
      <div className="sk" style={{height:22,width:64,borderRadius:6,justifySelf:"end"}}/>
    </div>)}
  </div>;
}
function ErrorState({title="경기 일정을 불러오지 못했습니다",desc="스코어 제공사 응답이 지연되고 있습니다. (오류 코드 504)",onRetry}){
  return <div style={{display:"grid",gap:12,justifyItems:"center",textAlign:"center",padding:"40px 24px"}}>
    <span style={{width:40,height:40,borderRadius:"50%",background:"var(--st-neg)",color:"#fff",display:"grid",placeItems:"center",fontWeight:700,fontSize:20}} aria-hidden="true">!</span>
    <div className="t-card">{title}</div>
    <div className="t-sub" style={{maxWidth:300}}>{desc}</div>
    <div style={{display:"flex",gap:8,marginTop:4}}><Btn sm onClick={onRetry}>다시 시도</Btn><Btn sm ghost>상태 페이지</Btn></div>
  </div>;
}
function EmptyState({title="조건에 맞는 경기가 없습니다",desc="선택한 3개 필터를 모두 만족하는 경기가 오늘은 없습니다.",action="필터 초기화",onAction}){
  return <div style={{display:"grid",gap:12,justifyItems:"center",textAlign:"center",padding:"40px 24px"}}>
    <span style={{width:40,height:40,borderRadius:"50%",background:"var(--pl-fill-2)",color:"var(--pl-sub)",display:"grid",placeItems:"center"}} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 3.5 3.5"/></svg>
    </span>
    <div className="t-card">{title}</div>
    <div className="t-sub" style={{maxWidth:300}}>{desc}</div>
    <Btn sm ghost onClick={onAction} style={{marginTop:4}}>{action}</Btn>
  </div>;
}

/* 프레임 */
function StatusBarM(){
  return <div style={{height:44,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",fontSize:14,fontWeight:600}} className="num">
    <span>9:41</span><span style={{display:"flex",gap:5,alignItems:"center",opacity:.85}}><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg><svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg></span>
  </div>;
}
function TopBarM({title,back,right}){
  return <div style={{height:52,display:"flex",alignItems:"center",gap:8,padding:"0 8px 0 4px",borderBottom:"1px solid var(--pl-line)",background:"var(--pl-card)"}}>
    {back?<button className="btn-ghost" style={{width:44,height:44,border:0,background:"none",display:"grid",placeItems:"center",cursor:"pointer",color:"var(--pl-text)"}} aria-label="뒤로"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.5 4 6.5 10l6 6"/></svg></button>:<span style={{width:12}}/>}
    <span className="t-card" style={{fontWeight:700}}>{title}</span>
    <span style={{marginLeft:"auto",display:"flex",gap:4}}>{right}</span>
  </div>;
}
const TABS=[["홈","M3 9.5 10 4l7 5.5V17H3z"],["경기","M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3zm0 0v14M3 10h14"],["순위","M4 16V9m6 7V4m6 12v-5"],["내 팀","M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-6 7a6 6 0 0 1 12 0"]];
function TabBarM({active=0}){
  return <div style={{height:64,borderTop:"1px solid var(--pl-line)",background:"var(--pl-card)",display:"grid",gridTemplateColumns:"repeat(4,1fr)"}}>
    {TABS.map(([t,d],i)=><div key={t} style={{display:"grid",gap:3,placeItems:"center",color:i===active?"var(--pl-primary)":"var(--pl-sub)",fontWeight:i===active?700:500,fontSize:11,minHeight:44}}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d={d}/></svg>{t}
    </div>)}
  </div>;
}
function Phone({children,theme}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:844,background:"var(--pl-bg)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>{children}</div>;
}
function Desk({children,theme}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:900,background:"var(--pl-bg)",display:"flex",flexDirection:"column",overflow:"hidden"}}>{children}</div>;
}
function DeskNav({active="경기"}){
  return <header style={{height:60,flex:"none",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",display:"flex",alignItems:"center",gap:32,padding:"0 40px"}}>
    <span className="t-sec" style={{letterSpacing:"-.02em"}}>PitchLog</span>
    <nav style={{display:"flex",gap:24}}>{["경기","순위","선수","내 팀"].map(t=><span key={t} className="t-body" style={{fontWeight:t===active?700:500,color:t===active?"var(--pl-text)":"var(--pl-sub)",borderBottom:t===active?"2px solid var(--pl-primary)":"2px solid transparent",lineHeight:"56px"}}>{t}</span>)}</nav>
    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
      <span className="t-sub">KOR</span>
      <span style={{width:32,height:32,borderRadius:"50%",background:"var(--pl-fill-2)"}}/>
    </div>
  </header>;
}
Object.assign(window,{Badge,BADGES,Chip,Btn,ZONES,ZoneLegend,StandRow,StandHead,Crest,COMPS,MatchRow,SecHead,SkelList,ErrorState,EmptyState,StatusBarM,TopBarM,TabBarM,Phone,Desk,DeskNav,DS});
