/* H3 — 6개 대회 통합 뷰에서 필터 칩만으로 3탭 안에 원하는 경기를 찾는다 (데스크톱 1440×900) */
const M3=[
 {comp:"UCL",home:"레알 마드리드",away:"바이에른 뮌헨",hs:2,as:1,st:"live",time:"64'",hw:1},
 {comp:"UCL",home:"인터 밀란",away:"아스널",hs:0,as:0,st:"half",time:"45+2'"},
 {comp:"EPL",home:"리버풀",away:"첼시",hs:3,as:1,st:"final",time:"22:00",hw:1},
 {comp:"EPL",home:"맨체스터 시티",away:"토트넘",hs:1,as:1,st:"recheck",time:"22:00"},
 {comp:"라리가",home:"바르셀로나",away:"세비야",hs:2,as:0,st:"ft",time:"익일 00:30",hw:1},
 {comp:"분데스",home:"레버쿠젠",away:"도르트문트",hs:"-",as:"-",st:"sched",time:"익일 03:30"},
 {comp:"세리에",home:"유벤투스",away:"나폴리",hs:"-",as:"-",st:"post",time:"미정"},
 {comp:"리그 1",home:"PSG",away:"모나코",hs:"-",as:"-",st:"sched",time:"익일 04:45"}
];
function FilterRail({comps,states,onComp,onState}){
  return <div style={{display:"grid",gap:14,padding:"18px 24px",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span className="t-cap" style={{width:52}}>대회</span>
      {COMPS.map(c=><Chip key={c} on={comps.includes(c)} onClick={()=>onComp&&onComp(c)}>{c}</Chip>)}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span className="t-cap" style={{width:52}}>상태</span>
      {["전체","LIVE","오늘 종료","예정","확정"].map(c=><Chip key={c} on={states.includes(c)} onClick={()=>onState&&onState(c)}>{c}</Chip>)}
      <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}><span className="t-sub">9월 3일 (수)</span><Btn sm ghost>날짜 변경</Btn></span>
    </div>
  </div>;
}
function DeskShell({theme,comps,states,children,count,tap}){
  return <Desk theme={theme}>
    <DeskNav/>
    <div style={{padding:"28px 40px 12px",display:"flex",alignItems:"baseline",gap:12}}>
      <h1 className="t-page" style={{margin:0}}>경기</h1>
      <span className="t-sub num">{count}</span>
      {tap&&<span className="t-cap" style={{marginLeft:"auto",padding:"4px 10px",borderRadius:999,background:"var(--pl-fill-2)"}}>탭 {tap}회</span>}
    </div>
    <div style={{padding:"0 40px 40px",display:"grid",gridTemplateColumns:"1fr 348px",gap:24,alignItems:"start",flex:1,minHeight:0}}>
      <div className="card" style={{overflow:"hidden"}}><FilterRail comps={comps} states={states}/>{children}</div>
      <SideStand theme={theme}/>
    </div>
  </Desk>;
}
const STAND=[
 {no:1,team:"리버풀",pl:28,w:20,d:5,l:3,gd:34,pts:65,zone:"ucl"},
 {no:2,team:"아스널",pl:28,w:18,d:6,l:4,gd:29,pts:60,zone:"ucl"},
 {no:3,team:"맨체스터 시티",pl:28,w:17,d:5,l:6,gd:22,pts:56,zone:"ucl"},
 {no:4,team:"첼시",pl:28,w:15,d:7,l:6,gd:15,pts:52,zone:"ucl"},
 {no:5,team:"뉴캐슬",pl:28,w:14,d:6,l:8,gd:9,pts:48,zone:"uel"},
 {no:6,team:"애스턴 빌라",pl:28,w:13,d:6,l:9,gd:4,pts:45,zone:"uecl"},
 {no:18,team:"입스위치",pl:28,w:5,d:6,l:17,gd:-28,pts:21,zone:"rel"}
];
function SideStand({theme}){
  return <div className="card" style={{overflow:"hidden"}}>
    <SecHead title="EPL 순위" action="전체 보기"/>
    <StandHead/>
    {STAND.map(r=><StandRow key={r.no} r={r}/>)}
    <div style={{padding:"12px 14px",borderTop:"1px solid var(--pl-line)"}}><ZoneLegend/></div>
  </div>;
}
function List({items}){
  return <div style={{display:"grid",gap:1,background:"var(--pl-line)"}}>
    {items.map((m,i)=><div key={i} style={{background:"var(--pl-card)"}}><MatchRow m={m}/></div>)}
  </div>;
}
window.FLOW_H3=(theme)=>({
  id:"h3",
  device:"desktop",
  title:"H3 · 통합 뷰에서 3탭 안에 원하는 경기를 찾는다",
  claim:"6개 대회가 한 목록에 있어도, 필터 칩 3번이면 \"오늘 진행 중인 UCL·EPL 경기\"에 도달한다.",
  measure:"필터 첫 조작 → 경기 상세 진입까지의 탭 수 · 이탈률",
  screens:[
   {label:"1. 로딩",note:"스켈레톤은 실제 행과 같은 높이·개수. 레이아웃이 튀지 않는다.",
    el:<DeskShell theme={theme} comps={["전체"]} states={["전체"]} count="불러오는 중"><SkelList n={8} h={72}/></DeskShell>},
   {label:"2. 통합 목록 (기본)",note:"6개 대회가 한 목록. 대회 라벨은 텍스트로 구분하고 색을 쓰지 않는다.",
    el:<DeskShell theme={theme} comps={["전체"]} states={["전체"]} count="8경기" tap={0}><List items={M3}/></DeskShell>},
   {label:"3. 탭 1·2 — 대회 좁히기",note:"활성 칩은 틴트가 아니라 브랜드 파랑으로 채운다. 흰 글자.",
    el:<DeskShell theme={theme} comps={["UCL","EPL"]} states={["전체"]} count="4경기" tap={2}><List items={M3.filter(m=>m.comp==="UCL"||m.comp==="EPL")}/></DeskShell>},
   {label:"4. 탭 3 — 진행 중만",note:"3탭에서 목표 도달. LIVE·하프타임은 색 외에 도트 단서를 함께 갖는다.",
    el:<DeskShell theme={theme} comps={["UCL","EPL"]} states={["LIVE"]} count="2경기" tap={3}><List items={M3.filter(m=>m.st==="live"||m.st==="half")}/></DeskShell>},
   {label:"5. 빈 결과",note:"오류로 위장하지 않는다. 무엇이 걸러졌는지와 다음 행동을 준다.",
    el:<DeskShell theme={theme} comps={["리그 1"]} states={["LIVE"]} count="0경기" tap={4}><EmptyState/></DeskShell>},
   {label:"6. 오류",note:"빈 화면 금지. 실패한 대상·코드·재시도 수단을 명시한다.",
    el:<DeskShell theme={theme} comps={["UCL","EPL"]} states={["LIVE"]} count="—"><ErrorState/></DeskShell>},
   {label:"7. 순위표 — 파랑 검증",note:"⚠ 검증 지점: 헤더의 채운 브랜드 파랑 버튼과 표 왼쪽 UCL 구역 2px 선이 한 화면에 있다.",
    el:<Desk theme={theme}><DeskNav active="순위"/>
      <div style={{padding:"28px 40px 12px",display:"flex",alignItems:"center",gap:12}}>
        <h1 className="t-page" style={{margin:0}}>순위</h1>
        <span style={{marginLeft:"auto",display:"flex",gap:8}}><Btn sm>내 팀 추가</Btn><Btn sm ghost>시즌 2025/26</Btn></span>
      </div>
      <div style={{padding:"0 40px",display:"flex",gap:8,flexWrap:"wrap"}}>{COMPS.slice(1).map((c,i)=><Chip key={c} on={i===1}>{c}</Chip>)}</div>
      <div style={{padding:"20px 40px 40px",display:"grid",gridTemplateColumns:"1fr 348px",gap:24,alignItems:"start"}}>
        <div className="card" style={{overflow:"hidden"}}>
          <SecHead title="EPL 2025/26" action="전체 보기"/>
          <StandHead/>{STAND.map(r=><StandRow key={r.no} r={r}/>)}
          <div style={{padding:"14px",borderTop:"1px solid var(--pl-line)"}}><ZoneLegend/></div>
        </div>
        <div className="card" style={{padding:16,display:"grid",gap:12}}>
          <div className="t-card">파랑의 두 가지 의미</div>
          <div className="t-sub">누를 수 있는 것 = 채운 배경 + 흰 글자</div>
          <div style={{display:"flex",gap:8}}><Btn sm>팔로우</Btn><button className="link">전체 보기</button></div>
          <hr className="hr"/>
          <div className="t-sub">구역 = 좌측 2px 선 + 4% 틴트 + 범례</div>
          <div className="zrow num" data-zone="ucl" style={{"--zc":"var(--z-ucl)",gridTemplateColumns:"32px 1fr 46px"}}><span style={{fontWeight:700}}>1</span><span style={{fontWeight:600}}>리버풀</span><span style={{textAlign:"right",fontWeight:700}}>65</span></div>
          <div className="t-cap">표 안의 팀 이름에는 브랜드 색을 쓰지 않는다. 행 hover로 클릭 가능함을 알린다.</div>
        </div>
      </div>
    </Desk>}
  ]
});
