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
