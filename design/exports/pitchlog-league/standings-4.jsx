/* 4단계 — 순위 /standings. 2단계 순위표 행을 그대로 쓴다. */
const ZCFG={
 domestic:[
  {k:"ucl",pat:"solid",label:"UCL 직행",rows:[1,4]},
  {k:"uel",pat:"dash",label:"유로파리그",rows:[5,5]},
  {k:"uecl",pat:"dot",label:"컨퍼런스리그",rows:[6,6]},
  {k:"relpo",pat:"block",label:"강등 플레이오프",rows:[18,18]},
  {k:"rel",pat:"solid",label:"강등",rows:[19,20]}],
 ucl:[
  {k:"ucl",pat:"solid",label:"16강 직행",rows:[1,8]},
  {k:"uclpo",pat:"dash",label:"플레이오프",rows:[9,24]},
  {k:"rel",pat:"dot",label:"탈락",rows:[25,36]}]
};
const EPL_TEAMS=["리버풀","아스널","맨체스터 시티","첼시","뉴캐슬","애스턴 빌라","토트넘","브라이턴 앤 호브 알비온","본머스","풀럼","브렌트포드","크리스털 팰리스","에버턴","웨스트햄","울버햄프턴","노팅엄 포리스트","레스터","입스위치","사우샘프턴","번리"];
const UCL_TEAMS=["레알 마드리드","바이에른 뮌헨","리버풀","인터 밀란","아스널","바르셀로나","PSG","아탈란타","도르트문트","AC 밀란","레버쿠젠","아스톤 빌라"];
const SHORT={"브라이턴 앤 호브 알비온":"브라이턴","맨체스터 시티":"맨시티","노팅엄 포리스트":"노팅엄","크리스털 팰리스":"팰리스","울버햄프턴":"울버햄프턴","레알 마드리드":"레알","바이에른 뮌헨":"바이에른","인터 밀란":"인터","아스톤 빌라":"빌라","AC 밀란":"밀란"};
function mkRows(names,ucl){
  return names.map((n,i)=>{const no=i+1,pl=ucl?6:28,w=Math.max(0,(ucl?6:22)-Math.floor(i*(ucl?.45:1.05))),d=(i*3)%5,l=pl-w-d;
    const gf=(ucl?18:64)-i*(ucl?1.1:2.2)|0,ga=(ucl?4:20)+i*(ucl?.9:1.6)|0;
    return {no,name:n,short:SHORT[n]||n,pl,w,d:Math.max(0,d),l:Math.max(0,l),gf,ga,gd:gf-ga,pts:w*3+d,form:[["W","D","L"][i%3],["W","W","L"][(i+1)%3],["D","L","W"][i%3],["W","L","D"][(i+2)%3],["L","W","W"][i%3]]};});
}
function zoneOf(no,mode){const cfg=ZCFG[mode];return cfg.find(z=>no>=z.rows[0]&&no<=z.rows[1]);}
function StandLegend({mode,sm}){
  return <div className={"legend"+(sm?" legend-sm":"")}>
    {ZCFG[mode].map(z=><span key={z.k} className="legend-i" style={{"--zc":ZONES[z.k].c}}>
      <i style={z.pat==="solid"?{}:{background:`repeating-linear-gradient(180deg,${ZONES[z.k].c} 0 ${z.pat==="dash"?"4px":z.pat==="dot"?"2px":"6px"},transparent ${z.pat==="dash"?"4px 7px":z.pat==="dot"?"2px 4px":"6px 9px"})`}}/>
      {z.label} <span className="num" style={{opacity:.75}}>({z.rows[0]}{z.rows[1]!==z.rows[0]?"–"+z.rows[1]:""}위)</span>
    </span>)}
  </div>;
}
const COLS="34px 1fr 40px 34px 34px 34px 40px 40px 46px 48px 110px";
function TableHead(){
  return <div className="zrow t-cap" style={{gridTemplateColumns:COLS,height:36}}>
    <span>#</span><span>팀</span>
    {["경기","승","무","패","득점","실점","득실"].map(h=><span key={h} style={{textAlign:"center"}}>{h}</span>)}
    <span style={{textAlign:"right"}}>승점</span><span style={{textAlign:"right"}}>최근 5경기</span>
  </div>;
}
function TableRow({r,mode,h=40}){
  const z=zoneOf(r.no,mode);
  return <div className="zrow num" data-zone={z?z.k:undefined} data-pat={z?z.pat:undefined} style={{"--zc":z?ZONES[z.k].c:undefined,gridTemplateColumns:COLS,height:h}}>
    <span style={{fontWeight:700}}>{r.no}</span>
    <span style={{display:"flex",alignItems:"center",gap:9,minWidth:0,fontVariantNumeric:"normal",fontWeight:600}}><Crest t={r.name} size={20}/><span className="tname" title={r.name}>{r.name}</span></span>
    {[r.pl,r.w,r.d,r.l,r.gf,r.ga].map((v,i)=><span key={i} style={{textAlign:"center",color:"var(--pl-sub)"}}>{v}</span>)}
    <span style={{textAlign:"center",color:"var(--pl-sub)"}}>{r.gd>0?"+"+r.gd:r.gd}</span>
    <span style={{textAlign:"right",fontWeight:700}}>{r.pts}</span>
    <span style={{display:"flex",justifyContent:"flex-end"}}><Form f={r.form}/></span>
  </div>;
}
function StageLine({mode}){
  return <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
    <span className="t-body" style={{fontWeight:600}}>{mode==="ucl"?"리그 페이즈 · 6라운드 중 4라운드 진행 중":"28라운드 진행 중 · 38라운드 중"}</span>
    <span className="t-sub">{mode==="ucl"?"36개 팀 단일 순위표 (조별리그 아님)":"20개 팀"}</span>
    <span style={{marginLeft:"auto"}}><Stamp/></span>
  </div>;
}
function StandingsDesk({theme,mode="domestic",h=1180}){
  const rows=mode==="ucl"?mkRows(UCL_TEAMS,true):mkRows(EPL_TEAMS);
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:1440,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <HeaderDesk theme={theme} active="순위"/>
    <div style={{flex:1,overflow:"hidden",padding:"20px 40px 0",display:"grid",gap:12,alignContent:"start"}}>
      <div style={{display:"flex",alignItems:"baseline",gap:12}}>
        <h1 className="t-page" style={{margin:0,fontSize:26}}>순위</h1>
        <span className="t-sub">2025/26 · 6개 대회</span>
        <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}><FilterSelect label="시즌" value="2025/26"/><Btn sm>내 팀 강조</Btn></span>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderBottom:"1px solid var(--pl-line)",paddingBottom:12}}>
        <span className="t-cap" style={{width:52}}>대회</span>
        {CSEL.slice(1).map(([ab,full])=><Chip key={ab} on={mode==="ucl"?ab==="UCL":ab==="EPL"}>{full}</Chip>)}
        <span className="t-sub" style={{marginLeft:"auto"}}>하나만 선택 — 대회마다 구역 구성이 다릅니다</span>
      </div>
      <StageLine mode={mode}/>
      <div className="card" style={{overflow:"hidden"}}>
        <TableHead/>
        {rows.map(r=><TableRow key={r.no} r={r} mode={mode}/>)}
        <div style={{padding:"14px 16px",borderTop:"1px solid var(--pl-line)",display:"grid",gap:8}}>
          <span className="t-cap">구역 — 좌측 표시선의 색과 무늬가 아래 범례와 같습니다</span>
          <StandLegend mode={mode}/>
        </div>
      </div>
    </div>
  </div>;
}
/* 모바일 — 순위·팀 고정, 나머지 가로 스크롤 */
const MCOLS="30px 122px";
const MSCROLL=[["경기","pl"],["승","w"],["무","d"],["패","l"],["득점","gf"],["실점","ga"],["득실","gd"],["승점","pts"]];
function MobileTable({mode}){
  const rows=(mode==="ucl"?mkRows(UCL_TEAMS,true):mkRows(EPL_TEAMS)).slice(0,12);
  const cell={height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13};
  return <div style={{display:"flex",minWidth:0}}>
    <div style={{flex:"none",background:"var(--pl-card)",boxShadow:"1px 0 0 var(--pl-line),6px 0 12px -8px rgba(0,0,0,.28)",position:"relative",zIndex:1}}>
      <div className="zrow t-cap" style={{gridTemplateColumns:MCOLS,height:36,padding:"0 8px 0 12px"}}><span>#</span><span>팀</span></div>
      {rows.map(r=>{const z=zoneOf(r.no,mode);
        return <div key={r.no} className="zrow num" data-zone={z?z.k:undefined} data-pat={z?z.pat:undefined} style={{"--zc":z?ZONES[z.k].c:undefined,gridTemplateColumns:MCOLS,height:44,padding:"0 8px 0 12px",background:"var(--pl-card)"}}>
          <span style={{fontWeight:700}}>{r.no}</span>
          <span style={{display:"flex",alignItems:"center",gap:7,minWidth:0,fontVariantNumeric:"normal",fontWeight:600}}><Crest t={r.name} size={18}/><span className="tname" title={r.name}>{r.short}</span></span>
        </div>;})}
    </div>
    <div style={{overflowX:"auto",minWidth:0,flex:1}}>
      <div style={{minWidth:400}}>
        <div className="t-cap" style={{display:"grid",gridTemplateColumns:`repeat(${MSCROLL.length},50px)`,height:36,alignItems:"center"}}>
          {MSCROLL.map(([h])=><span key={h} style={{textAlign:"center"}}>{h}</span>)}
        </div>
        {rows.map(r=><div key={r.no} className="num" style={{display:"grid",gridTemplateColumns:`repeat(${MSCROLL.length},50px)`,height:44,boxShadow:"inset 0 1px 0 var(--pl-line)"}}>
          {MSCROLL.map(([h,k])=><span key={h} style={{...cell,fontWeight:k==="pts"?700:500,color:k==="pts"?"var(--pl-text)":"var(--pl-sub)"}}>{k==="gd"?(r.gd>0?"+"+r.gd:r.gd):r[k]}</span>)}
        </div>)}
      </div>
    </div>
  </div>;
}
function StandingsMobile({theme,mode="domestic",h=844}){
  return <div className={"pl "+(theme==="dark"?"dark":"")} style={{width:390,height:h,background:"var(--pl-bg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <StatusBarM/>
    <TopBarM title="순위" right={<span className="t-cap num" style={{padding:"0 12px"}}>2025/26</span>}/>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto",background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)",WebkitMaskImage:"linear-gradient(90deg,#000 calc(100% - 24px),transparent)"}}>
        {CSEL.slice(1).map(([ab])=><Chip key={ab} m on={mode==="ucl"?ab==="UCL":ab==="EPL"}>{ab}</Chip>)}
      </div>
      <div style={{padding:"10px 16px 8px",display:"grid",gap:4,background:"var(--pl-card)",borderBottom:"1px solid var(--pl-line)"}}>
        <span className="t-body" style={{fontWeight:600}}>{mode==="ucl"?"리그 페이즈 · 4라운드 진행 중":"28라운드 진행 중"}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className="t-cap">{mode==="ucl"?"36개 팀 단일 순위표":"20개 팀"}</span>
          <span style={{marginLeft:"auto"}}><Stamp/></span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",background:"var(--pl-fill)",borderBottom:"1px solid var(--pl-line)"}}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{color:"var(--pl-sub)"}} aria-hidden="true"><path d="M7 5 3 10l4 5M13 5l4 5-4 5"/></svg>
        <span className="t-cap">순위·팀은 고정, 나머지 열은 좌우로 밀어 보세요 · 폼은 팀을 누르면 나옵니다</span>
      </div>
      <div style={{flex:1,overflow:"hidden",background:"var(--pl-card)"}}><MobileTable mode={mode}/></div>
      <div style={{padding:"10px 14px",borderTop:"1px solid var(--pl-line)",background:"var(--pl-card)"}}><StandLegend mode={mode} sm/></div>
    </div>
  </div>;
}
Object.assign(window,{UCL_TEAMS,EPL_TEAMS,mkRows,zoneOf,StandingsDesk,StandingsMobile,StandLegend,ZCFG});
