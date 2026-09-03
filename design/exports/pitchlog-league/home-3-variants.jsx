/* 홈 데스크톱 레이아웃 시안 B·C·D — 콘텐츠는 A안과 동일, 배치만 다르다 */
function TopFilterRow({label="경기 필터 · 여러 개 선택",active=["UCL","EPL"]}){
  return <div style={{display:"flex",alignItems:"center",gap:12}}>
    <span className="t-cap">{label}</span><CompChips active={active}/>
    <span style={{marginLeft:"auto"}}><Stamp/></span>
  </div>;
}
function TodayList({n=8,title="오늘의 경기",dense}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title={title} action="전체 보기" sm/>
    <div style={{display:"grid",gap:1,background:"var(--pl-line)"}}>
      {Array.from({length:n}).map((_,i)=><div key={i} style={{background:"var(--pl-card)"}}><Line m={TODAY[i%TODAY.length]} onlyName={dense?"short":"full"}/></div>)}
    </div>
  </div>;
}
/* B — 히어로를 가로 배너로 눕히고 목록을 늘린다 */
function HeroBanner(){
  return <div className="card" style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"auto auto 1fr auto",alignItems:"center",gap:20}}>
    <div style={{display:"grid",gap:4}}><Badge k="live"/><span className="t-cap">UCL · 8강 1차전</span></div>
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <span style={{display:"flex",alignItems:"center",gap:8}}><Emblem t={T.rma} size={28}/><span className="t-card">레알 마드리드</span></span>
      <span className="num" style={{fontSize:30,fontWeight:700,letterSpacing:"-.02em"}}>2 - 1</span>
      <span style={{display:"flex",alignItems:"center",gap:8}}><span className="t-card">바이에른 뮌헨</span><Emblem t={T.fcb} size={28}/></span>
    </div>
    <span className="t-sub" style={{paddingLeft:8}}>64′ · 23′ 벨링엄 · 41′ 케인 · 58′ 음바페</span>
    <Btn sm>경기 상세</Btn>
  </div>;
}
function HomeB({theme}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:900,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme}/>
    <div style={{flex:1,overflow:"hidden",padding:"20px 24px 0",display:"grid",gridTemplateColumns:"1fr 340px",gap:20,alignItems:"start"}}>
      <div style={{display:"grid",gap:10,minWidth:0}}>
        <TopFilterRow/>
        <HeroBanner/>
        <Summary/>
        <TodayList n={9}/>
      </div>
      <div style={{display:"grid",gap:10}}>
        <SideCompPicker/><MiniStand/><MiniScorers/>
      </div>
    </div>
  </div>;
}
/* C — 3열. 좌측 레일에 경기 필터(체크박스), 우측에 순위·기록 */
function FilterRail(){
  return <div className="card" style={{overflow:"hidden"}}>
    <div style={{padding:"10px 12px 8px"}}><span className="t-cap">경기 필터 · 여러 개</span></div>
    <div style={{borderTop:"1px solid var(--pl-line)"}}>
      {CSEL.map(([ab,full],i)=>{const on=["UCL","EPL"].includes(ab);
        return <div key={ab} style={{height:38,display:"flex",alignItems:"center",gap:8,padding:"0 12px",borderBottom:"1px solid var(--pl-line)",fontSize:13,fontWeight:on?700:500}}>
          <span style={{width:15,height:15,borderRadius:4,flex:"none",background:on?"var(--pl-primary)":"transparent",boxShadow:on?"none":"inset 0 0 0 1.5px var(--pl-control)",display:"grid",placeItems:"center",color:"var(--pl-on-primary)"}}>
            {on&&<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 6.3 4.6 9 10 3.4"/></svg>}
          </span>
          <span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{full}</span>
        </div>;})}
    </div>
  </div>;
}
function HomeC({theme}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:900,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme}/>
    <div style={{flex:1,overflow:"hidden",padding:"20px 24px 0",display:"grid",gridTemplateColumns:"196px 1fr 320px",gap:16,alignItems:"start"}}>
      <div style={{display:"grid",gap:10}}><FilterRail/><div className="card" style={{padding:"10px 12px",display:"grid",gap:6}}><span className="t-cap">데이터</span><Stamp/></div></div>
      <div style={{display:"grid",gap:10,minWidth:0}}>
        <Summary/>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:10}}>
          <CardBasic dense h={T.rma} a={T.fcb} hs={2} as={1} st="live" time="64′ 진행 중" comp="UCL · 8강" w="100%"/>
          <CardBasic dense h={T.psg} a={T.che} hs={0} as={0} st="half" time="45+2′" comp="UCL · 8강" w="100%"/>
        </div>
        <TodayList n={9}/>
      </div>
      <div style={{display:"grid",gap:10}}><MiniStand picker/><MiniScorers/><UclQualified/></div>
    </div>
  </div>;
}
/* D — 대회별 보드. 히어로 없이 6개 대회를 같은 무게로 편다 */
function CompCard({name,rows}){
  return <div className="card" style={{overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderBottom:"1px solid var(--pl-line)"}}>
      <span className="t-card">{name}</span>
      <span className="t-cap" style={{marginLeft:"auto"}}>{rows.length}경기</span>
      <button className="link">전체 보기</button>
    </div>
    {rows.map((m,i)=><div key={i} style={{borderTop:i?"1px solid var(--pl-line)":"none"}}><Line m={m} onlyName="short"/></div>)}
  </div>;
}
function HomeD({theme}){
  const g=[["UCL",[TODAY[0],TODAY[1]]],["EPL",[TODAY[2],TODAY[3]]],["라리가",[TODAY[4],TODAY[0]]],["분데스리가",[TODAY[5],TODAY[1]]],["세리에 A",[TODAY[6],TODAY[2]]],["리그 1",[TODAY[7],TODAY[3]]]];
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:900,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme}/>
    <div style={{flex:1,overflow:"hidden",padding:"20px 24px 0",display:"grid",gap:12,alignContent:"start"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,alignItems:"center"}}>
        <TopFilterRow label="경기 필터 · 여러 개 선택" active={["전체"]}/>
        <span className="t-cap">아래 카드는 대회별 오늘 경기</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,alignItems:"start"}}>
        <div style={{display:"grid",gap:12,minWidth:0}}>
          <Summary/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>{g.map(([n,rows])=><CompCard key={n} name={n} rows={rows}/>)}</div>
        </div>
        <div style={{display:"grid",gap:12}}><MiniStand picker/><MiniScorers/></div>
      </div>
    </div>
  </div>;
}
Object.assign(window,{HomeB,HomeC,HomeD,FilterRail,TopFilterRow,TodayList,HeroBanner,CompCard});
