# PharmAI — Batch Manufacturing Intelligence Dashboard

> A Round 2 hackathon prototype: AI-powered pharmaceutical tablet manufacturing quality prediction & optimization.

## 🎯 What This Does

This dashboard integrates **two AI approaches** into one unified interface:

| Approach | What it does |
|---|---|
| **ML Prediction Engine** | Given process parameters (compression force, machine speed, drying temp, etc.), predicts tablet quality attributes (hardness, dissolution, friability, etc.) in real-time |
| **Optimization Engine** | Finds the best set of process parameters to achieve a chosen objective (max dissolution, balanced quality, min energy) using Pareto-front search |

## 🧪 Dataset

Real pharmaceutical tablet manufacturing data across **60 batches** with:
- **7 process parameters**: granulation time, binder amount, drying temperature/time, compression force, machine speed, lubricant concentration
- **7 quality attributes**: hardness, friability, disintegration time, dissolution rate, tablet weight, content uniformity, moisture

## 🚀 Run Locally

```bash
npm install
npm start
```

Opens at `http://localhost:3000`

## 🌐 Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect this repo on [vercel.com](https://vercel.com) — it auto-detects Create React App.

## 📁 Project Structure

```
src/
  App.jsx       # Main dashboard with 4 tabs
  data.js       # Dataset + ML model + Optimizer
  index.js      # Entry point
public/
  index.html
```

## 🔬 How the ML Model Works

The prediction engine uses a **multi-output regression** approach trained on the 60-batch dataset. For the prototype, the relationships are encoded as physics-informed polynomial functions:

- **Hardness** ↑ with compression force (quadratic), ↓ with machine speed
- **Friability** ↓ as hardness ↑ (inverse relationship)
- **Dissolution** ↓ as compression force ↑ (denser tablets dissolve slower)
- **Disintegration** ↑ with compression force

In production, this would be replaced with a trained XGBoost/Random Forest model via a Python API.

## ⚙️ How the Optimizer Works

The optimizer uses **Pareto-front search** to find process parameters that simultaneously satisfy multiple quality objectives. Six preset objectives are available:
- Balanced (all specs)
- Max Dissolution
- Max Hardness  
- Min Friability
- Min Energy
- Fastest Batch

The convergence curve shows the optimization progress in real-time.

## 🏆 Golden Signature Framework

Based on the hackathon proposal (Track B), the optimizer identifies "Golden Signatures" — optimal parameter sets for specific quality targets. These can be saved and reused for future batch setup.

## Tech Stack

- React 18
- Recharts (data visualization)
- Lucide React (icons)
- Pure CSS (no Tailwind needed)
- Deployed via Vercel / GitHub Pages
