// ===================================================================================
// 5. INPUT PARSING FUNCTIONS
// ===================================================================================
function parseInput() {
    const inputType = $('#inputType').val();
    const inputData = $('#tableInput').val().trim();

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
        default:
            alert('Unknown input type');
            return;
    }

    // $('#tableContainer').html(tableHtml);
    generateTabs(tableHtml);
    currentTable = $('#tableContainer table')[0];

    initializeAllFeatures();
    setupTableInteraction();
}

function parseHtmlInput(html) {
    // Check if it's already a table
    if (html.toLowerCase().includes('<table')) {
        return html;
    }

    // Try to extract table-like structure
    const tablePattern = /<table[\s\S]*?<\/table>/gi;
    const match = html.match(tablePattern);

    if (match && match.length > 0) {
        return match[0];
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