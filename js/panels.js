const $=id=>document.getElementById(id);

const Scene={show(name){document.querySelectorAll('.scene').forEach(s=>s.classList.toggle('show',s.id==='scene-'+name))}};

const Approval=(()=>{
  const P=[['Chief Executive Officer','CEO'],['Chief Information Security Officer','CISO'],['Board Audit & Risk Chair','Board']];
  let timers=[];
  function init(){$('signers').innerHTML=P.map((p,i)=>`<div class="signer" id="sg${i}"><b>${p[1]}</b><small>${p[0]}</small><div class="st">Awaiting signature</div></div>`).join('')}
  function reset(){timers.forEach(clearTimeout);timers=[];$('stamp').classList.remove('show');P.forEach((_,i)=>{const s=$('sg'+i);s.classList.remove('ok');s.querySelector('.st').textContent='Awaiting signature'})}
  function run(){
    reset();
    P.forEach((_,i)=>timers.push(setTimeout(()=>{const s=$('sg'+i);s.classList.add('ok');s.querySelector('.st').textContent='Signed and approved'},2500+i*2500)));
    timers.push(setTimeout(()=>$('stamp').classList.add('show'),2500+P.length*2500));
  }
  return{init,run,reset};
})();

const Mitre=(()=>{
  let seen=new Set();
  function init(){$('mitre').innerHTML=MITRE.map(m=>`<div class="tac" id="t-${m[0]}">${m[1]}</div>`).join('')}
  function set(ids){
    document.querySelectorAll('.tac').forEach(t=>t.classList.remove('on'));
    ids.forEach(id=>{seen.add(id);$('t-'+id)?.classList.add('on')});
    seen.forEach(id=>$('t-'+id)?.classList.add('seen'));
  }
  function reset(){seen=new Set();document.querySelectorAll('.tac').forEach(t=>t.classList.remove('on','seen'))}
  return{init,set,reset};
})();

const Siem=(()=>{
  const BARS=32;
  const rnd=()=>8+Math.random()*18;
  function baseline(){document.querySelectorAll('#chart i').forEach(b=>{b.style.height=rnd()+'%';b.classList.remove('hot')});$('siemAlert').classList.add('hidden')}
  function init(){$('chart').innerHTML='<i></i>'.repeat(BARS);baseline()}
  function spike(){
    const bars=[...document.querySelectorAll('#chart i')];
    bars.slice(-7).forEach((b,i)=>{b.style.height=(45+i*8)+'%';b.classList.add('hot')});
    $('siemAlert').classList.remove('hidden');
  }
  function add(sev,msg){
    const t=new Date().toLocaleTimeString('en-GB');
    const r=document.createElement('tr');
    r.innerHTML=`<td>${t}</td><td class="sev-${sev}">${{high:'High',med:'Medium',info:'Info'}[sev]}</td><td>${msg}</td>`;
    $('events').prepend(r);
  }
  function query(q){$('siemQuery').textContent=q}
  function reset(){$('events').innerHTML='';query('index=network sourcetype=firewall | timechart count by dest_ip');baseline()}
  return{init,baseline,spike,add,query,reset};
})();

const Analysts=(()=>{
  const A=[['A. Patel','Tier 1 triage','#e0a96d'],['M. Okafor','Incident lead','#8d5524'],['J. Chen','Forensics','#c68642']];
  const avatar=c=>`<svg viewBox="0 0 44 44"><rect width="44" height="44" fill="#1c2b3a"/><circle cx="22" cy="17" r="8" fill="${c}"/><path d="M6 44c0-10 7-15 16-15s16 5 16 15z" fill="#4db8ff"/></svg>`;
  function init(){$('analysts').innerHTML=A.map((a,i)=>`<div class="analyst" id="an${i}">${avatar(a[2])}<div><b>${a[0]}</b><small>${a[1]}</small><div class="st">Idle</div></div></div>`).join('')}
  function set(status,cls){A.forEach((_,i)=>{const e=$('an'+i);e.className='analyst '+(cls||'');e.querySelector('.st').textContent=status[i]})}
  function reset(){set(['Idle','Idle','Idle'],'')}
  return{init,set,reset};
})();

const Exfil=(()=>{
  let gen=0;
  function set(p,label,fail){
    $('exfil').classList.remove('hidden');
    $('exfilFill').style.width=p+'%';$('exfilFill').classList.toggle('fail',!!fail);
    $('exfilPct').textContent=Math.round(p)+'%';
    if(label)$('exfilLabel').textContent=label;
  }
  function show(label){set(0,label)}
  function run(from,to,ms,done){
    const g=++gen,t0=performance.now();
    (function f(t){
      if(g!==gen)return;
      const k=Math.min(1,(t-t0)/ms);
      set(from+(to-from)*k);
      if(k<1)requestAnimationFrame(f);else done&&done();
    })(t0);
  }
  function fail(label){set(99,label,true)}
  function reset(){gen++;$('exfil').classList.add('hidden');set(0,'Exfiltrating');$('exfil').classList.add('hidden')}
  return{show,run,set,fail,reset};
})();

const SQLi=(()=>{
  let gen=0;
  function reset(){
    gen++;
    $('sqliUser').value='';$('sqliPass').value='';
    $('loginMsg').textContent='';$('loginMsg').classList.remove('bad');
    $('adminPanel').classList.add('hidden');
    $('loginForm').classList.remove('hidden');
  }
  function type(g,el,text,cb){
    let i=0;el.value='';
    (function step(){
      if(g!==gen)return;
      el.value+=text[i]||'';i++;
      if(i<=text.length)setTimeout(step,45);else cb&&cb();
    })();
  }
  function run(){
    reset();const g=gen;
    setTimeout(()=>{if(g!==gen)return;type(g,$('sqliUser'),'admin',()=>{
      setTimeout(()=>{if(g!==gen)return;type(g,$('sqliPass'),"' OR '1'='1' -- ",()=>{
        setTimeout(()=>{
          if(g!==gen)return;
          $('loginMsg').textContent='Authenticating...';
          setTimeout(()=>{
            if(g!==gen)return;
            $('loginMsg').textContent='Login query returned a row — authentication bypassed.';
            $('loginMsg').classList.add('bad');
            $('loginForm').classList.add('hidden');
            $('adminPanel').classList.remove('hidden');
          },1200);
        },500);
      })},400);
    })},700);
  }
  return{run,reset};
})();

const Alarm={
  beep(){
    try{
      const c=new (window.AudioContext||window.webkitAudioContext)();
      [0,.3,.6].forEach(d=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.value=.05;o.connect(g);g.connect(c.destination);o.start(c.currentTime+d);o.stop(c.currentTime+d+.18)});
    }catch(e){}
  }
};
