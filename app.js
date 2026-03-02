/* Will Tracker - local-first */
const STORAGE_KEY = "willTracker.v1";

const el = (id) => document.getElementById(id);

const ui = {
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

  sparkline: el("sparkline"),
  avgProtein: el("avgProtein"),
  avgSteps: el("avgSteps"),
  avgSleep: el("avgSleep"),
  sumTakeaway: el("sumTakeaway"),
  nnCompliance: el("nnCompliance"),

  exportBtn: el("exportBtn"),
  importFile: el("importFile"),
  wipeAllBtn: el("wipeAllBtn"),
};

function todayISO() {
  const d = new Date();
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOff).toISOString().slice(0, 10);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { logs: {} };
    return JSON.parse(raw);
  } catch {
    return { logs: {} };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getLog(data, dateStr) {
  return data.logs[dateStr] ?? null;
}

function setLog(data, dateStr, log) {
  data.logs[dateStr] = log;
}

function delLog(data, dateStr) {
  delete data.logs[dateStr];
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
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

  const w = 320, h = 70, pad = 8;
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
  </div>`;
}

function updateSummary(data, refDateISO) {
  const days = datesBack(refDateISO, 7);
  const logs = days.map(d => data.logs[d]).filter(Boolean);

  const proteins = logs.map(l => l.protein);
  const steps = logs.map(l => l.steps);
  const sleeps = logs.map(l => l.sleep);
  const takeaways = logs.map(l => l.takeaway);

  ui.avgProtein.textContent = avg(proteins) ? `${Math.round(avg(proteins))} g` : "—";
  ui.avgSteps.textContent = avg(steps) ? `${Math.round(avg(steps))}` : "—";
  ui.avgSleep.textContent = avg(sleeps) ? `${avg(sleeps).toFixed(1)} h` : "—";
  ui.sumTakeaway.textContent = `${sum(takeaways)}`;

  // Non-negotiable compliance: count checked items across days / (5 * #days with logs)
  let nnDone = 0;
  let nnTotal = 0;
  for (const l of logs) {
    const nn = l.nonneg || {};
    const keys = ["protein","steps","water","caffeine","snack"];
    nnTotal += keys.length;
    nnDone += keys.reduce((acc,k)=> acc + (nn[k] ? 1 : 0), 0);
  }
  ui.nnCompliance.textContent = nnTotal ? `${Math.round((nnDone/nnTotal)*100)}%` : "—";

  // Sparkline: last 14 weights (reverse to oldest->newest)
  const d14 = datesBack(refDateISO, 14).reverse();
  const wVals = d14.map(d => data.logs[d]?.weight ?? null);
  ui.sparkline.innerHTML = sparklineSVG(wVals);
}

function init() {
  const data = loadData();

  ui.date.value = todayISO();
  writeForm(getLog(data, ui.date.value));
  updateSummary(data, ui.date.value);

  ui.date.addEventListener("change", () => {
    const d = loadData();
    writeForm(getLog(d, ui.date.value));
    updateSummary(d, ui.date.value);
  });

  ui.saveBtn.addEventListener("click", () => {
    const d = loadData();
    const dateStr = ui.date.value || todayISO();
    setLog(d, dateStr, readForm());
    saveData(d);
    updateSummary(d, dateStr);
    ui.saveBtn.textContent = "Saved ✅";
    setTimeout(()=> ui.saveBtn.textContent = "Save", 700);
  });

  ui.clearDayBtn.addEventListener("click", () => {
    const d = loadData();
    const dateStr = ui.date.value || todayISO();
    delLog(d, dateStr);
    saveData(d);
    writeForm(null);
    updateSummary(d, dateStr);
  });

  ui.exportBtn.addEventListener("click", () => {
    const d = loadData();
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `will-tracker-backup-${todayISO()}.json`;
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
      saveData(parsed);
      writeForm(getLog(parsed, ui.date.value));
      updateSummary(parsed, ui.date.value);
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
    localStorage.removeItem(STORAGE_KEY);
    writeForm(null);
    updateSummary({ logs: {} }, ui.date.value);
  });
}

init();
