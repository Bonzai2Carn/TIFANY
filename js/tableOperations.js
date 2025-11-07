// ====================================== ADD & DELETE FUNCTIONALITY ================================================

    // Add Cell functionality
    function addCell() {
        if (selectedCells.length === 0) {
            alert('Please select a cell.');
            return;
        }
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

    function addCellBefore() {
        if (selectedCells.length === 0) {
            alert('Please select a cell.');
            return;
        }
        const selectedCell = selectedCells[0];
        const $selectedCell = $(selectedCell);
        const $row = $selectedCell.parent();
        const cellIndex = $selectedCell.index();

        // Create a new cell
        const $newCell = $('<td>New Cell</td>');

        // Insert the new cell after the selected cell
        $selectedCell.before($newCell);
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
        if (selectedCells.length === 0) {
            alert('Please select a cell.');
            return;
        }
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
        if (selectedCells.length === 0) {
            alert('Please select a row.');
            return;
        }
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

    

    function addRow() {
        if (!currentTable || selectedCells.length === 0) return;

        const $table = $(currentTable);
        const selectedCell = selectedCells[0];
        const $selectedRow = $(selectedCell).closest('tr');
        const colCount = $table.find('tr:first').find('td, th').length;

        let newRowHtml = '<tr id="test">';
        for (let i = 0; i < colCount; i++) {
            newRowHtml += '<td>New Row</td>';
        }
        newRowHtml += '</tr>';

        // Insert the new row after the selected row
        $selectedRow.after(newRowHtml);
        setupTableInteraction();
    }

    function addRowBefore() {
        if (!currentTable || selectedCells.length === 0) return;

        const $table = $(currentTable);
        const selectedCell = selectedCells[0];
        const $selectedRow = $(selectedCell).closest('tr');
        const colCount = $table.find('tr:first').find('td, th').length;

        let newRowHtml = '<tr id="test">';
        for (let i = 0; i < colCount; i++) {
            newRowHtml += '<td>New Row</td>';
        }
        newRowHtml += '</tr>';

        // Insert the new row after the selected row
        $selectedRow.before(newRowHtml);
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

    function addColumnBefore() {
        if (!currentTable || selectedCells.length === 0) return;

        const $table = $(currentTable);
        const selectedCell = selectedCells[0];
        const cellIndex = $(selectedCell).index();

        $table.find('tr').each(function () {
            const $cells = $(this).find('td, th');
            const $selectedCell = $cells.eq(cellIndex);
            const tagName = $selectedCell.prop('tagName');

            // Insert new column after the selected cell
            $selectedCell.before(`<${tagName}>New Col</${tagName}>`);
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