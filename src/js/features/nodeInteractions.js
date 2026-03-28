// ===================================================================================
// NODE INTERACTIONS; Pan, zoom, node drag, port wire connections, selection
// ===================================================================================

class NodeInteractionManager {
    constructor() {
        this.container    = null;
        this.isPanning    = false;
        this.panStart     = { x: 0, y: 0, vpX: 0, vpY: 0 };
        this.draggedNode  = null;
        this.dragOffset   = { x: 0, y: 0 };
        // { sourceNodeId, sourcePortId, startPos:{x,y}, currentPos:{x,y} }
        this.wireInProgress = null;
        // { startX, startY, endX, endY }  — screen-space
        this.selectionBox = null;
        this.spaceHeld    = false;

        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp   = this._onMouseUp.bind(this);
        this._boundWheel     = this._onWheel.bind(this);
        this._boundKeyDown   = this._onKeyDown.bind(this);
        this._boundKeyUp     = this._onKeyUp.bind(this);
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    init(containerEl) {
        this.container = containerEl;
        // Wheel zoom stays on the viewport container (only fires when hovering it)
        this.container.addEventListener('wheel',     this._boundWheel,     { passive: false });
        // mousedown on container to start interactions
        this.container.addEventListener('mousedown', this._boundMouseDown);
        // mousemove + mouseup on document so drags/pans don't break when cursor leaves container
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup',   this._boundMouseUp);
        document.addEventListener('keydown',   this._boundKeyDown);
        document.addEventListener('keyup',     this._boundKeyUp);
    }

    destroy() {
        if (!this.container) return;
        this.container.removeEventListener('wheel',     this._boundWheel);
        this.container.removeEventListener('mousedown', this._boundMouseDown);
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup',   this._boundMouseUp);
        document.removeEventListener('keydown',   this._boundKeyDown);
        document.removeEventListener('keyup',     this._boundKeyUp);
        this.container      = null;
        this.isPanning      = false;
        this.draggedNode    = null;
        this.wireInProgress = null;
        this.selectionBox   = null;
    }

    // ── Coordinate helper ──────────────────────────────────────────────────────

    screenToCanvas(clientX, clientY) {
        const vp   = window.NodeGraph.viewport;
        const rect = this.container.getBoundingClientRect();
        return {
            x: (clientX - rect.left - vp.x) / vp.zoom,
            y: (clientY - rect.top  - vp.y) / vp.zoom
        };
    }

    containerPos(clientX, clientY) {
        const rect = this.container.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    // ── Wheel — zoom toward cursor ─────────────────────────────────────────────

    _onWheel(e) {
        e.preventDefault();
        const vp    = window.NodeGraph.viewport;
        const rect  = this.container.getBoundingClientRect();
        const mx    = e.clientX - rect.left;
        const my    = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const oldZ  = vp.zoom;
        const newZ  = Math.max(0.1, Math.min(4, oldZ * delta));

        vp.x    = mx - (mx - vp.x) * (newZ / oldZ);
        vp.y    = my - (my - vp.y) * (newZ / oldZ);
        vp.zoom = newZ;

        window.nodeCanvasRenderer.markBgDirty();
        window.nodeCanvasRenderer.markStaticDirty();
    }

    // ── Mouse Down ──────────────────────────────────────────────────────────────

    _onMouseDown(e) {
        // Ignore right-click context for now
        if (e.button === 2) return;

        const target = e.target;

        // ── Port → start wire
        const portEl = target.closest('.ne-port');
        if (portEl) {
            this._startWire(portEl, e);
            return;
        }

        // ── Collapse toggle
        if (target.classList.contains('ne-node-collapse-btn')) {
            const nodeEl = target.closest('.ne-node');
            if (nodeEl) {
                window.nodeGraphManager.toggleCollapse(nodeEl.dataset.nodeId);
                if (typeof window.renderNodeDom === 'function') {
                    window.renderNodeDom(nodeEl.dataset.nodeId);
                }
                window.nodeCanvasRenderer.markStaticDirty();
            }
            return;
        }

        // ── Delete node button
        if (target.classList.contains('ne-node-delete-btn')) {
            const nodeEl = target.closest('.ne-node');
            if (nodeEl) {
                window.nodeGraphManager.removeNode(nodeEl.dataset.nodeId);
                nodeEl.remove();
                window.nodeCanvasRenderer.markStaticDirty();
                if (typeof window.saveNodeEditorState === 'function') window.saveNodeEditorState();
            }
            return;
        }

        // ── Node header → drag + select
        const headerEl = target.closest('.ne-node-header');
        if (headerEl && !this.spaceHeld) {
            const nodeEl = headerEl.closest('.ne-node');
            if (nodeEl) {
                this._startNodeDrag(nodeEl, e);
                window.nodeGraphManager.selectNode(nodeEl.dataset.nodeId, e.ctrlKey || e.metaKey);
                this._updateSelectionVisuals();
                window.nodeCanvasRenderer.markStaticDirty();
            }
            return;
        }

        // ── Middle-click or space+left → pan
        if (e.button === 1 || this.spaceHeld) {
            e.preventDefault();
            this._startPan(e);
            return;
        }

        // ── Empty canvas → deselect + rubber-band
        const isCanvas = target === this.container
            || target.id === 'nodeCanvasLayer'
            || target.id === 'nodeHtmlLayer'
            || target.closest('#nodeEditorViewport') === this.container;

        if (isCanvas && e.button === 0) {
            window.nodeGraphManager.deselectAll();
            this._updateSelectionVisuals();
            this._startSelectionBox(e);
        }
    }

    // ── Mouse Move ──────────────────────────────────────────────────────────────

    _onMouseMove(e) {
        if (this.isPanning) {
            const vp = window.NodeGraph.viewport;
            vp.x = this.panStart.vpX + (e.clientX - this.panStart.x);
            vp.y = this.panStart.vpY + (e.clientY - this.panStart.y);
            window.nodeCanvasRenderer.markBgDirty();
            window.nodeCanvasRenderer.markStaticDirty();
            return;
        }

        if (this.draggedNode) {
            const cp  = this.screenToCanvas(e.clientX, e.clientY);
            const newX = cp.x - this.dragOffset.x;
            const newY = cp.y - this.dragOffset.y;
            window.nodeGraphManager.moveNode(this.draggedNode, newX, newY);
            const el = document.querySelector(`[data-node-id="${this.draggedNode}"]`);
            if (el) {
                el.style.left = newX + 'px';
                el.style.top  = newY + 'px';
            }
            // Wires must follow — mark static dirty every move frame
            window.nodeCanvasRenderer.markStaticDirty();
            return;
        }

        if (this.wireInProgress) {
            this.wireInProgress.currentPos = this.screenToCanvas(e.clientX, e.clientY);
            return;
        }

        if (this.selectionBox) {
            const cp = this.containerPos(e.clientX, e.clientY);
            this.selectionBox.endX = cp.x;
            this.selectionBox.endY = cp.y;
        }
    }

    // ── Mouse Up ────────────────────────────────────────────────────────────────

    _onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            if (this.container) this.container.style.cursor = this.spaceHeld ? 'grab' : '';
            return;
        }

        if (this.draggedNode) {
            this.draggedNode = null;
            window.nodeCanvasRenderer.markStaticDirty();
            if (typeof window.saveNodeEditorState === 'function') window.saveNodeEditorState();
            return;
        }

        if (this.wireInProgress) {
            const target   = e.target;
            const portEl   = target ? target.closest('.ne-port') : null;
            if (portEl) {
                this._completeWire(portEl);
            }
            this.wireInProgress = null;
            window.nodeCanvasRenderer.markStaticDirty();
            return;
        }

        if (this.selectionBox) {
            this._finalizeSelectionBox();
            this.selectionBox = null;
        }
    }

