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

        this._boundMouseDown   = this._onMouseDown.bind(this);
        this._boundMouseMove   = this._onMouseMove.bind(this);
        this._boundMouseUp     = this._onMouseUp.bind(this);
        this._boundWheel       = this._onWheel.bind(this);
        this._boundKeyDown     = this._onKeyDown.bind(this);
        this._boundKeyUp       = this._onKeyUp.bind(this);
        this._boundContextMenu = this._onContextMenu.bind(this);
        this._portMenuEl       = null;   // active port context menu DOM element
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    init(containerEl) {
        this.container = containerEl;
        this.container.addEventListener('wheel',       this._boundWheel,       { passive: false });
        this.container.addEventListener('mousedown',   this._boundMouseDown);
        this.container.addEventListener('contextmenu', this._boundContextMenu);
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup',   this._boundMouseUp);
        document.addEventListener('keydown',   this._boundKeyDown);
        document.addEventListener('keyup',     this._boundKeyUp);
    }

    destroy() {
        if (!this.container) return;
        this.container.removeEventListener('wheel',       this._boundWheel);
        this.container.removeEventListener('mousedown',   this._boundMouseDown);
        this.container.removeEventListener('contextmenu', this._boundContextMenu);
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup',   this._boundMouseUp);
        document.removeEventListener('keydown',   this._boundKeyDown);
        document.removeEventListener('keyup',     this._boundKeyUp);
        this._dismissPortMenu();
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

        // ── Config button → open config panel
        if (target.classList.contains('ne-node-config-btn')) {
            const nodeEl = target.closest('.ne-node');
            if (nodeEl && typeof window.nodeConfigPanel !== 'undefined') {
                window.nodeConfigPanel.open(nodeEl.dataset.nodeId);
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

        // ── Direction validation ──────────────────────────────────────────────
        // Source port must be 'out' or 'inout'; target port must be 'in' or 'inout'
        const srcNode = window.NodeGraph.nodes[wp.sourceNodeId];
        const tgtNode = window.NodeGraph.nodes[targetNodeId];

        if (srcNode && tgtNode) {
            const _portDir = (node, rawPortId) => {
                // Strip '-out' suffix to find the base header
                const baseId = rawPortId.replace(/-out$/, '');
                const header = node.headers.find(h => h.portId === baseId);
                if (!header) return rawPortId.endsWith('-out') ? 'out' : 'in';
                return header.direction || 'inout';
            };

            const srcDir = _portDir(srcNode, wp.sourcePortId);
            const tgtDir = _portDir(tgtNode, targetPortId);

            // Source must allow output; target must allow input
            const srcCanOut = srcDir === 'out' || srcDir === 'inout';
            const tgtCanIn  = tgtDir === 'in'  || tgtDir === 'inout';

            if (!srcCanOut) {
                $.toast({ heading: 'Node Editor', text: 'Source port does not support output', icon: 'warning', loader: false, stack: false });
                return;
            }
            if (!tgtCanIn) {
                $.toast({ heading: 'Node Editor', text: 'Target port does not support input', icon: 'warning', loader: false, stack: false });
                return;
            }
        }

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

            // Re-render both endpoints so ⚙ button state reflects new wire
            if (typeof window.renderNodeDom === 'function') {
                window.renderNodeDom(wp.sourceNodeId);
                window.renderNodeDom(targetNodeId);
            }

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

    // ── Port right-click context menu (Option E) ────────────────────────────────

    _onContextMenu(e) {
        // Only trigger on output ports of table/operator nodes
        const portEl = e.target.closest('.ne-port-out, .ne-port[data-port-id$="-out"]');
        if (!portEl) return;

        e.preventDefault();
        e.stopPropagation();

        const nodeEl   = portEl.closest('.ne-node');
        if (!nodeEl) return;

        const sourceNodeId = nodeEl.dataset.nodeId;
        const sourcePortId = portEl.dataset.portId;

        this._dismissPortMenu();
        this._showPortMenu(e.clientX, e.clientY, sourceNodeId, sourcePortId);
    }

    _showPortMenu(clientX, clientY, sourceNodeId, sourcePortId) {
        const operatorTypes = ['filter', 'vlookup', 'formula', 'join', 'api'];
        const menu = document.createElement('div');
        menu.className = 'ne-port-menu';
        menu.setAttribute('role', 'menu');

        const heading = document.createElement('div');
        heading.className   = 'ne-port-menu-heading';
        heading.textContent = 'Add connected node';
        menu.appendChild(heading);

        operatorTypes.forEach(type => {
            const def  = window.NodeTypes.get(type);
            const item = document.createElement('button');
            item.className   = 'ne-port-menu-item';
            item.setAttribute('role', 'menuitem');
            item.innerHTML   = `<span class="ne-port-menu-icon" style="background:${def.color}">${def.icon}</span><span>${def.label}</span>`;
            item.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this._spawnConnectedNode(type, sourceNodeId, sourcePortId);
                this._dismissPortMenu();
            });
            menu.appendChild(item);
        });

        // Position near cursor, keep inside viewport
        document.body.appendChild(menu);
        this._portMenuEl = menu;

        const vw = window.innerWidth, vh = window.innerHeight;
        const mw = menu.offsetWidth  || 180;
        const mh = menu.offsetHeight || 200;
        menu.style.left = Math.min(clientX, vw - mw - 8) + 'px';
        menu.style.top  = Math.min(clientY, vh - mh - 8) + 'px';

        // Dismiss on outside click
        const dismiss = (e) => {
            if (!menu.contains(e.target)) {
                this._dismissPortMenu();
                document.removeEventListener('mousedown', dismiss);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
    }

    _dismissPortMenu() {
        if (this._portMenuEl) {
            this._portMenuEl.remove();
            this._portMenuEl = null;
        }
    }

    _spawnConnectedNode(type, sourceNodeId, sourcePortId) {
        if (!window.NodeTypes || !window.nodeGraphManager) return;

        const def     = window.NodeTypes.get(type);
        const srcNode = window.NodeGraph.nodes[sourceNodeId];
        if (!srcNode) return;

        // Place new node to the right of the source node
        const x = srcNode.x + (srcNode.width || 280) + 80;
        const y = srcNode.y;

        const label   = def.label + ' ' + (Object.values(window.NodeGraph.nodes).filter(n => n.nodeType === type).length + 1);
        const config  = window.NodeTypes.defaultConfig(type);
        const headers = window.NodeTypes.defaultHeaders(type) || [];
        const newId   = window.nodeGraphManager.addNode(label, x, y, headers, type, config);

        // Determine the target port — the structural input port for this type
        const newNode      = window.NodeGraph.nodes[newId];
        const targetHeader = newNode.headers.find(h => h.direction === 'in');
        const targetPortId = targetHeader ? targetHeader.portId : null;

        if (targetPortId) {
            window.nodeGraphManager.addWire(sourceNodeId, sourcePortId, newId, targetPortId);
        }

        if (typeof window.renderNodeDom === 'function') {
            window.renderNodeDom(newId);
            // Re-render source so its wire-state is current
            window.renderNodeDom(sourceNodeId);
        }

        window.nodeCanvasRenderer.markStaticDirty();
        if (typeof window.saveNodeEditorState === 'function') window.saveNodeEditorState();

        $.toast({
            heading: 'Node Editor',
            text: `Added ${def.label} — configure ⚙ to continue`,
            icon: 'success', loader: false, stack: false, hideAfter: 2500
        });
    }
}

window.nodeInteractionManager = new NodeInteractionManager();
