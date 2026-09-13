const app=document.querySelector('#app');const toast=document.querySelector('#toast');
let state={user:null,view:'dashboard',data:{subjects:[],timetable:[],attendance:[],tasks:[],tests:[],notifications:[]},date:new Date()};
const api=async(path,opt={})=>{const token=localStorage.getItem('sc_token');const headers={'Content-Type':'application/json',...(opt.headers||{})};if(token)headers.Authorization=`Bearer ${token}`;const r=await fetch('/api'+path,{...opt,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Request failed');return d};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);const iso=d=>{const x=new Date(d);const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};const today=()=>iso(new Date());
const modalRoot=()=>document.querySelector('#modal-root')||document.body;
function safeVal(v,fb=''){return (v===undefined||v===null||v==='undefined'||v==='null')?fb:String(v)}
function emptyState(icon,title,sub,btn=''){return `<div class="empty-state"><div class="empty-ico">${icon}</div><h3>${title}</h3><p>${sub}</p>${btn}</div>`}
function unreadCount(){return (state.data.notifications||[]).filter(n=>!n.read).length}
function startHeaderClock(){clearInterval(window.__hc);const el=()=>document.querySelector('#liveClock');const tick=()=>{const e=el();if(!e)return;e.textContent=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})};tick();window.__hc=setInterval(tick,15000)}
/* THEME: light/dark/system + tasteful presets, localStorage only */
function getTheme(){return localStorage.getItem('sc_theme')||'light'}
function getAccent(){return localStorage.getItem('sc_accent')||'default'}
function resolvedTheme(){const t=getTheme();if(t==='system')return (window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';return t}
function applyTheme(){document.documentElement.setAttribute('data-theme',resolvedTheme());document.documentElement.setAttribute('data-theme-choice',getTheme());const a=getAccent();if(a&&a!=='default')document.documentElement.setAttribute('data-accent',a);else document.documentElement.removeAttribute('data-accent')}
function setTheme(t){localStorage.setItem('sc_theme',t);applyTheme();if(state.user)renderView()}
function setAccent(a){localStorage.setItem('sc_accent',a);applyTheme();if(state.user)renderView()}
applyTheme();if(window.matchMedia)window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(getTheme()==='system')applyTheme()});
/* STUDY TIMER (frontend-only, persists across navigation via localStorage) */
let timer={total:25*60,left:25*60,running:false,endsAt:0,label:'25 min focus',lastTick:0};
function loadTimer(){try{const s=JSON.parse(localStorage.getItem('sc_timer')||'null');if(s&&s.total>0){timer.total=s.total;timer.label=s.label||timer.label;if(s.running&&s.endsAt){const left=Math.round((s.endsAt-Date.now())/1000);if(left>0){timer.left=left;timer.running=true;timer.endsAt=s.endsAt;}else{timer.left=0;timer.running=false;}}else{timer.left=(s.left??s.total);timer.running=false;}}}catch(e){}}
function saveTimer(){try{localStorage.setItem('sc_timer',JSON.stringify({total:timer.total,left:timer.left,running:timer.running,endsAt:timer.endsAt,label:timer.label}))}catch(e){}}
function fmtClock(s){s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0')}
function timerTick(){if(!timer.running)return;timer.left=Math.max(0,Math.round((timer.endsAt-Date.now())/1000));if(timer.left<=0){timer.running=false;timer.left=0;saveTimer();msg('Focus session complete. Well done!');if(state.view==='timer')renderView();return}saveTimer();const d=document.querySelector('#timerDigits');if(d&&state.view==='timer'){d.textContent=fmtClock(timer.left);const bar=document.querySelector('#timerBar');if(bar)bar.style.width=(100*(1-timer.left/timer.total))+'%';const st=document.querySelector('#timerStatus');if(st)st.textContent='Focusing — '+timer.label+' • ends '+new Date(timer.endsAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}}
setInterval(timerTick,500);loadTimer();
function timerStart(){if(timer.left<=0)timer.left=timer.total;timer.running=true;timer.endsAt=Date.now()+timer.left*1000;saveTimer();renderView()}
function timerPause(){if(!timer.running)return;timer.left=Math.max(0,Math.round((timer.endsAt-Date.now())/1000));timer.running=false;saveTimer();renderView()}
function timerResume(){if(timer.running||timer.left<=0)return;timer.running=true;timer.endsAt=Date.now()+timer.left*1000;saveTimer();renderView()}
function timerReset(){timer.running=false;timer.left=timer.total;saveTimer();renderView()}
function timerStop(){timer.running=false;timer.left=timer.total;saveTimer();renderView();msg('Timer stopped.')}
function timerPreset(min,label){timer.total=min*60;timer.left=timer.total;timer.running=false;timer.label=label||(min+' min focus');saveTimer();renderView()}
function timerCustom(min){min=Number(min);if(!min||min<1||min>480){msg('Enter 1–480 minutes.');return}timerPreset(min,min+' min custom focus');msg('Custom timer set: '+min+' min.')}
function msg(t){toast.textContent=t;toast.className='show';clearTimeout(window.__toast);window.__toast=setTimeout(()=>toast.className='',2800)}
function authPage(mode='login',prefill=''){
  const signup=mode==='signup';

  let title=
    signup?'Create your account':
    'Welcome back';

  let fields='';

  if(signup){
    fields+=`
      <label>
        Full name
        <input
          id="fullName"
          required
          placeholder="Your full name"
          autocomplete="name"
        >
      </label>`;
  }

  fields+=`
      <label>
        Email
        <input
          id="email"
          type="email"
          value="${esc(prefill)}"
          required
          placeholder="you@example.com"
          autocomplete="email"
        >
      </label>`;

  fields+=`
      <label>
        Password
        <input
          id="password"
          type="password"
          minlength="6"
          required
          placeholder="Minimum 6 characters"
          autocomplete="${signup ? 'new-password' : 'current-password'}"
        >
      </label>`;

  if(signup){
    fields+=`
      <label>
        Confirm password
        <input
          id="confirm"
          type="password"
          minlength="6"
          required
          placeholder="Re-enter password"
          autocomplete="new-password"
        >
      </label>`;
  }

  const action=
    signup?'Create account':
    'Sign in';

  const description=
    signup
      ?'One secure place for timetable, attendance, subjects and study planning.'
      :'Welcome back to your academic command center.';

  const extra='';

  app.innerHTML=`
    <main class="auth">
      <section class="auth-card">

        <div class="brand">
          <span class="logo">SC</span>
          <span>StudyConnect</span>
        </div>

        <div class="eyebrow">
          STUDENT ACADEMIC WORKSPACE
        </div>

        <h1>${title}</h1>

        <p class="muted">
          ${description}
        </p>

        <form id="authForm">

          ${fields}

          <button class="primary full">
            ${action}
          </button>

          ${extra}

        </form>

        <p class="auth-links">
          ${
            signup
              ? `Already have an account?
                 <button data-go="login" type="button">
                   Sign in
                 </button>`
              : `New here?
                 <button data-go="signup" type="button">
                   Create account
                 </button>`
          }
        </p>

      </section>
    </main>
  `;


  // =========================
  // AUTH FORM
  // =========================

  $('#authForm').onsubmit=async e=>{

    e.preventDefault();

    try{

      const email=
        $('#email')?.value
          .trim()
          .toLowerCase();


      // =========================
      // SIGN UP
      // =========================

      if(signup){

        if(
          $('#password').value !==
          $('#confirm').value
        ){
          throw Error(
            'Passwords do not match.'
          );
        }

        const d=await api(
          '/auth/signup',
          {
            method:'POST',

            body:JSON.stringify({
              email,
              password:$('#password').value,
              fullName:$('#fullName').value.trim()
            })
          }
        );

        if(!d.token){
          throw Error('Account created. Please sign in.');
        }

        localStorage.setItem(
          'sc_token',
          d.token
        );

        state.user=d.user;

        msg(
          d.message ||
          'Account created successfully.'
        );

        await loadApp();
      }


      // =========================
      // LOGIN
      // =========================

      else{

        const d=await api(
          '/auth/login',
          {
            method:'POST',

            body:JSON.stringify({
              email,
              password:
                $('#password').value
            })
          }
        );

        localStorage.setItem(
          'sc_token',
          d.token
        );

        state.user=d.user;

        await loadApp();
      }

    }catch(e){

      msg(
        e.message ||
        'Something went wrong.'
      );

    }

  };


  // =========================
  // NAVIGATION
  // =========================

  document
    .querySelectorAll('[data-go]')
    .forEach(b=>{

      b.onclick=()=>{

        authPage(
          b.dataset.go,
          $('#email')?.value.trim().toLowerCase() || prefill
        );

      };

    });

}
async function loadApp(){try{state.user=await api('/me');await refresh();renderShell();renderView()}catch(e){localStorage.removeItem('sc_token');authPage('login')}}
async function refresh(){for(const k of ['subjects','timetable','attendance','tasks','tests','notifications'])state.data[k]=await api('/'+k)}
const navMain=[['dashboard','⌂','Dashboard'],['profile','◉','Profile'],['subjects','▤','Subjects'],['timetable','▦','Timetable'],['attendance','✓','Attendance'],['tasks','☑','Study Plan'],['tests','▣','Tests'],['focuslearn','▶','FocusLearn'],['notifications','🔔','Notifications']];const navTools=[['timer','◷','Study Timer'],['clock','◔','Clock'],['settings','⚙','Settings']];const nav=[...navMain,...navTools];
function renderShell(){app.innerHTML=`<div class="shell"><div class="scrim" id="scrim"></div><aside id="sidebar" aria-label="Primary"><div class="brand side-brand"><span class="logo">SC</span><span class="brand-mark"><span><span class="brand-name">StudyConnect</span><div class="brand-tag">STUDENT WORKSPACE</div></span></span></div><nav aria-label="Sections"><div class="nav-section">Workspace</div>${navMain.map(n=>`<button data-view="${n[0]}" aria-label="${n[2]}"><span class="nav-ico">${n[1]}</span>${n[2]}${n[0]==='notifications'&&unreadCount()?`<span class="nav-badge">${unreadCount()}</span>`:''}</button>`).join('')}<div class="nav-section">Tools</div>${navTools.map(n=>`<button data-view="${n[0]}" aria-label="${n[2]}"><span class="nav-ico">${n[1]}</span>${n[2]}</button>`).join('')}<button id="aiBtn"><span class="nav-ico">✦</span>AI Buddy</button></nav><div class="side-foot"><button id="logout" class="logout">↪ Logout</button></div></aside><section class="main"><header><div class="header-left"><button id="menu" class="icon mobile" aria-label="Open menu">☰</button><div><div class="header-title" id="topTitle">Dashboard</div><div class="header-sub"><span class="header-date" id="topDate"></span><span class="live-clock" id="liveClock">--:--</span></div></div></div><div class="header-actions"><button id="notifyBtn" class="icon icon-btn" aria-label="Notifications">🔔${unreadCount()?'<span class="ping"></span>':''}</button><button id="profileMini" class="mini-avatar" aria-label="Profile"></button></div></header><main id="content" tabindex="-1"></main></section></div>`;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));$('#aiBtn').onclick=()=>window.open('https://chatgpt.com/','_blank','noopener');$('#logout').onclick=()=>{localStorage.removeItem('sc_token');authPage('login')};$('#notifyBtn').onclick=()=>go('notifications');$('#profileMini').onclick=()=>go('profile');const sb=$('#sidebar'),sc=$('#scrim');$('#menu').onclick=()=>{sb.classList.toggle('open');sc.classList.toggle('show',sb.classList.contains('open'))};sc.onclick=()=>{sb.classList.remove('open');sc.classList.remove('show')};startHeaderClock()}
function go(v){state.view=v;const sb=document.querySelector('#sidebar'),sc=document.querySelector('#scrim');sb?.classList.remove('open');sc?.classList.remove('show');renderView();document.querySelector('#content')?.focus({preventScroll:true});window.scrollTo({top:0})}
function renderView(){const titles={dashboard:'Dashboard',profile:'Profile',timetable:'Timetable',attendance:'Attendance',subjects:'Subjects',tasks:'Study Plan',tests:'Tests',focuslearn:'FocusLearn',notifications:'Notifications',timer:'Study Timer',clock:'Clock',settings:'Settings'};const tt=document.querySelector('#topTitle');if(tt)tt.textContent=titles[state.view]||'Dashboard';const td=document.querySelector('#topDate');if(td)td.textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});const p=state.user?.profile||{};const pm=document.querySelector('#profileMini');if(pm)pm.innerHTML=p.photo?`<img src="${p.photo}" alt="Profile">`:esc((p.fullName||state.user?.email||'S').charAt(0).toUpperCase());document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));const fn={dashboard:()=>safeCall(dashboardPro,emptyState('⚠','Dashboard unavailable','Please refresh.','')),profile:()=>safeCall(profileView,''),timetable:()=>safeCall(timetable,''),attendance:()=>safeCall(attendance,''),subjects:()=>safeCall(subjects,''),tasks:()=>safeCall(tasksPro,''),tests:()=>safeCall(testsPro,''),focuslearn:()=>safeCall(focusPro,''),notifications:()=>safeCall(notifPro,''),timer:()=>safeCall(timerView,''),clock:()=>safeCall(clockView,''),settings:()=>safeCall(settingsView,'')}[state.view]||dashboard;const c=document.querySelector('#content');if(c){c.innerHTML=fn();bindView()}applyTheme();}
function attendanceStats(){const marked=state.data.attendance.filter(a=>a.status==='present'||a.status==='absent');const p=marked.filter(a=>a.status==='present').length;return {present:p,absent:marked.length-p,percent:marked.length?Math.round(p/marked.length*100):0}}
function subjectStats(){return state.data.subjects.map(s=>{const a=state.data.attendance.filter(x=>(x.subjectId===s.id||x.subject===s.name)&&(x.status==='present'||x.status==='absent'));const p=a.filter(x=>x.status==='present').length;const chapters=s.chapters||[];return {...s,total:a.length,present:p,percent:a.length?Math.round(p/a.length*100):0,progress:chapters.length?Math.round(chapters.filter(c=>c.completed).length/chapters.length*100):0}})}
function dashboard(){const a=attendanceStats(),ss=subjectStats(),tasks=state.data.tasks;const done=tasks.filter(x=>x.completed).length;const day=new Date().toLocaleDateString('en-US',{weekday:'long'});const lectures=state.data.timetable.filter(x=>x.day===day).sort((a,b)=>a.start.localeCompare(b.start));const todaysTasks=tasks.filter(x=>x.date===today());return `<div class="hero"><div><div class="eyebrow">YOUR ACADEMIC OVERVIEW</div><h1>Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${esc(state.user.profile?.fullName||'Student')} 👋</h1><p>Track what matters today — classes, attendance, subjects and tasks.</p></div><button class="primary" data-view="timetable">View today's timetable</button></div><div class="stats-grid"><div class="stat-card"><span>Overall attendance</span><b>${a.percent}%</b><small>${a.present} present · ${a.absent} absent</small></div><div class="stat-card"><span>Today's tasks</span><b>${todaysTasks.filter(x=>x.completed).length}/${todaysTasks.length}</b><small>${done} completed overall</small></div><div class="stat-card"><span>Subject progress</span><b>${ss.length?Math.round(ss.reduce((x,s)=>x+s.progress,0)/ss.length):0}%</b><small>Based on completed chapters</small></div><div class="stat-card"><span>Active subjects</span><b>${ss.length}</b><small>Attendance tracked separately</small></div></div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Today's classes</h2><p>From your weekly timetable</p></div><button class="ghost" data-view="timetable">Manage</button></div>${lectures.length?`<div class="timeline">${lectures.map(x=>`<div class="timeline-row"><div class="time">${esc(x.start)}<br><small>${esc(x.end)}</small></div><div class="dot"></div><div><strong>${esc(x.subject)}</strong><p>${esc(x.faculty||'Faculty not set')} · ${esc(x.room||'Room not set')} ${x.type==='Lab'?`· <span class="tag">LAB</span>`:''}</p></div></div>`).join('')}</div>`:`<div class="empty">No lectures added for ${day}. Add your classes in Timetable to see them here.</div>`}</section><section class="panel"><div class="panel-head"><div><h2>Attendance snapshot</h2><p>Only Present/Absent lectures count</p></div><button class="ghost" data-view="attendance">Open</button></div>${ss.length?ss.slice(0,5).map(s=>`<div class="subject-line"><div><strong>${esc(s.name)}</strong><small>${s.present}/${s.total} marked</small></div><b>${s.percent}%</b></div><div class="bar"><span style="width:${s.percent}%"></span></div>`).join(''):`<div class="empty">Add subjects and mark attendance to build your snapshot.</div>`}</section></div>`}
function profileView(){const p=state.user.profile||{};const weak=p.weakSubjects||[],strong=p.strongSubjects||[];return `<div class="page-head"><div><div class="eyebrow">STUDENT PROFILE</div><h1>Profile</h1><p>These details personalize your workspace.</p></div><button class="secondary" data-view="settings">Settings</button></div><div class="profile-layout"><section class="card card-pad profile-side"><div class="avatar-xl">${p.photo?`<img src="${p.photo}" alt="Profile photo">`:esc((p.fullName||'S').charAt(0).toUpperCase())}</div><h2 style="margin:12px 0 2px">${esc(p.fullName||'Student')}</h2><p class="muted" style="margin:0">${esc(state.user.email||'')}</p><p class="muted" style="font-size:13px">${esc(p.bio||'Add a short bio from Edit profile.')}</p><div class="chip-row">${strong.map(s=>`<span class="chip">★ ${esc(s)}</span>`).join('')}${weak.map(s=>`<span class="chip">◎ ${esc(s)}</span>`).join('')}</div></section><form id="profileForm" class="card card-pad"><div class="card-head"><div><h2>Edit profile</h2><p>Photo under 2 MB. All fields optional except name.</p></div></div><label class="upload">Change profile photo<input id="photo" type="file" accept="image/*"></label><div class="form-grid">${[['fullName','Full name'],['college','College'],['university','University'],['branch','Branch'],['year','Year'],['section','Section'],['rollNo','Roll number'],['phone','Phone'],['className','Class / Year group'],['batch','Group / Batch (optional)']].map(([k,l])=>`<label>${l}<input name="${k}" value="${esc(p[k]||'')}"></label>`).join('')}<label class="full">Bio<textarea name="bio">${esc(p.bio||'')}</textarea></label><label class="full">Weak subjects <input name="weakSubjects" value="${esc((p.weakSubjects||[]).join(', '))}" placeholder="DSA, DBMS"></label><label class="full">Strong subjects <input name="strongSubjects" value="${esc((p.strongSubjects||[]).join(', '))}" placeholder="Java, Maths"></label></div><div class="actions"><button class="primary">Save profile</button></div></form></div>`}
function legacyMonthKey(d){try{const x=new Date(d);if(isNaN(x))return '';return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`}catch(e){return ''}}
function safeDashboard(){try{return dashboard()}catch(e){console.warn(e);return emptyState('⚠','Dashboard unavailable','Please refresh. Your data is safe.','<button class="primary" data-view="dashboard">Retry</button>')}}
function safeCall(fn,fb){try{return fn()}catch(e){console.warn(e);return fb}}
function monthKey(d){try{const x=(d instanceof Date)?d:new Date(d);if(isNaN(x))return legacyMonthKey(state.date);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`}catch(e){return legacyMonthKey(state.date)}}
const WEEK=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];function timetable(){const by=Object.fromEntries(WEEK.map(d=>[d,state.data.timetable.filter(x=>x.day===d).sort((a,b)=>a.start.localeCompare(b.start))]));return `<div class="page-head"><div><div class="eyebrow">YOUR WEEKLY SCHEDULE</div><h1>Timetable</h1><p>Create your own weekly timetable. It works for any college, school, course or self-study routine.</p></div><div class="head-actions"><button class="primary" data-modal="lecture">+ Add class</button></div></div><section class="notice"><strong>How it works:</strong> Add a class by selecting a day, time, subject and optional faculty/room. You can edit or delete it later. Attendance is always generated from <strong>your own timetable</strong>.</section><div class="week-grid">${WEEK.map(d=>`<section class="day-card"><div class="day-head"><h3>${d}</h3><span>${by[d].length} ${by[d].length===1?'class':'classes'}</span></div>${by[d].length?by[d].map(x=>`<article class="lecture-card"><div class="lecture-time">${esc(x.start)}–${esc(x.end)}</div><div><strong>${esc(x.subject)}</strong><p>${esc(x.faculty||'')} ${x.room?`· ${esc(x.room)}`:''}</p><span class="tag ${x.type==='Lab'?'lab':''}">${esc(x.type||'Lecture')}</span></div><div class="card-actions"><button data-edit="lecture:${x.id}">Edit</button><button data-del="timetable:${x.id}">Delete</button></div></article>`).join(''):`<div class="empty compact">No class scheduled</div>`}</section>`).join('')}</div>`}

