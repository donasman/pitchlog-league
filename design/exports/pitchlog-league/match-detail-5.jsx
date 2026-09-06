/* 5-2 경기 상세 /matches/:id — 라인업 포메이션(가로·세로), 탭 4종, UCL 합산 */
const LINE_H={team:"리버풀",form:"4-3-3",players:[
 {n:1,name:"알리송",p:[5,50]},
 {n:66,name:"아널드",p:[16,16]},{n:5,name:"코나테",p:[15,38]},{n:4,name:"반다이크",p:[15,62],c:"C"},{n:26,name:"로버트슨",p:[16,84]},
 {n:8,name:"소보슬라이",p:[29,26],a:1},{n:6,name:"엔도",p:[28,50],y:1},{n:10,name:"맥알리스터",p:[29,74]},
 {n:11,name:"살라",p:[42,18],g:2},{n:9,name:"누녜스",p:[43,50],s:1},{n:7,name:"디아스",p:[42,82],g:1}]};
const LINE_A={team:"브라이턴",form:"4-2-3-1",players:[
 {n:23,name:"페르브루헌",p:[95,50]},
 {n:34,name:"판헤케",p:[85,20]},{n:5,name:"둥쿠",p:[86,42]},{n:29,name:"베르흐발",p:[86,58]},{n:3,name:"에스투피냔",p:[85,80]},
 {n:20,name:"발레바",p:[74,36]},{n:14,name:"아이야리",p:[74,64],y:1},
 {n:11,name:"미토마",p:[64,20]},{n:10,name:"주앙 페드루",p:[63,50],g:1},{n:7,name:"히나셰로",p:[64,80],s:1},
 {n:9,name:"웰벡",p:[54,50]}]};
const UCL_H={team:"레알 마드리드",form:"4-3-3",players:[
 {n:1,name:"쿠르투아",p:[5,50]},
 {n:2,name:"카르바할",p:[16,16]},{n:3,name:"밀리탕",p:[15,38]},{n:22,name:"뤼디거",p:[15,62],c:"C"},{n:23,name:"멘디",p:[16,84]},
 {n:8,name:"발베르데",p:[29,26]},{n:12,name:"카마빙가",p:[28,50],y:1},{n:5,name:"벨링엄",p:[29,74],g:1},
 {n:11,name:"로드리고",p:[42,18]},{n:9,name:"음바페",p:[43,50],s:1},{n:7,name:"비니시우스",p:[42,82]}]};
const UCL_A={team:"바이에른 뮌헨",form:"4-2-3-1",players:[
 {n:1,name:"노이어",p:[95,50]},
 {n:44,name:"키미히",p:[85,20]},{n:2,name:"우파메카노",p:[86,42]},{n:4,name:"김민재",p:[86,58]},{n:19,name:"데이비스",p:[85,80]},
 {n:6,name:"고레츠카",p:[74,36],y:1},{n:45,name:"파블로비치",p:[74,64]},
 {n:42,name:"뮈시알라",p:[64,20],g:1},{n:10,name:"자네",p:[63,50],a:1},{n:7,name:"코망",p:[64,80],s:1},
 {n:9,name:"케인",p:[54,50],g:1}]};
