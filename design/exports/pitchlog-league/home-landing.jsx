/* 홈 (/) — 제품 앞장. 경기 탭의 요약이 아니다. */
const LIVE_LINES=[
 {c:"UCL",h:"레알 마드리드",hshort:"레알",a:"바이에른 뮌헨",ashort:"바이에른",hs:2,as:1,m:"64′"},
 {c:"UCL",h:"PSG",a:"첼시",hs:0,as:0,m:"HT"},
 {c:"EPL",h:"리버풀",a:"브라이턴 앤 호브 알비온",ashort:"브라이턴",hs:3,as:1,m:"78′"},
 {c:"SA",h:"나폴리",a:"유벤투스",hs:1,as:2,m:"55′"}
];
function LiveTicker({empty,mobile}){
  return <div className="card" style={{overflow:"hidden",display:"grid",alignContent:"start"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 18px",borderBottom:"1px solid var(--pl-line)"}}>
      {empty
        ? <React.Fragment><span className="t-card">지금 진행 중인 경기 없음</span></React.Fragment>
        : <React.Fragment><i className="dot dot-pulse" style={{color:"var(--st-neg)",width:8,height:8}}/><span className="t-card">지금 4경기 진행 중</span></React.Fragment>}
      <span style={{marginLeft:"auto"}}><Stamp/></span>
    </div>
    {empty
      ? <div style={{padding:"18px",display:"grid",gap:12}}>
          <div style={{display:"grid",gap:6}}>
            <span className="t-cap">다음 킥오프</span>
            <span className="t-sec">오늘 22:00 · EPL</span>
            <span className="t-body">리버풀 vs 브라이턴 · 안필드</span>
          </div>
          <div style={{display:"grid",gap:1,background:"var(--pl-line)",borderRadius:8,overflow:"hidden"}}>
            {[["23:45","라리가","레알 마드리드 vs 세비야"],["익일 03:30","분데스리가","묀헨글라트바흐 vs 바이에른"],["익일 04:45","리그 1","PSG vs 모나코"]].map(r=>
              <div key={r[0]} style={{background:"var(--pl-card)",display:"grid",gridTemplateColumns:"84px 64px 1fr",gap:10,padding:"10px 12px",alignItems:"center"}}>
                <span className="num t-sub" style={{fontWeight:700,color:"var(--pl-text)"}}>{r[0]}</span>
                <span className="t-cap">{r[1]}</span><span className="t-sub">{r[2]}</span></div>)}
          </div>
          <Btn ghost sm={!mobile} style={{justifySelf:"start"}}>오늘 일정 전체 보기</Btn>
        </div>
      : <div style={{display:"grid",gap:1,background:"var(--pl-line)"}}>
          {LIVE_LINES.map((l,i)=><div key={i} style={{background:"var(--pl-card)",display:"grid",gridTemplateColumns:mobile?"36px 1fr 54px 1fr 38px":"46px 1fr 62px 1fr 46px",alignItems:"center",gap:mobile?6:10,padding:mobile?"11px 12px":"11px 18px"}}>
            <span className="t-cap">{l.c}</span>
            <span className="t-body" style={{textAlign:"right",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mobile&&l.hshort?l.hshort:l.h}</span>
            <span className="num" style={{textAlign:"center",fontSize:17,fontWeight:700}}>{l.hs} - {l.as}</span>
            <span className="t-body" style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mobile&&l.ashort?l.ashort:l.a}</span>
            <span className="t-cap num" style={{textAlign:"right",color:"var(--st-neg-text)",fontWeight:700}}>{l.m}</span>
          </div>)}
          <div style={{background:"var(--pl-card)",padding:mobile?"2px 12px":"12px 18px"}}><button className={"link"+(mobile?" link-m":"")}>진행 중인 경기 모두 보기</button></div>
        </div>}
  </div>;
}
function Hero({empty,mobile}){
  return <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"minmax(0,1fr) minmax(0,1.05fr)",gap:mobile?20:40,alignItems:"start"}}>
    <div style={{display:"grid",gap:mobile?12:16,paddingTop:mobile?0:12}}>
      <h1 style={{margin:0,fontSize:mobile?30:44,lineHeight:1.22,fontWeight:700,letterSpacing:"-.028em"}}>유럽 5대 리그와 UCL,<br/>한 곳에서</h1>
      <p style={{margin:0,fontSize:mobile?15:17,lineHeight:1.65,color:"var(--pl-sub)",maxWidth:520}}>진행 중인 경기는 실시간으로, 끝난 경기는 공식 기록이 확정될 때까지 표시해 둡니다. EPL · 라리가 · 분데스리가 · 세리에 A · 리그 1 · UCL을 같은 기준으로 봅니다.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Btn>오늘 경기 보기</Btn><Btn ghost>순위표</Btn></div>
    </div>
    <LiveTicker empty={empty} mobile={mobile}/>
  </div>;
}
const LEAGUES=[
 {n:"UCL",full:"챔피언스리그",stage:"8강 1차전",live:2,lead:"레알 마드리드 2 - 1 바이에른",leadShort:"레알 2-1 뮌헨",leadLabel:"진행 중"},
 {n:"EPL",full:"프리미어리그",stage:"28라운드 진행 중",live:1,lead:"리버풀",pts:65},
 {n:"LaLiga",full:"라리가",stage:"29라운드",sched:2,lead:"레알 마드리드",leadShort:"레알",pts:68},
 {n:"BL",full:"분데스리가",stage:"26라운드",sched:1,lead:"바이에른 뮌헨",leadShort:"바이에른",pts:61},
 {n:"SA",full:"세리에 A",stage:"28라운드 진행 중",live:1,lead:"나폴리",pts:59},
 {n:"L1",full:"리그 1",stage:"27라운드",sched:2,lead:"PSG",pts:66}
];
function LeagueCard({l,mobile}){
  return <div className="card" style={{padding:16,display:"grid",gap:12,cursor:"pointer"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <Crest t={l.full} size={28}/>
      <div style={{display:"grid",minWidth:0}}>
        <span className="t-card">{l.full}</span>
        <span className="t-cap">{l.n}</span>
      </div>
      <span style={{marginLeft:"auto"}}>
        {l.live
          ? <span className="badge b-live"><i className="dot dot-pulse"/>LIVE {l.live}</span>
          : <span className="badge b-sched">예정 {l.sched}</span>}
      </span>
    </div>
    <span className="t-sub">{l.stage}</span>
    <div style={{borderTop:"1px solid var(--pl-line)",paddingTop:10,display:"flex",alignItems:"center",gap:8}}>
      <span className="t-cap">{l.leadLabel||"선두"}</span>
      <span className="t-body" style={{fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mobile&&l.leadShort?l.leadShort:l.lead}</span>
      {l.pts&&<span className="num t-body" style={{marginLeft:"auto",fontWeight:700}}>{l.pts}점</span>}
    </div>
  </div>;
}
function Diffs({mobile}){
  const cols=[
    {v:<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Badge k="live"/><Badge k="recheck"/><Badge k="final"/></div>,
     t:"경기 종료 ≠ 기록 확정",
     d:"휘슬이 울려도 득점·도움은 공식 기록과 대조를 거칩니다. 그 사이를 “재검증 중”으로 표시하고, 숫자가 고정되면 “확정”으로 바꿉니다. 어떤 값이 아직 움직일 수 있는지 감추지 않습니다."},
    {v:<div style={{display:"flex",gap:4}}>{["ucl","uclpo","uel","uecl","relpo","rel"].map(k=><span key={k} style={{width:26,height:8,borderRadius:2,background:ZONES[k].c}}/>)}</div>,
     t:"리그와 UCL을 한 화면에서",
     d:"순위표의 구역을 색 막대와 범례로 함께 표기합니다. UCL 직행·플레이오프·유로파·컨퍼런스·강등까지, 지금 이 팀이 어디에 서 있는지 표에서 바로 읽힙니다."},
    {v:<div style={{display:"flex",gap:6}}>{["손흥민","Son Heung-min"].map(s=><span key={s} style={{padding:"6px 10px",borderRadius:999,background:"var(--pl-fill)",fontSize:13,fontWeight:600}}>{s}</span>)}</div>,
     t:"한국어로 찾고 한국어로 읽기",
     d:"선수·팀·감독 이름을 한국어 표기로 검색합니다. 영어 이름으로도 같은 결과에 닿고, 언어 토글로 표기를 통째로 바꿀 수 있습니다."}
  ];
  return <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,minmax(0,1fr))",gap:mobile?12:20}}>
    {cols.map(c=><div key={c.t} className="card" style={{padding:mobile?16:20,display:"grid",gap:12,alignContent:"start"}}>
      <div style={{minHeight:24,display:"flex",alignItems:"center"}}>{c.v}</div>
      <span className="t-sec" style={{fontSize:mobile?17:19}}>{c.t}</span>
      <span className="t-sub" style={{lineHeight:1.7,display:"-webkit-box",WebkitLineClamp:mobile?2:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{c.d}</span>
    </div>)}
  </div>;
}
function Shortcuts({mobile}){
  const cards=[
    {t:"순위",sub:"6개 대회 순위표",rows:[["1","리버풀","65"],["2","아스널","60"],["3","맨체스터 시티","56"]],head:"EPL Top 3",zone:true},
    {t:"통계",sub:"득점·도움·평점",rows:[["1","살라 · 리버풀","18"],["2","케인 · 바이에른","16"],["5","웰벡 · 브라이턴","11"]],head:"EPL 득점"},
    {t:"팀",sub:"팔로우한 팀",rows:[["","리버풀","EPL 1위"],["","레알 마드리드","라리가 1위"],["","나폴리","세리에 A 1위"]],head:"내 팀 3"}
  ];
  return <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,minmax(0,1fr))",gap:mobile?12:20}}>
    {cards.map(c=><div key={c.t} className="card" style={{overflow:"hidden",cursor:"pointer"}}>
      <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"baseline",gap:8}}>
        <span className="t-sec" style={{fontSize:18}}>{c.t}</span><span className="t-sub">{c.sub}</span>
        <span style={{marginLeft:"auto"}}><button className={"link"+(mobile?" link-m":"")}>열기</button></span>
      </div>
      <div style={{padding:"0 16px 6px"}}><span className="t-cap">{c.head}</span></div>
      {c.rows.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"20px 1fr auto",gap:10,alignItems:"center",padding:"9px 16px",borderTop:"1px solid var(--pl-line)",position:"relative"}}>
        {c.zone&&<span style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:ZONES.ucl.c}}/>}
        <span className="num t-sub" style={{fontWeight:700}}>{r[0]}</span>
        <span className="t-body" style={{fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r[1]}</span>
        <span className="num t-sub" style={{fontWeight:700,color:"var(--pl-text)"}}>{r[2]}</span>
      </div>)}
      <div style={{padding:"10px 16px 14px",borderTop:"1px solid var(--pl-line)"}}><span className="t-cap">{c.t} 탭에서 전체 보기</span></div>
    </div>)}
  </div>;
}
function FooterBar({mobile}){
  return <div style={{borderTop:"1px solid var(--pl-line)",padding:mobile?"18px 16px 24px":"20px 0 28px",display:"flex",gap:mobile?8:24,flexWrap:"wrap",alignItems:"center"}}>
    <span className="t-card">PitchLog</span>
    <span className="t-sub">데이터 출처 API-Football</span>
    <span className="t-sub">2025/26 시즌</span>
    <span style={{marginLeft:mobile?0:"auto"}}><Stamp/></span>
  </div>;
}
function SectionHead({n,title,desc,action}){
  return <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
    <h2 className="t-sec" style={{margin:0,fontSize:22}}>{title}</h2>
    {desc&&<span className="t-sub">{desc}</span>}
    {action&&<span style={{marginLeft:"auto"}}><button className="link">{action}</button></span>}
  </div>;
}
function HomeLanding({theme,empty,h=2160}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} home/>
    <div style={{padding:"36px 80px 0",display:"grid",gap:40}}>
      <Hero empty={empty}/>
      <div style={{display:"grid",gap:16}}>
        <SectionHead title="6개 대회 현황" desc="카드를 누르면 해당 대회 순위로 이동합니다" action="모든 대회 보기"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>{LEAGUES.map(l=><LeagueCard key={l.n} l={l}/>)}</div>
      </div>
      <div style={{display:"grid",gap:16}}>
        <SectionHead title="바로 가기"/>
        <Shortcuts/>
      </div>
      <div style={{display:"grid",gap:16}}>
        <SectionHead title="PitchLog가 다르게 하는 것"/>
        <Diffs/>
      </div>
      <FooterBar/>
    </div>
  </div>;
}
function HomeLandingMobile({theme,empty,h=2040}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <StatusBarM/>
    <div style={{height:56,display:"flex",alignItems:"center",gap:4,padding:"0 8px 0 16px",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",flex:"none"}}>
      <span className="t-card" style={{fontWeight:700,letterSpacing:"-.02em",boxShadow:"inset 0 -2px 0 var(--pl-primary)"}}>PitchLog</span>
      <span style={{marginLeft:"auto",display:"flex"}}>{[["검색","M9 3a6 6 0 1 0 0 12A6 6 0 0 0 9 3zm4.5 10.5 3.5 3.5"],["메뉴","M3 6h14M3 10h14M3 14h14"]].map(([l,d])=>
        <span key={l} style={{width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-text)"}}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={d}/></svg></span>)}</span>
    </div>
    <div style={{padding:"20px 16px 0",display:"grid",gap:28}}>
      <Hero mobile empty={empty}/>
      <div style={{display:"grid",gap:12}}>
        <SectionHead title="6개 대회 현황"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{LEAGUES.map(l=><LeagueCard key={l.n} l={l} mobile/>)}</div>
      </div>
      <div style={{display:"grid",gap:12}}><SectionHead title="바로 가기"/><Shortcuts mobile/></div>
      <div style={{display:"grid",gap:12}}><SectionHead title="다르게 하는 것"/><Diffs mobile/></div>
      <FooterBar mobile/>
    </div>
  </div>;
}
Object.assign(window,{HomeLanding,HomeLandingMobile,LiveTicker,Hero,LeagueCard,Diffs,Shortcuts});
