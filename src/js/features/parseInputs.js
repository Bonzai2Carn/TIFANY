// ===================================================================================
// 5. INPUT PARSING FUNCTIONS
// ===================================================================================
function parseInput() {
    const inputType = $('#inputType').val();
    const inputData = (window.tifanyMonacoInput
        ? window.tifanyMonacoInput.getValue()
        : $('#tableInput').val()
    ).trim();

    if (!inputData) {
        alert('Please input some data');
        return;
    }

    let tableHtml = '';

    switch (inputType) {
        case 'html':
            tableHtml = parseHtmlInput(inputData);
            break;
        case 'ascii':
            tableHtml = parseAsciiInput(inputData);
            break;
        case 'csv':
            tableHtml = parseCsvInput(inputData);
            break;
        case 'text':
            tableHtml = parseTextInput(inputData);
            break;
        case 'markdown':
            tableHtml = parseMarkdownInput(inputData);
            break;
        case 'json':
            tableHtml = parseJsonInput(inputData);
            break;
        case 'sql':
            tableHtml = parseSqlInput(inputData);
            break;
        default:
            alert('Unknown input type');
            return;
    }

    // Close the input modal if open
    $('#inputModal').modal('hide');

    // Route through sheet manager so each parse creates/updates a sheet
    if (typeof addSheet === 'function') {
        const sheetName = 'Sheet ' + (window._sheetCounter + 1);
        addSheet(sheetName, tableHtml);
    } else {
        // Fallback: direct render (no sheet manager loaded)
        window.lastParsedHtml = tableHtml;
        generateTabs(tableHtml);
        window.currentTable = $('#tableContainer table')[0];
        initializeAllFeatures();
        setupTableInteraction();
        window.saveCurrentState();
    }
}

/**
 * Handle a file selected via the Load button.
 * Auto-detects format from extension and parses into a new sheet.
 */
function handleFileLoad(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = function (e) {
        const text = e.target.result;
        let tableHtml = '';

        if (ext === 'html' || ext === 'htm') {
            tableHtml = parseHtmlInput(text);
        } else if (ext === 'csv') {
            tableHtml = parseCsvInput(text);
        } else if (ext === 'tsv') {
            tableHtml = parseTextInput(text);
        } else if (ext === 'md') {
            tableHtml = parseMarkdownInput(text);
        } else if (ext === 'json') {
            tableHtml = parseJsonInput(text);
        } else if (ext === 'sql') {
            tableHtml = parseSqlInput(text);
        } else {
            // .txt and others; try tab-delimited first
            if (text.includes('\t')) {
                tableHtml = parseTextInput(text);
            } else if (text.includes(',')) {
                tableHtml = parseCsvInput(text);
            } else {
                tableHtml = parseTextInput(text);
            }
        }

        if (!tableHtml) {
            alert('Could not parse file: ' + file.name);
            return;
        }

        const sheetName = file.name.replace(/\.[^/.]+$/, ''); // strip extension
        if (typeof addSheet === 'function') {
            addSheet(sheetName, tableHtml);
        } else {
            window.lastParsedHtml = tableHtml;
            generateTabs(tableHtml);
            window.currentTable = $('#tableContainer table')[0];
            initializeAllFeatures();
            setupTableInteraction();
            window.saveCurrentState();
        }

        $.toast({ heading: 'Loaded', text: 'Loaded: ' + file.name, icon: 'success', loader: false, stack: false });
    };

    reader.readAsText(file);
}

function parseHtmlInput(html) {
    // Try to extract table-like structure
    const tablePattern = /<table[\s\S]*?<\/table>/gi;
    const matches = html.match(tablePattern);

    if (matches && matches.length > 0) {
        // Inject .tablecoil and .crosshair-table into every matched table that lacks them
        const normalized = matches.map(tableHtml => {
            return tableHtml.replace(/^<table([^>]*)>/i, (_fullMatch, attrs) => {
                const hasClass = /class\s*=/i.test(attrs);
                if (!hasClass) {
                    return `<table class="tablecoil crosshair-table"${attrs}>`;
                }
                // Add classes if missing
                let updated = attrs.replace(/class\s*=\s*["']([^"']*)["']/i, (_m, existing) => {
                    const classes = existing.split(/\s+/).filter(Boolean);
                    if (!classes.includes('tablecoil')) classes.push('tablecoil');
                    if (!classes.includes('crosshair-table')) classes.push('crosshair-table');
                    return `class="${classes.join(' ')}"`;
                });
                return `<table${updated}>`;
            });
        });
        return normalized.join('\n');
    }

    // If no table found, create a simple table
    return `<table class="tablecoil crosshair-table"><tr id="test"><td>${html.replace(/\n/g, '</td></tr><tr id="test"><td>').replace(/\t/g, '</td><td>')}</td></tr></table>`;
}

