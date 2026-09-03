/* 2단계 — 공통 컴포넌트 부품 */
const CSEL=[["전체","전체"],["UCL","UCL"],["EPL","EPL"],["LaLiga","라리가"],["BL","분데스리가"],["SA","세리에 A"],["L1","리그 1"]];
const T={
 bri:{full:"브라이턴 앤 호브 알비온",short:"브라이턴",code:"BHA"},
 bmg:{full:"보루시아 묀헨글라트바흐",short:"묀헨글라트바흐",code:"BMG"},
 liv:{full:"리버풀",short:"리버풀",code:"LIV"},
 rma:{full:"레알 마드리드",short:"레알",code:"RMA"},
 fcb:{full:"바이에른 뮌헨",short:"바이에른",code:"FCB"},
 che:{full:"첼시",short:"첼시",code:"CHE"},
 psg:{full:"파리 생제르맹",short:"PSG",code:"PSG"}
};
/* 팀명 정책: 히어로·기본 = 정식명(폭 부족 시 말줄임 + title), 컴팩트·모바일 = 축약 사전, 3열 이하 = 코드 */
function TeamName({t,mode="full"}){
  const n=mode==="code"?t.code:mode==="short"?t.short:t.full;
  return <span className="tname" title={t.full}>{n}</span>;
}
function Emblem({t,size=24,none}){
  if(none) return <span aria-hidden="true" style={{width:size,height:size,borderRadius:6,flex:"none",background:"var(--pl-fill-2)",display:"grid",placeItems:"center",fontSize:size*.36,fontWeight:700,color:"var(--pl-sub)",fontFamily:"var(--font)"}}>{t.code}</span>;
  return <Crest t={t.full} size={size}/>;
}
function Avatar({size=32,none}){
  return <span aria-hidden="true" style={{width:size,height:size,borderRadius:"50%",flex:"none",background:"var(--pl-fill-2)",display:"grid",placeItems:"center",color:"var(--pl-sub)"}}>
    {none&&<svg width={size*.6} height={size*.6} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="7" r="3.2"/><path d="M4 17a6 6 0 0 1 12 0"/></svg>}
  </span>;
}
function Stamp({t="13:42"}){
  return <span className="t-cap num" style={{display:"inline-flex",alignItems:"center",gap:5}}>
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="6" cy="6" r="4.6"/><path d="M6 3.4V6l1.8 1.2"/></svg>{t} 기준
  </span>;
}
/* 1. 앱 헤더 */
function HeaderDesk({theme,onTheme,active="경기",home}){
  return <header style={{height:60,background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",display:"flex",alignItems:"center",gap:28,padding:"0 24px"}}>
    <span className="t-sec" style={{letterSpacing:"-.022em",lineHeight:"56px",boxShadow:home?"inset 0 -2px 0 var(--pl-primary)":"none"}}>PitchLog</span>
    <nav style={{display:"flex",gap:20}}>{["경기","순위","팀","통계"].map(t=>{const on=!home&&t===active;return <span key={t} className="t-body" style={{fontWeight:on?700:500,color:on?"var(--pl-text)":"var(--pl-sub)",lineHeight:"56px",boxShadow:on?"inset 0 -2px 0 var(--pl-primary)":"none"}}>{t}</span>;})}</nav>
    <label style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,height:40,padding:"0 12px",borderRadius:8,background:"var(--pl-fill)",boxShadow:"inset 0 0 0 1px var(--pl-line)",width:260,color:"var(--pl-sub)"}}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 3.5 3.5"/></svg>
      <span className="t-sub">팀·선수·경기 검색</span>
    </label>
    <span style={{display:"flex",gap:2,padding:3,borderRadius:999,background:"var(--pl-fill)"}}>
      {["한","EN"].map((l,i)=><span key={l} style={{minWidth:36,height:32,display:"grid",placeItems:"center",borderRadius:999,fontSize:13,fontWeight:600,background:i===0?"var(--pl-primary)":"transparent",color:i===0?"var(--pl-on-primary)":"var(--pl-sub)"}}>{l}</span>)}
    </span>
    <button className="btn btn-ghost" onClick={onTheme} style={{width:40,height:40,padding:0,borderRadius:8}} aria-label="테마 전환">
      {theme==="dark"
        ?<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.5v2.2M10 16.3v2.2M18.5 10h-2.2M3.7 10H1.5M16 4l-1.6 1.6M5.6 14.4 4 16M16 16l-1.6-1.6M5.6 5.6 4 4"/></svg>
        :<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16.5 12.4A7 7 0 1 1 7.6 3.5a5.6 5.6 0 0 0 8.9 8.9z"/></svg>}
    </button>
  </header>;
}
function HeaderMobile({open}){
  return <div style={{width:390,background:"var(--pl-card)",border:"1px solid var(--pl-line)",borderRadius:12,overflow:"hidden"}}>
    <div style={{height:56,display:"flex",alignItems:"center",gap:4,padding:"0 8px 0 16px"}}>
      <span className="t-card" style={{fontWeight:700,letterSpacing:"-.02em"}}>PitchLog</span>
      <span style={{marginLeft:"auto",display:"flex"}}>
        {[["검색","M9 3a6 6 0 1 0 0 12A6 6 0 0 0 9 3zm4.5 10.5 3.5 3.5"],["메뉴","M3 6h14M3 10h14M3 14h14"]].map(([l,d])=>
          <span key={l} style={{width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-text)"}}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={d}/></svg></span>)}
      </span>
    </div>
    {open&&<div style={{borderTop:"1px solid var(--pl-line)"}}>
      {["경기","순위","팀","통계"].map((t,i)=><div key={t} style={{minHeight:52,display:"flex",alignItems:"center",padding:"0 16px",fontSize:15,fontWeight:i===0?700:500,borderTop:i?"1px solid var(--pl-line)":"none"}}>{t}</div>)}
      <div style={{display:"flex",gap:8,padding:16,borderTop:"1px solid var(--pl-line)",alignItems:"center"}}>
        <span className="t-sub" style={{flex:1}}>언어 · 테마</span>
        <span style={{display:"flex",gap:2,padding:3,borderRadius:999,background:"var(--pl-fill)"}}>{["한","EN"].map((l,i)=><span key={l} style={{minWidth:44,height:38,display:"grid",placeItems:"center",borderRadius:999,fontSize:13,fontWeight:600,background:i===0?"var(--pl-primary)":"transparent",color:i===0?"var(--pl-on-primary)":"var(--pl-sub)"}}>{l}</span>)}</span>
        <span style={{width:44,height:44,display:"grid",placeItems:"center",borderRadius:8,boxShadow:"inset 0 0 0 1px var(--pl-control)"}}><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16.5 12.4A7 7 0 1 1 7.6 3.5a5.6 5.6 0 0 0 8.9 8.9z"/></svg></span>
      </div>
    </div>}
  </div>;
}
/* 2. 대회 선택기 */
function CompChips({active=["전체"],m}){
  return <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    {CSEL.map(([ab,full])=><Chip key={ab} m={m} on={active.includes(ab)}>{ab}</Chip>)}
  </div>;
}
function CompSidebar({active="EPL"}){
  return <div className="card" style={{width:200,overflow:"hidden"}}>
    <div className="t-cap" style={{padding:"12px 14px 8px"}}>대회</div>
    {CSEL.map(([ab,full])=><div key={ab} style={{minHeight:44,display:"flex",alignItems:"center",gap:10,padding:"0 14px",borderTop:"1px solid var(--pl-line)",background:ab===active?"var(--pl-primary)":"transparent",color:ab===active?"var(--pl-on-primary)":"var(--pl-text)",fontWeight:ab===active?700:500,fontSize:14}}>
      <span style={{width:34,fontWeight:700,fontSize:12,opacity:ab===active?1:.6}}>{ab}</span>{full}
    </div>)}
  </div>;
}
/* 3. 경기 카드 */
function CardHero({h,a,hs,as,st,time,comp="UCL · 8강 1차전"}){
  return <div className="card" style={{width:420,padding:20,display:"grid",gap:16}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span className="t-cap">{comp}</span><span style={{marginLeft:"auto"}}><Badge k={st}/></span></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:12}}>
      <div style={{display:"grid",gap:8,justifyItems:"center",minWidth:0}}><Emblem t={h} size={44}/><span className="t-card" style={{textAlign:"center",maxWidth:150,minWidth:0,width:"100%"}}><TeamName t={h}/></span></div>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0,maxWidth:150}}>
        <span className="num" style={{fontSize:36,fontWeight:700,letterSpacing:"-.02em"}}>{hs} - {as}</span>
        <span className="t-cap num" style={{textAlign:"center",maxWidth:150}}>{time}</span>
      </div>
      <div style={{display:"grid",gap:8,justifyItems:"center",minWidth:0}}><Emblem t={a} size={44}/><span className="t-card" style={{textAlign:"center",maxWidth:150,minWidth:0,width:"100%"}}><TeamName t={a}/></span></div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:12,borderTop:"1px solid var(--pl-line)",paddingTop:12}}><Stamp/><span style={{marginLeft:"auto"}}><Btn sm ghost>경기 상세</Btn></span></div>
  </div>;
}
function CardBasic({h,a,hs,as,st,time,comp="EPL",w=330,dense}){
  return <div className="card" style={{width:w,padding:dense?10:14,display:"grid",gap:dense?6:10}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}><span className="t-cap">{comp}</span><span style={{marginLeft:"auto"}}><Badge k={st}/></span></div>
    {[[h,hs],[a,as]].map(([t,s],i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
      <Emblem t={t} size={22}/><span className="t-body" style={{fontWeight:600,minWidth:0,flex:1}}><TeamName t={t}/></span>
      <span className="num t-body" style={{marginLeft:"auto",fontWeight:700}}>{s}</span></div>)}
    <div className="t-cap num">{time}</div>
  </div>;
}
function CardCompact({h,a,hs,as,st,time}){
  return <div className="card" style={{width:212,padding:12,display:"grid",gap:8}}>
    <div style={{display:"flex",alignItems:"center"}}><Badge k={st}/><span className="t-cap num" style={{marginLeft:"auto"}}>{time}</span></div>
    {[[h,hs],[a,as]].map(([t,s],i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
      <Emblem t={t} size={18}/><span className="t-sub" style={{color:"var(--pl-text)",fontWeight:600,minWidth:0,flex:1}}><TeamName t={t} mode="short"/></span>
      <span className="num t-sub" style={{marginLeft:"auto",color:"var(--pl-text)",fontWeight:700}}>{s}</span></div>)}
  </div>;
}
/* 4. 순위표 행 */
const FORM=["W","W","D","L","W"];
const FL={W:["f-w","승"],D:["f-d","무"],L:["f-l","패"]};
function Form({f=FORM}){
  return <span className="form" aria-label={"최근 5경기 "+f.map(x=>FL[x][1]).join(" ")}>{f.map((x,i)=><i key={i} className={FL[x][0]}>{FL[x][1]}</i>)}</span>;
}
function StandFullHead(){
  return <div className="zrow t-cap" style={{gridTemplateColumns:"30px 1fr 34px 30px 30px 30px 34px 34px 40px 42px 108px",height:34}}>
    <span>#</span><span>팀</span><span style={{textAlign:"center"}}>경기</span><span style={{textAlign:"center"}}>승</span><span style={{textAlign:"center"}}>무</span><span style={{textAlign:"center"}}>패</span><span style={{textAlign:"center"}}>득점</span><span style={{textAlign:"center"}}>실점</span><span style={{textAlign:"center"}}>득실</span><span style={{textAlign:"right"}}>승점</span><span style={{textAlign:"right"}}>최근 5경기</span>
  </div>;
}
function StandFull({r}){
  const z=r.zone?ZONES[r.zone]:null;
  return <div className="zrow num" data-zone={r.zone||undefined} style={{"--zc":z?z.c:undefined,gridTemplateColumns:"30px 1fr 34px 30px 30px 30px 34px 34px 40px 42px 108px",height:48}}>
    <span style={{fontWeight:700}}>{r.no}</span>
    <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0,fontVariantNumeric:"normal",fontWeight:600}}><Emblem t={r.t} size={22} none={r.noEmblem}/><TeamName t={r.t}/></span>
    {[r.pl,r.w,r.d,r.l,r.gf,r.ga].map((v,i)=><span key={i} style={{textAlign:"center",color:"var(--pl-sub)"}}>{v}</span>)}
    <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.gd>0?"+"+r.gd:r.gd}</span>
    <span style={{textAlign:"right",fontWeight:700}}>{r.pts}</span>
    <span style={{display:"flex",justifyContent:"flex-end"}}><Form f={r.form}/></span>
  </div>;
}
function StandMobile({r}){
  const z=r.zone?ZONES[r.zone]:null;
  return <div className="zrow num" data-zone={r.zone||undefined} style={{"--zc":z?z.c:undefined,gridTemplateColumns:"26px 1fr 68px 46px",height:52,padding:"0 12px 0 14px"}}>
    <span style={{fontWeight:700}}>{r.no}</span>
    <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0,fontVariantNumeric:"normal"}}>
      <Emblem t={r.t} size={20} none={r.noEmblem}/>
      <span style={{minWidth:0,display:"grid"}}><span className="t-body" style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.t.short}</span><span className="t-cap num">{r.pl}경기 · {r.gd>0?"+"+r.gd:r.gd}</span></span>
    </span>
    <span style={{display:"flex",justifyContent:"center"}}><Form f={(r.form||FORM).slice(-3)}/></span>
    <span style={{textAlign:"right",fontWeight:700,fontSize:15}}>{r.pts}</span>
  </div>;
}
/* 5. 필터 바 */
function FilterSelect({label,value,on}){
  return <button className="chip" style={{height:40,gap:8,fontWeight:on?600:500,background:on?"var(--pl-primary)":"transparent",borderColor:on?"var(--pl-primary)":"var(--pl-control)",color:on?"var(--pl-on-primary)":"var(--pl-text)"}}>
    <span style={{opacity:on?.8:.6,fontSize:12}}>{label}</span>{value}
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>
  </button>;
}
function FilterBarDesk(){
  return <div className="card" style={{padding:14,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",width:940}}>
    <FilterSelect label="대회" value="EPL" on/><FilterSelect label="시즌" value="2025/26"/><FilterSelect label="팀" value="전체"/><FilterSelect label="라운드" value="28R"/><FilterSelect label="날짜" value="9월 3일"/>
    <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}><Stamp/><button className="link">초기화</button></span>
  </div>;
}
function FilterBarMobile({sheet}){
  return <div style={{width:390,border:"1px solid var(--pl-line)",borderRadius:12,overflow:"hidden",background:"var(--pl-card)",position:"relative",height:sheet?420:undefined}}>
    <div style={{display:"flex",gap:8,padding:12,alignItems:"center",overflowX:"auto",scrollbarWidth:"none",WebkitMaskImage:"linear-gradient(90deg,#000 calc(100% - 28px),transparent)"}}>
      <Chip m on>필터 2</Chip>
      <span style={{width:1,height:28,background:"var(--pl-line)",flex:"none"}}/>
      {["EPL","2025/26","28R","전체 팀"].map((c,i)=><Chip key={c} m on={i<2}>{c}</Chip>)}
    </div>
    {sheet&&<div style={{position:"absolute",inset:"auto 0 0 0",top:70,background:"var(--pl-card)",borderTop:"1px solid var(--pl-line)",borderRadius:"16px 16px 0 0",boxShadow:"var(--sh-modal)",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"8px 0",display:"grid",placeItems:"center"}}><span style={{width:36,height:4,borderRadius:2,background:"var(--pl-line)"}}/></div>
      <div style={{display:"flex",alignItems:"center",padding:"0 16px 8px"}}><span className="t-card">필터</span><button className="link" style={{marginLeft:"auto"}}>초기화</button></div>
      <div style={{flex:1,overflow:"auto"}}>
        {[["대회",["전체","UCL","EPL","LaLiga","BL","SA","L1"],[2]],["시즌",["2025/26","2024/25"],[0]],["라운드",["전체","28R","27R"],[1]]].map(([g,opts,sel])=>
          <div key={g} style={{padding:"12px 16px",borderTop:"1px solid var(--pl-line)",display:"grid",gap:10}}>
            <span className="t-cap">{g}</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{opts.map((o,i)=><Chip key={o} m on={sel.includes(i)}>{o}</Chip>)}</div>
          </div>)}
      </div>
      <div style={{padding:16,borderTop:"1px solid var(--pl-line)",display:"flex",gap:8}}><Btn ghost style={{flex:1}}>취소</Btn><Btn style={{flex:2}}>4경기 보기</Btn></div>
    </div>}
  </div>;
}
Object.assign(window,{CSEL,T,TeamName,Emblem,Avatar,Stamp,HeaderDesk,HeaderMobile,CompChips,CompSidebar,CardHero,CardBasic,CardCompact,Form,StandFullHead,StandFull,StandMobile,FilterSelect,FilterBarDesk,FilterBarMobile});
