(() => {
  'use strict';

  const DPR = window.devicePixelRatio || 1;

  const SoundFX = (() => {
    let ctx = null;
    let enabled = true;

    function init() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    }

    function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.05) {
      if (!enabled) return;
      try {
        init();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (_) {}
    }

    return {
      toggle() { enabled = !enabled; return enabled; },
      isEnabled() { return enabled; },
      click() { playTone(580, 'sine', 0.04, 0.03); },
      nodeAdd() { playTone(440, 'triangle', 0.1, 0.05); },
      roadAdd() { playTone(660, 'sine', 0.12, 0.05); },
      relax() { playTone(880, 'sine', 0.06, 0.04); },
      found() {
        playTone(523.25, 'triangle', 0.15, 0.06);
        setTimeout(() => playTone(659.25, 'triangle', 0.18, 0.06), 80);
        setTimeout(() => playTone(783.99, 'triangle', 0.28, 0.08), 160);
      }
    };
  })();

  const NODE_CATALOG = [
    { name: 'A', code: 'A' }, { name: 'B', code: 'B' }, { name: 'C', code: 'C' },
    { name: 'D', code: 'D' }, { name: 'E', code: 'E' }, { name: 'F', code: 'F' },
    { name: 'G', code: 'G' }, { name: 'H', code: 'H' }, { name: 'I', code: 'I' },
    { name: 'J', code: 'J' }, { name: 'K', code: 'K' }, { name: 'L', code: 'L' },
    { name: 'M', code: 'M' }, { name: 'N', code: 'N' }, { name: 'O', code: 'O' },
    { name: 'P', code: 'P' }, { name: 'Q', code: 'Q' }, { name: 'R', code: 'R' },
  ];

  const EDGE_LABELS = [
    'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11', 'e12',
    'e13', 'e14', 'e15', 'e16', 'e17', 'e18', 'e19', 'e20',
  ];

  let nextNodeId = 1;

  const Graph = {
    nodes: [],
    edges: [],

    clear() {
      this.nodes = [];
      this.edges = [];
      nextNodeId = 1;
    },

    getNextNodeMeta() {
      const usedNames = new Set(this.nodes.map(n => n.name));
      const available = NODE_CATALOG.find(c => !usedNames.has(c.name));
      if (available) return available;
      const index = this.nodes.length + 1;
      return { name: `v${index}`, code: `v${index}` };
    },

    addNode(x, y, customName = null, customCode = null) {
      const meta = customName
        ? { name: customName, code: customCode || customName.slice(0, 4).toUpperCase() }
        : this.getNextNodeMeta();

      const node = {
        id: nextNodeId++,
        name: meta.name.trim(),
        code: (meta.code || meta.name.slice(0, 3)).trim().toUpperCase(),
        x: Math.round(x),
        y: Math.round(y)
      };

      this.nodes.push(node);
      return node;
    },

    renameNode(id, newName, newCode) {
      const node = this.getNodeById(id);
      if (!node) return false;
      const cleanName = newName.trim();
      const oldName = node.name;
      if (!cleanName) return false;

      const collision = this.nodes.find(n => n.id !== id && n.name.toLowerCase() === cleanName.toLowerCase());
      if (collision) return false;

      node.name = cleanName;
      node.code = (newCode || cleanName.slice(0, 4)).trim().toUpperCase();

      if (AppState.sourceName === oldName) AppState.sourceName = node.name;
      if (AppState.targetName === oldName) AppState.targetName = node.name;
      return true;
    },

    removeNode(id) {
      const node = this.getNodeById(id);
      if (node) {
        if (AppState.sourceName === node.name) AppState.sourceName = null;
        if (AppState.targetName === node.name) AppState.targetName = null;
      }
      this.nodes = this.nodes.filter(n => n.id !== id);
      this.edges = this.edges.filter(e => e.fromId !== id && e.toId !== id);
    },

    addEdge(fromId, toId, weight = 10, name = null) {
      if (fromId === toId) return null;
      const exists = this.edges.find(e =>
        (e.fromId === fromId && e.toId === toId) ||
        (e.fromId === toId && e.toId === fromId)
      );
      if (exists) {
        exists.weight = Math.max(1, Math.round(weight));
        if (name) exists.name = name.trim();
        return exists;
      }

      const defaultLabel = EDGE_LABELS[this.edges.length % EDGE_LABELS.length];
      const edge = {
        id: nextNodeId++,
        fromId,
        toId,
        weight: Math.max(1, Math.round(weight)),
        name: (name || defaultLabel).trim()
      };
      this.edges.push(edge);
      return edge;
    },

    updateEdge(edgeId, newWeight, newName) {
      const edge = this.edges.find(e => e.id === edgeId);
      if (!edge) return false;
      if (newWeight !== undefined) edge.weight = Math.max(1, Math.round(newWeight));
      if (newName !== undefined) edge.name = newName.trim();
      return true;
    },

    removeEdge(edgeId) {
      this.edges = this.edges.filter(e => e.id !== edgeId);
    },

    getNodeById(id) { return this.nodes.find(n => n.id === id); },
    getNodeByName(name) { return this.nodes.find(n => n.name === name); },

    toApiPayload(sourceName, targetName) {
      const validEdges = this.edges.filter(e => this.getNodeById(e.fromId) && this.getNodeById(e.toId));
      return {
        nodes: this.nodes.map(n => n.name),
        edges: validEdges.map(e => ({
          from: this.getNodeById(e.fromId).name,
          to: this.getNodeById(e.toId).name,
          weight: e.weight,
          name: e.name
        })),
        source: sourceName,
        target: targetName
      };
    },

    toJSON() {
      return {
        nodes: this.nodes.map(n => ({ name: n.name, code: n.code, x: n.x, y: n.y })),
        edges: this.edges.map(e => {
          const u = this.getNodeById(e.fromId);
          const v = this.getNodeById(e.toId);
          return { from: u ? u.name : '?', to: v ? v.name : '?', weight: e.weight, name: e.name };
        })
      };
    },

    fromJSON(data) {
      this.clear();
      const nodeMap = {};
      (data.nodes || []).forEach(nd => {
        const node = this.addNode(nd.x || 200, nd.y || 200, nd.name, nd.code);
        nodeMap[nd.name] = node;
      });
      (data.edges || []).forEach(ed => {
        const u = nodeMap[ed.from];
        const v = nodeMap[ed.to];
        if (u && v) this.addEdge(u.id, v.id, ed.weight || 1, ed.name);
      });
    },

    getAdjacencyList() {
      const adj = {};
      this.nodes.forEach(n => { adj[n.name] = []; });
      this.edges.forEach(e => {
        const u = this.getNodeById(e.fromId);
        const v = this.getNodeById(e.toId);
        if (!u || !v) return;
        adj[u.name].push({ to: v.name, w: e.weight });
        adj[v.name].push({ to: u.name, w: e.weight });
      });
      return adj;
    }
  };

  const AppState = {
    mode: 'select',
    sourceName: null,
    targetName: null,
    hoveredNode: null,
    hoveredEdge: null,
    selectedNode: null,
    roadStartNode: null,
    isDragging: false,
    dragNode: null,
    dragOffset: { x: 0, y: 0 },
    dragDistance: 0,
    mouseDownPos: { x: 0, y: 0 },
    isPanning: false,
    panStart: { x: 0, y: 0 },
    pan: { x: 0, y: 0 },
    zoom: 1.0,
    mousePos: { x: 0, y: 0 },
    apiResult: null,
    steps: [],
    shortestPath: [],
    currentStepIndex: -1,
    isPlaying: false,
    playTimer: null,
    playSpeedMs: 850,
    activePackets: []
  };

  const DOM = {
    canvas: document.getElementById('map-canvas'),
    viewport: document.getElementById('map-viewport'),
    sourceSelect: document.getElementById('source-select'),
    targetSelect: document.getElementById('target-select'),
    swapRouteBtn: document.getElementById('swap-route-btn'),
    findRouteBtn: document.getElementById('find-route-btn'),
    randomBtn: document.getElementById('random-btn'),
    presentBtn: document.getElementById('present-btn'),
    clearBtn: document.getElementById('clear-btn'),
    exportBtn: document.getElementById('export-btn'),
    presetsSelect: document.getElementById('presets-select'),
    toolSelect: document.getElementById('tool-select'),
    toolAddCity: document.getElementById('tool-add-city'),
    toolAddRoad: document.getElementById('tool-add-road'),
    toolDelete: document.getElementById('tool-delete'),
    bannerText: document.getElementById('banner-text'),
    bannerIcon: document.getElementById('banner-icon'),
    zoomInBtn: document.getElementById('view-zoom-in'),
    zoomOutBtn: document.getElementById('view-zoom-out'),
    zoomResetBtn: document.getElementById('view-reset'),
    sfxToggleBtn: document.getElementById('sfx-toggle'),
    telemetryCoords: document.getElementById('telemetry-coords'),
    telemetryCounts: document.getElementById('telemetry-counts'),
    roadModal: document.getElementById('road-modal'),
    roadModalTitle: document.getElementById('road-modal-title'),
    modalCityFrom: document.getElementById('modal-city-from'),
    modalCityTo: document.getElementById('modal-city-to'),
    modalRoadName: document.getElementById('modal-road-name'),
    modalRoadWeight: document.getElementById('modal-road-weight'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalDeleteBtn: document.getElementById('modal-delete-btn'),
    cityModal: document.getElementById('city-modal'),
    cityModalName: document.getElementById('city-modal-name'),
    cityModalCode: document.getElementById('city-modal-code'),
    cityModalSaveBtn: document.getElementById('city-modal-save-btn'),
    cityModalCancelBtn: document.getElementById('city-modal-cancel-btn'),
    cityModalDeleteBtn: document.getElementById('city-modal-delete-btn'),
    presentationModal: document.getElementById('presentation-modal'),
    presentationCloseBtn: document.getElementById('presentation-close-btn'),
    exportModal: document.getElementById('export-modal'),
    exportTextarea: document.getElementById('export-textarea'),
    exportCopyBtn: document.getElementById('export-copy-btn'),
    exportImportBtn: document.getElementById('export-import-btn'),
    exportCloseBtn: document.getElementById('export-close-btn'),
    tabButtons: document.querySelectorAll('.hud-tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    heroBadge: document.getElementById('hero-badge'),
    heroDistVal: document.getElementById('hero-dist-val'),
    heroDistUnit: document.getElementById('hero-dist-unit'),
    heroMeta: document.getElementById('hero-meta'),
    itineraryCount: document.getElementById('itinerary-count'),
    directionsList: document.getElementById('directions-list'),
    adjCount: document.getElementById('adj-count'),
    adjListContainer: document.getElementById('adj-list-container'),
    algoStateBadge: document.getElementById('algo-state-badge'),
    algoStepCounter: document.getElementById('algo-step-counter'),
    canvasHudBanner: document.getElementById('canvas-hud-banner'),
    hudBannerTitle: document.getElementById('hud-banner-title'),
    hudBannerSubtitle: document.getElementById('hud-banner-subtitle'),
    hudBannerIcon: document.getElementById('hud-banner-icon'),
    stepFirst: document.getElementById('step-first'),
    stepPrev: document.getElementById('step-prev'),
    stepPlay: document.getElementById('step-play'),
    stepNext: document.getElementById('step-next'),
    stepLast: document.getElementById('step-last'),
    stepSlider: document.getElementById('step-slider'),
    speedSlider: document.getElementById('speed-slider'),
    speedIndicator: document.getElementById('speed-indicator'),
    stepExplanation: document.getElementById('step-explanation'),
    formulaCard: document.getElementById('formula-card'),
    formulaContent: document.getElementById('formula-content'),
    neighborsEvalCard: document.getElementById('neighbors-eval-card'),
    evalCount: document.getElementById('eval-count'),
    evalList: document.getElementById('eval-list'),
    pqCount: document.getElementById('pq-count'),
    pqContainer: document.getElementById('pq-container'),
    distTableBody: document.getElementById('dist-table-body'),
    toastContainer: document.getElementById('toast-container')
  };

  const ctx = DOM.canvas.getContext('2d');

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // HiDPI canvas resize — fixes blurry text
  function resizeCanvas() {
    const w = DOM.viewport.clientWidth;
    const h = DOM.viewport.clientHeight;
    DOM.canvas.width = w * DPR;
    DOM.canvas.height = h * DPR;
    DOM.canvas.style.width = w + 'px';
    DOM.canvas.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function getCanvasCoords(e) {
    const rect = DOM.canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      x: (rawX - AppState.pan.x) / AppState.zoom,
      y: (rawY - AppState.pan.y) / AppState.zoom
    };
  }

  function findNodeNear(x, y, radius = 28) {
    return Graph.nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  function findEdgeNear(x, y, threshold = 14) {
    for (const edge of Graph.edges) {
      const u = Graph.getNodeById(edge.fromId);
      const v = Graph.getNodeById(edge.toId);
      if (!u || !v) continue;
      if (distToSegment(x, y, u.x, u.y, v.x, v.y) <= threshold) return edge;
    }
    return null;
  }

  function updateTelemetry(x, y) {
    if (x !== undefined && y !== undefined) {
      DOM.telemetryCoords.textContent = `x: ${Math.round(x)}, y: ${Math.round(y)}`;
    }
    DOM.telemetryCounts.textContent = `V = ${Graph.nodes.length} | E = ${Graph.edges.length}`;
  }

  function updateAdjacencyList() {
    const adj = Graph.getAdjacencyList();
    const nodeNames = Object.keys(adj);
    DOM.adjCount.textContent = nodeNames.length;

    if (nodeNames.length === 0) {
      DOM.adjListContainer.innerHTML = '<div class="empty-state-sm">No graph data</div>';
      return;
    }

    DOM.adjListContainer.innerHTML = nodeNames.map(name => {
      const neighbors = adj[name].map(n => `${n.to}(${n.w})`).join(', ') || '∅';
      return `<div class="adj-item"><span class="adj-node">${name}</span><span class="adj-arrow">→</span><span class="adj-neighbors">${neighbors}</span></div>`;
    }).join('');
  }

  function syncDropdowns() {
    const desiredSource = AppState.sourceName || DOM.sourceSelect.value;
    const desiredTarget = AppState.targetName || DOM.targetSelect.value;

    DOM.sourceSelect.innerHTML = '<option value="">Source Node...</option>';
    DOM.targetSelect.innerHTML = '<option value="">Target Node...</option>';

    Graph.nodes.forEach(n => {
      const opt1 = document.createElement('option');
      opt1.value = n.name;
      opt1.textContent = `${n.name} (${n.code})`;
      DOM.sourceSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = n.name;
      opt2.textContent = `${n.name} (${n.code})`;
      DOM.targetSelect.appendChild(opt2);
    });

    if (desiredSource && Graph.getNodeByName(desiredSource)) {
      DOM.sourceSelect.value = desiredSource;
      AppState.sourceName = desiredSource;
    } else {
      AppState.sourceName = null;
      DOM.sourceSelect.value = '';
    }

    if (desiredTarget && Graph.getNodeByName(desiredTarget)) {
      DOM.targetSelect.value = desiredTarget;
      AppState.targetName = desiredTarget;
    } else {
      AppState.targetName = null;
      DOM.targetSelect.value = '';
    }

    updateTelemetry();
    updateAdjacencyList();
  }

  // ── RENDERER ────────────────────────────────────────────
  const Renderer = {
    animationTime: 0,

    drawDirectionalChevrons(x1, y1, x2, y2, color) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const spacing = 38;
      const num = Math.floor(dist / spacing);
      const offset = (this.animationTime * 28) % spacing;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      for (let i = 0; i <= num; i++) {
        const d = (i * spacing + offset) % dist;
        if (d < 18 || d > dist - 18) continue;
        const px = x1 + Math.cos(angle) * d;
        const py = y1 + Math.sin(angle) * d;

        ctx.beginPath();
        ctx.moveTo(px - Math.cos(angle - Math.PI / 6) * 7, py - Math.sin(angle - Math.PI / 6) * 7);
        ctx.lineTo(px, py);
        ctx.lineTo(px - Math.cos(angle + Math.PI / 6) * 7, py - Math.sin(angle + Math.PI / 6) * 7);
        ctx.stroke();
      }
      ctx.restore();
    },

    draw() {
      this.animationTime += 0.03;
      const w = DOM.viewport.clientWidth;
      const h = DOM.viewport.clientHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(AppState.pan.x, AppState.pan.y);
      ctx.scale(AppState.zoom, AppState.zoom);

      this.drawEdges();
      this.drawConfirmedTree();
      this.drawConnectingLine();
      this.drawPackets();
      this.drawNodes();

      ctx.restore();
    },

    drawConfirmedTree() {
      const curStep = AppState.steps[AppState.currentStepIndex];
      if (!curStep || !curStep.previous) return;
      if (AppState.currentStepIndex === AppState.steps.length - 1) return;

      const prevMap = curStep.previous;
      ctx.save();

      Object.entries(prevMap).forEach(([childName, parentName]) => {
        const child = Graph.getNodeByName(childName);
        const parent = Graph.getNodeByName(parentName);
        if (!child || !parent) return;

        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(child.x, child.y);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const mx = (parent.x + child.x) / 2;
        const my = (parent.y + child.y) / 2;
        const angle = Math.atan2(child.y - parent.y, child.x - parent.x);
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(angle) * 7, my + Math.sin(angle) * 7);
        ctx.lineTo(mx - Math.cos(angle - Math.PI / 6) * 5, my - Math.sin(angle - Math.PI / 6) * 5);
        ctx.lineTo(mx - Math.cos(angle + Math.PI / 6) * 5, my - Math.sin(angle + Math.PI / 6) * 5);
        ctx.fillStyle = '#34d399';
        ctx.fill();
      });

      ctx.restore();
    },

    drawEdges() {
      const curStep = AppState.steps[AppState.currentStepIndex];
      const isHUDActive = AppState.currentStepIndex >= 0;
      const isFinished = isHUDActive && AppState.currentStepIndex === AppState.steps.length - 1;
      const shortestPath = isFinished ? AppState.shortestPath : [];

      Graph.edges.forEach(edge => {
        const u = Graph.getNodeById(edge.fromId);
        const v = Graph.getNodeById(edge.toId);
        if (!u || !v) return;

        const isShortestPath = shortestPath.length >= 2 &&
          shortestPath.some((name, i) => {
            if (i === 0) return false;
            const prev = shortestPath[i - 1];
            return (u.name === prev && v.name === name) || (u.name === name && v.name === prev);
          });

        const relaxedInfo = curStep && curStep.relaxed_edges && curStep.relaxed_edges.find(r =>
          (r.from === u.name && r.to === v.name) || (r.from === v.name && r.to === u.name)
        );

        const skippedInfo = curStep && curStep.skipped_edges && curStep.skipped_edges.find(s =>
          (s.from === u.name && s.to === v.name) || (s.from === v.name && s.to === u.name)
        );

        const isHovered = AppState.hoveredEdge && AppState.hoveredEdge.id === edge.id;
        const isTreeEdge = curStep && curStep.previous && (
          curStep.previous[u.name] === v.name || curStep.previous[v.name] === u.name
        );

        const isEdgeActiveInStep = relaxedInfo || skippedInfo || isTreeEdge || isShortestPath;
        ctx.save();
        if (isHUDActive && !isEdgeActiveInStep) {
          ctx.globalAlpha = 0.2;
        }

        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(v.x, v.y);

        if (isShortestPath) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 5.5;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 16;
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(v.x, v.y);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (relaxedInfo) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;

          const fromNode = u.name === curStep.current_node ? u : v;
          const toNode = u.name === curStep.current_node ? v : u;
          this.drawDirectionalChevrons(fromNode.x, fromNode.y, toNode.x, toNode.y, '#60a5fa');
        } else if (skippedInfo) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = isHovered ? '#475569' : '#1e293b';
          ctx.lineWidth = isHovered ? 4.5 : 3.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(v.x, v.y);
          ctx.strokeStyle = isHovered ? '#94a3b8' : '#334155';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([5, 7]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Edge Weight Badge
        const mx = (u.x + v.x) / 2;
        const my = (u.y + v.y) / 2;

        let badgeText = String(edge.weight);
        let badgeBg = 'rgba(13, 17, 23, 0.92)';
        let badgeBorder = isHovered ? '#60a5fa' : '#334155';
        let badgeColor = isHovered ? '#60a5fa' : '#94a3b8';

        if (isShortestPath) {
          badgeText = `★ ${edge.weight}`;
          badgeBg = 'rgba(251, 191, 36, 0.2)';
          badgeBorder = '#fbbf24';
          badgeColor = '#fbbf24';
        } else if (relaxedInfo) {
          badgeText = `✓ ${relaxedInfo.new_dist}`;
          badgeBg = 'rgba(96, 165, 250, 0.15)';
          badgeBorder = '#60a5fa';
          badgeColor = '#60a5fa';
        } else if (skippedInfo) {
          badgeText = skippedInfo.reason === 'already_settled' ? '🔒' : `✗ ${skippedInfo.candidate_dist}`;
          badgeBg = 'rgba(245, 158, 11, 0.15)';
          badgeBorder = '#f59e0b';
          badgeColor = '#f59e0b';
        }

        ctx.font = '700 11px Inter, sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        const badgeW = textWidth + 12;
        const badgeH = 20;

        ctx.fillStyle = badgeBg;
        ctx.strokeStyle = badgeBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(mx - badgeW / 2, my - badgeH / 2, badgeW, badgeH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = badgeColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, mx, my);

        ctx.restore();
      });
    },

    drawConnectingLine() {
      if (AppState.mode === 'add-road' && AppState.roadStartNode) {
        ctx.beginPath();
        ctx.moveTo(AppState.roadStartNode.x, AppState.roadStartNode.y);
        ctx.lineTo(AppState.mousePos.x, AppState.mousePos.y);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -this.animationTime * 25;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      }
    },

    drawPackets() {
      AppState.activePackets = AppState.activePackets.filter(p => p.progress < 1);
      AppState.activePackets.forEach(p => {
        p.progress += 0.035;
        const u = Graph.getNodeByName(p.from);
        const v = Graph.getNodeByName(p.to);
        if (!u || !v) return;

        const curX = u.x + (v.x - u.x) * p.progress;
        const curY = u.y + (v.y - u.y) * p.progress;

        ctx.beginPath();
        ctx.arc(curX, curY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#60a5fa';
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    },

    drawNodes() {
      const curStep = AppState.steps[AppState.currentStepIndex];
      const isHUDActive = AppState.currentStepIndex >= 0;
      const isFinished = isHUDActive && AppState.currentStepIndex === AppState.steps.length - 1;
      const shortestPath = isFinished ? AppState.shortestPath : [];

      Graph.nodes.forEach(node => {
        const isSource = node.name === AppState.sourceName;
        const isTarget = node.name === AppState.targetName;
        const isHovered = AppState.hoveredNode && AppState.hoveredNode.id === node.id;
        const isSelected = AppState.roadStartNode && AppState.roadStartNode.id === node.id;

        const isCurrentProcessing = curStep && curStep.current_node === node.name;
        const isVisited = curStep && curStep.visited.includes(node.name);
        const isInQueue = curStep && curStep.priority_queue.some(q => q.node === node.name);
        const isPath = shortestPath.includes(node.name);
        const isRelaxedTarget = curStep && curStep.relaxed_edges && curStep.relaxed_edges.some(r => r.to === node.name);

        let pinColor = '#3b82f6';
        let pingColor = null;

        if (isCurrentProcessing) {
          pinColor = '#ffffff';
          pingColor = '#fbbf24';
        } else if (isPath) {
          pinColor = '#fbbf24';
          pingColor = '#fbbf24';
        } else if (isRelaxedTarget) {
          pinColor = '#60a5fa';
          pingColor = '#60a5fa';
        } else if (isVisited) {
          pinColor = '#34d399';
        } else if (isInQueue) {
          pinColor = '#60a5fa';
        } else if (isSource) {
          pinColor = '#34d399';
          pingColor = '#34d399';
        } else if (isTarget) {
          pinColor = '#f87171';
          pingColor = '#f87171';
        }

        const isRelevantNode = isCurrentProcessing || isRelaxedTarget || isVisited || isInQueue || isSource || isTarget || isPath;
        ctx.save();
        if (isHUDActive && !isRelevantNode) {
          ctx.globalAlpha = 0.28;
        }

        // Pulse ring for important nodes
        if (pingColor || isHovered || isSelected) {
          const waveRadius = 22 + (Math.sin(this.animationTime * 4) + 1) * 8;
          ctx.beginPath();
          ctx.arc(node.x, node.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = pingColor || '#60a5fa';
          ctx.lineWidth = isCurrentProcessing ? 2.5 : 1.5;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = isHUDActive && !isRelevantNode ? 0.28 : 1.0;
        }

        // Outer ring
        const outerR = isCurrentProcessing ? 22 : 18;
        ctx.beginPath();
        ctx.arc(node.x, node.y, outerR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(13, 17, 23, 0.95)';
        ctx.strokeStyle = pinColor;
        ctx.lineWidth = isCurrentProcessing ? 3.5 : isPath ? 3 : 2;
        ctx.shadowColor = pinColor;
        ctx.shadowBlur = isCurrentProcessing ? 20 : isPath || isSource || isTarget ? 14 : 4;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner filled circle
        const innerR = isCurrentProcessing ? 14 : 12;
        ctx.beginPath();
        ctx.arc(node.x, node.y, innerR, 0, Math.PI * 2);
        ctx.fillStyle = pinColor;
        ctx.fill();

        // Node letter inside
        ctx.font = '800 11px Inter, sans-serif';
        ctx.fillStyle = (pinColor === '#ffffff' || pinColor === '#fbbf24') ? '#0d1117' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.code, node.x, node.y + 0.5);

        // Node name label above
        ctx.font = '700 12px Inter, sans-serif';
        const nameText = node.name;
        const nameWidth = ctx.measureText(nameText).width;
        const pillW = nameWidth + 12;
        const pillH = 20;
        const pillY = node.y - 30;

        ctx.fillStyle = 'rgba(13, 17, 23, 0.94)';
        ctx.strokeStyle = isCurrentProcessing ? '#fbbf24' : isPath ? '#fbbf24' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isCurrentProcessing ? 1.5 : 1;
        ctx.beginPath();
        ctx.roundRect(node.x - pillW / 2, pillY - pillH / 2, pillW, pillH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isCurrentProcessing ? '#fbbf24' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nameText, node.x, pillY);

        // Status badge below node during HUD
        if (curStep && curStep.distances) {
          const d = curStep.distances[node.name];
          let statusText = d === null ? '∞' : `d=${d}`;
          let statusBg = 'rgba(13, 17, 23, 0.88)';
          let statusColor = '#94a3b8';
          let statusBorder = 'rgba(255, 255, 255, 0.08)';

          if (isCurrentProcessing) {
            statusText = `⚡ POPPED d=${curStep.current_dist}`;
            statusBg = 'rgba(251, 191, 36, 0.2)';
            statusColor = '#fbbf24';
            statusBorder = '#fbbf24';
          } else if (isRelaxedTarget) {
            statusText = `✓ RELAXED d=${d}`;
            statusBg = 'rgba(96, 165, 250, 0.18)';
            statusColor = '#60a5fa';
            statusBorder = '#60a5fa';
          } else if (isVisited) {
            statusText = `✓ SETTLED d=${d}`;
            statusBg = 'rgba(52, 211, 153, 0.15)';
            statusColor = '#34d399';
            statusBorder = '#34d399';
          } else if (isInQueue) {
            statusText = `⏳ QUEUED d=${d}`;
            statusBg = 'rgba(96, 165, 250, 0.12)';
            statusColor = '#93c5fd';
            statusBorder = '#93c5fd';
          }

          const distY = node.y + 28;
          ctx.font = '700 9px JetBrains Mono, monospace';
          const statW = ctx.measureText(statusText).width + 10;
          const statH = 17;

          ctx.fillStyle = statusBg;
          ctx.strokeStyle = statusBorder;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(node.x - statW / 2, distY - statH / 2, statW, statH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = statusColor;
          ctx.fillText(statusText, node.x, distY);
        }

        // Spotlight banner over active node
        if (isCurrentProcessing) {
          const bannerY = pillY - 24;
          const bannerText = `⚡ POPPED: ${node.name} (d = ${curStep.current_dist})`;
          ctx.font = '800 10px Inter, sans-serif';
          const bW = ctx.measureText(bannerText).width + 14;
          const bH = 21;

          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(node.x - bW / 2, bannerY - bH / 2, bW, bH, 5);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.moveTo(node.x - 4, bannerY + bH / 2);
          ctx.lineTo(node.x + 4, bannerY + bH / 2);
          ctx.lineTo(node.x, bannerY + bH / 2 + 4);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();

          ctx.fillStyle = '#0d1117';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bannerText, node.x, bannerY);
        }

        ctx.restore();
      });
    }
  };

  // ── STEPPER CONTROLLER ──────────────────────────────────
  const Stepper = {
    load(result) {
      AppState.apiResult = result;
      AppState.steps = result.steps || [];
      AppState.shortestPath = result.shortest_path || [];
      AppState.currentStepIndex = -1;

      DOM.stepSlider.max = Math.max(0, AppState.steps.length - 1);
      DOM.stepSlider.value = 0;

      this.updateDirectionsTab(result);
      this.goToStep(0);
      SoundFX.found();
    },

    goToStep(index) {
      if (index < 0 || index >= AppState.steps.length) return;
      AppState.currentStepIndex = index;
      DOM.stepSlider.value = index;

      const step = AppState.steps[index];
      DOM.algoStepCounter.textContent = `Step ${index + 1} / ${AppState.steps.length}`;

      const isLast = index === AppState.steps.length - 1;
      DOM.algoStateBadge.textContent = isLast ? 'TARGET REACHED' : 'EXPLORING';
      DOM.algoStateBadge.style.background = isLast
        ? 'linear-gradient(135deg, #059669, #34d399)'
        : 'linear-gradient(135deg, #2563eb, #60a5fa)';

      if (step.relaxed_edges && step.relaxed_edges.length > 0) {
        step.relaxed_edges.forEach(re => {
          AppState.activePackets.push({ from: re.from, to: re.to, progress: 0 });
        });
        SoundFX.relax();
      }

      this.updateExplanation(step, isLast);
      this.updateFormulaCard(step);
      this.updateNeighborEvaluation(step);
      this.updatePriorityQueue(step.priority_queue);
      this.updateDistanceTable(step);

      if (DOM.canvasHudBanner) {
        DOM.canvasHudBanner.style.display = 'flex';
        if (isLast) {
          DOM.hudBannerIcon.textContent = '🏆';
          DOM.hudBannerTitle.textContent = `SHORTEST PATH: ${AppState.shortestPath.join(' → ')}`;
          DOM.hudBannerSubtitle.textContent = `Total Distance: ${AppState.apiResult.shortest_distance} • Done!`;
        } else {
          DOM.hudBannerIcon.textContent = '⚡';
          DOM.hudBannerTitle.textContent = `STEP ${index + 1} / ${AppState.steps.length} — POP ${step.current_node} (d = ${step.current_dist})`;
          const relCount = step.relaxed_edges ? step.relaxed_edges.length : 0;
          const skipCount = step.skipped_edges ? step.skipped_edges.length : 0;
          DOM.hudBannerSubtitle.textContent = `${relCount} relaxed • ${skipCount} skipped • Queue: ${step.priority_queue.length}`;
        }
      }
    },

    updateExplanation(step, isLast) {
      if (isLast && AppState.shortestPath.length > 0) {
        DOM.stepExplanation.innerHTML = `
          <strong>Target Reached!</strong> Shortest path: 
          <span style="color:#fbbf24">${AppState.shortestPath.join(' → ')}</span> 
          (Total: <strong>${AppState.apiResult.shortest_distance}</strong>).
        `;
        return;
      }

      const count = step.relaxed_edges.length;
      if (count === 0) {
        DOM.stepExplanation.textContent = `Popped "${step.current_node}" (d = ${step.current_dist}). No edges improved.`;
      } else {
        const details = step.relaxed_edges.map(e =>
          `<strong>${e.to}</strong> (${e.old_dist === null ? '∞' : e.old_dist} → <span style="color:#60a5fa">${e.new_dist}</span>)`
        ).join(', ');
        DOM.stepExplanation.innerHTML = `Popped "<strong>${step.current_node}</strong>" (d = ${step.current_dist}). Relaxed ${count} edge(s): ${details}.`;
      }
    },

    updateFormulaCard(step) {
      if (step.relaxed_edges && step.relaxed_edges.length > 0) {
        DOM.formulaCard.style.display = 'block';
        const formulas = step.relaxed_edges.map(e =>
          `dist[${e.to}] = min(${e.old_dist === null ? '∞' : e.old_dist}, ${step.current_dist} + ${e.weight}) = ${e.new_dist}`
        );
        DOM.formulaContent.innerHTML = formulas.join('<br>');
      } else {
        DOM.formulaCard.style.display = 'none';
      }
    },

    updateNeighborEvaluation(step) {
      const relaxed = step.relaxed_edges || [];
      const skipped = step.skipped_edges || [];
      const total = relaxed.length + skipped.length;

      DOM.evalCount.textContent = total;
      if (total === 0) {
        DOM.neighborsEvalCard.style.display = 'none';
        return;
      }

      DOM.neighborsEvalCard.style.display = 'block';
      let html = '';

      relaxed.forEach(r => {
        html += `
          <div class="eval-item">
            <div><strong>${r.to}</strong> <span style="color:var(--text-muted);font-size:10px;">w=${r.weight}</span></div>
            <span class="eval-status-relaxed">RELAXED (${r.new_dist})</span>
          </div>
        `;
      });

      skipped.forEach(s => {
        const statusClass = s.reason === 'already_settled' ? 'eval-status-settled' : 'eval-status-noshort';
        const statusLabel = s.reason === 'already_settled' ? 'SETTLED ✓' : `NOT SHORTER (${s.candidate_dist} ≥ ${s.existing_dist})`;
        html += `
          <div class="eval-item">
            <div><strong>${s.to}</strong> <span style="color:var(--text-muted);font-size:10px;">w=${s.weight}</span></div>
            <span class="${statusClass}">${statusLabel}</span>
          </div>
        `;
      });

      DOM.evalList.innerHTML = html;
    },

    updatePriorityQueue(queue) {
      DOM.pqCount.textContent = queue.length;
      if (queue.length === 0) {
        DOM.pqContainer.innerHTML = '<div class="empty-state-sm">Queue is empty</div>';
        return;
      }

      DOM.pqContainer.innerHTML = queue.map((item, idx) => `
        <div class="pq-card">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">${idx + 1}</span>
            <span class="pq-card-node">${item.node}</span>
          </div>
          <span class="pq-card-dist">d = ${item.dist}</span>
        </div>
      `).join('');
    },

    updateDistanceTable(step) {
      const distances = step.distances || {};
      const visited = step.visited || [];
      const curNode = step.current_node;

      DOM.distTableBody.innerHTML = Object.entries(distances).map(([nodeName, dist]) => {
        const isCur = nodeName === curNode;
        const isVis = visited.includes(nodeName);
        const rowClass = isCur ? 'active-row' : isVis ? 'visited-row' : '';
        const statusText = isCur ? 'CURRENT' : isVis ? 'SETTLED ✓' : 'UNVISITED';
        const distText = dist === null ? '∞' : dist;

        return `
          <tr class="${rowClass}">
            <td><strong>${nodeName}</strong></td>
            <td style="font-family:var(--font-mono);">${distText}</td>
            <td style="font-size:10px;font-weight:700;">${statusText}</td>
          </tr>
        `;
      }).join('');
    },

    updateDirectionsTab(result) {
      const path = result.shortest_path || [];
      const legs = result.route_legs || [];
      const dist = result.shortest_distance;

      if (!path.length || dist === null) {
        DOM.heroBadge.textContent = 'NO PATH EXISTS';
        DOM.heroBadge.style.color = '#f87171';
        DOM.heroDistVal.textContent = '—';
        DOM.heroDistUnit.textContent = '';
        DOM.heroMeta.textContent = `No path between ${AppState.sourceName} and ${AppState.targetName}.`;
        DOM.itineraryCount.textContent = '0 edges';
        DOM.directionsList.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">⚠️</span>
            <p>Nodes are disconnected. Add edges to connect them.</p>
          </div>
        `;
        return;
      }

      DOM.heroBadge.textContent = 'SHORTEST PATH FOUND';
      DOM.heroBadge.style.color = '#34d399';
      DOM.heroDistVal.textContent = dist.toLocaleString();
      DOM.heroDistUnit.textContent = 'total weight';
      DOM.heroMeta.textContent = `${AppState.sourceName} → ${AppState.targetName} via ${legs.length} edge(s).`;
      DOM.itineraryCount.textContent = `${legs.length} edges`;

      let html = '';
      html += `
        <div class="direction-step">
          <div class="direction-num" style="background:rgba(52,211,153,0.12);color:#34d399;">●</div>
          <div class="direction-body">
            <div class="direction-title">Start at ${path[0]}</div>
            <div class="direction-meta">Source node</div>
          </div>
        </div>
      `;

      legs.forEach((leg, i) => {
        html += `
          <div class="direction-step">
            <div class="direction-num">${i + 1}</div>
            <div class="direction-body">
              <div class="direction-title">${leg.from} → ${leg.to}</div>
              <div class="direction-meta">via edge "${leg.road}"</div>
            </div>
            <span class="direction-dist">w = ${leg.distance}</span>
          </div>
        `;
      });

      html += `
        <div class="direction-step">
          <div class="direction-num" style="background:rgba(248,113,113,0.12);color:#f87171;">◉</div>
          <div class="direction-body">
            <div class="direction-title">Arrive at ${path[path.length - 1]}</div>
            <div class="direction-meta">Total weight: ${dist}</div>
          </div>
        </div>
      `;

      DOM.directionsList.innerHTML = html;
    },

    play() {
      if (AppState.isPlaying) return;
      AppState.isPlaying = true;
      DOM.stepPlay.textContent = '⏸';

      AppState.playTimer = setInterval(() => {
        if (AppState.currentStepIndex >= AppState.steps.length - 1) {
          this.pause();
          return;
        }
        this.goToStep(AppState.currentStepIndex + 1);
      }, AppState.playSpeedMs);
    },

    pause() {
      AppState.isPlaying = false;
      DOM.stepPlay.textContent = '▶';
      if (AppState.playTimer) clearInterval(AppState.playTimer);
      AppState.playTimer = null;
    },

    reset() {
      this.pause();
      AppState.apiResult = null;
      AppState.steps = [];
      AppState.shortestPath = [];
      AppState.currentStepIndex = -1;
      DOM.stepSlider.max = 0;
      DOM.stepSlider.value = 0;
      DOM.algoStepCounter.textContent = 'Step 0 / 0';
      DOM.algoStateBadge.textContent = 'IDLE';
      DOM.algoStateBadge.style.background = 'linear-gradient(135deg, #2563eb, #60a5fa)';
      if (DOM.canvasHudBanner) DOM.canvasHudBanner.style.display = 'none';
      DOM.formulaCard.style.display = 'none';
      DOM.neighborsEvalCard.style.display = 'none';
      DOM.pqContainer.innerHTML = '<div class="empty-state-sm">Queue is empty</div>';
      DOM.pqCount.textContent = '0';
      DOM.distTableBody.innerHTML = '<tr><td colspan="3" class="table-empty">No graph data</td></tr>';
      DOM.heroBadge.textContent = 'READY TO EXPLORE';
      DOM.heroBadge.style.color = '#60a5fa';
      DOM.heroDistVal.textContent = '—';
      DOM.heroDistUnit.textContent = 'total weight';
      DOM.heroMeta.textContent = 'Select source & target nodes or click Random Graph';
      DOM.itineraryCount.textContent = '0 edges';
      DOM.directionsList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>No path computed yet.<br>Click <strong>Random Graph</strong> or select nodes above to find shortest path.</p>
        </div>
      `;
    }
  };

  // ── PRESETS & SCENARIO GENERATOR ────────────────────────
  const Scenarios = {
    loadUSInterstate() {
      Graph.clear();
      const w = DOM.viewport.clientWidth;
      const h = DOM.viewport.clientHeight;
      const cx = w / 2;
      const cy = h / 2;

      const sea = Graph.addNode(cx - 380, cy - 140, 'Seattle', 'SEA');
      const sfo = Graph.addNode(cx - 410, cy + 30, 'San Francisco', 'SFO');
      const lax = Graph.addNode(cx - 360, cy + 160, 'Los Angeles', 'LAX');
      const den = Graph.addNode(cx - 150, cy - 10, 'Denver', 'DEN');
      const ord = Graph.addNode(cx + 80, cy - 70, 'Chicago', 'ORD');
      const dfw = Graph.addNode(cx - 50, cy + 150, 'Dallas', 'DFW');
      const nyc = Graph.addNode(cx + 340, cy - 60, 'New York', 'NYC');
      const bos = Graph.addNode(cx + 380, cy - 140, 'Boston', 'BOS');
      const atl = Graph.addNode(cx + 200, cy + 100, 'Atlanta', 'ATL');
      const mia = Graph.addNode(cx + 280, cy + 200, 'Miami', 'MIA');

      Graph.addEdge(sea.id, sfo.id, 800, 'I-5');
      Graph.addEdge(sfo.id, lax.id, 380, 'US-101');
      Graph.addEdge(sea.id, den.id, 1020, 'I-90');
      Graph.addEdge(sfo.id, den.id, 750, 'I-80');
      Graph.addEdge(lax.id, dfw.id, 1200, 'I-10');
      Graph.addEdge(den.id, ord.id, 920, 'I-76');
      Graph.addEdge(den.id, dfw.id, 660, 'I-25');
      Graph.addEdge(ord.id, nyc.id, 790, 'I-80E');
      Graph.addEdge(nyc.id, bos.id, 215, 'I-95');
      Graph.addEdge(dfw.id, atl.id, 780, 'I-20');
      Graph.addEdge(ord.id, atl.id, 590, 'I-65');
      Graph.addEdge(atl.id, nyc.id, 860, 'I-85');
      Graph.addEdge(atl.id, mia.id, 660, 'I-75');
      Graph.addEdge(nyc.id, mia.id, 1280, 'I-95S');

      AppState.sourceName = 'Seattle';
      AppState.targetName = 'Miami';
      syncDropdowns();
    },

    loadEuroExpress() {
      Graph.clear();
      const cx = DOM.viewport.clientWidth / 2;
      const cy = DOM.viewport.clientHeight / 2;

      const lon = Graph.addNode(cx - 240, cy - 120, 'London', 'LON');
      const par = Graph.addNode(cx - 160, cy + 10, 'Paris', 'PAR');
      const ams = Graph.addNode(cx - 90, cy - 140, 'Amsterdam', 'AMS');
      const ber = Graph.addNode(cx + 80, cy - 90, 'Berlin', 'BER');
      const vie = Graph.addNode(cx + 170, cy + 40, 'Vienna', 'VIE');
      const rom = Graph.addNode(cx + 40, cy + 170, 'Rome', 'ROM');
      const mad = Graph.addNode(cx - 320, cy + 160, 'Madrid', 'MAD');

      Graph.addEdge(lon.id, par.id, 340, 'Eurostar');
      Graph.addEdge(lon.id, ams.id, 360, 'North Sea');
      Graph.addEdge(par.id, ams.id, 430, 'Thalys');
      Graph.addEdge(par.id, mad.id, 1050, 'TGV');
      Graph.addEdge(ams.id, ber.id, 570, 'A2');
      Graph.addEdge(par.id, vie.id, 1030, 'Orient');
      Graph.addEdge(ber.id, vie.id, 520, 'A4');
      Graph.addEdge(vie.id, rom.id, 760, 'A1');
      Graph.addEdge(par.id, rom.id, 1100, 'Alps');
      Graph.addEdge(mad.id, rom.id, 1360, 'Med');

      AppState.sourceName = 'London';
      AppState.targetName = 'Rome';
      syncDropdowns();
    },

    loadTokyoHub() {
      Graph.clear();
      const cx = DOM.viewport.clientWidth / 2;
      const cy = DOM.viewport.clientHeight / 2;

      const snj = Graph.addNode(cx - 180, cy - 60, 'Shinjuku', 'SNJ');
      const sby = Graph.addNode(cx - 150, cy + 100, 'Shibuya', 'SBY');
      const rpp = Graph.addNode(cx - 20, cy + 80, 'Roppongi', 'RPP');
      const tyo = Graph.addNode(cx + 90, cy - 20, 'Tokyo', 'TYO');
      const akh = Graph.addNode(cx + 120, cy - 110, 'Akihabara', 'AKH');
      const uen = Graph.addNode(cx + 70, cy - 180, 'Ueno', 'UEN');

      Graph.addEdge(snj.id, sby.id, 35, 'Yamanote');
      Graph.addEdge(sby.id, rpp.id, 28, 'Hibiya');
      Graph.addEdge(snj.id, tyo.id, 80, 'Chuo');
      Graph.addEdge(rpp.id, tyo.id, 42, 'Marunouchi');
      Graph.addEdge(tyo.id, akh.id, 20, 'KT-Line');
      Graph.addEdge(akh.id, uen.id, 18, 'Loop');
      Graph.addEdge(snj.id, uen.id, 95, 'Oedo');

      AppState.sourceName = 'Shibuya';
      AppState.targetName = 'Ueno';
      syncDropdowns();
    },

    loadDenseWeb() {
      Graph.clear();
      const w = DOM.viewport.clientWidth;
      const h = DOM.viewport.clientHeight;
      const count = 9;
      const placed = [];

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = Math.min(w, h) * 0.35;
        const x = w / 2 + Math.cos(angle) * radius + (Math.random() * 40 - 20);
        const y = h / 2 + Math.sin(angle) * (radius * 0.7) + (Math.random() * 40 - 20);
        placed.push(Graph.addNode(x, y));
      }

      const hub = Graph.addNode(w / 2, h / 2, 'Hub', 'HUB');
      placed.push(hub);

      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        Graph.addEdge(placed[i].id, placed[next].id, Math.floor(Math.random() * 300) + 100);
      }

      for (let i = 0; i < count; i += 2) {
        Graph.addEdge(placed[i].id, hub.id, Math.floor(Math.random() * 250) + 120);
      }

      AppState.sourceName = placed[0].name;
      AppState.targetName = placed[Math.floor(count / 2)].name;
      syncDropdowns();
    },

    async generateAndRunRandom() {
      Graph.clear();
      const w = DOM.viewport.clientWidth;
      const h = DOM.viewport.clientHeight;
      const count = 7;
      const pad = 100;
      const nodes = [];

      for (let i = 0; i < count; i++) {
        let x, y, tooClose;
        let attempts = 0;
        do {
          tooClose = false;
          x = pad + Math.random() * (w - pad * 2);
          y = pad + Math.random() * (h - pad * 2);
          for (const n of nodes) {
            if (Math.hypot(n.x - x, n.y - y) < 120) { tooClose = true; break; }
          }
          attempts++;
        } while (tooClose && attempts < 50);
        nodes.push(Graph.addNode(x, y));
      }

      for (let i = 1; i < nodes.length; i++) {
        const targetIdx = Math.floor(Math.random() * i);
        const distW = Math.round(Math.random() * 15 + 3);
        Graph.addEdge(nodes[i].id, nodes[targetIdx].id, distW);
      }

      for (let k = 0; k < 4; k++) {
        const a = Math.floor(Math.random() * nodes.length);
        const b = Math.floor(Math.random() * nodes.length);
        if (a !== b) {
          const distW = Math.round(Math.random() * 20 + 2);
          Graph.addEdge(nodes[a].id, nodes[b].id, distW);
        }
      }

      AppState.sourceName = nodes[0].name;
      AppState.targetName = nodes[nodes.length - 1].name;
      syncDropdowns();

      showToast(`Generated ${Graph.nodes.length} nodes & ${Graph.edges.length} edges.`);
      SoundFX.click();
      await triggerFindRoute();
    }
  };

  // ── API CALL HANDLER ────────────────────────────────────
  async function triggerFindRoute() {
    if (!AppState.sourceName || !AppState.targetName) {
      showToast('Please select both source and target nodes.');
      return;
    }
    if (AppState.sourceName === AppState.targetName) {
      showToast('Source and target must be different.');
      return;
    }
    if (Graph.edges.length === 0) {
      showToast('Add edges between nodes first.');
      return;
    }

    const payload = Graph.toApiPayload(AppState.sourceName, AppState.targetName);

    try {
      DOM.findRouteBtn.disabled = true;
      DOM.findRouteBtn.textContent = 'Computing...';

      const res = await fetch('/api/dijkstra/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      DOM.findRouteBtn.disabled = false;
      DOM.findRouteBtn.innerHTML = '<span class="btn-icon">⚡</span> Find Shortest Path';

      if (!res.ok) {
        showToast(data.error || 'Server error.');
        return;
      }

      Stepper.load(data);
      showToast(`Shortest path found: total weight = ${data.shortest_distance ?? '—'}`);
      switchTab('tab-directions');
    } catch (err) {
      DOM.findRouteBtn.disabled = false;
      DOM.findRouteBtn.innerHTML = '<span class="btn-icon">⚡</span> Find Shortest Path';
      console.error(err);
      showToast('Failed to reach API. Is the server running?');
    }
  }

  function switchTab(tabId) {
    DOM.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    DOM.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
  }

  // ── CITY/NODE EDIT MODAL ────────────────────────────────
  let editingNode = null;

  function openCityModal(node) {
    editingNode = node;
    DOM.cityModalName.value = node.name;
    DOM.cityModalCode.value = node.code;
    DOM.cityModal.style.display = 'flex';
    setTimeout(() => DOM.cityModalName.focus(), 50);
  }

  function saveCityModal() {
    if (!editingNode) return;
    const newName = DOM.cityModalName.value.trim();
    const newCode = DOM.cityModalCode.value.trim();
    if (!newName) { showToast('Name cannot be empty.'); return; }
    const success = Graph.renameNode(editingNode.id, newName, newCode);
    if (!success) { showToast('Name already used by another node.'); return; }
    DOM.cityModal.style.display = 'none';
    syncDropdowns();
    Stepper.reset();
    SoundFX.click();
    showToast(`Renamed to ${newName}`);
    editingNode = null;
  }

  DOM.cityModalSaveBtn.addEventListener('click', saveCityModal);
  DOM.cityModalName.addEventListener('keydown', e => { if (e.key === 'Enter') saveCityModal(); });
  DOM.cityModalCode.addEventListener('keydown', e => { if (e.key === 'Enter') saveCityModal(); });

  DOM.cityModalDeleteBtn.addEventListener('click', () => {
    if (!editingNode) return;
    Graph.removeNode(editingNode.id);
    DOM.cityModal.style.display = 'none';
    syncDropdowns();
    Stepper.reset();
    SoundFX.click();
    showToast('Node deleted.');
    editingNode = null;
  });

  DOM.cityModalCancelBtn.addEventListener('click', () => {
    DOM.cityModal.style.display = 'none';
    editingNode = null;
  });

  DOM.cityModal.addEventListener('click', e => {
    if (e.target === DOM.cityModal) {
      DOM.cityModal.style.display = 'none';
      editingNode = null;
    }
  });

  // ── ROAD/EDGE MODAL LOGIC ───────────────────────────────
  let pendingRoad = null;
  let editingRoad = null;

  function openCreateRoadModal(nodeA, nodeB) {
    pendingRoad = { nodeA, nodeB };
    editingRoad = null;
    DOM.roadModalTitle.textContent = 'New Edge';
    DOM.modalCityFrom.textContent = nodeA.name;
    DOM.modalCityTo.textContent = nodeB.name;
    DOM.modalDeleteBtn.style.display = 'none';
    DOM.modalRoadWeight.value = Math.round(Math.random() * 15 + 3);
    DOM.modalRoadName.value = EDGE_LABELS[Graph.edges.length % EDGE_LABELS.length];
    DOM.roadModal.style.display = 'flex';
    setTimeout(() => DOM.modalRoadWeight.focus(), 50);
  }

  function openEditRoadModal(edge) {
    editingRoad = edge;
    pendingRoad = null;
    const u = Graph.getNodeById(edge.fromId);
    const v = Graph.getNodeById(edge.toId);
    if (!u || !v) return;

    DOM.roadModalTitle.textContent = 'Edit Edge';
    DOM.modalCityFrom.textContent = u.name;
    DOM.modalCityTo.textContent = v.name;
    DOM.modalRoadName.value = edge.name;
    DOM.modalRoadWeight.value = edge.weight;
    DOM.modalDeleteBtn.style.display = 'inline-block';
    DOM.roadModal.style.display = 'flex';
    setTimeout(() => DOM.modalRoadWeight.focus(), 50);
  }

  function saveRoadModal() {
    const weight = parseFloat(DOM.modalRoadWeight.value) || 1;
    const name = DOM.modalRoadName.value.trim() || 'e';

    if (editingRoad) {
      Graph.updateEdge(editingRoad.id, weight, name);
      showToast(`Updated edge "${name}" (w = ${Math.round(weight)})`);
      editingRoad = null;
    } else if (pendingRoad) {
      Graph.addEdge(pendingRoad.nodeA.id, pendingRoad.nodeB.id, weight, name);
      SoundFX.roadAdd();
      showToast(`Edge added: "${name}" (w = ${Math.round(weight)})`);
      pendingRoad = null;
    }

    DOM.roadModal.style.display = 'none';
    syncDropdowns();
    Stepper.reset();
  }

  DOM.modalConfirmBtn.addEventListener('click', saveRoadModal);
  DOM.modalRoadWeight.addEventListener('keydown', e => { if (e.key === 'Enter') saveRoadModal(); });
  DOM.modalRoadName.addEventListener('keydown', e => { if (e.key === 'Enter') saveRoadModal(); });

  DOM.modalDeleteBtn.addEventListener('click', () => {
    if (editingRoad) {
      Graph.removeEdge(editingRoad.id);
      DOM.roadModal.style.display = 'none';
      editingRoad = null;
      syncDropdowns();
      Stepper.reset();
      SoundFX.click();
      showToast('Edge removed.');
    }
  });

  DOM.modalCancelBtn.addEventListener('click', () => {
    DOM.roadModal.style.display = 'none';
    pendingRoad = null;
    editingRoad = null;
  });

  DOM.roadModal.addEventListener('click', e => {
    if (e.target === DOM.roadModal) {
      DOM.roadModal.style.display = 'none';
      pendingRoad = null;
      editingRoad = null;
    }
  });

  // ── EXPORT / IMPORT ─────────────────────────────────────
  DOM.exportBtn.addEventListener('click', () => {
    DOM.exportTextarea.value = JSON.stringify(Graph.toJSON(), null, 2);
    DOM.exportModal.style.display = 'flex';
  });

  DOM.exportCopyBtn.addEventListener('click', () => {
    DOM.exportTextarea.select();
    navigator.clipboard.writeText(DOM.exportTextarea.value).then(() => {
      showToast('Graph JSON copied to clipboard.');
    }).catch(() => {
      document.execCommand('copy');
      showToast('Copied.');
    });
  });

  DOM.exportImportBtn.addEventListener('click', () => {
    try {
      const data = JSON.parse(DOM.exportTextarea.value);
      Graph.fromJSON(data);
      syncDropdowns();
      Stepper.reset();
      DOM.exportModal.style.display = 'none';
      showToast(`Imported ${Graph.nodes.length} nodes & ${Graph.edges.length} edges.`);
    } catch (e) {
      showToast('Invalid JSON. Please check the format.');
    }
  });

  DOM.exportCloseBtn.addEventListener('click', () => {
    DOM.exportModal.style.display = 'none';
  });

  DOM.exportModal.addEventListener('click', e => {
    if (e.target === DOM.exportModal) DOM.exportModal.style.display = 'none';
  });

  // ── USER INTERACTION (MODES & MOUSE) ────────────────────
  function setMode(mode) {
    AppState.mode = mode;
    AppState.roadStartNode = null;

    [DOM.toolSelect, DOM.toolAddCity, DOM.toolAddRoad, DOM.toolDelete].forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    switch (mode) {
      case 'select':
        DOM.bannerIcon.textContent = '🖐️';
        DOM.bannerText.innerHTML = '<strong>Move mode:</strong> Drag nodes. Pan canvas. <em>Double-click node to rename. Click edge to edit weight.</em>';
        DOM.canvas.style.cursor = 'default';
        break;
      case 'add-city':
        DOM.bannerIcon.textContent = '⊕';
        DOM.bannerText.innerHTML = '<strong>Add Node:</strong> Click anywhere on the canvas to place a new node.';
        DOM.canvas.style.cursor = 'crosshair';
        break;
      case 'add-road':
        DOM.bannerIcon.textContent = '🔗';
        DOM.bannerText.innerHTML = '<strong>Add Edge:</strong> Click Node A, then click Node B to connect.';
        DOM.canvas.style.cursor = 'pointer';
        break;
      case 'delete':
        DOM.bannerIcon.textContent = '🗑️';
        DOM.bannerText.innerHTML = '<strong>Delete:</strong> Click any node or edge to remove it.';
        DOM.canvas.style.cursor = 'not-allowed';
        break;
    }

    SoundFX.click();
  }

  DOM.canvas.addEventListener('mousedown', e => {
    const coords = getCanvasCoords(e);
    const node = findNodeNear(coords.x, coords.y);
    AppState.mouseDownPos = { x: e.clientX, y: e.clientY };
    AppState.dragDistance = 0;

    if (e.button === 2) return;

    if (AppState.mode === 'select') {
      if (node) {
        AppState.isDragging = true;
        AppState.dragNode = node;
        AppState.dragOffset = { x: coords.x - node.x, y: coords.y - node.y };
        DOM.canvas.style.cursor = 'grabbing';
      } else {
        AppState.isPanning = true;
        AppState.panStart = { x: e.clientX - AppState.pan.x, y: e.clientY - AppState.pan.y };
        DOM.canvas.style.cursor = 'move';
      }
    }
  });

  DOM.canvas.addEventListener('mousemove', e => {
    const coords = getCanvasCoords(e);
    AppState.mousePos = coords;
    updateTelemetry(coords.x, coords.y);

    if (AppState.isDragging || AppState.isPanning) {
      AppState.dragDistance += Math.hypot(e.movementX, e.movementY);
    }

    if (AppState.isDragging && AppState.dragNode) {
      AppState.dragNode.x = Math.round(coords.x - AppState.dragOffset.x);
      AppState.dragNode.y = Math.round(coords.y - AppState.dragOffset.y);
      return;
    }

    if (AppState.isPanning) {
      AppState.pan.x = e.clientX - AppState.panStart.x;
      AppState.pan.y = e.clientY - AppState.panStart.y;
      return;
    }

    const hovered = findNodeNear(coords.x, coords.y);
    AppState.hoveredNode = hovered;
    AppState.hoveredEdge = hovered ? null : findEdgeNear(coords.x, coords.y);

    if (AppState.mode === 'select') {
      if (hovered) DOM.canvas.style.cursor = 'grab';
      else if (AppState.hoveredEdge) DOM.canvas.style.cursor = 'pointer';
      else DOM.canvas.style.cursor = 'default';
    }
  });

  window.addEventListener('mouseup', () => {
    if (AppState.isDragging) {
      AppState.isDragging = false;
      AppState.dragNode = null;
    }
    if (AppState.isPanning) {
      AppState.isPanning = false;
    }
    if (AppState.mode === 'select') {
      DOM.canvas.style.cursor = AppState.hoveredNode ? 'grab' : 'default';
    }
  });

  DOM.canvas.addEventListener('click', e => {
    if (AppState.dragDistance > 6) return;

    const coords = getCanvasCoords(e);
    const clickedNode = findNodeNear(coords.x, coords.y);
    const clickedEdge = findEdgeNear(coords.x, coords.y);

    if (AppState.mode === 'add-city') {
      if (!clickedNode) {
        const newNode = Graph.addNode(coords.x, coords.y);
        syncDropdowns();
        SoundFX.nodeAdd();
        showToast(`Added node: ${newNode.name}`);
      }
      return;
    }

    if (AppState.mode === 'add-road') {
      if (clickedNode) {
        if (!AppState.roadStartNode) {
          AppState.roadStartNode = clickedNode;
          SoundFX.click();
          showToast(`Selected ${clickedNode.name}. Click second node.`);
        } else if (AppState.roadStartNode.id !== clickedNode.id) {
          openCreateRoadModal(AppState.roadStartNode, clickedNode);
          AppState.roadStartNode = null;
        }
      }
      return;
    }

    if (AppState.mode === 'delete') {
      if (clickedNode) {
        Graph.removeNode(clickedNode.id);
        syncDropdowns();
        Stepper.reset();
        SoundFX.click();
        showToast(`Removed node: ${clickedNode.name}`);
      } else if (clickedEdge) {
        Graph.removeEdge(clickedEdge.id);
        syncDropdowns();
        Stepper.reset();
        SoundFX.click();
        showToast(`Removed edge: ${clickedEdge.name}`);
      }
      return;
    }

    if (AppState.mode === 'select') {
      if (clickedNode) {
        if (!AppState.sourceName) {
          AppState.sourceName = clickedNode.name;
          DOM.sourceSelect.value = clickedNode.name;
          showToast(`Source: ${clickedNode.name}`);
          SoundFX.click();
        } else if (!AppState.targetName && AppState.sourceName !== clickedNode.name) {
          AppState.targetName = clickedNode.name;
          DOM.targetSelect.value = clickedNode.name;
          showToast(`Target: ${clickedNode.name}`);
          SoundFX.click();
        }
      } else if (clickedEdge) {
        openEditRoadModal(clickedEdge);
      }
    }
  });

  DOM.canvas.addEventListener('dblclick', e => {
    const coords = getCanvasCoords(e);
    const node = findNodeNear(coords.x, coords.y);
    if (node) { openCityModal(node); return; }
    const edge = findEdgeNear(coords.x, coords.y);
    if (edge) { openEditRoadModal(edge); }
  });

  DOM.canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const node = findNodeNear(coords.x, coords.y);
    if (node) { openCityModal(node); return; }
    const edge = findEdgeNear(coords.x, coords.y);
    if (edge) { openEditRoadModal(edge); }
  });

  // ── TOP CONTROLS & DROPDOWNS ────────────────────────────
  DOM.sourceSelect.addEventListener('change', () => {
    AppState.sourceName = DOM.sourceSelect.value || null;
    Stepper.reset();
  });

  DOM.targetSelect.addEventListener('change', () => {
    AppState.targetName = DOM.targetSelect.value || null;
    Stepper.reset();
  });

  DOM.swapRouteBtn.addEventListener('click', () => {
    const temp = AppState.sourceName;
    AppState.sourceName = AppState.targetName;
    AppState.targetName = temp;
    DOM.sourceSelect.value = AppState.sourceName || '';
    DOM.targetSelect.value = AppState.targetName || '';
    SoundFX.click();
    if (AppState.sourceName && AppState.targetName) triggerFindRoute();
  });

  DOM.findRouteBtn.addEventListener('click', triggerFindRoute);

  DOM.randomBtn.addEventListener('click', () => { Scenarios.generateAndRunRandom(); });

  DOM.presentBtn.addEventListener('click', () => { DOM.presentationModal.style.display = 'flex'; });
  DOM.presentationCloseBtn.addEventListener('click', () => { DOM.presentationModal.style.display = 'none'; });
  DOM.presentationModal.addEventListener('click', e => {
    if (e.target === DOM.presentationModal) DOM.presentationModal.style.display = 'none';
  });

  DOM.clearBtn.addEventListener('click', () => {
    Graph.clear();
    AppState.sourceName = null;
    AppState.targetName = null;
    syncDropdowns();
    Stepper.reset();
    SoundFX.click();
    showToast('Graph cleared.');
  });

  DOM.presetsSelect.addEventListener('change', async () => {
    const val = DOM.presetsSelect.value;
    switch (val) {
      case 'us-interstate': Scenarios.loadUSInterstate(); break;
      case 'euro-transit': Scenarios.loadEuroExpress(); break;
      case 'tokyo-hub': Scenarios.loadTokyoHub(); break;
      case 'dense-cluster': Scenarios.loadDenseWeb(); break;
    }
    DOM.presetsSelect.value = '';
    showToast(`Loaded preset: ${val}`);
    await triggerFindRoute();
  });

  // ── TOOLBAR MODES ───────────────────────────────────────
  DOM.toolSelect.addEventListener('click', () => setMode('select'));
  DOM.toolAddCity.addEventListener('click', () => setMode('add-city'));
  DOM.toolAddRoad.addEventListener('click', () => setMode('add-road'));
  DOM.toolDelete.addEventListener('click', () => setMode('delete'));

  // ── VIEW CONTROLS ───────────────────────────────────────
  DOM.zoomInBtn.addEventListener('click', () => { AppState.zoom = Math.min(2.5, AppState.zoom + 0.15); SoundFX.click(); });
  DOM.zoomOutBtn.addEventListener('click', () => { AppState.zoom = Math.max(0.3, AppState.zoom - 0.15); SoundFX.click(); });
  DOM.zoomResetBtn.addEventListener('click', () => { AppState.zoom = 1.0; AppState.pan = { x: 0, y: 0 }; SoundFX.click(); });
  DOM.sfxToggleBtn.addEventListener('click', () => {
    const on = SoundFX.toggle();
    DOM.sfxToggleBtn.textContent = on ? '🔊' : '🔇';
    DOM.sfxToggleBtn.style.opacity = on ? '1' : '0.5';
    showToast(`Sound ${on ? 'On' : 'Off'}`);
  });

  // ── SIDEBAR HUD TABS ───────────────────────────────────
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => { switchTab(btn.dataset.tab); SoundFX.click(); });
  });

  // ── STEPPER PLAYBACK CONTROLS ───────────────────────────
  DOM.stepFirst.addEventListener('click', () => { Stepper.pause(); Stepper.goToStep(0); });
  DOM.stepPrev.addEventListener('click', () => { Stepper.pause(); Stepper.goToStep(AppState.currentStepIndex - 1); });
  DOM.stepPlay.addEventListener('click', () => { AppState.isPlaying ? Stepper.pause() : Stepper.play(); });
  DOM.stepNext.addEventListener('click', () => { Stepper.pause(); Stepper.goToStep(AppState.currentStepIndex + 1); });
  DOM.stepLast.addEventListener('click', () => { Stepper.pause(); Stepper.goToStep(AppState.steps.length - 1); });

  DOM.stepSlider.addEventListener('input', e => {
    Stepper.pause();
    Stepper.goToStep(parseInt(e.target.value));
  });

  DOM.speedSlider.addEventListener('input', e => {
    const val = parseInt(e.target.value);
    AppState.playSpeedMs = 1950 - val;
    const speedMultiplier = (1000 / AppState.playSpeedMs).toFixed(1);
    DOM.speedIndicator.textContent = `${speedMultiplier}x`;
    if (AppState.isPlaying) { Stepper.pause(); Stepper.play(); }
  });

  // ── KEYBOARD SHORTCUTS ──────────────────────────────────
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    switch (e.key) {
      case '1': setMode('select'); break;
      case '2': setMode('add-city'); break;
      case '3': setMode('add-road'); break;
      case '4': setMode('delete'); break;
      case ' ':
        e.preventDefault();
        if (AppState.steps.length > 0) {
          AppState.isPlaying ? Stepper.pause() : Stepper.play();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        Stepper.pause();
        Stepper.goToStep(AppState.currentStepIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        Stepper.pause();
        Stepper.goToStep(AppState.currentStepIndex - 1);
        break;
      case 'Escape':
        DOM.roadModal.style.display = 'none';
        DOM.cityModal.style.display = 'none';
        DOM.presentationModal.style.display = 'none';
        DOM.exportModal.style.display = 'none';
        pendingRoad = null;
        editingRoad = null;
        editingNode = null;
        break;
    }
  });

  // ── MOUSE WHEEL ZOOM ───────────────────────────────────
  DOM.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    AppState.zoom = Math.max(0.3, Math.min(2.5, AppState.zoom + delta));
  }, { passive: false });

  // ── MAIN ANIMATION LOOP ─────────────────────────────────
  function mainLoop() {
    Renderer.draw();
    requestAnimationFrame(mainLoop);
  }

  window.AppGraph = Graph;
  window.AppState = AppState;
  window.AppStepper = Stepper;
  window.AppScenarios = Scenarios;
  window.openCityModal = openCityModal;
  window.openEditRoadModal = openEditRoadModal;

  window.addEventListener('resize', () => { resizeCanvas(); updateTelemetry(); });

  resizeCanvas();
  updateTelemetry();
  mainLoop();

  setTimeout(() => {
    Scenarios.loadUSInterstate();
    triggerFindRoute();
  }, 100);

})();
