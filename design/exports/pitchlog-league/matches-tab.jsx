/* 5-1 경기 목록 /matches — C4 배치 유지, 그룹핑을 날짜별로 교체하고 필터 5종 + UCL 스테이지 추가 */
const UCL_STAGES=["리그 페이즈","플레이오프","16강","8강","4강","결승"];
const DAYS=[
 {d:"9월 3일 (수)",tag:"오늘",items:[
   {t:"04:00",comp:"UCL",h:T.rma,a:T.fcb,hs:2,as:1,st:"live",note:"8강 1차전"},
   {t:"04:00",comp:"UCL",h:T.psg,a:T.che,hs:0,as:0,st:"half",note:"8강 1차전"},
   {t:"22:00",comp:"EPL",h:T.liv,a:T.bri,hs:3,as:1,st:"recheck",note:"28R"},
   {t:"19:30",comp:"EPL",h:T.che,a:T.liv,hs:1,as:1,st:"final",note:"28R"}]},
 {d:"9월 4일 (목)",tag:"내일",items:[
   {t:"00:30",comp:"LaLiga",h:T.rma,a:T.psg,hs:"-",as:"-",st:"sched",note:"29R"},
   {t:"03:30",comp:"BL",h:T.bmg,a:T.fcb,hs:"-",as:"-",st:"sched",note:"26R"},
   {t:"04:45",comp:"L1",h:T.psg,a:T.bmg,hs:"-",as:"-",st:"sched",note:"27R"},
   {t:"미정",comp:"SA",h:T.che,a:T.bri,hs:"-",as:"-",st:"post",note:"28R"}]},
 {d:"9월 6일 (토)",tag:"",items:[
   {t:"20:30",comp:"EPL",h:T.bri,a:T.che,hs:"-",as:"-",st:"sched",note:"29R"},
   {t:"23:00",comp:"SA",h:T.liv,a:T.rma,hs:"-",as:"-",st:"sched",note:"29R"}]}
];
function MatchFilterBar({ucl,mobile}){
  if(mobile) return <div style={{display:"grid",gap:8,padding:"10px 16px",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)"}}>
    <div style={{display:"flex",gap:8,overflowX:"auto",WebkitMaskImage:"linear-gradient(90deg,#000 calc(100% - 24px),transparent)"}}>
      <Chip m on>필터 3</Chip><span style={{width:1,height:28,background:"var(--pl-line)",flex:"none",alignSelf:"center"}}/>
      {["UCL","EPL","2025/26","9월 3–6일"].map((c,i)=><Chip key={c} m on={i<3}>{c}</Chip>)}
    </div>
    {ucl&&<div style={{display:"flex",gap:8,overflowX:"auto",WebkitMaskImage:"linear-gradient(90deg,#000 calc(100% - 24px),transparent)"}}>
      <span className="t-cap" style={{alignSelf:"center",flex:"none"}}>UCL 스테이지</span>
      {UCL_STAGES.map((s,i)=><Chip key={s} m on={i===3}>{s}</Chip>)}
    </div>}
  </div>;
  return <div className="card" style={{padding:12,display:"grid",gap:10}}>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <span className="t-cap" style={{width:40}}>필터</span>
      <FilterSelect label="시즌" value="2025/26"/>
      <FilterSelect label="팀" value="전체"/>
      <FilterSelect label="라운드" value="28R"/>
      <FilterSelect label="날짜" value="9월 3일 – 6일" on/>
      <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}><Stamp/><button className="link">초기화</button></span>
    </div>
    {ucl&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderTop:"1px solid var(--pl-line)",paddingTop:10}}>
      <span className="t-cap" style={{width:40}}>UCL</span>
      {UCL_STAGES.map((s,i)=><Chip key={s} on={i===3}>{s}</Chip>)}
      <span className="t-sub" style={{marginLeft:"auto"}}>UCL은 라운드 대신 스테이지로 고릅니다</span>
    </div>}
  </div>;
}
function MatchRowCard({m,mobile}){
  return <div className="card" style={{padding:mobile?12:12,display:"grid",gap:8}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span className="num t-cap" style={{fontWeight:700,color:"var(--pl-text)"}}>{m.t}</span>
      <span className="t-cap">KST · {m.comp} {m.note}</span>
      <span style={{marginLeft:"auto"}}><Badge k={m.st}/></span>
    </div>
    {[[m.h,m.hs],[m.a,m.as]].map(([t,s],i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
      <Emblem t={t} size={20}/><span className="t-body" style={{fontWeight:600,minWidth:0,flex:1}}><TeamName t={t} mode={mobile?"short":"full"}/></span>
      <span className="num t-body" style={{fontWeight:700}}>{s}</span></div>)}
  </div>;
}
function DayGroup({g,cols=2,mobile}){
  return <div style={{display:"grid",gap:10}}>
    <div style={{display:"flex",alignItems:"baseline",gap:10}}>
      <h3 className="t-card" style={{margin:0}}>{g.d}</h3>
      {g.tag&&<span className="badge b-sched">{g.tag}</span>}
      <span className="t-sub num">{g.items.length}경기</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gap:10}}>
      {g.items.map((m,i)=><MatchRowCard key={i} m={m} mobile={mobile}/>)}
    </div>
  </div>;
}
function MatchesTab({theme,h=1180}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="경기"/>
    <div style={{flex:1,overflow:"hidden",padding:"16px 24px 0",display:"grid",gridTemplateColumns:"196px 1fr 320px",gap:16,alignItems:"start"}}>
      <div style={{display:"grid",gap:10}}>
        <FilterRail/>
        <div className="card" style={{padding:"10px 12px",display:"grid",gap:6}}><span className="t-cap">데이터</span><Stamp/></div>
      </div>
      <div style={{display:"grid",gap:12,minWidth:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <h1 className="t-page" style={{margin:0,fontSize:24}}>경기</h1>
          <span className="t-sub num">9월 3일 – 6일 · 10경기 · 진행 중 2</span>
          <span style={{marginLeft:"auto",display:"flex",gap:8}}><Btn sm ghost>날짜 변경</Btn><Btn sm ghost>주간 보기</Btn></span>
        </div>
        <MatchFilterBar ucl/>
        <HeroSelected meta/>
        {DAYS.map(g=><DayGroup key={g.d} g={g}/>)}
      </div>
      <div style={{display:"grid",gap:10}}><MiniStand picker full/></div>
    </div>
  </div>;
}
function MatchesTabMobile({theme,h=1800}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <StatusBarM/>
    <TopBarM title="경기" right={<span style={{width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-text)"}}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h14M6 10h8M9 15h2"/></svg></span>}/>
    <MatchFilterBar ucl mobile/>
    <div style={{flex:1,overflow:"hidden"}}>
      <div style={{display:"grid",gap:14,padding:"12px 16px"}}>
        <div className="card" style={{padding:14,display:"grid",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span className="t-cap">UCL · 8강 1차전</span><span style={{marginLeft:"auto"}}><Badge k="live"/></span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8}}>
            {[SEL.h,null,SEL.a].map((s,i)=>s?<div key={i} style={{display:"grid",gap:4,justifyItems:"center",minWidth:0}}>
                <Emblem t={s.t} size={36}/>
                <span className="t-body" style={{fontWeight:700,width:"100%",textAlign:"center"}}><TeamName t={s.t} mode="short"/></span>
                <span className="t-cap num">{s.league} {s.rank}위</span>
                <span className="t-cap">{s.mgr}</span></div>
              :<div key={i} style={{display:"grid",gap:4,justifyItems:"center"}}><span className="num" style={{fontSize:32,fontWeight:700,letterSpacing:"-.02em"}}>{SEL.hs} - {SEL.as}</span><span className="t-cap num">{SEL.min}</span></div>)}
          </div>
          <Btn style={{width:"100%"}}>경기 상세</Btn>
        </div>
        {DAYS.map(g=><DayGroup key={g.d} g={g} cols={1} mobile/>)}
      </div>
    </div>
    <TabBarM active={1}/>
  </div>;
}
Object.assign(window,{MatchesTab,MatchesTabMobile,DAYS,DayGroup,MatchRowCard,MatchFilterBar,UCL_STAGES});
