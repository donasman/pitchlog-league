/* 6단계 P1 — 대회 허브 / UCL 녹아웃 / 통계 */
const TEAMS20=["리버풀","아스널","맨체스터 시티","첼시","뉴캐슬","애스턴 빌라","토트넘","브라이턴","본머스","풀럼","브렌트포드","팰리스","에버턴","웨스트햄","울버햄프턴","노팅엄","레스터","입스위치","사우샘프턴","번리"];
const zone20=n=>n<=4?["ucl","solid"]:n===5?["uel","dash"]:n===6?["uecl","dot"]:n===18?["relpo","block"]:n>=19?["rel","solid"]:[null,null];
const HUB_ROWS=TEAMS20.slice(0,8).map((n,i)=>({no:i+1,name:n,pl:28,w:20-i,d:(i*3)%5,pts:68-i*3,gd:34-i*4}));
function HubStand({rows=HUB_ROWS}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="순위" action="전체 순위 보기" sm/>
    <div className="zrow t-cap" style={{gridTemplateColumns:"30px 1fr 44px 44px 46px",height:32}}>
      <span>#</span><span>팀</span><span style={{textAlign:"center"}}>경기</span><span style={{textAlign:"center"}}>득실</span><span style={{textAlign:"right"}}>승점</span>
    </div>
    {rows.map(r=>{const [z,p]=zone20(r.no);
      return <div key={r.no} className="zrow num" data-zone={z||undefined} data-pat={p||undefined} style={{"--zc":z?ZONES[z].c:undefined,gridTemplateColumns:"30px 1fr 44px 44px 46px",height:38}}>
        <span style={{fontWeight:700}}>{r.no}</span>
        <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0,fontVariantNumeric:"normal",fontWeight:600}}><Crest t={r.name} size={18}/><span className="tname">{r.name}</span></span>
        <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.pl}</span>
        <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.gd>0?"+"+r.gd:r.gd}</span>
        <span style={{textAlign:"right",fontWeight:700}}>{r.pts}</span></div>;})}
    <div style={{padding:"10px 14px",borderTop:"1px solid var(--pl-line)"}}><StandLegend mode="domestic" sm/></div>
  </div>;
}
function RankCard({title,rows,unit,action="전체 보기"}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title={title} action={action} sm/>
    {rows.map((r,i)=><div key={r[0]} style={{display:"grid",gridTemplateColumns:"22px 1fr auto",gap:10,alignItems:"center",padding:"0 14px",height:40,borderTop:"1px solid var(--pl-line)"}}>
      <span className="num t-sub" style={{fontWeight:700}}>{i+1}</span>
      <span style={{minWidth:0,display:"flex",alignItems:"baseline",gap:6}}><span className="t-body" style={{fontWeight:600}}>{r[0]}</span><span className="t-cap">{r[1]}</span></span>
      <span className="num t-body" style={{fontWeight:700}}>{r[2]}{unit}</span></div>)}
  </div>;
}
const SCORER_ROWS=[["살라","리버풀",18],["케인","바이에른",16],["음바페","레알",15],["벨링엄","레알",12],["웰벡","브라이턴",11]];
const ASSIST_ROWS=[["소보슬라이","리버풀",11],["데 브라위너","맨시티",10],["뮈시알라","바이에른",9],["야말","바르셀로나",9],["살라","리버풀",8]];
function HubMatches({ucl}){
  const rows=ucl?[DAYS[0].items[0],DAYS[0].items[1]]:[DAYS[0].items[2],DAYS[0].items[3],DAYS[1].items[0]];
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title={ucl?"8강 1차전":"28라운드"} action="전체 일정" sm/>
    <div style={{padding:"0 14px 12px",display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
      {rows.map((m,i)=><MatchRowCard key={i} m={m}/>)}
    </div>
  </div>;
}
function TeamChips({n=20}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title={`참가 팀 ${n}`} action="팀 목록" sm/>
    <div style={{padding:"0 14px 14px",display:"flex",flexWrap:"wrap",gap:8}}>
      {TEAMS20.slice(0,n).map(t=><span key={t} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:999,background:"var(--pl-fill)",fontSize:13,fontWeight:600}}><Crest t={t} size={16}/>{t}</span>)}
    </div>
  </div>;
}
function CompHub({theme,ucl,h=1120}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="순위"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <Crest t={ucl?"챔피언스리그":"프리미어리그"} size={40}/>
        <div style={{display:"grid"}}>
          <h1 className="t-page" style={{margin:0,fontSize:26}}>{ucl?"UEFA 챔피언스리그":"프리미어리그"}</h1>
          <span className="t-sub">{ucl?"2025/26 · 리그 페이즈 종료 · 8강 진행 중":"2025/26 · 28라운드 진행 중"}</span>
        </div>
        <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <Stamp/>
          {ucl&&<Btn sm>녹아웃 대진표</Btn>}
          <Btn sm ghost>시즌 2025/26</Btn>
        </span>
      </div>
      <div style={{display:"flex",gap:8}}>{["개요","순위","일정","선수","팀"].map((t,i)=><Chip key={t} on={i===0}>{t}</Chip>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 380px",gap:16,alignItems:"start"}}>
        <div style={{display:"grid",gap:16,minWidth:0}}>
          <HubMatches ucl={ucl}/>
          <HubStand rows={ucl?HUB_ROWS.map((r,i)=>({...r,name:UCL_TEAMS[i],pl:6,pts:16-i*2})):HUB_ROWS}/>
          <TeamChips n={ucl?12:20}/>
        </div>
        <div style={{display:"grid",gap:16}}>
          {ucl&&<div className="card" style={{padding:16,display:"grid",gap:10}}>
            <span className="t-card">녹아웃 대진</span>
            <span className="t-sub">플레이오프부터 결승까지 대진과 합산 점수를 한 화면에서 봅니다.</span>
            <Btn>대진표 열기</Btn>
          </div>}
          <RankCard title="득점 Top 5" rows={SCORER_ROWS} unit="골"/>
          <RankCard title="도움 Top 5" rows={ASSIST_ROWS} unit="도움"/>
        </div>
      </div>
    </div>
  </div>;
}
/* 2. UCL 녹아웃 */
const TIES={
 po:[["레알 마드리드","맨체스터 시티",[3,2],[1,1],"레알 마드리드"],["도르트문트","포르투",[1,0],[2,2],"도르트문트"],["아탈란타","브뤼헤",[2,1],[0,1],"아탈란타"],["벤피카","모나코",[1,0],[3,3],"벤피카"]],
 r16:[["레알 마드리드","아틀레티코",[2,1],[1,0],"레알 마드리드"],["바이에른 뮌헨","레버쿠젠",[3,0],[2,0],"바이에른 뮌헨"],["리버풀","PSG",[0,1],[1,0],"PSG"],["인터 밀란","페예노르트",[2,0],[2,1],"인터 밀란"]],
 qf:[["레알 마드리드","바이에른 뮌헨",[2,1],null,null],["PSG","아스널",[0,0],null,null]],
 sf:[["TBD","TBD",null,null,null]],
 f:[["TBD","TBD",null,null,null]]
};
function TieCard({t,compact}){
  const [h,a,l1,l2,win]=t;
  const agg=l1&&l2?[l1[0]+l2[1],l1[1]+l2[0]]:null;
  const state=!l1?"예정":l2?"완료":"1차전 종료";
  const tbd=h==="TBD";
  return <div className="card" style={{padding:12,display:"grid",gap:8,opacity:tbd?.72:1}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span className="t-cap">{state}</span>
      {agg&&<span className="badge b-final">합산 {agg[0]} - {agg[1]}</span>}
      {!agg&&l1&&<span className="badge b-recheck">2차전 대기</span>}
    </div>
    {[[h,0],[a,1]].map(([team,idx])=><div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 26px 26px",gap:8,alignItems:"center"}}>
      <span style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
        {!tbd&&<Crest t={team} size={18}/>}
        <span className="t-body" style={{fontWeight:win===team?700:500,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team}</span>
        {win===team&&<span className="badge b-final" style={{flex:"none"}}>진출</span>}
      </span>
      <span className="num t-sub" style={{textAlign:"center",color:"var(--pl-text)"}}>{l1?l1[idx]:"–"}</span>
      <span className="num t-sub" style={{textAlign:"center",color:"var(--pl-text)"}}>{l2?l2[1-idx]:"–"}</span>
    </div>)}
    <div className="t-cap" style={{display:"grid",gridTemplateColumns:"1fr 26px 26px",gap:8}}><span>1·2차전</span><span style={{textAlign:"center"}}>1</span><span style={{textAlign:"center"}}>2</span></div>
  </div>;
}
const ROUND_LABEL=[["po","플레이오프"],["r16","16강"],["qf","8강"],["sf","4강"],["f","결승"]];
function Knockout({theme,h=1000}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="순위"/>
    <div style={{padding:"20px 32px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <h1 className="t-page" style={{margin:0,fontSize:24}}>UCL 녹아웃 대진</h1>
        <span className="t-sub">2025/26 · 플레이오프 → 결승</span>
        <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}><Stamp/><Btn sm ghost>대회 허브</Btn></span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:14,alignItems:"start"}}>
        {ROUND_LABEL.map(([k,label])=><div key={k} style={{display:"grid",gap:10}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}>
            <span className="t-card">{label}</span><span className="t-cap num">{TIES[k].length}경기</span>
          </div>
          {TIES[k].map((t,i)=><TieCard key={i} t={t}/>)}
        </div>)}
      </div>
      <div className="card" style={{padding:"12px 16px",display:"flex",gap:16,flexWrap:"wrap"}}>
        <span className="t-cap">표기</span>
        <span className="t-sub">1 = 1차전 · 2 = 2차전 · 합산은 배지로 표시</span>
        <span className="t-sub">TBD = 대진 미확정</span>
        <span className="t-sub">진출 팀은 굵은 이름 + “진출” 배지</span>
      </div>
    </div>
  </div>;
}
function KnockoutMobile({theme,h=1180}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <StatusBarM/><TopBarM title="UCL 녹아웃" back/>
    <div style={{flex:1,overflow:"hidden",display:"grid",gap:8,padding:"10px 16px",alignContent:"start"}}>
      {ROUND_LABEL.map(([k,label],ri)=><div key={k} className="card" style={{overflow:"hidden"}}>
        <div style={{minHeight:48,display:"flex",alignItems:"center",gap:8,padding:"0 14px",borderBottom:ri<2?"1px solid var(--pl-line)":"none"}}>
          <span className="t-card">{label}</span><span className="t-cap num">{TIES[k].length}경기</span>
          <span style={{marginLeft:"auto",color:"var(--pl-sub)"}}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{transform:ri<2?"rotate(180deg)":"none"}}><path d="m5 8 5 5 5-5"/></svg>
          </span>
        </div>
        {ri<2&&<div style={{padding:"10px 12px",display:"grid",gap:8}}>{TIES[k].slice(0,2).map((t,i)=><TieCard key={i} t={t} compact/>)}
          {TIES[k].length>2&&<button className="link link-m">{TIES[k].length-2}경기 더 보기</button>}</div>}
      </div>)}
      <span className="t-cap">라운드를 눌러 펼칩니다 · 1 = 1차전, 2 = 2차전, 합산은 배지</span>
    </div>
  </div>;
}
/* 3. 통계 */
const STAT_ROWS=[
 ["살라","리버풀",21,{EPL:18,UCL:3}],["케인","바이에른",19,{BL:16,UCL:3}],["음바페","레알",18,{LaLiga:15,UCL:3}],
 ["야말","바르셀로나",14,{LaLiga:11,UCL:3}],["벨링엄","레알",13,{LaLiga:12,UCL:1}],["오시멘","나폴리",12,{SA:11,UCL:1}],
 ["뎀벨레","PSG",12,{L1:9,UCL:3}],["웰벡","브라이턴",11,{EPL:11}]];
function BreakDown({d}){
  return <span className="t-cap num">{Object.entries(d).map(([k,v])=>`${k} ${v}`).join(" + ")}</span>;
}
function StatTable({title,unit="골",all}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title={title} action="전체 보기" sm/>
    <div className="t-cap" style={{display:"grid",gridTemplateColumns:"34px 1fr 150px 90px",gap:10,padding:"0 16px",height:32,alignItems:"center"}}>
      <span>#</span><span>선수</span><span>{all?"대회별 분해":"소속"}</span><span style={{textAlign:"right"}}>{unit}</span>
    </div>
    {STAT_ROWS.map((r,i)=><div key={r[0]} style={{display:"grid",gridTemplateColumns:"34px 1fr 150px 90px",gap:10,padding:"0 16px",height:48,alignItems:"center",borderTop:"1px solid var(--pl-line)"}}>
      <span className="num t-sub" style={{fontWeight:700}}>{i+1}</span>
      <span style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}><Avatar size={26} none/><span style={{minWidth:0,display:"grid"}}><span className="t-body" style={{fontWeight:600}}>{r[0]}</span><span className="t-cap">{r[1]}</span></span></span>
      <span>{all?<BreakDown d={r[3]}/>:<span className="t-sub">{r[1]}</span>}</span>
      <span className="num t-body" style={{textAlign:"right",fontWeight:700}}>{r[2]}{unit}</span>
    </div>)}
  </div>;
}
function Stats({theme,h=1000}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="통계"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"baseline",gap:12}}>
        <h1 className="t-page" style={{margin:0,fontSize:26}}>통계</h1><span className="t-sub">2025/26</span>
        <span style={{marginLeft:"auto"}}><Stamp/></span>
      </div>
      <div className="card" style={{padding:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span className="t-cap" style={{width:40}}>대회</span>
        <Chip on>전체 합산</Chip>{CSEL.slice(1).map(([ab])=><Chip key={ab}>{ab}</Chip>)}
        <span className="t-sub" style={{marginLeft:"auto"}}>전체 합산에서는 대회별 분해를 함께 표기합니다</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.4fr) minmax(0,1fr)",gap:16,alignItems:"start"}}>
        <StatTable title="득점" unit="골" all/>
        <div style={{display:"grid",gap:16}}>
          <RankCard title="도움" rows={ASSIST_ROWS} unit="도움"/>
          <RankCard title="경고·퇴장" rows={[["로드리","맨시티","9"],["카세미루","맨유","8"],["부스케츠","바르셀로나","8"],["칼훅","인터","7"],["카마빙가","레알","7"]]} unit="장"/>
        </div>
      </div>
    </div>
  </div>;
}
function StatsMobile({theme,h=1000}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <StatusBarM/><TopBarM title="통계"/>
    <div style={{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",WebkitMaskImage:"linear-gradient(90deg,#000 calc(100% - 24px),transparent)"}}>
      <Chip m on>전체 합산</Chip>{CSEL.slice(1).map(([ab])=><Chip key={ab} m>{ab}</Chip>)}
    </div>
    <div style={{display:"flex",gap:0,background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)"}}>
      {["득점","도움","카드"].map((t,i)=><span key={t} style={{flex:1,minHeight:44,display:"grid",placeItems:"center",fontSize:14,fontWeight:i===0?700:500,color:i===0?"var(--pl-text)":"var(--pl-sub)",boxShadow:i===0?"inset 0 -2px 0 var(--pl-primary)":"none"}}>{t}</span>)}
    </div>
    <div style={{flex:1,overflow:"hidden",background:"var(--pl-card)"}}>
      {STAT_ROWS.map((r,i)=><div key={r[0]} style={{display:"grid",gridTemplateColumns:"26px 1fr 56px",gap:10,padding:"0 16px",minHeight:60,alignItems:"center",borderTop:i?"1px solid var(--pl-line)":"none"}}>
        <span className="num t-sub" style={{fontWeight:700}}>{i+1}</span>
        <span style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}><Avatar size={28} none/>
          <span style={{minWidth:0,display:"grid",gap:2}}>
            <span className="t-body" style={{fontWeight:600}}>{r[0]} <span className="t-cap">{r[1]}</span></span>
            <BreakDown d={r[3]}/>
          </span></span>
        <span className="num t-body" style={{textAlign:"right",fontWeight:700}}>{r[2]}골</span>
      </div>)}
    </div>
    <TabBarM active={2}/>
  </div>;
}
Object.assign(window,{HUB_ROWS,HubMatches,TeamChips,ROUND_LABEL,TIES,StatTable,CompHub,Knockout,KnockoutMobile,Stats,StatsMobile,HubStand,RankCard,TieCard,TEAMS20,zone20,SCORER_ROWS,ASSIST_ROWS,STAT_ROWS,BreakDown});
