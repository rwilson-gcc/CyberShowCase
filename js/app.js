(function(){
  let cur=-1,tick=null,left=0;
  const mode=()=>$('modeSelect').value;
  const last=STAGES.length-1;

  function scores(){
    const upto=cur<0?-1:cur;
    let rs=0,bs=0;
    for(let i=0;i<=upto;i++){rs+=STAGES[i].score[0];bs+=STAGES[i].score[1]}
    $('redScore').textContent=rs;$('blueScore').textContent=bs;
  }

  // render() always plays stage i from a clean slate, so jumping/back/replay never
  // carries over leftover animation state (typing, exfil %, SIEM rows) from another visit.
  function render(i){
    cur=i;const s=STAGES[i];
    document.body.classList.remove('green-team','red-team','blue-team','flash','glitch');
    document.body.classList.add(s.team);
    if(s.fx)document.body.classList.add(s.fx);
    $('stageTitle').firstElementChild.textContent=s.title;
    $('stageSub').textContent=s.sub;
    $('termHost').textContent=s.host;
    scores();
    Net.reset();Exfil.reset();Siem.reset();Analysts.reset();SQLi.reset();
    if(s.scene==='approval')Approval.run();else Approval.reset();
    Mitre.set(s.mitre);Timeline.activate(i);Scene.show(s.scene);
    if(s.path)Net.showPath(s.path);
    if(s.act&&s.scene!=='approval')s.act();
    if(s.traffic)Net.traffic(s.traffic);
    Term.run(s.lines);
    left=AUTO_SECONDS;updateCountdown();
    $('backBtn').disabled=!(mode()==='live'&&cur>0);
  }

  function next(){
    if(cur<last){render(cur+1);return}
    if(mode()==='automated'){render(0);return}
    $('nextBtn').disabled=true;$('backBtn').disabled=true;stopTimer();
    $('countdown').textContent='Demo complete. Press Start Demo to run again.';
  }
  function back(){if(mode()==='live'&&cur>0)render(cur-1)}
  function jump(i){if(mode()!=='live'||cur<0||i===cur)return;render(i)}

  function updateCountdown(){
    if(mode()==='live'){$('countdown').textContent=`Stage ${cur+1} of ${STAGES.length}. Press Next, Back, or click a stage number`;return}
    if(cur>=last){$('countdown').textContent=`Stage ${cur+1} of ${STAGES.length}. Looping back to the start in ${left}s`;return}
    $('countdown').textContent=`Stage ${cur+1} of ${STAGES.length}. Next stage in ${left}s`;
  }
  function stopTimer(){clearInterval(tick);tick=null}

  function hardReset(){
    stopTimer();cur=-1;scores();
    Net.reset();Exfil.reset();Siem.reset();Approval.reset();Mitre.reset();Analysts.reset();SQLi.reset();Term.reset();Timeline.reset();
    document.body.classList.remove('red-team','blue-team','flash','glitch');document.body.classList.add('green-team');
    $('stageTitle').firstElementChild.textContent='Ready';
    $('stageSub').textContent='Authorised penetration test against Northbridge Holdings plc';
    $('termHost').textContent='terminal';
    document.querySelectorAll('.scene').forEach(s=>s.classList.remove('show'));
    $('nextBtn').disabled=true;$('backBtn').disabled=true;
  }

  function start(){
    hardReset();
    $('startBtn').textContent='Restart Demo';
    Timeline.setClickable(mode()==='live');
    if(mode()==='live'){$('nextBtn').disabled=false;next()}
    else{
      next();
      tick=setInterval(()=>{left--;if(left<=0)next();else updateCountdown()},1000);
    }
  }

  function toggleFullscreen(){
    if(document.fullscreenElement)document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  function boot(){
    const g=id=>document.getElementById(id);
    const status=m=>{g('countdown').textContent=m;g('countdown').style.color='#ff8a80'};
    // Check every module loaded, so a stale or missing file is reported instead of failing silently
    const mods={'config.js':[typeof BRAND,typeof STAGES],'terminal.js':[typeof Term],'network.js':[typeof Net],
      'panels.js':[typeof Scene,typeof Approval,typeof Mitre,typeof Siem,typeof Analysts,typeof Exfil,typeof SQLi],'timeline.js':[typeof Timeline]};
    const bad=Object.keys(mods).filter(k=>mods[k].includes('undefined'));
    if(bad.length){status('Start is disabled: these files are missing or out of date: '+bad.map(b=>'js/'+b).join(', ')+'. Re-copy them from the latest build and hard refresh (Ctrl+F5).');return}

    g('startBtn').onclick=start;
    g('nextBtn').onclick=next;
    g('backBtn').onclick=back;
    g('fullscreenBtn').onclick=toggleFullscreen;
    g('modeSelect').onchange=()=>{hardReset();g('startBtn').textContent='Start Demo';g('countdown').textContent='Choose a mode and press Start Demo';g('countdown').style.color='';Timeline.setClickable(false)};
    document.addEventListener('fullscreenchange',()=>document.body.classList.toggle('present',!!document.fullscreenElement));
    document.addEventListener('keydown',e=>{
      if(e.target.tagName==='SELECT')return;
      if(mode()!=='live')return;
      if((e.key==='ArrowRight'||e.key===' ')&&!g('nextBtn').disabled){e.preventDefault();next()}
      if(e.key==='ArrowLeft'&&!g('backBtn').disabled){e.preventDefault();back()}
      if(e.key==='f'||e.key==='F')toggleFullscreen();
    });

    document.documentElement.style.setProperty('--brand',BRAND.accent);
    g('brandName').textContent=BRAND.name;g('brandUnit').textContent=BRAND.unit;
    [Net,Approval,Mitre,Siem,Analysts,SQLi].forEach(m=>{try{m.init&&m.init()}catch(e){console.error(e)}});
    try{Timeline.init(STAGES,jump)}catch(e){console.error(e)}
  }
  window.addEventListener('error',e=>{const c=document.getElementById('countdown');if(c){c.textContent='Script error: '+e.message+' ('+(e.filename||'').split('/').pop()+':'+e.lineno+')';c.style.color='#ff8a80'}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
