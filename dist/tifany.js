// js/core/tifany.js

$(function () {
    // =================== GLOBAL VARIABLES ===================
    window.selectedCells = [];
    window.currentTable = null;
    window.crosshairEnabled = false;
    window.cellBeingEdited = null;
    window.originalContent = null;
    window.dragDropEnabled = false;
    window.popperInstance = null;
    window.hideTimeout = null;
    // =================== CLEANUP FUNCTION ===================
    function cleanupEventHandlers() {
        $(document).off('.cell .cellEditor .hideMenu .accordion .sp_selector');
        if (window.currentTable) {
            $(window.currentTable).off('.cell .drag');
        }
    }

    // Make cleanupEventHandlers globally accessible
    window.cleanupEventHandlers = cleanupEventHandlers;

    // =================== INITIALIZATION ===================
    function initializeAllFeatures() {
        cleanupEventHandlers();
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

    // Make initializeAllFeatures globally accessible
    window.initializeAllFeatures = initializeAllFeatures;

    // =================== TABLE INTERACTION ===================
    function setupTableInteraction() {
        if (!window.currentTable) return;
        const $table = $(window.currentTable);
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
                        if (!window.selectedCells.includes(this)) {
                            window.selectedCells.push(this);
                        }
                    } else {
                        window.selectedCells = window.selectedCells.filter(cell => cell !== this);
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
                    window.selectedCells = [];

                    // Select starting cell
                    $(this).addClass('selected-cell');
                    window.selectedCells.push(this);
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
            window.selectedCells = [];

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
                        if (mapper.grid[r][c].isOrigin) {
                            $(cell).addClass('selected-cell');
                            if (!window.selectedCells.includes(cell)) {
                                window.selectedCells.push(cell);
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
            window.cellBeingEdited = this;
        });

        // Hide context menu when clicking elsewhere
        $(document).on('click.hideMenu', function () {
            $('#cellContextMenu').hide();
        });

        // ===================================================================================
        // 4. KEYBOARD SHORTCUTS
        // ===================================================================================
        $(document).off('keydown').on('keydown', function (e) {
            if (e.repeat) return;

            if ((e.key === 'Delete') && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                if (typeof deleteCell === 'function') deleteCell();
            } else if (e.key === 'Insert' && !e.repeat) {
                e.preventDefault();
                if (typeof addCell === 'function') addCell();
            } else if (e.altKey && e.shiftKey && e.key === 'W') {
                e.preventDefault();
                if (typeof mergeCells === 'function') mergeCells();
            } else if (e.altKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                $('#textSplitModal').modal('show');
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                performUndo();
            }
            // Ctrl+Y or Ctrl+Shift+Z for redo
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                performRedo();
            }
        });

        // Double click to edit cell
        $table.off('dblclick.cell').on('dblclick.cell', 'td, th', function (e) {
            window.cellBeingEdited = this;
            window.originalContent = $(this).html();

            const content = $(this).html();

            const $input = $('<textarea>')
                .addClass('inline-cell-editor')
                .val($('<div>').html(content).text())
                .css({
                    width: $(this).innerWidth(),
                    height: $(this).innerHeight(),
                    margin: 0,
                    padding: 0,
                    resize: 'none',
                    'box-sizing': 'border-box'
                });

            $('.inline-cell-editor').remove();
            $(this).empty().append($input);
            $input.focus().select();

            $input.off('click.preventSave').on('click.preventSave', function (e) {
                e.stopPropagation();
            });

            e.stopPropagation();
        });

        // Click elsewhere to save
        $(document).off('click.cell').on('click.cell', function (e) {
            if (!window.cellBeingEdited) return;
            const $editor = $('.inline-cell-editor');
            if ($editor.length === 0) return;
            if ($(e.target).closest(window.cellBeingEdited).length) {
                return;
            }
            const content = $('<span>').text($editor.val()).html();
            $(window.cellBeingEdited).html(content);
            $editor.remove();
            window.cellBeingEdited = null;
            window.originalContent = null;
        });

        // Save on Enter
        $(document).off('keydown.cellEditor').on('keydown.cellEditor', '.inline-cell-editor', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const $editor = $(this);
                const newContent = $('<div>').text($editor.val()).html();
                const $cell = $editor.closest('td, th');
                $cell.html(newContent);
                window.cellBeingEdited = null;
                $.toast({
                    heading: 'Success',
                    text: 'Cell edited successfully',
                    icon: 'success',
                    loader: false,
                    stack: false
                });
            } else if (e.key === 'Escape' && window.cellBeingEdited) {
                const $editor = $('.inline-cell-editor');
                if ($editor.length > 0) {
                    $(window.cellBeingEdited).html(window.originalContent);
                    $editor.remove();
                    window.cellBeingEdited = null;
                    window.originalContent = null;
                }
            }
        });
    }

    // Make setupTableInteraction globally accessible
    window.setupTableInteraction = setupTableInteraction;

    // =================== BEFORE/AFTER CELL OPTIONS (FIXED FOR POPPER V1) ===================
    const toolboxButtons = ['.addCell', '.addRow', '.addColumn'];

    toolboxButtons.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        const cellOptions = document.querySelector('.cell-options');

        if (!cellOptions) return;

        buttons.forEach(button => {
            if (!button) return;

            let popperInstance = null;
            let hideTimeout = null;

            const showCellOptions = (triggerElement) => {
                // Clear any pending hide
                if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    hideTimeout = null;
                }

                cellOptions.style.display = 'block';

                // Destroy existing instance
                if (popperInstance) {
                    popperInstance.destroy();
                }

                // FIXED: Use Popper v1.x API (compatible with Bootstrap 4.1.3)
                // Popper v1.x uses 'new Popper()' not 'Popper.createPopper()'
                if (typeof Popper !== 'undefined') {
                    popperInstance = new Popper(triggerElement, cellOptions, {
                        placement: 'top',
                    });
                } else {
                    // Fallback if Popper is not available
                    const rect = triggerElement.getBoundingClientRect();
                    cellOptions.style.position = 'absolute';
                    cellOptions.style.top = (rect.top - cellOptions.offsetHeight - 10) + 'px';
                    cellOptions.style.left = rect.left + 'px';
                }

                // Setup click handlers
                const beforeCell = cellOptions.querySelector('.beforeCell');
                const afterCell = cellOptions.querySelector('.afterCell');

                // Remove previous listeners
                const newBeforeCell = beforeCell.cloneNode(true);
                const newAfterCell = afterCell.cloneNode(true);
                beforeCell.replaceWith(newBeforeCell);
                afterCell.replaceWith(newAfterCell);

                // Get fresh references
                const finalBeforeCell = cellOptions.querySelector('.beforeCell');
                const finalAfterCell = cellOptions.querySelector('.afterCell');

                // Add new listeners based on which button was hovered
                if (selector === '.addCell') {
                    finalBeforeCell.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof addCellBefore === 'function') addCellBefore();
                        hideCellOptions();
                    };
                    finalAfterCell.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof addCell === 'function') addCell();
                        hideCellOptions();
                    };
                } else if (selector === '.addRow') {
                    finalBeforeCell.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof addRowBefore === 'function') addRowBefore();
                        hideCellOptions();
                    };
                    finalAfterCell.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof addRow === 'function') addRow();
                        hideCellOptions();
                    };
                } else if (selector === '.addColumn') {
                    finalBeforeCell.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof addColumnBefore === 'function') addColumnBefore();
                        hideCellOptions();
                    };
                    finalAfterCell.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof addColumn === 'function') addColumn();
                        hideCellOptions();
                    };
                }
            };

            const hideCellOptions = () => {
                hideTimeout = setTimeout(() => {
                    if (popperInstance) {
                        popperInstance.destroy();
                        popperInstance = null;
                    }
                    cellOptions.style.display = 'none';
                }, 200);
            };

            button.addEventListener('mouseenter', (e) => {
                showCellOptions(e.currentTarget);
            });

            // button.addEventListener('mouseleave', () => {
            //     hideCellOptions();
            // });

            cellOptions.addEventListener('mouseenter', () => {
                if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    hideTimeout = null;
                }
            });

            cellOptions.addEventListener('mouseleave', () => {
                hideCellOptions();
            });
        });
    });

    // toolboxButtons.forEach(selector => {
    //     const button = document.querySelector(selector);
    //     const cellOptions = document.querySelector('.cell-options');

    //     // Create Popper instance variable
    //     let popperInstance = null;

    //     // Function to show and set up the cell options
    //     const showCellOptions = (triggerElement) => {
    //         // Ensure cell options are visible
    //         cellOptions.style.display = 'block';

    //         // Create Popper instance using the global Popper object
    //         popperInstance = new Popper(triggerElement, cellOptions, {
    //             placement: 'top',
    //             // modifiers: {
    //             //     offset: {
    //             //         enabled: true,
    //             //         offset: '0,10' // 10px vertical offset
    //             //     },
    //             //     preventOverflow: {
    //             //         enabled: true,
    //             //         boundariesElement: 'viewport',
    //             //         padding: 10
    //             //     }
    //             // }
    //         });

    //         // Set up click handlers based on the selector
    //         const beforeCell = cellOptions.querySelector('.beforeCell');
    //         const afterCell = cellOptions.querySelector('.afterCell');

    //         // Remove previous event listeners to prevent multiple bindings
    //         beforeCell.onclick = null;
    //         afterCell.onclick = null;

    //         // Add new event listeners based on the current selector
    //         switch (selector) {
    //             case '.addCell':
    //                 beforeCell.onclick = () => {
    //                     addCellBefore();
    //                     hideCellOptions();
    //                 };
    //                 afterCell.onclick = () => {
    //                     addCell();
    //                     console.log("Cell added");
    //                     hideCellOptions();
    //                 };
    //                 break;
    //             case '.addRow':
    //                 beforeCell.onclick = () => {
    //                     addRowBefore();
    //                     hideCellOptions();
    //                 };
    //                 afterCell.onclick = () => {
    //                     addRow();
    //                     console.log("Row added");
    //                     hideCellOptions();
    //                 };
    //                 break;
    //             case '.addColumn':
    //                 beforeCell.onclick = () => {
    //                     addColumnBefore();
    //                     console.log("Column added before");
    //                     hideCellOptions();
    //                 };
    //                 afterCell.onclick = () => {
    //                     addColumn();
    //                     console.log("Column added");
    //                     hideCellOptions();
    //                 };
    //                 break;
    //             default:
    //                 console.log("That didn't work but hey");
    //         }
    //     };

    //     // hide cell options
    //     const hideCellOptions = () => {
    //         if (popperInstance) {
    //             popperInstance.destroy();
    //             popperInstance = null;
    //         }
    //         cellOptions.style.display = 'none';
    //     };

    //     // Add event listeners
    //     button.addEventListener('mouseenter', (e) => {
    //         console.log(`${selector} button hovered`);
    //         showCellOptions(e.currentTarget);
    //     });

    //     // button.addEventListener('mouseleave', () => {
    //     //     // Add a small delay to allow interaction with cell options
    //     //     setTimeout(hideCellOptions, 500);
    //     // });

    //     // Prevent hiding if mouse is over cell options
    //     cellOptions.addEventListener('mouseenter', () => {
    //         if (popperInstance) {
    //             popperInstance.update();
    //         }
    //     });

    //     cellOptions.addEventListener('mouseleave', hideCellOptions);
    // });

    // =================== EVENT HANDLERS ===================
    $('#generateTabs').on('click', function () {
        if ($('#tableContainer table').length > 0) {
            if (typeof generateTabs === 'function') generateTabs();
        } else {
            alert('Please parse a table first');
        }
    });

    $('.undoHistory').on('click', function () {
        if ($('#tableContainer table').length > 0) {
            performUndo();
        } else {
            alert('Please parse input');
        }
    });
    $('.redoHistory').on('click', function () {
        if ($('#tableContainer table').length > 0) {
            performRedo();
        } else {
            alert('Please parse input');
        }
    });

    $('#toggleDragDrop').on('click', function () {
        window.dragDropEnabled = !window.dragDropEnabled;

        if (window.dragDropEnabled) {
            $(this).text('Enabled').css({
                'background-color': 'lightgreen',
                'color': 'white',
            });
            if (typeof enableDragDrop === 'function') enableDragDrop();
        } else {
            $(this).text('Disabled').css({
                'border': '1px solid #999999',
                'background-color': '#cccccc',
                'color': '#666666',
            });
            if (typeof disableDragDrop === 'function') disableDragDrop();
        }
    });

    $('.applyTextSplit').on('click', function () {
        if (typeof applyTextSplit === 'function') applyTextSplit();
    });

    $('#parseInput').on('click', function () {
        if (typeof parseInput === 'function') parseInput();
    });

    $('.transposeTable').on('click', function () {
        if (typeof transposeTable === 'function') transposeTable();
    });

    $('.toggleCrosshair').on('click', function () {
        if (typeof toggleCrosshair === 'function') toggleCrosshair();
    });

    $('.applyStyle').on('click', function () {
        if (typeof applyStyle === 'function') applyStyle();
    });

    $('.addCell').on('click', function () {
        if (window.selectedCells.length !== 1) {
            alert('Please select exactly one cell to add a new cell next to.');
            return;
        }
        if (typeof addCell === 'function') addCell();
    });

    $('.deleteCell').on('click', function () {
        if (window.selectedCells.length === 0) {
            alert('Please select at least one cell to delete.');
            return;
        }
        if (typeof deleteCell === 'function') deleteCell();
    });

    $('.deleteRow').on('click', function () {
        if (window.selectedCells.length === 0) {
            alert('Please select at least one cell to delete its row.');
            return;
        }
        if (typeof deleteRows === 'function') deleteRows();
    });

    $('.deleteColumn').on('click', function () {
        if (window.selectedCells.length === 0) {
            alert('Please select at least one cell to delete its column.');
            return;
        }
        if (typeof deleteColumns === 'function') deleteColumns();
    });

    $('.mergeCells').on('click', function () {
        if (typeof mergeCells === 'function') mergeCells();
    });

    $('#applyClassId').on('click', function () {
        if (typeof applyClassId === 'function') applyClassId();
    });

    $('#generateCode').on('click', function () {
        if (typeof generateCode === 'function') generateCode();
    });

    $('#copyInput').on('click', function () {
        if (typeof copyInput === 'function') copyInput();
    });

    $('.editCell').on('click', function () {
        if (!window.cellBeingEdited) return;

        const content = $(window.cellBeingEdited).html();
        $('#cellContent').val(content);
        $('#editCellModal').modal('show');
    });

    $('#saveCellContent').on('click', function () {
        if (!window.cellBeingEdited) return;

        const newContent = $('#cellContent').val();
        $(window.cellBeingEdited).html(newContent);

        $('#editCellModal').modal('hide');
        window.cellBeingEdited = null;
    });

    $('.textSplit').on('click', function () {
        if (window.selectedCells.length === 0) {
            alert('Please select exactly one cell to split.');
            return;
        }
        $('#textSplitModal').modal('show');
    });

    // Initialize
    initializeAllFeatures();
});