const STORAGE_KEY = "ll_observations_v1";
const SETTINGS_KEY = "ll_settings_v1";

const defaultSettings = {
  meet: 5,
  reply: 1,
  read: 1,
  viewed: 0.5,
  request: 0
};

const BATTERY_SETTINGS_KEY = "ll_battery_settings_v1";

const defaultBatterySettings = {
  dailyDrain: 8,
  afterMeetDrain: 5,
  unreadDrain: 15,
  readCharge: 3,
  replyCharge: 5,
  storyCharge: 0.5,
  requestCharge: 8,
  meetCharge: 100,
  stayCharge: 110
};

let observations = loadJSON(STORAGE_KEY, {});
let settings = { ...defaultSettings, ...loadJSON(SETTINGS_KEY, {}) };

let batterySettings = {
  ...defaultBatterySettings,
  ...loadJSON(BATTERY_SETTINGS_KEY, {})
};

let draft = blankObservation(todayISO());
let calendarCursor = new Date();

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function blankObservation(date) {
  return {
    date,
    contact: { meet: 0, reply: 0, read: 0, request: 0 },
    lineStatus: "NONE",
    instagram: "NO_STORY",
    context: {
      work: "UNKNOWN",
      duty: "UNKNOWN",
      source: "UNKNOWN",
      scheduleNote: ""
    },
    events: [],
    mood: null,
    memo: "",
    createdAt: "",
    updatedAt: ""
  };
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function scoreOf(obs) {
  if (!obs) return 0;
  return (
    (obs.contact?.meet || 0) * Number(settings.meet || 0) +
    (obs.contact?.reply || 0) * Number(settings.reply || 0) +
    (obs.contact?.read || 0) * Number(settings.read || 0) +
    (obs.contact?.request || 0) * Number(settings.request || 0) +
    (obs.instagram === "VIEWED" ? Number(settings.viewed || 0) : 0)
  );
}

function formatDateLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    day:"2-digit", month:"short", year:"numeric"
  }).format(d).toUpperCase();
}

function daysAgo(iso) {
  if (!iso) return null;
  const a = new Date(todayISO() + "T00:00:00");
  const b = new Date(iso + "T00:00:00");
  return Math.round((a-b)/86400000);
}

function humanDays(iso) {
  const d = daysAgo(iso);
  if (d === null) return "—";
  if (d === 0) return "TODAY";
  if (d === 1) return "1 DAY AGO";
  return `${d} DAYS AGO`;
}

function hasContact(obs) {
  return !!obs && (
    (obs.contact?.meet || 0) > 0 ||
    (obs.contact?.reply || 0) > 0 ||
    (obs.contact?.read || 0) > 0 ||
    (obs.contact?.request || 0) > 0
  );
}

function setView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === viewId));
  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
  if (viewId === "homeView") renderHome();
  if (viewId === "archiveView") renderCalendar();
  if (viewId === "settingsView") renderSettings();
}

document.querySelectorAll(".bottom-nav button").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

function loadObservation(date) {
  draft = observations[date] ? clone(observations[date]) : blankObservation(date);
  renderDraft();
}

function renderDraft() {
  document.getElementById("observeDate").value = draft.date;
  document.getElementById("observeDateLabel").textContent = formatDateLabel(draft.date);

  for (const key of ["meet","reply","read","request"]) {
    document.getElementById(`${key}Value`).textContent = draft.contact[key] || 0;
  }

  activateGroup("lineStatus", draft.lineStatus || "NONE");
  activateGroup("instagram", draft.instagram);
  activateGroup("work", draft.context.work);
  activateGroup("duty", draft.context.duty);
  activateGroup("source", draft.context.source);

  document.getElementById("scheduleNote").value = draft.context.scheduleNote || "";
  document.getElementById("memo").value = draft.memo || "";

  document.querySelectorAll("#eventChips button").forEach(btn => {
    btn.classList.toggle("active", draft.events.includes(btn.dataset.event));
  });

  document.querySelectorAll("#moodRow button").forEach(btn => {
    btn.classList.toggle("active", String(draft.mood) === btn.dataset.mood);
  });

  document.getElementById("scorePreview").textContent = scoreOf(draft).toFixed(1);
}

function activateGroup(group, value) {
  document.querySelectorAll(`[data-group="${group}"] button`).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

document.querySelectorAll("[data-counter]").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.counter;
    draft.contact[key] = Math.max(0, (draft.contact[key] || 0) + Number(btn.dataset.delta));
    renderDraft();
  });
});

