(function(){
  const $=id=>document.getElementById(id);
  const LB_KEY='haveago_leaderboard_v2';

  let role=null, steps=null, idx=-1, stage=null, active=false, curStep=null;
  let startTime=0, hudTimer=null;
  let suspicion=0, exfil=0, raceTimer=null;
  let blueChaseTimer=null, blueChaseCap=0, blueChaseVal=0;
  let blueExfil=0, blueTimer=null;
  let seenTags=new Set();
  let traceIdx=0, loggedPacketIdx=new Set();
  let socFeedTimer=null;

  function showScreen(id){document.querySelectorAll('.scene').forEach(s=>s.classList.toggle('show',s.id==='screen-'+id))}
  const fmt=s=>{const m=Math.floor(s/60),ss=(s%60).toFixed(1).padStart(4,'0');return `${m}:${ss}`};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(v=>v[1]);

  /* ---------------- MITRE tag strip ---------------- */
  function initTags(){
    $('mitre').innerHTML=HAVEAGO.mitreTags.map(t=>`<div class="tac" id="hvtac-${t[0]}">${t[1]}</div>`).join('');
  }
  function markTags(ids){
    document.querySelectorAll('.tac').forEach(t=>t.classList.remove('on'));
    (ids||[]).forEach(id=>{seenTags.add(id);$('hvtac-'+id)?.classList.add('on')});
    seenTags.forEach(id=>$('hvtac-'+id)?.classList.add('seen'));
  }
  function resetTags(){seenTags=new Set();document.querySelectorAll('.tac').forEach(t=>t.classList.remove('on','seen'))}

  /* ---------------- notes panel ----------------
     Exposed on window: haveago-config.js's terminal-line callbacks (the
     dirbuster lines) run in that file's own scope, not this IIFE's, so
     Notes has to be reachable as a global for Notes.add(...) to resolve. */
  const Notes=(()=>{
    function reset(){$('notesList').innerHTML='<li class="notesEmpty">Nothing logged yet — notes fill in as you go.</li>'}
    function add(text){
      const empty=$('notesList').querySelector('.notesEmpty');if(empty)empty.remove();
      const li=document.createElement('li');li.textContent=text;$('notesList').prepend(li);
    }
    return{reset,add};
  })();
  window.Notes=Notes;

  // Logs a fact to Notes and, on a Blue run, mirrors it into the live SOC
  // feed too — so the feed visibly reacts to what the player just found,
  // not just ambient noise. Red calls this the same way; it's a no-op extra
  // for Red since the feed pane isn't shown.
  function log(text){
    if(!text)return;
    Notes.add(text);
    if(role==='blue')pushFeedRow(text,false);
  }

  /* ---------------- alert siren ----------------
     Small local copy rather than loading panels.js, which also defines
     Approval/Siem/Analysts/etc. tied to elements showcase.html has and
     haveago.html doesn't. */
  const Alarm={
    beep(){
      try{
        const c=new (window.AudioContext||window.webkitAudioContext)();
        [0,.3,.6].forEach(d=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.value=.05;o.connect(g);g.connect(c.destination);o.start(c.currentTime+d);o.stop(c.currentTime+d+.18)});
      }catch(e){}
    }
  };

  /* ---------------- blue: persistent SOC feed ----------------
     Runs continuously for the whole Blue playthrough (started in startRole,
     stopped in endRun/resetAll) — not just during the alert-triage step. */
  function pushFeedRow(text,big){
    const el=$('socMock');if(!el)return;
    const row=document.createElement('div');row.className='row'+(big?' bigalert':'');
    row.textContent=new Date().toLocaleTimeString('en-GB')+'  '+text;
    el.appendChild(row);
    while(el.children.length>40)el.removeChild(el.firstChild);
    el.scrollTop=el.scrollHeight;
  }
  function startSocFeed(){
    stopSocFeed();
    let i=0;
    socFeedTimer=setInterval(()=>{
      if(!active||role!=='blue')return;
      pushFeedRow(HAVEAGO.socDecoys[i%HAVEAGO.socDecoys.length]);
      i++;
    },HAVEAGO.socDecoyIntervalMs||2200);
  }
  function stopSocFeed(){clearInterval(socFeedTimer);socFeedTimer=null}

  /* ---------------- blue: mini command line (replaces the terminal) ---------------- */
  const MiniTerm=(()=>{
    let tok=0;
    const el=()=>document.getElementById('miniTerm');
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    async function run(lines){
      const my=++tok;const start=el();if(start)start.innerHTML='';
      for(const l of lines){
        const o=typeof l==='string'?{t:l}:{...l};
        const node=el();if(!node||my!==tok)return;
        const d=document.createElement('div');d.className='ln '+(o.cls||'');node.appendChild(d);
        for(const ch of o.t){
          if(my!==tok)return;
          d.textContent+=ch;node.scrollTop=node.scrollHeight;
          await sleep(o.speed||9);
        }
        if(o.cb)o.cb();
        await sleep(o.d??250);
        if(my!==tok)return;
      }
    }
    function reset(){tok++;const e=el();if(e)e.innerHTML=''}
    return{run,reset};
  })();

  /* ---------------- clock ---------------- */
  function startClock(){
    startTime=performance.now();
    clearInterval(hudTimer);
    hudTimer=setInterval(()=>{
      const el=(performance.now()-startTime)/1000;
      $('hudTimer').textContent=fmt(el).split('.')[0]+'s';
      const pct=clamp(100-(el/HAVEAGO.timeLimit*100),0,100);
      $('timeBarFill').style.width=pct+'%';
      $('timeBarFill').classList.toggle('low',pct<20);
      if(el>=HAVEAGO.timeLimit)endRun(false,"Ran out of time.");
    },200);
  }
  function stopClock(){clearInterval(hudTimer);hudTimer=null}
  function elapsedSeconds(){return startTime?(performance.now()-startTime)/1000:0}
  // Fully clears the time counter — no leftover interval, no stale value, and
  // the bar snaps back instantly instead of visibly animating its own reset.
  function hardResetClock(){
    stopClock();startTime=0;
    $('hudTimer').textContent='00:00';
    const f=$('timeBarFill');
    f.classList.add('notransition');f.style.width='100%';f.classList.remove('low');
    requestAnimationFrame(()=>requestAnimationFrame(()=>f.classList.remove('notransition')));
  }

  /* ---------------- generic step driver ---------------- */
  function startRole(r){
    role=r;steps=(r==='red'?HAVEAGO.redSteps:HAVEAGO.blueSteps);idx=-1;
    suspicion=0;exfil=0;blueExfil=0;blueChaseVal=0;active=true;resetTags();Notes.reset();
    clearInterval(raceTimer);clearInterval(blueChaseTimer);clearInterval(blueTimer);stopSocFeed();
    if(r==='blue'){
      $('termPane').classList.add('hidden');$('socPane').classList.remove('hidden');
      $('socMock').innerHTML='';MiniTerm.reset();
      startSocFeed();
    }else{
      $('socPane').classList.add('hidden');$('termPane').classList.remove('hidden');
      Term.reset();
    }
    startClock();next();
  }
  function next(){
    idx++;
    if(idx>=steps.length){endRun(true,role==='red'?"Mission complete — the data is out.":"Mission complete — the network is secured.");return}
    runStep(steps[idx]);
  }
  function runStep(s){
    curStep=s;stage=s.type;markTags(s.mitre);
    if(s.type==='narr')return runNarr(s);
    if(s.type==='info')return runInfo(s);
    if(s.type==='quiz')return runQuiz(s);
    if(s.type==='checklist')return runChecklist(s);
    if(s.type==='consent')return runConsent(s);
    if(s.type==='custom')return runCustom(s);
  }

  function runNarr(s){
    showScreen('narr');$('narrTitle').textContent=s.title;$('narrSub').textContent=s.sub||'';
    Term.run(s.lines).then(()=>{if(active&&stage==='narr'){if(s.note)log(s.note);next()}});
  }
  function runInfo(s){
    showScreen('info');$('infoTitle').textContent=s.title;
    $('infoBody').innerHTML=s.body.map(p=>`<p>${p}</p>`).join('');
    $('infoCta').textContent=s.cta||'Continue';
    $('infoCta').onclick=()=>{if(active&&stage==='info'){if(s.note)log(s.note);next()}};
  }
  function runQuiz(s){
    showScreen('quiz');$('quizTitle').textContent=s.title;$('quizPrompt').innerHTML=s.prompt;$('quizMsg').textContent='';
    const opts=shuffle(s.options);
    $('quizOptions').innerHTML=opts.map((o,i)=>`<button class="optbtn" data-i="${i}">${o.text}</button>`).join('');
    [...document.querySelectorAll('.optbtn')].forEach((el,i)=>el.onclick=()=>{
      if(stage!=='quiz')return;
      const o=opts[i];
      $('quizMsg').textContent=o.note||'';
      $('quizMsg').style.color=o.correct?'#3ddc97':'#ffb74d';
      el.classList.add(o.correct?'right':'wrong');
      if(o.correct){if(s.note)log(s.note);stage='locked';setTimeout(()=>{if(active)next()},1400)}
    });
  }
  function runChecklist(s){
    showScreen('checklist');$('clTitle').textContent=s.title;$('clPrompt').innerHTML=s.prompt;$('clMsg').textContent='';
    $('clItems').innerHTML=s.items.map((it,i)=>`<label class="clrow"><input type="checkbox" data-i="${i}">${it.text}</label>`).join('');
    $('clConfirm').textContent=s.confirmLabel||'Confirm selection';
    $('clConfirm').onclick=()=>{
      if(stage!=='checklist')return;
      const picked=[...document.querySelectorAll('#clItems input')].map(c=>c.checked);
      const ok=s.items.every((it,i)=>it.correct===picked[i]);
      if(ok){
        $('clMsg').style.color='#3ddc97';$('clMsg').textContent=s.feedbackCorrect||'Correct.';
        if(s.note)log(s.note);
        stage='locked';setTimeout(()=>{if(active)next()},1200);
      }else{
        $('clMsg').style.color='#ffb74d';$('clMsg').textContent=s.feedbackWrong||'Not quite — try again.';
      }
    };
  }
  function runConsent(s){
    showScreen('consent');$('consentSign').textContent=s.cta||'Sign agreement';$('consentMsg').textContent='';
    $('consentItems').innerHTML=s.items.map((it,i)=>`<label class="clrow"><input type="checkbox" data-i="${i}">${it.text}</label>`).join('');
    $('consentSign').onclick=()=>{
      if(stage!=='consent')return;
      const picked=[...document.querySelectorAll('#consentItems input')].map(c=>c.checked);
      const ok=s.items.every((it,i)=>it.correct===picked[i]);
      if(ok){
        $('consentMsg').style.color='#3ddc97';$('consentMsg').textContent=s.feedbackCorrect||'Agreement signed.';
        if(s.note)log(s.note);
        stage='locked';setTimeout(()=>{if(active)next()},1100);
      }else{
        $('consentMsg').style.color='#ffb74d';$('consentMsg').textContent=s.feedbackWrong||"That's not the agreed scope — check again.";
      }
    };
  }
  function runCustom(s){
    if(s.custom==='enum')return startEnum(s);
    if(s.custom==='linkedout')return startLinkedout(s);
    if(s.custom==='sqli')return startSqli(s);
    if(s.custom==='lateral')return startLateral(s);
    if(s.custom==='exfil')return startExfil(s);
    if(s.custom==='alertsoc')return startAlertSoc(s);
    if(s.custom==='soccmd')return startSoccmd(s);
    if(s.custom==='trace')return startTrace(s);
    if(s.custom==='contain')return startContain(s);
  }

  /* ---------------- Red: LinkedOUT profile ---------------- */
  function startLinkedout(s){
    showScreen('linkedout');stage='linkedout';
    const p=s.profile;
    $('profileCard').innerHTML=`<div class="ph">${p.initials||'??'}</div><h4>${p.name}</h4><small>${p.title}</small>
      <div class="badges">${p.skills.map(x=>`<span>${x}</span>`).join('')}</div>
      <div class="activity">${p.activity.map(a=>`<div>• ${a}</div>`).join('')}</div>`;
    if(s.note)log(s.note);
    $('linkedoutCta').onclick=()=>{if(active&&stage==='linkedout')next()};
  }

  /* ---------------- Red: enumeration ---------------- */
  function startEnum(s){
    showScreen('enum');stage='enum';Net.reset();
    $('enumClue').textContent=s.clue;$('enumMsg').textContent='';
  }
  function onNodeClick(id){
    if(!active||stage!=='enum')return;
    if(id===HAVEAGO.enumTarget){
      Net.discover(id);$('enumMsg').style.color='#3ddc97';$('enumMsg').textContent='Found it — web app server confirmed.';
      if(curStep&&curStep.note)log(curStep.note);
      stage='locked';setTimeout(()=>{if(active)next()},900);
    }else{
      suspicion=clamp(suspicion+HAVEAGO.suspPerWrongEnum,0,100);
      $('enumMsg').style.color='#ffb74d';$('enumMsg').textContent=HAVEAGO.enumWrongMsg;
      document.getElementById('n-'+id)?.classList.add('shake');
      setTimeout(()=>document.getElementById('n-'+id)?.classList.remove('shake'),350);
    }
  }

  /* ---------------- Red: SQL injection (chips removed — hint only) ---------------- */
  function startSqli(s){
    showScreen('sqli');stage='sqli';
    $('sqliPass').value='';$('sqliMsg').textContent='';
    $('credBox').classList.add('hidden');$('credBox').textContent='';
  }
  function trySqli(){
    if(stage!=='sqli')return;
    const v=$('sqliPass').value;
    if(HAVEAGO.sqliPatterns.some(re=>re.test(v))){
      $('sqliMsg').textContent="Query returned a row — you're in.";$('sqliMsg').style.color='#3ddc97';
      const cr=HAVEAGO.credReveal;
      $('credBox').classList.remove('hidden');
      $('credBox').textContent=`Recovered credentials: ${cr.user} / ${cr.pass}`;
      if(cr.note)log(cr.note);
      stage='locked';setTimeout(()=>{if(active)next()},1500);
    }else{
      $('sqliMsg').textContent="Login failed — that password didn't trick the query.";$('sqliMsg').style.color='#ff6b6b';
      $('sqliPass').classList.add('shake');setTimeout(()=>$('sqliPass').classList.remove('shake'),350);
    }
  }

  /* ---------------- Red: lateral movement drag ---------------- */
  function startLateral(s){
    showScreen('lateral');stage='lateral';
    $('lateralClue').textContent=s.clue||'';
    $('dragFrom').textContent=s.fromLabel||'WEB01';$('dragTo').textContent=s.toLabel||'FILE01';
    const pill=$('dragPill');pill.textContent=s.credLabel||'credentials';
    pill.classList.remove('granted');pill.style.left='8px';
    $('lateralMsg').textContent='';
    bindDrag(s);
  }
  function bindDrag(s){
    const pill=$('dragPill'),track=$('dragTrack');
    let dragging=false,sx=0,ox=0;
    const pos=e=>e.touches?e.touches[0].clientX:e.clientX;
    const down=e=>{
      if(stage!=='lateral')return;
      dragging=true;sx=pos(e);ox=pill.offsetLeft;
      try{pill.setPointerCapture&&pill.setPointerCapture(e.pointerId)}catch(err){}
    };
    const move=e=>{
      if(!dragging)return;
      const nx=clamp(ox+(pos(e)-sx),8,track.clientWidth-pill.offsetWidth-8);
      pill.style.left=nx+'px';
    };
    const up=()=>{
      if(!dragging)return;dragging=false;
      const max=track.clientWidth-pill.offsetWidth-8;
      if(pill.offsetLeft>=max*0.8){
        pill.style.left=max+'px';pill.classList.add('granted');
        $('lateralMsg').style.color='#3ddc97';$('lateralMsg').textContent=`Access granted on ${s.toLabel||'the target host'}.`;
        if(s.note)log(s.note);
        stage='locked';setTimeout(()=>{if(active)next()},1000);
      }else{
        pill.style.left='8px';
      }
    };
    pill.onpointerdown=down;window.onpointermove=move;window.onpointerup=up;
    pill.ontouchstart=down;window.ontouchmove=move;window.ontouchend=up;
  }

  /* ---------------- Red: exfiltration race ---------------- */
  function startExfil(s){
    showScreen('exfil');stage='exfil';
    exfil=0;$('exfilRaceFill').style.width='0%';$('suspFill').style.width=suspicion+'%';
    const c=HAVEAGO.exfilBlueChase;
    blueChaseCap=rand(c.capMin,c.capMax);blueChaseVal=0;$('blueChaseFill').style.width='0%';
    clearInterval(raceTimer);clearInterval(blueChaseTimer);
    raceTimer=setInterval(()=>{
      suspicion=clamp(suspicion+HAVEAGO.suspPerSecond*0.2,0,100);
      $('suspFill').style.width=suspicion+'%';
      if(suspicion>=100)endRun(false,"SOC spotted the transfer and killed it.");
    },200);
    blueChaseTimer=setInterval(()=>{
      blueChaseVal=clamp(blueChaseVal+rand(c.stepMin,c.stepMax),0,blueChaseCap);
      $('blueChaseFill').style.width=blueChaseVal+'%';
    },c.tickMs);
  }
  function pushExfil(){
    if(stage!=='exfil')return;
    const inc=rand(HAVEAGO.pushIncrement.min,HAVEAGO.pushIncrement.max);
    exfil=clamp(exfil+inc,0,100);
    $('exfilRaceFill').style.width=exfil+'%';
    if(exfil>=100){
      clearInterval(raceTimer);clearInterval(blueChaseTimer);
      if(curStep&&curStep.note)log(curStep.note);
      stage='locked';next();
    }
  }

  /* ---------------- Blue: alert triage ----------------
     The live feed itself is the persistent #socMock pane (started once for
     the whole run in startRole). This step just waits a beat, then drops
     the real alert into that same feed and reveals the clickable queue. */
  function startAlertSoc(s){
    showScreen('alertsoc');stage='alertsoc-wait';
    $('alertList').innerHTML='';$('alertMsg').textContent='';
    setTimeout(()=>{
      if(!active||stage!=='alertsoc-wait')return;
      pushFeedRow('*** ALERT: unusual outbound transfer ***',true);
      Alarm.beep();
      fireAlertList(s);
    },HAVEAGO.socAlertDelayMs||2600);
  }
  function fireAlertList(s){
    stage='alertsoc';
    const rows=shuffle(HAVEAGO.blueAlerts);
    $('alertList').innerHTML=rows.map((a,i)=>`<div class="alertrow" data-i="${i}">${a.text}</div>`).join('');
    [...document.querySelectorAll('.alertrow')].forEach((el,i)=>el.onclick=()=>onAlertClick(rows[i],el));
    blueExfil=0;clearInterval(blueTimer);
    blueTimer=setInterval(()=>{
      blueExfil=clamp(blueExfil+HAVEAGO.blueExfilPerSecond*0.2,0,100);
      const f=$('exfilBlueFill');if(f)f.style.width=blueExfil+'%';
      if(blueExfil>=100)endRun(false,"The transfer finished before you contained it.");
    },200);
  }
  function onAlertClick(a,el){
    if(stage!=='alertsoc')return;
    if(a.real){
      if(curStep&&curStep.note)log(curStep.note);
      stage='locked';next();
    }else{
      $('alertMsg').textContent=HAVEAGO.blueWrongMsg;el.classList.add('wrong');setTimeout(()=>el.classList.remove('wrong'),350);
    }
  }

  /* ---------------- Blue: SOC command-line step (types into #miniTerm) ---------------- */
  function startSoccmd(s){
    showScreen('narr');$('narrTitle').textContent=s.title;$('narrSub').textContent=s.sub||'';
    stage='soccmd';
    MiniTerm.run(s.lines).then(()=>{if(active&&stage==='soccmd'){if(s.note)log(s.note);next()}});
  }

  /* ---------------- Blue: packet trace click-through ----------------
     Every packet with a "note" logs that finding to Notes (and the SOC
     feed) the moment it's clicked, win or lose, so by the time the step
     ends the player has the full chain of contacted hosts written down —
     not just the final answer. The "correct" packet both logs and advances. */
  function startTrace(s){
    showScreen('trace');stage='trace';traceIdx=0;loggedPacketIdx=new Set();
    $('pktBody').innerHTML='';$('traceMsg').textContent='';
    $('pktNextBtn').disabled=false;$('pktNextBtn').textContent='Next packet ▸';
    $('pktNextBtn').onclick=()=>nextPacket(s);
  }
  function nextPacket(s){
    if(stage!=='trace')return;
    const rows=s.packets;
    if(traceIdx>=rows.length)return;
    const p=rows[traceIdx],myIdx=traceIdx;
    const tr=document.createElement('tr');
    if(p.big)tr.classList.add('big');
    tr.innerHTML=`<td>${p.t}</td><td>${p.src}</td><td>${p.dst}</td><td>${p.proto}</td><td>${p.len}</td><td>${p.info}</td>`;
    tr.onclick=()=>pickPacket(tr,p,myIdx,s);
    $('pktBody').appendChild(tr);
    traceIdx++;
    if(traceIdx>=rows.length){
      $('pktNextBtn').disabled=true;$('pktNextBtn').textContent='All packets shown';
      $('traceMsg').style.color='#ffb74d';$('traceMsg').textContent='Click the row that shows where the data went.';
    }
  }
  function pickPacket(tr,p,idx,s){
    if(stage!=='trace')return;
    if(p.note&&!loggedPacketIdx.has(idx)){loggedPacketIdx.add(idx);log(p.note)}
    if(p.correct){
      tr.classList.add('rightpick');
      $('traceMsg').style.color='#3ddc97';$('traceMsg').textContent="That's it — destination "+p.dst;
      stage='locked';setTimeout(()=>{if(active)next()},1200);
    }else if(p.note){
      tr.classList.add('rightpick');
      $('traceMsg').style.color='#4db8ff';$('traceMsg').textContent='Logged to notes — keep stepping through for the actual transfer.';
    }else{
      tr.classList.add('wrongpick');
      $('traceMsg').style.color='#ffb74d';$('traceMsg').textContent=s.wrongMsg||'Not this one — keep looking.';
      setTimeout(()=>tr.classList.remove('wrongpick'),400);
    }
  }

  /* ---------------- Blue: containment ---------------- */
  function startContain(s){
    showScreen('contain');stage='contain';$('containMsg').textContent='';
    $('exfilBlueFill').style.width=blueExfil+'%';
    const opts=shuffle(HAVEAGO.containChoices);
    $('containChoices').innerHTML=opts.map((o,i)=>`<button class="containbtn" data-i="${i}">${o.text}</button>`).join('');
    [...document.querySelectorAll('.containbtn')].forEach((el,i)=>el.onclick=()=>onContainClick(opts[i],el,s));
  }
  function onContainClick(o,el,s){
    if(stage!=='contain')return;
    if(o.correct){
      clearInterval(blueTimer);
      if(s.note)log(s.note);
      stage='locked';next();
    }else{
      $('containMsg').textContent=o.note||HAVEAGO.containWrongMsg;el.classList.add('wrong');el.disabled=true;
    }
  }

  /* ---------------- Shared: end + leaderboard ---------------- */
  function endRun(success,detail){
    if(!active)return;
    active=false;stopClock();clearInterval(raceTimer);clearInterval(blueChaseTimer);clearInterval(blueTimer);stopSocFeed();Term.reset();
    const t=elapsedSeconds();
    $('endTitle').textContent=success?(role==='red'?'Breach successful':'Breach contained'):(role==='red'?'Mission failed':'Breach not contained');
    $('endTitle').style.color=success?'#3ddc97':'#ff4d5e';
    $('endDetail').textContent=`${detail} Time: ${fmt(t)}s.`;
    $('endTags').innerHTML=[...seenTags].map(id=>{
      const m=HAVEAGO.mitreTags.find(x=>x[0]===id);return m?`<span>${m[1]}</span>`:'';
    }).join('');
    $('nameInput').value='';
    const entry=document.querySelector('.scoreentry');
    entry.style.display=success?'flex':'none';
    $('saveScore').onclick=()=>{
      const name=($('nameInput').value||'Anonymous').trim().slice(0,16);
      saveScore(role,name,t);
      showScreen('leaderboard');renderLeaderboard();
    };
    showScreen('end');
  }
  function loadBoard(){try{return JSON.parse(localStorage.getItem(LB_KEY))||{red:[],blue:[]}}catch(e){return{red:[],blue:[]}}}
  function saveScore(role,name,time){
    const b=loadBoard();
    b[role].push({name,time,date:new Date().toISOString().slice(0,10)});
    b[role].sort((a,b2)=>a.time-b2.time);
    b[role]=b[role].slice(0,10);
    try{localStorage.setItem(LB_KEY,JSON.stringify(b))}catch(e){}
  }
  function renderLeaderboard(){
    const b=loadBoard();
    const fill=(id,list)=>$(id).querySelector('tbody').innerHTML=list.length
      ? list.map((e,i)=>`<tr><td>${i+1}</td><td>${e.name}</td><td>${fmt(e.time)}s</td></tr>`).join('')
      : '<tr><td colspan="3">No times yet — be the first.</td></tr>';
    fill('lbRed',b.red);fill('lbBlue',b.blue);
  }

  function resetAll(){
    active=false;role=null;steps=null;idx=-1;stage=null;curStep=null;
    clearInterval(raceTimer);clearInterval(blueChaseTimer);clearInterval(blueTimer);stopSocFeed();
    Term.reset();MiniTerm.reset();Net.reset();resetTags();Notes.reset();
    $('socMock').innerHTML='';
    $('socPane').classList.add('hidden');$('termPane').classList.remove('hidden');
    suspicion=0;exfil=0;blueExfil=0;blueChaseVal=0;
    hardResetClock();
    showScreen('role');
  }

  document.addEventListener('DOMContentLoaded',()=>{
    document.documentElement.style.setProperty('--brand',HAVEAGO.brandColor||'#f2b705');
    $('brandName').textContent=HAVEAGO.brandName;$('brandUnit').textContent=HAVEAGO.brandUnit;
    Net.init();initTags();Notes.reset();
    document.getElementById('net').addEventListener('click',e=>{
      const n=e.target.closest('.node');if(n)onNodeClick(n.id.replace('n-',''));
    });
    $('pickRed').onclick=()=>startRole('red');
    $('pickBlue').onclick=()=>startRole('blue');
    $('sqliSubmit').onclick=trySqli;
    $('sqliForm').addEventListener('submit',trySqli);
    $('sqliHint').onclick=()=>{$('sqliMsg').style.color='#9ab';$('sqliMsg').textContent=HAVEAGO.sqliHint};
    $('pushBtn').onclick=pushExfil;
    $('restartBtn').onclick=resetAll;
    $('playAgain').onclick=resetAll;
    $('leaderboardBtn').onclick=()=>{renderLeaderboard();showScreen('leaderboard')};
    $('lbBack').onclick=()=>showScreen('role');
  });
})();
