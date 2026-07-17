const behaviour = {
  backspace_count: 0,
  paste_attempts: 0,
  focus_loss_count: 0
};

// timestamped log of behaviour events, used to draw the timeline chart
const sessionStart = Date.now();
const eventLog = [];

const byId = (id) => document.getElementById(id);

const showCounters = () => {
  byId("backspaces").textContent = behaviour.backspace_count;
  byId("pastes").textContent = behaviour.paste_attempts;
  byId("focus-losses").textContent = behaviour.focus_loss_count;
};

const logEvent = (type) => {
  eventLog.push({
    t: Math.round((Date.now() - sessionStart) / 1000),
    type
  });
};

[byId("password"), byId("otp")].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace") {
      behaviour.backspace_count++;
      logEvent("backspace");
      showCounters();
    }
  });
  input.addEventListener("paste", () => {
    behaviour.paste_attempts++;
    logEvent("paste");
    showCounters();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    behaviour.focus_loss_count++;
    logEvent("focus_loss");
    showCounters();
  }
});

// --- chart instances, recreated on every submit ---
let gaugeChart = null;
let scoresChart = null;
let timelineChart = null;

const DECISION_COLOR = {
  approve: "#51d497",
  review: "#ffd166",
  block: "#ff6b6b"
};

const SCORE_LABELS = {
  user_trust: "User trust",
  merchant_trust: "Merchant trust",
  transaction_reliability: "Reliability",
  behavioural_safety: "Behavioural safety"
};

const renderGauge = (score, decisionKey) => {
  const color = DECISION_COLOR[decisionKey] || "#6cbaff";
  if (gaugeChart) gaugeChart.destroy();
  gaugeChart = new Chart(byId("gauge-chart"), {
    type: "doughnut",
    data: {
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [color, "#1c3149"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "76%",
      rotation: -90,
      circumference: 360,
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
};

const renderScores = (scores) => {
  const entries = Object.entries(scores).filter(([key]) => key !== "overall_trust");
  const labels = entries.map(([key]) => SCORE_LABELS[key] || key.replaceAll("_", " "));
  const values = entries.map(([, value]) => value);
  const colors = values.map((v) => (v < 60 ? "#ff6b6b" : v < 80 ? "#ffd166" : "#6cbaff"));

  if (scoresChart) scoresChart.destroy();
  scoresChart = new Chart(byId("scores-chart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, barThickness: 22 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: "#20384e" },
          ticks: { color: "#a9c0d5", font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: "#c4d7e9", font: { size: 12 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
};

const renderTimeline = () => {
  const canvas = byId("timeline-chart");
  const emptyMsg = byId("timeline-empty");

  if (eventLog.length === 0) {
    if (timelineChart) {
      timelineChart.destroy();
      timelineChart = null;
    }
    canvas.hidden = true;
    emptyMsg.hidden = false;
    return;
  }

  canvas.hidden = false;
  emptyMsg.hidden = true;

  // build cumulative counts per event type across the session timeline
  const stamps = [0, ...eventLog.map((e) => e.t)];
  const uniqueTimes = [...new Set(stamps)].sort((a, b) => a - b);

  const cumulative = (type) => {
    let running = 0;
    return uniqueTimes.map((t) => {
      running += eventLog.filter((e) => e.type === type && e.t === t).length;
      return running;
    });
  };

  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: uniqueTimes.map((t) => `${t}s`),
      datasets: [
        { label: "Corrections", data: cumulative("backspace"), borderColor: "#6cbaff", backgroundColor: "rgba(108,186,255,0.1)", tension: 0.3, pointRadius: 3, borderWidth: 2, fill: true },
        { label: "Pastes", data: cumulative("paste"), borderColor: "#ffd166", backgroundColor: "rgba(255,209,102,0.1)", tension: 0.3, pointRadius: 3, borderWidth: 2, fill: true },
        { label: "Focus losses", data: cumulative("focus_loss"), borderColor: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.1)", tension: 0.3, pointRadius: 3, borderWidth: 2, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: "#a9c0d5", font: { size: 10 } } },
        y: { min: 0, grid: { color: "#20384e" }, ticks: { color: "#a9c0d5", font: { size: 10 }, stepSize: 1 } }
      },
      plugins: { legend: { display: false } }
    }
  });

  byId("timeline-chart").parentElement.insertAdjacentHTML(
    "afterend",
    `<div class="chart-legend">
      <span><i style="background:#6cbaff"></i>Corrections</span>
      <span><i style="background:#ffd166"></i>Pastes</span>
      <span><i style="background:#ff6b6b"></i>Focus losses</span>
    </div>`
  );
};

  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(byId("timeline-chart"), {
    type: "line",
    data: {
      labels: uniqueTimes.map((t) => `${t}s`),
      datasets: [
        { label: "Corrections", data: cumulative("backspace"), borderColor: "#6cbaff", backgroundColor: "rgba(108,186,255,0.1)", tension: 0.3, pointRadius: 3, borderWidth: 2, fill: true },
        { label: "Pastes", data: cumulative("paste"), borderColor: "#ffd166", backgroundColor: "rgba(255,209,102,0.1)", tension: 0.3, pointRadius: 3, borderWidth: 2, fill: true },
        { label: "Focus losses", data: cumulative("focus_loss"), borderColor: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.1)", tension: 0.3, pointRadius: 3, borderWidth: 2, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: "#a9c0d5", font: { size: 10 } } },
        y: { min: 0, grid: { color: "#20384e" }, ticks: { color: "#a9c0d5", font: { size: 10 }, stepSize: 1 } }
      },
      plugins: { legend: { display: false } }
    }
  });

  byId("timeline-chart").parentElement.insertAdjacentHTML(
    "afterend",
    `<div class="chart-legend">
      <span><i style="background:#6cbaff"></i>Corrections</span>
      <span><i style="background:#ffd166"></i>Pastes</span>
      <span><i style="background:#ff6b6b"></i>Focus losses</span>
    </div>`
  );


document.querySelector("#risk-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = { ...behaviour };
  event.currentTarget.querySelectorAll("input[name]").forEach((input) => {
    payload[input.name] =
      input.type === "checkbox" ? input.checked : Number(input.value);
  });

  const response = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    alert(data.error || "Invalid input");
    return;
  }

  // remove any previously injected legend before re-rendering
  document.querySelectorAll(".chart-legend").forEach((el) => el.remove());

  byId("result").hidden = false;

  const decisionKey = data.risk_decision.toLowerCase();
  byId("decision").textContent = data.risk_decision;
  byId("decision").className = decisionKey;
  byId("score").textContent = data.scores.overall_trust;

  renderGauge(data.scores.overall_trust, decisionKey);
  renderScores(data.scores);
  renderTimeline();

  byId("reasons").innerHTML = data.reasons
    .map((reason) => `<li>${reason}</li>`)
    .join("");
  byId("settlement").textContent = data.settlement_action.replaceAll("_", " ");
  byId("privacy").textContent = data.privacy_note;
});