document.querySelectorAll("[data-group]").forEach(group => {
  group.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const g = group.dataset.group;
      const value = btn.dataset.value;
      if (g === "lineStatus") draft.lineStatus = value;
      if (g === "instagram") draft.instagram = value;
      if (g === "work") draft.context.work = value;
      if (g === "duty") draft.context.duty = value;
      if (g === "source") draft.context.source = value;
      renderDraft();
    });
  });
});

document.querySelectorAll("#eventChips button").forEach(btn => {
  btn.addEventListener("click", () => {
    const ev = btn.dataset.event;
    draft.events = draft.events.includes(ev)
      ? draft.events.filter(x => x !== ev)
      : [...draft.events, ev];
    renderDraft();
  });
});

document.querySelectorAll("#moodRow button").forEach(btn => {
  btn.addEventListener("click", () => {
    const value = Number(btn.dataset.mood);
    draft.mood = draft.mood === value ? null : value;
    renderDraft();
  });
});

document.getElementById("scheduleNote").addEventListener("input", e => draft.context.scheduleNote = e.target.value);
document.getElementById("memo").addEventListener("input", e => draft.memo = e.target.value);

document.getElementById("observeDate").addEventListener("change", e => loadObservation(e.target.value));

function persistDraft() {
  const existing = observations[draft.date];
  const now = new Date().toISOString();
  draft.createdAt = existing?.createdAt || now;
  draft.updatedAt = now;
  observations[draft.date] = clone(draft);
  saveJSON(STORAGE_KEY, observations);
  flash("SAVED");
}

document.getElementById("saveBtn").addEventListener("click", () => {
  persistDraft();
  renderHome();
});

document.getElementById("saveNextBtn").addEventListener("click", () => {
  persistDraft();
  const d = new Date(draft.date + "T00:00:00");
  d.setDate(d.getDate() + 1);
  loadObservation(localISO(d));
});

function localISO(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0,10);
}

function renderHome() {
  const all = Object.values(observations).sort((a,b) => a.date.localeCompare(b.date));
  const today = new Date(todayISO() + "T00:00:00");
  const monthPrefix = todayISO().slice(0,7);

  const thisMonth = all.filter(o => o.date.startsWith(monthPrefix));
  const last7 = all.filter(o => {
    const diff = (today - new Date(o.date + "T00:00:00")) / 86400000;
    return diff >= 0 && diff <= 6;
  });

  const monthPts = thisMonth.reduce((s,o) => s + scoreOf(o), 0);
  const weekPts = last7.reduce((s,o) => s + scoreOf(o), 0);

  document.getElementById("monthPoints").textContent = `${monthPts.toFixed(1)} PT`;
  document.getElementById("weekPoints").textContent = `${weekPts.toFixed(1)} PT`;
  document.getElementById("monthRequests").textContent = thisMonth.reduce((s,o)=>s+(o.contact?.request||0),0);

  const contactDates = all.filter(hasContact).map(o => o.date);
  const meetDates = all.filter(o => (o.contact?.meet||0) > 0).map(o => o.date);
  const lastContactDate = contactDates.at(-1);
  const lastMeetDate = meetDates.at(-1);

  document.getElementById("lastContact").textContent = humanDays(lastContactDate);
  document.getElementById("lastMeet").textContent = humanDays(lastMeetDate);

  const storyDays = thisMonth.filter(o => o.instagram === "VIEWED" || o.instagram === "NOT_VIEWED");
  const viewed = storyDays.filter(o => o.instagram === "VIEWED").length;
  const rate = storyDays.length ? Math.round(viewed/storyDays.length*100) : null;
  document.getElementById("storyRate").textContent = rate === null ? "—" : `${rate}%`;

  renderSignal(lastContactDate, weekPts, all);
  renderRecent(all);
}

function renderSignal(lastContactDate, weekPts, all) {
  const signal = document.getElementById("signalValue");
  const note = document.getElementById("signalNote");
  const gap = daysAgo(lastContactDate);

  const recentScores = [];
  for (let offset=0; offset<28; offset+=7) {
    const end = new Date(todayISO()+"T00:00:00");
    end.setDate(end.getDate()-offset);
    const start = new Date(end);
    start.setDate(start.getDate()-6);
    const score = all.filter(o => {
      const d = new Date(o.date+"T00:00:00");
      return d >= start && d <= end;
    }).reduce((s,o)=>s+scoreOf(o),0);
    recentScores.push(score);
  }

  const baseline = recentScores.slice(1).filter(x => x > 0);
  const avg = baseline.length ? baseline.reduce((a,b)=>a+b,0)/baseline.length : weekPts;

  let state = "STABLE";
  let msg = "OBSERVATION WITHIN NORMAL RANGE";

  if (gap !== null && gap >= 7) {
    state = "VERY QUIET";
    msg = "CONTACT GAP ABOVE RECENT RANGE";
  } else if ((gap !== null && gap >= 4) || (avg > 0 && weekPts < avg * 0.45)) {
    state = "QUIET";
    msg = "SIGNAL LOWER THAN RECENT BASELINE";
  } else if (gap === null && all.length === 0) {
    state = "NO DATA";
    msg = "BEGIN OBSERVATION";
  }

  signal.textContent = state;
  note.textContent = msg;
}

