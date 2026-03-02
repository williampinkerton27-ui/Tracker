/* Tracker v2 - premium UI + tabs (local-first) */
const STORAGE_KEY_V1 = "willTracker.v1";
const STORAGE_KEY_V2 = "willTracker.v2";

const el = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const ui = {
  // Tabs + screens
  tabs: Array.from(document.querySelectorAll(".tab")),
  screens: {
    today: el("screen-today"),
    history: el("screen-history"),
    insights: el("screen-insights"),
    settings: el("screen-settings"),
  },

  toast: el("toast"),
  subtitle: el("subtitle"),
  streakPill: el("streakPill"),

  // Dashboard tiles
  tileWeight: el("tileWeight"),
  weightDelta: el("weightDelta"),
  tileProtein: el("tileProtein"),
  proteinChip: el("proteinChip"),
  proteinBar: el("proteinBar"),
  proteinTargetText: el("proteinTargetText"),

  tileSteps: el("tileSteps"),
  stepsChip: el("stepsChip"),
  stepsBar: el("stepsBar"),
  stepsTargetText: el("stepsTargetText"),

  tileSleep: el("tileSleep"),
  sleepChip: el("sleepChip"),

  // Today form
  date: el("date"),
  saveBtn: el("saveBtn"),
  clearDayBtn: el("clearDayBtn"),
  weight: el("weight"),
  protein: el("protein"),
  steps: el("steps"),
  sleep: el("sleep"),
  takeaway: el("takeaway"),
  caffeineCutoff: el("caffeineCutoff"),
  notes: el("notes"),

  nnProtein: el("nnProtein"),
  nnSteps: el("nnSteps"),
  nnWater: el("nnWater"),
  nnCaffeine: el("nnCaffeine"),
  nnSnack: el("nnSnack"),

  didWorkPT: el("didWorkPT"),
  didGym: el("didGym"),
  didRun: el("didRun"),
  didMobility: el("didMobility"),

  // Weekly snapshot (today screen)
  sparkline: el("sparkline"),
  avgProtein: el("avgProtein"),
  avgSteps: el("avgSteps"),
  avgSleep: el("avgSleep"),
  sumTakeaway: el("sumTakeaway"),
  nnCompliance: el("nnCompliance"),

  // History
  historyList: el("historyList"),
  historyMeta: el("historyMeta"),

  // Insights
  insightsPill: el("insightsPill"),
  ins7: el("ins7"),
  ins30: el("ins30"),
  insSparkline: el("insSparkline"),

  // Settings
  setProteinTarget: el("setProteinTarget"),
  setStepsTarget: el("setStepsTarget"),
  setTakeawayWeekly: el("setTakeawayWeekly"),
  setStreakRule: el("setStreakRule"),
  saveSettingsBtn: el("saveSettingsBtn"),
  settingsSaved: el("settingsSaved"),

  exportBtn: el("exportBtn"),
  importFile: el("importFile"),
  wipeAllBtn: el("wipeAllBtn"),
};

