/* H6 — 팀 팔로우/알림이 재방문을 만든다 (모바일 390×844 + 데스크톱 1440×900) */
function Toggle({on,label,desc}){
  return <div style={{display:"flex",gap:12,alignItems:"center",padding:"12px 16px",borderTop:"1px solid var(--pl-line)",minHeight:56}}>
    <div style={{flex:1}}><div className="t-body" style={{fontWeight:600}}>{label}</div>{desc&&<div className="t-sub">{desc}</div>}</div>
    <span style={{width:52,height:32,borderRadius:999,background:on?"var(--pl-primary)":"var(--pl-fill-2)",boxShadow:on?"none":"inset 0 0 0 1px var(--pl-control)",position:"relative",flex:"none"}}>
      <span style={{position:"absolute",top:3,left:on?23:3,width:26,height:26,borderRadius:"50%",background:on?"var(--pl-on-primary)":"var(--pl-card)",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
    </span>
  </div>;
}
function TeamPage({theme,followed,sheet}){
  return <Phone theme={theme}><StatusBarM/><TopBarM title="리버풀" back/>
    <div style={{flex:1,overflow:"hidden",position:"relative"}}>
      <div style={{background:"var(--pl-card)",padding:16,display:"flex",gap:14,alignItems:"center",borderBottom:"1px solid var(--pl-line)"}}>
        <Crest t="리버풀" size={52}/>
        <div><div className="t-card">리버풀 FC</div><div className="t-sub num">EPL · 1위 · 승점 65</div></div>
        {followed
          ? <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto",height:40}}>팔로잉 ✓</button>
          : <Btn style={{marginLeft:"auto",height:40}}>팔로우</Btn>}
      </div>
      {followed&&<div style={{display:"flex",gap:8,alignItems:"center",padding:"10px 16px",background:"color-mix(in srgb,var(--st-pos) 8%,var(--pl-card))",borderBottom:"1px solid var(--pl-line)"}}>
        <span className="badge b-final">알림 켜짐</span><span className="t-sub" style={{color:"var(--pl-text)"}}>킥오프 · 득점 · 기록 확정</span></div>}
      <div style={{background:"var(--pl-card)",marginTop:8}}>
        <SecHead title="다음 경기"/>
        <div style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={{comp:"UCL",home:"리버풀",away:"레알 마드리드",hs:"-",as:"-",st:"sched",time:"내일 05:00"}}/></div>
        <div style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={{comp:"EPL",home:"에버턴",away:"리버풀",hs:"-",as:"-",st:"sched",time:"9월 7일 23:30"}}/></div>
      </div>
      <div style={{background:"var(--pl-card)",marginTop:8}}>
        <SecHead title="최근 결과" action="전체 보기"/>
        <div style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={{comp:"EPL",home:"리버풀",away:"첼시",hs:3,as:1,st:"final",time:"9월 3일",hw:1}}/></div>
      </div>
      {sheet}
    </div><TabBarM active={3}/></Phone>;
}
function Lock({theme}){
  return <Phone theme={theme}>
    <div style={{position:"absolute",inset:0,background:theme==="dark"?"linear-gradient(160deg,#1a1d2b,#0d0e13)":"linear-gradient(160deg,#cfd6e6,#8e9bb5)"}}/>
    <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",color:theme==="dark"?"#EDEDEF":"#171719"}}>
      <StatusBarM/>
      <div style={{textAlign:"center",padding:"28px 0 32px"}}><div className="num" style={{fontSize:64,fontWeight:700,letterSpacing:"-.03em"}}>21:58</div><div className="t-body">9월 3일 수요일</div></div>
      <div style={{padding:"0 12px",display:"grid",gap:10}}>
        {[{b:"final",t:"기록 확정",d:"리버풀 3 - 1 첼시 · 살라 2골 1도움으로 최종 확정",m:"지금"},
          {b:"recheck",t:"재검증 중",d:"77분 득점자가 정정될 수 있습니다",m:"3분 전"},
          {b:"live",t:"득점",d:"리버풀 3 - 1 첼시 (58' 디아스)",m:"1시간 전"}].map(n=>
          <div key={n.t} style={{background:theme==="dark"?"rgba(30,30,35,.82)":"rgba(255,255,255,.82)",backdropFilter:"blur(12px)",borderRadius:16,padding:14,display:"grid",gap:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:20,height:20,borderRadius:5,background:"var(--pl-primary)",display:"grid",placeItems:"center",color:"var(--pl-on-primary)",fontSize:10,fontWeight:700}}>P</span>
              <span className="t-cap" style={{color:"inherit",opacity:.7}}>PITCHLOG</span>
              <span className="t-cap" style={{marginLeft:"auto",opacity:.7}}>{n.m}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><Badge k={n.b}/><span className="t-body" style={{fontWeight:700}}>{n.t}</span></div>
            <div className="t-body">{n.d}</div>
          </div>)}
      </div>
    </div>
  </Phone>;
}
window.FLOW_H6=(theme)=>({
 id:"h6",device:"mobile",
 title:"H6 · 팀 팔로우와 알림이 재방문을 만든다",
 claim:"팔로우 시점에 알림 종류를 고르게 하면, 확정 알림이 다음 세션을 만든다.",
 measure:"팔로우 전환율 · 알림 허용률 · 알림 → 앱 복귀율 · D7 재방문",
 screens:[
  {label:"1. 팀 페이지 (팔로우 전)",note:"팔로우는 화면에서 유일한 채운 브랜드 파랑. 44px 이상.",el:<TeamPage theme={theme}/>},
  {label:"2. 알림 종류 선택",note:"팔로우 직후 시트. 기본값은 3개 모두 켜짐, 끌 수 있다.",
   el:<TeamPage theme={theme} followed sheet={<Sheet title="리버풀 알림">
     <Toggle on label="킥오프 15분 전" desc="경기 시작 알림"/>
     <Toggle on label="득점" desc="양 팀 득점 시"/>
     <Toggle on label="기록 확정" desc="재검증이 끝나 숫자가 고정될 때"/>
     <Toggle label="선수 이적·부상"/>
     <div style={{padding:16}}><Btn style={{width:"100%"}}>저장</Btn></div></Sheet>}/>},
  {label:"3. 팔로우 완료",note:"상태를 색이 아니라 배지 + 문구로 알린다.",el:<TeamPage theme={theme} followed/>},
  {label:"4. 잠금화면 알림",note:"`재검증 중` → `확정` 두 알림이 한 스택에서 이야기가 된다.",el:<Lock theme={theme}/>},
  {label:"5. 알림에서 복귀 — 홈",note:"복귀 랜딩은 홈이 아니라 내 팀 컨텍스트. 첫 화면에 확정 결과.",
   el:<Phone theme={theme}><StatusBarM/><TopBarM title="PitchLog" right={<span style={{width:44,height:44,display:"grid",placeItems:"center",position:"relative",color:"var(--pl-text)"}}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3.5a5 5 0 0 0-5 5V12l-1.5 2.5h13L15 12V8.5a5 5 0 0 0-5-5zM8 17h4"/></svg><i style={{position:"absolute",top:9,right:9,width:8,height:8,borderRadius:"50%",background:"var(--st-neg)"}}/></span>}/>
    <div style={{flex:1,overflow:"auto"}}>
      <div style={{background:"var(--pl-card)",marginTop:8}}>
        <SecHead title="내 팀" action="관리"/>
        <div style={{display:"flex",gap:8,padding:"0 16px 12px",overflow:"hidden"}}>{["리버풀","레알 마드리드","나폴리"].map(t=><span key={t} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:999,background:"var(--pl-fill)",whiteSpace:"nowrap"}} className="t-sub"><Crest t={t} size={16}/>{t}</span>)}</div>
        <div style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={{comp:"EPL",home:"리버풀",away:"첼시",hs:3,as:1,st:"final",time:"어제",hw:1}}/></div>
        <div style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={{comp:"UCL",home:"레알 마드리드",away:"바이에른 뮌헨",hs:2,as:1,st:"live",time:"64'",hw:1}}/></div>
      </div>
      <div style={{background:"var(--pl-card)",marginTop:8}}>
        <SecHead title="오늘의 6개 대회" action="전체 보기"/>
        <div style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={{comp:"세리에",home:"나폴리",away:"유벤투스",hs:"-",as:"-",st:"sched",time:"익일 03:45"}}/></div>
        <div style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={{comp:"리그 1",home:"PSG",away:"모나코",hs:"-",as:"-",st:"sched",time:"익일 04:45"}}/></div>
      </div>
    </div><TabBarM active={0}/></Phone>},
  {label:"6. 알림 센터",note:"읽지 않음은 좌측 표시선이 아니라 도트 + 굵기로 구분한다 (구역 파랑과 충돌 방지).",
   el:<Phone theme={theme}><StatusBarM/><TopBarM title="알림" back right={<button className="link" style={{padding:"0 12px"}}>모두 읽음</button>}/>
    <div style={{flex:1,overflow:"auto",background:"var(--pl-card)"}}>
      {[["final","기록 확정","리버풀 3 - 1 첼시 · 살라 2골 1도움",true,"21:58"],
        ["recheck","재검증 중","77분 득점자가 정정될 수 있습니다",true,"21:55"],
        ["live","득점","리버풀 3 - 1 첼시 (58' 디아스)",false,"21:12"],
        ["sched","킥오프 15분 전","리버풀 vs 첼시 · 안필드",false,"20:15"],
        ["post","경기 연기","유벤투스 vs 나폴리 일정이 변경되었습니다",false,"어제"]].map((n,i)=>
        <div key={i} style={{display:"grid",gridTemplateColumns:"10px 1fr auto",gap:10,padding:"14px 16px",borderTop:i?"1px solid var(--pl-line)":"none",alignItems:"start"}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:n[3]?"var(--pl-primary)":"transparent",marginTop:6}}/>
          <div style={{display:"grid",gap:5}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><Badge k={n[0]}/><span className="t-body" style={{fontWeight:n[3]?700:500}}>{n[1]}</span></div>
            <span className="t-sub">{n[2]}</span>
          </div>
          <span className="t-cap num">{n[4]}</span>
        </div>)}
    </div><TabBarM active={0}/></Phone>},
  {label:"7. 데스크톱 — 내 팀",device:"desktop",note:"같은 알림 모델의 데스크톱 대응. 재방문 시 첫 화면.",
   el:<Desk theme={theme}><DeskNav active="내 팀"/>
     <div style={{padding:"28px 40px 12px",display:"flex",alignItems:"center",gap:12}}><h1 className="t-page" style={{margin:0}}>내 팀</h1><span style={{marginLeft:"auto"}}><Btn sm>팀 추가</Btn></span></div>
     <div style={{padding:"0 40px 40px",display:"grid",gridTemplateColumns:"1fr 380px",gap:24,alignItems:"start"}}>
       <div className="card" style={{overflow:"hidden"}}>
         <SecHead title="팔로우한 팀의 경기" action="전체 보기"/>
         {[{comp:"EPL",home:"리버풀",away:"첼시",hs:3,as:1,st:"final",time:"어제 22:00",hw:1},
           {comp:"UCL",home:"레알 마드리드",away:"바이에른 뮌헨",hs:2,as:1,st:"live",time:"64'",hw:1},
           {comp:"세리에",home:"나폴리",away:"유벤투스",hs:"-",as:"-",st:"sched",time:"익일 03:45"}].map((m,i)=>
           <div key={i} style={{borderTop:"1px solid var(--pl-line)"}}><MatchRow m={m}/></div>)}
       </div>
       <div className="card" style={{overflow:"hidden"}}>
         <SecHead title="알림" action="설정"/>
         {[["final","기록 확정","리버풀 3 - 1 첼시","21:58"],["recheck","재검증 중","77분 득점자 정정 가능","21:55"],["live","득점","58' 디아스","21:12"]].map((n,i)=>
           <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"12px 16px",borderTop:"1px solid var(--pl-line)"}}>
             <Badge k={n[0]}/><div style={{flex:1}}><div className="t-body" style={{fontWeight:600}}>{n[1]}</div><div className="t-sub">{n[2]}</div></div><span className="t-cap num">{n[3]}</span></div>)}
       </div>
     </div></Desk>}
 ]
});