    // ── Key Events ──────────────────────────────────────────────────────────────

    _onKeyDown(e) {
        if (!window.nodeEditorEnabled) return;

        // Space → grab-pan mode
        if (e.code === 'Space' && !e.target.matches('input,textarea,[contenteditable="true"]')) {
            e.preventDefault();
            this.spaceHeld = true;
            if (this.container) this.container.style.cursor = 'grab';
            return;
        }

        // Delete / Backspace → remove selected nodes
        if ((e.key === 'Delete' || e.key === 'Backspace') &&
            !e.target.matches('input,textarea,[contenteditable="true"]')) {
            this._deleteSelectedNodes();
            return;
        }

        // Ctrl+A → select all
        if (e.ctrlKey && e.key === 'a' &&
            !e.target.matches('input,textarea,[contenteditable="true"]')) {
            e.preventDefault();
            this._selectAllNodes();
        }
    }

    _onKeyUp(e) {
        if (e.code === 'Space') {
            this.spaceHeld = false;
            if (this.container) this.container.style.cursor = '';
        }
    }

    // ── Pan ─────────────────────────────────────────────────────────────────────

    _startPan(e) {
        const vp = window.NodeGraph.viewport;
        this.isPanning = true;
        this.panStart  = { x: e.clientX, y: e.clientY, vpX: vp.x, vpY: vp.y };
        if (this.container) this.container.style.cursor = 'grabbing';
    }

    // ── Node Drag ───────────────────────────────────────────────────────────────

    _startNodeDrag(nodeEl, e) {
        const node = window.NodeGraph.nodes[nodeEl.dataset.nodeId];
        if (!node) return;
        const cp = this.screenToCanvas(e.clientX, e.clientY);
        this.draggedNode = nodeEl.dataset.nodeId;
        this.dragOffset  = { x: cp.x - node.x, y: cp.y - node.y };
    }

