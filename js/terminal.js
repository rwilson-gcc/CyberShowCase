const Term=(()=>{
  let tok=0;
  const el=()=>document.getElementById('terminal');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(lines){
    const my=++tok;el().innerHTML='';
    for(const l of lines){
      const o=typeof l==='string'?{t:l}:{...l};
      if(o.host)o.t=`[${o.host}] ${o.t}`;
      const d=document.createElement('div');d.className='ln '+(o.cls||'');el().appendChild(d);
      for(const ch of o.t){
        if(my!==tok)return;
        d.textContent+=ch;el().scrollTop=el().scrollHeight;
        await sleep(o.speed||9);
      }
      if(o.cb)o.cb();
      await sleep(o.d??250);
      if(my!==tok)return;
    }
  }
  function reset(){tok++;el().innerHTML=''}
  return{run,reset};
})();
