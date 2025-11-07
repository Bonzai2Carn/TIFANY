// ===================================================================================
    // 3. Table Transpose
    // ===================================================================================
    function transposeTable() {
        if (!currentTable) return;
        $.toast({
            heading: 'Information',
            text: 'Table must have equal rows and columns to transpose',
            icon: 'info',
            loader: true,        // Change it to false to disable loader
            loaderBg: '#9EC600',  // To change the background
            stack: false,
        })

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
            const $tr = $('<tr id="test">');

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

    // ===========================TEXT SPLIT FUNCTIONS AND TABLE EDITS===============================

    $('.textSplit').on('click', function () {
        if (selectedCells.length === 0) {
            alert('Please select exactly one cell to split.');
            return;
        }
        $('#textSplitModal').modal('show');
    });

    function applyTextSplit() {
        
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

        // --- Process each selected cell ---
        selectedCells.forEach((cell, cellIndex) => {
            const $cell = $(cell);
            const text = $cell.text();
            let tableData = [];

            // Split the text based on direction
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

            // --- Build the table HTML for this cell ---
            if (tableData.length > 0 && tableData[0].length > 0) {
                const $row = $cell.closest('tr');
                const cellIndex = $cell.index();
                let $lastRow = $row;

                // Process each row from the split data
                tableData.forEach((rowData, rowIndex) => {
                    if (rowIndex === 0) {
                        // First row: replace content in existing row
                        const newCellsHtml = rowData.map(cellText => `<td>${cellText}</td>`).join('');
                        $cell.before(newCellsHtml);
                    } else {
                        // Subsequent rows: create new rows
                        let newRowHtml = '<tr>' + '<td></td>'.repeat(cellIndex);
                        newRowHtml += rowData.map(cellText => `<td>${cellText}</td>`).join('');
                        newRowHtml += '</tr>';

                        $lastRow.after(newRowHtml);
                        $lastRow = $lastRow.next();
                    }
                });

                // Remove the original cell
                $cell.remove();
            } else {
                // Keep original text if no split occurred
                $cell.text(text);
            }
        });


        // Close the modal
        $('#textSplitModal').modal('hide');

        // Reinitialize features for the new table
        initializeAllFeatures();
        setupTableInteraction();
    };