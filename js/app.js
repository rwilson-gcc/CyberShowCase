(function(){
  let cur=-1,rs=0,bs=0,tick=null,left=0;
  const mode=()=>$('modeSelect').value;
  const last=STAGES.length-1;

  function scores(){$('redScore').textContent=rs;$('blueScore').textContent=bs}

  function render(i){
    cur=i;const s=STAGES[i];
    document.body.classList.remove('green-team','red-team','blue-team','flash','glitch');
    document.body.classList.add(s.team);
    if(s.fx)document.body.classList.add(s.fx);
    $('stageTitle').firstElementChild.textContent=s.title;
    $('stageSub').textContent=s.sub;
    $('termHost').textContent=s.host;
    rs+=s.score[0];bs+=s.score[1];scores();
    Mitre.set(s.mitre);Timeline.activate(i);Scene.show(s.scene);
    Net.traffic(null);
    if(s.path)Net.showPath(s.path);else if(!s.act||s.scene!=='network')Net.clearPath();
    s.act&&s.act();
    if(s.traffic)Net.traffic(s.traffic);
    Term.run(s.lines);
    left=AUTO_SECONDS;updateCountdown();
  }

  function next(){if(cur<last)render(cur+1);if(cur>=last){$('nextBtn').disabled=true;stopTimer();$('countdown').textContent='Demo complete. Press Start Demo to run again.'}}

  function updateCountdown(){
    if(cur>=last)return;
    $('countdown').textContent=mode()==='automated'?`Stage ${cur+1} of ${STAGES.length}. Next stage in ${left}s`:`Stage ${cur+1} of ${STAGES.length}. Press Next Stage or the right arrow key`;
  }
  function stopTimer(){clearInterval(tick);tick=null}

  function hardReset(){
    stopTimer();cur=-1;rs=0;bs=0;scores();
    Net.reset();Exfil.reset();Siem.reset();Approval.reset();Mitre.reset();Analysts.reset();Term.reset();Timeline.reset();
    document.body.classList.remove('red-team','blue-team','flash','glitch');document.body.classList.add('green-team');
    $('stageTitle').firstElementChild.textContent='Ready';
    $('stageSub').textContent='Authorised penetration test against Northbridge Holdings plc';
    $('termHost').textContent='terminal';
    document.querySelectorAll('.scene').forEach(s=>s.classList.remove('show'));
    $('nextBtn').disabled=true;
  }

  function start(){
    hardReset();
    $('startBtn').textContent='Restart Demo';
    if(mode()==='live'){$('nextBtn').disabled=false;next();updateCountdown()}
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
      'panels.js':[typeof Scene,typeof Approval,typeof Mitre,typeof Siem,typeof Analysts,typeof Exfil],'timeline.js':[typeof Timeline]};
    const bad=Object.keys(mods).filter(k=>mods[k].includes('undefined'));
    if(bad.length){status('Start is disabled: these files are missing or out of date: '+bad.map(b=>'js/'+b).join(', ')+'. Re-copy them from the latest build and hard refresh (Ctrl+F5).');return}

    g('startBtn').onclick=start;
    g('nextBtn').onclick=next;
    g('fullscreenBtn').onclick=toggleFullscreen;
    g('modeSelect').onchange=()=>{hardReset();g('startBtn').textContent='Start Demo';g('countdown').textContent='Choose a mode and press Start Demo'};
    document.addEventListener('fullscreenchange',()=>document.body.classList.toggle('present',!!document.fullscreenElement));
    document.addEventListener('keydown',e=>{
      if(e.target.tagName==='SELECT')return;
      if((e.key==='ArrowRight'||e.key===' ')&&mode()==='live'&&!g('nextBtn').disabled){e.preventDefault();next()}
      if(e.key==='f'||e.key==='F')toggleFullscreen();
    });

    document.documentElement.style.setProperty('--brand',BRAND.accent);
    g('brandName').textContent=BRAND.name;g('brandUnit').textContent=BRAND.unit;
    [Net,Approval,Mitre,Siem,Analysts].forEach(m=>{try{m.init()}catch(e){console.error(e)}});
    try{Timeline.init(STAGES)}catch(e){console.error(e)}
  }
  window.addEventListener('error',e=>{const c=document.getElementById('countdown');if(c){c.textContent='Script error: '+e.message+' ('+(e.filename||'').split('/').pop()+':'+e.lineno+')';c.style.color='#ff8a80'}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
