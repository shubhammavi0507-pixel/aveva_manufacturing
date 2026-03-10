import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, ScatterChart, Scatter, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ReferenceLine, Cell
} from "recharts";
import { PRODUCTION_DATA, SPEC_LIMITS, PARAM_RANGES, mlPredict, optimize, getQualityScore } from "./data";

// ─── Palette ───────────────────────────────────────────────────────────
const C = {
  bg: "#0a0c10",
  panel: "#0f1219",
  border: "#1a2030",
  accent: "#00e5b0",
  accent2: "#7b61ff",
  accent3: "#ff6b35",
  warn: "#f5a623",
  danger: "#ff4757",
  text: "#e8edf5",
  muted: "#5a6a82",
  gridLine: "#141a26",
};

const styles = {
  app: {
    background: C.bg,
    minHeight: "100vh",
    color: C.text,
    fontFamily: "'Syne', sans-serif",
    padding: "0",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 32px",
    borderBottom: `1px solid ${C.border}`,
    background: C.panel,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" },
  logoAccent: { color: C.accent },
  tabs: { display: "flex", gap: 4 },
  tab: (active) => ({
    padding: "7px 18px",
    borderRadius: 8,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? `${C.accent}18` : "transparent",
    color: active ? C.accent : C.muted,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Syne', sans-serif",
    transition: "all 0.2s",
    letterSpacing: "0.3px",
  }),
  badge: {
    background: `${C.accent}22`,
    color: C.accent,
    border: `1px solid ${C.accent}44`,
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.5px",
    fontFamily: "'DM Mono', monospace",
  },
  content: { padding: "28px 32px", maxWidth: 1600, margin: "0 auto" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 },
  panel: (accent) => ({
    background: C.panel,
    border: `1px solid ${accent ? accent + "44" : C.border}`,
    borderRadius: 14,
    padding: "22px 24px",
  }),
  panelTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "2px",
    color: C.muted,
    marginBottom: 16,
    textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  },
  kpi: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: "20px 22px",
    position: "relative",
    overflow: "hidden",
  },
  kpiValue: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
  kpiLabel: { fontSize: 12, color: C.muted, marginTop: 6, fontFamily: "'DM Mono', monospace" },
  kpiDelta: (pos) => ({
    fontSize: 11,
    color: pos ? C.accent : C.danger,
    marginTop: 4,
    fontFamily: "'DM Mono', monospace",
  }),
  slider: {
    width: "100%",
    accentColor: C.accent,
    cursor: "pointer",
    height: 4,
  },
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    marginBottom: 6,
    fontFamily: "'DM Mono', monospace",
  },
  sliderValue: { color: C.accent, fontWeight: 600 },
  btn: (variant = "primary") => ({
    padding: "10px 22px",
    borderRadius: 10,
    border: variant === "primary" ? "none" : `1px solid ${C.accent}`,
    background: variant === "primary" ? C.accent : "transparent",
    color: variant === "primary" ? "#000" : C.accent,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Syne', sans-serif",
    transition: "all 0.2s",
    letterSpacing: "0.3px",
  }),
  tag: (color) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
  }),
  select: {
    background: "#141a26",
    border: `1px solid ${C.border}`,
    color: C.text,
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "'Syne', sans-serif",
    cursor: "pointer",
    outline: "none",
    width: "100%",
  },
};

// ─── Spec Status ───────────────────────────────────────────────────────
function inSpec(key, val) {
  const l = SPEC_LIMITS[key];
  if (!l) return true;
  return val >= l.low && val <= l.high;
}

function specStatus(key, val) {
  const l = SPEC_LIMITS[key];
  if (!l) return "ok";
  if (val < l.low || val > l.high) return "fail";
  const mid = (l.low + l.high) / 2;
  const range = (l.high - l.low) / 2;
  if (Math.abs(val - mid) / range > 0.7) return "warn";
  return "ok";
}

const STATUS_COLOR = { ok: C.accent, warn: C.warn, fail: C.danger };

// ─── Custom Tooltip ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f1219", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
      {label && <div style={{ color: C.muted, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.text }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong></div>
      ))}
    </div>
  );
};

