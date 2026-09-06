/* H4 — 경기 상세에서 선수 기록까지 이탈 없이 이어진다 (모바일 390×844) */
function MDetail({theme,tab="요약",banner,status,children,sheet}){
  return <Phone theme={theme}>
    <StatusBarM/>
    <TopBarM title="리버풀 3 - 1 첼시" back right={<><span style={{width:44,height:44,display:"grid",placeItems:"center",color:"var(--pl-text)"}}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3.5a5 5 0 0 0-5 5V12l-1.5 2.5h13L15 12V8.5a5 5 0 0 0-5-5zM8 17h4"/></svg></span></>}/>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--pl-card)",padding:"16px",display:"grid",gap:12,borderBottom:"1px solid var(--pl-line)"}}>
        <div style={{display:"flex",justifyContent:"center",gap:8,alignItems:"center"}}><span className="t-cap">EPL · 28R · 안필드</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:12}}>
          <div style={{display:"grid",gap:6,justifyItems:"center"}}><Crest t="리버풀" size={40}/><span className="t-body" style={{fontWeight:700}}>리버풀</span></div>
          <div style={{display:"grid",gap:6,justifyItems:"center"}}><span className="num" style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em"}}>3 - 1</span><Badge k={status}/></div>
          <div style={{display:"grid",gap:6,justifyItems:"center"}}><Crest t="첼시" size={40}/><span className="t-body">첼시</span></div>
        </div>
      </div>
      {banner}
      <div style={{display:"flex",gap:0,background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)"}}>
        {["요약","라인업","기록","순위"].map(t=><span key={t} style={{flex:1,minHeight:44,display:"grid",placeItems:"center",fontSize:14,fontWeight:t===tab?700:500,color:t===tab?"var(--pl-text)":"var(--pl-sub)",boxShadow:t===tab?"inset 0 -2px 0 var(--pl-primary)":"none"}}>{t}</span>)}
      </div>
      <div style={{flex:1,overflow:"hidden",position:"relative"}}>{children}{sheet}</div>
    </div>
    <TabBarM active={1}/>
  </Phone>;
}
const RecheckBanner=<div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"12px 16px",background:"color-mix(in srgb,var(--st-warn) 8%,var(--pl-card))",borderBottom:"1px solid var(--pl-line)"}}>
  <span style={{marginTop:1}}><Badge k="recheck"/></span>
  <span className="t-sub" style={{color:"var(--pl-text)"}}>공식 기록과 대조 중입니다. 득점·도움이 바뀔 수 있습니다. <b style={{fontWeight:700}}>보통 3분 이내</b></span>
</div>;
const FinalBanner=<div style={{display:"flex",gap:10,alignItems:"center",padding:"12px 16px",background:"color-mix(in srgb,var(--st-pos) 8%,var(--pl-card))",borderBottom:"1px solid var(--pl-line)"}}>
  <Badge k="final"/><span className="t-sub" style={{color:"var(--pl-text)"}}>21:58 공식 기록과 일치. 이후 수정되지 않습니다.</span>
