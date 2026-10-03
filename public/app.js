/* ============================================================
   StudyConnect — Complete Frontend Application
   ============================================================ */

'use strict';

// ─── State ────────────────────────────────────────────────────
const SC = {
  token: null,
  user: null,
  profile: null,
  subjects: [],
  timetable: [],
  attendance: [],
  tasks: [],
  tests: [],
  notifications: [],
  currentPage: 'dashboard',
  // Timer state (persists across page navigation)
  timer: {
    interval: null,
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    running: false,
    paused: false,
    sessionCount: 0,
    selectedPreset: 25
  },
  // Confirm callback
  _confirmCallback: null
};

// ─── API Helper ───────────────────────────────────────────────
// MongoDB returns _id; normalize every response so the frontend can use .id
// uniformly. Applied recursively so embedded arrays (e.g. chapters) also work.
function normalizeIds(obj) {
  if (Array.isArray(obj)) return obj.map(normalizeIds);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      out[k] = normalizeIds(obj[k]);
    }
    // Copy _id → id (keep _id too so server round-trips still work)
    if (out._id !== undefined && out.id === undefined) {
      out.id = String(out._id);
    }
    return out;
  }
  return obj;
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (SC.token) opts.headers['Authorization'] = `Bearer ${SC.token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return normalizeIds(data);
}

// ─── Toast ────────────────────────────────────────────────────
function toast(message, type = 'info') {
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  const container = document.getElementById('toast-container');
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ─── Confirm Dialog ───────────────────────────────────────────
function confirmDialog(title, message, onConfirm, btnText = 'Delete') {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok-btn').textContent = btnText;
  SC._confirmCallback = onConfirm;
  document.getElementById('confirm-overlay').classList.add('open');
}
function confirmOk() {
  document.getElementById('confirm-overlay').classList.remove('open');
  if (SC._confirmCallback) SC._confirmCallback();
  SC._confirmCallback = null;
}
function confirmCancel() {
  document.getElementById('confirm-overlay').classList.remove('open');
  SC._confirmCallback = null;
}

// ─── Modal helpers ────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ─── Theme & Accent ───────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
  // Update active button
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  const activeThemeBtn = document.querySelector(`.theme-btn[onclick="setTheme('${theme}')"]`);
  if (activeThemeBtn) activeThemeBtn.classList.add('active');
}
function setTheme(theme) {
  localStorage.setItem('sc_theme', theme);
  applyTheme(theme);
}
function applyAccent(accent) {
  document.documentElement.setAttribute('data-accent', accent === 'purple' ? '' : accent);
  document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.accent-btn[onclick="setAccent('${accent}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
}
function setAccent(accent) {
  localStorage.setItem('sc_accent', accent);
  applyAccent(accent);
}
function loadSettings() {
  const theme = localStorage.getItem('sc_theme') || 'light';
  const accent = localStorage.getItem('sc_accent') || 'purple';
  applyTheme(theme);
  applyAccent(accent);
}

// ─── Auth ─────────────────────────────────────────────────────
function showSignin() {
  document.getElementById('signup-page').classList.add('hidden');
  document.getElementById('signin-page').classList.remove('hidden');
}
function showSignup() {
  document.getElementById('signin-page').classList.add('hidden');
  document.getElementById('signup-page').classList.remove('hidden');
}

document.getElementById('signin-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('signin-btn');
  const errEl = document.getElementById('signin-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  try {
    const data = await api('POST', '/api/auth/signin', {
      email: document.getElementById('signin-email').value.trim(),
      password: document.getElementById('signin-password').value
    });
    await loginSuccess(data);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

document.getElementById('signup-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  try {
    const data = await api('POST', '/api/auth/signup', {
      fullName: document.getElementById('signup-name').value.trim(),
      email: document.getElementById('signup-email').value.trim(),
      password: document.getElementById('signup-password').value,
      confirmPassword: document.getElementById('signup-confirm').value
    });
    await loginSuccess(data);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

async function loginSuccess(data) {
  SC.token = data.token;
  SC.user = data.user;
  localStorage.setItem('sc_token', data.token);
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  await initApp();
}

function logout() {
  confirmDialog('Log out', 'Are you sure you want to log out?', () => {
    SC.token = null;
    SC.user = null;
    SC.profile = null;
    localStorage.removeItem('sc_token');
    timerStop();
    document.getElementById('app').classList.remove('visible');
    document.getElementById('auth-screen').style.display = '';
    showSignin();
    toast('Logged out successfully', 'info');
  }, 'Log out');
}

// ─── Navigation ───────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Dashboard', profile: 'My Profile', subjects: 'Subjects',
  timetable: 'Timetable', attendance: 'Attendance', studyplan: 'Study Plan',
  tests: 'Tests & Exams', focuslearn: 'FocusLearn', notifications: 'Notifications',
  timer: 'Study Timer', clock: 'Clock', settings: 'Settings'
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  SC.currentPage = page;
  document.getElementById('header-title').textContent = PAGE_TITLES[page] || page;

  closeSidebar();

  // Page-specific load
  const loaders = {
    dashboard: loadDashboard,
    profile: loadProfile,
    subjects: loadSubjects,
    timetable: loadTimetable,
    attendance: loadAttendance,
    studyplan: loadStudyPlan,
    tests: loadTests,
    notifications: loadNotifications,
    clock: startClock
  };
  if (loaders[page]) loaders[page]();
}

// ─── Sidebar ──────────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ─── App Init ─────────────────────────────────────────────────
async function initApp() {
  await Promise.all([
    loadProfileData(),
    loadAllData()
  ]);
  updateHeaderAvatar();
  updateSidebarUser();
  updateNotifBadge();
  navigate('dashboard');
  startClockMini();
}

async function loadAllData() {
  try {
    const [subjects, timetable, attendance, tasks, tests, notifications] = await Promise.all([
      api('GET', '/api/subjects'),
      api('GET', '/api/timetable'),
      api('GET', '/api/attendance'),
      api('GET', '/api/tasks'),
      api('GET', '/api/tests'),
      api('GET', '/api/notifications')
    ]);
    SC.subjects = subjects;
    SC.timetable = timetable;
    SC.attendance = attendance;
    SC.tasks = tasks;
    SC.tests = tests;
    SC.notifications = notifications;
  } catch (err) {
    console.error('Data load error:', err);
  }
}

async function loadProfileData() {
  try {
    SC.profile = await api('GET', '/api/profile');
  } catch {}
}

// ─── Avatar Helpers ───────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0].toUpperCase();
}

function updateHeaderAvatar() {
  const name = SC.profile?.fullName || SC.user?.fullName || '';
  const photo = SC.profile?.photo || '';
  const el = document.getElementById('header-avatar');
  const initEl = document.getElementById('header-avatar-initials');
  if (photo) {
    el.innerHTML = `<img src="${photo}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:50%;" />`;
  } else {
    el.innerHTML = `<span class="header-avatar-initials">${getInitials(name)}</span>`;
  }
}

function updateSidebarUser() {
  const name = SC.profile?.fullName || SC.user?.fullName || '';
  document.getElementById('sidebar-user-name').textContent = name;
  const photo = SC.profile?.photo || '';
  const avatarEl = document.getElementById('sidebar-avatar');
  const initialsEl = document.getElementById('sidebar-avatar-initials');
  if (photo) {
    avatarEl.innerHTML = `<img src="${photo}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:50%;" />`;
  } else {
    initialsEl.textContent = getInitials(name);
  }
}

function updateNotifBadge() {
  const unread = SC.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('sidebar-notif-badge');
  const dot = document.getElementById('header-notif-dot');
  if (unread > 0) {
    badge.textContent = unread;
    badge.classList.remove('hidden');
    dot.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    dot.classList.add('hidden');
  }
}

// ─── Dashboard ────────────────────────────────────────────────
function loadDashboard() {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const today = days[now.getDay()];

  // Welcome
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = SC.profile?.fullName || SC.user?.fullName || '';
  document.getElementById('welcome-msg').textContent = `${greeting}, ${name.split(' ')[0] || 'there'}! 👋`;
  document.getElementById('welcome-sub').textContent = `Here's your academic overview for ${today}.`;
  document.getElementById('welcome-date').textContent =
    `${today}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  document.getElementById('today-day-label').textContent = today;

  // Stats
  const totalSubjects = SC.subjects.length;
  const attRecords = SC.attendance.filter(a => ['present','absent'].includes(a.status));
  const overallAtt = attRecords.length
    ? Math.round(SC.attendance.filter(a => a.status === 'present').length / attRecords.length * 100) : 0;
  const pendingTasks = SC.tasks.filter(t => t.status !== 'completed').length;
  const completedTasks = SC.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = SC.tasks.length;

  document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--accent-light);color:var(--accent);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>
      <div><div class="stat-value">${totalSubjects}</div><div class="stat-label">Active Subjects</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#dcfce7;color:var(--green);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </div>
      <div><div class="stat-value">${overallAtt}%</div><div class="stat-label">Overall Attendance</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fef9c3;color:var(--yellow);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </div>
      <div><div class="stat-value">${pendingTasks}</div><div class="stat-label">Pending Tasks</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#dbeafe;color:var(--blue);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div><div class="stat-value">${SC.tests.filter(t => new Date(t.date) >= now).length}</div><div class="stat-label">Upcoming Tests</div></div>
    </div>
  `;

  // Today's Classes
  const todayClasses = SC.timetable.filter(t => t.day === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todayClassesEl = document.getElementById('today-classes');
  if (todayClasses.length === 0) {
    todayClassesEl.innerHTML = `<div class="empty-state" style="padding:32px 16px;">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="28" height="28"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <h3>No classes today</h3>
      <p>No ${today} classes in your timetable.</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('timetable')">Set up timetable</button>
    </div>`;
  } else {
    todayClassesEl.innerHTML = `<div class="today-classes-list">` +
      todayClasses.map(c => `
        <div class="class-item">
          <div class="class-time">${formatTime(c.startTime)} – ${formatTime(c.endTime)}</div>
          <div class="class-info">
            <div class="class-name">${c.subject}</div>
            <div class="class-meta">${[c.room, c.faculty].filter(Boolean).join(' · ') || 'No details'}</div>
          </div>
        </div>`).join('') + `</div>`;
  }

  // Pending Tasks (up to 5)
  const pendingList = SC.tasks.filter(t => t.status !== 'completed')
    .sort((a, b) => {
      const pd = { high: 0, medium: 1, low: 2 };
      return (pd[a.priority] || 1) - (pd[b.priority] || 1);
    }).slice(0, 5);
  const dashTasksEl = document.getElementById('dashboard-tasks');
  if (pendingList.length === 0) {
    dashTasksEl.innerHTML = `<div class="empty-state" style="padding:32px 16px;">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="28" height="28"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
      <h3>All caught up!</h3>
      <p>No pending tasks.</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('studyplan')">Add a task</button>
    </div>`;
  } else {
    dashTasksEl.innerHTML = pendingList.map(t => `
      <div class="task-item">
        <div class="task-content">
          <div class="task-title">${escHtml(t.title)}</div>
          <div class="task-meta">
            ${t.subject ? `<span>${escHtml(t.subject)}</span>` : ''}
            ${t.dueDate ? `<span>Due ${formatDate(t.dueDate)}</span>` : ''}
            <span class="badge badge-${priorityColor(t.priority)}">${t.priority}</span>
          </div>
        </div>
      </div>`).join('');
  }

  // Upcoming Tests (up to 5)
  const upcomingTests = SC.tests
    .filter(t => new Date(t.date) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);
  const dashTestsEl = document.getElementById('dashboard-tests');
  if (upcomingTests.length === 0) {
    dashTestsEl.innerHTML = `<div class="empty-state" style="padding:32px 16px;">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="28" height="28"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <h3>No upcoming tests</h3>
      <button class="btn btn-primary btn-sm" onclick="navigate('tests')">Add a test</button>
    </div>`;
  } else {
    dashTestsEl.innerHTML = upcomingTests.map(t => `
      <div class="class-item">
        <div class="class-time" style="min-width:90px;font-size:0.78rem;">${formatDate(t.date)}</div>
        <div class="class-info">
          <div class="class-name">${escHtml(t.name)}</div>
          <div class="class-meta">${escHtml(t.subject)}</div>
        </div>
      </div>`).join('');
  }

  // Attendance Overview
  const attOverviewEl = document.getElementById('dashboard-attendance');
  if (SC.attendance.length === 0) {
    attOverviewEl.innerHTML = `<div class="empty-state" style="padding:24px 16px;">
      <p>No attendance data yet.</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('attendance')">Mark attendance</button>
    </div>`;
  } else {
    // Subject-wise summary
    const bySubject = {};
    SC.attendance.forEach(a => {
      if (!bySubject[a.subject]) bySubject[a.subject] = { present: 0, absent: 0 };
      if (a.status === 'present') bySubject[a.subject].present++;
      else if (a.status === 'absent') bySubject[a.subject].absent++;
    });
    const rows = Object.entries(bySubject).slice(0, 4).map(([subj, data]) => {
      const total = data.present + data.absent;
      const pct = total ? Math.round(data.present / total * 100) : 0;
      const cls = pct >= 75 ? 'good' : pct >= 60 ? 'warn' : 'bad';
      return `<div class="attendance-row" style="padding:10px 12px;">
        <div class="att-subject-name" style="font-size:0.825rem;">${escHtml(subj)}</div>
        <div class="att-percent ${cls}">${pct}%</div>
      </div>`;
    });
    attOverviewEl.innerHTML = rows.join('');
  }
}

