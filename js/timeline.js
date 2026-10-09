const Timeline=(()=>{
  const el=()=>document.getElementById('timeline');
  function init(stages){el().innerHTML=stages.map((s,i)=>`<div class="step" id="step${i}" title="${s.title}">${i+1}</div>`).join('')}
  function activate(i){
    document.querySelectorAll('.step').forEach((s,n)=>{s.classList.toggle('active',n===i);s.classList.toggle('done',n<i)});
  }
  function reset(){document.querySelectorAll('.step').forEach(s=>s.classList.remove('active','done'))}
  return{init,activate,reset};
})();
