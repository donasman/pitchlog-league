/* C안 파생 시안 — 선택한 경기를 최상단에 크게, 요약 칸은 두 팀의 리그 순위·감독, 오늘의 경기는 카드 */
const SEL={h:{t:T.rma,league:"라리가",rank:1,pts:68,mgr:"사비 알론소",form:["W","W","D","W","W"]},
           a:{t:T.fcb,league:"분데스리가",rank:2,pts:61,mgr:"뱅상 콤파니",form:["W","L","W","W","D"]},
           comp:"UCL · 8강 1차전 · 산티아고 베르나베우",hs:2,as:1,min:"64′",
           events:["23′ 벨링엄","41′ 케인","58′ 음바페"]};
function TeamMeta({s,align="left",compact}){
  return <div style={{display:"grid",gap:compact?4:6,justifyItems:align==="right"?"end":"start"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flexDirection:align==="right"?"row-reverse":"row"}}>
      <Emblem t={s.t} size={compact?24:28}/><span className="t-card">{s.t.full}</span>
    </div>
    <div className="t-sub num" style={{textAlign:align}}>{s.league} {s.rank}위 · 승점 {s.pts}</div>
    <div className="t-sub" style={{textAlign:align}}>감독 {s.mgr}</div>
  </div>;
}
function MetaStrip(){
  const cell=(label,v,sub)=><div style={{padding:"11px 16px",display:"grid",gap:2}}>
    <span className="t-cap">{label}</span>
    <span className="num" style={{fontSize:18,fontWeight:700,letterSpacing:"-.01em"}}>{v}</span>
    <span className="t-sub" style={{fontSize:12}}>{sub}</span></div>;
  return <div className="card" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",overflow:"hidden"}}>
    {[[SEL.h.league+" 순위",SEL.h.rank+"위",SEL.h.t.full+" · 승점 "+SEL.h.pts],
      ["감독",SEL.h.mgr,SEL.h.t.short],
      [SEL.a.league+" 순위",SEL.a.rank+"위",SEL.a.t.full+" · 승점 "+SEL.a.pts],
      ["감독",SEL.a.mgr,SEL.a.t.short]].map((c,i)=>
      <div key={i} style={{boxShadow:i?"inset 1px 0 0 var(--pl-line)":"none"}}>{cell(c[0],c[1],c[2])}</div>)}
  </div>;
}
function HeroSelected({tall,meta}){
  return <div className="card" style={{padding:tall?20:16,display:"grid",gap:tall?16:12}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span className="t-cap">{SEL.comp}</span><span style={{marginLeft:"auto"}}><Badge k="live"/></span></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:16}}>
      <div style={{display:"grid",gap:8,justifyItems:"center",minWidth:0}}>
        <Emblem t={SEL.h.t} size={tall?60:48}/>
        <span className={tall?"t-sec":"t-card"} style={{textAlign:"center",width:"100%"}}><TeamName t={SEL.h.t}/></span>
        {meta&&<React.Fragment><span className="t-sub num">{SEL.h.league} {SEL.h.rank}위 · 승점 {SEL.h.pts}</span><span className="t-sub">감독 {SEL.h.mgr}</span><Form f={SEL.h.form}/></React.Fragment>}
      </div>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0}}>
        <span className="num" style={{fontSize:tall?56:44,fontWeight:700,letterSpacing:"-.028em",lineHeight:1}}>{SEL.hs} - {SEL.as}</span>
        <span className="t-cap num">{SEL.min} 진행 중</span>
      </div>
      <div style={{display:"grid",gap:8,justifyItems:"center",minWidth:0}}>
        <Emblem t={SEL.a.t} size={tall?60:48}/>
        <span className={tall?"t-sec":"t-card"} style={{textAlign:"center",width:"100%"}}><TeamName t={SEL.a.t}/></span>
        {meta&&<React.Fragment><span className="t-sub num">{SEL.a.league} {SEL.a.rank}위 · 승점 {SEL.a.pts}</span><span className="t-sub">감독 {SEL.a.mgr}</span><Form f={SEL.a.form}/></React.Fragment>}
      </div>
    </div>
    <div style={{display:"flex",gap:10,alignItems:"center",borderTop:"1px solid var(--pl-line)",paddingTop:10}}>
      <span className="t-sub">{SEL.events.join(" · ")}</span>
      <span style={{marginLeft:"auto",display:"flex",gap:8}}><Btn sm ghost>라인업</Btn><Btn sm>경기 상세</Btn></span>
    </div>
  </div>;
}
function MatchCardGrid({cols=2,n=6,dense=true}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="오늘의 경기" action="전체 보기" sm/>
    <div style={{padding:"0 14px 14px",display:"grid",gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gap:10}}>
      {Array.from({length:n}).map((_,i)=>{const m=TODAY[i%TODAY.length];
        return <CardBasic key={i} dense={dense} h={m.h} a={m.a} hs={m.hs} as={m.as} st={m.st} time={m.time} comp={m.comp} w="100%"/>;})}
    </div>
  </div>;
}
function CShell({theme,children,rightTop="stand"}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:900,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme}/>
    <div style={{flex:1,overflow:"hidden",padding:"20px 24px 0",display:"grid",gridTemplateColumns:"196px 1fr 320px",gap:16,alignItems:"start"}}>
      <div style={{display:"grid",gap:10}}><FilterRail/><div className="card" style={{padding:"10px 12px",display:"grid",gap:6}}><span className="t-cap">데이터</span><Stamp/></div></div>
      <div style={{display:"grid",gap:10,minWidth:0}}>{children}</div>
      <div style={{display:"grid",gap:10}}>{rightTop==="stand"?<React.Fragment><MiniStand picker/><MiniScorers/></React.Fragment>:<React.Fragment><SelectedPanel/><MiniStand picker/></React.Fragment>}</div>
    </div>
  </div>;
}
function SelectedPanel(){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="선택한 경기" action="바꾸기" sm/>
    {[SEL.h,SEL.a].map((s,i)=><div key={i} style={{padding:"10px 14px",borderTop:"1px solid var(--pl-line)",display:"grid",gap:6}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><Emblem t={s.t} size={22}/><span className="t-body" style={{fontWeight:700,minWidth:0}}><TeamName t={s.t}/></span><span className="num t-sub" style={{marginLeft:"auto"}}>{s.league} {s.rank}위</span></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}><span className="t-sub" style={{flex:1}}>감독 {s.mgr}</span><Form f={s.form}/></div>
    </div>)}
  </div>;
}
/* C1 — 히어로 + 4칸 메타 스트립 + 2열 카드 */
function HomeC1({theme}){
  return <CShell theme={theme}><HeroSelected/><MetaStrip/><MatchCardGrid cols={2} n={6}/></CShell>;
}
/* C2 — 히어로를 더 크게, 팀 메타를 히어로 안으로, 카드 3열 */
function HomeC2({theme}){
  return <CShell theme={theme}><HeroSelected tall meta/><MatchCardGrid cols={3} n={6}/></CShell>;
}
/* C3 — 히어로 좌우에 팀 카드를 세워 맞대결 구도로, 카드 2열 */
function HomeC3({theme}){
  return <CShell theme={theme}>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)",gap:10,alignItems:"stretch"}}>
      <div className="card" style={{padding:14,display:"grid",gap:10,alignContent:"start"}}><TeamMeta s={SEL.h} compact/><Form f={SEL.h.form}/></div>
      <div className="card" style={{padding:16,display:"grid",gap:12,alignContent:"center",justifyItems:"center"}}>
        <Badge k="live"/>
        <span className="num" style={{fontSize:52,fontWeight:700,letterSpacing:"-.028em",lineHeight:1}}>{SEL.hs} - {SEL.as}</span>
        <span className="t-cap num">{SEL.min} · {SEL.comp}</span>
        <span className="t-sub" style={{textAlign:"center"}}>{SEL.events.join(" · ")}</span>
        <Btn sm>경기 상세</Btn>
      </div>
      <div className="card" style={{padding:14,display:"grid",gap:10,alignContent:"start",justifyItems:"end"}}><TeamMeta s={SEL.a} align="right" compact/><Form f={SEL.a.form}/></div>
    </div>
    <MatchCardGrid cols={2} n={6}/>
  </CShell>;
}
/* C4 — 히어로 + 우측 사이드에 선택 경기 패널, 본문은 대회별 카드 그룹 */
function HomeC4({theme}){
  const groups=[["UCL",[TODAY[0],TODAY[1]]],["EPL",[TODAY[2],TODAY[3]]],["라리가 · 분데스리가",[TODAY[4],TODAY[5]]]];
  return <CShell theme={theme} rightTop="selected">
    <HeroSelected/>
    {groups.map(([g,rows])=><div key={g} className="card" style={{overflow:"hidden"}}>
      <SecHead title={g} action="전체 보기" sm/>
      <div style={{padding:"0 14px 12px",display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
        {rows.map((m,i)=><CardBasic key={i} dense h={m.h} a={m.a} hs={m.hs} as={m.as} st={m.st} time={m.time} comp={m.comp} w="100%"/>)}
      </div>
    </div>)}
  </CShell>;
}
Object.assign(window,{HomeC1,HomeC2,HomeC3,HomeC4,SEL,HeroSelected,SelectedPanel,MetaStrip,TeamMeta,MatchCardGrid,CShell});
