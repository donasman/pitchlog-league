/* 8단계 — AI 어시스턴트. 전역 패널. 숫자는 문장이 아니라 데이터 카드로 렌더링한다. */
function AskFab(){
  return <button className="btn" style={{height:56,borderRadius:999,padding:"0 20px",gap:10,boxShadow:"var(--sh-modal)"}}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="m13.6 13.6 3.4 3.4M9 6.4v.1M9 8.4v3"/></svg>
    질문하기
  </button>;
}
function Mark({size=28}){
  return <span style={{width:size,height:size,borderRadius:8,background:"var(--pl-text)",color:"var(--pl-bg)",display:"grid",placeItems:"center",flex:"none",fontSize:size*.42,fontWeight:700}}>P</span>;
}
function UserMsg({children}){
  return <div style={{display:"flex",justifyContent:"flex-end"}}>
    <span style={{maxWidth:"78%",background:"var(--pl-primary)",color:"var(--pl-on-primary)",padding:"10px 14px",borderRadius:"14px 14px 4px 14px",fontSize:14,fontWeight:500,lineHeight:1.5}}>{children}</span>
  </div>;
}
function AiMsg({children,stamp="13:42",evidence,evidenceOpen,recheck,mobile}){
  return <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
    <Mark/>
    <div className="card" style={{flex:1,minWidth:0,padding:14,display:"grid",gap:10}}>
      {children}
      <div style={{borderTop:"1px solid var(--pl-line)",paddingTop:10,display:"grid",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <button className={"link"+(mobile?" link-m":"")} style={{display:"inline-flex",alignItems:"center",gap:6}}>
            <span style={{transform:evidenceOpen?"rotate(90deg)":"none",display:"inline-block"}}>▸</span>근거 보기
          </button>
          {recheck&&<Badge k="recheck"/>}
          <span className="t-cap num" style={{marginLeft:"auto"}}>{stamp} 기준</span>
        </div>
        {evidenceOpen&&<div style={{background:"var(--pl-fill)",borderRadius:8,padding:12,display:"grid",gap:6}}>
          {evidence.map(([k,v])=><div key={k} style={{display:"grid",gridTemplateColumns:"56px 1fr",gap:10}}>
            <span className="t-cap">{k}</span><span className="t-sub" style={{color:"var(--pl-text)"}}>{v}</span></div>)}
        </div>}
      </div>
    </div>
  </div>;
}
/* 데이터 카드 — 기존 컴포넌트 재사용 */
const SLICE=[{no:1,name:"리버풀",pts:65,zone:"ucl",pat:"solid"},{no:2,name:"아스널",pts:60,zone:"ucl",pat:"solid"},{no:3,name:"맨체스터 시티",pts:56,zone:"ucl",pat:"solid",me:true},{no:4,name:"첼시",pts:52,zone:"ucl",pat:"solid"},{no:5,name:"뉴캐슬",pts:48,zone:"uel",pat:"dash"}];
function StandSlice(){
  return <div style={{borderRadius:10,overflow:"hidden",boxShadow:"inset 0 0 0 1px var(--pl-line)"}}>
    <div className="zrow t-cap" style={{gridTemplateColumns:"26px 1fr 44px",height:28}}><span>#</span><span>팀</span><span style={{textAlign:"right"}}>승점</span></div>
    {SLICE.map(r=><div key={r.no} className="zrow num" data-zone={r.zone} data-pat={r.pat} style={{"--zc":ZONES[r.zone].c,gridTemplateColumns:"26px 1fr 44px",height:36,background:r.me?"var(--pl-fill)":"transparent"}}>
      <span style={{fontWeight:700}}>{r.no}</span>
      <span style={{display:"flex",alignItems:"center",gap:7,minWidth:0,fontVariantNumeric:"normal",fontWeight:r.me?700:600}}><Crest t={r.name} size={16}/><span className="tname">{r.name}</span></span>
      <span style={{textAlign:"right",fontWeight:700}}>{r.pts}</span></div>)}
  </div>;
}
function PlayerStatCard(){
  const rows=[["EPL",27,18,11],["UCL",9,3,2],["FA컵",3,0,1]];
  return <div style={{borderRadius:10,overflow:"hidden",boxShadow:"inset 0 0 0 1px var(--pl-line)"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderBottom:"1px solid var(--pl-line)"}}>
      <Avatar size={22} none/><span className="t-body" style={{fontWeight:700}}>손흥민</span><span className="t-cap">토트넘 · FW</span>
    </div>
    <div className="t-cap" style={{display:"grid",gridTemplateColumns:"1fr 46px 40px 46px",gap:8,padding:"0 12px",height:26,alignItems:"center"}}>
      <span>대회</span><span style={{textAlign:"right"}}>출전</span><span style={{textAlign:"right"}}>골</span><span style={{textAlign:"right"}}>도움</span>
    </div>
    {rows.map(r=><div key={r[0]} className="num" style={{display:"grid",gridTemplateColumns:"1fr 46px 40px 46px",gap:8,padding:"0 12px",height:34,alignItems:"center",borderTop:"1px solid var(--pl-line)",fontSize:13}}>
      <span style={{fontVariantNumeric:"normal"}}>{r[0]}</span>
      {r.slice(1).map((v,i)=><span key={i} style={{textAlign:"right",color:i===1?"var(--pl-text)":"var(--pl-sub)",fontWeight:i===1?700:500}}>{v}</span>)}
    </div>)}
  </div>;
}
function CompareTable(){
  const rows=[["최근 5경기","3승 1무 1패","4승 1패"],["득점","62","58"],["실점","28","31"],["승점","65","60"]];
  return <div style={{borderRadius:10,overflow:"hidden",boxShadow:"inset 0 0 0 1px var(--pl-line)"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 90px 90px",gap:8,padding:"9px 12px",borderBottom:"1px solid var(--pl-line)",alignItems:"center"}}>
      <span className="t-cap">비교</span>
      {["리버풀","아스널"].map(t=><span key={t} style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}><Crest t={t} size={16}/><span className="t-cap" style={{color:"var(--pl-text)",fontWeight:700}}>{t}</span></span>)}
    </div>
    {rows.map(r=><div key={r[0]} className="num" style={{display:"grid",gridTemplateColumns:"1fr 90px 90px",gap:8,padding:"0 12px",height:34,alignItems:"center",borderTop:"1px solid var(--pl-line)",fontSize:13}}>
      <span className="t-sub" style={{fontVariantNumeric:"normal"}}>{r[0]}</span>
      <span style={{textAlign:"right",fontWeight:700}}>{r[1]}</span><span style={{textAlign:"right",fontWeight:700}}>{r[2]}</span></div>)}
  </div>;
}
function MiniMatch({recheck}){
  const m=recheck?{t:"22:00",comp:"EPL",note:"28R",h:T.liv,a:T.bri,hs:3,as:1,st:"recheck"}:{t:"내일 05:00",comp:"UCL",note:"8강 2차전",h:T.liv,a:T.rma,hs:"-",as:"-",st:"sched"};
  return <MatchRowCard m={m}/>;
}
/* 패널 본문 상태들 */
const EXAMPLES=["손흥민 이번 시즌 기록 알려줘","리버풀 다음 경기 언제야?","EPL 상위 4팀 최근 5경기 비교해줘","챔피언스리그 16강 올라간 팀은?"];
function PanelEmpty({mobile}){
  return <div style={{display:"grid",gap:14,padding:16,alignContent:"start"}}>
    <div style={{display:"grid",gap:8}}>
      <Mark size={36}/>
      <span className="t-sec" style={{fontSize:19}}>무엇을 찾아드릴까요?</span>
      <span className="t-sub">일정 · 순위 · 선수 기록을 물어보세요. 숫자는 데이터베이스에서 직접 가져옵니다.</span>
    </div>
    <div style={{display:"grid",gap:8}}>
      <span className="t-cap">예시 질문</span>
      {EXAMPLES.map(q=><button key={q} className="btn btn-ghost" style={{justifyContent:"flex-start",height:44,fontWeight:500,fontSize:14}}>{q}</button>)}
    </div>
    <span className="t-cap">승부 예측이나 의견은 답하지 않습니다 — 조회할 수 있는 기록만 알려드립니다.</span>
  </div>;
}
function PanelChat({state="normal",mobile}){
  return <div style={{display:"grid",gap:14,padding:16,alignContent:"end",height:"100%",overflow:"hidden"}}>
    <UserMsg>손흥민 이번 시즌 기록 알려줘</UserMsg>
    <AiMsg mobile={mobile} stamp="13:42" evidence={[["조회","선수 시즌 기록 (손흥민, 전체 대회, 2025/26)"],["기준","2026-09-03 13:42"],["출처","API-Football → PitchLog DB"]]} evidenceOpen={state==="evidence"}>
      <span className="t-body">2025/26 시즌 기록입니다. 대회별로 나눠서 보여드립니다.</span>
      <PlayerStatCard/>
      <span className="t-sub">합산 39경기 21골 14도움.</span>
    </AiMsg>
    {state==="recheck"
      ? <React.Fragment>
          <UserMsg>어제 리버풀 경기 결과는?</UserMsg>
          <AiMsg mobile={mobile} stamp="13:42" recheck evidence={[["조회","경기 결과 (리버풀 vs 브라이턴, EPL 28R)"],["기준","2026-09-03 13:42"],["출처","API-Football → PitchLog DB · 공식 기록 대조 중"]]}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span className="t-body">어제 리버풀 경기 기록은 아직 확정되지 않았습니다.</span><Badge k="recheck"/>
            </div>
            <MiniMatch recheck/>
            <span className="t-sub">현재 값은 3 - 1이고, 공식 기록이 확정되면 득점자와 도움이 바뀔 수 있습니다. 확정되면 알림으로 알려드릴 수 있습니다.</span>
            <div style={{display:"flex",gap:8}}><Btn ghost sm={!mobile}>확정되면 알림</Btn><Btn ghost sm={!mobile}>경기 상세</Btn></div>
          </AiMsg>
        </React.Fragment>
      : state==="thinking"
      ? <React.Fragment>
          <UserMsg>EPL 상위 4팀 최근 5경기 비교해줘</UserMsg>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <Mark/>
            <div className="card" style={{flex:1,padding:14,display:"grid",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <svg className="spin" width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--pl-sub)"}}><path d="M6 1a5 5 0 1 0 5 5" strokeLinecap="round"/></svg>
                <span className="t-body">EPL 순위를 조회하는 중…</span>
              </div>
              <div style={{display:"grid",gap:6}}>{[70,52,86].map((w,i)=><span key={i} className="sk" style={{height:12,width:w+"%"}}/>)}</div>
              <span className="t-cap">조회 도구: 순위 · 최근 경기 결과</span>
            </div>
          </div>
        </React.Fragment>
      : state==="cant"
      ? <React.Fragment>
          <UserMsg>올 시즌 EPL 누가 우승할까?</UserMsg>
          <AiMsg mobile={mobile} stamp="13:42" evidence={[["조회","없음 — 예측은 조회 도구로 답할 수 없습니다"],["기준","2026-09-03 13:42"],["출처","—"]]}>
            <span className="t-body">우승 예측은 답하지 않습니다. 기록으로 확인할 수 있는 것만 알려드립니다.</span>
            <span className="t-sub">대신 이런 것을 물어보실 수 있습니다.</span>
            <div style={{display:"grid",gap:8}}>{["현재 EPL 승점 차이","선두 팀 남은 일정","최근 10경기 승점 추이"].map(q=><button key={q} className="btn btn-ghost" style={{justifyContent:"flex-start",height:44,fontWeight:500,fontSize:13}}>{q}</button>)}</div>
          </AiMsg>
        </React.Fragment>
      : state==="error"
      ? <React.Fragment>
          <UserMsg>리버풀 다음 경기 언제야?</UserMsg>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <Mark/>
            <div className="card" style={{flex:1,padding:14,display:"grid",gap:10,boxShadow:"inset 0 0 0 1px var(--st-neg)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span className="badge b-live" style={{background:"var(--st-neg)"}}>오류</span><span className="t-body" style={{fontWeight:600}}>일정을 조회하지 못했습니다</span></div>
              <span className="t-sub">경기 일정 서버가 응답하지 않습니다 (504). 답을 지어내지 않고 여기서 멈춥니다.</span>
              <div style={{display:"flex",gap:8}}><Btn sm={!mobile}>다시 시도</Btn><Btn ghost sm={!mobile}>경기 탭에서 보기</Btn></div>
            </div>
          </div>
        </React.Fragment>
      : <React.Fragment>
          <UserMsg>리버풀 다음 경기랑 지금 순위도 같이 알려줘</UserMsg>
          <AiMsg mobile={mobile} stamp="13:42" evidence={[["조회","팀 일정 (리버풀, 다음 1경기) · 순위 (EPL 2025/26)"],["기준","2026-09-03 13:42"],["출처","API-Football → PitchLog DB"]]}>
            <span className="t-body">다음 경기와 현재 순위입니다.</span>
            <MiniMatch/>
            <StandSlice/>
            <span className="t-sub">리버풀은 3위 팀과 승점 9 차이입니다.</span>
          </AiMsg>
        </React.Fragment>}
  </div>;
}
function PanelInput({mobile}){
  return <div style={{padding:12,borderTop:"1px solid var(--pl-line)",background:"var(--pl-card)",display:"grid",gap:8}}>
    <div style={{display:"flex",gap:8,alignItems:"center",minHeight:48,padding:"0 6px 0 14px",borderRadius:12,background:"var(--pl-fill)",boxShadow:"inset 0 0 0 1px var(--pl-control)"}}>
      <span className="t-sub" style={{flex:1}}>일정 · 순위 · 기록을 물어보세요</span>
      <button className="btn" style={{width:mobile?44:40,height:mobile?44:40,padding:0,borderRadius:10}} aria-label="보내기">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M10 16V4m0 0L5 9m5-5 5 5"/></svg>
      </button>
    </div>
    <span className="t-cap">답변의 숫자는 조회 결과입니다. 근거와 기준 시각이 함께 표시됩니다.</span>
  </div>;
}
function PanelShell({title="어시스턴트",children}){
  return <div style={{width:420,height:"100%",background:"var(--pl-card)",boxShadow:"var(--sh-modal)",display:"flex",flexDirection:"column",borderLeft:"1px solid var(--pl-line)"}}>
    <div style={{height:56,display:"flex",alignItems:"center",gap:10,padding:"0 8px 0 16px",borderBottom:"1px solid var(--pl-line)",flex:"none"}}>
      <Mark size={24}/><span className="t-card">{title}</span>
      <span style={{marginLeft:"auto",display:"flex",gap:2}}>
        <span style={{width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-sub)"}}>⤢</span>
        <span style={{width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-sub)"}}>✕</span>
      </span>
    </div>
    <div style={{flex:1,overflow:"hidden",background:"var(--pl-bg)"}}>{children}</div>
    <PanelInput/>
  </div>;
}
function AssistantDesk({theme,state="empty",fabOnly,h=900}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
    <HeaderDesk theme={theme} active="순위"/>
    <div style={{flex:1,overflow:"hidden",padding:"18px 24px",display:"grid",gridTemplateColumns:"196px 1fr 320px",gap:16,alignItems:"start",opacity:.5}}>
      <div className="card" style={{height:280}}/><div className="card" style={{height:520}}/><div className="card" style={{height:400}}/>
    </div>
    {!fabOnly&&<div style={{position:"absolute",top:60,right:0,bottom:0}}>
      <PanelShell>{state==="empty"?<PanelEmpty/>:<PanelChat state={state}/>}</PanelShell>
    </div>}
    <div style={{position:"absolute",right:fabOnly?24:444,bottom:24}}><AskFab/></div>
  </div>;
}
function AssistantMobile({theme,state="empty",full,h=844}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
    <StatusBarM/>
    <TopBarM title="순위"/>
    <div style={{flex:1,overflow:"hidden",padding:12,display:"grid",gap:10,alignContent:"start",opacity:.5}}>
      <div className="card" style={{height:120}}/><div className="card" style={{height:220}}/>
    </div>
    <div style={{position:"absolute",left:0,right:0,bottom:0,top:full?44:"34%",background:"var(--pl-card)",borderRadius:full?0:"16px 16px 0 0",boxShadow:"var(--sh-modal)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"8px 0",display:"grid",placeItems:"center",flex:"none"}}><span style={{width:36,height:4,borderRadius:2,background:"var(--pl-line)"}}/></div>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 8px 8px 16px",flex:"none"}}>
        <Mark size={24}/><span className="t-card">어시스턴트</span>
        <span style={{marginLeft:"auto",width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-sub)"}}>✕</span>
      </div>
      <div style={{flex:1,overflow:"hidden",background:"var(--pl-bg)"}}>{state==="empty"?<PanelEmpty mobile/>:<PanelChat state={state} mobile/>}</div>
      <PanelInput mobile/>
    </div>
  </div>;
}
Object.assign(window,{AskFab,AssistantDesk,AssistantMobile,PanelChat,PanelEmpty,StandSlice,CompareTable,PlayerStatCard,AiMsg,UserMsg,Mark});