function todayISO() {
  const d = new Date();
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOff).toISOString().slice(0, 10);
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function loadRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRaw(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

function defaultData() {
  return {
    version: 2,
    settings: {
      proteinTarget: 180,
      stepsTarget: 6000,
      weeklyTakeawayLimit: 2,
      streakRule: "atleast4" // all5 | atleast4 | atleast3
    },
    logs: {}
  };
}

function migrateIfNeeded() {
  const v2 = loadRaw(STORAGE_KEY_V2);
  if (v2 && v2.version === 2) return v2;

  const v1 = loadRaw(STORAGE_KEY_V1);
  if (!v1 || !v1.logs) return defaultData();

  // Migrate v1 -> v2
  const d = defaultData();
  d.logs = v1.logs || {};
  return d;
}

function loadData() {
  const d = migrateIfNeeded();
  saveRaw(STORAGE_KEY_V2, d); // ensure v2 exists
  return d;
}

function saveData(d) {
  saveRaw(STORAGE_KEY_V2, d);
}

function getLog(d, dateStr) {
  return d.logs[dateStr] ?? null;
}

function setLog(d, dateStr, log) {
  d.logs[dateStr] = log;
}

function delLog(d, dateStr) {
  delete d.logs[dateStr];
}

function readForm() {
  return {
    weight: n(ui.weight.value),
    protein: n(ui.protein.value),
    steps: n(ui.steps.value),
    sleep: n(ui.sleep.value),
    takeaway: n(ui.takeaway.value),
    caffeineCutoff: ui.caffeineCutoff.value, // yes/no
    notes: (ui.notes.value || "").slice(0, 2000),

    nonneg: {
      protein: ui.nnProtein.checked,
      steps: ui.nnSteps.checked,
      water: ui.nnWater.checked,
      caffeine: ui.nnCaffeine.checked,
      snack: ui.nnSnack.checked,
    },

    training: {
      workPT: ui.didWorkPT.checked,
      gym: ui.didGym.checked,
      run: ui.didRun.checked,
      mobility: ui.didMobility.checked,
    },

    updatedAt: new Date().toISOString(),
  };
}

function writeForm(log) {
  ui.weight.value = log?.weight ?? "";
  ui.protein.value = log?.protein ?? "";
  ui.steps.value = log?.steps ?? "";
  ui.sleep.value = log?.sleep ?? "";
  ui.takeaway.value = log?.takeaway ?? "";
  ui.caffeineCutoff.value = log?.caffeineCutoff ?? "yes";
  ui.notes.value = log?.notes ?? "";

  ui.nnProtein.checked = !!log?.nonneg?.protein;
  ui.nnSteps.checked = !!log?.nonneg?.steps;
  ui.nnWater.checked = !!log?.nonneg?.water;
  ui.nnCaffeine.checked = !!log?.nonneg?.caffeine;
  ui.nnSnack.checked = !!log?.nonneg?.snack;

  ui.didWorkPT.checked = !!log?.training?.workPT;
  ui.didGym.checked = !!log?.training?.gym;
  ui.didRun.checked = !!log?.training?.run;
  ui.didMobility.checked = !!log?.training?.mobility;
}

function datesBack(fromISO, days) {
  const out = [];
  const base = new Date(fromISO + "T00:00:00");
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function avg(nums) {
  const v = nums.filter(x => typeof x === "number" && Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a,b)=>a+b,0) / v.length;
}

function sum(nums) {
  const v = nums.filter(x => typeof x === "number" && Number.isFinite(x));
  if (!v.length) return 0;
  return v.reduce((a,b)=>a+b,0);
}

function sparklineSVG(values) {
  const v = values.filter(x => typeof x === "number" && Number.isFinite(x));
  if (v.length < 2) {
    return `<div class="muted small">Not enough weight entries yet.</div>`;
  }

  const w = 340, h = 78, pad = 8;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = (max - min) || 1;

  const pts = values.map((x, i) => {
    if (x == null) return null;
    const t = i / (values.length - 1);
    const px = pad + t * (w - 2 * pad);
    const py = pad + (1 - ((x - min) / span)) * (h - 2 * pad);
    return [px, py];
  }).filter(Boolean);

  const d = pts.map((p,i)=> (i===0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = v[v.length - 1].toFixed(1);
  const delta = (v[v.length - 1] - v[0]);
  const deltaTxt = (delta >= 0 ? "+" : "") + delta.toFixed(1);

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-label="weight sparkline">
      <path d="${d}" fill="none" stroke="currentColor" stroke-width="2" />
      <circle cx="${pts[pts.length-1][0].toFixed(1)}" cy="${pts[pts.length-1][1].toFixed(1)}" r="3" fill="currentColor" />
    </svg>
    <div class="row">
      <div class="muted small">Last: <b>${last}kg</b></div>
      <div class="muted small">Δ: <b>${deltaTxt}kg</b></div>
    </div>
  `;
}

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add("show");
  setTimeout(() => ui.toast.classList.remove("show"), 900);
}

function setTab(tabName) {
  ui.tabs.forEach(b => b.classList.toggle("active", b.dataset.tab === tabName));
  Object.entries(ui.screens).forEach(([k, node]) => {
    node.classList.toggle("active", k === tabName);
  });
}

function nonNegScore(log) {
  const nn = log?.nonneg || {};
  const keys = ["protein","steps","water","caffeine","snack"];
  const done = keys.reduce((a,k)=>a + (nn[k] ? 1 : 0), 0);
  return { done, total: keys.length };
}

function meetsStreakRule(log, rule) {
  const { done, total } = nonNegScore(log);
  if (total !== 5) return false;
  if (rule === "all5") return done === 5;
  if (rule === "atleast4") return done >= 4;
  return done >= 3; // atleast3
}

function computeStreak(d, refDateISO) {
  const rule = d.settings?.streakRule || "atleast4";
  let streak = 0;
  const days = datesBack(refDateISO, 365); // cap
  for (const dateStr of days) {
    const log = d.logs[dateStr];
    if (!log) break;
    if (!meetsStreakRule(log, rule)) break;
    streak++;
  }
  return streak;
}

function updateDashboard(d, dateStr) {
  const log = getLog(d, dateStr);
  const s = d.settings || {};

  // Weight tile (show today + 7-day delta)
  const d7 = datesBack(dateStr, 7).reverse();
  const wVals = d7.map(ds => d.logs[ds]?.weight ?? null).filter(x => x != null);
  const wToday = log?.weight ?? (wVals.length ? wVals[wVals.length-1] : null);
  ui.tileWeight.textContent = (wToday != null) ? wToday.toFixed(1) : "—";

  if (wVals.length >= 2) {
    const delta = wVals[wVals.length-1] - wVals[0];
    const txt = (delta >= 0 ? "+" : "") + delta.toFixed(1) + "kg";
    ui.weightDelta.textContent = txt;
  } else {
    ui.weightDelta.textContent = "—";
  }

  // Protein tile + bar
  const p = log?.protein ?? null;
  ui.tileProtein.textContent = (p != null) ? Math.round(p) : "—";
  const pTarget = Number(s.proteinTarget ?? 180);
  ui.proteinTargetText.textContent = `Target ${pTarget}g`;
  const pPct = (p != null && pTarget > 0) ? clamp((p / pTarget) * 100, 0, 160) : 0;
  ui.proteinBar.style.width = `${clamp(pPct, 0, 100)}%`;
  ui.proteinChip.textContent = `${Math.round(pPct)}%`;

  // Steps tile + bar
  const st = log?.steps ?? null;
  ui.tileSteps.textContent = (st != null) ? Math.round(st) : "—";
  const stTarget = Number(s.stepsTarget ?? 6000);
  ui.stepsTargetText.textContent = `Target ${stTarget}`;
  const stPct = (st != null && stTarget > 0) ? clamp((st / stTarget) * 100, 0, 200) : 0;
  ui.stepsBar.style.width = `${clamp(stPct, 0, 100)}%`;
  ui.stepsChip.textContent = `${Math.round(stPct)}%`;

  // Sleep tile
  const sl = log?.sleep ?? null;
  ui.tileSleep.textContent = (sl != null) ? sl.toFixed(1) : "—";
  ui.sleepChip.textContent = (sl != null) ? (sl >= 7 ? "Good" : "Needs work") : "—";

  // Streak
  const streak = computeStreak(d, dateStr);
  ui.streakPill.textContent = `🔥 ${streak} day streak`;

  // Subtitle
  ui.subtitle.textContent = (dateStr === todayISO()) ? "Today • Keep it consistent" : `${dateStr} • Review & adjust`;
}

function updateWeeklySnapshot(d, refDateISO) {
  const days = datesBack(refDateISO, 7);
  const logs = days.map(ds => d.logs[ds]).filter(Boolean);

  ui.avgProtein.textContent = avg(logs.map(l => l.protein)) ? `${Math.round(avg(logs.map(l => l.protein)))} g` : "—";
  ui.avgSteps.textContent = avg(logs.map(l => l.steps)) ? `${Math.round(avg(logs.map(l => l.steps)))}` : "—";
  ui.avgSleep.textContent = avg(logs.map(l => l.sleep)) ? `${avg(logs.map(l => l.sleep)).toFixed(1)} h` : "—";
  ui.sumTakeaway.textContent = `${sum(logs.map(l => l.takeaway))}`;

  // Compliance across days logged
  let nnDone = 0;
  let nnTotal = 0;
  for (const l of logs) {
    const { done, total } = nonNegScore(l);
    nnDone += done;
    nnTotal += total;
  }
  ui.nnCompliance.textContent = nnTotal ? `${Math.round((nnDone/nnTotal)*100)}%` : "—";

  // 14-day sparkline
  const d14 = datesBack(refDateISO, 14).reverse();
  const wVals = d14.map(ds => d.logs[ds]?.weight ?? null);
  ui.sparkline.innerHTML = sparklineSVG(wVals);
}

function updateHistory(d) {
  const entries = Object.keys(d.logs)
    .sort((a,b)=> b.localeCompare(a)) // newest first
    .slice(0, 60);

  ui.historyMeta.textContent = `${entries.length} logged day(s)`;

  if (!entries.length) {
    ui.historyList.innerHTML = `<div class="muted small">No entries yet. Log a few days and this becomes useful.</div>`;
    return;
  }

  ui.historyList.innerHTML = entries.map(ds => {
    const l = d.logs[ds];
    const w = (l.weight != null) ? l.weight.toFixed(1) : "—";
    const p = (l.protein != null) ? Math.round(l.protein) : "—";
    const st = (l.steps != null) ? Math.round(l.steps) : "—";
    const sc = nonNegScore(l);
    const badge = `${sc.done}/5`;
    return `
      <div class="item" data-date="${ds}">
        <div class="item-left">
          <div class="item-date">${ds}</div>
          <div class="item-meta">W ${w} • P ${p}g • Steps ${st}</div>
        </div>
        <div class="item-right">
          <span class="badge">${badge}</span>
          <span class="badge">›</span>
        </div>
      </div>
    `;
  }).join("");
}

function updateInsights(d, refDateISO) {
  const last7 = datesBack(refDateISO, 7);
  const last30 = datesBack(refDateISO, 30);

  const l7 = last7.map(ds => d.logs[ds]).filter(Boolean);
  const l30 = last30.map(ds => d.logs[ds]).filter(Boolean);

  const p7 = avg(l7.map(x=>x.protein));
  const s7 = avg(l7.map(x=>x.steps));
  const sl7 = avg(l7.map(x=>x.sleep));

  const p30 = avg(l30.map(x=>x.protein));
  const s30 = avg(l30.map(x=>x.steps));
  const sl30 = avg(l30.map(x=>x.sleep));

  ui.ins7.textContent =
    (p7 || s7 || sl7)
      ? `P ${p7 ? Math.round(p7) : "—"}g • Steps ${s7 ? Math.round(s7) : "—"} • Sleep ${sl7 ? sl7.toFixed(1) : "—"}h`
      : "—";

  ui.ins30.textContent =
    (p30 || s30 || sl30)
      ? `P ${p30 ? Math.round(p30) : "—"}g • Steps ${s30 ? Math.round(s30) : "—"} • Sleep ${sl30 ? sl30.toFixed(1) : "—"}h`
      : "—";

  // Streak + weekly takeaway check
  const streak = computeStreak(d, refDateISO);
  const take7 = sum(l7.map(x=>x.takeaway));
  const lim = Number(d.settings?.weeklyTakeawayLimit ?? 2);
  ui.insightsPill.textContent = `🔥 ${streak} streak • 🍔 ${take7}/${lim} takeaways (7d)`;

  // 30-day sparkline
  const d30 = datesBack(refDateISO, 30).reverse();
  const wVals = d30.map(ds => d.logs[ds]?.weight ?? null);
  ui.insSparkline.innerHTML = sparklineSVG(wVals);
}

function loadSettingsToUI(d) {
  const s = d.settings || {};
  ui.setProteinTarget.value = s.proteinTarget ?? 180;
  ui.setStepsTarget.value = s.stepsTarget ?? 6000;
  ui.setTakeawayWeekly.value = s.weeklyTakeawayLimit ?? 2;
  ui.setStreakRule.value = s.streakRule ?? "atleast4";
  ui.settingsSaved.textContent = "—";

  // Reflect targets on tiles immediately
  ui.proteinTargetText.textContent = `Target ${Number(s.proteinTarget ?? 180)}g`;
  ui.stepsTargetText.textContent = `Target ${Number(s.stepsTarget ?? 6000)}`;
}

function saveSettingsFromUI(d) {
  d.settings = d.settings || {};
  d.settings.proteinTarget = Number(ui.setProteinTarget.value || 180);
  d.settings.stepsTarget = Number(ui.setStepsTarget.value || 6000);
  d.settings.weeklyTakeawayLimit = Number(ui.setTakeawayWeekly.value || 2);
  d.settings.streakRule = ui.setStreakRule.value || "atleast4";
}

function init() {
  const d = loadData();

  // Default date
  ui.date.value = todayISO();
  writeForm(getLog(d, ui.date.value));

  // Load settings
  loadSettingsToUI(d);

  // Initial renders
  updateDashboard(d, ui.date.value);
  updateWeeklySnapshot(d, ui.date.value);
  updateHistory(d);
  updateInsights(d, ui.date.value);

  // Tabs
  ui.tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      setTab(tab);
      // Refresh views when changing tabs
      const data = loadData();
      updateHistory(data);
      updateInsights(data, ui.date.value || todayISO());
    });
  });

  // Date change
  ui.date.addEventListener("change", () => {
    const data = loadData();
    const ds = ui.date.value || todayISO();
    writeForm(getLog(data, ds));
    updateDashboard(data, ds);
    updateWeeklySnapshot(data, ds);
    updateInsights(data, ds);
  });

  // Save log
  ui.saveBtn.addEventListener("click", () => {
    const data = loadData();
    const ds = ui.date.value || todayISO();
    setLog(data, ds, readForm());
    saveData(data);

    updateDashboard(data, ds);
    updateWeeklySnapshot(data, ds);
    updateHistory(data);
    updateInsights(data, ds);

    showToast("Saved ✅");
    ui.saveBtn.textContent = "Saved";
    setTimeout(()=> ui.saveBtn.textContent = "Save", 700);
  });

  // Clear day
  ui.clearDayBtn.addEventListener("click", () => {
    const ok = confirm("Clear this day’s entry?");
    if (!ok) return;
    const data = loadData();
    const ds = ui.date.value || todayISO();
    delLog(data, ds);
    saveData(data);
    writeForm(null);

    updateDashboard(data, ds);
    updateWeeklySnapshot(data, ds);
    updateHistory(data);
    updateInsights(data, ds);

    showToast("Cleared 🧼");
  });

  // History click -> load date into today
  ui.historyList.addEventListener("click", (ev) => {
    const card = ev.target.closest(".item");
    if (!card) return;
    const ds = card.dataset.date;
    if (!ds) return;

    const data = loadData();
    ui.date.value = ds;
    writeForm(getLog(data, ds));
    updateDashboard(data, ds);
    updateWeeklySnapshot(data, ds);
    updateInsights(data, ds);

    setTab("today");
    showToast(`Loaded ${ds}`);
  });

  // Settings save
  ui.saveSettingsBtn.addEventListener("click", () => {
    const data = loadData();
    saveSettingsFromUI(data);
    saveData(data);

    loadSettingsToUI(data);
    updateDashboard(data, ui.date.value || todayISO());
    updateInsights(data, ui.date.value || todayISO());

    ui.settingsSaved.textContent = "Saved ✅";
    showToast("Settings saved ✅");
  });

  // Export/Import/Wipe
  ui.exportBtn.addEventListener("click", () => {
    const data = loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracker-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  ui.importFile.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !parsed.logs) throw new Error("Bad format");
      // Normalize to v2 shape
      const base = defaultData();
      base.logs = parsed.logs || {};
      base.settings = { ...base.settings, ...(parsed.settings || {}) };
      saveData(base);

      ui.date.value = todayISO();
      writeForm(getLog(base, ui.date.value));
      loadSettingsToUI(base);

      updateDashboard(base, ui.date.value);
      updateWeeklySnapshot(base, ui.date.value);
      updateHistory(base);
      updateInsights(base, ui.date.value);

      alert("Import complete ✅");
    } catch {
      alert("Import failed. File format not recognised.");
    } finally {
      ui.importFile.value = "";
    }
  });

  ui.wipeAllBtn.addEventListener("click", () => {
    const ok = confirm("This deletes ALL tracker data on this device. Proceed?");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY_V2);
    localStorage.removeItem(STORAGE_KEY_V1);

    const base = defaultData();
    saveData(base);

    ui.date.value = todayISO();
    writeForm(null);
    loadSettingsToUI(base);

    updateDashboard(base, ui.date.value);
    updateWeeklySnapshot(base, ui.date.value);
    updateHistory(base);
    updateInsights(base, ui.date.value);

    showToast("Wiped 🗑️");
  });
}

init();