function renderRecent(all) {
  const el = document.getElementById("recentList");
  const rows = all.slice(-7).reverse();
  if (!rows.length) {
    el.innerHTML = `<div class="muted">まだ観測データがありません。</div>`;
    return;
  }
  el.innerHTML = rows.map(o => {
    const bits = [];
    if (o.contact?.meet) bits.push(`M ${o.contact.meet}`);
    if (o.contact?.reply) bits.push(`R ${o.contact.reply}`);
    if (o.contact?.read) bits.push(`READ ${o.contact.read}`);
    if (o.contact?.request) bits.push(`REQ ${o.contact.request}`);
    if (o.instagram === "VIEWED") bits.push("IG ✓");
    return `<button class="recent-item" data-open-date="${o.date}" style="width:100%;background:none;border:0;color:inherit">
      <span class="date">${formatDateLabel(o.date)}</span>
      <span class="meta">${bits.join(" · ") || "NO CONTACT"}<br>${scoreOf(o).toFixed(1)} PT</span>
    </button>`;
  }).join("");

  el.querySelectorAll("[data-open-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      loadObservation(btn.dataset.openDate);
      setView("observeView");
    });
  });
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month+1, 0);

  document.getElementById("calendarTitle").textContent =
    new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(first).toUpperCase();

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  for (let i=0; i<first.getDay(); i++) {
    const blank = document.createElement("div");
    blank.className = "day empty";
    grid.appendChild(blank);
  }

  for (let day=1; day<=last.getDate(); day++) {
    const d = new Date(year,month,day);
    const iso = localISO(d);
    const btn = document.createElement("button");
    btn.className = "day";
    if (iso === todayISO()) btn.classList.add("today");
    if (observations[iso]) btn.classList.add("has-data");
    const obs = observations[iso];

const marks = [];
if (obs?.contact?.meet > 0) marks.push('<span class="mark meet">♥</span>');
if (obs?.contact?.reply > 0) marks.push('<span class="mark reply">✉︎</span>');
if (obs?.contact?.read > 0) marks.push('<span class="mark read">✓</span>');

btn.innerHTML = `
  <span class="day-num">${day}</span>
  ${marks.length ? `<div class="day-marks">${marks.join("")}</div>` : ''}
`;
    btn.addEventListener("click", () => {
      loadObservation(iso);
      setView("observeView");
    });
    grid.appendChild(btn);
  }
}

document.getElementById("prevMonth").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth()-1, 1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth()+1, 1);
  renderCalendar();
});

function renderSettings() {
  document.getElementById("scoreMeet").value = settings.meet;
  document.getElementById("scoreReply").value = settings.reply;
  document.getElementById("scoreRead").value = settings.read;
  document.getElementById("scoreViewed").value = settings.viewed;
  document.getElementById("scoreRequest").value = settings.request;
}

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  settings = {
    meet: Number(document.getElementById("scoreMeet").value || 0),
    reply: Number(document.getElementById("scoreReply").value || 0),
    read: Number(document.getElementById("scoreRead").value || 0),
    viewed: Number(document.getElementById("scoreViewed").value || 0),
    request: Number(document.getElementById("scoreRequest").value || 0)
  };
  saveJSON(SETTINGS_KEY, settings);
  renderDraft();
  renderHome();
  flash("SETTINGS SAVED");
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const payload = {
    app: "L.L. Link Laboratory",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    observations
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LL_backup_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importInput").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (!payload.observations || typeof payload.observations !== "object") throw new Error();
    observations = payload.observations;
    settings = { ...defaultSettings, ...(payload.settings || {}) };
    saveJSON(STORAGE_KEY, observations);
    saveJSON(SETTINGS_KEY, settings);
    renderHome();
    renderSettings();
    loadObservation(todayISO());
    flash("IMPORT COMPLETE");
  } catch {
    alert("このJSONはL.L.バックアップとして読み込めませんでした。");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("L.L.のローカル記録をすべて削除します。Export済みか確認してください。")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  observations = {};
  settings = {...defaultSettings};
  loadObservation(todayISO());
  renderHome();
  renderSettings();
});

function flash(text) {
  const old = document.title;
  document.title = `✓ ${text}`;
  setTimeout(()=>document.title=old,1200);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
}

loadObservation(todayISO());
renderHome();
renderCalendar();
renderSettings();
