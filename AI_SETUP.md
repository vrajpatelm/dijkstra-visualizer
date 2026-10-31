# AI Setup & Agent Execution Guide

This document is designed for AI coding agents, autonomous runners, and developers to automatically set up, understand, and run the **Dijkstra Visualizer** project.

---

## 1. Project Overview & Architecture

- **Project Type**: Interactive Graph Theory & Dijkstra's Algorithm Visualizer.
- **Backend**: Python 3.10+ / Django 5.x (`manage.py`, minimal headless config, no database required, plain `JsonResponse`).
- **Frontend**: Single-page application with HTML5 Canvas, modern CSS glassmorphism, and vanilla JavaScript IIFE.
- **Key Modules**:
  - `dijkstra_project/`: Django root configuration (`settings.py`, `urls.py`).
  - `dijkstra_app/algorithm.py`: Core Dijkstra implementation using Python `heapq` with step-by-step relaxation tracking, skipped edges tracking, confirmed shortest-path tree, and formatted formula metadata.
  - `dijkstra_app/views.py`: Web views & API controller (`/` -> HTML UI, `POST /api/dijkstra/` -> algorithm execution).
  - `dijkstra_app/templates/dijkstra_app/index.html`: UI structure with canvas viewport, HUD sidebars, modals (Node edit, Edge edit, Presentation guide, Export/Import).
  - `dijkstra_app/static/dijkstra_app/css/style.css`: Responsive CSS theme with HiDPI support and animations.
  - `dijkstra_app/static/dijkstra_app/js/app.js`: Canvas renderer with HiDPI backing store scaling (`devicePixelRatio`), interaction handlers, Web Audio synthesizer sound effects, and playback stepper.

---

## 2. One-Command Setup (Automated)

### Windows (PowerShell)
```powershell
.\setup.ps1
```
Or start server immediately:
```powershell
.\setup.ps1 -RunServer
```

### Windows (CMD)
```cmd
setup.bat --run
```

### Linux / macOS / WSL
```bash
chmod +x setup.sh && ./setup.sh --run
```

---

## 3. Manual Step-by-Step Setup

```bash
# 1. Create Python virtual environment
python -m venv .venv

# 2. Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Verify system configuration
python manage.py check

# 5. Run the web server
python manage.py runserver 8000
```

Once running, navigate to: `http://127.0.0.1:8000/`

---

## 4. API Specification for AI Testing

### `POST /api/dijkstra/`
Computes the single-source shortest path and full relaxation step telemetry.

**Request Headers**: `Content-Type: application/json`

**Payload Schema**:
```json
{
  "nodes": ["A", "B", "C", "D"],
  "edges": [
    {"from": "A", "to": "B", "weight": 4, "name": "e1"},
    {"from": "B", "to": "C", "weight": 2, "name": "e2"},
    {"from": "A", "to": "C", "weight": 7, "name": "e3"},
    {"from": "C", "to": "D", "weight": 1, "name": "e4"}
  ],
  "source": "A",
  "target": "D"
}
```

**Response Schema (200 OK)**:
```json
{
  "source": "A",
  "target": "D",
  "shortest_path": ["A", "B", "C", "D"],
  "shortest_distance": 7,
  "route_legs": [
    {"from": "A", "to": "B", "road": "e1", "distance": 4},
    {"from": "B", "to": "C", "road": "e2", "distance": 2},
    {"from": "C", "to": "D", "road": "e4", "distance": 1}
  ],
  "steps": [
    {
      "step": 1,
      "current_node": "A",
      "current_dist": 0,
      "visited": ["A"],
      "relaxed_edges": [
        {"from": "A", "to": "B", "road_name": "e1", "weight": 4, "old_dist": null, "new_dist": 4, "formula": "0 + 4 = 4"}
      ],
      "skipped_edges": [],
      "priority_queue": [{"node": "B", "dist": 4}, {"node": "C", "dist": 7}],
      "distances": {"A": 0, "B": 4, "C": 7, "D": null},
      "previous": {"B": "A", "C": "A"}
    }
  ]
}
```

---

## 5. UI Features & Keyboard Shortcuts

- **Modes**:
  - `1` or **Move / Pan**: Drag nodes to reposition; drag canvas background to pan; scroll wheel to zoom. Double-click node to rename; click edge to edit weight.
  - `2` or **+ Node**: Click canvas to place a new vertex.
  - `3` or **+ Edge**: Click Node 1, then click Node 2 to connect.
  - `4` or **Delete**: Click any vertex or edge to remove it.
- **Playback Controls**:
  - `Space`: Play / Pause playback of algorithm execution.
  - `←` / `→`: Step backward / forward through edge relaxations.
- **Export / Import**:
  - Click **Export** in the top bar to export or import graph topologies as JSON.
