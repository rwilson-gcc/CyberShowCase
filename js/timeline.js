const Timeline=(()=>{
  const el=()=>document.getElementById('timeline');
  function init(stages,onClick){
    el().innerHTML=stages.map((s,i)=>`<div class="step" id="step${i}" title="${s.title}">${i+1}</div>`).join('');
    stages.forEach((s,i)=>document.getElementById('step'+i).addEventListener('click',()=>onClick&&onClick(i)));
  }
  function activate(i){
    document.querySelectorAll('.step').forEach((s,n)=>{s.classList.toggle('active',n===i);s.classList.toggle('done',n<i)});
  }
  function setClickable(on){document.querySelectorAll('.step').forEach(s=>s.classList.toggle('clickable',on))}
  function reset(){document.querySelectorAll('.step').forEach(s=>s.classList.remove('active','done'))}
  return{init,activate,setClickable,reset};
})();
