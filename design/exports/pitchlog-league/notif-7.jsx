/* 7단계 — 알림. 인앱 토스트 · 벨 · 패널 · 권한 · 설정 · 푸시 */
function Switch({on}){
  return <span style={{width:52,height:32,borderRadius:999,background:on?"var(--pl-primary)":"var(--pl-fill-2)",boxShadow:on?"none":"inset 0 0 0 1px var(--pl-control)",position:"relative",flex:"none"}}>
    <span style={{position:"absolute",top:3,left:on?23:3,width:26,height:26,borderRadius:"50%",background:on?"var(--pl-on-primary)":"var(--pl-card)",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
  </span>;
}
function Row({label,desc,right,minH=56}){
  return <div style={{display:"flex",gap:12,alignItems:"center",padding:"10px 16px",borderTop:"1px solid var(--pl-line)",minHeight:minH}}>
    <div style={{flex:1,minWidth:0}}><div className="t-body" style={{fontWeight:600}}>{label}</div>{desc&&<div className="t-sub">{desc}</div>}</div>
    {right}
  </div>;
}
/* 1. 토스트 */
const TOASTS={
 goal:{title:"리버풀 2 - 1 첼시",body:"68′ 살라 (도움 소보슬라이)",badge:"live",label:"골",auto:"5초 후 자동으로 사라짐"},
 kick:{title:"킥오프",body:"레알 마드리드 vs 바이에른 뮌헨 · UCL 8강",badge:"live",label:"킥오프",auto:"5초 후 자동으로 사라짐"},
 ft:{title:"경기 종료",body:"리버풀 3 - 1 첼시 · 잠정 기록",badge:"ft",label:"종료",auto:"7초 후 자동으로 사라짐"},
 final:{title:"기록이 확정됐습니다",body:"리버풀 3 - 1 첼시 · 살라 2골 1도움으로 최종",badge:"final",label:"확정",auto:"직접 닫을 때까지 유지"}
};
function Toast({k,stacked}){
  const t=TOASTS[k],isFinal=k==="final";
  return <div className="card" style={{width:360,padding:14,display:"grid",gap:8,boxShadow:"var(--sh-over)",
    borderLeft:isFinal?"3px solid var(--st-pos)":"3px solid transparent",
    background:isFinal?"color-mix(in srgb,var(--st-pos) 7%,var(--pl-card))":"var(--pl-card)"}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {k==="final"
        ? <span style={{width:24,height:24,borderRadius:"50%",background:"var(--st-pos)",color:"#fff",display:"grid",placeItems:"center",flex:"none"}}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 6.3 4.6 9 10 3.4"/></svg></span>
        : <Crest t={k==="kick"?"레알 마드리드":"리버풀"} size={24}/>}
      <span className="t-card" style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
      <span style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
        <Badge k={t.badge}/>
        <span style={{width:24,height:24,display:"grid",placeItems:"center",color:"var(--pl-sub)",fontSize:13}}>✕</span>
      </span>
    </div>
    <span className="t-sub" style={{color:"var(--pl-text)"}}>{t.body}</span>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span className="t-cap">{t.auto}</span>
      <span style={{marginLeft:"auto"}}><button className="link">경기 상세</button></span>
    </div>
    {!isFinal&&<span style={{height:2,borderRadius:2,background:"var(--pl-fill-2)",overflow:"hidden"}}><span style={{display:"block",height:2,width:"62%",background:"var(--pl-primary)"}}/></span>}
  </div>;
}
function ToastStack(){
  return <div style={{display:"grid",gap:10,justifyItems:"end"}}>
    <Toast k="final"/>
    <Toast k="goal"/>
    <Toast k="kick"/>
    <div className="card" style={{width:360,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,boxShadow:"var(--sh-over)"}}>
      <span className="t-sub">가려진 알림 2건</span>
      <span style={{marginLeft:"auto",display:"flex",gap:8}}><button className="link">모두 보기</button><button className="link">모두 닫기</button></span>
    </div>
    <span className="t-cap" style={{maxWidth:360,textAlign:"right"}}>동시에 최대 3개까지 쌓고, 그 이상은 “가려진 알림 N건”으로 접습니다. 확정 알림이 항상 맨 위입니다.</span>
  </div>;
}
/* 2. 벨 */
function Bell({count}){
  return <span style={{width:44,height:44,display:"grid",placeItems:"center",position:"relative",color:"var(--pl-text)"}}>
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3.2a5 5 0 0 0-5 5V12l-1.6 2.6h13.2L15 12V8.2a5 5 0 0 0-5-5zM8 17.2h4"/></svg>
    {count>0&&<span className="num" style={{position:"absolute",top:5,right:4,minWidth:18,height:18,padding:"0 5px",borderRadius:999,background:"var(--pl-primary)",color:"var(--pl-on-primary)",fontSize:11,fontWeight:700,display:"grid",placeItems:"center",boxShadow:"0 0 0 2px var(--pl-card)"}}>{count>99?"99+":count}</span>}
  </span>;
}
/* 3. 알림 패널 */
const NOTIS=[
 ["final","기록 확정","리버풀 3 - 1 첼시 · 살라 2골 1도움","21:58",true],
 ["recheck","재검증 중","77′ 득점자가 정정될 수 있습니다","21:55",true],
 ["live","골","리버풀 3 - 1 첼시 (58′ 디아스)","21:12",false],
 ["sched","킥오프 15분 전","레알 마드리드 vs 바이에른 뮌헨 · UCL","20:15",false],
 ["post","경기 연기","유벤투스 vs 나폴리 일정이 변경됐습니다","어제",false]
];
function NotiList({empty,mobile}){
  if(empty) return <div style={{display:"grid",gap:12,justifyItems:"center",textAlign:"center",padding:"44px 24px"}}>
    <span style={{width:44,height:44,borderRadius:"50%",background:"var(--pl-fill-2)",color:"var(--pl-sub)",display:"grid",placeItems:"center"}}>
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3.2a5 5 0 0 0-5 5V12l-1.6 2.6h13.2L15 12V8.2a5 5 0 0 0-5-5zM8 17.2h4"/></svg>
    </span>
    <span className="t-card">아직 받은 알림이 없습니다</span>
    <span className="t-sub" style={{maxWidth:300}}>관심 팀과 대회를 고르면 킥오프·골·기록 확정을 여기로 보내드립니다.</span>
    <Btn sm={!mobile}>알림 설정 열기</Btn>
  </div>;
  return <div>
    {NOTIS.map((n,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"10px 1fr auto",gap:10,padding:"12px 16px",borderTop:i?"1px solid var(--pl-line)":"none",alignItems:"start",background:n[4]?"var(--pl-fill)":"transparent",minHeight:mobile?64:0}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:n[4]?"var(--pl-primary)":"transparent",marginTop:6}}/>
      <div style={{display:"grid",gap:5}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><Badge k={n[0]}/><span className="t-body" style={{fontWeight:n[4]?700:500}}>{n[1]}</span></div>
        <span className="t-sub">{n[2]}</span>
      </div>
      <span className="t-cap num">{n[3]}</span>
    </div>)}
  </div>;
}
function NotiPanel({empty}){
  return <div className="card" style={{width:400,overflow:"hidden",boxShadow:"var(--sh-modal)"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",borderBottom:"1px solid var(--pl-line)"}}>
      <span className="t-card">알림</span>{!empty&&<span className="t-cap num">안 읽음 2</span>}
      {!empty&&<span style={{marginLeft:"auto"}}><button className="link">모두 읽음</button></span>}
    </div>
    <NotiList empty={empty}/>
    <div style={{padding:"10px 16px",borderTop:"1px solid var(--pl-line)",display:"flex",alignItems:"center",gap:8}}>
      <button className="link">알림 설정</button>
      <span className="t-cap" style={{marginLeft:"auto"}}>이 브라우저에만 저장됩니다</span>
    </div>
  </div>;
}
/* 4. 권한 */
function PermCard(){
  return <div className="card" style={{width:420,padding:18,display:"grid",gap:12,boxShadow:"var(--sh-modal)"}}>
    <span className="t-sec" style={{fontSize:19}}>골이 들어가면 알려드릴까요?</span>
    <span className="t-sub">관심 팀 경기만 보냅니다. 킥오프·골·기록 확정 중에서 고를 수 있고, 언제든 끌 수 있습니다.</span>
    <span className="t-cap">이 브라우저에만 적용됩니다 · 로그인 없이 동작합니다</span>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost sm>나중에</Btn><Btn sm>알림 받기</Btn></div>
  </div>;
}
function PermState({state}){
  const cfg={
   idle:{b:"sched",t:"푸시 알림 꺼짐",d:"이 브라우저는 아직 푸시 알림을 요청하지 않았습니다.",a:<Btn sm>알림 켜기</Btn>},
   granted:{b:"final",t:"푸시 알림 켜짐",d:"이 브라우저로 알림을 보냅니다. 다른 기기에는 적용되지 않습니다.",a:<Btn sm ghost>끄기</Btn>},
   denied:{b:"cancel",t:"브라우저가 알림을 차단했습니다",d:"우리 화면에서는 되돌릴 수 없습니다. 주소창 왼쪽 자물쇠 → 알림 → 허용으로 바꾼 뒤 새로고침하세요. 그 전까지는 인앱 알림만 받습니다.",a:<div style={{display:"flex",gap:8}}><Btn sm ghost>변경 방법 보기</Btn><Btn sm>인앱 알림만 쓰기</Btn></div>}
  }[state];
  return <div className="card" style={{padding:16,display:"grid",gap:10}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}><Badge k={cfg.b}/><span className="t-card">{cfg.t}</span></div>
    <span className="t-sub">{cfg.d}</span>
    <div style={{display:"flex",justifyContent:"flex-end"}}>{cfg.a}</div>
  </div>;
}
/* 5. 설정 */
function NotiSettings({theme,perm="idle",h=1000}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="팀"/>
    <div style={{padding:"20px 40px 0",display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"baseline",gap:12}}>
        <h1 className="t-page" style={{margin:0,fontSize:26}}>알림 설정</h1>
        <span className="t-sub">이 브라우저에서만 적용됩니다 · 로그인이 없어 다른 기기와 동기화되지 않습니다</span>
        <span style={{marginLeft:"auto"}}><Stamp/></span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 380px",gap:16,alignItems:"start"}}>
        <div style={{display:"grid",gap:16,minWidth:0}}>
          <div className="card" style={{overflow:"hidden"}}>
            <SecHead title="관심 팀" action="팀 검색" sm/>
            <div style={{padding:"0 16px 12px",display:"flex",gap:8,flexWrap:"wrap"}}>
              {["리버풀","레알 마드리드","나폴리"].map(t=><span key={t} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:999,background:"var(--pl-fill)",fontSize:13,fontWeight:600}}><Crest t={t} size={16}/>{t}<span style={{color:"var(--pl-sub)"}}>✕</span></span>)}
              <span className="chip" style={{height:34}}>+ 팀 추가</span>
            </div>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <SecHead title="관심 대회" sm/>
            <div style={{padding:"0 16px 12px",display:"flex",gap:8,flexWrap:"wrap"}}>
              {CSEL.slice(1).map(([ab,full],i)=><Chip key={ab} on={i<2}>{full}</Chip>)}
            </div>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <SecHead title="어떤 일이 생겼을 때" sm/>
            <Row label="킥오프" desc="경기 시작 15분 전" right={<Switch on/>}/>
            <Row label="골" desc="관심 팀 경기의 모든 득점" right={<Switch on/>}/>
            <Row label="경기 종료" desc="휘슬 직후 잠정 기록" right={<Switch/>}/>
            <Row label="기록 확정" desc="공식 기록 대조가 끝나 숫자가 고정될 때" right={<Switch on/>}/>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <SecHead title="어디로 보낼까요" sm/>
            <Row label="인앱 알림" desc="PitchLog를 보고 있을 때 화면 구석 토스트" right={<Switch on/>}/>
            <Row label="푸시 알림" desc={perm==="denied"?"브라우저가 차단해 사용할 수 없습니다":"사이트를 닫아둔 동안에도 받습니다 · 브라우저 권한 필요"} right={<Switch on={perm==="granted"}/>}/>
          </div>
        </div>
        <div style={{display:"grid",gap:16}}>
          <PermState state={perm}/>
          <div className="card" style={{padding:16,display:"grid",gap:10}}>
            <span className="t-card">푸시 미리보기</span>
            <PushPreview/>
            <span className="t-cap">같은 경기의 알림은 새 내용으로 교체됩니다 — 골이 연달아 나도 알림이 쌓이지 않습니다.</span>
          </div>
          <div className="card" style={{padding:16,display:"grid",gap:8}}>
            <span className="t-card">이 기기의 설정</span>
            <span className="t-sub">설정은 이 브라우저에만 저장됩니다. 다른 기기나 시크릿 창에서는 다시 설정해야 합니다.</span>
            <button className="link" style={{justifySelf:"start"}}>이 브라우저 설정 초기화</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
function PushPreview({os="mac"}){
  return <div style={{borderRadius:14,padding:12,background:"var(--pl-fill)",boxShadow:"inset 0 0 0 1px var(--pl-line)",display:"grid",gap:8}}>
    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
      <Crest t="리버풀" size={32}/>
      <div style={{display:"grid",gap:3,minWidth:0,flex:1}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <span className="t-body" style={{fontWeight:700}}>리버풀 2 - 1 첼시</span>
          <span className="t-cap" style={{marginLeft:"auto"}}>지금</span>
        </div>
        <span className="t-sub">68′ 살라</span>
        <span className="t-cap">PitchLog · pitchlog.app</span>
      </div>
    </div>
  </div>;
}
/* 화면 조립 */
function NotiDesktop({theme,mode="panel",h=900}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
    <header style={{height:60,background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",display:"flex",alignItems:"center",gap:28,padding:"0 24px",flex:"none"}}>
      <span className="t-sec" style={{letterSpacing:"-.022em"}}>PitchLog</span>
      <nav style={{display:"flex",gap:20}}>{["경기","순위","팀","통계"].map((t,i)=><span key={t} className="t-body" style={{fontWeight:i===0?700:500,color:i===0?"var(--pl-text)":"var(--pl-sub)",lineHeight:"56px",boxShadow:i===0?"inset 0 -2px 0 var(--pl-primary)":"none"}}>{t}</span>)}</nav>
      <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
        <Bell count={mode==="empty"?0:3}/>
        <span style={{width:32,height:32,borderRadius:"50%",background:"var(--pl-fill-2)"}}/>
      </span>
    </header>
    <div style={{flex:1,overflow:"hidden",padding:"18px 24px",display:"grid",gridTemplateColumns:"196px 1fr 320px",gap:16,alignItems:"start",opacity:.55}}>
      <div className="card" style={{height:280}}/><div className="card" style={{height:420}}/><div className="card" style={{height:360}}/>
    </div>
    {mode==="panel"&&<div style={{position:"absolute",top:64,right:24}}><NotiPanel/></div>}
    {mode==="empty"&&<div style={{position:"absolute",top:64,right:24}}><NotiPanel empty/></div>}
    {mode==="toast"&&<div style={{position:"absolute",bottom:24,right:24}}><ToastStack/></div>}
    {mode==="perm"&&<React.Fragment>
      <div style={{position:"absolute",inset:0,background:"rgba(11,17,32,.42)"}}/>
      <div style={{position:"absolute",top:120,left:"50%",transform:"translateX(-50%)"}}><PermCard/></div>
    </React.Fragment>}
  </div>;
}
function NotiMobile({theme,mode="panel",h=844}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
    <StatusBarM/>
    {mode==="panel"||mode==="empty"
      ? <React.Fragment>
          <TopBarM title="알림" back right={mode==="panel"?<button className="link link-m" style={{padding:"0 12px"}}>모두 읽음</button>:null}/>
          <div style={{flex:1,overflow:"hidden",background:"var(--pl-card)"}}><NotiList empty={mode==="empty"} mobile/></div>
          <div style={{padding:"10px 16px",borderTop:"1px solid var(--pl-line)",background:"var(--pl-card)",display:"flex",alignItems:"center",gap:8}}>
            <button className="link link-m">알림 설정</button><span className="t-cap" style={{marginLeft:"auto"}}>이 브라우저에만 저장됩니다</span>
          </div>
          <TabBarM active={0}/>
        </React.Fragment>
      : <React.Fragment>
          <TopBarM title="알림 설정" back/>
          <div style={{flex:1,overflow:"hidden",display:"grid",gap:8,alignContent:"start"}}>
            <div style={{padding:"10px 16px",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)"}}>
              <span className="t-sub">이 브라우저에서만 적용됩니다. 다른 기기와 동기화되지 않습니다.</span>
            </div>
            <div style={{padding:"0 16px"}}><PermState state={mode==="denied"?"denied":"granted"}/></div>
            <div className="card" style={{margin:"0 16px",overflow:"hidden"}}>
              <SecHead title="관심 팀" action="추가" sm mobile/>
              <div style={{padding:"0 16px 12px",display:"flex",gap:8,flexWrap:"wrap"}}>
                {["리버풀","레알 마드리드"].map(t=><span key={t} style={{display:"inline-flex",alignItems:"center",gap:6,minHeight:44,padding:"0 12px",borderRadius:999,background:"var(--pl-fill)",fontSize:14,fontWeight:600}}><Crest t={t} size={18}/>{t}<span style={{color:"var(--pl-sub)"}}>✕</span></span>)}
              </div>
            </div>
            <div className="card" style={{margin:"0 16px",overflow:"hidden"}}>
              <SecHead title="어떤 일이" sm mobile/>
              <Row label="킥오프" right={<Switch on/>}/><Row label="골" right={<Switch on/>}/>
              <Row label="경기 종료" right={<Switch/>}/><Row label="기록 확정" right={<Switch on/>}/>
            </div>
          </div>
          <TabBarM active={3}/>
        </React.Fragment>}
    {mode==="toastm"&&<div style={{position:"absolute",left:12,right:12,top:56,display:"grid",gap:8}}><Toast k="final"/><Toast k="goal"/></div>}
  </div>;
}
function ToastSheet({theme}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:440,padding:20,background:"var(--pl-bg)",display:"grid",gap:14}}>
    {[["goal","골 — 자동 사라짐"],["kick","킥오프 — 자동 사라짐"],["ft","경기 종료 — 자동 사라짐"],["final","기록 확정 — 수동 닫기, 좌측 초록 표시선 + 체크 아이콘"]].map(([k,l])=>
      <div key={k} style={{display:"grid",gap:6}}><span className="t-cap">{l}</span><Toast k={k}/></div>)}
  </div>;
}
function BellSheet({theme}){
  const bar=(count,label)=><div style={{display:"grid",gap:6}}>
    <span className="t-cap">{label}</span>
    <div style={{height:60,background:"var(--pl-card)",borderRadius:12,boxShadow:"inset 0 0 0 1px var(--pl-line)",display:"flex",alignItems:"center",gap:16,padding:"0 16px"}}>
      <span className="t-sec" style={{fontSize:18}}>PitchLog</span>
      <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}><Bell count={count}/><span style={{width:32,height:32,borderRadius:"50%",background:"var(--pl-fill-2)"}}/></span>
    </div></div>;
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:440,padding:20,background:"var(--pl-bg)",display:"grid",gap:14}}>
    {bar(0,"안 읽음 0 — 배지 숨김")}{bar(3,"안 읽음 3 — 브랜드 파랑 채움 (빨강은 LIVE·오류 전용)")}{bar(128,"99 초과 — 99+")}
  </div>;
}
function PushSheet({theme}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:440,padding:20,background:"var(--pl-bg)",display:"grid",gap:12}}>
    <span className="t-cap">푸시 문구 — 제목에 스코어, 본문에 득점자</span>
    <PushPreview/>
    <div className="card" style={{padding:14,display:"grid",gap:6}}>
      <span className="t-card">규칙</span>
      <span className="t-sub">같은 경기는 tag로 교체 — 골이 연달아 나도 알림은 항상 1건, 최신 스코어로 갱신됩니다.</span>
      <span className="t-sub">누르면 해당 경기 상세로 이동합니다.</span>
      <span className="t-sub">아이콘은 팀 엠블럼, 없으면 PitchLog 로고를 씁니다.</span>
    </div>
  </div>;
}
Object.assign(window,{ToastSheet,BellSheet,PushSheet,Toast,ToastStack,Bell,NotiPanel,NotiList,PermCard,PermState,NotiSettings,PushPreview,NotiDesktop,NotiMobile,Switch});
