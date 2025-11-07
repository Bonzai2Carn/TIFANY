
$(document).ready(function () {
    // Global variables
    let selectedCells = [];
    let currentTable = null;
    let crosshairEnabled = false;
    let cellBeingEdited = null;
    let originalContent = null;

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
                } else if (e.ctr && lastSelectedCell) {
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
        $(document).off('keydown').on('keydown', function (e) {
            if (e.repeat) return;
            // Check if Delete or Backspace key is pressed
            if ((e.key === 'Delete') && !e.altKey && !e.shiftKey) {
                // Prevent default deletion behavior
                e.preventDefault();
                deleteCell();

            } else if (e.key === 'Insert' && !e.repeat) {
                // Prevent default deletion behavior
                e.preventDefault();
                addCell();
            } else if (e.altKey && e.shiftKey && e.key === 'W') {
                e.preventDefault();
                mergeCells();
            } else if (e.altKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                $('#textSplitModal').modal('show');
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

            // Prevent immediate saving when clicking inside the cell
            $input.off('click.preventSave').on('click.preventSave', function (e) {
                e.stopPropagation();
            });

            // stop propagation so body click handler doesn't immediately save
            e.stopPropagation();
        });

        // clicking elsewhere or pressing Esc exit
        $(document).off('click.cell').on('click.cell', function (e) {
            if (!cellBeingEdited) return;
            const $editor = $('.inline-cell-editor');
            if ($editor.length === 0) return;
            if ($(e.target).closest(cellBeingEdited).length) {
                return; // do nothing
            }
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

    //Add Before and After to hovered buttons
    const toolboxButtons = ['.addCell', '.addRow', '.addColumn'];

    // Use poperjs

    toolboxButtons.forEach(selector => {
        const button = document.querySelector(selector);
        const cellOptions = document.querySelector('.cell-options');

        // Create Popper instance variable
        let popperInstance = null;

        // Function to show and set up the cell options
        const showCellOptions = (triggerElement) => {
            // Ensure cell options are visible
            cellOptions.style.display = 'block';

            // Create Popper instance using the global Popper object
            popperInstance = new Popper(triggerElement, cellOptions, {
                placement: 'top',
                // modifiers: {
                //     offset: {
                //         enabled: true,
                //         offset: '0,10' // 10px vertical offset
                //     },
                //     preventOverflow: {
                //         enabled: true,
                //         boundariesElement: 'viewport',
                //         padding: 10
                //     }
                // }
            });

            // Set up click handlers based on the selector
            const beforeCell = cellOptions.querySelector('.beforeCell');
            const afterCell = cellOptions.querySelector('.afterCell');

            // Remove previous event listeners to prevent multiple bindings
            beforeCell.onclick = null;
            afterCell.onclick = null;

            // Add new event listeners based on the current selector
            switch (selector) {
                case '.addCell':
                    beforeCell.onclick = () => {
                        addCellBefore();
                        hideCellOptions();
                    };
                    afterCell.onclick = () => {
                        addCell();
                        console.log("Cell added");
                        hideCellOptions();
                    };
                    break;
                case '.addRow':
                    beforeCell.onclick = () => {
                        addRowBefore();
                        hideCellOptions();
                    };
                    afterCell.onclick = () => {
                        addRow();
                        console.log("Row added");
                        hideCellOptions();
                    };
                    break;
                case '.addColumn':
                    beforeCell.onclick = () => {
                        addColumnBefore();
                        console.log("Column added before");
                        hideCellOptions();
                    };
                    afterCell.onclick = () => {
                        addColumn();
                        console.log("Column added");
                        hideCellOptions();
                    };
                    break;
                default:
                    console.log("That didn't work but hey");
            }
        };

        // hide cell options
        const hideCellOptions = () => {
            if (popperInstance) {
                popperInstance.destroy();
                popperInstance = null;
            }
            cellOptions.style.display = 'none';
        };

        // Add event listeners
        button.addEventListener('mouseenter', (e) => {
            console.log(`${selector} button hovered`);
            showCellOptions(e.currentTarget);
        });

        // button.addEventListener('mouseleave', () => {
        //     // Add a small delay to allow interaction with cell options
        //     setTimeout(hideCellOptions, 500);
        // });

        // Prevent hiding if mouse is over cell options
        cellOptions.addEventListener('mouseenter', () => {
            if (popperInstance) {
                popperInstance.update();
            }
        });

        cellOptions.addEventListener('mouseleave', hideCellOptions);
    });

    // ===================================================================================
    // 7. EVENT HANDLERS
    // ===================================================================================
    $('#generateTabs').on('click', function () {
        // Ensure table is already parsed
        if ($('#tableContainer table').length > 0) {
            generateTabs();
        } else {
            alert('Please parse a table first');
        }
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
                'border': '1px solid #999999;',
                'background-color': '#cccccc',
                'color': '#666666',

            });;
            disableDragDrop();
        }
    });


    $('.applyTextSplit').on('click', applyTextSplit);

    $('#parseInput').on('click', parseInput);

    $('.transposeTable').on('click', transposeTable);

    $('.toggleCrosshair').on('click', toggleCrosshair);

    $('.applyStyle').on('click', applyStyle);

    $('.addCell').on('click', function () {
        if (selectedCells.length !== 1) {
            alert('Please select exactly one cell to add a new cell next to.');
            return;
        }

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

    // $('.addRow').on('click', addRow);

    // $('.addColumn').on('click', addColumn);

    $('.mergeCells').on('click', mergeCells);

    $('#applyClassId').on('click', applyClassId);

    $('#generateCode').on('click', generateCode);

    $('#copyInput').on('click', copyInput);

    $('.editCell').on('click', function () {
        if (!cellBeingEdited) return;

        const content = $(cellBeingEdited).html();
        $('#cellContent').val(content);
        $('#editCellModal').modal('show');
    });

    // $('.deleteCell').on('click', function () {
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