// ─── Profile ──────────────────────────────────────────────────
function loadProfile() {
  if (!SC.profile) return;
  const p = SC.profile;
  document.getElementById('pf-name').value = p.fullName || '';
  document.getElementById('pf-email').value = p.email || SC.user?.email || '';
  document.getElementById('pf-college').value = p.college || '';
  document.getElementById('pf-university').value = p.university || '';
  document.getElementById('pf-branch').value = p.branch || '';
  document.getElementById('pf-year').value = p.year || '';
  document.getElementById('pf-section').value = p.section || '';
  document.getElementById('pf-roll').value = p.rollNumber || '';
  document.getElementById('pf-phone').value = p.phone || '';
  document.getElementById('pf-bio').value = p.bio || '';
  document.getElementById('pf-strong').value = p.strongSubjects || '';
  document.getElementById('pf-weak').value = p.weakSubjects || '';

  document.getElementById('profile-display-name').textContent = p.fullName || '—';
  document.getElementById('profile-display-email').textContent = p.email || '—';
  document.getElementById('profile-display-college').textContent =
    [p.college, p.branch, p.year].filter(Boolean).join(' · ') || 'Complete your profile';

  // Avatar
  const avatarEl = document.getElementById('profile-avatar-display');
  const initEl = document.getElementById('profile-avatar-initials');
  if (p.photo) {
    avatarEl.innerHTML = `<img src="${p.photo}" alt="Profile" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:50%;" />`;
  } else {
    avatarEl.innerHTML = `<span class="profile-avatar-initials">${getInitials(p.fullName)}</span>`;
  }
}

function handleProfilePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result;
    // Preview
    document.getElementById('profile-avatar-display').innerHTML =
      `<img src="${base64}" alt="Preview" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:50%;" />`;
    document.getElementById('profile-photo-preview-text').textContent = 'Preview (save to apply)';
    // Store base64 for save
    input._pendingBase64 = base64;
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  const photoInput = document.getElementById('profile-photo-input');
  // Upload photo first if pending
  if (photoInput._pendingBase64) {
    try {
      const result = await api('POST', '/api/profile/photo-base64', { photo: photoInput._pendingBase64 });
      if (SC.profile) SC.profile.photo = result.photo;
      photoInput._pendingBase64 = null;
      document.getElementById('profile-photo-preview-text').textContent = '';
    } catch (err) {
      toast('Photo upload failed: ' + err.message, 'error');
    }
  }

  const body = {
    fullName: document.getElementById('pf-name').value.trim(),
    college: document.getElementById('pf-college').value.trim(),
    university: document.getElementById('pf-university').value.trim(),
    branch: document.getElementById('pf-branch').value.trim(),
    year: document.getElementById('pf-year').value,
    section: document.getElementById('pf-section').value.trim(),
    rollNumber: document.getElementById('pf-roll').value.trim(),
    phone: document.getElementById('pf-phone').value.trim(),
    bio: document.getElementById('pf-bio').value.trim(),
    strongSubjects: document.getElementById('pf-strong').value.trim(),
    weakSubjects: document.getElementById('pf-weak').value.trim()
  };
  try {
    SC.profile = await api('PUT', '/api/profile', body);
    updateHeaderAvatar();
    updateSidebarUser();
    loadProfile();
    toast('Profile saved successfully', 'success');
  } catch (err) {
    toast('Save failed: ' + err.message, 'error');
  }
}

// ─── Subjects ─────────────────────────────────────────────────
const SUBJECT_COLORS = [
  '#6366f1','#3b82f6','#22c55e','#f97316','#ec4899','#14b8a6',
  '#a855f7','#eab308','#ef4444','#06b6d4','#84cc16','#f43f5e'
];

