// ===================================================================================
// NODE TYPES; Type registry — colors, icons, default config, default port directions
// ===================================================================================

window.NodeTypes = {

    // ── Registry ──────────────────────────────────────────────────────────────
    //
    //  table    — data source (loaded from sheet, no computation)
    //  filter   — keep rows matching a condition
    //  vlookup  — enrich rows by matching a key against another node's column
    //  formula  — add a computed column using an expression
    //  api      — fetch external JSON and expose fields as output columns

    types: {
        table: {
            label:       'Table',
            color:       '#1a73e8',
            cssVar:      '--ne-type-table',
            icon:        '⊞',
            description: 'Data source from an imported sheet',
            defaultConfig: {},
            defaultPorts: 'inout'     // all headers are in+out
        },
        filter: {
            label:       'Filter',
            color:       '#f59e0b',
            cssVar:      '--ne-type-filter',
            icon:        '⊟',
            description: 'Keep rows matching a condition',
            defaultConfig: {
                column:   '',        // portId of column to test
                operator: 'eq',      // eq | ne | gt | lt | gte | lte | contains | regex
                value:    ''
            },
            defaultPorts: 'in'
        },
        vlookup: {
            label:       'VLookup',
            color:       '#8b5cf6',
            cssVar:      '--ne-type-vlookup',
            icon:        '⇄',
            description: 'Match keys and pull values from another node',
            defaultConfig: {
                keyPort:      '',    // portId of key column in incoming data
                refNodeId:    '',    // nodeId of reference table
                refKeyPort:   '',    // portId of key column in reference table
                refValuePort: '',    // portId of value column to pull
                outputLabel:  'Lookup Result'
            },
            defaultPorts: 'in'
        },
        formula: {
            label:       'Formula',
            color:       '#10b981',
            cssVar:      '--ne-type-formula',
            icon:        'ƒ',
            description: 'Add a computed column with an expression',
            defaultConfig: {
                expression:  '',     // e.g. '$Price * $Qty'
                outputLabel: 'Result'
            },
            defaultPorts: 'in'
        },
        api: {
            label:       'API',
            color:       '#ef4444',
            cssVar:      '--ne-type-api',
            icon:        '⇡',
            description: 'Fetch JSON from a URL and map fields to columns',
            defaultConfig: {
                url:      '',
                method:   'GET',
                jsonPath: '',        // dot-path into response e.g. 'data.items'
                headers:  {}
            },
            defaultPorts: 'out'
        }
    },

    // ── Helpers ────────────────────────────────────────────────────────────────

    get(type) {
        return this.types[type] || this.types.table;
    },

    color(type) {
        return (this.types[type] || this.types.table).color;
    },

    icon(type) {
        return (this.types[type] || this.types.table).icon;
    },

    defaultConfig(type) {
        const t = this.types[type];
        return t ? JSON.parse(JSON.stringify(t.defaultConfig)) : {};
    },

    isOperator(type) {
        return type && type !== 'table';
    }
};
