const Net=(()=>{
  const NS='http://www.w3.org/2000/svg';
  const N={
    attacker:{x:110,y:70,l:'Pentester',ip:'203.0.113.50',i:'laptop',known:1},
    internet:{x:500,y:60,l:'Internet',ip:'',i:'globe',known:1},
    firewall:{x:500,y:180,l:'Firewall',ip:'10.10.10.1',i:'shield'},
    web:{x:230,y:330,l:'WEB01',ip:'10.10.10.20',i:'server',svc:'80 443'},
    files:{x:500,y:330,l:'FILE01',ip:'10.10.10.30',i:'server',svc:'445 3389'},
    db:{x:770,y:330,l:'DB01',ip:'10.10.10.40',i:'db',svc:'1433'}
  };
  const LINKS=[['attacker','internet'],['internet','firewall'],['firewall','web'],['firewall','files'],['firewall','db']];
  const internal=['web','files','db'];
  let svg,gen=0,timer=null;

  function init(){
    svg=document.getElementById('net');
    let h=`<defs>
<symbol id="i-laptop" viewBox="0 0 48 48"><rect x="9" y="12" width="30" height="20" rx="2"/><path d="M4 38h40l-4-6H8z"/></symbol>
<symbol id="i-globe" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"/><ellipse cx="24" cy="24" rx="7" ry="16"/><path d="M8 24h32"/></symbol>
<symbol id="i-shield" viewBox="0 0 48 48"><path d="M24 6 10 11v12c0 9 6 15 14 19 8-4 14-10 14-19V11z"/></symbol>
<symbol id="i-server" viewBox="0 0 48 48"><rect x="9" y="8" width="30" height="12" rx="2"/><rect x="9" y="26" width="30" height="12" rx="2"/><path d="M14 14h4M14 32h4"/></symbol>
<symbol id="i-db" viewBox="0 0 48 48"><ellipse cx="24" cy="12" rx="13" ry="5"/><path d="M11 12v24c0 3 6 5 13 5s13-2 13-5V12M11 24c0 3 6 5 13 5s13-2 13-5"/></symbol>
</defs>`;
    LINKS.forEach(([a,b])=>{h+=`<line class="link" id="l-${a}-${b}" x1="${N[a].x}" y1="${N[a].y}" x2="${N[b].x}" y2="${N[b].y}"/>`});
    for(const id in N){const n=N[id];
      h+=`<g class="node ${n.known?'':'unknown'}" id="n-${id}" transform="translate(${n.x},${n.y})"><circle r="38"/><use href="#i-${n.i}" class="ico" x="-18" y="-18" width="36" height="36"/><text y="60">${n.l}</text><text class="ip" y="76">${n.ip}</text><text class="svc" y="91">${n.svc||''}</text></g>`}
    svg.innerHTML=h;
  }
  const node=id=>document.getElementById('n-'+id);
  const reveal=id=>node(id)?.classList.remove('unknown');
  const discover=id=>{reveal(id);node(id)?.classList.add('discovered')};
  const defend=id=>{reveal(id);const n=node(id);n.classList.remove('discovered');n.classList.add('defended')};
  function clearPath(){svg.querySelectorAll('.link.path').forEach(l=>l.classList.remove('path'))}
  function showPath(ids){
    clearPath();
    for(let i=0;i<ids.length-1;i++){
      const a=ids[i],b=ids[i+1];
      const l=document.getElementById(`l-${a}-${b}`)||document.getElementById(`l-${b}-${a}`)||
        document.getElementById(`l-firewall-${b}`);
      l?.classList.add('path');
    }
  }
  function hop(a,b,o){
    return new Promise(res=>{
      const g=gen,p=document.createElementNS(NS,'circle');
      p.setAttribute('r',6);p.setAttribute('class','pkt');p.style.color=o.color;p.setAttribute('fill',o.color);
      svg.appendChild(p);
      const A=N[a],B=N[b],t0=performance.now(),dur=o.dur||700;
      (function f(t){
        if(g!==gen){p.remove();return res(false)}
        const k=Math.min(1,(t-t0)/dur);
        p.setAttribute('cx',A.x+(B.x-A.x)*k);p.setAttribute('cy',A.y+(B.y-A.y)*k);
        if(k<1)return requestAnimationFrame(f);
        p.remove();
        if(o.blockAt===b){
          const x=document.createElementNS(NS,'text');x.setAttribute('class','block');
          x.setAttribute('x',B.x+50);x.setAttribute('y',B.y);x.textContent='✕';svg.appendChild(x);
          setTimeout(()=>x.remove(),900);return res(false);
        }
        res(true);
      })(t0);
    });
  }
  async function flow(route,o){for(let i=0;i<route.length-1;i++){if(!(await hop(route[i],route[i+1],o)))return}}
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  function traffic(mode){
    stopTraffic();if(!mode)return;
    const tick=()=>{
      if(mode==='recon')flow(['attacker','internet'],{color:'#ffb74d',dur:1100});
      else if(mode==='scan')flow(['attacker','internet','firewall',pick(internal)],{color:'#ffb74d',dur:450});
      else if(mode==='attack')flow(['attacker','internet','firewall',pick(internal)],{color:'#ff4d5e',dur:500});
      else if(mode==='blocked')flow(['attacker','internet','firewall'],{color:'#ff4d5e',dur:450,blockAt:'firewall'});
    };
    tick();timer=setInterval(tick,mode==='recon'?1500:900);
  }
  function stopTraffic(){clearInterval(timer);timer=null}
  function reset(){
    gen++;stopTraffic();clearPath();
    svg.querySelectorAll('.pkt,.block').forEach(e=>e.remove());
    for(const id in N){const n=node(id);n.classList.remove('discovered','defended');if(!N[id].known)n.classList.add('unknown')}
  }
  return{init,reveal,discover,defend,showPath,clearPath,traffic,stopTraffic,reset};
})();