function Marker({p,vertical,away}){
  const [x,y]=p.p;
  const pos=vertical?{top:(100-x)+"%",left:y+"%"}:{left:x+"%",top:y+"%"};
  return <div style={{position:"absolute",...pos,transform:"translate(-50%,-50%)",display:"grid",justifyItems:"center",gap:3,width:60}}>
    <span style={{width:30,height:30,borderRadius:"50%",display:"grid",placeItems:"center",background:away?"var(--pl-card)":"var(--pl-text)",color:away?"var(--pl-text)":"var(--pl-bg)",boxShadow:away?"inset 0 0 0 1.5px var(--pl-control)":"none",fontSize:12,fontWeight:700,fontVariantNumeric:"tabular-nums",position:"relative"}}>
      {p.n}
      {p.g&&<span style={{position:"absolute",right:-6,top:-4,width:15,height:15,borderRadius:"50%",background:"var(--st-pos)",color:"#fff",fontSize:9,fontWeight:700,display:"grid",placeItems:"center"}}>{p.g}</span>}
      {p.y&&<span style={{position:"absolute",left:-6,top:-4,width:9,height:12,borderRadius:2,background:"var(--st-warn)"}}/>}
      {p.s&&<span style={{position:"absolute",right:-6,bottom:-4,width:15,height:15,borderRadius:"50%",background:"var(--pl-fill-2)",color:"var(--pl-text)",fontSize:9,fontWeight:700,display:"grid",placeItems:"center"}}>↓</span>}
    </span>
    <span style={{fontSize:10,fontWeight:600,textAlign:"center",lineHeight:1.2,textShadow:"0 1px 2px var(--pl-card)"}}>{p.name}</span>
  </div>;
}
function Pitch({vertical,height=380,home=LINE_H,away=LINE_A}){
  const line="var(--pl-line)";
  return <div style={{position:"relative",height,borderRadius:12,background:"var(--pl-fill)",overflow:"hidden"}}>
    <svg width="100%" height="100%" viewBox={vertical?"0 0 100 160":"0 0 160 100"} preserveAspectRatio="none" style={{position:"absolute",inset:0}} aria-hidden="true">
      <g fill="none" stroke={line} strokeWidth="0.6">
        <rect x="2" y="2" width={vertical?96:156} height={vertical?156:96}/>
        {vertical?<React.Fragment><line x1="2" y1="80" x2="98" y2="80"/><circle cx="50" cy="80" r="14"/><rect x="26" y="2" width="48" height="20"/><rect x="26" y="138" width="48" height="20"/></React.Fragment>
          :<React.Fragment><line x1="80" y1="2" x2="80" y2="98"/><circle cx="80" cy="50" r="14"/><rect x="2" y="26" width="20" height="48"/><rect x="138" y="26" width="20" height="48"/></React.Fragment>}
      </g>
    </svg>
    {home.players.map(p=><Marker key={"h"+p.n} p={p} vertical={vertical}/>)}
    {away.players.map(p=><Marker key={"a"+p.n} p={p} vertical={vertical} away/>)}
  </div>;
}
function Bench({team,players}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title={`${team} 벤치`} action="선수 통계" sm/>
    {players.map((p,i)=><div key={p[0]} style={{display:"grid",gridTemplateColumns:"28px 1fr auto",gap:8,alignItems:"center",padding:"0 14px",minHeight:44,borderTop:"1px solid var(--pl-line)"}}>
      <span className="num t-sub" style={{fontWeight:700}}>{p[0]}</span>
      <span className="t-body" style={{fontWeight:600}}>{p[1]}</span>
      <span className="t-cap">{p[2]}</span></div>)}
  </div>;
}
const MATCH_TABS=["라인업","통계","H2H","타임라인"];
const STATS_ROWS=[["점유율","58%","42%",58],["슈팅","17","9",65],["유효 슈팅","8","3",73],["코너","9","4",69],["파울","7","13",35],["패스 성공률","87%","74%",54]];
const TIMELINE=[["23′","골","살라 (도움 소보슬라이)","h","g"],["41′","경고","아이야리","a","y"],["45+2′","하프타임","0 - 1","","-"],["58′","골","디아스","h","g"],["66′","교체","누녜스 → 가쿠포","h","s"],["71′","골","주앙 페드루","a","g"],["77′","골 (수정)","살라","h","g"],["90+4′","종료","3 - 1","","-"]];
const H2H=[["2025-03-14","EPL","리버풀 2 - 1 브라이턴"],["2024-11-02","EPL","브라이턴 1 - 1 리버풀"],["2024-05-19","EPL","리버풀 2 - 1 브라이턴"],["2024-01-28","FA컵","브라이턴 1 - 2 리버풀"],["2023-10-08","EPL","브라이턴 2 - 2 리버풀"]];
function StatusNotice({status}){
  if(status==="recheck") return <div style={{display:"flex",gap:10,alignItems:"center",padding:"12px 16px",borderRadius:12,background:"color-mix(in srgb,var(--st-warn) 10%,var(--pl-card))",boxShadow:"inset 0 0 0 1px var(--pl-line)"}}>
    <Badge k="recheck"/><span className="t-body">이 숫자는 아직 확정이 아닙니다. 공식 기록과 대조 중이며 득점·도움이 바뀔 수 있습니다. 보통 3분 이내에 끝납니다.</span>
    <span style={{marginLeft:"auto"}}><Btn sm ghost>변경 시 알림</Btn></span>
  </div>;
  if(status==="final") return <div style={{display:"flex",gap:10,alignItems:"center",padding:"12px 16px",borderRadius:12,background:"color-mix(in srgb,var(--st-pos) 10%,var(--pl-card))",boxShadow:"inset 0 0 0 1px var(--pl-line)"}}>
    <Badge k="final"/><span className="t-body">21:58 공식 기록과 일치. 이후 수정되지 않습니다.</span></div>;
  return <div style={{display:"flex",gap:10,alignItems:"center",padding:"12px 16px",borderRadius:12,background:"var(--pl-card)",boxShadow:"inset 0 0 0 1px var(--pl-line)"}}>
    <Badge k="ft"/><span className="t-body">경기는 끝났지만 아직 공식 기록 대조 전입니다.</span></div>;
}
function ScoreHead({ucl,status,mobile}){
  const h=ucl?{name:"레알 마드리드",short:"레알"}:{name:"리버풀",short:"리버풀"};
  const a=ucl?{name:"바이에른 뮌헨",short:"바이에른"}:{name:"브라이턴 앤 호브 알비온",short:"브라이턴"};
  return <div className="card" style={{padding:mobile?14:18,display:"grid",gap:12}}>
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span className="t-cap">{ucl?"UCL · 8강 2차전 · 알리안츠 아레나":"EPL · 28R · 안필드"}</span>
      <span className="t-cap num">{ucl?"9월 10일 05:00 KST":"9월 3일 22:00 KST"}</span>
      <span style={{marginLeft:"auto"}}><Badge k={status}/></span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:12}}>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0}}><Crest t={h.name} size={mobile?38:48}/><span className={mobile?"t-body":"t-card"} style={{fontWeight:700,textAlign:"center",width:"100%"}}><span className="tname">{mobile?h.short:h.name}</span></span></div>
      <div style={{display:"grid",gap:4,justifyItems:"center"}}>
        <span className="num" style={{fontSize:mobile?34:42,fontWeight:700,letterSpacing:"-.025em"}}>{ucl?"1 - 2":"3 - 1"}</span>
        <span className="t-cap num">{ucl?"90+3′ 종료":"90+4′ 종료"}</span>
      </div>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0}}><Crest t={a.name} size={mobile?38:48}/><span className={mobile?"t-body":"t-card"} style={{fontWeight:700,textAlign:"center",width:"100%"}}><span className="tname">{mobile?a.short:a.name}</span></span></div>
    </div>
    {ucl&&<div style={{borderTop:"1px solid var(--pl-line)",paddingTop:10,display:"grid",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span className="t-cap">1차전 원정 2 - 1 승</span><span className="t-cap">2차전 홈 1 - 2 패</span>
        <span className="badge b-final">합산 3 - 4</span>
        <span className="t-body" style={{fontWeight:700}}>바이에른 뮌헨 4강 진출</span>
      </div>
      <span className="t-cap">연장 없음 · 원정 다득점 규칙 미적용</span>
    </div>}
  </div>;
}
function TabRow({active="라인업",mobile}){
  return <div style={{display:"flex",background:"var(--pl-card)",borderRadius:mobile?0:12,boxShadow:mobile?"none":"inset 0 0 0 1px var(--pl-line)",borderBottom:mobile?"1px solid var(--pl-line)":"none",overflow:"hidden"}}>
    {MATCH_TABS.map(t=><span key={t} style={{flex:mobile?1:"none",minWidth:mobile?0:120,minHeight:44,display:"grid",placeItems:"center",fontSize:14,fontWeight:t===active?700:500,color:t===active?"var(--pl-text)":"var(--pl-sub)",boxShadow:t===active?"inset 0 -2px 0 var(--pl-primary)":"none"}}>{t}</span>)}
  </div>;
}
function StatsPanel(){
  return <div className="card" style={{padding:16,display:"grid",gap:12}}>
    {STATS_ROWS.map(r=><div key={r[0]} style={{display:"grid",gap:6}}>
      <div style={{display:"grid",gridTemplateColumns:"60px 1fr 60px",alignItems:"center"}}>
        <span className="num t-body" style={{fontWeight:700}}>{r[1]}</span>
        <span className="t-sub" style={{textAlign:"center"}}>{r[0]}</span>
        <span className="num t-body" style={{fontWeight:700,textAlign:"right"}}>{r[2]}</span>
      </div>
      <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",background:"var(--pl-fill-2)"}}>
        <span style={{width:r[3]+"%",background:"var(--pl-text)"}}/><span style={{flex:1,background:"var(--pl-fill-2)"}}/>
      </div>
    </div>)}
  </div>;
}
function TimelinePanel({compact}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="타임라인" sm/>
    {TIMELINE.map((e,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"56px 1fr auto",gap:10,alignItems:"center",padding:"0 16px",minHeight:48,borderTop:"1px solid var(--pl-line)",background:e[3]===""?"var(--pl-fill)":"transparent"}}>
      <span className="num t-sub" style={{fontWeight:700,color:"var(--pl-text)"}}>{e[0]}</span>
      <span className="t-body"><span style={{fontWeight:600}}>{e[1]}</span> <span className="t-sub">· {e[2]}</span></span>
      <span className="t-cap">{e[3]==="h"?"리버풀":e[3]==="a"?"브라이턴":""}</span>
    </div>)}
  </div>;
}
function H2HPanel(){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="맞대결 최근 5경기" action="전체 기록" sm/>
    <div style={{padding:"12px 16px",display:"flex",gap:16,borderTop:"1px solid var(--pl-line)"}}>
      {[["리버풀 승","3"],["무",""+2],["브라이턴 승","0"]].map(s=><span key={s[0]} className="t-sub">{s[0]} <b className="num" style={{color:"var(--pl-text)"}}>{s[1]}</b></span>)}
    </div>
    {H2H.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"104px 56px 1fr",gap:10,alignItems:"center",padding:"0 16px",minHeight:44,borderTop:"1px solid var(--pl-line)"}}>
      <span className="num t-sub">{r[0]}</span><span className="t-cap">{r[1]}</span><span className="t-body">{r[2]}</span></div>)}
  </div>;
}
function MatchDetail({theme,tab="라인업",status="recheck",ucl,h=1080}){
  const H=ucl?UCL_H:LINE_H,A=ucl?UCL_A:LINE_A;
  const star=ucl?{n:9,name:"케인",team:"바이에른 뮌헨",pos:"FW",rows:[["출전 시간","90′"],["골","1"],["도움","0"],["슈팅 (유효)","5 (3)"],["평점","8.2"]]}:{n:11,name:"살라",team:"리버풀",pos:"FW",rows:[["출전 시간","90′"],["골","2"],["도움","1"],["슈팅 (유효)","6 (4)"],["평점","9.1"]]};
  const bench=ucl?{team:"바이에른 뮌헨",list:[["18","고레츠카","MF"],["17","올리세","FW"],["27","라이머","DF"],["25","뮐러","MF"],["26","울라이히","GK"]]}:{team:"리버풀",list:[["62","켈러허","GK"],["18","가쿠포","FW"],["17","존스","MF"],["19","엘리엇","MF"],["21","치미카스","DF"]]};
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="경기"/>
    <div style={{padding:"18px 40px 0",display:"grid",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button className="link">경기 목록</button><span className="t-cap">/</span><span className="t-cap">{ucl?"UCL 8강 2차전":"EPL 28R"}</span>
        <span style={{marginLeft:"auto"}}><Stamp t="21:58"/></span>
      </div>
      <ScoreHead status={status} ucl={ucl}/>
      <StatusNotice status={status}/>
      <TabRow active={tab}/>
      {tab==="라인업"&&<div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:16,alignItems:"start"}}>
        <div className="card" style={{padding:16,display:"grid",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span className="t-card">{H.team} {H.form}</span>
            <span className="t-sub">홈 · 어두운 마커</span>
            <span style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center"}}>
              <span className="t-sub">원정 · 흰 마커</span><span className="t-card">{A.team} {A.form}</span>
            </span>
          </div>
          <Pitch height={420} home={H} away={A}/>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {[["득점","var(--st-pos)"],["경고","var(--st-warn)"],["교체","var(--pl-fill-2)"]].map(l=>
              <span key={l[0]} className="t-cap" style={{display:"inline-flex",alignItems:"center",gap:6}}><i style={{width:12,height:12,borderRadius:"50%",background:l[1],display:"block"}}/>{l[0]}</span>)}
            <span className="t-cap">선수를 누르면 우측 패널에 기록이 열립니다</span>
          </div>
        </div>
        <div style={{display:"grid",gap:16}}>
          <div className="card" style={{padding:16,display:"grid",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{width:32,height:32,borderRadius:"50%",background:"var(--pl-text)",color:"var(--pl-bg)",display:"grid",placeItems:"center",fontWeight:700,fontSize:13}} className="num">{star.n}</span>
              <div style={{display:"grid"}}><span className="t-card">{star.name}</span><span className="t-cap">{star.team} · {star.pos}</span></div>
              <span style={{marginLeft:"auto"}}><Badge k="final"/></span>
            </div>
            <hr className="hr"/>
            {star.rows.map(r=>
              <div key={r[0]} style={{display:"flex",justifyContent:"space-between"}}><span className="t-sub">{r[0]}</span><span className="num t-body" style={{fontWeight:700}}>{r[1]}</span></div>)}
            <Btn sm ghost>선수 페이지</Btn>
          </div>
          <Bench team={bench.team} players={bench.list}/>
        </div>
      </div>}
      {tab==="통계"&&<div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:16,alignItems:"start"}}><StatsPanel/><TimelinePanel compact/></div>}
      {tab==="H2H"&&<div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:16,alignItems:"start"}}><H2HPanel/><Bench team="브라이턴" players={[["1","스틸","GK"],["8","그로스","MF"],["24","페리","DF"],["27","히나셰로","MF"],["19","페르구손","FW"]]}/></div>}
      {tab==="타임라인"&&<div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:16,alignItems:"start"}}><TimelinePanel/><StatsPanel/></div>}
    </div>
  </div>;
}
function MatchDetailMobile({theme,status="recheck",ucl,h=1100}){
  const H=ucl?UCL_H:LINE_H,A=ucl?UCL_A:LINE_A;
  const bench=ucl?{team:"바이에른 뮌헨",list:[["17","올리세","FW"],["25","뮐러","MF"],["26","울라이히","GK"]]}:{team:"리버풀",list:[["62","켈러허","GK"],["18","가쿠포","FW"],["17","존스","MF"]]};
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <StatusBarM/><TopBarM title={ucl?"레알 1 - 2 바이에른":"리버풀 3 - 1 브라이턴"} back/>
    <div style={{flex:1,overflow:"hidden",display:"grid",gap:8,alignContent:"start"}}>
      <div style={{padding:"8px 16px 0"}}><ScoreHead status={status} ucl={ucl} mobile/></div>
      <div style={{padding:"0 16px"}}><StatusNotice status={status}/></div>
      <TabRow mobile/>
      <div style={{padding:"4px 16px",display:"grid",gap:10}}>
        <div className="card" style={{padding:12,display:"grid",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="t-card">{A.team} {A.form}</span>
            <span className="t-cap" style={{marginLeft:"auto"}}>원정 · 흰 마커</span>
          </div>
          <Pitch vertical height={480} home={H} away={A}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="t-card">{H.team} {H.form}</span>
            <span className="t-cap" style={{marginLeft:"auto"}}>홈 · 어두운 마커</span>
          </div>
          <span className="t-cap">선수를 누르면 하단 시트로 기록이 열립니다</span>
        </div>
        <Bench team={bench.team} players={bench.list}/>
      </div>
    </div>
    <TabBarM active={1}/>
  </div>;
}
/* 선수 목록 /players */
const PLAYER_ROWS=[["살라","리버풀","FW","EPL",27,18,11],["케인","바이에른","FW","BL",25,19,7],["음바페","레알","FW","LaLiga",26,18,6],["벨링엄","레알","MF","LaLiga",25,13,9],["야말","바르셀로나","FW","LaLiga",24,14,10],["소보슬라이","리버풀","MF","EPL",26,5,11],["오시멘","나폴리","FW","SA",24,12,4],["뎀벨레","PSG","FW","L1",23,12,8],["미토마","브라이턴","FW","EPL",22,7,6],["뮈시알라","바이에른","MF","BL",23,9,9]];
function PlayersList({theme,h=980}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="통계"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"baseline",gap:12}}>
        <h1 className="t-page" style={{margin:0,fontSize:26}}>선수</h1><span className="t-sub num">6개 대회 2,418명</span>
        <span style={{marginLeft:"auto"}}><Stamp/></span>
      </div>
      <div className="card" style={{padding:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span className="t-cap" style={{width:40}}>필터</span>
        {CSEL.map(([ab],i)=><Chip key={ab} on={i===0}>{ab}</Chip>)}
        <FilterSelect label="포지션" value="전체"/><FilterSelect label="팀" value="전체"/>
        <span style={{marginLeft:"auto"}}><button className="link">이름으로 검색</button></span>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div className="t-cap" style={{display:"grid",gridTemplateColumns:"36px 1fr 150px 70px 70px 70px 70px",gap:10,padding:"0 16px",height:34,alignItems:"center"}}>
          <span>#</span><span>선수</span><span>소속</span><span style={{textAlign:"center"}}>대회</span>
          <span style={{textAlign:"right"}}>출전</span><span style={{textAlign:"right"}}>골</span><span style={{textAlign:"right"}}>도움</span>
        </div>
        {PLAYER_ROWS.map((r,i)=><div key={r[0]} style={{display:"grid",gridTemplateColumns:"36px 1fr 150px 70px 70px 70px 70px",gap:10,padding:"0 16px",height:52,alignItems:"center",borderTop:"1px solid var(--pl-line)"}}>
          <span className="num t-sub" style={{fontWeight:700}}>{i+1}</span>
          <span style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><Avatar size={28} none/>
            <span style={{minWidth:0,display:"grid"}}><span className="t-body" style={{fontWeight:600}}>{r[0]}</span><span className="t-cap">{r[2]}</span></span></span>
          <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}><Crest t={r[1]} size={18}/><span className="t-sub" style={{color:"var(--pl-text)"}}>{r[1]}</span></span>
          <span className="t-cap" style={{textAlign:"center"}}>{r[3]}</span>
          {[r[4],r[5],r[6]].map((v,j)=><span key={j} className="num t-body" style={{textAlign:"right",fontWeight:j?700:500,color:j?"var(--pl-text)":"var(--pl-sub)"}}>{v}</span>)}
        </div>)}
      </div>
      <span className="t-cap">한국어 표기로 검색합니다 — “손흥민”과 “Son” 모두 같은 결과로 이어집니다</span>
    </div>
  </div>;
}
Object.assign(window,{MatchDetail,MatchDetailMobile,PlayersList,Pitch,ScoreHead,StatusNotice,TabRow});