</div>;
const EVENTS=[["23'","골","살라","리버풀"],["41'","골","은쿤쿠","첼시"],["58'","골","디아스","리버풀"],["77'","골 (수정)","살라","리버풀"]];
function Summary({recheck}){
  return <div style={{overflow:"auto",height:"100%"}}>
    <div style={{background:"var(--pl-card)",marginTop:8}}>
      <SecHead title="주요 장면"/>
      {EVENTS.map((e,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"44px 1fr auto",gap:10,alignItems:"center",padding:"10px 16px",borderTop:"1px solid var(--pl-line)",background:recheck&&i===3?"color-mix(in srgb,var(--st-warn) 6%,transparent)":"transparent"}}>
        <span className="num t-sub" style={{fontWeight:700}}>{e[0]}</span>
        <span className="t-body">{e[2]} <span className="t-sub">· {e[1]}</span></span>
        <Crest t={e[3]}/>
      </div>)}
    </div>
    <div style={{background:"var(--pl-card)",marginTop:8}}>
      <SecHead title="팀 기록"/>
      {[["점유율","58%","42%"],["슈팅","17","9"],["유효 슈팅","8","3"]].map(r=><div key={r[0]} style={{display:"grid",gridTemplateColumns:"48px 1fr 48px",padding:"10px 16px",borderTop:"1px solid var(--pl-line)",alignItems:"center"}}>
        <span className="num t-body" style={{fontWeight:700}}>{r[1]}</span><span className="t-sub" style={{textAlign:"center"}}>{r[0]}</span><span className="num t-body" style={{fontWeight:700,textAlign:"right"}}>{r[2]}</span></div>)}
    </div>
  </div>;
}
const LINEUP=[["11","살라","FW",2,1],["9","누녜스","FW",1,0],["8","소보슬라이","MF",0,2],["10","맥알리스터","MF",0,0],["4","반다이크","DF",0,0]];
function Lineup({onPick}){
  return <div style={{overflow:"auto",height:"100%"}}>
    <div style={{background:"var(--pl-card)",marginTop:8}}>
      <SecHead title="리버풀 선발" action="첼시 보기"/>
      {LINEUP.map(p=><button key={p[0]} onClick={onPick} style={{width:"100%",display:"grid",gridTemplateColumns:"32px 1fr auto",gap:10,alignItems:"center",padding:"0 16px",minHeight:52,borderTop:"1px solid var(--pl-line)",background:"none",border:0,borderTopStyle:"solid",cursor:"pointer",textAlign:"left",font:"inherit",color:"var(--pl-text)"}}>
        <span className="num t-sub" style={{fontWeight:700}}>{p[0]}</span>
        <span><span className="t-body" style={{fontWeight:600}}>{p[1]}</span> <span className="t-cap">{p[2]}</span></span>
        <span className="num t-sub">{p[3]}골 {p[4]}도움</span>
      </button>)}
    </div>
  </div>;
}
function Sheet({title,children,full}){
  return <div style={{position:"absolute",inset:full?"0":"auto 0 0 0",top:full?0:"34%",background:"var(--pl-card)",borderRadius:full?0:"16px 16px 0 0",boxShadow:"var(--sh-modal)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
    {!full&&<div style={{padding:"8px 0",display:"grid",placeItems:"center"}}><span style={{width:36,height:4,borderRadius:2,background:"var(--pl-line)"}}/></div>}
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 12px 10px 16px"}}>
      <span className="t-card">{title}</span>
      <button className="btn-ghost" style={{marginLeft:"auto",width:44,height:44,border:0,background:"none",cursor:"pointer",color:"var(--pl-text)"}} aria-label="닫기">✕</button>
    </div>
    <div style={{flex:1,overflow:"auto"}}>{children}</div>
  </div>;
}
function PlayerStats({rows}){
  return <div>{rows.map(r=><div key={r[0]} style={{display:"flex",justifyContent:"space-between",padding:"11px 16px",borderTop:"1px solid var(--pl-line)"}}>
    <span className="t-sub">{r[0]}</span><span className="num t-body" style={{fontWeight:700}}>{r[1]}</span></div>)}</div>;
}
const PSTAT=[["출전 시간","90'"],["골","2"],["도움","1"],["슈팅 (유효)","6 (4)"],["패스 성공률","87.5%"],["드리블 성공","4 / 7"],["평점","9.1"]];
Object.assign(window,{Sheet,PlayerStats,MDetail,Lineup,Summary});
window.FLOW_H4=(theme)=>({
 id:"h4",device:"mobile",
 title:"H4 · 경기 상세에서 선수 기록까지 이탈 없이 이어진다",
 claim:"경기 → 라인업 → 선수 기록이 같은 맥락 안에서 이어지고, 뒤로가기 없이 돌아올 수 있다.",
 measure:"경기 상세 → 선수 기록 도달률 · 중간 이탈률 · 시트 닫은 뒤 복귀율",
 screens:[
  {label:"1. 경기 상세 — 종료",note:"`종료`는 아직 확정이 아니다. 숫자는 잠정값.",
   el:<MDetail theme={theme} status="ft"><Summary/></MDetail>},
  {label:"2. 재검증 중",note:"이 서비스의 차별점. 바뀔 수 있는 값과 이유·예상 시간을 명시한다.",
   el:<MDetail theme={theme} status="recheck" banner={RecheckBanner}><Summary recheck/></MDetail>},
  {label:"3. 확정",note:"`종료`→`재검증 중`→`확정` 3단계가 배지와 배너 양쪽에서 읽힌다.",
   el:<MDetail theme={theme} status="final" banner={FinalBanner}><Summary/></MDetail>},
  {label:"4. 라인업",note:"선수 행은 44px 이상. 팀 이름·선수 이름에 브랜드 색을 쓰지 않는다.",
   el:<MDetail theme={theme} status="final" tab="라인업"><Lineup/></MDetail>},
  {label:"5. 선수 기록 시트",note:"이탈 없음: 경기 화면 위에 시트로 열린다. 숫자는 tabular-nums.",
   el:<MDetail theme={theme} status="final" tab="라인업" sheet={<Sheet title="살라 · 리버풀 #11"><PlayerStats rows={PSTAT}/><div style={{padding:16}}><Btn style={{width:"100%"}}>선수 페이지 열기</Btn></div></Sheet>}><Lineup/></MDetail>},
  {label:"6. 선수 기록 로드 실패",note:"시트 안에서 실패해도 경기 맥락은 유지된다.",
   el:<MDetail theme={theme} status="final" tab="라인업" sheet={<Sheet title="살라 · 리버풀 #11"><ErrorState title="선수 기록을 불러오지 못했습니다" desc="경기 기록은 정상입니다. 선수 통계 서버만 응답하지 않습니다. (503)"/></Sheet>}><Lineup/></MDetail>},
  {label:"7. 선수 페이지",note:"시즌 누적으로 확장. 상단에 돌아갈 경기 맥락을 남긴다.",
   el:<Phone theme={theme}><StatusBarM/><TopBarM title="모하메드 살라" back right={<Btn sm>팔로우</Btn>}/>
     <div style={{flex:1,overflow:"auto"}}>
       <div style={{background:"var(--pl-card)",padding:16,display:"flex",gap:14,alignItems:"center",borderBottom:"1px solid var(--pl-line)"}}>
         <span style={{width:56,height:56,borderRadius:"50%",background:"var(--pl-fill-2)",flex:"none"}}/>
         <div><div className="t-card">모하메드 살라</div><div className="t-sub">리버풀 · FW · #11</div></div>
         <div style={{marginLeft:"auto",textAlign:"right"}}><div className="num" style={{fontSize:24,fontWeight:700}}>18</div><div className="t-cap">시즌 골</div></div>
       </div>
       <div style={{background:"var(--pl-card)",marginTop:8}}>
         <SecHead title="2025/26 EPL" action="대회 변경"/>
         <PlayerStats rows={[["출전","27경기"],["골","18"],["도움","11"],["90분당 골","0.71"],["평점","7.94"]]}/>
       </div>
       <div style={{background:"var(--pl-card)",marginTop:8}}>
         <SecHead title="최근 경기" action="전체 보기"/>
         {[["리버풀 3-1 첼시","2골 1도움","final"],["아스널 1-2 리버풀","1골","final"],["리버풀 0-0 인터","-","recheck"]].map(r=><div key={r[0]} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderTop:"1px solid var(--pl-line)"}}>
           <span className="t-body" style={{flex:1}}>{r[0]}</span><span className="num t-sub">{r[1]}</span><Badge k={r[2]}/></div>)}
       </div>
     </div><TabBarM active={1}/></Phone>}
 ]
});
