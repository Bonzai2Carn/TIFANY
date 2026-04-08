# Operation Modes

TIFANY provides three distinct modes of operation to handle different data manipulation and structural requirements. Use the sidebar icons to switch between these modes.

---

## 1. Table Mode (Standard)

The default mode for TIFANY. It provides a visual grid for direct manipulation of table data and structure.

*   **Best For**: Direct editing, manual styling, merging cells, and quick structural adjustments.
*   **Key Features**:
    *   **Drag & Drop**: Reorder rows and columns by dragging them.
    *   **Cell Selection**: Advanced selection logic for single cells, rows, columns, or ranges.
    *   **Context Menu**: Right-click access to most structural and content functions.
    *   **Live Rendering**: Visual feedback as you apply styles and attributes.

---

## 2. Draw Mode (Structure Builder)

Draw Mode is an innovative feature designed to convert unstructured raw data into a clean table structure.

*   **Best For**: Parsing raw text, terminal outputs, or messy lists into a grid format.
*   **Key Features**:
    *   **Interactive Grid**: A blank grid where you can place data elements.
    *   **Bulk Insert**: Paste large blocks of text and insert them sequentially into the grid.
    *   **Paint Mode**: Activate **Paint Mode** to select text fragments and instantly "drop" them into the active cell.
    *   **Auto-Advance**: Configure the cursor to automatically move Right (Row) or Down (Column) after each insertion.
    *   **Grid Resizing**: Dynamically adjust the number of rows and columns to fit your data.

### Workflow
1.  Enter **Draw Mode**.
2.  Paste raw text into the input editor.
3.  Set your desired Grid Size.
4.  Select text in the editor and select **Insert Selected** (or use Paint Mode).
5.  Once the structure is complete, select **Build Table** to generate the final sheet.

---

## 3. Node Editor (Data Pipelines)

The Node Editor is a powerful visual scripting environment for building data processing pipelines.

*   **Best For**: Complex data transformations, merging multiple tables, filtering large datasets, and performing automated calculations.
*   **Key Features**:
    *   **Visual Data Flow**: Connect tables (source) to operators (process) via wires.
    *   **Operator Variety**:
        *   **Filter**: Keep rows matching specific conditions (equals, contains, regex, etc.).
        *   **Formula**: Add computed columns using arithmetic, logic, and string functions.
        *   **Join**: Perform relational merges (Inner, Left, Right, Full Outer) or simple stacking.
        *   **VLookup**: Enrich data by pulling columns from reference tables.
        *   **API**: Fetch live JSON data from external URLs.
    *   **Topological Execution**: The engine automatically calculates the correct processing order.
    *   **Persistence**: Your graph structure is saved automatically between sessions.

### Workflow
1.  Enter **Node Editor**.
2.  Imported sheets appear as **Table Nodes**.
3.  Add **Operator Nodes** via the toolbar or by right-clicking a port.
4.  Connect output ports to input ports.
5.  Configure operators (select the ⚙ icon).
6.  Select **Run** (▶) to execute the pipeline.
7.  Select a destination node and select **Build Table** to export the result.

> [!NOTE]
> For detailed technical information on individual node types and formula syntax, see the [Node Editor Engine Guide](node-editor-engine.md).
