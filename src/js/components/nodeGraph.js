// ===================================================================================
// NODE GRAPH; Data model for nodes, wires, ports, and viewport state
// ===================================================================================

window.NodeGraph = {
    nodes: {},
    wires: {},
    viewport: { x: 0, y: 0, zoom: 1 }
};

class NodeGraphManager {
    constructor() {
        this.graph = window.NodeGraph;
    }

    // ── Nodes ──────────────────────────────────────────────────────────────────

    addNode(label, x, y, headers = []) {
        const id = 'node-' + crypto.randomUUID().slice(0, 8);
        this.graph.nodes[id] = {
            id,
            label,
            x,
            y,
            width: 280,
            collapsed: false,
            selected: false,
            headers,   // [{ portId, label, cellIds: [] }]
            sourceSheetId: null
        };
        return id;
    }

    removeNode(nodeId) {
        // Remove all wires connected to this node first
        Object.keys(this.graph.wires).forEach(wireId => {
            const wire = this.graph.wires[wireId];
            if (wire.sourceNodeId === nodeId || wire.targetNodeId === nodeId) {
                this.removeWire(wireId);
            }
        });

        // Release all cell references
        const node = this.graph.nodes[nodeId];
        if (node) {
            node.headers.forEach(header => {
                header.cellIds.forEach(cellId => window.cellStoreManager.release(cellId));
            });
        }

        delete this.graph.nodes[nodeId];
    }

    moveNode(nodeId, x, y) {
        if (this.graph.nodes[nodeId]) {
            this.graph.nodes[nodeId].x = x;
            this.graph.nodes[nodeId].y = y;
        }
    }

    toggleCollapse(nodeId) {
        if (this.graph.nodes[nodeId]) {
            this.graph.nodes[nodeId].collapsed = !this.graph.nodes[nodeId].collapsed;
        }
    }

    selectNode(nodeId, addToSelection = false) {
        if (!addToSelection) {
            Object.values(this.graph.nodes).forEach(n => { n.selected = false; });
        }
        if (this.graph.nodes[nodeId]) {
            this.graph.nodes[nodeId].selected = true;
        }
    }

    deselectAll() {
        Object.values(this.graph.nodes).forEach(n => { n.selected = false; });
    }

    getSelectedNodes() {
        return Object.values(this.graph.nodes).filter(n => n.selected);
    }

    // ── Wires ──────────────────────────────────────────────────────────────────

    addWire(sourceNodeId, sourcePortId, targetNodeId, targetPortId, type = 'link') {
        if (sourceNodeId === targetNodeId) return null;

        const duplicate = Object.values(this.graph.wires).find(w =>
            w.sourceNodeId === sourceNodeId && w.sourcePortId === sourcePortId &&
            w.targetNodeId === targetNodeId && w.targetPortId === targetPortId
        );
        if (duplicate) return null;

        const id = 'wire-' + crypto.randomUUID().slice(0, 8);
        this.graph.wires[id] = {
            id,
            sourceNodeId,
            sourcePortId,
            targetNodeId,
            targetPortId,
            type,
            hovered: false
        };
        return id;
    }

    removeWire(wireId) {
        delete this.graph.wires[wireId];
    }

    getWiresForNode(nodeId) {
        return Object.values(this.graph.wires).filter(w =>
            w.sourceNodeId === nodeId || w.targetNodeId === nodeId
        );
    }

    // ── Port World Position (reads from DOM after render) ─────────────────────

    getPortWorldPosition(nodeId, portId) {
        const el = document.querySelector(
            `[data-node-id="${nodeId}"] [data-port-id="${portId}"]`
        );
        if (!el) return null;

        const htmlLayer = document.getElementById('nodeHtmlLayer');
        if (!htmlLayer) return null;

        const portRect = el.getBoundingClientRect();
        const layerRect = htmlLayer.getBoundingClientRect();
        const vp = this.graph.viewport;

        // Convert screen-space port center to canvas-space
        const screenX = portRect.left + portRect.width / 2 - layerRect.left;
        const screenY = portRect.top + portRect.height / 2 - layerRect.top;

        return {
            x: (screenX - vp.x) / vp.zoom,
            y: (screenY - vp.y) / vp.zoom
        };
    }

    // ── Viewport ───────────────────────────────────────────────────────────────

    resetViewport() {
        this.graph.viewport = { x: 0, y: 0, zoom: 1 };
    }

    fitToView(containerWidth, containerHeight) {
        const nodes = Object.values(this.graph.nodes);
        if (nodes.length === 0) {
            this.resetViewport();
            return;
        }

        const padding = 60;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            const nw = node.width || 280;
            const nh = node.collapsed ? 42 : 300;
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + nw);
            maxY = Math.max(maxY, node.y + nh);
        });

        const contentW = maxX - minX + padding * 2;
        const contentH = maxY - minY + padding * 2;
        const zoom = Math.min(
            containerWidth / contentW,
            containerHeight / contentH,
            1.5
        );

        this.graph.viewport.zoom = Math.max(0.15, zoom);
        this.graph.viewport.x = (containerWidth / 2) - ((minX + (maxX - minX) / 2) * this.graph.viewport.zoom);
        this.graph.viewport.y = (containerHeight / 2) - ((minY + (maxY - minY) / 2) * this.graph.viewport.zoom);
    }

    // ── Snapshot / Restore ────────────────────────────────────────────────────

    snapshot() {
        return JSON.parse(JSON.stringify(this.graph));
    }

    restore(snap) {
        window.NodeGraph = JSON.parse(JSON.stringify(snap));
        this.graph = window.NodeGraph;
    }
}

window.nodeGraphManager = new NodeGraphManager();
