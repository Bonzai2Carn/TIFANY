// ===================================================================================
// NODE RENDERER; 3-Layer Canvas Rendering
//   Layer 1 — Background:  dot grid, canvas fill  (redraws on pan/zoom/resize/theme)
//   Layer 2 — Static:      committed wires        (redraws on graph structure change)
//   Layer 3 — Active:      drag previews, temp wire, selection box  (every frame)
// Compositing: two offscreen buffers (bg + static) drawImage'd onto the visible canvas.
// ===================================================================================

class NodeCanvasRenderer {
    constructor() {
        this.mainCanvas   = null;
        this.bgBuffer     = null;
        this.staticBuffer = null;
        this.mainCtx      = null;
        this.bgCtx        = null;
        this.staticCtx    = null;
        this.htmlLayer    = null;

        this.isRunning    = false;
        this._bgDirty     = true;
        this._staticDirty = true;
        this._boundFrame  = this._renderFrame.bind(this);

        this._colors = {
            bg:         '#f8f9fa',
            gridDot:    '#e5e7eb',
            gridMajor:  '#d1d5db',
            wire:       '#6b7280',
            wireHover:  '#1a73e8',
        };
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    init() {
        this.mainCanvas   = document.getElementById('nodeCanvasLayer');
        this.bgBuffer     = document.getElementById('neBgBuffer');
        this.staticBuffer = document.getElementById('neStaticBuffer');
        this.htmlLayer    = document.getElementById('nodeHtmlLayer');

        if (!this.mainCanvas || !this.bgBuffer || !this.staticBuffer || !this.htmlLayer) {
            console.warn('NodeRenderer: required canvas elements not found');
            return;
        }

        this.mainCtx   = this.mainCanvas.getContext('2d');
        this.bgCtx     = this.bgBuffer.getContext('2d');
        this.staticCtx = this.staticBuffer.getContext('2d');

        this._readColors();
        this._bgDirty     = true;
        this._staticDirty = true;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Prefer GSAP ticker for lag-smoothing; fall back to rAF if GSAP didn't load
        if (typeof gsap !== 'undefined' && gsap.ticker) {
            this._usingGsap = true;
            gsap.ticker.add(this._boundFrame);
        } else {
            this._usingGsap = false;
            this._rafLoop();
        }
    }

    _rafLoop() {
        if (!this.isRunning) return;
        this._renderFrame();
        requestAnimationFrame(() => this._rafLoop());
    }

    stop() {
        this.isRunning = false;
        if (this._usingGsap && typeof gsap !== 'undefined' && gsap.ticker) {
            gsap.ticker.remove(this._boundFrame);
        }
        // rAF loop self-terminates via this.isRunning check
    }

    markBgDirty()     { this._bgDirty = true; }
    markStaticDirty() { this._staticDirty = true; }

    onThemeChange() {
        this._readColors();
        this._bgDirty     = true;
        this._staticDirty = true;
    }

    // ── Color cache (CSS vars can't be read by Canvas directly) ───────────────

    _readColors() {
        const s = getComputedStyle(document.documentElement);
        const get = (v, fallback) => {
            const val = s.getPropertyValue(v).trim();
            return val || fallback;
        };
        this._colors.bg        = get('--t-bg-workspace', '#f8f9fa');
        this._colors.gridDot   = get('--t-border',       '#e5e7eb');
        this._colors.gridMajor = get('--t-text-light',   '#9ca3af');
        this._colors.wire      = get('--t-text-muted',   '#6b7280');
        this._colors.wireHover = get('--t-primary',      '#1a73e8');
    }

    // ── Canvas resize (keep all three buffers in sync) ─────────────────────────

    _resize() {
        if (!this.mainCanvas) return false;
        const p = this.mainCanvas.parentElement;
        const w = p.clientWidth;
        const h = p.clientHeight;
        if (this.mainCanvas.width === w && this.mainCanvas.height === h) return false;

        this.mainCanvas.width   = w;
        this.mainCanvas.height  = h;
        this.bgBuffer.width     = w;
        this.bgBuffer.height    = h;
        this.staticBuffer.width  = w;
        this.staticBuffer.height = h;

        this._bgDirty     = true;
        this._staticDirty = true;
        return true;
    }

    // ── Main render loop (called by GSAP ticker) ───────────────────────────────

    _renderFrame() {
        if (!this.isRunning || !this.mainCtx) return;

        this._resize();

        const w  = this.mainCanvas.width;
        const h  = this.mainCanvas.height;
        const vp = window.NodeGraph.viewport;

        if (this._bgDirty) {
            this._drawBackground(this.bgCtx, w, h, vp);
            this._bgDirty = false;
        }

        if (this._staticDirty) {
            this._drawStatic(this.staticCtx, w, h, vp);
            this._staticDirty = false;
        }

        // Composite: bg + static + active
        this.mainCtx.clearRect(0, 0, w, h);
        this.mainCtx.drawImage(this.bgBuffer,     0, 0);
        this.mainCtx.drawImage(this.staticBuffer, 0, 0);
        this._drawActive(this.mainCtx, vp);

        // Sync HTML overlay transform
        this.htmlLayer.style.transform       = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`;
        this.htmlLayer.style.transformOrigin = '0 0';
    }

    // ── Layer 1: Background ────────────────────────────────────────────────────

    _drawBackground(ctx, w, h, vp) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = this._colors.bg;
        ctx.fillRect(0, 0, w, h);

        const spacing  = 20 * vp.zoom;
        if (spacing < 4) return; // too zoomed-out to draw dots

        const offsetX  = ((vp.x % spacing) + spacing) % spacing;
        const offsetY  = ((vp.y % spacing) + spacing) % spacing;
        const majorEvery = 5;

        // We track logical grid index to identify major intersections
        const startIX = Math.floor(-vp.x / (20 * vp.zoom));
        const startIY = Math.floor(-vp.y / (20 * vp.zoom));

        let xi = 0;
        for (let x = offsetX; x < w + spacing; x += spacing, xi++) {
            let yi = 0;
            for (let y = offsetY; y < h + spacing; y += spacing, yi++) {
                const isMajor = ((startIX + xi) % majorEvery === 0) && ((startIY + yi) % majorEvery === 0);
                const r = isMajor ? Math.min(2, vp.zoom * 1.5) : Math.min(1.2, vp.zoom);
                ctx.fillStyle = isMajor ? this._colors.gridMajor : this._colors.gridDot;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ── Layer 2: Static (committed wires) ─────────────────────────────────────

    _drawStatic(ctx, w, h, vp) {
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(vp.x, vp.y);
        ctx.scale(vp.zoom, vp.zoom);

        Object.values(window.NodeGraph.wires || {}).forEach(wire => {
            const p1 = window.nodeGraphManager.getPortWorldPosition(wire.sourceNodeId, wire.sourcePortId);
            const p2 = window.nodeGraphManager.getPortWorldPosition(wire.targetNodeId, wire.targetPortId);
            if (p1 && p2) {
                this._drawBezier(ctx, p1, p2,
                    wire.hovered ? this._colors.wireHover : this._colors.wire,
                    2 / vp.zoom, false);
            }
        });

        ctx.restore();
    }

    // ── Layer 3: Active (temp wire, selection box) ─────────────────────────────

    _drawActive(ctx, vp) {
        const im = window.nodeInteractionManager;
        if (!im) return;

        // Temporary wire being dragged
        if (im.wireInProgress && im.wireInProgress.startPos && im.wireInProgress.currentPos) {
            ctx.save();
            ctx.translate(vp.x, vp.y);
            ctx.scale(vp.zoom, vp.zoom);
            this._drawBezier(ctx,
                im.wireInProgress.startPos,
                im.wireInProgress.currentPos,
                this._colors.wireHover,
                2 / vp.zoom, true);
            ctx.restore();
        }

        // Selection rubber-band box (screen-space — no transform)
        if (im.selectionBox) {
            const { startX, startY, endX, endY } = im.selectionBox;
            const x  = Math.min(startX, endX);
            const y  = Math.min(startY, endY);
            const bw = Math.abs(endX - startX);
            const bh = Math.abs(endY - startY);

            ctx.save();
            ctx.strokeStyle = this._colors.wireHover;
            ctx.lineWidth   = 1;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(x, y, bw, bh);
            ctx.fillStyle = 'rgba(26,115,232,0.07)';
            ctx.fillRect(x, y, bw, bh);
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    // ── Bezier wire helper ─────────────────────────────────────────────────────

    _drawBezier(ctx, p1, p2, color, lineWidth, dashed) {
        const dx = Math.abs(p2.x - p1.x) * 0.55 + 40;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(p1.x + dx, p1.y, p2.x - dx, p2.y, p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth   = lineWidth;
        if (dashed) ctx.setLineDash([8 / (window.NodeGraph.viewport.zoom || 1), 4 / (window.NodeGraph.viewport.zoom || 1)]);
        ctx.stroke();
        if (dashed) ctx.setLineDash([]);
    }
}

window.nodeCanvasRenderer = new NodeCanvasRenderer();
