/* Hozi cockpit - vanilla JS, no build.
   Data globals: window.HOZI (projections), HOZI_GEO (polygons), HOZI_NAMEMAP, HOZI_I18N. */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const D=window.HOZI, GEO=window.HOZI_GEO, NM=window.HOZI_NAMEMAP, t=window.hoziT;
window.HOZI_LANG='en';
const MONTHS_EN=["January","February","March","April","May","June","July","August","September"];
const districts=D.districts.filter(d=>d.timeline&&d.timeline.length>=9);
const byName={}; districts.forEach(d=>byName[d.district]=d);
const hotspots=[...districts].sort((a,b)=>b.timeline[8].risk-a.timeline[8].risk);
let monthIdx=5, playing=null, selected=null, planMode=false, supportN=0, supportedSet=new Set();

/* ---- risk helpers (ported from legacy app) ---- */
const rgb=a=>`rgb(${a[0]},${a[1]},${a[2]})`;
function col(v){const st=[[30,[30,107,79]],[50,[216,155,46]],[66,[217,131,36]],[85,[188,59,42]]];
  if(v<=st[0][0])return rgb(st[0][1]); if(v>=st[3][0])return rgb(st[3][1]);
  for(let i=0;i<3;i++){const[a,ca]=st[i],[b,cb]=st[i+1]; if(v>=a&&v<=b){const k=(v-a)/(b-a);
    return rgb(ca.map((c,j)=>Math.round(c+(cb[j]-c)*k)));}} return rgb(st[3][1]);}
const band=v=> v>=66?'High':(v>=45?'Medium':'Low');
const bandCol=v=> v>=66?'#BC3B2A':(v>=45?'#D98324':'#1E6B4F');
function riskAt(d,idx){const base=d.timeline[idx].risk;
  if(idx===8 && supportedSet.has(d.district) && d.support) return d.support.supported_sep; return base;}
function countUp(el,to,ms){if(!el)return;const s=performance.now();const step=n=>{const p=Math.min(1,(n-s)/ms);el.textContent=Math.round(p*to);if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);
  setTimeout(()=>{el.textContent=Math.round(to);},ms+150);} // guarantee final value even if rAF is throttled (background tab)

/* ---- map ---- */
const map=L.map('map',{zoomControl:false}).setView([-19.0,29.8],7);
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  {maxZoom:12,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);

const polyByDistrict={}, urbanMarkers={};
let geoLayer=null;
function styleFor(name){
  const d=byName[name];
  if(!d) return {color:'#B8B2A4',weight:1,fillColor:'#DDD8CB',fillOpacity:.55};
  return {color:'#7d7668',weight:1.2,fillColor:col(riskAt(d,monthIdx)),fillOpacity:.78};
}
function buildMap(){
  const title2model={}; Object.entries(NM.polygon).forEach(([m,g])=>title2model[g]=m);
  geoLayer=L.geoJSON(GEO,{
    style:f=>styleFor(title2model[f.properties.title]),
    onEachFeature:(f,ly)=>{
      const model=title2model[f.properties.title];
      if(model) polyByDistrict[model]=ly;
      ly.on('mouseover',e=>{hotRow(model,true);tipShow(e.originalEvent,tipHTML(model,f.properties.title));ly.setStyle({weight:3});});
      ly.on('mousemove',e=>tipMove(e.originalEvent));
      ly.on('mouseout',()=>{hotRow(model,false);tipHide();ly.setStyle(styleFor(model));});
      ly.on('click',()=>model&&selectDistrict(model));
    }
  }).addTo(map);
  NM.urban.forEach(name=>{const d=byName[name];if(!d)return;
    const mk=L.circleMarker([d.lat,d.lon],{radius:9,color:'#7d7668',weight:1.5,
      fillColor:col(riskAt(d,monthIdx)),fillOpacity:.9}).addTo(map);
    mk.on('mouseover',e=>{hotRow(name,true);tipShow(e.originalEvent,tipHTML(name)+`<br><i>${t('urbanNote','urban district — shown as a point')}</i>`);});
    mk.on('mousemove',e=>tipMove(e.originalEvent));
    mk.on('mouseout',()=>{hotRow(name,false);tipHide();});
    mk.on('click',()=>selectDistrict(name));
    urbanMarkers[name]=mk;});
  map.fitBounds(geoLayer.getBounds(),{padding:[40,40]});
}
function pulseClass(name,ly){ const el=ly.getElement&&ly.getElement(); if(!el)return;
  el.classList.toggle('pulse', !!byName[name] && riskAt(byName[name],monthIdx)>=66); }
