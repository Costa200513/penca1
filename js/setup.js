import { auth, db } from './firebase-config.js';
import { TEAMS, PHASES, MATCHES } from './seed-data.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, setDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

let user = null;
const log = (t) => { const el=document.getElementById('setupLog'); el.innerHTML += `<br>${t}`; };

onAuthStateChanged(auth, (u)=>{
  if(!u){ window.location.href='login.html'; return; }
  user=u; document.getElementById('setupUser').textContent = u.email;
});

document.getElementById('loadBtn').addEventListener('click', async()=>{
  if(!user) return;
  const btn=document.getElementById('loadBtn'); btn.disabled=true;
  try{
    log('Creando perfil admin...');
    await setDoc(doc(db,'users',user.uid),{uid:user.uid,email:user.email,username:(user.email||'admin').split('@')[0].replace(/[^a-z0-9_.]/gi,'').toLowerCase(),fullName:'Administrador',role:'admin',active:true,participantType:'teacher',specialty:'Administración',year:'',championId:'',championName:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
    await setDoc(doc(db,'usernames',(user.email||'admin').split('@')[0].replace(/[^a-z0-9_.]/gi,'').toLowerCase()),{uid:user.uid,createdAt:serverTimestamp()},{merge:true});

    log('Cargando fases...');
    let batch=writeBatch(db); let count=0;
    for(const f of PHASES){ batch.set(doc(db,'phases',f.id),f); if(++count%400===0){await batch.commit(); batch=writeBatch(db);} }
    log('Cargando equipos...');
    for(const t of TEAMS){ batch.set(doc(db,'teams',t[0]),{id:t[0],name:t[1],group:t[2]||'',isPlaceholder:!!t[3]}); if(++count%400===0){await batch.commit(); batch=writeBatch(db);} }
    // placeholders automáticos para ganadores/perdedores de cruces
    for(let i=73;i<=104;i++){ batch.set(doc(db,'teams',`WIN_${i}`),{id:`WIN_${i}`,name:`Ganador Partido ${i}`,group:'',isPlaceholder:true}); if(++count%400===0){await batch.commit(); batch=writeBatch(db);} }
    for(let i=101;i<=102;i++){ batch.set(doc(db,'teams',`LOS_${i}`),{id:`LOS_${i}`,name:`Perdedor Partido ${i}`,group:'',isPlaceholder:true}); if(++count%400===0){await batch.commit(); batch=writeBatch(db);} }

    log('Cargando partidos...');
    for(const m of MATCHES){ batch.set(doc(db,'matches',String(m.n)),{id:String(m.n),number:m.n,phase:m.p,group:m.g||'',teamAId:m.a,teamBId:m.b,dateTime:m.dt||'',dateText:m.txt||'Horario a confirmar',venue:m.v||'',status:'pending',goalsA:null,goalsB:null,penaltyWinnerId:'',winnerId:'',order:m.n,createdAt:serverTimestamp()}); if(++count%400===0){await batch.commit(); batch=writeBatch(db);} }
    batch.set(doc(db,'settings','tournament'),{predictionsCloseMinutes:30,realChampionId:'',updatedAt:serverTimestamp()});
    await batch.commit();
    log('Base cargada correctamente. Ahora publicá las reglas finales.');
    btn.disabled=false;
  }catch(err){ console.error(err); log('ERROR: '+err.message); btn.disabled=false; }
});
