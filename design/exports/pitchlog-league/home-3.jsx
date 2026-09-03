/* 3단계 — 홈. 1·2단계 부품만 조립한다. */
const TODAY=[
 {comp:"UCL",h:T.rma,a:T.fcb,hs:2,as:1,st:"live",time:"64′"},
 {comp:"UCL",h:T.psg,a:T.che,hs:0,as:0,st:"half",time:"45+2′"},
 {comp:"EPL",h:T.liv,a:T.bri,hs:3,as:1,st:"recheck",time:"22:00 종료"},
 {comp:"EPL",h:T.che,a:T.liv,hs:1,as:1,st:"final",time:"19:30 종료"},
 {comp:"LaLiga",h:T.rma,a:T.psg,hs:"-",as:"-",st:"sched",time:"익일 00:30"},
 {comp:"BL",h:T.bmg,a:T.fcb,hs:"-",as:"-",st:"sched",time:"익일 03:30"},
 {comp:"SA",h:T.che,a:T.bri,hs:"-",as:"-",st:"post",time:"미정"},
 {comp:"L1",h:T.psg,a:T.bmg,hs:"-",as:"-",st:"sched",time:"익일 04:45"}
];
function Line({m,onlyName}){
  return <div style={{display:"grid",gridTemplateColumns:"48px 1fr 84px",alignItems:"center",gap:12,padding:"3px 16px",minHeight:40}}>
    <span className="t-cap">{m.comp}</span>
    <div style={{display:"grid",gap:1,minWidth:0}}>
      {[[m.h,m.hs],[m.a,m.as]].map(([t,s],i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
        <Emblem t={t} size={14}/><span className="t-sub" style={{color:"var(--pl-text)",minWidth:0,flex:1,fontWeight:600}}><TeamName t={t} mode={onlyName||"full"}/></span>
        <span className="num t-sub" style={{color:"var(--pl-text)",fontWeight:700}}>{s}</span></div>)}
    </div>
    <div style={{display:"grid",gap:3,justifyItems:"end"}}><Badge k={m.st}/><span className="t-cap num">{m.time}</span></div>
  </div>;
}
function Summary({compact}){
  const items=[["진행 중","3","경기"],["오늘 경기","12","경기"],["EPL 선두","리버풀","승점 65"],["EPL 득점 1위","살라","18골"]];
  return <div className="card" style={{display:"grid",gridTemplateColumns:compact?"1fr 1fr":"repeat(4,1fr)",overflow:"hidden"}}>
    {items.map((it,i)=><div key={it[0]} style={{padding:compact?"12px 14px":"11px 18px",display:"grid",gap:2,boxShadow:i?"inset 1px 0 0 var(--pl-line)":"none"}}>
      <span className="t-cap">{it[0]}</span>
      <span className="num" style={{fontSize:compact?18:21,fontWeight:700,letterSpacing:"-.015em"}}>{it[1]}</span>
      <span className="t-sub" style={{fontSize:12}}>{it[2]}</span>
    </div>)}
  </div>;
}
/* 사이드바 — 상단 필터 칩과 형태를 다르게 한다: 라벨 + 단일 선택 리스트 */
function SideCompPicker({active="EPL"}){
  return <div className="card" style={{overflow:"hidden"}}>
    <div style={{padding:"10px 14px 8px",display:"grid",gap:2}}>
      <span className="t-cap">순위 · 기록을 볼 대회</span>
      <span className="t-sub" style={{fontSize:12}}>하나만 선택 · 위 경기 필터와 별개</span>
    </div>
    <div role="radiogroup" style={{borderTop:"1px solid var(--pl-line)",display:"grid",gridTemplateColumns:"1fr 1fr"}}>
      {CSEL.slice(1).map(([ab,full],i)=><div key={ab} role="radio" aria-checked={ab===active} style={{height:36,display:"flex",alignItems:"center",gap:8,padding:"0 12px",boxShadow:(i%2?"inset 1px 0 0 var(--pl-line),":"")+"inset 0 -1px 0 var(--pl-line)",fontSize:13,fontWeight:ab===active?700:500,background:ab===active?"var(--pl-fill)":"transparent"}}>
        <span style={{width:14,height:14,borderRadius:"50%",boxShadow:ab===active?"inset 0 0 0 4.5px var(--pl-primary)":"inset 0 0 0 1.5px var(--pl-control)",flex:"none"}}/>
        <span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{full}</span>
      </div>)}
    </div>
  </div>;
}
const TOP5=[{no:1,t:T.liv,pts:65,zone:"ucl"},{no:2,t:T.che,pts:60,zone:"ucl"},{no:3,t:T.bri,pts:56,zone:"ucl"},{no:4,t:T.bmg,pts:52,zone:"ucl"},{no:5,t:T.psg,pts:48,zone:"uel"}];
const T20=["리버풀","아스널","맨체스터 시티","첼시","뉴캐슬","애스턴 빌라","토트넘","브라이턴","본머스","풀럼","브렌트포드","팰리스","에버턴","웨스트햄","울버햄프턴","노팅엄","레스터","입스위치","사우샘프턴","번리"];
const ZONE20=n=>n<=4?"ucl":n===5?"uel":n===6?"uecl":n===18?"relpo":n>=19?"rel":null;
const TOP20=T20.map((n,i)=>({no:i+1,t:{full:n,short:n,code:n.slice(0,2)},pts:68-i*2-(i%3),zone:ZONE20(i+1)}));
function MiniStand({picker,full}){
  return <div className="card" style={{overflow:"hidden"}}>
    {picker&&<div style={{padding:"9px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid var(--pl-line)"}}>
      <span className="t-cap" style={{flex:1}}>순위 · 기록을 볼 대회 (하나만)</span>
      <span className="chip" aria-pressed="true" style={{height:32}}>EPL ▾</span>
    </div>}
    <SecHead title={full?"EPL 순위 · 전체":"EPL 순위"} action="전체 보기" sm/>
    {(full?TOP20:TOP5).map(r=><div key={r.no} className="zrow num" data-zone={r.zone||undefined} data-pat={r.zone==="uel"?"dash":r.zone==="uecl"?"dot":r.zone==="relpo"?"block":undefined} style={{"--zc":r.zone?ZONES[r.zone].c:undefined,gridTemplateColumns:"24px 1fr 40px",height:36}}>
      <span style={{fontWeight:700}}>{r.no}</span>
      <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0,fontVariantNumeric:"normal",fontWeight:600}}><Emblem t={r.t} size={18}/><TeamName t={r.t} mode="short"/></span>
      <span style={{textAlign:"right",fontWeight:700}}>{r.pts}</span></div>)}
    <div style={{padding:"8px 14px 10px",borderTop:"1px solid var(--pl-line)"}}><ZoneLegend sm/></div>
  </div>;
}
const SCORERS=[["살라",T.liv,18],["케인",T.fcb,16],["음바페",T.rma,15],["벨링엄",T.rma,12],["웰벡",T.bri,11]];
function MiniScorers(){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="EPL 득점" action="전체 보기" sm/>
    {SCORERS.map(([n,t,g],i)=><div key={n} style={{display:"grid",gridTemplateColumns:"24px auto 1fr 40px",alignItems:"center",gap:10,padding:"0 14px",height:34,borderTop:"1px solid var(--pl-line)"}}>
      <span className="num t-sub" style={{fontWeight:700}}>{i+1}</span>
      <Avatar size={24} none/>
      <span style={{minWidth:0,display:"flex",alignItems:"baseline",gap:6}}><span className="t-body" style={{fontWeight:600}}>{n}</span><span className="t-cap">{t.short}</span></span>
      <span className="num t-body" style={{textAlign:"right",fontWeight:700}}>{g}</span></div>)}
  </div>;
}
function UclQualified(){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="UCL 16강 진출" action="대진표" sm/>
    <div style={{padding:"0 14px 12px",display:"flex",flexWrap:"wrap",gap:6}}>
      {[T.rma,T.fcb,T.liv,T.psg,T.che,T.bmg].map(t=><span key={t.code} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:999,background:"var(--pl-fill)",fontSize:12,fontWeight:600}}><Emblem t={t} size={14}/>{t.short}</span>)}
      <span className="t-cap" style={{width:"100%",marginTop:2}}>남은 2자리는 3월 12일 확정</span>
    </div>
  </div>;
}
function HomeDesk({theme,empty,tall}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:tall?1560:900,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme}/>
    <div style={{flex:1,overflow:"hidden",padding:"20px 24px 0",display:"grid",gridTemplateColumns:"1fr 340px",gap:20,alignItems:"start"}}>
      <div style={{display:"grid",gap:10,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span className="t-cap">경기 필터 · 여러 개 선택</span>
          <CompChips active={empty?["L1"]:["UCL","EPL"]}/>
          <span style={{marginLeft:"auto"}}><Stamp/></span>
        </div>
        <Summary/>
        {empty
          ? <div className="card"><EmptyState title="오늘은 예정된 경기가 없습니다" desc="선택한 대회(L1)의 다음 경기는 9월 6일 토요일입니다. 다른 대회를 함께 보시겠어요?" action="6개 대회 모두 보기"/></div>
          : <React.Fragment>
              <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.35fr) minmax(0,1fr)",gap:12,alignItems:"start"}}>
                <HeroLive/>
                <div style={{display:"grid",gap:12}}>
                  <CardBasic dense h={TODAY[1].h} a={TODAY[1].a} hs={0} as={0} st="half" time="45+2′ · 하프타임" comp="UCL · 8강" w="100%"/>
                  <CardBasic dense h={TODAY[2].h} a={TODAY[2].a} hs={3} as={1} st="recheck" time="22:00 종료" comp="EPL · 28R" w="100%"/>
                </div>
              </div>
              <div className="card" style={{overflow:"hidden"}}>
                <SecHead title="오늘의 경기" action="전체 보기" sm/>
                <div style={{display:"grid",gap:1,background:"var(--pl-line)"}}>
                  {TODAY.map((m,i)=><div key={i} style={{background:"var(--pl-card)"}}><Line m={m}/></div>)}
                </div>
              </div>
            </React.Fragment>}
        {tall&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[["최근 결과",[["final","리버풀 3 - 1 브라이턴","9월 2일"],["final","첼시 0 - 2 PSG","9월 1일"],["final","바이에른 4 - 1 묀헨","8월 31일"]]],
            ["다음 경기",[["sched","레알 vs PSG","9월 4일 00:30"],["sched","묀헨 vs 바이에른","9월 4일 03:30"],["sched","PSG vs 묀헨","9월 4일 04:45"]]],
            ["UCL 16강",[["sched","레알 vs 첼시","3월 10일"],["sched","리버풀 vs PSG","3월 11일"],["sched","바이에른 vs 브라이턴","3월 11일"]]]].map(([t,rows])=>
            <div key={t} className="card" style={{overflow:"hidden"}}>
              <SecHead title={t} action="전체 보기"/>
              {rows.map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderTop:"1px solid var(--pl-line)"}}>
                <Badge k={r[0]}/><span className="t-body" style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r[1]}</span><span className="t-cap num">{r[2]}</span></div>)}
            </div>)}
        </div>}
      </div>
      <div style={{display:"grid",gap:10}}><SideCompPicker/><MiniStand/><MiniScorers/><UclQualified/></div>
    </div>
  </div>;
}
function HeroLive(){
  return <div className="card" style={{padding:16,display:"grid",gap:12}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span className="t-cap">UCL · 8강 1차전 · 산티아고 베르나베우</span><span style={{marginLeft:"auto"}}><Badge k="live"/></span></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:12}}>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0}}><Emblem t={T.rma} size={44}/><span className="t-card" style={{textAlign:"center",width:"100%"}}><TeamName t={T.rma}/></span></div>
      <div style={{display:"grid",gap:4,justifyItems:"center",minWidth:0}}><span className="num" style={{fontSize:38,fontWeight:700,letterSpacing:"-.025em"}}>2 - 1</span><span className="t-cap num">64′ 진행 중</span></div>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0}}><Emblem t={T.fcb} size={44}/><span className="t-card" style={{textAlign:"center",width:"100%"}}><TeamName t={T.fcb}/></span></div>
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center",borderTop:"1px solid var(--pl-line)",paddingTop:10}}>
      <span className="t-sub">23′ 벨링엄 · 41′ 케인 · 58′ 음바페</span>
      <span style={{marginLeft:"auto"}}><Btn sm>경기 상세</Btn></span>
    </div>
  </div>;
}
/* 모바일 — 데스크톱 순서를 그대로 쌓지 않는다. LIVE를 요약 위로 올리고 사이드바는 Top5만 남긴다. */
function MobileStats(){
  const items=[["진행 중","3"],["오늘","12"],["EPL 선두","리버풀"],["득점 1위","살라"]];
  return <div className="card" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",overflow:"hidden"}}>
    {items.map((it,i)=><div key={it[0]} style={{padding:"6px",display:"grid",gap:2,justifyItems:"center",boxShadow:i?"inset 1px 0 0 var(--pl-line)":"none"}}>
      <span className="t-cap" style={{fontSize:10}}>{it[0]}</span>
      <span className="num" style={{fontSize:15,fontWeight:700}}>{it[1]}</span>
    </div>)}
  </div>;
}
function HomeMobile({theme,empty}){
  return <Phone theme={theme}>
    <StatusBarM/>
    <div style={{height:56,display:"flex",alignItems:"center",gap:4,padding:"0 8px 0 16px",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",flex:"none"}}>
      <span className="t-card" style={{fontWeight:700,letterSpacing:"-.02em"}}>PitchLog</span>
      <span style={{marginLeft:"auto",display:"flex"}}>{[["검색","M9 3a6 6 0 1 0 0 12A6 6 0 0 0 9 3zm4.5 10.5 3.5 3.5"],["메뉴","M3 6h14M3 10h14M3 14h14"]].map(([l,d])=>
        <span key={l} style={{width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-text)"}}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={d}/></svg></span>)}</span>
    </div>
    <div style={{flex:1,overflow:"hidden"}}>
      <div style={{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",WebkitMaskImage:"linear-gradient(90deg,#000 calc(100% - 24px),transparent)"}}>
        {CSEL.map(([ab])=><Chip key={ab} m on={empty?ab==="L1":["UCL","EPL"].includes(ab)}>{ab}</Chip>)}
      </div>
      {empty
        ? <div style={{padding:"8px 16px"}}><div className="card"><EmptyState title="오늘은 예정된 경기가 없습니다" desc="선택한 대회(L1)의 다음 경기는 9월 6일 토요일입니다." action="6개 대회 모두 보기"/></div></div>
        : <div style={{display:"grid",gap:8,padding:"8px 0"}}>
            <div style={{padding:"0 16px"}}><MobileHero/></div>
            <div style={{padding:"0 16px"}}><MobileStats/></div>
            <div style={{background:"var(--pl-card)",borderTop:"1px solid var(--pl-line)",borderBottom:"1px solid var(--pl-line)"}}>
              <SecHead title="오늘의 경기" action="전체 보기"/>
              {TODAY.slice(1,3).map((m,i)=><div key={i} style={{borderTop:"1px solid var(--pl-line)"}}><Line m={m} onlyName="short"/></div>)}
              <div style={{padding:"10px 16px",borderTop:"1px solid var(--pl-line)"}}><Btn ghost style={{width:"100%"}}>오늘 경기 12건 모두 보기</Btn></div>
            </div>
            <div style={{padding:"0 16px",display:"grid",gap:8}}>
              <MiniStand picker/>
            </div>
          </div>}
    </div>
    <TabBarM active={0}/>
  </Phone>;
}
function MobileHero(){
  return <div className="card" style={{padding:14,display:"grid",gap:10}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}><span className="t-cap">UCL · 8강 1차전</span><span style={{marginLeft:"auto"}}><Badge k="live"/></span></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8}}>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0}}><Emblem t={T.rma} size={36}/><span className="t-body" style={{fontWeight:700,width:"100%",textAlign:"center"}}><TeamName t={T.rma} mode="short"/></span></div>
      <div style={{display:"grid",gap:4,justifyItems:"center"}}><span className="num" style={{fontSize:32,fontWeight:700,letterSpacing:"-.02em"}}>2 - 1</span><span className="t-cap num">64′</span></div>
      <div style={{display:"grid",gap:6,justifyItems:"center",minWidth:0}}><Emblem t={T.fcb} size={36}/><span className="t-body" style={{fontWeight:700,width:"100%",textAlign:"center"}}><TeamName t={T.fcb} mode="short"/></span></div>
    </div>
    <Btn style={{width:"100%"}}>경기 상세</Btn>
  </div>;
}
Object.assign(window,{TOP20,HomeDesk,HomeMobile,TODAY,Line,Summary,SideCompPicker,MiniStand,MiniScorers,UclQualified,HeroLive,MobileStats});