function repaint(){
  Object.entries(polyByDistrict).forEach(([n,ly])=>{ly.setStyle(styleFor(n));pulseClass(n,ly);});
  Object.entries(urbanMarkers).forEach(([n,mk])=>{mk.setStyle({fillColor:col(riskAt(byName[n],monthIdx))});pulseClass(n,mk);});
  if(planMode) paintBuys();
}
function tipHTML(model,geoTitle){
  if(!model) return `<b>${geoTitle}</b><br>${t('noData','No data yet — engine coverage grows with live feeds')}`;
  const d=byName[model];
  return `<b>${d.district}</b> · ${d.province}<br>${t('nowLbl','now')} ${Math.round(riskAt(d,monthIdx))} · Sep ${Math.round(riskAt(d,8))}`;
}
const tip=$('#tip');
function tipShow(e,h){tip.innerHTML=h;tip.style.opacity=1;tipMove(e);}
function tipMove(e){tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';}
function tipHide(){tip.style.opacity=0;}

/* ---- watch list + hover sync ---- */
function renderWatch(){
  $('#watchList').innerHTML=D.watch.map(w=>{
    const v=Math.round(w.projected_sep);
    return `<div class="row" data-d="${w.district}" role="listitem">
      <div><b>${w.district}</b><br><small>${w.province}</small></div>
      <div class="bar"><i style="width:${v}%;background:${col(v)}"></i></div>
      <b style="color:${col(v)}">${v}</b></div>`;}).join('');
  $$('#watchList .row').forEach(r=>{
    const n=r.dataset.d;
    r.addEventListener('mouseenter',()=>glow(n,true));
    r.addEventListener('mouseleave',()=>glow(n,false));
    r.addEventListener('click',()=>selectDistrict(n));});
}
function glow(name,on){ const ly=polyByDistrict[name]||urbanMarkers[name]; if(!ly)return;
  if(on) ly.setStyle({weight:4,color:'#16130F'});
  else if(polyByDistrict[name]) ly.setStyle(styleFor(name));
  else ly.setStyle({weight:1.5,color:'#7d7668'});}
function hotRow(name,on){ if(!name)return;
  const r=$(`#watchList .row[data-d="${name}"]`); if(r)r.classList.toggle('hot',on);}

/* ---- drill-down ---- */
function sparkline(tl){const W=300,H=70,pad=6;const xs=i=>pad+i*((W-2*pad)/(tl.length-1));const ys=v=>H-pad-(v/100)*(H-2*pad);
  let pA='',pP='';tl.forEach((tt,i)=>{if(i>0){const seg=`M ${xs(i-1)} ${ys(tl[i-1].risk)} L ${xs(i)} ${ys(tt.risk)}`; if(tt.proj)pP+=seg+' ';else pA+=seg+' ';}});
  const dots=tl.map((tt,i)=>`<circle cx="${xs(i)}" cy="${ys(tt.risk)}" r="2.4" fill="${col(tt.risk)}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%"><line x1="${pad}" x2="${W-pad}" y1="${ys(66)}" y2="${ys(66)}" stroke="#eadfce"/>
    <path d="${pA}" fill="none" stroke="#16130F" stroke-width="2"/><path d="${pP}" fill="none" stroke="#D89B2E" stroke-width="2" stroke-dasharray="4 3"/>${dots}</svg>`;
}
function selectDistrict(name){ const d=byName[name]; if(!d)return; selected=name;
  const tgt=polyByDistrict[name];
  if(tgt) map.flyToBounds(tgt.getBounds(),{padding:[60,60],duration:.8});
  else map.flyTo([d.lat,d.lon],9,{duration:.8});
  $('#dName').textContent=d.district; $('#dProv').textContent=d.province;
  const sepR=riskAt(d,8);
  $('#dSpark').innerHTML=`<span style="background:${bandCol(sepR)};color:#fff;border-radius:12px;padding:2px 10px;font-size:12px">${band(sepR)} ${t('ddTail','risk by September ·')} ${Math.round(sepR)}</span>`+sparkline(d.timeline);
  const dr=d.latest_drivers||{};
  const bars=[[t('dRain','Rainfall (latest)'),Math.round(dr.rainfall_mm),Math.min(100,dr.rainfall_mm),'mm'],
    [t('dVeg','Vegetation index'),(dr.ndvi||0).toFixed(2),Math.round((dr.ndvi||0)*100),''],
    [t('dIrr','Irrigation'),Math.round(dr.irrigation),Math.round(dr.irrigation),'%'],
    [t('dInp','Input access /100'),Math.round(dr.inputs),Math.round(dr.inputs),'']];
  $('#dDrivers').innerHTML=bars.map(([l,txt,v,u])=>`<div class="row"><small style="width:112px;flex:none">${l}</small>
    <div class="bar"><i style="width:${Math.max(2,Math.min(100,v))}%;background:var(--green)"></i></div><small>${txt}${u}</small></div>`).join('');
  $('#dNote').textContent=(sepR>=66)?t('warnHigh','Early-warning: projected HIGH risk by September without early action.')
    :t('warnWatch','On the watch list — trajectory rising into the dry season.');
  const briefs=window.HOZI_BRIEFS&&window.HOZI_BRIEFS[name];
  const br=briefs&&(briefs[window.HOZI_LANG]||briefs.en);
  $('#dPlaybook').innerHTML=br?`<h3 style="margin:14px 0 6px">${t('ivT','Recommended early actions')}</h3>`+
    br.bullets.map(b=>`<div class="row"><b style="width:96px;flex:none;font-size:12px">${b.dept}</b><small>${b.action}</small></div>`).join('')+
    `<p style="color:var(--mut);font-size:11px;font-style:italic;margin:6px 0 0">${br.note} · ${t('ivBy','Drafted by AI from the engine\'s risk data — for planner review, not instruction.')}</p>`:'';
  $('#dSrc').textContent=`${D.meta.source} · Jan–Jun ${t('observed','observed')}, Jul–Sep ${t('forecast','forecast')}`;
  $('#drill').hidden=false; syncURL();
}
$('#drillClose').addEventListener('click',()=>{ $('#drill').hidden=true; selected=null;
  if(geoLayer) map.flyToBounds(geoLayer.getBounds(),{padding:[40,40],duration:.8}); syncURL(); });

/* ---- time + KPIs ---- */
function setMonth(i){ monthIdx=Math.max(0,Math.min(8,+i)); $('#time').value=monthIdx;
  $('#monthLbl').textContent=t('m'+monthIdx,MONTHS_EN[monthIdx]);
  $('#fcLbl').hidden=monthIdx<6; repaint();
  syncURL(); }
$('#time').addEventListener('input',e=>{stopPlay();setMonth(e.target.value);});
function stopPlay(){if(playing){clearInterval(playing);playing=null;$('#play').innerHTML='&#9654;';}}
$('#play').addEventListener('click',()=>{
  if(playing){stopPlay();return;}
  let i=0; setMonth(0); $('#play').innerHTML='&#10074;&#10074;';
  playing=setInterval(()=>{i++; if(i>8){stopPlay();return;} setMonth(i);},700);});
function renderKPIs(){ const n=D.national;
  countUp($('#kHigh'),n.high_sep,900); countUp($('#kNow'),Math.round(n.risk_now),900);
  countUp($('#kSep'),Math.round(n.risk_sep),1200);
  $('#kpiExtra').innerHTML=`<small>${t('kR','model vs independent index')}: r = ${D.meta.validation_r_staple} · ${t('kSrc','POTRAZ synthetic challenge data')}</small>`;}
$('#kMore').addEventListener('click',()=>$('#kpiExtra').hidden=!$('#kpiExtra').hidden);

/* ---- planning mode ---- */
const buysRanked=districts.filter(d=>d.support).sort((a,b)=>b.support.reduction-a.support.reduction);
function renderBuys(){ $('#buys').innerHTML=buysRanked.slice(0,10).map((d,i)=>{
  const on=supportedSet.has(d.district);
  return `<li class="row ${on?'hot':''}" data-d="${d.district}">
    <span class="buy-badge">${i+1}</span><div><b>${d.district}</b><br><small>${d.province}</small></div>
    <small>−${d.support.reduction.toFixed(1)}</small></li>`;}).join('');
  $$('#buys .row').forEach(r=>r.addEventListener('click',()=>selectDistrict(r.dataset.d)));}
function updatePlanner(n){ supportN=n; supportedSet=new Set(buysRanked.slice(0,n).map(d=>d.district));
  $('#pn').textContent=n;
  let sum=0,removed=0,saved=0; districts.forEach(d=>{const projR=d.timeline[8].risk;
    const r=supportedSet.has(d.district)&&d.support?d.support.supported_sep:projR; sum+=r;
    if(supportedSet.has(d.district)&&d.support){removed+=(projR-r); if(projR>=66&&r<66)saved++;}});
  $('#plKept').textContent=saved; $('#plSaved').textContent=Math.round(removed);
  $('#plSep').textContent=Math.round(sum/districts.length);
  renderBuys(); repaint(); syncURL(); }
function paintBuys(){ Object.entries(polyByDistrict).forEach(([n,ly])=>{
    if(planMode&&supportedSet.has(n)) ly.setStyle({weight:4,color:'#D89B2E',dashArray:'4'});});
  Object.entries(urbanMarkers).forEach(([n,mk])=>mk.setStyle(
    planMode&&supportedSet.has(n)?{color:'#D89B2E',weight:4}:{color:'#7d7668',weight:1.5}));}
$('#plRange').addEventListener('input',e=>updatePlanner(+e.target.value));
$('#planToggle').addEventListener('change',e=>{ planMode=e.target.checked;
  document.body.classList.toggle('plan',planMode);
  $('#leftTabs').hidden=planMode; $('#watchList').hidden=planMode;
  $('#askPane').hidden=true; $('#plannerPane').hidden=!planMode;
  if(!planMode){$('#watchList').hidden=false;$('#tabWatch').classList.add('on');$('#tabAsk').classList.remove('on');}
  if(planMode){ setMonth(8); updatePlanner(supportN); } else { supportedSet=new Set(); setMonth(5); }
  syncURL(); });

/* ---- tabs + Ask Hozi (ported conversational engine) ---- */
$('#tabWatch').addEventListener('click',()=>tab('watch'));
$('#tabAsk').addEventListener('click',()=>tab('ask'));
function tab(w){ $('#tabWatch').classList.toggle('on',w==='watch');
  $('#tabAsk').classList.toggle('on',w==='ask');
  $('#watchList').hidden=w!=='watch'; $('#askPane').hidden=w!=='ask';
  if(w==='ask') renderTalk(); }
let chatLog=[], talkChips=["National picture","Where should we act first?","Outlook for Mazowe","How does Hozi work?"];
const provinces=[...new Set(districts.map(d=>d.province))];
function dinfo(d){return {now:d.timeline[5].risk, sep:d.timeline[8].risk, jan:d.timeline[0].risk, dr:d.latest_drivers||{}};}
function fmtD(d){const{now,sep,jan,dr}=dinfo(d);
  return `<b>${d.district}</b> <span style="color:#8A8076">(${d.province})</span> — <b style="color:${bandCol(sep)}">${band(sep)} risk</b> by September.<br>
  📈 ${Math.round(jan)} <span style="color:#8A8076">Jan</span> → ${Math.round(now)} <span style="color:#8A8076">Jun</span> → <b>${Math.round(sep)}</b> <span style="color:#8A8076">Sep</span><br>
  🔎 Rainfall ${Math.round(dr.rainfall_mm)}mm ${dr.rainfall_mm<100?'(below the ~100mm staples need)':'(near need)'}, vegetation ${(dr.ndvi||0).toFixed(2)}, irrigation ${Math.round(dr.irrigation)}%, inputs ${Math.round(dr.inputs)}/100.${d.support?`<br>🎯 A support package could cut September by ~<b>${d.support.reduction}</b> pts (to ${Math.round(d.support.supported_sep)}).`:''}`;}
function respond(qRaw){
  const q=(qRaw||'').toLowerCase().trim(); const N=D.national;
  const matches=districts.filter(x=>q.includes(x.district.toLowerCase()));
  const prov=provinces.find(p=>q.includes(p.toLowerCase()));
  if(/^(hi|hello|hie|hey|help|start)\b/.test(q)||q.length<3)
    return {a:`I can tell you a <b>district's</b> outlook (try "Mazowe"), a <b>province</b> summary, <b>where to act first</b>, the <b>national</b> picture, or <b>how I work</b>.`,
      chips:["National picture","Where should we act first?","Outlook for Hwange","Which are safest?","How does Hozi work?"]};
  if(/(how.*(work|accurate|reliable|know|calculat)|accuracy|valid|trust|train|learn|black.?box|methodolog|\bmodel\b)/.test(q))
    return {a:`I use a <b>transparent weighted model</b> of rainfall, vegetation, pests, irrigation and input access — not a black box. On this <b>synthetic sample data</b> my score reproduces the dataset's own risk band at <b>r = 0.81</b> (an internal consistency check, not outcome-validation yet), then I project the seasonal trend forward with a widening confidence band. <b>I'm decision-support, not certainty</b> — and not yet trained on real ZimVAC/IPC outcomes.`,
      chips:["Where should we act first?","National picture","Outlook for Mazowe"]};
  if(matches.length>=2){const[a,b]=matches,A=dinfo(a),B=dinfo(b),hi=A.sep>=B.sep?a:b;
    return {a:`<b>${a.district}</b> ${Math.round(A.sep)} vs <b>${b.district}</b> ${Math.round(B.sep)} (September). <b>${hi.district}</b> is the greater concern.${a.support&&b.support?` Support helps <b>${a.support.reduction>=b.support.reduction?a.district:b.district}</b> most (−${Math.max(a.support.reduction,b.support.reduction)} pts).`:''}`,
      chips:[`Outlook for ${a.district}`,`Outlook for ${b.district}`,"Where should we act first?"]};}
  if(matches.length===1){const d=matches[0];
    return {a:fmtD(d), chips:["Where should we act first?",`Compare ${d.district} with ${hotspots[0].district}`,"National picture"]};}
  if(prov){const ds=districts.filter(d=>d.province===prov),mean=Math.round(ds.reduce((s,d)=>s+d.timeline[8].risk,0)/ds.length),worst=ds.slice().sort((a,b)=>b.timeline[8].risk-a.timeline[8].risk)[0];
    return {a:`<b>${prov}</b> — ${ds.length} districts, average September risk <b>${mean}</b> (${band(mean)}). Worst: <b>${worst.district}</b> at ${Math.round(worst.timeline[8].risk)}.`,
      chips:[`Outlook for ${worst.district}`,"Where should we act first?","National picture"]};}
  if(/(act first|support|spend|save|best buy|invest|priorit|allocat|budget|resource|where.*help|impact)/.test(q)){
    const b=buysRanked.slice(0,4).map((x,i)=>`${i+1}. <b>${x.district}</b> (−${x.support.reduction})`).join('<br>');
    return {a:`Support saves the most, in order:<br>${b}<br><span style="color:#8A8076">The driest, least-served, highest-risk districts — same effort, most people protected.</span>`,
      chips:[`Outlook for ${buysRanked[0].district}`,"National picture","How does Hozi work?"]};}
  if(/(safe|lowest|least|best off|okay|fine|low risk)/.test(q)){
    const s=districts.slice().sort((a,b)=>a.timeline[8].risk-b.timeline[8].risk).slice(0,3).map(x=>`<b>${x.district}</b> (${Math.round(x.timeline[8].risk)})`).join(', ');
    return {a:`Lowest projected September risk: ${s}. Still worth watching as the dry season deepens.`,
      chips:["Which are worst?","Where should we act first?","National picture"]};}
  if(/(watch|worst|top|high risk|most at risk|danger|hotspot|which district)/.test(q)){
    const w=districts.slice().sort((a,b)=>b.timeline[8].risk-a.timeline[8].risk).slice(0,5).map((x,i)=>`${i+1}. <b>${x.district}</b> ${Math.round(x.timeline[8].risk)}`).join('<br>');
    return {a:`Top districts to watch by September risk:<br>${w}`, chips:[`Outlook for ${hotspots[0].district}`,"Where should we act first?","Which are safest?"]};}
  if(/(how many|national|overall|september|country|summary|picture|total|situation)/.test(q))
    return {a:`Without early action, <b>${N.high_sep} of ${N.n_districts}</b> districts are projected into <b>HIGH</b> food-security risk by September. National risk rises from <b>${Math.round(N.risk_now)}</b> (June) to <b>${Math.round(N.risk_sep)}</b> (September).`,
      chips:["Where should we act first?","Which are worst?","How does Hozi work?"]};
  return {a:`I didn't catch a district or topic. Try a <b>district</b> (e.g. "Gwanda"), a <b>province</b>, "<b>where should we act first?</b>", the "<b>national picture</b>", or "<b>how does Hozi work?</b>".`,
    chips:["National picture","Where should we act first?","Outlook for Mazowe","How does Hozi work?"]};
}
function renderTalk(){
  if(!chatLog.length) chatLog.push({who:'h',text:"👋 Ask me about the season — a <b>district</b> (try \"Mazowe\"), a <b>province</b>, <b>where to act first</b>, the <b>national picture</b>, or <b>how I work</b>. I answer from the live engine data."});
  $('#chat').innerHTML=`<div class="thint" style="color:var(--mut);font-size:12px">${t('talkHint','Answers come from the live engine data; in production, in your language via AI.')}</div>`+
    chatLog.map(m=>`<div class="${m.who}">${m.text}</div>`).join('');
  $('#chips').innerHTML=talkChips.map(c=>`<button type="button">${c}</button>`).join('');
  $$('#chips button').forEach(c=>c.addEventListener('click',()=>ask(c.textContent)));
  $('#askIn').placeholder=t('ask','Type a question...');
  $('#askSend').textContent=t('send','Send');
  $('#chat').scrollTop=$('#chat').scrollHeight;
}
function ask(q){ const r=respond(q); chatLog.push({who:'u',text:q}); chatLog.push({who:'h',text:r.a}); if(r.chips)talkChips=r.chips; renderTalk(); }
$('#askForm').addEventListener('submit',e=>{e.preventDefault();const v=$('#askIn').value.trim();if(v){ask(v);$('#askIn').value='';}});

/* ---- story panel ---- */
function renderStory(){ $('#storyBody').innerHTML=
  `<h1>${t('h0','See the hunger coming — and act in time.')}</h1>
   <p>${t('p0','Hozi forecasts where food-security risk across Zimbabwe\'s crops is heading, district by district, then helps responders get the most from the resources they already have. Drag the timeline to watch the season unfold; use Planning Mode to see where early action protects the most people.')}</p>
   <h3>${t('honestT',"How it works & what it can't do (honesty first)")}</h3>
   <ul><li>${t('mt1','<b>Transparent model.</b> Risk is a clear, weighted blend of rainfall, vegetation, pests, irrigation and input access — no black box.')}</li>
   <li>${t('mt2',"<b>Consistency-checked.</b> Hozi's risk score matches an independent agricultural risk index at <b>r = 0.81</b> on this data.")}</li>
   <li>${t('mt3','<b>Foresight, not fortune-telling.</b> Forecasts project a well-understood seasonal trend with a widening confidence band; they are decision-support, not certainty.')}</li>
   <li>${t('mt4','<b>Sample data.</b> This prototype runs on POTRAZ synthetic challenge data. The engine is built to accept live rainfall, satellite and market feeds.')}</li></ul>
   <h3>${t('dph','Where the data comes from')}</h3>
   <p>${t('dpp','Hozi does not invent data — it reads trusted signals from the bodies that already own them, and each owner keeps control of its own data. <b>This prototype runs on POTRAZ sample data; the engine is built to plug live feeds straight in.</b>')}</p>
   <p style="color:var(--mut);font-size:12px">Hozi — "${t('h0','Fill the granary before the drought.')}" · Curious Inq, Harare · POTRAZ AI4I 2026 · MIT open-source</p>`;}
$('#storyTab').addEventListener('click',()=>{setRailActive('storyTab');$('#storyPanel').hidden=false; renderStory();});
$('#infoBtn').addEventListener('click',()=>{setRailActive('storyTab');$('#storyPanel').hidden=false; renderStory();});
$('#storyClose').addEventListener('click',()=>{$('#storyPanel').hidden=true; setRailActive('railFood');});

/* ---- URL state + language ---- */
let booted=false;
function syncURL(){ if(!booted) return; const p=new URLSearchParams();
  if(monthIdx!==5)p.set('month',monthIdx); if(selected)p.set('district',selected);
  if(planMode)p.set('mode','plan'); if(window.HOZI_LANG!=='en')p.set('lang',window.HOZI_LANG);
  const qs=p.toString(); history.replaceState(null,'',qs?('?'+qs):location.pathname); }
function applyLang(l){ window.HOZI_LANG=l; try{localStorage.setItem('hozi-lang',l);}catch(e){}
  $$('.lng button').forEach(b=>b.classList.toggle('on',b.dataset.lang===l));
  document.documentElement.lang=l;
  $('#tbSub').textContent=t('mast','National Food-Security Foresight Engine');
  $('#planLabel').textContent=t('planMode','Planning Mode');
  $('#storyTab').title=t('story','The Story');
  $('#railFood').title=t('domFood','Food security');
  [['railFloods','domFloods','Floods'],['railDisease','domDisease','Disease'],
   ['railWater','domWater','Water'],['railMarkets','domMarkets','Markets']]
    .forEach(([id,k,en])=>$('#'+id).title=t(k,en));
  $('#wTitle').textContent=t('h0','See the hunger coming — and act in time.');
  $('#wIntro').textContent=t('p0','Hozi forecasts where food-security risk across Zimbabwe\'s crops is heading, district by district, then helps responders get the most from the resources they already have.');
  $('#wF1').innerHTML=t('wF1','<b>Foresight</b> — watch the season unfold, month by month, with an honest confidence band.');
  $('#wF2').innerHTML=t('wF2','<b>Planning Mode</b> — for the support you can reach this season, see where it protects the most people first.');
  $('#wF3').innerHTML=t('wF3',"<b>Ask Hozi</b> — answers in your language, grounded in the engine's own numbers.");
  $('#wHonest').innerHTML=t('mt4','<b>Sample data.</b> This prototype runs on POTRAZ synthetic challenge data. The engine is built to accept live rainfall, satellite and market feeds.');
  $('#wEnter').textContent=t('wEnter','Enter the Operations Room');
  $('#wDontLbl').textContent=t('wDont',"Don't show again");
  $('#legTitle').textContent=t('legendTitle','Staple food-security risk');
  $('#legNo').textContent=t('legendNo','no data yet');
  $('#tabWatch').textContent=t('tabWatch','Watch').replace('📋 ','');
  $('#tabAsk').textContent=t('askTab','Ask Hozi');
  $('#kHighLbl').textContent=t('kHighLbl','of 20 districts heading into HIGH risk by September');
  $('#kNatLbl').textContent=t('natl','national risk');
  $('#fcLbl').textContent=t('forecast','forecast');
  $('#plTitle').textContent=t('pl','Districts you can support this season');
  $('#plKeptLbl').textContent=t('ps1l','kept out of high risk');
  $('#plSavedLbl').textContent=t('ps2l','risk points removed');
  $('#plSepLbl').textContent=t('ps3l','September national risk');
  $('#plBuysT').textContent=t('bh','Best buys — where support saves most first');
  renderKPIs(); renderWatch(); setMonth(monthIdx);
  if(selected)selectDistrict(selected); if(planMode)updatePlanner(supportN);
  if(!$('#askPane').hidden)renderTalk();
  if(!$('#storyPanel').hidden)renderStory(); syncURL(); }
$$('.lng button').forEach(b=>b.addEventListener('click',()=>applyLang(b.dataset.lang)));
function readURL(){ const p=new URLSearchParams(location.search);
  let lang=p.get('lang'); try{lang=lang||localStorage.getItem('hozi-lang');}catch(e){}
  applyLang(['en','sn','nd'].includes(lang)?lang:'en');
  if(p.get('month')!==null)setMonth(p.get('month'));
  if(p.get('mode')==='plan'){$('#planToggle').checked=true;$('#planToggle').dispatchEvent(new Event('change'));}
  if(p.get('district')&&byName[p.get('district')])selectDistrict(p.get('district')); }

/* ---- domain rail (platform roadmap) + welcome ---- */
const DOMAINS={
  railFloods:{k:'domFloods',en:'Floods',dk:'domFloodsD',
    den:'Reads rainfall intensity, river levels and terrain to help decide where to pre-position supplies and evacuate first.',st:'next'},
  railDisease:{k:'domDisease',en:'Disease',dk:'domDiseaseD',
    den:'Reads case reports, water & sanitation and mobility signals to help decide where to send health teams and supplies first.',st:'next'},
  railWater:{k:'domWater',en:'Water',dk:'domWaterD',
    den:'Reads dam levels, rainfall, demand and borehole data to help decide where to ration, drill or truck water first.',st:'roadmap'},
  railMarkets:{k:'domMarkets',en:'Markets',dk:'domMarketsD',
    den:'Reads farmgate and retail prices, supply and currency signals to spot where prices threaten access to food.',st:'roadmap'}
};
function setRailActive(id){ $$('#rail button').forEach(b=>b.classList.toggle('on',b.id===id)); }
function openDomain(id){ const d=DOMAINS[id]; setRailActive(id);
  $('#storyBody').innerHTML=
   `<h1>${t(d.k,d.en)}</h1>
    <p><span style="background:var(--amber);color:#16130F;border-radius:12px;padding:2px 12px;font-size:12px;font-weight:bold">
      ${d.st==='next'?t('domStNext','NEXT MODULE'):t('domStRoad','ON THE ROADMAP')}</span></p>
    <p>${t(d.dk,d.den)}</p>
    <p style="color:var(--mut)">${t('domHonest','Same proven engine — pointed at new signals. Scheduled after the food-security flagship. Every national crisis follows the same pattern: signals → transparent risk score → forecast → Response Planner.')}</p>`;
  $('#storyPanel').hidden=false; }
Object.keys(DOMAINS).forEach(id=>{ const b=$('#'+id);
  b.addEventListener('mouseenter',e=>tipShow(e,`<b>${b.title}</b><br>${t('domNext','Same engine, next module — click to learn more')}`));
  b.addEventListener('mousemove',e=>tipMove(e));
  b.addEventListener('mouseleave',tipHide);
  b.addEventListener('click',()=>{tipHide();openDomain(id);});
});
$('#railFood').addEventListener('click',()=>{ // home: national food view
  setRailActive('railFood');
  $('#storyPanel').hidden=true; $('#drill').hidden=true; selected=null;
  if(geoLayer) map.flyToBounds(geoLayer.getBounds(),{padding:[40,40],duration:.8}); syncURL(); });
function initWelcome(){
  let seen=null; try{seen=localStorage.getItem('hozi-welcome');}catch(e){}
  if(!seen && !location.search) $('#welcome').hidden=false;
  const dismiss=()=>{
    if($('#wDont').checked){try{localStorage.setItem('hozi-welcome','1');}catch(e){}}
    $('#welcome').hidden=true; };
  $('#wEnter').addEventListener('click',dismiss);
  $('#welcome').addEventListener('click',e=>{if(e.target===$('#welcome'))dismiss();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#welcome').hidden)dismiss();});
}

/* ---- fallback + boot ---- */
function fallbackDots(){ districts.forEach(d=>{const mk=L.circleMarker([d.lat,d.lon],{radius:10,
    fillColor:col(riskAt(d,monthIdx)),fillOpacity:.9,color:'#7d7668',weight:1}).addTo(map);
    mk.on('mouseover',e=>{hotRow(d.district,true);tipShow(e.originalEvent,tipHTML(d.district));});
    mk.on('mousemove',e=>tipMove(e.originalEvent));
    mk.on('mouseout',()=>{hotRow(d.district,false);tipHide();});
    mk.on('click',()=>selectDistrict(d.district));urbanMarkers[d.district]=mk;});}
function boot(){
  try{
    if(!D||!D.districts) throw new Error('projections missing');
    if(GEO&&GEO.features&&GEO.features.length){ buildMap(); }
    else { fallbackDots(); }
  }catch(err){ console.error('Hozi boot:',err); fallbackDots(); }
  renderWatch(); renderKPIs(); updatePlanner(0); setMonth(5);
  initWelcome();
  readURL();
  booted=true; syncURL();
  document.body.classList.add('ready');
}
boot();
