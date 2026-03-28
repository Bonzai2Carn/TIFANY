// ===================================================================================
// NODE EXECUTOR; Topological sort + execution loop
//   1. Kahn's algorithm — detects cycles, returns ordered node list
//   2. async run() — processes each operator node in order, writes output to CellStore
//   3. Handlers: filter, vlookup, formula, api
// ===================================================================================

window.nodeExecutor = (function () {

    // ── Topological sort (Kahn's algorithm) ────────────────────────────────────

    function _topoSort(nodes, wires) {
        // Build adjacency + in-degree
        const ids      = Object.keys(nodes);
        const inDeg    = {};
        const adjOut   = {};   // nodeId → [nodeId, ...]

        ids.forEach(id => { inDeg[id] = 0; adjOut[id] = []; });

        Object.values(wires).forEach(w => {
            if (!nodes[w.sourceNodeId] || !nodes[w.targetNodeId]) return;
            adjOut[w.sourceNodeId].push(w.targetNodeId);
            inDeg[w.targetNodeId]++;
        });

        // Queue: nodes with no incoming edges
        const queue   = ids.filter(id => inDeg[id] === 0);
        const ordered = [];

        while (queue.length) {
            const cur = queue.shift();
            ordered.push(cur);
            adjOut[cur].forEach(next => {
                inDeg[next]--;
                if (inDeg[next] === 0) queue.push(next);
            });
        }

        const cycleNodes = ids.filter(id => !ordered.includes(id));
        return { ordered, cycleNodes };
    }

    // ── Input map builder ─────────────────────────────────────────────────────
    //
    //   inputMap: { targetPortId → { label, values: string[] } }
    //   Built from all wires pointing at the given node.

    function _buildInputMap(nodeId) {
        const csm     = window.cellStoreManager;
        const inputMap = {};

        Object.values(window.NodeGraph.wires).forEach(w => {
            if (w.targetNodeId !== nodeId) return;

            const srcNode = window.NodeGraph.nodes[w.sourceNodeId];
            if (!srcNode) return;

            const basePortId = w.sourcePortId.replace(/-out$/, '');
            const srcHeader  = srcNode.headers.find(h => h.portId === basePortId);
            if (!srcHeader) return;

            const values = srcHeader.cellIds.map(id => {
                const cell = csm.get(id);
                return cell ? cell.value : '';
            });

            inputMap[w.targetPortId] = { label: srcHeader.label, values };
        });

        return inputMap;
    }

    // ── Write output back to a node ───────────────────────────────────────────
    //
    //   outputCols: [{ label, values: string[], direction: 'out' }]

    function _writeOutput(node, outputCols) {
        const csm = window.cellStoreManager;

        // Release all old cell references from existing headers
        node.headers.forEach(h => {
            h.cellIds.forEach(id => csm.release(id));
        });

        // Build new headers with fresh CellStore entries
        node.headers = outputCols.map(col => {
            const cellIds = col.values.map(v => csm.create(String(v)));
            return {
                portId:    'port-' + crypto.randomUUID().slice(0, 8),
                label:     col.label,
                cellIds,
                direction: col.direction || 'out'
            };
        });
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    // filter — keep rows matching (config.column, config.operator, config.value)
    function _handleFilter(node, inputMap) {
        const cfg = node.config || {};
        if (!cfg.column || !inputMap[cfg.column]) {
            throw new Error('Filter: no column selected or no input connected');
        }

        const masterCol = inputMap[cfg.column];
        const allPorts  = Object.keys(inputMap);
        const numRows   = masterCol.values.length;
        const keepIdx   = [];

        for (let r = 0; r < numRows; r++) {
            if (_testRow(masterCol.values[r], cfg.operator, cfg.value)) {
                keepIdx.push(r);
            }
        }

        const outputCols = allPorts.map(portId => {
            const col = inputMap[portId];
            return { label: col.label, values: keepIdx.map(i => col.values[i] || ''), direction: 'out' };
        });

        _writeOutput(node, outputCols);
    }

    function _testRow(val, op, cmp) {
        const vf = parseFloat(val), cf = parseFloat(cmp);
        const numOk = !isNaN(vf) && !isNaN(cf);
        switch (op) {
            case 'eq':       return numOk ? vf === cf : String(val) === String(cmp);
            case 'ne':       return numOk ? vf !== cf : String(val) !== String(cmp);
            case 'gt':       return numOk ? vf > cf : String(val) > String(cmp);
            case 'lt':       return numOk ? vf < cf : String(val) < String(cmp);
            case 'gte':      return numOk ? vf >= cf : String(val) >= String(cmp);
            case 'lte':      return numOk ? vf <= cf : String(val) <= String(cmp);
            case 'contains': return String(val).includes(String(cmp));
            case 'regex':    try { return new RegExp(cmp).test(val); } catch (_) { return false; }
            default:         return true;
        }
    }

    // vlookup — enrich with a column from a reference node by matching keys
    function _handleVlookup(node, inputMap) {
        const cfg = node.config || {};
        if (!cfg.keyPort || !cfg.refNodeId || !cfg.refKeyPort || !cfg.refValuePort) {
            throw new Error('VLookup: incomplete configuration');
        }

        const keyCol = inputMap[cfg.keyPort];
        if (!keyCol) throw new Error('VLookup: key column not connected');

        const refNode     = window.NodeGraph.nodes[cfg.refNodeId];
        if (!refNode) throw new Error('VLookup: reference node not found');

        const csm         = window.cellStoreManager;
        const refKeyHeader = refNode.headers.find(h => h.portId === cfg.refKeyPort);
        const refValHeader = refNode.headers.find(h => h.portId === cfg.refValuePort);
        if (!refKeyHeader || !refValHeader) throw new Error('VLookup: reference columns not found');

        const refKeys   = refKeyHeader.cellIds.map(id => { const c = csm.get(id); return c ? c.value : ''; });
        const refValues = refValHeader.cellIds.map(id => { const c = csm.get(id); return c ? c.value : ''; });

        // Build lookup map
        const lookupMap = {};
        refKeys.forEach((k, i) => { lookupMap[k] = refValues[i]; });

        // Pass through all input columns + add the looked-up column
        const outputCols = Object.entries(inputMap).map(([, col]) => ({
            label: col.label, values: col.values, direction: 'out'
        }));
        outputCols.push({
            label:     cfg.outputLabel || 'Lookup Result',
            values:    keyCol.values.map(k => lookupMap[k] !== undefined ? lookupMap[k] : ''),
            direction: 'out'
        });

        _writeOutput(node, outputCols);
    }

    // formula — add a computed column per row
    function _handleFormula(node, inputMap) {
        const cfg = node.config || {};
        if (!cfg.expression) throw new Error('Formula: no expression configured');

        const numRows    = Math.max(...Object.values(inputMap).map(c => c.values.length), 0);
        const outputVals = [];

        for (let r = 0; r < numRows; r++) {
            const rowCtx = {};
            Object.values(inputMap).forEach(col => {
                rowCtx['$' + col.label] = col.values[r] || '';
            });
            outputVals.push(window.nodeFormulaParser.evaluate(cfg.expression, rowCtx));
        }

        // Pass through all input columns + add the computed column
        const outputCols = Object.entries(inputMap).map(([, col]) => ({
            label: col.label, values: col.values, direction: 'out'
        }));
        outputCols.push({
            label:     cfg.outputLabel || 'Result',
            values:    outputVals,
            direction: 'out'
        });

        _writeOutput(node, outputCols);
    }

    // api — fetch JSON, traverse jsonPath, expose fields as output columns
    async function _handleApi(node) {
        const cfg = node.config || {};
        if (!cfg.url) throw new Error('API: no URL configured');

        let headersObj = {};
        if (cfg.headers && typeof cfg.headers === 'object') headersObj = cfg.headers;

        const response = await fetch(cfg.url, {
            method:  cfg.method || 'GET',
            headers: headersObj
        });

        if (!response.ok) throw new Error(`API: HTTP ${response.status}`);

        let data = await response.json();

        // Traverse jsonPath (e.g. 'data.items')
        if (cfg.jsonPath) {
            const parts = cfg.jsonPath.split('.');
            for (const part of parts) {
                if (data == null || typeof data !== 'object') break;
                data = data[part];
            }
        }

        // Normalise to array of objects
        if (!Array.isArray(data)) {
            data = typeof data === 'object' && data !== null ? [data] : [];
        }

        if (data.length === 0) {
            _writeOutput(node, []);
            return;
        }

        // Collect all unique keys across all rows
        const keys = [];
        data.forEach(row => {
            if (typeof row !== 'object' || row === null) return;
            Object.keys(row).forEach(k => { if (!keys.includes(k)) keys.push(k); });
        });

        const outputCols = keys.map(k => ({
            label:     k,
            values:    data.map(row => (row && row[k] !== undefined) ? String(row[k]) : ''),
            direction: 'out'
        }));

        _writeOutput(node, outputCols);
    }

    // ── Run ───────────────────────────────────────────────────────────────────

    async function run() {
        const nodes = window.NodeGraph.nodes;
        const wires = window.NodeGraph.wires;

        // Mark all operator nodes as running
        Object.values(nodes).forEach(n => {
            if (window.NodeTypes.isOperator(n.nodeType)) {
                n.execState = 'running';
                n.execError = null;
                if (typeof renderNodeDom === 'function') renderNodeDom(n.id);
            }
        });
        window.nodeCanvasRenderer.markStaticDirty();

        // Topo sort
        const { ordered, cycleNodes } = _topoSort(nodes, wires);

        // Mark cycle nodes as errored immediately
        cycleNodes.forEach(id => {
            const n = nodes[id];
            if (!n) return;
            n.execState = 'error';
            n.execError = 'Cycle detected';
            if (typeof renderNodeDom === 'function') renderNodeDom(n.id);
        });

        // Execute in topological order
        let doneCount  = 0;
        let errorCount = cycleNodes.length;

        for (const nodeId of ordered) {
            const node = nodes[nodeId];
            if (!node) continue;
            if (!window.NodeTypes.isOperator(node.nodeType)) continue; // skip table nodes

            try {
                const inputMap = _buildInputMap(nodeId);

                switch (node.nodeType) {
                    case 'filter':  _handleFilter(node, inputMap);       break;
                    case 'vlookup': _handleVlookup(node, inputMap);      break;
                    case 'formula': _handleFormula(node, inputMap);      break;
                    case 'api':     await _handleApi(node);              break;
                    default: break;
                }

                node.execState = 'done';
                doneCount++;
            } catch (err) {
                node.execState = 'error';
                node.execError = err.message || 'Unknown error';
                errorCount++;
            }

            if (typeof renderNodeDom === 'function') renderNodeDom(nodeId);
        }

        window.nodeCanvasRenderer.markStaticDirty();
        if (typeof window.saveNodeEditorState === 'function') window.saveNodeEditorState();

        const summary = errorCount > 0
            ? `Run complete: ${doneCount} succeeded, ${errorCount} failed`
            : `Run complete: ${doneCount} node${doneCount !== 1 ? 's' : ''} processed`;

        $.toast({
            heading: 'Node Editor',
            text:    summary,
            icon:    errorCount > 0 ? 'warning' : 'success',
            loader:  false, stack: false
        });
    }

    return { run };
})();
