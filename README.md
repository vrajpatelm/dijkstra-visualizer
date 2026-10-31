# Dijkstra Visualizer 🔬⚡

An interactive, presentation-ready web application for exploring and demonstrating **Dijkstra's Shortest Path Algorithm** on weighted graphs.

Built with **Django** (Python) and **Vanilla HTML5 Canvas / Modern Glassmorphism CSS / ES6+ JavaScript**.

![Dijkstra Visualizer](https://img.shields.io/badge/Algorithm-Dijkstra-blue)
![Python](https://img.shields.io/badge/Python-3.10%2B-green)
![Django](https://img.shields.io/badge/Django-5.0%2B-blueviolet)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## ✨ Features

- **Interactive Graph Construction**:
  - Add vertices with custom names/codes (`+ Node` mode).
  - Connect edges with custom weights and labels (`+ Edge` mode).
  - Rearrange nodes dynamically in `Move` mode.
  - Delete nodes or edges in `Delete` mode.
  - Double-click any node to rename or delete.
  - Click any edge to modify its weight.
- **Instant Random Graphs & Presets**:
  - One-click `Random Graph` generator ensuring connectivity with automatic route tracing.
  - Preset graphs including US Interstate, Euro Transit, Tokyo Transit, and a Dense 10-Node Web.
- **Step-by-Step Algorithm HUD**:
  - Min-Heap Priority Queue visualizer.
  - Edge relaxation live formula card ($dist[v] = \min(old, dist[u] + weight)$).
  - Neighbor evaluation breakdown (Relaxed vs. Settled vs. Not Shorter).
  - Shortest distance table with live node status pills.
  - Play, pause, step forward/backward, and playback speed control slider.
- **Theatrical Canvas Visuals**:
  - HiDPI Retina canvas scaling (`devicePixelRatio`) for ultra-sharp text and graphics.
  - Active popped node spotlight banner.
  - Animated directional chevrons on relaxed edges.
  - Confirmed shortest-path tree overlay with directional arrows.
  - Theatrical dimming of unvisited and non-participating nodes.
- **Academic Tools**:
  - Live Adjacency List display.
  - Export & Import graphs as JSON for saving or presenting custom test graphs.
  - Built-in **Presentation Guide** dialog explaining algorithm theory, complexity ($O((V+E)\log V)$), and edge cases.
  - Synthesized Web Audio sound effects for edge relaxation and route discovery.

---

## 🚀 Quick Start

### Automated Setup

**Windows (PowerShell):**
```powershell
.\setup.ps1 -RunServer
```

**Windows (Command Prompt):**
```cmd
setup.bat --run
```

**Linux / macOS:**
```bash
chmod +x setup.sh && ./setup.sh --run
```

Then open your browser at **http://127.0.0.1:8000/**.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `1` | Switch to **Move / Pan** Mode |
| `2` | Switch to **+ Node** Mode |
| `3` | Switch to **+ Edge** Mode |
| `4` | Switch to **Delete** Mode |
| `Space` | Play / Pause Algorithm Playback |
| `→` | Step Forward |
| `←` | Step Backward |
| `Esc` | Close Open Modals |
| `Scroll Wheel` | Zoom In / Out on Canvas |

---

## 📁 Project Structure

```
Dijkstra/
├── dijkstra_project/        # Django settings and URL routing
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── dijkstra_app/            # Main application
│   ├── algorithm.py         # Dijkstra algorithm engine (heapq)
│   ├── views.py             # HTTP view & JSON API endpoint
│   ├── templates/           # HTML templates
│   │   └── dijkstra_app/
│   │       └── index.html
│   └── static/              # Static CSS & JS assets
│       └── dijkstra_app/
│           ├── css/style.css
│           └── js/app.js
├── requirements.txt         # Minimal Python requirements (Django)
├── setup.bat                # Windows batch setup
├── setup.ps1                # PowerShell setup
├── setup.sh                 # Unix/macOS setup
├── AI_SETUP.md              # AI agent automated execution documentation
└── README.md                # Project documentation
```

---

## 📄 License

MIT License. Free to use for educational, demonstration, and research purposes.