function parseAsciiInput(ascii) {
    const lines = ascii.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';

    // Simple ASCII table parser
    let tableHtml = '<table class="tablecoil crosshair-table">';

    lines.forEach((line, index) => {
        if (line.includes('+---') || line.includes('+===')) return; // Skip separator lines

        const cells = line.split('|').filter(cell => cell.trim());

        if (cells.length > 0) {
            tableHtml += '<tr id="test">';
            cells.forEach(cell => {
                const isHeader = index === 0 && line.toLowerCase().includes(cell.toLowerCase());
                tableHtml += isHeader ? `<th>${cell.trim()}</th>` : `<td>${cell.trim()}</td>`;
            });
            tableHtml += '</tr>';
        }
    });

    tableHtml += '</table>';
    return tableHtml;
}

function parseCsvInput(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';

    let tableHtml = '<table class="tablecoil crosshair-table">';

    lines.forEach((line, index) => {
        const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));

        if (cells.length > 0) {
            tableHtml += '<tr id="test">';
            cells.forEach(cell => {
                const isHeader = index === 0;
                tableHtml += isHeader ? `<th>${cell}</th>` : `<td>${cell}</td>`;
            });
            tableHtml += '</tr>';
        }
    });

    tableHtml += '</table>';
    return tableHtml;
}

function parseTextInput(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';

    let tableHtml = '<table class="tablecoil crosshair-table">';

    lines.forEach((line, index) => {
        const cells = line.split(/\t+/).map(cell => cell.trim());

        if (cells.length > 0) {
            tableHtml += '<tr id="test">';
            cells.forEach(cell => {
                const isHeader = index === 0;
                tableHtml += isHeader ? `<th>${cell}</th>` : `<td>${cell}</td>`;
            });
            tableHtml += '</tr>';
        }
    });

    tableHtml += '</table>';
    return tableHtml;
}

/** Parse GitHub-Flavoured Markdown table:
 *  | H1 | H2 |
 *  | -- | -- |
 *  | v1 | v2 |
 */
function parseMarkdownInput(md) {
    const lines = md.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';

    let tableHtml = '<table class="tablecoil crosshair-table">';
    let headerDone = false;

    lines.forEach(line => {
        // Skip separator line (| --- | --- |)
        if (/^\|?[\s|:\-]+\|?$/.test(line)) return;

        const cells = line.split('|').map(c => c.trim()).filter((_, i, a) => {
            // strip empty first/last cells from leading/trailing |
            return !(i === 0 && c === '') && !(i === a.length - 1 && c === '');
        });
        if (cells.length === 0) return;

        tableHtml += '<tr id="test">';
        cells.forEach(cell => {
            tableHtml += headerDone ? `<td>${cell}</td>` : `<th>${cell}</th>`;
        });
        tableHtml += '</tr>';
        headerDone = true;
    });

    tableHtml += '</table>';
    return tableHtml;
}

/** Parse JSON: array of objects → table */
function parseJsonInput(json) {
    let data;
    try { data = JSON.parse(json); } catch (e) {
        alert('Invalid JSON: ' + e.message);
        return '';
    }

    // Support: array of objects, or { table: [...] }, or { table_1: [...], ... }
    if (!Array.isArray(data)) {
        const firstKey = Object.keys(data)[0];
        data = firstKey ? data[firstKey] : [];
    }
    if (!Array.isArray(data) || data.length === 0) {
        alert('JSON must be an array of objects.');
        return '';
    }

    const headers = Object.keys(data[0]);
    let tableHtml = '<table class="tablecoil crosshair-table"><tr id="test">';
    headers.forEach(h => { tableHtml += `<th>${h}</th>`; });
    tableHtml += '</tr>';
    data.forEach(row => {
        tableHtml += '<tr id="test">';
        headers.forEach(h => { tableHtml += `<td>${row[h] !== undefined ? row[h] : ''}</td>`; });
        tableHtml += '</tr>';
    });
    tableHtml += '</table>';
    return tableHtml;
}

/** Parse SQL INSERT statements → table.
 *  Handles: INSERT INTO tbl (col1,col2) VALUES (v1,v2);
 */
function parseSqlInput(sql) {
    const insertRe = /INSERT\s+INTO\s+\S+\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
    let match;
    let headers = null;
    const rows = [];

    while ((match = insertRe.exec(sql)) !== null) {
        if (!headers) {
            headers = match[1].split(',').map(c => c.trim().replace(/[`"']/g, ''));
        }
        const vals = match[2].split(',').map(v => v.trim().replace(/^'|'$/g, '').replace(/''/g, "'"));
        rows.push(vals);
    }

    if (!headers || rows.length === 0) {
        alert('No INSERT statements found in SQL input.');
        return '';
    }

    let tableHtml = '<table class="tablecoil crosshair-table"><tr id="test">';
    headers.forEach(h => { tableHtml += `<th>${h}</th>`; });
    tableHtml += '</tr>';
    rows.forEach(row => {
        tableHtml += '<tr id="test">';
        headers.forEach((_, i) => { tableHtml += `<td>${row[i] !== undefined ? row[i] : ''}</td>`; });
        tableHtml += '</tr>';
    });
    tableHtml += '</table>';
    return tableHtml;
}

function formatHtml(html) {
    // Simple HTML formatter
    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    html = html.replace(reg, '$1\r\n$2$3');

    let pad = 0;
    html.split('\r\n').forEach(node => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/) && pad > 0) {
            pad -= 1;
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        const padding = ''.repeat(pad * 4);
        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted;
}