$(document).ready(function () {
    // Global variables
    let selectedCells = [];
    let currentTable = null;
    let crosshairEnabled = false;
    let cellBeingEdited = null;
    let originalContent = null;

    // ===================================================================================
    // 1. THE VISUAL GRID MAPPER
    // ===================================================================================
    class VisualGridMapper {
        constructor(table) {
            this.table = $(table);
            this.grid = [];
            this.cellMap = new Map();
            this.buildGrid();
        }

        buildGrid() {
            const rows = this.table.find('tr');
            let maxCols = 0;

            rows.each((rowIndex, row) => {
                this.grid[rowIndex] = this.grid[rowIndex] || [];
            });

            rows.each((rowIndex, row) => {
                let colIndex = 0;
                $(row).find('td, th').each((cellIndex, cell) => {
                    const $cell = $(cell);
                    const colspan = parseInt($cell.attr('colspan') || 1);
                    const rowspan = parseInt($cell.attr('rowspan') || 1);

                    while (this.grid[rowIndex][colIndex] !== undefined) {
                        colIndex++;
                    }

                    this.cellMap.set(cell, {
                        rowspan: rowspan,
                        colspan: colspan,
                        content: $cell.html(),
                        isHeader: $cell.is('th'),
                        startRow: rowIndex,
                        startCol: colIndex
                    });

                    for (let r = 0; r < rowspan; r++) {
                        this.grid[rowIndex + r] = this.grid[rowIndex + r] || [];
                        for (let c = 0; c < colspan; c++) {
                            this.grid[rowIndex + r][colIndex + c] = {
                                element: cell,
                                isOrigin: (r === 0 && c === 0)
                            };
                        }
                    }

                    colIndex += colspan;
                });

                maxCols = Math.max(maxCols, colIndex);
            });

            this.maxCols = maxCols;
            this.maxRows = this.grid.length;
        }

        getCellsInRow(rowIndex) {
            const cells = new Set();
            if (this.grid[rowIndex]) {
                this.grid[rowIndex].forEach(gridCell => {
                    if (gridCell) {
                        cells.add(gridCell.element);
                    }
                });
            }
            return Array.from(cells);
        }

        getCellsInColumn(colIndex) {
            const cells = new Set();
            this.grid.forEach(row => {
                if (row && row[colIndex]) {
                    cells.add(row[colIndex].element);
                }
            });
            return Array.from(cells);
        }

        getVisualPosition(cell) {
            return this.cellMap.get(cell);
        }
    }

    // ===================================================================================
    // 2. RE-USABLE INITIALIZATION FUNCTIONS
    // ===================================================================================
    /**
     * Finds all accordion headers and makes them clickable to toggle sibling rows.
     */
    function initAccordions() {
        $('body').off('click.accordion').on('click.accordion', '.accordion-header', function () {
            $(this).toggleClass('actives');
            $(this).closest('tr').nextUntil('.accordion-header').toggle();
        });
    }

    /**
     * Wires up the crosshair highlighting feature for any table with the .crosshair-table class.
     */
    //==============================================================================================
    // 2.5 The Header Accordion
    //===============================================================================================
    function headerAccordion() {
        $('.accordion').off('click.accordion').on('click.accordion', function () {
            $(this).toggleClass('active');
            const $panel = $(this).next('.panel');
            $panel.slideToggle(200); // toggles between display block/none
        });
    }
    function initCrosshair() {
        $('.crosshair-table').each(function () {
            const $table = $(this);
            if ($table.data('crosshair-initialized')) return;
            $table.data('crosshair-initialized', true);

            const mapper = new VisualGridMapper($table);

            $table.on('mouseenter', 'td, th', function () {
                if (!crosshairEnabled) return;

                const hoveredCell = this;
                const position = mapper.cellMap.get(hoveredCell);
                if (!position) return;

                $table.find('.highlight-row, .highlight-col').removeClass('highlight-row highlight-col');

                const rowCells = new Set(), colCells = new Set();

                for (let r = 0; r < position.rowspan; r++) {
                    mapper.getCellsInRow(position.startRow + r).forEach(cell => rowCells.add(cell));
                }

                for (let c = 0; c < position.colspan; c++) {
                    mapper.getCellsInColumn(position.startCol + c).forEach(cell => colCells.add(cell));
                }

                $(Array.from(rowCells)).addClass('highlight-row');
                $(Array.from(colCells)).addClass('highlight-col');
            });

            $table.on('mouseleave', function () {
                $table.find('.highlight-row, .highlight-col').removeClass('highlight-row highlight-col');
            });
        });
    }

    /**
     * Wires up the column-hiding functionality based on the .sp-option selectors.
     */
    function initSpSelectors() {
        $('body').off('click.sp_selector').on('click.sp_selector', '.sp-option', function () {
            const $option = $(this);
            const panel = $option.closest('.panel');
            const table = panel.find('.tablecoil');
            const spValue = $option.data('value');

            panel.find('.sp-option').removeClass('active');
            $option.addClass('active');

            table.find('[class*="sp-"]').removeClass('active');
            table.find(`.sp-${spValue}`).addClass('active');
        });
    }

    // ===========================TEXT SPLIT FUNCTIONS AND TABLE EDITS===============================
    $('.textSplit').on('click', function () {
        // if (selectedCells.length !== 1) {
        //     alert('Please select exactly one cell to split.');
        //     return;
        // }
        $('#textSplitModal').modal('show');
    });

    $('#applyTextSplit').on('click', function () {
        const colDelimiter = $('#colDelimiter').val();
        const rowDelimiter = $('#rowDelimiter').val();
        const splitDirection = $('#splitDirection').val();

        const cell = selectedCells[0];
        const text = $(cell).text();

        let tableData = [];

        // --- Helper function for splitting ---
        const splitText = (str, delimiter) => {
            if (delimiter === ' ') {
                // Special handling for single space: split by one or more whitespace characters
                return str.trim().split(/\s+/);
            }
            if (delimiter === '') {
                // If the delimiter is an empty string, do not split.
                // This prevents splitting every character.
                return [str];
            }
            // Standard split for other delimiters
            return str.split(delimiter);
        };

        if (splitDirection === 'rows') {
            const rows = splitText(text, rowDelimiter).filter(row => row.trim() !== '');
            tableData = rows.map(row => [row.trim()]);
        } else if (splitDirection === 'columns') {
            const columns = splitText(text, colDelimiter).filter(col => col.trim() !== '');
            tableData = [columns];
        } else {
            const rows = splitText(text, rowDelimiter).filter(row => row.trim() !== '');
            tableData = rows.map(row =>
                splitText(row, colDelimiter).map(cell => cell.trim()).filter(cell => cell !== '')
            );
        }

        // --- Build the table HTML ---
        if (tableData.length > 0 && tableData[0].length > 0) {
            const $cell = $(selectedCells[0]);
            const $row = $cell.closest('tr');
            const cellIndex = $cell.index(); // Get the starting column index

            // A reference to the last row we added, to ensure new rows are inserted in order
            let $lastRow = $row;

            // Process each row from the split data
            tableData.forEach((rowData, rowIndex) => {
                if (rowIndex === 0) {
                    // For the first row of data, we insert the new cells into the existing row
                    const newCellsHtml = rowData.map(cellText => `<td>${cellText}</td>`).join('');
                    $cell.before(newCellsHtml); // Insert the new <td>s before the original cell
                } else {
                    // For all subsequent rows, we create and insert new <tr> elements
                    // 1. Start with empty cells to align the data with the correct starting column
                    let newRowHtml = '<tr>' + '<td></td>'.repeat(cellIndex);

                    // 2. Add the cells with the split data
                    newRowHtml += rowData.map(cellText => `<td>${cellText}</td>`).join('');

                    newRowHtml += '</tr>';

                    // 3. Insert the new row after the last row we processed
                    $lastRow.after(newRowHtml);

                    // 4. Update our reference to point to the newly created row
                    $lastRow = $lastRow.next();
                }
            });

            // Finally, remove the original cell that contained the text
            $cell.remove();

        } else {
            // If no data was produced, just keep the original text
            $(selectedCells[0]).text(text);
        }


        // Close the modal
        $('#textSplitModal').modal('hide');

        // Reinitialize features for the new table
        initializeAllFeatures();
        setupTableInteraction();
    });

    // ====================================== ADD & DELETE FUNCTIONALITY ================================================

    // Add Cell functionality
    function addCell() {
        const selectedCell = selectedCells[0];
        const $selectedCell = $(selectedCell);
        const $row = $selectedCell.parent();
        const cellIndex = $selectedCell.index();

        // Create a new cell
        const $newCell = $('<td>New Cell</td>');

        // Insert the new cell after the selected cell
        $selectedCell.after($newCell);
        $.toast({
            heading: 'Success',
            text: 'Cell(s) added',
            icon: 'success',
            loader: false,
            stack: 'false'
        })
        // Reinitialize features
        initializeAllFeatures();
        setupTableInteraction();
    }


    function deleteCell() {
        // Remove each selected cell
        selectedCells.forEach(cell => {
            $(cell).remove();
        });

        // Clear selection
        selectedCells = [];

        $.toast({
            heading: 'Success',
            text: 'Cell Deleted',
            icon: 'success',
            loader: false,
            stack: 'false'
        })

        // Reinitialize features
        initializeAllFeatures();
        setupTableInteraction();
    }

    function deleteRows() {
        // Get unique rows from selected cells
        const rows = new Set();
        selectedCells.forEach(cell => {
            rows.add($(cell).parent()[0]);
        });

        // Remove each row
        rows.forEach(row => {
            $(row).remove();
        });

        // Clear selection
        selectedCells = [];

        $.toast({
            heading: 'Success',
            text: 'Row(s) deleted',
            icon: 'success',
            loader: false,
            stack: 'false'
        })

        // Reinitialize features
        initializeAllFeatures();
        setupTableInteraction();
    }

    function deleteColumns() {
        if (!currentTable) return;
        const $table = $(currentTable);
        const mapper = new VisualGridMapper($table);

        // Get unique columns from selected cells
        const columns = new Set();
        selectedCells.forEach(cell => {
            const position = mapper.getVisualPosition(cell);
            if (position) {
                columns.add(position.startCol);
            }
        });

        // Convert to array and sort in descending order to remove from right to left
        const colsArray = Array.from(columns).sort((a, b) => b - a);

        // Remove each column
        colsArray.forEach(colIndex => {
            $table.find('tr').each(function () {
                const cells = $(this).find('td, th');
                if (cells[colIndex]) {
                    $(cells[colIndex]).remove();
                }
            });
        });

        // Clear selection
        selectedCells = [];

        $.toast({
            heading: 'Success',
            text: 'Column(s) deleted',
            icon: 'success',
            loader: false,
            stack: 'false'
        })
        // Reinitialize features
        initializeAllFeatures();
        setupTableInteraction();
    }

    $('.addCell').on('click', function () {
        // if (selectedCells.length !== 1) {
        //     alert('Please select exactly one cell to add a new cell next to.');
        //     return;
        // }

        addCell();
    });

    // Delete Cell functionality
    $('.deleteCell').on('click', function () {
        if (selectedCells.length === 0) {
            alert('Please select at least one cell to delete.');
            return;
        }

        deleteCell();

    });
    // Delete Row functionality
    $('.deleteRow').on('click', function () {
        if (selectedCells.length === 0) {
            alert('Please select at least one cell to delete its row.');
            return;
        }

        deleteRows();
    });

    // Delete Column functionality
    $('.deleteColumn').on('click', function () {
        if (selectedCells.length === 0) {
            alert('Please select at least one cell to delete its column.');
            return;
        }

        deleteColumns();
    });

    // Toggle Drag and Drop
    $('#toggleDragDrop').on('click', function () {
        dragDropEnabled = !dragDropEnabled;

        if (dragDropEnabled) {
            $(this).text('Enabled').css({
                'background-color': 'lightgreen',
                'color': 'white',
            });
            enableDragDrop();
        } else {
            $(this).text('Disabled').css({
                'background-color': 'lightgray',
                'color': 'gray',

            });;
            disableDragDrop();
        }
    });
    // ====================================== DRAG AND DROP ================================================
    // Global variables for drag and drop
    let dragDropEnabled = false;
    let draggedElement = null;
    let dragType = null; // 'cell', 'row', or 'column'

    function enableDragDrop() {
        if (!currentTable) return;
        const $table = $(currentTable);
        const mapper = new VisualGridMapper($table);

        // Make the table a positioning context for absolute elements
        $table.css('position', 'relative');

        // --- Enable ROW dragging ---
        $table.find('tr').each(function () {
            // Add a handle to the start of the row for dragging
            $(this).prepend('<td class="drag-handle row-handle">::</td>');
        });
        $table.on('mousedown.drag', '.row-handle', function (e) {
            startRowDrag($(this).parent('tr')[0], e);
        });

        // --- Enable COLUMN dragging ---
        //     const $headerRow = $table.find('tr:first');

        //     $headerRow.find('td, th').each(function (cellIndex) {
        //         // Add a handle to the top of the header cell for dragging
        //         $(this).prepend('<div class="drag-handle col-handle">::</div>');
        //     });
        //     $table.on('mousedown.drag', '.col-handle', function (e) {
        //         const position = mapper.getVisualPosition(this);
        //         // const colIndex = $(this).parent('tr').index();
        //         // startColumnDrag(colIndex, e);
        //         const colIndex = position ? position.startCol : -1;
        //         if (colIndex !== -1) {
        //             startColumnDrag(colIndex, e);
        //         }
        //     });

        //     // --- Enable CELL dragging ---
        //     $table.on('mousedown.drag', 'td:not(.drag-handle), th:not(:has(.col-handle))', function (e) {
        //         // Exclude handles from being draggable as cells
        //         startCellDrag(this, e);
        //     });
        // }

        // COLUMN handles — fix: compute cell index, not row index
        const $headerRow = $table.find('tr:first');
        $headerRow.find('td, th').each(function (cellIndex) {
            $(this).prepend('<div class="drag-handle col-handle">::</div>');
            // store the index on the header cell so handler can read the correct index
            $(this).attr('data-col-index', cellIndex);
        });
        $table.on('mousedown.drag', '.col-handle', function (e) {
            const colIndex = parseInt($(this).closest('td,th').attr('data-col-index'), 10);
            startColumnDrag(colIndex, e);
        });

        // CELL dragging (unchanged)
        $table.on('mousedown.drag', 'td:not(.drag-handle), th:not(:has(.col-handle))', function (e) {
            startCellDrag(this, e);
        });
    }

    function disableDragDrop() {
        if (!currentTable) return;
        const $table = $(currentTable);

        // Remove the relative positioning
        $table.css('position', '');

        // Remove all event listeners namespaced with .drag
        $table.off('.drag');

        // Remove handles
        $table.find('.drag-handle').remove();

        // Clean up any active drag indicators
        endDrag();
    }

    // ===================================================================
    // DRAG ACTION STARTERS
    // ===================================================================

    function startCellDrag(cell, e) {
        e.preventDefault();
        e.stopPropagation();

        dragType = 'cell';
        draggedElement = cell;
        const $cell = $(cell);
        $cell.addClass('dragging');

        // On mouse up ANYWHERE, end the drag
        $(document).one('mouseup', endDrag);

        // Add listeners to potential drop targets
        $(currentTable).find('td, th').on('mouseenter.drag', function () {
            // Don't allow dropping on the element being dragged
            if (this !== draggedElement) {
                $('.drag-over').removeClass('drag-over');
                $(this).addClass('drag-over');
            }
        }).on('mouseup.drag', function () {
            // On mouseup over a valid target, perform the swap
            const dropTarget = this;
            if (draggedElement && dropTarget !== draggedElement) {
                swapCells(draggedElement, dropTarget);
            }
        });
    }

    function startRowDrag(row, e) {
        e.preventDefault();
        e.stopPropagation();

        dragType = 'row';
        draggedElement = row;
        $(row).addClass('row-dragging');

        // Create drop indicators between rows
        $(currentTable).find('tr').each(function () {
            if (this !== draggedElement) {
                $(this).before('<tr class="drop-indicator-row"><td colspan="999"></td></tr>');
            }
        });
        $(currentTable).append('<tr class="drop-indicator-row"><td colspan="999"></td></tr>');

        $(document).one('mouseup', endDrag);

        $(currentTable).on('mouseup.drag', '.drop-indicator-row', function () {
            moveRow(draggedElement, this);
        });
    }

    function startColumnDrag(colIndex, e) {
        e.preventDefault();
        e.stopPropagation();

        dragType = 'column';
        draggedElement = colIndex; // keep as number

        // highlight dragged column
        $(currentTable).find('tr').each(function () {
            $(this).find('td, th').eq(colIndex).addClass('column-dragging');
        });

        // create drop indicators between columns: add a small td/th before each cell and one at end
        $(currentTable).find('tr').each(function () {
            // use a fragment of cells for this row
            const $cells = $(this).find('td, th');
            // insert indicators before each existing cell
            $cells.each(function (idx) {
                $(this).before('<td class="drop-indicator-col" data-indicator-col="' + idx + '"></td>');
            });
            // indicator after last cell: its index equals number of columns
            $(this).append('<td class="drop-indicator-col" data-indicator-col="' + $cells.length + '"></td>');
        });

        $(document).one('mouseup', endDrag);

        // click handler: compute target column index from indicator's data attribute
        $(currentTable).on('mouseup.drag', '.drop-indicator-col', function (ev) {
            const targetCol = parseInt($(this).attr('data-indicator-col'), 10);
            console.log('moveColumn called from', draggedElement, 'to', targetCol);
            moveColumn(draggedElement, targetCol);
        });
    }

    // ===================================================================
    // DRAG ACTIONS
    // ===================================================================

    function swapCells(cell1, cell2) {
        const $cell1 = $(cell1);
        const $cell2 = $(cell2);

        // A simple and effective way to swap DOM elements
        const $temp = $('<div>');
        $cell1.after($temp);
        $cell2.after($cell1);
        $temp.after($cell2).remove();
    }

    function moveRow(draggedRow, indicator) {
        console.log('moveRow called from', indicator, 'to', draggedRow);
        $(indicator).after(draggedRow);
    }

    function moveColumn(fromIndex, toIndex) {
        if (fromIndex === toIndex || fromIndex + 1 === toIndex) { // no-op if identical or adjacent same spot
            endDrag();
            return;
        }

        $(currentTable).find('tr').each(function () {
            const $cells = $(this).find('td, th');
            const $moving = $cells.eq(fromIndex);
            // clone to preserve event handlers/markup, remove original
            const $clone = $moving.clone(true);
            $moving.remove();

            // recompute insertion position: if moving from left to right, removing the cell shifts indices left
            const insertIndex = (fromIndex < toIndex) ? toIndex - 1 : toIndex;
            if (insertIndex >= $cells.length) {
                $(this).append($clone);
            } else {
                $cells.eq(insertIndex).before($clone);
            }
        });

        endDrag();
    }

    // ===================================================================
    // END DRAG
    // ===================================================================

    function endDrag() {
        // Remove all visual indicators
        $('.dragging, .row-dragging, .column-dragging, .drag-over').removeClass('dragging row-dragging column-dragging drag-over');
        $('.drop-indicator-row, .drop-indicator-col').remove();

        // Remove all temporary drag-related event listeners
        if (currentTable) {
            $(currentTable).find('td, th').off('mouseenter.drag mouseup.drag');
            $(currentTable).off('mouseup.drag');
        }

        // Reset state
        draggedElement = null;
        dragType = null;
    }

    // ===================================================================================
    // 3. Table Transpose
    // ===================================================================================
    function transposeTable() {
        if (!currentTable) return;

        const $originalTable = $(currentTable);
        const originalClasses = $originalTable.attr('class');
        const originalId = $originalTable.attr('id');

        $originalTable.off('mouseenter mouseleave');

        const mapper = new VisualGridMapper($originalTable);
        const grid = mapper.grid;
        const transposedGrid = [];

        for (let c = 0; c < mapper.maxCols; c++) {
            transposedGrid[c] = [];
            for (let r = 0; r < mapper.maxRows; r++) {
                transposedGrid[c][r] = (grid[r] && grid[r][c]) ? grid[r][c] : null;
            }
        }

        const $transposedTable = $('<table>')
            .addClass($originalTable.attr('class'))
            .attr('id', $originalTable.attr('id'));

        const visited = new Set();

        transposedGrid.forEach((row, rowIndex) => {
            const $tr = $('<tr>');

            row.forEach((gridCell, colIndex) => {
                const key = `${rowIndex},${colIndex}`;
                if (visited.has(key)) return;

                if (!gridCell || !gridCell.element || !gridCell.isOrigin) {
                    if (!visited.has(key)) {
                        $tr.append('<td> </td>');
                    }
                    return;
                }

                const $originalCell = $(gridCell.element);
                const cellInfo = mapper.cellMap.get(gridCell.element);
                const newRowspan = cellInfo.colspan;
                const newColspan = cellInfo.rowspan;

                const $newCell = $(cellInfo.isHeader ? '<th>' : '<td>')
                    .addClass($originalCell.attr('class'))
                    .attr('id', $originalCell.attr('id'));

                $newCell.html(cellInfo.content);

                if (newRowspan > 1) $newCell.attr('rowspan', newRowspan);
                if (newColspan > 1) $newCell.attr('colspan', newColspan);

                $tr.append($newCell);

                for (let r = 0; r < newRowspan; r++) {
                    for (let c = 0; c < newColspan; c++) {
                        visited.add(`${rowIndex + r},${colIndex + c}`);
                    }
                }
            });

            const originalRow = $(row[0].element).closest('tr');
            $tr.addClass(originalRow.attr('class'))
                .attr('id', originalRow.attr('id'));

            $transposedTable.append($tr);
        });

        $originalTable.replaceWith($transposedTable);
        currentTable = $transposedTable[0];

        initializeAllFeatures();
        setupTableInteraction();
    }

    // ===================================================================================
    // 4. MASTER INITIALIZATION
    // ===================================================================================
    function initializeAllFeatures() {
        initAccordions();
        initCrosshair();
        initSpSelectors();
        headerAccordion();

        const $firstPanel = $('.panel').first();
        if ($firstPanel.length) {
            $firstPanel.show();
            $firstPanel.find('.sp-option').first().trigger('click.sp_selector');
        }
    }

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

        $('#tableContainer').html(tableHtml);
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
        return `<table class="tablecoil crosshair-table"><tr><td>${html.replace(/\n/g, '</td></tr><tr><td>').replace(/\t/g, '</td><td>')}</td></tr></table>`;
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
                tableHtml += '<tr>';
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
                tableHtml += '<tr>';
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
                tableHtml += '<tr>';
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

    // ===================================================================================
    // 6. TABLE MANIPULATION FUNCTIONS
    // ===================================================================================
    function setupTableInteraction() {
        if (!currentTable) return;

        const $table = $(currentTable);

        // Cell selection
        $table.off('click.cell').on('click.cell', 'td, th', function (e) {
            e.stopPropagation();

            if (e.ctrlKey || e.metaKey) {
                // Multi-selection with Ctrl/Cmd
                $(this).toggleClass('selected-cell');

                if ($(this).hasClass('selected-cell')) {
                    if (!selectedCells.includes(this)) {
                        selectedCells.push(this);
                    }
                } else {
                    selectedCells = selectedCells.filter(cell => cell !== this);
                }
            } else {
                // Single selection
                $table.find('.selected-cell').removeClass('selected-cell');
                $(this).addClass('selected-cell');
                selectedCells = [this];
            }
        });

        // Context menu for cells
        $table.off('contextmenu.cell').on('contextmenu.cell', 'td, th', function (e) {
            e.preventDefault();

            const $menu = $('#cellContextMenu');
            $menu.css({
                top: e.pageY + 'px',
                left: e.pageX + 'px'
            }).show();

            cellBeingEdited = this;
        });

        // Hide context menu when clicking elsewhere
        $(document).off('click.hideMenu').on('click.hideMenu', function () {
            $('#cellContextMenu').hide();
        });
    }


    function addRow() {
        if (!currentTable || selectedCells.length === 0) return;

        const $table = $(currentTable);
        const selectedCell = selectedCells[0];
        const $selectedRow = $(selectedCell).closest('tr');
        const colCount = $table.find('tr:first').find('td, th').length;

        let newRowHtml = '<tr>';
        for (let i = 0; i < colCount; i++) {
            newRowHtml += '<td>New Row</td>';
        }
        newRowHtml += '</tr>';

        // Insert the new row after the selected row
        $selectedRow.after(newRowHtml);
        setupTableInteraction();
    }

    function addColumn() {
        if (!currentTable || selectedCells.length === 0) return;

        const $table = $(currentTable);
        const selectedCell = selectedCells[0];
        const cellIndex = $(selectedCell).index();

        $table.find('tr').each(function () {
            const $cells = $(this).find('td, th');
            const $selectedCell = $cells.eq(cellIndex);
            const tagName = $selectedCell.prop('tagName');

            // Insert new column after the selected cell
            $selectedCell.after(`<${tagName}>New Col</${tagName}>`);
        });

        setupTableInteraction();
    }

    function mergeCells() {
        if (selectedCells.length < 2) {
            alert('Please select at least two adjacent cells to merge.');
            return;
        }

        // Use the VisualGridMapper to understand the table's structure
        const mapper = new VisualGridMapper(currentTable);

        // Get the visual position of each selected cell
        const selectionInfo = selectedCells.map(cell => ({
            cell: cell,
            pos: mapper.getVisualPosition(cell)
        })).filter(info => info.pos); // Ensure the cell was found in the map

        if (selectionInfo.length < 2) {
            alert('Could not determine cell positions for merging. Try a simpler selection.');
            return;
        }

        // Sort cells by row, then by column, to easily find the top-left cell
        selectionInfo.sort((a, b) => {
            if (a.pos.startRow !== b.pos.startRow) {
                return a.pos.startRow - b.pos.startRow;
            }
            return a.pos.startCol - b.pos.startCol;
        });

        const firstCellInfo = selectionInfo[0];
        const $firstCell = $(firstCellInfo.cell);

        // Determine the merge direction by checking if all cells are in the same row or same column
        const uniqueRows = new Set(selectionInfo.map(info => info.pos.startRow));
        const uniqueCols = new Set(selectionInfo.map(info => info.pos.startCol));

        let isHorizontalMerge = uniqueRows.size === 1 && uniqueCols.size > 1;
        let isVerticalMerge = uniqueCols.size === 1 && uniqueRows.size > 1;

        if (!isHorizontalMerge && !isVerticalMerge) {
            alert('Merging is only supported for cells in a single continuous row or column.');
            return;
        }

        // --- Perform the merge ---
        let newColspan = firstCellInfo.pos.colspan;
        let newRowspan = firstCellInfo.pos.rowspan;
        let combinedContent = [$firstCell.html()];

        // Remove the other selected cells and accumulate their span and content
        for (let i = 1; i < selectionInfo.length; i++) {
            const info = selectionInfo[i];

            if (isHorizontalMerge) {
                newColspan += info.pos.colspan; // Add the colspan of the cell being merged
            }
            if (isVerticalMerge) {
                newRowspan += info.pos.rowspan; // Add the rowspan of the cell being merged
            }

            combinedContent.push($(info.cell).html());
            $(info.cell).remove(); // Remove the cell from the DOM
        }

        // Update the primary cell's content and span attributes
        $firstCell.html(combinedContent.join(' ')); // Combine content with a space

        if (isHorizontalMerge) {
            $firstCell.attr('colspan', newColspan);
        }
        if (isVerticalMerge) {
            $firstCell.attr('rowspan', newRowspan);
        }

        // Clean up: only the main merged cell should remain in the selection
        selectedCells = [firstCellInfo.cell];
        $(currentTable).find('.selected-cell').removeClass('selected-cell');
        $firstCell.addClass('selected-cell');

        // Re-initialize table interactions
        setupTableInteraction();
    }

    function applyClassId() {
        if (selectedCells.length === 0) {
            alert('Please select at least one cell');
            return;
        }

        const elementType = $('#elementType').val();
        const className = $('#classInput').val();
        const id = $('#idInput').val();
        const cellStyle = $('#styleInput').val();

        const $table = $(currentTable);


        if (elementType === 'cell') {
            selectedCells.forEach(cell => {
                if (className) $(cell).addClass(className);
                if (id) $(cell).attr('id', id);
                if (cellStyle) $(cell).css('style', style);
            });
        } else if (elementType === 'row') {
            const rows = new Set();
            selectedCells.forEach(cell => {
                rows.add($(cell).closest('tr')[0]);
            });

            rows.forEach(row => {
                if (className) $(row).addClass(className);
                if (id) $(row).attr('id', id);
                if (cellStyle) $(row).css('style', style);
            });
        } else if (elementType === 'column') {
            const mapper = new VisualGridMapper($table);
            const cols = new Set();

            selectedCells.forEach(cell => {
                const position = mapper.getVisualPosition(cell);
                if (position) {
                    cols.add(position.startCol);
                }
            });

            cols.forEach(colIndex => {
                const cells = mapper.getCellsInColumn(colIndex);
                cells.forEach(cell => {
                    if (className) $(cell).addClass(className);
                    if (id) $(cell).attr('id', id);
                    if (cellStyle) $(cell).css('style', style);
                });
            });
        }

        // Clear inputs
        // $('#classInput').val('');
        // $('#idInput').val('');
        // $('#styleInput').val('');
    }

    function toggleCrosshair() {
        crosshairEnabled = !crosshairEnabled;
        const $table = $(currentTable);

        if (crosshairEnabled) {
            $table.addClass('crosshair-table');
            initCrosshair();
        } else {
            $table.removeClass('crosshair-table');
            $table.find('.highlight-row, .highlight-col').removeClass('highlight-row highlight-col');
        }
    }

    function applyStyle() {
        if (!currentTable) return;

        const $table = $(currentTable);

        // Add or ensure the table has the tablecoil class
        if (!$table.hasClass('tablecoil')) {
            $table.addClass('tablecoil');
        }

        // Apply some default styling
        $table.css({
            'width': '100%',
            'border-collapse': 'separate',
            'border-spacing': '0',
            'border': '1px solid lightgrey'
        });

        // Style cells
        $table.find('td, th').css({
            'padding': '10px',
            'text-align': 'center',
            'border': '1px solid lightgrey'
        });

        // Style header cells
        $table.find('th').css({
            'background-color': '#f2f2f2',
            'font-weight': 'bold'
        });

        setupTableInteraction();
    }

    function generateCode() {
        if (!currentTable) {
            alert('No table to generate code from');
            return;
        }

        const $table = $(currentTable).clone();

        // Remove interaction classes (condition)
        if (crosshairEnabled) {
            $table.addClass('crosshair-table');
            initCrosshair();
        } else {
            $table.removeClass('crosshair-table');
            $table.find('.highlight-row, .highlight-col').removeClass('highlight-row highlight-col');
        }

        // Add test ID and remove style
        $table.find('tr').attr('id', 'test');
        //remove style
        $table.removeAttr('style');
        $table.find('td').removeAttr('style');

        // Generate clean HTML
        const tableHtml = $('<div>').append($table).html();

        // Format the HTML
        const formattedHtml = formatHtml(tableHtml);

        $('#tableOutput').text(formattedHtml);
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

    function copyInput() {
        const formatBoard = $('#tableOutput').text();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(formatBoard)
                .then(() => {
                    // alert('HTML copied to clipboard!');
                    $.toast({
                        heading: 'Success',
                        text: 'Copied to clipboard',
                        icon: 'success',
                    })
                })
        } else {
            $.toast({
                        heading: 'Error',
                        text: 'Failed to copy HTML to clipboard',
                        icon: 'error',
                    })
        }
    }

    //==================================================================================
    // 6.6 TABLE INTERACTIONS
    //==================================================================================
    function setupTableInteraction() {
        if (!currentTable) return;
        const $table = $(currentTable);
        let isSelecting = false;
        let startCell = null;
        let endCell = null;
        let lastSelectedCell = null;

        // Clear previous event handlers
        $table.off('mousedown.cell mousemove.cell mouseup.cell click.cell');

        // Mouse down - start selection
        $table.on('mousedown.cell', 'td, th', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (e.button === 0) { // Left mouse button only
                if (e.ctrlKey || e.metaKey) {
                    // Toggle individual cell selection with Ctrl/Cmd
                    $(this).toggleClass('selected-cell');
                    if ($(this).hasClass('selected-cell')) {
                        if (!selectedCells.includes(this)) {
                            selectedCells.push(this);
                        }
                    } else {
                        selectedCells = selectedCells.filter(cell => cell !== this);
                    }
                    lastSelectedCell = this;
                } else if (e.shiftKey && lastSelectedCell) {
                    // Shift+Click for range selection
                    endCell = this;
                    selectRange(lastSelectedCell, endCell);
                } else {
                    // Start new selection
                    isSelecting = true;
                    startCell = this;
                    endCell = this;

                    // Clear previous selection
                    $table.find('.selected-cell').removeClass('selected-cell');
                    selectedCells = [];

                    // Select starting cell
                    $(this).addClass('selected-cell');
                    selectedCells.push(this);
                    lastSelectedCell = this;
                }
            }
        });

        // Mouse move - extend selection during drag
        $table.on('mousemove.cell', 'td, th', function (e) {
            if (isSelecting) {
                endCell = this;
                selectRange(startCell, endCell);
            }
        });

        // Mouse up - end selection
        $(document).on('mouseup.cell', function () {
            if (isSelecting) {
                isSelecting = false;
                // Update last selected cell to the end cell of the range
                if (endCell) {
                    lastSelectedCell = endCell;
                }
            }
        });

        // Prevent text selection during drag
        $table.on('selectstart.cell', function (e) {
            if (isSelecting) {
                e.preventDefault();
            }
        });

        // Helper function to select a range of cells
        function selectRange(start, end) {
            if (!start || !end) return;

            const mapper = new VisualGridMapper($table);
            const startPos = mapper.getVisualPosition(start);
            const endPos = mapper.getVisualPosition(end);

            if (!startPos || !endPos) return;

            // Clear previous selection
            $table.find('.selected-cell').removeClass('selected-cell');
            selectedCells = [];

            // Determine the rectangle boundaries
            const minRow = Math.min(startPos.startRow, endPos.startRow);
            const maxRow = Math.max(startPos.startRow + startPos.rowspan - 1, endPos.startRow + endPos.rowspan - 1);
            const minCol = Math.min(startPos.startCol, endPos.startCol);
            const maxCol = Math.max(startPos.startCol + startPos.colspan - 1, endPos.startCol + endPos.colspan - 1);

            // Select all cells in the rectangle
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    if (mapper.grid[r] && mapper.grid[r][c]) {
                        const cell = mapper.grid[r][c].element;
                        if (mapper.grid[r][c].isOrigin) { // Only select the origin cell of merged cells
                            $(cell).addClass('selected-cell');
                            if (!selectedCells.includes(cell)) {
                                selectedCells.push(cell);
                            }
                        }
                    }
                }
            }
        }

        // Context menu for cells
        $table.on('contextmenu.cell', 'td, th', function (e) {
            e.preventDefault();
            const $menu = $('#cellContextMenu');
            $menu.css({
                top: e.pageY + 'px',
                left: e.pageX + 'px'
            }).show();
            cellBeingEdited = this;
        });

        // Hide context menu when clicking elsewhere
        $(document).on('click.hideMenu', function () {
            $('#cellContextMenu').hide();
        });


        // Shortcuts to edit table
        $(document).on('keydown', function (e) {
            if (e.repeat) return;
            // Check if Delete or Backspace key is pressed
            if ((e.key === 'Delete' || e.ctrlKey && e.key === 'Backspace') && !e.altKey && !e.shiftKey) {
                // Prevent default deletion behavior
                e.preventDefault();
                deleteCell();

            } else if (e.key === 'Insert' && !e.repeat) {
                // Prevent default deletion behavior
                e.preventDefault();
                addCell();
            }
        });

        //store original content before editing (for cancel)
        $table.on('focusin', '.inline-cell-editor', function () {
            const $cell = $(this).closest('td, th');
            if (!$cell.data('original')) $cell.data('original', $cell.html());
        });

        // Add a double click to edit cell
        $table.off('dblclick.cell').on('dblclick.cell', 'td, th', function (e) {
            // start editing this cell
            cellBeingEdited = this;
            originalContent = $(this).html();

            // get current HTML (preserve markup if needed)
            content = $(this).html();

            // create an input or textarea sized to the cell
            const $input = $('<textarea>')
                .addClass('inline-cell-editor')
                .val($('<div>').html(content).text()) // strip HTML; use content if you want raw HTML
                .css({
                    width: $(this).innerWidth(),
                    height: $(this).innerHeight(),
                    margin: 0,
                    padding: 0,
                    // border: '1px solid #007bff',
                    resize: 'none',
                    'box-sizing': 'border-box'
                });

            // remove existing editor if any
            $('.inline-cell-editor').remove();

            // replace cell contents with the editor (but keep reference to restore)
            $(this).empty().append($input);
            $input.focus().select();

            // stop propagation so body click handler doesn't immediately save
            e.stopPropagation();
        });

        // clicking elsewhere or pressing Esc exit
        $(document).off('click.cell').on('click.cell', function (e) {
            if (!cellBeingEdited) return;
            const $editor = $('.inline-cell-editor');
            if ($editor.length === 0) return;
            const content = $('<span>').text($editor.val()).html(); // escape to avoid raw HTML
            $(cellBeingEdited).html(content); //restore to original content
            $editor.remove();
            cellBeingEdited = null;
            originalContent = null;
        });

        // save on Enter inside the editor
        $(document).off('keydown.cellEditor').on('keydown.cellEditor', '.inline-cell-editor', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const $editor = $(this);
                const newContent = $('<div>').text($editor.val()).html();
                const $cell = $editor.closest('td, th');
                $cell.html(newContent);
                cellBeingEdited = null;
                $.toast({
                    heading: 'Success',
                    text: 'Cell edited successfully',
                    icon: 'success',
                    loader: false,
                    stack: 'false'
                })
            } else
                if (e.key === 'Escape' && cellBeingEdited) {
                    const $editor = $('.inline-cell-editor');
                    if ($editor.length > 0) {
                        $(cellBeingEdited).html(originalContent); // restore original
                        $editor.remove();
                        cellBeingEdited = null;
                        originalContent = null;
                    }
                }

        });



        // $('#editCell').off('click').on('click', function () {
        //     if (!cellBeingEdited) return;
        //     const content = $(cellBeingEdited).text();
        //     $('#cellContent').val(content);
        //     $('#editCellModal').modal('show');
        // });

        // $('#saveCellContent').off('click').on('click', function () {
        //     if (!cellBeingEdited) return;
        //     const newContent = $('<div>').text($('#cellContent').val()).html();
        //     $(cellBeingEdited).html(newContent);
        //     $('#editCellModal').modal('hide');
        //     cellBeingEdited = null;
        // });
    }

    // ===================================================================================
    // 7. EVENT HANDLERS
    // ===================================================================================
    $('#parseInput').on('click', parseInput);

    $('#transposeTable').on('click', transposeTable);

    $('#toggleCrosshair').on('click', toggleCrosshair);

    $('#applyStyle').on('click', applyStyle);

    $('.addRow').on('click', addRow);

    $('.addColumn').on('click', addColumn);

    $('.mergeCells').on('click', mergeCells);

    $('.applyClassId').on('click', applyClassId);

    $('#generateCode').on('click', generateCode);

    $('#copyInput').on('click', copyInput);

    $('#editCell').on('click', function () {
        if (!cellBeingEdited) return;

        const content = $(cellBeingEdited).html();
        $('#cellContent').val(content);
        $('#editCellModal').modal('show');
    });

    // $('#deleteCell').on('click', function () {
    //     if (!cellBeingEdited) return;

    //     $(cellBeingEdited).remove();
    //     selectedCells = selectedCells.filter(cell => cell !== cellBeingEdited);
    //     cellBeingEdited = null;
    //     $('#cellContextMenu').hide();
    // });

    $('#saveCellContent').on('click', function () {
        if (!cellBeingEdited) return;

        const newContent = $('#cellContent').val();
        $(cellBeingEdited).html(newContent);

        $('#editCellModal').modal('hide');
        cellBeingEdited = null;
    });

    // Initialize
    initializeAllFeatures();
});