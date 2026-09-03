const SQUAD=[["1","알리송","GK"],["62","켈러허","GK"],["13","아드리안","GK"],["4","반다이크","DF"],["66","아널드","DF"],["26","로버트슨","DF"],["5","코나테","DF"],["78","콰사","DF"],["2","고메스","DF"],["21","치미카스","DF"],["6","엔도","MF"],["8","소보슬라이","MF"],["10","맥알리스터","MF"],["17","존스","MF"],["19","엘리엇","MF"],["38","흐라벤베르흐","MF"],["3","바이날둠","MF"],["11","살라","FW"],["9","누녜스","FW"],["7","디아스","FW"],["27","조타","FW"],["18","가쿠포","FW"],["20","치웰","FW"],["50","은고모하","FW"],["73","단스","FW"],["76","브래들리","DF"]];
/* 6단계 — 팀 상세 / 팀 일정 / 선수 상세 / 대회 목록 / 팀 목록 / 404 */
function TeamDetail({theme,h=1060}){
  const comps=[["EPL","1위","승점 65"],["UCL","8강 진출","리그 페이즈 3위"],["FA컵","4라운드",""]];
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="팀"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <Crest t="리버풀" size={52}/>
        <div style={{display:"grid"}}>
          <h1 className="t-page" style={{margin:0,fontSize:26}}>리버풀 FC</h1>
          <span className="t-sub">안필드 · 잉글랜드 리버풀 · 감독 아르네 슬롯</span>
        </div>
        <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}><Stamp/><Btn sm ghost>일정</Btn><Btn sm>팔로우</Btn></span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>
        {comps.map(c=><div key={c[0]} className="card" style={{padding:14,display:"grid",gap:4}}>
          <span className="t-cap">{c[0]}</span>
          <span className="t-sec" style={{fontSize:20}}>{c[1]}</span>
          <span className="t-sub num">{c[2]}</span></div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 380px",gap:16,alignItems:"start"}}>
        <div style={{display:"grid",gap:16,minWidth:0}}>
          <div className="card" style={{overflow:"hidden"}}>
            <SecHead title="최근 경기 4" action="전체 일정" sm/>
            <div style={{padding:"0 14px 12px",display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
              {[DAYS[0].items[2],DAYS[0].items[3],DAYS[0].items[0],DAYS[1].items[1]].map((m,i)=><MatchRowCard key={i} m={m}/>)}
            </div>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <SecHead title="다음 경기 2" action="일정 전체" sm/>
            <div style={{padding:"0 14px 12px",display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
              {[DAYS[1].items[0],DAYS[2].items[0]].map((m,i)=><MatchRowCard key={i} m={m}/>)}
            </div>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <SecHead title="스쿼드 26명" action="선수 통계" sm/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>
              {SQUAD.map((p,i)=>
                <div key={p[0]} style={{display:"grid",gridTemplateColumns:"28px 1fr auto",gap:8,alignItems:"center",padding:"0 14px",height:44,borderTop:"1px solid var(--pl-line)",boxShadow:i%3?"inset 1px 0 0 var(--pl-line)":"none"}}>
                  <span className="num t-sub" style={{fontWeight:700}}>{p[0]}</span>
                  <span className="t-body" style={{fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p[1]}</span>
                  <span className="t-cap">{p[2]}</span></div>)}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gap:16}}>
          <HubStand rows={HUB_ROWS.slice(0,5)}/>
          <RankCard title="팀 내 득점" rows={[["살라","FW",18],["누녜스","FW",9],["디아스","FW",8],["소보슬라이","MF",5],["반다이크","DF",3]]} unit="골" action="선수 통계"/>
        </div>
      </div>
    </div>
  </div>;
}
/* 팀 일정 — 과거·미래 한 흐름 + 오늘 표시 */
const FIXTURES=[
 {d:"8월 24일",comp:"EPL",opp:"뉴캐슬",home:false,score:"2 - 1",st:"final",res:"W"},
 {d:"8월 27일",comp:"UCL",opp:"인터 밀란",home:true,score:"1 - 1",st:"final",res:"D"},
 {d:"8월 31일",comp:"EPL",opp:"에버턴",home:true,score:"3 - 0",st:"final",res:"W"},
 {d:"9월 3일",comp:"EPL",opp:"브라이턴",home:true,score:"3 - 1",st:"recheck",res:"W",today:true},
 {d:"9월 6일",comp:"EPL",opp:"첼시",home:false,score:"",st:"sched",time:"20:30"},
 {d:"9월 10일",comp:"UCL",opp:"레알 마드리드",home:true,score:"",st:"sched",time:"05:00"},
 {d:"9월 14일",comp:"EPL",opp:"토트넘",home:true,score:"",st:"sched",time:"23:30"},
 {d:"9월 20일",comp:"FA컵",opp:"입스위치",home:false,score:"",st:"sched",time:"22:00"}
];
function FixtureRow({f,mobile}){
  return <div style={{display:"grid",gridTemplateColumns:mobile?"58px 1fr 86px":"88px 52px 1fr 92px 84px",gap:10,alignItems:"center",padding:"0 16px",minHeight:mobile?56:52,borderTop:"1px solid var(--pl-line)",background:f.today?"color-mix(in srgb,var(--pl-primary) 6%,transparent)":"transparent"}}>
    <span className="num t-sub" style={{fontWeight:700,color:"var(--pl-text)"}}>{f.d}</span>
    {!mobile&&<span className="t-cap">{f.comp}</span>}
    <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
      <Crest t={f.opp} size={18}/>
      <span className="t-body" style={{fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.home?"vs":"@"} {f.opp}</span>
      {mobile&&<span className="t-cap">{f.comp}</span>}
    </span>
    {mobile
      ? <span style={{display:"grid",gap:3,justifyItems:"end"}}><span className="num t-body" style={{fontWeight:700}}>{f.score||f.time}</span><Badge k={f.st}/></span>
      : <span className="num t-body" style={{fontWeight:700,textAlign:"center"}}>{f.score||f.time}</span>}
    {!mobile&&<span style={{display:"flex",justifyContent:"flex-end",gap:6,alignItems:"center"}}>{f.res&&<Form f={[f.res]}/>}<Badge k={f.st}/></span>}
  </div>;
}
function TodayMark({mobile}){
  return <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 16px",background:"var(--pl-card)"}}>
    <span style={{height:2,flex:1,background:"var(--pl-primary)"}}/>
    <span className="t-cap" style={{color:"var(--pl-primary)",fontWeight:700}}>오늘 9월 3일</span>
    <span style={{height:2,flex:1,background:"var(--pl-primary)"}}/>
  </div>;
}
function TeamFixtures({theme,mobile,h}){
  const list=<div className="card" style={{overflow:"hidden"}}>
    <SecHead title="2025/26 일정" action="달력 보기" sm mobile={mobile}/>
    {FIXTURES.map((f,i)=><React.Fragment key={i}>{f.today&&<TodayMark mobile={mobile}/>}<FixtureRow f={f} mobile={mobile}/></React.Fragment>)}
  </div>;
  const filters=<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <span className="t-cap">대회</span><Chip on m={mobile}>전체</Chip><Chip m={mobile}>국내 리그</Chip><Chip m={mobile}>UCL</Chip>
    <span style={{marginLeft:mobile?0:"auto"}}><Stamp/></span>
  </div>;
  if(mobile) return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h||900,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <StatusBarM/><TopBarM title="리버풀 일정" back/>
    <div style={{padding:"10px 16px",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",display:"flex",gap:8,overflowX:"auto"}}>{filters}</div>
    <div style={{flex:1,overflow:"hidden",padding:"10px 16px"}}>{list}</div>
  </div>;
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h||760,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="팀"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <Crest t="리버풀" size={32}/><h1 className="t-page" style={{margin:0,fontSize:24}}>리버풀 일정</h1>
        <span className="t-sub">2025/26 · 전체 대회</span>
        <span style={{marginLeft:"auto"}}><Btn sm ghost>팀 페이지</Btn></span>
      </div>
      {filters}
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 340px",gap:16,alignItems:"start"}}>
        {list}
        <div className="card" style={{padding:16,display:"grid",gap:10}}>
          <span className="t-card">이번 달 요약</span>
          <div style={{display:"flex",gap:10,alignItems:"center"}}><Form f={["W","D","W","W"]}/><span className="t-sub num">3승 1무</span></div>
          <hr className="hr"/>
          <span className="t-sub">남은 경기 4 · EPL 2 · UCL 1 · FA컵 1</span>
          <span className="t-sub">오늘 이후 첫 경기 9월 6일 20:30</span>
        </div>
      </div>
    </div>
  </div>;
}
/* 선수 상세 */
function PlayerDetail({theme,h=900}){
  const rows=[["EPL",27,18,11,3,2380],["UCL",9,3,2,1,780],["FA컵",3,0,1,0,210]];
  const tot=rows.reduce((a,r)=>r.map((v,i)=>i?a[i]+v:"전체 합산"),["전체 합산",0,0,0,0,0]);
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="통계"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <Avatar size={56} none/>
        <div style={{display:"grid"}}>
          <h1 className="t-page" style={{margin:0,fontSize:26}}>모하메드 살라</h1>
          <span className="t-sub">리버풀 · FW · #11 · 이집트</span>
        </div>
        <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}><Stamp/><Btn sm>팔로우</Btn></span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 380px",gap:16,alignItems:"start"}}>
        <div className="card" style={{overflow:"hidden"}}>
          <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid var(--pl-line)"}}>
            <span className="t-card">2025/26 기록</span>
            <span style={{marginLeft:"auto",display:"flex",gap:2,padding:3,borderRadius:999,background:"var(--pl-fill)"}}>
              {["대회별","전체 합산"].map((t,i)=><span key={t} style={{minHeight:32,display:"grid",placeItems:"center",padding:"0 12px",borderRadius:999,fontSize:13,fontWeight:600,background:i===0?"var(--pl-primary)":"transparent",color:i===0?"var(--pl-on-primary)":"var(--pl-sub)"}}>{t}</span>)}
            </span>
          </div>
          <div className="t-cap" style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 60px 60px 90px",gap:8,padding:"0 16px",height:32,alignItems:"center"}}>
            <span>대회</span>{["출전","골","도움","카드","출전 시간"].map(h=><span key={h} style={{textAlign:"right"}}>{h}</span>)}
          </div>
          {[...rows,tot].map((r,i)=><div key={r[0]} className="num" style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 60px 60px 90px",gap:8,padding:"0 16px",height:46,alignItems:"center",borderTop:"1px solid var(--pl-line)",fontWeight:i===rows.length?700:500,background:i===rows.length?"var(--pl-fill)":"transparent"}}>
            <span style={{fontVariantNumeric:"normal"}}>{r[0]}</span>
            {r.slice(1).map((v,j)=><span key={j} style={{textAlign:"right",color:j===1?"var(--pl-text)":"var(--pl-sub)"}}>{j===4?v+"′":v}</span>)}
          </div>)}
        </div>
        <div style={{display:"grid",gap:16}}>
          <div className="card" style={{padding:16,display:"grid",gap:10}}>
            <span className="t-card">최근 5경기</span>
            <Form f={["W","W","D","L","W"]}/>
            <span className="t-sub num">4골 2도움 · 평점 7.9</span>
          </div>
          <RankCard title="EPL 득점 순위" rows={SCORER_ROWS} unit="골" action="통계"/>
        </div>
      </div>
    </div>
  </div>;
}
/* 대회 목록 · 팀 목록 · 404 */
function CompList({theme,h=760}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="순위"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"baseline",gap:12}}><h1 className="t-page" style={{margin:0,fontSize:26}}>대회</h1><span className="t-sub">6개 · 2025/26</span><span style={{marginLeft:"auto"}}><Stamp/></span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>{LEAGUES.map(l=><LeagueCard key={l.n} l={l}/>)}</div>
    </div>
  </div>;
}
function TeamList({theme,h=900}){
  const teams=[...TEAMS20,"레알 마드리드","바이에른 뮌헨","PSG","나폴리"];
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="팀"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"baseline",gap:12}}><h1 className="t-page" style={{margin:0,fontSize:26}}>팀</h1><span className="t-sub num">EPL 20팀 · 전체 96팀</span><span style={{marginLeft:"auto"}}><Stamp/></span></div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span className="t-cap">대회</span>{CSEL.map(([ab],i)=><Chip key={ab} on={i===2}>{ab}</Chip>)}
        <span style={{marginLeft:"auto"}}><FilterSelect label="시즌" value="2025/26"/></span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:12}}>
        {teams.slice(0,20).map(t=><div key={t} className="card" style={{padding:12,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <Crest t={t} size={26}/><span className="t-body" style={{fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t}</span></div>)}
      </div>
      <span className="t-cap">리그마다 팀 수가 다릅니다 — 분데스리가 18팀 · UCL 리그 페이즈 36팀</span>
    </div>
  </div>;
}
function NotFound({theme,h=700}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} home/>
    <div style={{flex:1,display:"grid",placeItems:"center"}}>
      <div style={{display:"grid",gap:16,justifyItems:"center",textAlign:"center",maxWidth:520}}>
        <span className="num" style={{fontSize:56,fontWeight:700,letterSpacing:"-.03em"}}>404</span>
        <span className="t-sec" style={{fontSize:22}}>요청하신 페이지를 찾을 수 없습니다</span>
        <span className="t-sub">주소가 바뀌었거나 삭제된 경기·팀·선수일 수 있습니다. 아래에서 이어가세요.</span>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}><Btn>홈으로</Btn><Btn ghost>오늘 경기</Btn><Btn ghost>순위표</Btn></div>
      </div>
    </div>
  </div>;
}
Object.assign(window,{TeamDetail,TeamFixtures,PlayerDetail,CompList,TeamList,NotFound,FIXTURES});
