// ===================================================================================
// SHEET MANAGER — Excel-style sheet tabs for multi-table support
// ===================================================================================

window.sheets = [];
window.activeSheetId = null;
window._sheetCounter = 0;

/**
 * Add a new sheet with the given name and raw table HTML.
 * Automatically switches to the new sheet.
 */
function addSheet(name, rawHtml) {
    // Save current sheet's container state before switching
    if (window.activeSheetId !== null) {
        _saveActiveSheetState();
    }

    const id = 'sheet-' + (++window._sheetCounter);
    const sheetName = name || ('Sheet ' + window._sheetCounter);

    window.sheets.push({
        id: id,
        name: sheetName,
        rawHtml: rawHtml,
        containerHtml: null   // populated when switching away from this sheet
    });

    // Store raw html for decoupled tab count
    window.lastParsedHtml = rawHtml;

    renderSheetTabs();
    _activateSheet(id);
}

/**
 * Add a blank sheet manually.
 */
function addBlankSheet() {
    const blankTable = '<table class="tablecoil crosshair-table"><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    addSheet('Sheet ' + (window._sheetCounter + 1), blankTable);
}

/**
 * Switch to a different sheet by id.
 */
function switchSheet(id) {
    if (id === window.activeSheetId) return;

    // Save current sheet state
    _saveActiveSheetState();

    window.lastParsedHtml = null; // reset before activating
    _activateSheet(id);
}

/**
 * Rename a sheet (called on dblclick).
 */
function renameSheet(id, newName) {
    const sheet = window.sheets.find(s => s.id === id);
    if (!sheet || !newName.trim()) return;
    sheet.name = newName.trim();
    renderSheetTabs();
}

/**
 * Delete a sheet. Switches to adjacent sheet if active.
 */
function deleteSheet(id) {
    if (window.sheets.length <= 1) {
        $.toast({ heading: 'Sheet', text: 'Cannot delete the only sheet', icon: 'warning', loader: false, stack: false });
        return;
    }

    const idx = window.sheets.findIndex(s => s.id === id);
    if (idx === -1) return;

    const wasActive = (id === window.activeSheetId);
    window.sheets.splice(idx, 1);

    if (wasActive) {
        // Switch to adjacent sheet
        const nextSheet = window.sheets[Math.min(idx, window.sheets.length - 1)];
        window.activeSheetId = null;
        window.lastParsedHtml = null;
        renderSheetTabs();
        _activateSheet(nextSheet.id);
    } else {
        renderSheetTabs();
    }
}

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

function _saveActiveSheetState() {
    if (window.activeSheetId === null) return;
    const sheet = window.sheets.find(s => s.id === window.activeSheetId);
    if (sheet) {
        sheet.containerHtml = $('#tableContainer').html();
    }
}

function _activateSheet(id) {
    const sheet = window.sheets.find(s => s.id === id);
    if (!sheet) return;

    window.activeSheetId = id;
    window.lastParsedHtml = sheet.rawHtml;

    if (sheet.containerHtml) {
        // Restore previously saved container state
        $('#tableContainer').html(sheet.containerHtml);
        window.currentTable = $('#tableContainer table')[0] || null;
        initializeAllFeatures();
        setupTableInteraction();
    } else {
        // First time loading this sheet — render via generateTabs
        generateTabs(sheet.rawHtml);
        window.currentTable = $('#tableContainer table')[0] || null;
        initializeAllFeatures();
        setupTableInteraction();
        window.saveCurrentState();
    }

    renderSheetTabs();
}

/**
 * Re-render the sheet tab bar DOM.
 */
function renderSheetTabs() {
    let $bar = $('#sheetTabBar');
    if (!$bar.length) return;

    $bar.empty();

    window.sheets.forEach(function (sheet) {
        const isActive = sheet.id === window.activeSheetId;
        const $tab = $('<div>')
            .addClass('sheet-tab' + (isActive ? ' active' : ''))
            .attr('data-sheet-id', sheet.id);

        const $label = $('<span>')
            .addClass('sheet-tab-label')
            .text(sheet.name);

        const $close = $('<button>')
            .addClass('sheet-tab-close')
            .attr('title', 'Delete sheet')
            .html('&times;');

        $tab.append($label).append($close);
        $bar.append($tab);

        // Switch on click
        $tab.on('click', function (e) {
            if (!$(e.target).hasClass('sheet-tab-close')) {
                switchSheet(sheet.id);
            }
        });

        // Rename on dblclick
        $label.on('dblclick', function (e) {
            e.stopPropagation();
            const currentName = sheet.name;
            $label.attr('contenteditable', 'true').focus();
            // Select all text
            const range = document.createRange();
            range.selectNodeContents($label[0]);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);

            $label.one('blur keydown', function (ev) {
                if (ev.type === 'blur' || ev.key === 'Enter') {
                    ev.preventDefault();
                    const newName = $label.text().trim() || currentName;
                    $label.removeAttr('contenteditable');
                    renameSheet(sheet.id, newName);
                } else if (ev.key === 'Escape') {
                    $label.text(currentName).removeAttr('contenteditable');
                }
            });
        });

        // Delete on close button click
        $close.on('click', function (e) {
            e.stopPropagation();
            deleteSheet(sheet.id);
        });
    });

    // "+" add blank sheet button
    const $addBtn = $('<button>')
        .addClass('sheet-tab-add')
        .attr('title', 'Add blank sheet')
        .text('+');
    $addBtn.on('click', addBlankSheet);
    $bar.append($addBtn);
}