    // ── Wire Connection ─────────────────────────────────────────────────────────

    _startWire(portEl, e) {
        const nodeEl = portEl.closest('.ne-node');
        if (!nodeEl) return;
        const cp = this.screenToCanvas(e.clientX, e.clientY);
        this.wireInProgress = {
            sourceNodeId: nodeEl.dataset.nodeId,
            sourcePortId: portEl.dataset.portId,
            startPos:    { ...cp },
            currentPos:  { ...cp }
        };
    }

    _completeWire(targetPortEl) {
        const wp = this.wireInProgress;
        if (!wp) return;

        const targetNodeEl = targetPortEl.closest('.ne-node');
        if (!targetNodeEl) return;

        const targetNodeId = targetNodeEl.dataset.nodeId;
        const targetPortId = targetPortEl.dataset.portId;

        if (targetNodeId === wp.sourceNodeId) return; // no self-connect

        const wireId = window.nodeGraphManager.addWire(
            wp.sourceNodeId, wp.sourcePortId,
            targetNodeId, targetPortId
        );

        if (wireId) {
            const srcNode   = window.NodeGraph.nodes[wp.sourceNodeId];
            const tgtNode   = window.NodeGraph.nodes[targetNodeId];
            const srcHeader = srcNode && srcNode.headers.find(h => h.portId === wp.sourcePortId || h.portId + '-out' === wp.sourcePortId);
            const tgtHeader = tgtNode && tgtNode.headers.find(h => h.portId === targetPortId     || h.portId + '-out' === targetPortId);

            const srcLabel = (srcNode ? srcNode.label : '') + (srcHeader ? '.' + srcHeader.label : '');
            const tgtLabel = (tgtNode ? tgtNode.label : '') + (tgtHeader ? '.' + tgtHeader.label : '');

            $.toast({
                heading:   'Node Editor',
                text:      `Connected ${srcLabel} → ${tgtLabel}`,
                icon:      'success',
                loader:    false,
                stack:     false,
                hideAfter: 2500
            });

            if (typeof window.saveNodeEditorState === 'function') window.saveNodeEditorState();
        }
    }

    // ── Selection Box ───────────────────────────────────────────────────────────

    _startSelectionBox(e) {
        const cp = this.containerPos(e.clientX, e.clientY);
        this.selectionBox = { startX: cp.x, startY: cp.y, endX: cp.x, endY: cp.y };
    }

    _finalizeSelectionBox() {
        const { startX, startY, endX, endY } = this.selectionBox;
        const x  = Math.min(startX, endX);
        const y  = Math.min(startY, endY);
        const bw = Math.abs(endX - startX);
        const bh = Math.abs(endY - startY);

        if (bw < 4 && bh < 4) return; // too small — treat as click

        const vp  = window.NodeGraph.viewport;
        const cx1 = (x      - vp.x) / vp.zoom;
        const cy1 = (y      - vp.y) / vp.zoom;
        const cx2 = (x + bw - vp.x) / vp.zoom;
        const cy2 = (y + bh - vp.y) / vp.zoom;

        window.nodeGraphManager.deselectAll();
        Object.values(window.NodeGraph.nodes).forEach(node => {
            const nw = node.width || 280;
            const nh = node.collapsed ? 42 : 300;
            if (node.x < cx2 && node.x + nw > cx1 && node.y < cy2 && node.y + nh > cy1) {
                node.selected = true;
            }
        });

        this._updateSelectionVisuals();
        window.nodeCanvasRenderer.markStaticDirty();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    _updateSelectionVisuals() {
        document.querySelectorAll('.ne-node').forEach(el => {
            const node = window.NodeGraph.nodes[el.dataset.nodeId];
            el.classList.toggle('selected', !!(node && node.selected));
        });
    }

    _deleteSelectedNodes() {
        const selected = window.nodeGraphManager.getSelectedNodes();
        if (selected.length === 0) return;

        selected.forEach(node => {
            const el = document.querySelector(`[data-node-id="${node.id}"]`);
            if (el) el.remove();
            window.nodeGraphManager.removeNode(node.id);
        });

        window.nodeCanvasRenderer.markStaticDirty();
        if (typeof window.saveNodeEditorState === 'function') window.saveNodeEditorState();
        $.toast({
            heading: 'Node Editor',
            text:    `Deleted ${selected.length} node${selected.length > 1 ? 's' : ''}`,
            icon:    'info', loader: false, stack: false
        });
    }

    _selectAllNodes() {
        Object.values(window.NodeGraph.nodes).forEach(n => { n.selected = true; });
        this._updateSelectionVisuals();
        window.nodeCanvasRenderer.markStaticDirty();
    }
}

window.nodeInteractionManager = new NodeInteractionManager();