function clockView(){return `<div class="page-head"><div><div class="eyebrow">LIVE</div><h1>Clock</h1><p>Browser local time. Updates every second. No API.</p></div><span class="pill info" id="clockZone">Local</span></div><section class="clock-hero"><div class="clock-time" id="clockTime">--:--:--</div><div class="clock-ampm" id="clockAmpm">--</div><div class="clock-date" id="clockDate">Loading…</div><div class="clock-sub" id="clockDay">Loading…</div></section><div class="clock-grid"><div class="card card-pad"><strong>Time zone</strong><p class="muted" id="clockTz2" style="margin:6px 0 0">Detecting…</p></div><div class="card card-pad"><strong>Today</strong><p class="muted" id="clockToday2" style="margin:6px 0 0">—</p></div><div class="card card-pad"><strong>Schedule</strong><p class="muted" style="margin:6px 0 0">Monday – Saturday</p><button class="ghost" data-view="timetable" style="margin-top:8px">Open timetable</button></div></div>`}
function startClockView(){const t=document.querySelector('#clockTime');if(!t)return;const tick=()=>{const n=new Date();let h=n.getHours();const ap=h>=12?'PM':'AM';h=h%12||12;const p=x=>String(x).padStart(2,'0');t.textContent=`${p(h)}:${p(n.getMinutes())}:${p(n.getSeconds())}`;document.querySelector('#clockAmpm').textContent=ap+' • LOCAL TIME';document.querySelector('#clockDate').textContent=n.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});document.querySelector('#clockDay').textContent=n.toLocaleDateString('en-IN',{weekday:'long'});const z=Intl.DateTimeFormat().resolvedOptions().timeZone||'Local';document.querySelector('#clockZone').textContent=z;document.querySelector('#clockTz2').textContent=z;document.querySelector('#clockToday2').textContent=n.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})};tick();clearInterval(window.__clock);window.__clock=setInterval(()=>{if(state.view!=='clock'){clearInterval(window.__clock);return}tick()},1000)}
function timerView(){const pct=timer.total?Math.round(100*(1-timer.left/timer.total)):0;const status=timer.running?('Focusing — '+timer.label):(timer.left<=0?'Complete. Reset to start again.':(timer.left<timer.total?'Paused — resume when ready.':'Ready — pick a preset or set custom.'));return `<div class="page-head"><div><div class="eyebrow">FOCUS</div><h1>Study Timer</h1><p>Real frontend timer. Keeps running while you navigate.</p></div><span class="pill ${timer.running?'ok':'info'}">${timer.running?'Running':'Idle'}</span></div><div class="timer-wrap"><section class="timer-dial"><div class="timer-digits" id="timerDigits">${fmtClock(timer.left)}</div><div class="timer-status" id="timerStatus">${esc(status)}</div><div class="timer-progress"><i id="timerBar" style="width:${pct}%"></i></div><div class="timer-controls"><button class="primary" data-timer="start" ${timer.running?'disabled':''}>Start</button>${timer.running?'<button class="secondary" data-timer="pause">Pause</button>':'<button class="secondary" data-timer="resume">Resume</button>'}<button class="secondary" data-timer="reset">Reset</button><button class="secondary" data-timer="stop">Stop</button></div><div class="preset-row"><button class="preset ${timer.total===1500?'on':''}" data-preset="25">25 min</button><button class="preset ${timer.total===2700?'on':''}" data-preset="45">45 min</button><button class="preset ${timer.total===3600?'on':''}" data-preset="60">60 min</button></div></section><section class="card card-pad"><div class="card-head"><div><h2>Custom duration</h2><p>1–480 minutes, this browser only.</p></div></div><form id="customTimer" style="display:flex;gap:8px;flex-wrap:wrap"><input id="customMin" type="number" min="1" max="480" placeholder="e.g. 30" style="flex:1;min-width:120px" aria-label="Custom minutes"><button class="primary" type="submit">Set timer</button></form><div style="margin-top:14px"><strong>Session</strong><p class="muted">${esc(timer.label)} • ${Math.round(timer.total/60)} min total</p></div></section></div>`}
function settingsView(){const t=getTheme(),a=getAccent();const prefs=getPrefs();return `<div class="page-head"><div><div class="eyebrow">PREFERENCES</div><h1>Settings</h1><p>Theme applies to the complete website and persists after refresh.</p></div></div><section class="settings-group"><h2>ACCOUNT</h2><p class="group-desc">Profile and account information.</p><div class="setting-row"><div><strong>${esc(state.user?.profile?.fullName||'Student')}</strong><small>${esc(state.user?.email||'')}</small></div><button class="secondary" data-view="profile">Open profile</button></div><div class="setting-row"><div><strong>Account status</strong><small>Signed in • per-user data</small></div><span class="pill ok">Active</span></div></section><section class="settings-group"><h2>APPEARANCE</h2><p class="group-desc">Light, Dark or System. Accents are optional.</p><div class="setting-row"><div><strong>Theme</strong><small>System follows browser / OS.</small></div><div class="seg"><button data-theme-pick="light" class="${t==='light'?'on':''}">Light</button><button data-theme-pick="dark" class="${t==='dark'?'on':''}">Dark</button><button data-theme-pick="system" class="${t==='system'?'on':''}">System</button></div></div><div class="setting-row"><div><strong>Accent preset</strong><small>Default keeps StudyConnect indigo.</small></div><div class="swatch-row">${[['default','#4f46e5','Default'],['ocean','#0284c7','Ocean'],['forest','#059669','Forest'],['purple','#7c3aed','Purple'],['slate','#475569','Slate']].map(([k,c,l])=>`<button class="swatch ${a===k?'on':''}" data-accent-pick="${k}" style="background:${c}" title="${l}" aria-label="${l}"></button>`).join('')}</div></div></section><section class="settings-group"><h2>STUDY</h2><p class="group-desc">Frontend-only preferences.</p><div class="setting-row"><div><strong>Default focus length</strong><small>Used when opening Study Timer.</small></div><div class="seg">${[25,45,60].map(m=>`<button data-default-min="${m}" class="${(prefs.defaultMin||25)===m?'on':''}">${m}m</button>`).join('')}</div></div><div class="setting-row"><div><strong>Daily reminder</strong><small>Friendly nudge on dashboard.</small></div><div class="seg"><button data-remind="on" class="${prefs.remind?'on':''}">On</button><button data-remind="off" class="${!prefs.remind?'on':''}">Off</button></div></div></section><section class="settings-group"><h2>GENERAL</h2><p class="group-desc">Interface options.</p><div class="setting-row"><div><strong>Compact cards</strong><small>Reduces padding.</small></div><div class="seg"><button data-density="compact" class="${prefs.density==='compact'?'on':''}">Compact</button><button data-density="comfortable" class="${prefs.density!=='compact'?'on':''}">Comfortable</button></div></div><div class="setting-row"><div><strong>Session</strong><small>Sign out of this browser.</small></div><button class="secondary" id="settingsLogout">Logout</button></div></section>`}
function tasksPro(){const all=[...(state.data.tasks||[])];const t=today();const isToday=x=>x.date===t;const isDone=x=>!!x.completed;const td=all.filter(x=>isToday(x)&&!isDone(x)),up=all.filter(x=>!isDone(x)&&!isToday(x)),done=all.filter(isDone);const row=x=>`<div class="task-row ${x.completed?'completed':''}"><button class="check" data-complete="tasks:${x.id}" aria-label="Toggle complete">${x.completed?'✓':''}</button><div class="task-main"><strong>${esc(x.title)}</strong><span>${esc(x.subject||'General')} • ${esc(x.date||'No due date')}</span></div><span class="tag ${x.priority==='High'?'high':x.priority==='Medium'?'medium':''}">${esc(x.priority||'Normal')}</span><button class="card-btn" data-edit="task:${x.id}">Edit</button><button class="card-btn danger-text" data-del="tasks:${x.id}">Delete</button></div>`;return `<div class="page-head"><div><div class="eyebrow">PERSONAL PRODUCTIVITY</div><h1>Study Plan</h1><p>Plan, prioritize and complete your study work.</p></div><button class="primary" data-modal="task">+ Add task</button></div><div class="plan-cols"><section class="card card-pad"><div class="card-head"><div><h2>Today</h2><p>${td.length} open</p></div></div>${td.map(row).join('')||emptyState('☀','Nothing due today','Enjoy the calm or add a task.','')}</section><section class="card card-pad"><div class="card-head"><div><h2>Upcoming</h2><p>${up.length} open</p></div></div>${up.map(row).join('')||emptyState('📅','No upcoming tasks','Add the next study task.','')}</section><section class="card card-pad"><div class="card-head"><div><h2>Completed</h2><p>${done.length} done</p></div></div>${done.map(row).join('')||emptyState('✓','No completed tasks','Complete a task to see it here.','')}</section></div>`}
function testsPro(){const all=[...(state.data.tests||[])];const t=today();const up=all.filter(x=>!x.date||x.date>=t),done=all.filter(x=>x.date&&x.date<t);const card=x=>{const s=Number(x.score||0),tt=Number(x.total||100);const pct=tt?Math.round(s/tt*100):0;return `<section class="card card-pad"><span class="pill info">${esc(x.subject||'General')}</span><h3 style="margin:8px 0 2px">${esc(x.name)}</h3><div class="timer-digits" style="font-size:30px">${esc(x.score)}<small style="font-size:14px"> / ${esc(x.total||100)}</small></div><div class="meter"><i style="width:${pct}%"></i></div><p class="muted">${esc(x.date||'')} • ${pct}%</p><div class="card-actions"><button data-del="tests:${x.id}">Delete</button></div></section>`};return `<div class="page-head"><div><div class="eyebrow">PERFORMANCE</div><h1>Tests</h1><p>Upcoming and completed assessments from your records.</p></div><button class="primary" data-modal="test">+ Add result</button></div><div class="card-head"><div><h2>Upcoming</h2><p>${up.length} scheduled</p></div></div><div class="test-cards" style="margin-bottom:14px">${up.map(card).join('')||emptyState('📝','No upcoming tests','Add a test to track it here.','')}</div><div class="card-head"><div><h2>Completed</h2><p>${done.length} recorded</p></div></div><div class="test-cards">${done.map(card).join('')||emptyState('✓','No completed tests','Past tests will appear here.','')}</div>`}
function monthStats(){const key=monthKey(state.date);return state.data.subjects.map(s=>{const rows=state.data.attendance.filter(a=>a.subjectId===s.id&&String(a.date||'').startsWith(key));const present=rows.filter(a=>a.status==='present').length;const absent=rows.filter(a=>a.status==='absent').length;const held=present+absent;return {...s,present,absent,held,percent:held?Math.round(present/held*100):0}})}
function focusPro(){return `<div class="page-head"><div><div class="eyebrow">LEARN BETTER</div><h1>FocusLearn</h1><p>Search any subject and any topic on real YouTube. No API key.</p></div></div><section class="search-hero2"><div class="empty-ico" style="margin:0 auto">▶</div><h2 style="margin:12px 0 4px">What do you want to learn?</h2><p class="muted">StudyConnect opens the real YouTube search in a new tab.</p><form id="ytForm"><div class="search-inline"><input id="ytSubject" placeholder="Subject e.g. Data Structures" aria-label="Subject"><input id="ytTopic" required placeholder="Topic e.g. Binary Search" aria-label="Topic"><button class="primary" type="submit">Search YouTube ↗</button></div></form><div class="chip-row" style="margin-top:14px"><button class="chip" data-yt="Data Structures|Binary Search">DSA • Binary Search</button><button class="chip" data-yt="DBMS|Normalization">DBMS • Normalization</button><button class="chip" data-yt="Maths|Probability">Maths • Probability</button></div></section>`}
function notifPro(){const ns=[...(state.data.notifications||[])];const unread=ns.filter(n=>!n.read).length;return `<div class="page-head"><div><div class="eyebrow">UPDATES</div><h1>Notifications ${unread?`• ${unread} unread`:''}</h1><p>Important reminders and activity for your account.</p></div><button id="readAll" class="secondary">Mark all read</button></div><div class="card card-pad">${ns.map(n=>`<article class="notif-item ${n.read?'':'unread'}"><span class="notif-ico">${n.type==='warning'?'⚠':n.type==='success'?'✓':'🔔'}</span><div style="flex:1;min-width:0"><strong>${esc(safeVal(n.title,'Notification'))}</strong><p class="muted" style="margin:4px 0">${esc(safeVal(n.message,''))}</p><small class="muted">${n.createdAt?new Date(n.createdAt).toLocaleString():'Just now'} • ${esc(safeVal(n.type,'info'))}</small></div>${n.read?'<span class="pill">Read</span>':`<button class="ghost" data-notif-read="${n.id}">Mark read</button>`}</article>`).join('')||emptyState('🔔','No notifications yet','Important reminders will appear here.','')}</div>`}
function attendance(){const d=state.date;const date=iso(d);const day=d.toLocaleDateString('en-US',{weekday:'long'});const lectures=state.data.timetable.filter(x=>x.day===day).sort((a,b)=>a.start.localeCompare(b.start));const ss=monthStats();const get=t=>state.data.attendance.find(a=>a.timetableSessionId===t.id&&a.date===date);const key=monthKey(d);const monthName=d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});const monthRows=state.data.attendance.filter(a=>String(a.date||'').startsWith(key));const mp=monthRows.filter(a=>a.status==='present').length,ma=monthRows.filter(a=>a.status==='absent').length,mheld=mp+ma,mpercent=mheld?Math.round(mp/mheld*100):0;return `<div class="page-head"><div><div class="eyebrow">YOUR ATTENDANCE</div><h1>Attendance</h1><p>Mark attendance for today's classes and review your complete month subject-wise.</p></div><div class="date-nav"><button class="icon" data-date="-1">‹</button><input id="attDate" type="date" value="${date}"><button class="icon" data-date="1">›</button><button class="secondary" data-date="0">Today</button></div></div><div class="attendance-top"><div class="big-percent">${mpercent}%<small>${monthName} attendance</small></div><div><b>${mp}</b><span> Present</span></div><div><b>${ma}</b><span> Absent</span></div><div><b>${mheld}</b><span> Lectures counted</span></div><div><b>${monthRows.filter(x=>x.status==='cancelled').length}</b><span> Cancelled</span></div></div><div class="attendance-layout"><section class="panel"><div class="panel-head"><div><h2>${day}, ${d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</h2><p>○ Not Marked and — Cancelled do not affect the percentage.</p></div></div>${lectures.length?lectures.map(t=>{const a=get(t);const status=a?.status||'not_marked';return `<div class="attendance-row"><div class="att-time"><b>${esc(t.start)}</b><small>${esc(t.end)}</small></div><div class="att-info"><strong>${esc(t.subject)}</strong><span>${esc(t.faculty||'')} ${t.room?`· ${esc(t.room)}`:''}</span></div><div class="status-buttons"><button class="status ${status==='present'?'on present':''}" data-att="${t.id}:present" title="Present">👍</button><button class="status ${status==='absent'?'on absent':''}" data-att="${t.id}:absent" title="Absent">❌</button><button class="status ${status==='cancelled'?'on cancelled':''}" data-att="${t.id}:cancelled" title="Cancelled">—</button><button class="status ${status==='not_marked'?'on neutral':''}" data-att="${t.id}:not_marked" title="Not marked">○</button></div></div>`}).join(''):`<div class="empty"><strong>No class scheduled for ${day}.</strong><br>Add it from Timetable and it will appear here automatically.</div>`}</section><section class="panel month-panel"><div class="panel-head"><div><h2>Monthly subject-wise attendance</h2><p>${monthName} · Present ÷ (Present + Absent)</p></div></div>${ss.length?`<div class="table-wrap"><table class="attendance-table"><thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Held</th><th>Attendance</th></tr></thead><tbody>${ss.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${s.present}</td><td>${s.absent}</td><td>${s.held}</td><td><div class="table-progress"><span style="width:${s.percent}%"></span></div><strong>${s.percent}%</strong></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">Add subjects and timetable classes first.</div>`}</section></div>`}

function subjects(){return `<div class="page-head"><div><div class="eyebrow">CURRICULUM TRACKER</div><h1>Subjects & Chapters</h1><p>Chapter progress is calculated from completed topics.</p></div><button class="primary" data-modal="subject">+ Add subject</button></div><div class="subject-grid">${state.data.subjects.map(s=>{const ch=s.chapters||[],done=ch.filter(c=>c.completed).length,p=ch.length?Math.round(done/ch.length*100):0;const a=subjectStats().find(x=>x.id===s.id);return `<section class="panel"><div class="subject-card-head"><div><span class="subject-icon">📚</span><div><h2>${esc(s.name)}</h2><p>${esc(s.code||'')}</p></div></div><div class="card-actions"><button data-edit="subject:${s.id}">Edit</button><button data-del="subjects:${s.id}">Delete</button></div></div><div class="progress-label"><span>Learning progress</span><b>${p}%</b></div><div class="bar"><span style="width:${p}%"></span></div><div class="chapter-list">${ch.map(c=>`<label class="chapter ${c.completed?'done':''}"><button data-chapter="${s.id}:${c.id}">${c.completed?'✓':'○'}</button><span>${esc(c.name)}</span></label>`).join('')||'<div class="empty compact">No chapters yet</div>'}</div><button class="ghost full" data-chapter-add="${s.id}">+ Add chapter / topic</button></section>`}).join('')||'<div class="empty panel full-empty">No subjects yet. Add one or load the college timetable preset.</div>'}</div>`}
function tasks(){const arr=[...state.data.tasks].sort((a,b)=>(a.completed-b.completed)||(String(a.date).localeCompare(String(b.date))));return `<div class="page-head"><div><div class="eyebrow">PERSONAL PRODUCTIVITY</div><h1>Study Plan</h1><p>Plan, prioritize and complete your study work.</p></div><button class="primary" data-modal="task">+ Add task</button></div><div class="task-list panel">${arr.map(x=>`<div class="task-row ${x.completed?'completed':''}"><button class="check" data-complete="tasks:${x.id}">${x.completed?'✓':''}</button><div class="task-main"><strong>${esc(x.title)}</strong><span>${esc(x.subject||'General')} · ${esc(x.date||'No due date')}</span></div><span class="tag ${x.priority==='High'?'high':x.priority==='Medium'?'medium':''}">${esc(x.priority||'Normal')}</span><button class="card-btn" data-edit="task:${x.id}">Edit</button><button class="card-btn danger-text" data-del="tasks:${x.id}">Delete</button></div>`).join('')||'<div class="empty">No tasks yet.</div>'}</div>`}
function tests(){return `<div class="page-head"><div><div class="eyebrow">PERFORMANCE</div><h1>Tests</h1><p>Keep a record of your scores and see your academic trend.</p></div><button class="primary" data-modal="test">+ Add result</button></div><div class="test-grid">${state.data.tests.map(x=>`<section class="panel test-card"><span>${esc(x.subject||'General')}</span><h2>${esc(x.name)}</h2><div class="score">${esc(x.score)}<small> / ${esc(x.total||100)}</small></div><p>${esc(x.date||'')}</p><div class="card-actions"><button data-del="tests:${x.id}">Delete</button></div></section>`).join('')||'<div class="empty panel full-empty">No test results yet.</div>'}</div>`}
function focuslearn(){return `<div class="page-head"><div><div class="eyebrow">LEARN BETTER</div><h1>FocusLearn</h1><p>Search any subject and any topic on real YouTube results.</p></div></div><section class="search-hero panel"><div class="search-icon">▶</div><h2>What do you want to learn?</h2><form id="ytForm"><div class="search-fields"><input id="ytSubject" placeholder="Subject e.g. Data Structures"><input id="ytTopic" required placeholder="Topic e.g. Binary Search"><button class="primary">Search YouTube ↗</button></div></form><p class="muted">Enter any subject + topic. StudyConnect opens the real YouTube search in a new tab.</p></section>`}
function notifications(){const ns=state.data.notifications;return `<div class="page-head"><div><div class="eyebrow">UPDATES</div><h1>Notifications</h1><p>Important reminders and activity for your account.</p></div><button id="readAll" class="secondary">Mark all read</button></div><div class="notification-list panel">${ns.map(n=>`<article class="notification ${n.read?'read':''}"><span class="n-icon">${n.type==='warning'?'⚠️':n.type==='success'?'✓':'🔔'}</span><div><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${new Date(n.createdAt).toLocaleString()}</small>${n.read?'':`<button class="ghost" data-notif-read="${n.id}">Mark read</button>`}</div></article>`).join('')||'<div class="empty">No notifications yet.</div>'}</div>`}
function getPrefs(){try{return JSON.parse(localStorage.getItem('sc_prefs')||'{}')}catch(e){return {}}}
function bodiesSafe(t){return ['lecture','subject','task','test'].includes(t)}
function modal(type,item={}){document.querySelector('#modal')?.remove();if(!bodiesSafe(type))return msg('Unknown dialog.');const bodies={lecture:`<div class="form-grid"><label>Day<select name="day">${WEEK.map(d=>`<option ${item.day===d?'selected':''}>${d}</option>`).join('')}</select></label><label>Subject<input name="subject" value="${esc(item.subject)}" required placeholder="e.g. Mathematics"></label><label>Start<input name="start" type="time" value="${esc(item.start)}" required></label><label>End<input name="end" type="time" value="${esc(item.end)}" required></label><label>Faculty<input name="faculty" value="${esc(item.faculty)}"></label><label>Room<input name="room" value="${esc(item.room)}"></label><label>Type<select name="type"><option ${item.type==='Lecture'?'selected':''}>Lecture</option><option ${item.type==='Lab'?'selected':''}>Lab</option><option ${item.type==='Training'?'selected':''}>Training</option><option ${item.type==='Study'?'selected':''}>Self Study</option></select></label><label>Notes<input name="notes" value="${esc(item.notes)}" placeholder="Optional"></label></div>`,subject:`<div class="subject-modal-form"><div class="subject-modal-intro"><div class="subject-modal-icon">X</div><div><h3>Subject details</h3><p>Add the subject you want to track.</p></div></div><label class="modal-field"><span>Subject name *</span><input name="name" value="${esc(item.name)}" required placeholder="e.g. Data Structures"></label><label class="modal-field"><span>Code</span><input name="code" value="${esc(item.code)}" placeholder="e.g. DSA"></label><div class="subject-tip"><span>!</span><p>You can add chapters after creating the subject.</p></div></div>`, task:`<div class="form-grid"><label class="full">Task<input name="title" value="${esc(item.title)}" required></label><label>Subject<input name="subject" value="${esc(item.subject)}"></label><label>Due date<input name="date" type="date" value="${esc(item.date||today())}"></label><label>Priority<select name="priority"><option ${item.priority==='High'?'selected':''}>High</option><option ${item.priority==='Medium'?'selected':''}>Medium</option><option ${!item.priority||item.priority==='Normal'?'selected':''}>Normal</option></select></label></div>`,test:`<div class="form-grid"><label>Test name<input name="name" required value="${esc(item.name)}"></label><label>Subject<input name="subject" value="${esc(item.subject)}"></label><label>Score<input name="score" type="number" min="0" value="${esc(item.score)}" required></label><label>Total<input name="total" type="number" min="1" value="${esc(item.total||100)}" required></label><label>Date<input name="date" type="date" value="${esc(item.date||today())}"></label></div>`};const title={lecture:item.id?'Edit lecture':'Add lecture',subject:item.id?'Edit subject':'Add subject',task:item.id?'Edit task':'Add task',test:'Add test result'}[type];modalRoot().insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div class="modal-box"><div class="modal-head"><div><div class="eyebrow">STUDYCONNECT</div><h2>${title}</h2></div><button class="icon" data-close>×</button></div><form id="modalForm">${bodies[type]}<div class="actions"><button type="button" class="secondary" data-close>Cancel</button><button class="primary">Save</button></div></form></div></div>`);document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.querySelector('#modal')?.remove());const mf=document.querySelector('#modalForm');if(mf)mf.onsubmit=async e=>{e.preventDefault();const obj=Object.fromEntries(new FormData(e.target).entries());try{if(type==='lecture'&&!item.id){if(obj.start>=obj.end)throw Error('End time must be after start time.');const exists=state.data.timetable.some(x=>x.day===obj.day&&x.start===obj.start&&x.subject===obj.subject);if(exists)throw Error('This lecture already exists.')}if(type==='lecture'&&item.id&&obj.start>=obj.end)throw Error('End time must be after start time.');const route={lecture:'timetable',subject:'subjects',task:'tasks',test:'tests'}[type];if(item.id)await api(`/${route}/${item.id}`,{method:'PUT',body:JSON.stringify(obj)});else await api(`/${route}`,{method:'POST',body:JSON.stringify(obj)});document.querySelector('#modal')?.remove();await refresh();renderView();msg('Saved successfully.')}catch(err){msg(err.message)}};const mb=document.querySelector('#modal');if(mb){mb.addEventListener('click',e=>{if(e.target.id==='modal')mb.remove()});const f=mb.querySelector('input,select,textarea,button.primary');if(f)f.focus()}document.addEventListener('keydown',function escClose(e){if(e.key==='Escape'){document.querySelector('#modal')?.remove();document.removeEventListener('keydown',escClose)}})}
async function markAttendance(tid,status){const date=iso(state.date);let a=state.data.attendance.find(x=>x.timetableSessionId===tid&&x.date===date);const t=state.data.timetable.find(x=>x.id===tid);if(!a){await api('/attendance',{method:'POST',body:JSON.stringify({timetableSessionId:tid,subject:t.attendanceSubject||t.subject,subjectId:t.subjectId||findSubjectId(t.attendanceSubject||t.subject),date,start:t.start,end:t.end,status,type:t.type})})}else await api('/attendance/'+a.id,{method:'PUT',body:JSON.stringify({status})});await refresh();renderView()}
function safeParseId(v){const i=String(v||'').indexOf(':');return [v.slice(0,i),v.slice(i+1)]}
async function safePut(path,body){try{return await api(path,{method:'PUT',body:JSON.stringify(body)})}catch(e){msg(e.message||'Save failed.');throw e}}
function markAttendanceSafe(tid,status){markAttendance(tid,status).catch(e=>msg(e.message||'Could not save attendance.'))}
function findSubjectId(name){return state.data.subjects.find(s=>s.name===name)?.id||''}
async function bindView(){bindNavAndModals();bindCrud();document.querySelectorAll('[data-complete]').forEach(b=>b.onclick=async()=>{const [r,id]=b.dataset.complete.split(':');const item=state.data[r].find(x=>x.id===id);await api('/'+r+'/'+id,{method:'PUT',body:JSON.stringify({completed:!item.completed})});await refresh();renderView()});document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=async()=>{const [sid,cid]=b.dataset.chapter.split(':');const s=state.data.subjects.find(x=>x.id===sid);const chapters=(s.chapters||[]).map(c=>c.id===cid?{...c,completed:!c.completed}:c);await api('/subjects/'+sid,{method:'PUT',body:JSON.stringify({chapters})});await refresh();renderView()});document.querySelectorAll('[data-chapter-add]').forEach(b=>b.onclick=async()=>{const name=prompt('Chapter / topic name?');if(!name)return;const s=state.data.subjects.find(x=>x.id===b.dataset.chapterAdd);await api('/subjects/'+s.id,{method:'PUT',body:JSON.stringify({chapters:[...(s.chapters||[]),{id:uid(),name,completed:false}]})});await refresh();renderView()});document.querySelectorAll('[data-att]').forEach(b=>b.onclick=()=>{const [tid,status]=b.dataset.att.split(':');markAttendanceSafe(tid,status)});document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.date);if(n===0)state.date=new Date();else state.date=new Date(state.date.getTime()+n*86400000);renderView()});const dateInput=$('#attDate');if(dateInput)dateInput.onchange=()=>{state.date=new Date(dateInput.value+'T12:00:00');renderView()};const pf=$('#profileForm');if(pf)pf.onsubmit=async e=>{e.preventDefault();const fd=new FormData(pf),p=Object.fromEntries(fd.entries());p.weakSubjects=p.weakSubjects.split(',').map(x=>x.trim()).filter(Boolean);p.strongSubjects=p.strongSubjects.split(',').map(x=>x.trim()).filter(Boolean);const file=$('#photo').files[0];if(file){if(file.size>2*1024*1024)return msg('Photo must be under 2 MB');p.photo=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(file)})}else p.photo=state.user.profile.photo||'';await api('/profile',{method:'PUT',body:JSON.stringify(p)});state.user.profile={...state.user.profile,...p};renderView();msg('Profile updated')};const yf=$('#ytForm');if(yf)yf.onsubmit=e=>{e.preventDefault();const subject=$('#ytSubject').value.trim(),topic=$('#ytTopic').value.trim();const q=encodeURIComponent(`${subject} ${topic} tutorial lecture`.trim());window.open('https://www.youtube.com/results?search_query='+q,'_blank','noopener')};if($('#readAll'))$('#readAll').onclick=async()=>{await api('/notifications/read-all',{method:'POST'});await refresh();renderView()}}
function dashboardPro(){const a=attendanceStats(),ss=subjectStats();const tasks=state.data.tasks||[];const done=tasks.filter(x=>x.completed).length;const day=new Date().toLocaleDateString('en-US',{weekday:'long'});const lectures=(state.data.timetable||[]).filter(x=>x.day===day).sort((x,y)=>String(x.start).localeCompare(String(y.start)));const todaysTasks=tasks.filter(x=>x.date===today());const upcomingTests=[...(state.data.tests||[])].sort((x,y)=>String(x.date||'').localeCompare(String(y.date||''))).slice(0,3);const notifs=(state.data.notifications||[]).slice(0,3);const prefs=getPrefs();const hr=new Date().getHours();const greet=hr<12?'morning':hr<18?'afternoon':'evening';const avgProg=ss.length?Math.round(ss.reduce((x,s)=>x+(s.progress||0),0)/ss.length):0;return `<section class="welcome-card"><div><div class="eyebrow">YOUR ACADEMIC OVERVIEW</div><h1>Good ${greet}, ${esc(state.user?.profile?.fullName||'Student')}</h1><p>${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} • ${lectures.length} ${lectures.length===1?'class':'classes'} today • ${todaysTasks.filter(x=>x.completed).length}/${todaysTasks.length} tasks done</p>${prefs.remind?'<p class="muted">Reminder: review today\'s tasks and mark attendance.</p>':''}</div><div class="welcome-actions"><button class="primary" data-view="timetable">Today's timetable</button><button class="secondary" data-view="timer">Open timer</button></div></section><div class="mini-grid"><div class="mini-card"><span>Overall attendance</span><b>${a.percent}%</b><small>${a.present} present • ${a.absent} absent</small></div><div class="mini-card"><span>Today's tasks</span><b>${todaysTasks.filter(x=>x.completed).length}/${todaysTasks.length}</b><small>${done} completed overall</small></div><div class="mini-card"><span>Study progress</span><b>${avgProg}%</b><small>From completed chapters</small></div><div class="mini-card"><span>Active subjects</span><b>${ss.length}</b><small>Tracked separately</small></div></div><div class="dash-2col"><section class="card card-pad"><div class="card-head"><div><h2>Today's classes</h2><p>From your weekly timetable</p></div><button class="ghost" data-view="timetable">Manage</button></div>${lectures.length?lectures.map(x=>`<div class="class-row"><span class="time-chip">${esc(x.start)}–${esc(x.end)}</span><div style="flex:1;min-width:0"><strong>${esc(x.subject)}</strong><br><small class="muted">${esc(x.faculty||'Faculty not set')} • ${esc(x.room||'Room not set')}</small></div></div>`).join(''):emptyState('📅','No classes today','Add your timetable to see today\'s schedule.','<button class="primary" data-view="timetable">Add timetable</button>')}</section><section class="card card-pad"><div class="card-head"><div><h2>Today's tasks</h2><p>Due today</p></div><button class="ghost" data-view="tasks">Plan</button></div>${todaysTasks.length?todaysTasks.slice(0,4).map(x=>`<div class="task-mini"><span class="${x.completed?'dot-ok':'dot-bad'}"></span><div style="flex:1;min-width:0"><strong>${esc(x.title)}</strong><br><small class="muted">${esc(x.subject||'General')}</small></div><span class="pill">${esc(x.priority||'Normal')}</span></div>`).join(''):emptyState('☑','No tasks for today','Add a study task to stay on track.','<button class="primary" data-modal="task">Add task</button>')}</section></div><div class="dash-2col"><section class="card card-pad"><div class="card-head"><div><h2>Study progress</h2><p>By subject chapters</p></div><button class="ghost" data-view="subjects">Subjects</button></div>${ss.length?ss.slice(0,4).map(s=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px"><strong>${esc(s.name)}</strong><span>${s.progress}%</span></div><div class="meter"><i style="width:${s.progress}%"></i></div></div>`).join(''):emptyState('📚','No subjects yet','Add your first subject to start tracking.','<button class="primary" data-modal="subject">Add subject</button>')}</section><section class="card card-pad"><div class="card-head"><div><h2>Focus timer</h2><p>${esc(timer.label)} • ${Math.round(timer.total/60)} min</p></div><button class="ghost" data-view="timer">Open</button></div><div class="timer-digits" style="font-size:40px">${fmtClock(timer.left)}</div><p class="muted">${timer.running?'Running — keeps going while you navigate.':'Paused — resume from Study Timer.'}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" data-view="timer">Open timer</button><button class="secondary" data-view="clock">Clock</button></div></section></div><div class="dash-2col"><section class="card card-pad"><div class="card-head"><div><h2>Upcoming tests</h2><p>Next assessments</p></div><button class="ghost" data-view="tests">Tests</button></div>${upcomingTests.length?upcomingTests.map(x=>`<div class="test-mini"><div style="flex:1;min-width:0"><strong>${esc(x.name)}</strong><br><small class="muted">${esc(x.subject||'General')} • ${esc(x.date||'')}</small></div><span class="pill info">${esc(x.score??'-')}/${esc(x.total||100)}</span></div>`).join(''):emptyState('📝','No tests yet','Record a test to track performance.','<button class="primary" data-modal="test">Add test</button>')}</section><section class="card card-pad"><div class="card-head"><div><h2>Notifications</h2><p>Latest updates</p></div><button class="ghost" data-view="notifications">View all</button></div>${notifs.length?notifs.map(n=>`<div class="test-mini"><span class="notif-ico">${n.type==='warning'?'⚠':n.type==='success'?'✓':'🔔'}</span><div style="flex:1;min-width:0"><strong>${esc(n.title)}</strong><br><small class="muted">${esc(n.message||'').slice(0,80)}</small></div>${n.read?'':'<span class="pill bad">New</span>'}</div>`).join(''):emptyState('🔔','All caught up','Important reminders will appear here.','')}</section></div>`}
function bindNavAndModals(){document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));document.querySelectorAll('[data-modal]').forEach(b=>b.onclick=()=>modal(b.dataset.modal));document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const v=b.dataset.edit;const i=v.indexOf(':');const type=v.slice(0,i),id=v.slice(i+1);const route={lecture:'timetable',subject:'subjects',task:'tasks'}[type];const item=(state.data[route]||[]).find(x=>String(x.id)===String(id));if(item)modal(type,item);else msg('Item not found.')});document.querySelectorAll('[data-timer]').forEach(b=>b.onclick=()=>{const a=b.dataset.timer;if(a==='start')timerStart();if(a==='pause')timerPause();if(a==='resume')timerResume();if(a==='reset')timerReset();if(a==='stop')timerStop()});document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>timerPreset(Number(b.dataset.preset)));const ct=document.querySelector('#customTimer');if(ct)ct.onsubmit=e=>{e.preventDefault();timerCustom(document.querySelector('#customMin').value)};document.querySelectorAll('[data-theme-pick]').forEach(b=>b.onclick=()=>{setTheme(b.dataset.themePick);msg('Theme: '+b.dataset.themePick)});document.querySelectorAll('[data-accent-pick]').forEach(b=>b.onclick=()=>{setAccent(b.dataset.accentPick);msg('Accent updated.')});document.querySelectorAll('[data-default-min]').forEach(b=>b.onclick=()=>{const p=getPrefs();p.defaultMin=Number(b.dataset.defaultMin);localStorage.setItem('sc_prefs',JSON.stringify(p));timerPreset(p.defaultMin);msg('Default focus: '+p.defaultMin+' min')});document.querySelectorAll('[data-remind]').forEach(b=>b.onclick=()=>{const p=getPrefs();p.remind=b.dataset.remind==='on';localStorage.setItem('sc_prefs',JSON.stringify(p));renderView()});document.querySelectorAll('[data-density]').forEach(b=>b.onclick=()=>{const p=getPrefs();p.density=b.dataset.density;localStorage.setItem('sc_prefs',JSON.stringify(p));document.body.classList.toggle('compact',p.density==='compact');renderView()});const sl=document.querySelector('#settingsLogout');if(sl)sl.onclick=()=>{localStorage.removeItem('sc_token');authPage('login')};if(state.view==='clock')startClockView();document.querySelectorAll('[data-yt]').forEach(b=>b.onclick=()=>{const[sub,top]=(b.dataset.yt||'|').split('|');const q=encodeURIComponent(`${sub} ${top} tutorial`.trim());window.open('https://www.youtube.com/results?search_query='+q,'_blank','noopener')});const cf=document.querySelector('#clockThemeSel');if(cf)cf.onchange=()=>setTheme(cf.value)}
function bindCrud(){document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this item?'))return;const v=b.dataset.del;const i=v.indexOf(':');const r=v.slice(0,i),id=v.slice(i+1);try{await api('/'+r+'/'+id,{method:'DELETE'});await refresh();renderView();msg('Deleted.')}catch(e){msg(e.message)}});document.querySelectorAll('[data-notif-read]').forEach(b=>b.onclick=async()=>{try{await api('/notifications/'+b.dataset.notifRead+'/read',{method:'PUT'});await refresh();renderView()}catch(e){msg(e.message)}});}
function $(s){return document.querySelector(s)}
document.body.classList.toggle('compact',getPrefs().density==='compact');if(localStorage.getItem('sc_token'))loadApp();else authPage('login');