function loadSubjects() {
  renderSubjects();
}
function renderSubjects() {
  const el = document.getElementById('subjects-list');
  if (SC.subjects.length === 0) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="28" height="28"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
      <h3>No subjects yet</h3>
      <p>Add your first subject to start tracking chapters and progress.</p>
      <button class="btn btn-primary" onclick="openSubjectModal()">Add your first subject</button>
    </div>`;
    return;
  }
  el.innerHTML = SC.subjects.map(s => {
    const chapters = s.chapters || [];
    const completed = chapters.filter(c => c.completed).length;
    const pct = chapters.length ? Math.round(completed / chapters.length * 100) : 0;
    return `<div class="subject-card">
      <div class="subject-header">
        <div class="subject-color-dot" style="background:${s.color || '#6366f1'};"></div>
        <div class="subject-name">${escHtml(s.name)}</div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="openSubjectModal('${s.id}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="deleteSubject('${s.id}')" title="Delete" style="color:var(--red);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      ${s.code ? `<div class="subject-code">${escHtml(s.code)}</div>` : ''}
      ${chapters.length === 0
        ? `<div class="text-sm text-muted mb-3" style="padding:8px 0;">No chapters added yet.</div>`
        : `<ul class="chapter-list">${chapters.map(ch => `
          <li class="chapter-item">
            <div class="chapter-checkbox ${ch.completed ? 'checked' : ''}" onclick="toggleChapter('${s.id}','${ch.id}')"></div>
            <span class="chapter-text ${ch.completed ? 'done' : ''}">${escHtml(ch.title)}</span>
            <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="openChapterModal('${s.id}','${ch.id}')" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="deleteChapter('${s.id}','${ch.id}')" title="Delete" style="color:var(--red);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </li>`).join('')}</ul>`
      }
      <div class="subject-footer">
        <div class="completion-text">${completed}/${chapters.length} chapters</div>
        <div style="display:flex;align-items:center;gap:10px;flex:1;margin-left:12px;">
          <div class="progress-bar-wrap" style="flex:1;"><div class="progress-bar" style="width:${pct}%;background:${s.color||'var(--accent)'};"></div></div>
          <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);min-width:36px;text-align:right;">${pct}%</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm w-full mt-2" onclick="openChapterModal('${s.id}')">+ Add Chapter</button>
    </div>`;
  }).join('');
}

function openSubjectModal(editId) {
  document.getElementById('subject-edit-id').value = editId || '';
  if (editId) {
    const s = SC.subjects.find(x => x.id === editId);
    if (!s) return;
    document.getElementById('subject-modal-title').textContent = 'Edit Subject';
    document.getElementById('subject-name').value = s.name;
    document.getElementById('subject-code').value = s.code || '';
    document.getElementById('subject-color').value = s.color || '#6366f1';
  } else {
    document.getElementById('subject-modal-title').textContent = 'Add Subject';
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-code').value = '';
    document.getElementById('subject-color').value = '#6366f1';
  }
  // Build color picker
  const selectedColor = document.getElementById('subject-color').value;
  document.getElementById('subject-color-picker').innerHTML = SUBJECT_COLORS.map(c =>
    `<div class="color-swatch ${c === selectedColor ? 'selected' : ''}" style="background:${c};"
      onclick="selectSubjectColor('${c}')"></div>`
  ).join('');
  openModal('subject-modal');
}

function selectSubjectColor(color) {
  document.getElementById('subject-color').value = color;
  document.querySelectorAll('#subject-color-picker .color-swatch').forEach(s => {
    s.classList.toggle('selected', s.style.background === color || s.style.backgroundColor === color);
  });
}

async function saveSubject() {
  const name = document.getElementById('subject-name').value.trim();
  const code = document.getElementById('subject-code').value.trim();
  const color = document.getElementById('subject-color').value;
  const editId = document.getElementById('subject-edit-id').value;
  if (!name) { toast('Subject name is required', 'error'); return; }
  try {
    if (editId) {
      const updated = await api('PUT', `/api/subjects/${editId}`, { name, code, color });
      SC.subjects = SC.subjects.map(s => s.id === editId ? updated : s);
      toast('Subject updated', 'success');
    } else {
      const s = await api('POST', '/api/subjects', { name, code, color });
      SC.subjects.push(s);
      toast('Subject added', 'success');
    }
    closeModal('subject-modal');
    renderSubjects();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteSubject(id) {
  confirmDialog('Delete Subject', 'This will also remove the subject from timetable references. Continue?', async () => {
    try {
      await api('DELETE', `/api/subjects/${id}`);
      SC.subjects = SC.subjects.filter(s => s.id !== id);
      toast('Subject deleted', 'success');
      renderSubjects();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function openChapterModal(subjectId, editChapterId) {
  document.getElementById('chapter-subject-id').value = subjectId;
  document.getElementById('chapter-edit-id').value = editChapterId || '';
  if (editChapterId) {
    const s = SC.subjects.find(x => x.id === subjectId);
    const ch = s?.chapters?.find(c => c.id === editChapterId);
    document.getElementById('chapter-modal-title').textContent = 'Edit Chapter';
    document.getElementById('chapter-title').value = ch?.title || '';
  } else {
    document.getElementById('chapter-modal-title').textContent = 'Add Chapter';
    document.getElementById('chapter-title').value = '';
  }
  openModal('chapter-modal');
}

async function saveChapter() {
  const title = document.getElementById('chapter-title').value.trim();
  const subjectId = document.getElementById('chapter-subject-id').value;
  const editId = document.getElementById('chapter-edit-id').value;
  if (!title) { toast('Chapter title is required', 'error'); return; }
  try {
    if (editId) {
      const updated = await api('PUT', `/api/subjects/${subjectId}/chapters/${editId}`, { title });
      SC.subjects = SC.subjects.map(s => s.id === subjectId ? updated : s);
      toast('Chapter updated', 'success');
    } else {
      const updated = await api('POST', `/api/subjects/${subjectId}/chapters`, { title });
      SC.subjects = SC.subjects.map(s => s.id === subjectId ? updated : s);
      toast('Chapter added', 'success');
    }
    closeModal('chapter-modal');
    renderSubjects();
  } catch (err) { toast(err.message, 'error'); }
}

async function toggleChapter(subjectId, chapterId) {
  const s = SC.subjects.find(x => x.id === subjectId);
  const ch = s?.chapters?.find(c => c.id === chapterId);
  if (!ch) return;
  try {
    const updated = await api('PUT', `/api/subjects/${subjectId}/chapters/${chapterId}`, { completed: !ch.completed });
    SC.subjects = SC.subjects.map(sub => sub.id === subjectId ? updated : sub);
    renderSubjects();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteChapter(subjectId, chapterId) {
  try {
    const updated = await api('DELETE', `/api/subjects/${subjectId}/chapters/${chapterId}`);
    SC.subjects = SC.subjects.map(s => s.id === subjectId ? updated : s);
    toast('Chapter deleted', 'success');
    renderSubjects();
  } catch (err) { toast(err.message, 'error'); }
}

// ─── Timetable ────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let currentTTDay = DAYS[0];

function loadTimetable() {
  const now = new Date();
  const todayIdx = now.getDay();
  const mappedDay = todayIdx === 0 ? 'Sunday' : DAYS[todayIdx - 1];
  currentTTDay = DAYS.includes(mappedDay) ? mappedDay : 'Monday';
  renderDayTabs();
  renderTimetableSlots();
}

function renderDayTabs() {
  document.getElementById('day-tabs').innerHTML = DAYS.map(d =>
    `<button class="day-tab ${d === currentTTDay ? 'active' : ''}" onclick="selectDay('${d}')">${d}</button>`
  ).join('');
}
function selectDay(day) {
  currentTTDay = day;
  renderDayTabs();
  renderTimetableSlots();
}
function renderTimetableSlots() {
  const entries = SC.timetable.filter(t => t.day === currentTTDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const el = document.getElementById('timetable-list');
  if (entries.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="28" height="28"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <h3>No classes on ${currentTTDay}</h3>
      <p>Add your ${currentTTDay} classes to keep track of your schedule.</p>
      <button class="btn btn-primary" onclick="openTimetableModal()">Add a class</button>
    </div>`;
    return;
  }
  el.innerHTML = entries.map(e => `
    <div class="timetable-slot" style="border-left-color:${subjectColor(e.subject)};">
      <div class="slot-time">${formatTime(e.startTime)} – ${formatTime(e.endTime)}</div>
      <div class="slot-info">
        <div class="slot-subject">${escHtml(e.subject)}</div>
        <div class="slot-details">${[e.room, e.faculty].filter(Boolean).join(' · ') || 'No details'}</div>
      </div>
      <div class="slot-actions">
        <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="openTimetableModal('${e.id}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="deleteTimetableEntry('${e.id}')" title="Delete" style="color:var(--red);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>`).join('');
}

function openTimetableModal(editId) {
  document.getElementById('tt-edit-id').value = editId || '';
  if (editId) {
    const e = SC.timetable.find(x => x.id === editId);
    if (!e) return;
    document.getElementById('timetable-modal-title').textContent = 'Edit Class';
    document.getElementById('tt-day').value = e.day;
    document.getElementById('tt-subject').value = e.subject;
    document.getElementById('tt-start').value = e.startTime;
    document.getElementById('tt-end').value = e.endTime;
    document.getElementById('tt-room').value = e.room || '';
    document.getElementById('tt-faculty').value = e.faculty || '';
  } else {
    document.getElementById('timetable-modal-title').textContent = 'Add Class';
    document.getElementById('tt-day').value = currentTTDay;
    document.getElementById('tt-subject').value = '';
    document.getElementById('tt-start').value = '';
    document.getElementById('tt-end').value = '';
    document.getElementById('tt-room').value = '';
    document.getElementById('tt-faculty').value = '';
  }
  openModal('timetable-modal');
}