// ─── KPI Card ──────────────────────────────────────────────────────────
function KPICard({ label, value, unit, delta, color = C.accent, sub }) {
  return (
    <div style={{ ...styles.kpi, borderTop: `2px solid ${color}` }}>
      <div style={{ ...styles.kpiValue, color }}>{value}<span style={{ fontSize: 14, fontWeight: 400, color: C.muted, marginLeft: 4 }}>{unit}</span></div>
      <div style={styles.kpiLabel}>{label}</div>
      {delta && <div style={styles.kpiDelta(delta > 0)}>{delta > 0 ? "↑" : "↓"} {Math.abs(delta)}% vs avg</div>}
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

// ─── Gauge ─────────────────────────────────────────────────────────────
function Gauge({ value, max = 100, label, color = C.accent }) {
  const pct = Math.min(100, (value / max) * 100);
  const r = 40, cx = 50, cy = 55;
  const circumference = Math.PI * r;
  const strokeDash = (pct / 100) * circumference;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="100" height="65" viewBox="0 0 100 65">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.gridLine} strokeWidth={8} />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={C.text} style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne'" }}>{value}</text>
      </svg>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace", marginTop: -4 }}>{label}</div>
    </div>
  );
}

// ─── Spec Bar ──────────────────────────────────────────────────────────
function SpecBar({ label, value, spec, unit }) {
  const pct = ((value - spec.low) / (spec.high - spec.low)) * 100;
  const status = specStatus(label.toLowerCase().replace(" ", ""), value);
  const color = STATUS_COLOR[status];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.muted }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color }}>{value} {unit} <span style={styles.tag(color)}>{status.toUpperCase()}</span></span>
      </div>
      <div style={{ position: "relative", height: 6, background: C.border, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: "25%", right: "25%", height: "100%", background: `${C.accent}22`, borderRadius: 3 }} />
        <div style={{
          position: "absolute", left: `${Math.max(0, Math.min(100, pct))}%`,
          transform: "translateX(-50%)", width: 10, height: 10, borderRadius: "50%",
          background: color, top: -2, transition: "left 0.6s ease", boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{spec.low}</span>
        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{spec.high}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── TAB: OVERVIEW ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function Overview() {
  const recent = PRODUCTION_DATA.slice(-10);
  const avgDiss = (PRODUCTION_DATA.reduce((s, r) => s + r.dissolution, 0) / PRODUCTION_DATA.length).toFixed(1);
  const passCount = PRODUCTION_DATA.filter(r =>
    inSpec("hardness", r.hardness) && inSpec("friability", r.friability) &&
    inSpec("dissolution", r.dissolution) && inSpec("uniformity", r.uniformity)
  ).length;
  const passRate = ((passCount / PRODUCTION_DATA.length) * 100).toFixed(0);
  const avgHardness = (PRODUCTION_DATA.reduce((s, r) => s + r.hardness, 0) / PRODUCTION_DATA.length).toFixed(0);

  const trendData = PRODUCTION_DATA.map((r, i) => ({
    batch: r.id,
    dissolution: r.dissolution,
    hardness: r.hardness,
    friability: r.friability,
    score: getQualityScore(r),
  }));

  const scatterData = PRODUCTION_DATA.map(r => ({
    x: r.compForce,
    y: r.hardness,
    id: r.id,
    pass: inSpec("hardness", r.hardness),
  }));

  return (
    <div>
      <div style={styles.grid4}>
        <KPICard label="BATCH PASS RATE" value={passRate} unit="%" color={passRate > 85 ? C.accent : C.warn} delta={+3.2} />
        <KPICard label="AVG DISSOLUTION" value={avgDiss} unit="%" color={C.accent2} delta={+1.1} />
        <KPICard label="AVG HARDNESS" value={avgHardness} unit="N" color={C.accent3} />
        <KPICard label="TOTAL BATCHES" value={PRODUCTION_DATA.length} unit="" color={C.warn} sub="60 analyzed batches" />
      </div>

      <div style={styles.grid2}>
        <div style={styles.panel()}>
          <div style={styles.panelTitle}>Quality Score Trend — All Batches</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
              <XAxis dataKey="batch" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} interval={9} />
              <YAxis tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} domain={[50, 105]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={85} stroke={C.warn} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="score" stroke={C.accent} strokeWidth={2} dot={false} name="Quality Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.panel()}>
          <div style={styles.panelTitle}>Compression Force vs Hardness</div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
              <XAxis dataKey="x" name="Comp. Force (kN)" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} />
              <YAxis dataKey="y" name="Hardness (N)" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatterData} name="Batch">
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.pass ? C.accent : C.danger} opacity={0.75} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.panel()}>
          <div style={styles.panelTitle}>Dissolution Rate Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={PRODUCTION_DATA.map(r => ({ id: r.id, v: r.dissolution }))} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
              <XAxis dataKey="id" tick={{ fill: C.muted, fontSize: 9, fontFamily: "'DM Mono'" }} interval={9} />
              <YAxis tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} domain={[78, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={85} stroke={C.danger} strokeDasharray="3 3" label={{ value: "Min", fill: C.danger, fontSize: 10 }} />
              <Bar dataKey="v" name="Dissolution %" radius={[3, 3, 0, 0]}>
                {PRODUCTION_DATA.map((r, i) => (
                  <Cell key={i} fill={inSpec("dissolution", r.dissolution) ? C.accent2 : C.danger} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.panel()}>
          <div style={styles.panelTitle}>Golden Signature Batches (Top 10)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Batch", "Dissolution", "Hardness", "Friability", "Score"].map(h => (
                    <th key={h} style={{ padding: "6px 10px", color: C.muted, fontWeight: 600, textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...PRODUCTION_DATA].sort((a, b) => getQualityScore(b) - getQualityScore(a)).slice(0, 10).map(r => {
                  const score = getQualityScore(r);
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.gridLine}` }}>
                      <td style={{ padding: "7px 10px", color: C.accent, fontWeight: 700 }}>{r.id}</td>
                      <td style={{ padding: "7px 10px" }}>{r.dissolution}%</td>
                      <td style={{ padding: "7px 10px" }}>{r.hardness}N</td>
                      <td style={{ padding: "7px 10px" }}>{r.friability}%</td>
                      <td style={{ padding: "7px 10px" }}>
                        <span style={{ ...styles.tag(score > 90 ? C.accent : C.warn) }}>{score}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── TAB: ML PREDICTOR ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function MLPredictor() {
  const defaults = { granTime: 15, binder: 8.5, dryTemp: 60, dryTime: 25, compForce: 12.5, machSpeed: 150, lubConc: 1.0 };
  const [params, setParams] = useState(defaults);
  const [prediction, setPrediction] = useState(mlPredict(defaults));
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handlePredict = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const pred = mlPredict(params);
      setPrediction(pred);
      const score = getQualityScore(pred);
      setHistory(h => [{ ...params, ...pred, score, ts: Date.now() }, ...h].slice(0, 6));
      setLoading(false);
    }, 600);
  }, [params]);

  useEffect(() => { handlePredict(); }, []);

  const score = getQualityScore(prediction);
  const radarData = [
    { metric: "Hardness", value: ((prediction.hardness - 50) / 90) * 100 },
    { metric: "Dissolution", value: ((prediction.dissolution - 78) / 22) * 100 },
    { metric: "Uniformity", value: ((prediction.uniformity - 90) / 20) * 100 },
    { metric: "Friability\n(inv)", value: ((1.5 - prediction.friability) / 1.4) * 100 },
    { metric: "Disint.\n(inv)", value: ((20 - prediction.disintegration) / 18) * 100 },
  ];

  return (
    <div>
      <div style={{ ...styles.panel(C.accent2), marginBottom: 20, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>ML Prediction Engine</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
            Multi-output regression · Ensemble model (XGBoost + Linear) · Trained on 60 batches
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Gauge value={score} label="Quality Score" color={score > 85 ? C.accent : score > 65 ? C.warn : C.danger} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
        {/* Left: sliders */}
        <div style={styles.panel()}>
          <div style={styles.panelTitle}>Process Parameters — Input</div>
          {Object.entries(PARAM_RANGES).map(([key, range]) => (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={styles.sliderLabel}>
                <span style={{ color: C.muted }}>{range.label}</span>
                <span style={styles.sliderValue}>{params[key]} {range.unit}</span>
              </div>
              <input
                type="range"
                min={range.min} max={range.max} step={range.step}
                value={params[key]}
                onChange={e => setParams(p => ({ ...p, [key]: +e.target.value }))}
                style={styles.slider}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono'" }}>{range.min}</span>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono'" }}>{range.max}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={styles.btn("primary")} onClick={handlePredict} disabled={loading}>
              {loading ? "Predicting…" : "▶ Run Prediction"}
            </button>
            <button style={styles.btn("outline")} onClick={() => { setParams(defaults); setTimeout(handlePredict, 100); }}>Reset</button>
          </div>
        </div>

        {/* Right: results */}
        <div>
          <div style={{ ...styles.panel(), marginBottom: 16 }}>
            <div style={styles.panelTitle}>Predicted Quality Attributes</div>
            <SpecBar label="Hardness" value={prediction.hardness} spec={SPEC_LIMITS.hardness} unit="N" />
            <SpecBar label="Friability" value={prediction.friability} spec={SPEC_LIMITS.friability} unit="%" />
            <SpecBar label="Disintegration" value={prediction.disintegration} spec={SPEC_LIMITS.disintegration} unit="min" />
            <SpecBar label="Dissolution" value={prediction.dissolution} spec={SPEC_LIMITS.dissolution} unit="%" />
            <SpecBar label="Weight" value={prediction.weight} spec={SPEC_LIMITS.weight} unit="mg" />
            <SpecBar label="Uniformity" value={prediction.uniformity} spec={SPEC_LIMITS.uniformity} unit="%" />
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: `${score > 85 ? C.accent : score > 65 ? C.warn : C.danger}18`, border: `1px solid ${score > 85 ? C.accent : score > 65 ? C.warn : C.danger}44` }}>
              <span style={{ fontSize: 12, fontFamily: "'DM Mono'", color: score > 85 ? C.accent : score > 65 ? C.warn : C.danger }}>
                {score > 85 ? "✓ BATCH PREDICTED TO PASS ALL SPECS" : score > 65 ? "⚠ SOME SPECS MAY BE OUT OF RANGE" : "✗ BATCH LIKELY TO FAIL QC"}
              </span>
            </div>
          </div>

          <div style={styles.panel()}>
            <div style={styles.panelTitle}>Quality Radar</div>
            <ResponsiveContainer width="100%" height={170}>
              <RadarChart data={radarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} />
                <Radar dataKey="value" stroke={C.accent2} fill={C.accent2} fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {history.length > 1 && (
        <div style={{ ...styles.panel(), marginTop: 20 }}>
          <div style={styles.panelTitle}>Prediction History</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["#", "CompForce", "MachSpeed", "DryTemp", "Hardness", "Dissolution", "Friability", "Score"].map(h => (
                    <th key={h} style={{ padding: "6px 10px", color: C.muted, textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const sc = h.score;
                  return (
                    <tr key={h.ts} style={{ borderBottom: `1px solid ${C.gridLine}`, opacity: i === 0 ? 1 : 0.6 + i * 0.05 }}>
                      <td style={{ padding: "6px 10px", color: C.muted }}>{history.length - i}</td>
                      <td style={{ padding: "6px 10px" }}>{h.compForce}kN</td>
                      <td style={{ padding: "6px 10px" }}>{h.machSpeed}rpm</td>
                      <td style={{ padding: "6px 10px" }}>{h.dryTemp}°C</td>
                      <td style={{ padding: "6px 10px" }}>{h.hardness}N</td>
                      <td style={{ padding: "6px 10px" }}>{h.dissolution}%</td>
                      <td style={{ padding: "6px 10px" }}>{h.friability}%</td>
                      <td style={{ padding: "6px 10px" }}><span style={styles.tag(sc > 85 ? C.accent : sc > 65 ? C.warn : C.danger)}>{sc}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── TAB: OPTIMIZER ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function Optimizer() {
  const [objective, setObjective] = useState("balanced");
  const [optimized, setOptimized] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [iterations, setIterations] = useState([]);

  const objectives = [
    { value: "balanced", label: "⚖ Balanced (All specs)", desc: "Pareto-optimal across all quality attributes" },
    { value: "maxDissolution", label: "💊 Max Dissolution", desc: "Prioritize bioavailability & release rate" },
    { value: "maxHardness", label: "🔩 Max Hardness", desc: "Prioritize mechanical strength" },
    { value: "minFriability", label: "🛡 Min Friability", desc: "Minimize tablet breakage risk" },
    { value: "minEnergy", label: "⚡ Min Energy Use", desc: "Reduce power consumption" },
    { value: "fastBatch", label: "⏱ Fastest Batch", desc: "Minimize total cycle time" },
  ];

  const runOptimize = () => {
    setRunning(true);
    setProgress(0);
    setOptimized(null);
    setIterations([]);
    let prog = 0;
    const iters = [];
    const interval = setInterval(() => {
      prog += Math.random() * 8 + 4;
      if (prog > 100) prog = 100;
      setProgress(+prog.toFixed(0));
      // simulate convergence
      const roughParams = optimize(objective);
      const noise = 1 - prog / 100;
      const noisyParams = Object.fromEntries(
        Object.entries(roughParams).map(([k, v]) => [k, +(v * (1 + (Math.random() - 0.5) * noise * 0.3)).toFixed(2)])
      );
      const pred = mlPredict(noisyParams);
      iters.push({ iter: iters.length + 1, score: getQualityScore(pred), dissolution: pred.dissolution });
      setIterations([...iters]);
      if (prog >= 100) {
        clearInterval(interval);
        const finalParams = optimize(objective);
        const finalPred = mlPredict(finalParams);
        setOptimized({ params: finalParams, prediction: finalPred, score: getQualityScore(finalPred) });
        setRunning(false);
      }
    }, 120);
  };

  return (
    <div>
      <div style={{ ...styles.panel(C.accent3), marginBottom: 20 }}>
        <div style={styles.panelTitle}>Optimization Objective</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {objectives.map(obj => (
            <div key={obj.value}
              onClick={() => { setObjective(obj.value); setOptimized(null); }}
              style={{
                padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                border: `1px solid ${objective === obj.value ? C.accent3 : C.border}`,
                background: objective === obj.value ? `${C.accent3}18` : "transparent",
                transition: "all 0.2s",
              }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{obj.label}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono'" }}>{obj.desc}</div>
            </div>
          ))}
        </div>
        <button style={{ ...styles.btn("primary"), background: C.accent3, width: 220 }} onClick={runOptimize} disabled={running}>
          {running ? `Optimizing… ${progress}%` : "▶ Run Optimization Engine"}
        </button>

        {running && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent3}, ${C.accent})`, borderRadius: 3, transition: "width 0.15s" }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontFamily: "'DM Mono'" }}>
              Pareto-front search · {progress < 40 ? "Initializing population…" : progress < 70 ? "Evaluating candidates…" : "Converging solution…"}
            </div>
          </div>
        )}
      </div>

      {iterations.length > 2 && (
        <div style={{ ...styles.panel(), marginBottom: 20 }}>
          <div style={styles.panelTitle}>Convergence Curve</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={iterations} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
              <XAxis dataKey="iter" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} label={{ value: "Iteration", fill: C.muted, fontSize: 10, position: "insideBottom", offset: -2 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} domain={[40, 105]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="score" stroke={C.accent3} strokeWidth={2} dot={false} name="Quality Score" />
              <Line type="monotone" dataKey="dissolution" stroke={C.accent} strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Dissolution%" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {optimized && (
        <div style={styles.grid2}>
          <div style={styles.panel()}>
            <div style={styles.panelTitle}>Optimal Process Parameters</div>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <Gauge value={optimized.score} label="Opt. Score" color={optimized.score > 85 ? C.accent : C.warn} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.accent3 }}>Golden Signature Found</div>
                <div style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono'", marginTop: 4 }}>
                  Objective: {objectives.find(o => o.value === objective)?.label}
                </div>
              </div>
            </div>
            {Object.entries(PARAM_RANGES).map(([key, range]) => {
              const val = optimized.params[key];
              const pct = ((val - range.min) / (range.max - range.min)) * 100;
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono'", color: C.muted }}>{range.label}</span>
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono'", color: C.accent3, fontWeight: 700 }}>{val} {range.unit}</span>
                  </div>
                  <div style={{ height: 5, background: C.border, borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent3}88, ${C.accent3})`, borderRadius: 3, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.panel()}>
            <div style={styles.panelTitle}>Predicted Outcomes</div>
            <SpecBar label="Hardness" value={optimized.prediction.hardness} spec={SPEC_LIMITS.hardness} unit="N" />
            <SpecBar label="Friability" value={optimized.prediction.friability} spec={SPEC_LIMITS.friability} unit="%" />
            <SpecBar label="Disintegration" value={optimized.prediction.disintegration} spec={SPEC_LIMITS.disintegration} unit="min" />
            <SpecBar label="Dissolution" value={optimized.prediction.dissolution} spec={SPEC_LIMITS.dissolution} unit="%" />
            <SpecBar label="Weight" value={optimized.prediction.weight} spec={SPEC_LIMITS.weight} unit="mg" />
            <SpecBar label="Uniformity" value={optimized.prediction.uniformity} spec={SPEC_LIMITS.uniformity} unit="%" />
            <div style={{ marginTop: 12 }}>
              <button style={{ ...styles.btn("primary"), background: C.accent2, width: "100%" }}
                onClick={() => alert(`Golden Signature saved!\n\nComp. Force: ${optimized.params.compForce}kN\nMachine Speed: ${optimized.params.machSpeed}rpm\nDrying Temp: ${optimized.params.dryTemp}°C\nQuality Score: ${optimized.score}`)}>
                ⭐ Save as Golden Signature
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...styles.panel(), marginTop: 20 }}>
        <div style={styles.panelTitle}>Pareto Front — Dissolution vs Hardness Trade-off</div>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
            <XAxis dataKey="x" name="Hardness (N)" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} label={{ value: "Hardness (N)", fill: C.muted, fontSize: 10, position: "insideBottom", offset: -2 }} />
            <YAxis dataKey="y" name="Dissolution (%)" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} label={{ value: "Dissolution %", fill: C.muted, fontSize: 10, angle: -90, position: "insideLeft" }} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={PRODUCTION_DATA.map(r => ({ x: r.hardness, y: r.dissolution, id: r.id }))}
              name="Batch" fill={C.accent2} opacity={0.6}
            />
            {optimized && (
              <Scatter
                data={[{ x: optimized.prediction.hardness, y: optimized.prediction.dissolution }]}
                name="Optimized" fill={C.accent3}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── TAB: BATCH EXPLORER ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function BatchExplorer() {
  const [selected, setSelected] = useState("T001");
  const [sortKey, setSortKey] = useState("id");
  const [filter, setFilter] = useState("all");

  const batch = PRODUCTION_DATA.find(r => r.id === selected);
  const score = batch ? getQualityScore(batch) : 0;

  const filtered = PRODUCTION_DATA.filter(r => {
    if (filter === "pass") return getQualityScore(r) >= 85;
    if (filter === "warn") { const s = getQualityScore(r); return s >= 65 && s < 85; }
    if (filter === "fail") return getQualityScore(r) < 65;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "id") return a.id.localeCompare(b.id);
    return (b[sortKey] || 0) - (a[sortKey] || 0);
  });

  const processData = batch ? [
    { phase: "Granulation", value: batch.granTime, max: 22 },
    { phase: "Binder", value: batch.binder, max: 11 },
    { phase: "Drying", value: batch.dryTime / 4, max: 10 },
    { phase: "CompForce", value: batch.compForce, max: 18 },
    { phase: "Speed/10", value: batch.machSpeed / 10, max: 22 },
    { phase: "Lubricant×10", value: batch.lubConc * 10, max: 20 },
  ] : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 20 }}>
      <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          {["all", "pass", "warn", "fail"].map(f => (
            <button key={f} style={{ ...styles.tab(filter === f), fontSize: 12 }} onClick={() => setFilter(f)}>
              {f.toUpperCase()} ({f === "all" ? PRODUCTION_DATA.length : PRODUCTION_DATA.filter(r => {
                const s = getQualityScore(r);
                if (f === "pass") return s >= 85;
                if (f === "warn") return s >= 65 && s < 85;
                return s < 65;
              }).length})
            </button>
          ))}
          <select value={sortKey} onChange={e => setSortKey(e.target.value)} style={{ ...styles.select, width: 160 }}>
            <option value="id">Sort: Batch ID</option>
            <option value="dissolution">Sort: Dissolution</option>
            <option value="hardness">Sort: Hardness</option>
            <option value="friability">Sort: Friability</option>
          </select>
        </div>

        <div style={{ ...styles.panel(), maxHeight: 540, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
            <thead style={{ position: "sticky", top: 0, background: C.panel }}>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Batch", "Dissolution", "Hardness", "Friability", "Weight", "Uniformity", "Score"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", color: C.muted, fontWeight: 600, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const sc = getQualityScore(r);
                const isSelected = r.id === selected;
                return (
                  <tr key={r.id}
                    onClick={() => setSelected(r.id)}
                    style={{
                      borderBottom: `1px solid ${C.gridLine}`,
                      background: isSelected ? `${C.accent}10` : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}>
                    <td style={{ padding: "7px 10px", color: isSelected ? C.accent : C.text, fontWeight: isSelected ? 700 : 400 }}>{r.id}</td>
                    <td style={{ padding: "7px 10px", color: inSpec("dissolution", r.dissolution) ? C.accent : C.danger }}>{r.dissolution}%</td>
                    <td style={{ padding: "7px 10px", color: inSpec("hardness", r.hardness) ? C.text : C.danger }}>{r.hardness}N</td>
                    <td style={{ padding: "7px 10px", color: inSpec("friability", r.friability) ? C.text : C.danger }}>{r.friability}%</td>
                    <td style={{ padding: "7px 10px", color: inSpec("weight", r.weight) ? C.text : C.warn }}>{r.weight}mg</td>
                    <td style={{ padding: "7px 10px", color: inSpec("uniformity", r.uniformity) ? C.text : C.warn }}>{r.uniformity}%</td>
                    <td style={{ padding: "7px 10px" }}><span style={styles.tag(sc >= 85 ? C.accent : sc >= 65 ? C.warn : C.danger)}>{sc}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        {batch && (
          <>
            <div style={{ ...styles.panel(C.accent2), marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>Batch {batch.id}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: "'DM Mono'" }}>Detailed Analysis</div>
                </div>
                <Gauge value={score} label="Score" color={score >= 85 ? C.accent : score >= 65 ? C.warn : C.danger} />
              </div>
              <div style={{ marginTop: 16 }}>
                <SpecBar label="Dissolution" value={batch.dissolution} spec={SPEC_LIMITS.dissolution} unit="%" />
                <SpecBar label="Hardness" value={batch.hardness} spec={SPEC_LIMITS.hardness} unit="N" />
                <SpecBar label="Friability" value={batch.friability} spec={SPEC_LIMITS.friability} unit="%" />
                <SpecBar label="Weight" value={batch.weight} spec={SPEC_LIMITS.weight} unit="mg" />
                <SpecBar label="Uniformity" value={batch.uniformity} spec={SPEC_LIMITS.uniformity} unit="%" />
              </div>
            </div>

            <div style={styles.panel()}>
              <div style={styles.panelTitle}>Process Parameters</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={processData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.muted, fontSize: 9, fontFamily: "'DM Mono'" }} />
                  <YAxis type="category" dataKey="phase" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono'" }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={C.accent2} radius={[0, 4, 4, 0]} name="Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── APP ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "predictor", label: "ML Predictor" },
  { id: "optimizer", label: "Optimizer" },
  { id: "explorer", label: "Batch Explorer" },
];

export default function App() {
  const [tab, setTab] = useState("overview");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={styles.app}>
      <div style={styles.topbar}>
        <div style={styles.logo}>
          Pharm<span style={styles.logoAccent}>AI</span>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 400, marginLeft: 12, fontFamily: "'DM Mono'" }}>
            Batch Manufacturing Intelligence
          </span>
        </div>
        <div style={styles.tabs}>
          {TABS.map(t => (
            <button key={t.id} style={styles.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ ...styles.badge, background: `${C.accent}18` }}>● LIVE</span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono'" }}>
            {now.toLocaleDateString()} {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {tab === "overview" && <Overview />}
        {tab === "predictor" && <MLPredictor />}
        {tab === "optimizer" && <Optimizer />}
        {tab === "explorer" && <BatchExplorer />}
      </div>
    </div>
  );
}
