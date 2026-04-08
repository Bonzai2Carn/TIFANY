# Functions and Operations

TIFANY provides a suite of tools for manipulating table structure and content. These operations can be accessed via the left panel, the right-click context menu, or keyboard shortcuts.

---

## 1. Structural Operations

These functions allow you to add or remove elements from your table.

### Add Operations
*   **Add Cell**: Inserts a new cell to the right of the selected cell.
*   **Add Row**: Inserts a new row with an identical column count below the selected row.
*   **Add Column**: Inserts a new column to the right of the selected cell's index across the entire table.

### Delete Operations
*   **Delete Cell(s)**: Removes the currently selected cells.
*   **Delete Row(s)**: Removes the entire parent row of each selected cell.
*   **Delete Column(s)**: Removes the entire column associated with each selected cell's index.

---

## 2. Advanced Transformations

### Merge Cells
Combines multiple selected cells into a single larger cell.
*   **Requirement**: You must select at least two adjacent cells.
*   **Behavior**: TIFANY merges the cells and calculates the resulting `colspan` or `rowspan` automatically. Content from the merged cells is combined into the primary (top-left) cell.
*   **Keyboard Shortcut**: `Alt + Shift + W`.

### Transpose Table
Swaps the rows and columns of the entire table.
*   **Behavior**: Existing columns become rows, and rows become columns. All content and visual structure are preserved.
*   **Use Case**: Changing the orientation of a dataset for better readability or fitting into a specific page layout.

### Text Split
Decouples a single cell's content into multiple cells based on specific delimiters.
*   **Requirement**: Select exactly one cell containing delimited text (e.g., a comma-separated list).
*   **Configuration**:
    *   **Row Delimiter**: Characters that define where a new row should start (e.g., `\n`).
    *   **Column Delimiter**: Characters that define where a new column should start (e.g., `,`).
    *   **Split Direction**: Choose whether to split into new Rows, new Columns, or both.
*   **Keyboard Shortcut**: `Alt + Shift + T`.

---

## 3. Editor Features

### Crosshair Navigation
Toggle the **Crosshair** tool to enable row and column highlighting as you move your mouse.
*   **Use Case**: Easier tracking of data in extremely wide or long tables.

### Drag & Drop
Enable **Drag & Drop** to visually reorder your table.
*   **Rows**: Click and drag a row to move it up or down.
*   **Columns**: Click and drag a cell (representing its column) to move it left or right.

### History Management
*   **Undo**: Revert the last operation.
*   **Redo**: Reapply an operation that was undone.
*   **Keyboard Shortcuts**: `Ctrl + Z` (Undo), `Ctrl + Y` or `Ctrl + Shift + Z` (Redo).

---

## 4. Export Formats

TIFANY can generate code in several formats based on your active sheet:

| Format | Description |
| :--- | :--- |
| **HTML** | Clean, formatted HTML `<table>` code ready for web integration. |
| **JSON** | Hierarchical representation of the table data, mapped by headers. |
| **Markdown** | Standard GitHub-flavored markdown table syntax. |
| **CSV** | Comma-separated values, downloadable as a `.csv` file. |
| **SQL** | `CREATE TABLE` and `INSERT` statements for database migration. |

> [!IMPORTANT]
> Always select **Generate** in the right panel after making structural changes to ensure your exported code reflects the latest state of the table.
