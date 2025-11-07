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
        $table.css({
            'position': 'relative',
            'cursor': 'move'
        });

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
        // $table.css('position', '');
        $table.css({
            'position': '',
            'cursor': 'cell'
        });

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