async function saveTimetableEntry() {
  const editId = document.getElementById('tt-edit-id').value;
  const body = {
    day: document.getElementById('tt-day').value,
    subject: document.getElementById('tt-subject').value.trim(),
    startTime: document.getElementById('tt-start').value,
    endTime: document.getElementById('tt-end').value,
    room: document.getElementById('tt-room').value.trim(),
    faculty: document.getElementById('tt-faculty').value.trim()
  };
  if (!body.day || !body.subject || !body.startTime || !body.endTime) {
    toast('Day, subject, and times are required', 'error'); return;
  }
  if (body.startTime >= body.endTime) {
    toast('End time must be after start time', 'error'); return;
  }
  try {
    if (editId) {
      const updated = await api('PUT', `/api/timetable/${editId}`, body);
      SC.timetable = SC.timetable.map(t => t.id === editId ? updated : t);
      toast('Class updated', 'success');
    } else {
      const entry = await api('POST', '/api/timetable', body);
      SC.timetable.push(entry);
      toast('Class added', 'success');
    }
    closeModal('timetable-modal');
    currentTTDay = body.day;
    renderDayTabs();
    renderTimetableSlots();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteTimetableEntry(id) {
  confirmDialog('Delete Class', 'Remove this class from your timetable?', async () => {
    try {
      await api('DELETE', `/api/timetable/${id}`);
      SC.timetable = SC.timetable.filter(t => t.id !== id);
      toast('Class removed', 'success');
      renderTimetableSlots();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ─── Attendance ───────────────────────────────────────────────
function loadAttendance() {
  renderAttStats();
  renderAttSubjects();
  buildAttDateSelect();
  const today = todayDateString();
  loadAttendanceForDate(today);
}

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderAttStats() {
  const countable = SC.attendance.filter(a => ['present','absent'].includes(a.status));
  const present = SC.attendance.filter(a => a.status === 'present').length;
  const absent = SC.attendance.filter(a => a.status === 'absent').length;
  const total = countable.length;
  const pct = total ? Math.round(present / total * 100) : 0;
  document.getElementById('att-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:#dcfce7;color:var(--green);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M9 11l3 3L22 4"/></svg></div>
      <div><div class="stat-value">${present}</div><div class="stat-label">Present</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fee2e2;color:var(--red);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
      <div><div class="stat-value">${absent}</div><div class="stat-label">Absent</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--accent-light);color:var(--accent);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div><div class="stat-value">${total}</div><div class="stat-label">Total Classes</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:${pct>=75?'#dcfce7':pct>=60?'#fef9c3':'#fee2e2'};color:${pct>=75?'var(--green)':pct>=60?'var(--yellow)':'var(--red)'};"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div><div class="stat-value">${pct}%</div><div class="stat-label">Overall %</div></div>
    </div>
  `;
}

function renderAttSubjects() {
  const el = document.getElementById('att-subject-list');
  const bySubject = {};
  SC.attendance.forEach(a => {
    if (!bySubject[a.subject]) bySubject[a.subject] = { present: 0, absent: 0, cancelled: 0 };
    if (a.status === 'present') bySubject[a.subject].present++;
    else if (a.status === 'absent') bySubject[a.subject].absent++;
    else if (a.status === 'cancelled') bySubject[a.subject].cancelled++;
  });
  if (Object.keys(bySubject).length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:32px;"><p>No attendance marked yet.</p></div>`;
    return;
  }
  el.innerHTML = Object.entries(bySubject).map(([subj, d]) => {
    const total = d.present + d.absent;
    const pct = total ? Math.round(d.present / total * 100) : 0;
    const cls = pct >= 75 ? 'good' : pct >= 60 ? 'warn' : 'bad';
    return `<div class="attendance-row">
      <div class="att-subject-name">${escHtml(subj)}</div>
      <div class="att-stats">
        <span style="color:var(--green);">${d.present} P</span>
        <span style="color:var(--red);">${d.absent} A</span>
        ${d.cancelled > 0 ? `<span style="color:var(--text-muted);">${d.cancelled} C</span>` : ''}
      </div>
      <div style="flex:1;margin:0 12px;"><div class="progress-bar-wrap"><div class="progress-bar ${pct>=75?'green':pct>=60?'':'red'}" style="width:${pct}%;"></div></div></div>
      <div class="att-percent ${cls}">${pct}%</div>
    </div>`;
  }).join('');
}

function buildAttDateSelect() {
  const sel = document.getElementById('att-date-select');
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  sel.innerHTML = dates.map(d => `<option value="${d}" ${d === todayDateString() ? 'selected' : ''}>${formatDate(d)}</option>`).join('');
}

function loadAttendanceForDate(dateStr) {
  if (!dateStr) return;
  const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const classes = SC.timetable.filter(t => t.day === dayName)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const el = document.getElementById('att-mark-list');
  if (classes.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:32px;"><p>No classes on ${dayName} (${formatDate(dateStr)}).</p><button class="btn btn-secondary btn-sm" onclick="navigate('timetable')">Set up timetable</button></div>`;
    return;
  }
  el.innerHTML = classes.map(cls => {
    const record = SC.attendance.find(a => a.timetableId === cls.id && a.date === dateStr);
    const status = record?.status || 'not_marked';
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;">
        <div style="font-size:0.875rem;font-weight:600;">${escHtml(cls.subject)}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${formatTime(cls.startTime)} – ${formatTime(cls.endTime)}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="att-status-btn ${status==='present'?'present':''}" onclick="markAttendance('${cls.id}','${escHtml(cls.subject)}','${dateStr}','present')">Present</button>
        <button class="att-status-btn ${status==='absent'?'absent':''}" onclick="markAttendance('${cls.id}','${escHtml(cls.subject)}','${dateStr}','absent')">Absent</button>
        <button class="att-status-btn ${status==='cancelled'?'cancelled':''}" onclick="markAttendance('${cls.id}','${escHtml(cls.subject)}','${dateStr}','cancelled')">Cancelled</button>
      </div>
    </div>`;
  }).join('');
}

async function markAttendance(timetableId, subject, date, status) {
  try {
    const record = await api('POST', '/api/attendance', { timetableId, subject, date, status });
    const existing = SC.attendance.findIndex(a => a.timetableId === timetableId && a.date === date);
    if (existing >= 0) SC.attendance[existing] = record;
    else SC.attendance.push(record);
    toast(`Marked as ${status}`, 'success');
    loadAttendanceForDate(date);
    renderAttStats();
    renderAttSubjects();
  } catch (err) { toast(err.message, 'error'); }
}

// ─── Study Plan ───────────────────────────────────────────────
function loadStudyPlan() {
  renderTaskStats();
  renderTasks();
}
function renderTaskStats() {
  const total = SC.tasks.length;
  const done = SC.tasks.filter(t => t.status === 'completed').length;
  const pending = SC.tasks.filter(t => t.status === 'pending').length;
  const inProgress = SC.tasks.filter(t => t.status === 'in_progress').length;
  const high = SC.tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
  document.getElementById('task-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--accent-light);color:var(--accent);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg></div>
      <div><div class="stat-value">${total}</div><div class="stat-label">Total Tasks</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#dcfce7;color:var(--green);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M9 11l3 3L22 4"/></svg></div>
      <div><div class="stat-value">${done}</div><div class="stat-label">Completed</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#dbeafe;color:var(--blue);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div><div class="stat-value">${inProgress}</div><div class="stat-label">In Progress</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fee2e2;color:var(--red);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      <div><div class="stat-value">${high}</div><div class="stat-label">High Priority</div></div>
    </div>
  `;
}
function renderTasks() {
  const statusFilter = document.getElementById('task-filter-status')?.value || '';
  const priorityFilter = document.getElementById('task-filter-priority')?.value || '';
  let tasks = [...SC.tasks];
  if (statusFilter) tasks = tasks.filter(t => t.status === statusFilter);
  if (priorityFilter) tasks = tasks.filter(t => t.priority === priorityFilter);
  tasks.sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    const pd = { high: 0, medium: 1, low: 2 };
    return (pd[a.priority]||1) - (pd[b.priority]||1);
  });
  const el = document.getElementById('tasks-list');
  if (tasks.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="28" height="28"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></div>
      <h3>No tasks found</h3>
      <p>${statusFilter || priorityFilter ? 'Try adjusting your filters.' : 'Add your first study task to get started.'}</p>
      ${!statusFilter && !priorityFilter ? `<button class="btn btn-primary" onclick="openTaskModal()">Add a task</button>` : ''}
    </div>`;
    return;
  }
  el.innerHTML = tasks.map(t => {
    const done = t.status === 'completed';
    return `<div class="task-item">
      <div class="task-checkbox ${done ? 'done' : ''}" onclick="toggleTaskComplete('${t.id}')"></div>
      <div class="task-content">
        <div class="task-title ${done ? 'done' : ''}">${escHtml(t.title)}</div>
        <div class="task-meta">
          ${t.subject ? `<span>${escHtml(t.subject)}</span>` : ''}
          ${t.dueDate ? `<span>Due ${formatDate(t.dueDate)}</span>` : ''}
          <span class="badge badge-${priorityColor(t.priority)}">${t.priority}</span>
          <span class="badge badge-${statusColor(t.status)}">${formatStatus(t.status)}</span>
        </div>
        ${t.description ? `<div class="text-sm text-secondary mt-1">${escHtml(t.description)}</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="openTaskModal('${t.id}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="deleteTask('${t.id}')" title="Delete" style="color:var(--red);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

function openTaskModal(editId) {
  document.getElementById('task-edit-id').value = editId || '';
  if (editId) {
    const t = SC.tasks.find(x => x.id === editId);
    if (!t) return;
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-title').value = t.title;
    document.getElementById('task-desc').value = t.description || '';
    document.getElementById('task-subject').value = t.subject || '';
    document.getElementById('task-due').value = t.dueDate || '';
    document.getElementById('task-priority').value = t.priority || 'medium';
    document.getElementById('task-status').value = t.status || 'pending';
  } else {
    document.getElementById('task-modal-title').textContent = 'Add Task';
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-subject').value = '';
    document.getElementById('task-due').value = '';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-status').value = 'pending';
  }
  openModal('task-modal');
}

async function saveTask() {
  const editId = document.getElementById('task-edit-id').value;
  const body = {
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-desc').value.trim(),
    subject: document.getElementById('task-subject').value.trim(),
    dueDate: document.getElementById('task-due').value || null,
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value
  };
  if (!body.title) { toast('Task title is required', 'error'); return; }
  try {
    if (editId) {
      const updated = await api('PUT', `/api/tasks/${editId}`, body);
      SC.tasks = SC.tasks.map(t => t.id === editId ? updated : t);
      toast('Task updated', 'success');
    } else {
      const task = await api('POST', '/api/tasks', body);
      SC.tasks.push(task);
      toast('Task added', 'success');
    }
    closeModal('task-modal');
    renderTaskStats();
    renderTasks();
  } catch (err) { toast(err.message, 'error'); }
}

async function toggleTaskComplete(id) {
  const task = SC.tasks.find(t => t.id === id);
  if (!task) return;
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  try {
    const updated = await api('PUT', `/api/tasks/${id}`, { status: newStatus });
    SC.tasks = SC.tasks.map(t => t.id === id ? updated : t);
    renderTaskStats();
    renderTasks();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteTask(id) {
  confirmDialog('Delete Task', 'Remove this task?', async () => {
    try {
      await api('DELETE', `/api/tasks/${id}`);
      SC.tasks = SC.tasks.filter(t => t.id !== id);
      toast('Task deleted', 'success');
      renderTaskStats();
      renderTasks();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ─── Tests ────────────────────────────────────────────────────
function loadTests() {
  renderTests();
}
function renderTests() {
  const now = new Date();
  const upcoming = SC.tests.filter(t => new Date(t.date) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = SC.tests.filter(t => new Date(t.date) < new Date(now.toDateString()) && t.obtainedMarks !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const all = [...SC.tests].sort((a, b) => new Date(b.date) - new Date(a.date));

  const upEl = document.getElementById('tests-upcoming');
  if (upcoming.length === 0) {
    upEl.innerHTML = `<div class="empty-state" style="padding:32px 16px;"><p>No upcoming tests.</p><button class="btn btn-primary btn-sm" onclick="openTestModal()">Add a test</button></div>`;
  } else {
    upEl.innerHTML = upcoming.map(t => `
      <div class="class-item" style="margin-bottom:8px;">
        <div>
          <div style="font-size:0.825rem;font-weight:700;color:var(--accent);">${formatDate(t.date)}</div>
          ${t.time ? `<div style="font-size:0.75rem;color:var(--text-muted);">${t.time}</div>` : ''}
        </div>
        <div class="class-info">
          <div class="class-name">${escHtml(t.name)}</div>
          <div class="class-meta">${escHtml(t.subject)}${t.totalMarks ? ` · ${t.totalMarks} marks` : ''}</div>
        </div>
      </div>`).join('');
  }

  const pastEl = document.getElementById('tests-past');
  if (past.length === 0) {
    pastEl.innerHTML = `<div class="empty-state" style="padding:32px 16px;"><p>No results recorded yet.</p></div>`;
  } else {
    pastEl.innerHTML = past.map(t => {
      const pct = t.totalMarks ? Math.round(t.obtainedMarks / t.totalMarks * 100) : null;
      const cls = pct !== null ? (pct >= 75 ? 'good' : pct >= 50 ? 'warn' : 'bad') : '';
      return `<div class="class-item" style="margin-bottom:8px;">
        <div class="att-percent ${cls}" style="min-width:50px;">${pct !== null ? pct + '%' : '—'}</div>
        <div class="class-info">
          <div class="class-name">${escHtml(t.name)}</div>
          <div class="class-meta">${escHtml(t.subject)} · ${formatDate(t.date)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // Table
  const tbody = document.getElementById('tests-tbody');
  if (all.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No tests added yet. <a onclick="openTestModal()" style="color:var(--accent);cursor:pointer;font-weight:600;">Add one</a></td></tr>`;
    return;
  }
  tbody.innerHTML = all.map(t => {
    const pct = (t.totalMarks && t.obtainedMarks !== null) ? Math.round(t.obtainedMarks / t.totalMarks * 100) : null;
    const isUpcoming = new Date(t.date) >= new Date(now.toDateString());
    return `<tr>
      <td><div style="font-weight:600;">${escHtml(t.name)}</div></td>
      <td>${escHtml(t.subject)}</td>
      <td>${formatDate(t.date)}${t.time ? ' ' + t.time : ''}</td>
      <td>${pct !== null ? `<span class="att-percent ${pct>=75?'good':pct>=50?'warn':'bad'}" style="font-size:0.875rem;">${t.obtainedMarks}/${t.totalMarks} (${pct}%)</span>` : isUpcoming ? '<span class="badge badge-blue">Upcoming</span>' : '—'}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;">${escHtml(t.notes || '')}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="openTestModal('${t.id}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="deleteTest('${t.id}')" title="Delete" style="color:var(--red);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openTestModal(editId) {
  document.getElementById('test-edit-id').value = editId || '';
  if (editId) {
    const t = SC.tests.find(x => x.id === editId);
    if (!t) return;
    document.getElementById('test-modal-title').textContent = 'Edit Test';
    document.getElementById('test-name').value = t.name;
    document.getElementById('test-subject').value = t.subject;
    document.getElementById('test-date').value = t.date;
    document.getElementById('test-time').value = t.time || '';
    document.getElementById('test-total').value = t.totalMarks || '';
    document.getElementById('test-obtained').value = t.obtainedMarks !== null ? t.obtainedMarks : '';
    document.getElementById('test-notes').value = t.notes || '';
  } else {
    document.getElementById('test-modal-title').textContent = 'Add Test';
    ['test-name','test-subject','test-time','test-notes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('test-date').value = '';
    document.getElementById('test-total').value = '';
    document.getElementById('test-obtained').value = '';
  }
  openModal('test-modal');
}

async function saveTest() {
  const editId = document.getElementById('test-edit-id').value;
  const body = {
    name: document.getElementById('test-name').value.trim(),
    subject: document.getElementById('test-subject').value.trim(),
    date: document.getElementById('test-date').value,
    time: document.getElementById('test-time').value,
    totalMarks: document.getElementById('test-total').value,
    obtainedMarks: document.getElementById('test-obtained').value,
    notes: document.getElementById('test-notes').value.trim()
  };
  if (!body.name || !body.subject || !body.date) {
    toast('Name, subject, and date are required', 'error'); return;
  }
  try {
    if (editId) {
      const updated = await api('PUT', `/api/tests/${editId}`, body);
      SC.tests = SC.tests.map(t => t.id === editId ? updated : t);
      toast('Test updated', 'success');
    } else {
      const test = await api('POST', '/api/tests', body);
      SC.tests.push(test);
      toast('Test added', 'success');
    }
    closeModal('test-modal');
    renderTests();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteTest(id) {
  confirmDialog('Delete Test', 'Remove this test record?', async () => {
    try {
      await api('DELETE', `/api/tests/${id}`);
      SC.tests = SC.tests.filter(t => t.id !== id);
      toast('Test deleted', 'success');
      renderTests();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ─── FocusLearn ───────────────────────────────────────────────
const FL_SUGGESTED = [
  'Integration Calculus', 'Newton\'s Laws', 'Data Structures Arrays',
  'Python Basics', 'Organic Chemistry', 'Electric Circuits',
  'Linear Algebra', 'Operating Systems', 'Database Normalization',
  'Machine Learning Basics', 'English Grammar', 'Thermodynamics'
];
function loadFocusLearn() {
  document.getElementById('fl-chips').innerHTML = FL_SUGGESTED.map(s =>
    `<button class="chip" onclick="setFLChip('${s.replace(/'/g,"\\'")}')"> ${s}</button>`
  ).join('');
}
function setFLChip(text) {
  const parts = text.split(' ');
  document.getElementById('fl-topic').value = text;
}
function focusLearnSearch() {
  const subject = document.getElementById('fl-subject').value.trim();
  const topic = document.getElementById('fl-topic').value.trim();
  if (!topic) { toast('Please enter a topic to search', 'error'); return; }
  const query = [subject, topic].filter(Boolean).join(' ');
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  window.open(url, '_blank');
}

// ─── Notifications ────────────────────────────────────────────
function loadNotifications() {
  renderNotifications();
}
function renderNotifications() {
  const el = document.getElementById('notifications-list');
  if (SC.notifications.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:60px;"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="28" height="28"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div><h3>No notifications</h3><p>You're all caught up!</p></div>`;
    return;
  }
  el.innerHTML = SC.notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
      <div class="notif-dot-indicator"></div>
      <div class="notif-content">
        <div class="notif-title">${escHtml(n.title)}</div>
        <div class="notif-message">${escHtml(n.message)}</div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
      <button class="btn btn-icon btn-ghost btn-icon-sm" onclick="event.stopPropagation();deleteNotif('${n.id}')" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');
}

async function markNotifRead(id) {
  const n = SC.notifications.find(x => x.id === id);
  if (!n || n.read) return;
  try {
    const updated = await api('PUT', `/api/notifications/${id}/read`);
    SC.notifications = SC.notifications.map(x => x.id === id ? updated : x);
    updateNotifBadge();
    renderNotifications();
  } catch (err) { toast(err.message, 'error'); }
}

async function markAllRead() {
  try {
    await api('PUT', '/api/notifications/mark-all-read');
    SC.notifications = SC.notifications.map(n => ({ ...n, read: true }));
    updateNotifBadge();
    renderNotifications();
    toast('All notifications marked as read', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteNotif(id) {
  try {
    await api('DELETE', `/api/notifications/${id}`);
    SC.notifications = SC.notifications.filter(n => n.id !== id);
    updateNotifBadge();
    renderNotifications();
  } catch (err) { toast(err.message, 'error'); }
}

async function clearAllNotifications() {
  if (SC.notifications.length === 0) return;
  confirmDialog('Clear All', 'Delete all notifications?', async () => {
    try {
      await api('DELETE', '/api/notifications');
      SC.notifications = [];
      updateNotifBadge();
      renderNotifications();
      toast('All notifications cleared', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ─── Study Timer ──────────────────────────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 96; // r=96

function setPreset(mins) {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.preset-btn[data-mins="${mins}"]`)?.classList.add('active');
  const customRow = document.getElementById('timer-custom-row');
  if (mins === 0) {
    customRow.classList.remove('hidden');
    return;
  }
  customRow.classList.add('hidden');
  if (!SC.timer.running && !SC.timer.paused) {
    SC.timer.selectedPreset = mins;
    SC.timer.totalSeconds = mins * 60;
    SC.timer.remainingSeconds = mins * 60;
    updateTimerDisplay();
  }
}
function applyCustomTimer() {
  const val = parseInt(document.getElementById('timer-custom-input').value);
  if (!val || val < 1 || val > 240) { toast('Enter 1–240 minutes', 'error'); return; }
  SC.timer.selectedPreset = val;
  SC.timer.totalSeconds = val * 60;
  SC.timer.remainingSeconds = val * 60;
  updateTimerDisplay();
  document.getElementById('timer-custom-row').classList.add('hidden');
  toast(`Timer set to ${val} minutes`, 'info');
}

function updateTimerDisplay() {
  const r = SC.timer.remainingSeconds;
  const m = Math.floor(r / 60).toString().padStart(2,'0');
  const s = (r % 60).toString().padStart(2,'0');
  document.getElementById('timer-display').textContent = `${m}:${s}`;
  const progress = SC.timer.totalSeconds > 0
    ? SC.timer.remainingSeconds / SC.timer.totalSeconds : 1;
  const offset = CIRCUMFERENCE * (1 - progress);
  document.getElementById('timer-progress-circle').style.strokeDashoffset = offset;
}

function timerStart() {
  if (SC.timer.running) return;
  SC.timer.running = true;
  SC.timer.paused = false;
  document.getElementById('timer-start-btn').classList.add('hidden');
  document.getElementById('timer-pause-btn').classList.remove('hidden');
  document.getElementById('timer-reset-btn').classList.remove('hidden');
  document.getElementById('timer-stop-btn').classList.remove('hidden');
  document.getElementById('timer-state').textContent = 'Focusing…';
  SC.timer.interval = setInterval(() => {
    if (SC.timer.remainingSeconds <= 0) {
      timerComplete();
      return;
    }
    SC.timer.remainingSeconds--;
    updateTimerDisplay();
    updateTimerSessionInfo();
  }, 1000);
}

function timerPause() {
  if (!SC.timer.running) return;
  SC.timer.running = false;
  SC.timer.paused = true;
  clearInterval(SC.timer.interval);
  SC.timer.interval = null;
  document.getElementById('timer-pause-btn').classList.add('hidden');
  document.getElementById('timer-resume-btn').classList.remove('hidden');
  document.getElementById('timer-state').textContent = 'Paused';
}

function timerResume() {
  document.getElementById('timer-resume-btn').classList.add('hidden');
  document.getElementById('timer-pause-btn').classList.remove('hidden');
  SC.timer.paused = false;
  timerStart();
}

function timerReset() {
  clearInterval(SC.timer.interval);
  SC.timer.interval = null;
  SC.timer.running = false;
  SC.timer.paused = false;
  SC.timer.remainingSeconds = SC.timer.totalSeconds;
  updateTimerDisplay();
  document.getElementById('timer-start-btn').classList.remove('hidden');
  document.getElementById('timer-pause-btn').classList.add('hidden');
  document.getElementById('timer-resume-btn').classList.add('hidden');
  document.getElementById('timer-reset-btn').classList.add('hidden');
  document.getElementById('timer-stop-btn').classList.add('hidden');
  document.getElementById('timer-state').textContent = 'Ready';
  document.getElementById('timer-session-info').innerHTML = '';
}

function timerStop() {
  timerReset();
  toast('Timer stopped', 'info');
}

function timerComplete() {
  clearInterval(SC.timer.interval);
  SC.timer.interval = null;
  SC.timer.running = false;
  SC.timer.paused = false;
  SC.timer.sessionCount++;
  SC.timer.remainingSeconds = 0;
  updateTimerDisplay();
  document.getElementById('timer-state').textContent = '🎉 Session Complete!';
  document.getElementById('timer-pause-btn').classList.add('hidden');
  document.getElementById('timer-resume-btn').classList.add('hidden');
  document.getElementById('timer-stop-btn').classList.add('hidden');
  document.getElementById('timer-start-btn').classList.remove('hidden');
  document.getElementById('timer-reset-btn').classList.remove('hidden');
  toast('Focus session complete! Great work! 🎉', 'success');
}

function updateTimerSessionInfo() {
  const elapsed = SC.timer.totalSeconds - SC.timer.remainingSeconds;
  const em = Math.floor(elapsed / 60);
  const es = elapsed % 60;
  const el = document.getElementById('timer-session-info');
  el.innerHTML = `
    <div style="font-size:0.8rem;color:var(--text-muted);display:flex;gap:16px;flex-wrap:wrap;">
      <span>⏱ Elapsed: <strong>${em}m ${es}s</strong></span>
      <span>📚 Sessions today: <strong>${SC.timer.sessionCount}</strong></span>
      <span>⚡ Total duration: <strong>${Math.floor(SC.timer.totalSeconds/60)} min</strong></span>
    </div>`;
}

// ─── Clock ────────────────────────────────────────────────────
let _clockInterval = null;
function startClock() {
  updateClock();
  if (_clockInterval) clearInterval(_clockInterval);
  _clockInterval = setInterval(updateClock, 1000);
}
function startClockMini() { setInterval(updateClock, 1000); }
function updateClock() {
  if (SC.currentPage !== 'clock') return;
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const s = now.getSeconds().toString().padStart(2,'0');
  document.getElementById('clock-time').textContent = `${h}:${m}:${s}`;
  document.getElementById('clock-date').textContent = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('clock-day').textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
}

// ─── AI Buddy ─────────────────────────────────────────────────
function openAIBuddy() {
  window.open('https://chatgpt.com/', '_blank');
  toast('Opening AI Buddy in a new tab…', 'info');
}

// ─── Utility Functions ────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2,'0')} ${period}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function priorityColor(p) {
  return { high: 'red', medium: 'yellow', low: 'green' }[p] || 'gray';
}
function statusColor(s) {
  return { completed: 'green', in_progress: 'blue', pending: 'gray' }[s] || 'gray';
}
function formatStatus(s) {
  return { completed: 'Done', in_progress: 'In Progress', pending: 'Pending' }[s] || s;
}

function subjectColor(subjectName) {
  const s = SC.subjects.find(x => x.name.toLowerCase() === subjectName.toLowerCase());
  return s?.color || 'var(--accent)';
}

// ─── Bootstrap ────────────────────────────────────────────────
(function init() {
  loadSettings();

  // Restore FocusLearn chips whenever page loads
  document.querySelector('[data-page="focuslearn"]')?.addEventListener('click', () => {
    setTimeout(loadFocusLearn, 100);
  });

  // Check for existing session token
  const savedToken = localStorage.getItem('sc_token');
  if (savedToken) {
    // Verify token is still valid
    SC.token = savedToken;
    fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${savedToken}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async user => {
        SC.user = user;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app').classList.add('visible');
        await initApp();
      })
      .catch(() => {
        SC.token = null;
        localStorage.removeItem('sc_token');
        document.getElementById('auth-screen').style.display = '';
      });
  }

  // Timer display init
  updateTimerDisplay();
})();
