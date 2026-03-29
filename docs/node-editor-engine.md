# Node Editor — Execution Engine Guide

## How It Works (The Big Picture)

The Node Editor is a **visual data pipeline**. Data flows through connected nodes via wires:

```
[ Table Node ] ──wire──▶ [ Filter Node ] ──wire──▶ [ Formula Node ] ──wire──▶ [ Result ]
```

1. **Table nodes** load automatically from your imported sheets. They hold raw data and are the starting point for all pipelines.
2. **Operator nodes** (Filter, VLookup, Formula, Join, API) receive data through wires, transform it, and output the result.
3. When you click **▶ Run**, the engine determines the correct execution order (topological sort), runs each operator in sequence, and populates output columns.

**Ports** are the connection points on each node card:
- **Blue dot (left side)** = input port — data flows **in**
- **Teal dot (right side)** = output port — data flows **out**

Drag from any teal output port to a blue input port to draw a wire. A wire from a Table node carries **all of that table's columns** into the operator — you don't need to wire every column individually.

---

## Workflow Summary

```
1. Import a sheet → it appears as a Table node automatically
2. Right-click any teal output port on a Table node → pick an operator to add + auto-wire
   — OR — click "Add Node ▾" in the toolbar → pick an operator → manually drag a wire to it
3. Wire connects: ⚙ button becomes active on the operator
4. Click ⚙ → configure the operator → Save
5. Click ▶ Run → operator nodes execute in pipeline order
6. Optionally wire the output into another operator node to chain transforms
7. Select any node → Build Table → export the result as a new sheet
```

---

## Adding Operator Nodes — Two Ways

### Option 1 — Right-click a port (recommended)

Right-click any **teal output port** on a Table node. A context menu appears listing all operator types. Select one and the operator node is:
- Placed to the right of the source node
- Automatically wired to the source
- ⚙ immediately active — go straight to configuration

### Option 2 — Add Node palette

Click **Add Node ▾** in the Node Editor toolbar. Select an operator type from the flyout. The node is placed at canvas center. **You must then wire a Table node's output port to its input port** before ⚙ becomes active.

> **Why the ⚙ button is grayed out:** Operator nodes need to know what columns are available before you can configure them. The ⚙ button unlocks as soon as at least one wire is connected to the node's input port.

---

## State Persistence

The Node Editor **remembers your graph between sessions**. When you switch away (Exit, Draw Mode, Select Tool) and come back, all nodes, wires, positions, and execution results are restored exactly as you left them.

The first time you enter the Node Editor, your imported sheets are loaded as Table nodes. After that, the saved graph is always restored instead.

---

## Node Types

---

### Table Node  `⊞ blue`

**What it is:** A read-only view of an imported sheet. Every sheet you load appears as a Table node. It holds the raw data and acts as the starting point for all pipelines.

**Ports:** Each column header has both an input port (blue) and output port (teal).

**No configuration needed.** Double-click any cell value to edit it inline (copy-on-write — edits don't affect shared data).

**Example:**

```
Sheet: "Sales"
┌──────────────────────┐
│ ▼  Sales      3 cols │
├──────────────────────┤
● Product    ●          ← blue = in port, teal = out port
● Price      ●
● Quantity   ●
├──────────────────────┤
│ Widget A   10   50   │
│ Widget B   25   30   │
│ Widget C   5    100  │
└──────────────────────┘
```

---

### Filter Node  `⊟ amber`

**What it does:** Keeps only the rows that match a condition — all other rows are discarded. Like a SQL `WHERE` clause.

**Input:** Wire any output port from a Table node to the **Input Table** port. All columns from the source are available.

**Output:** The same columns, only the matching rows.

#### Wiring First

The Filter node has a single structural input port labeled **Input Table**. Wire a Table's teal port to this blue port. Once wired, ⚙ becomes active and all source columns appear in the dropdown.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **Column to filter** | Which column to test. All wired-in source columns appear here. |
| **Operator** | How to compare the value (see table below). |
| **Value** | The value to compare against. For `regex` this is a regular expression. |

#### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `= equals` | Exact match (numeric or text) | Price = `25` |
| `≠ not equals` | Exclude exact match | Status ≠ `inactive` |
| `> greater than` | Numeric | Price > `20` |
| `< less than` | Numeric | Qty < `10` |
| `≥ >=` | Greater than or equal | Price >= `25` |
| `≤ <=` | Less than or equal | Price <= `10` |
| `contains` | Text substring | Product contains `Widget` |
| `matches regex` | Regular expression | Product matches `^Widget [AB]$` |

> If both the column value and your test value look like numbers, comparison is numeric. Otherwise text comparison is used.

#### Step-by-Step Example

Goal: Keep only sales where Price > 10.

1. Right-click the `Price ●` port on the Sales table → select **Filter**
2. Filter node is placed and wired automatically
3. Click ⚙:
   - **Column:** `Price`
   - **Operator:** `> greater than`
   - **Value:** `10`
4. Click **▶ Run**

Result: Filter output contains only rows where Price > 10.

---

### VLookup Node  `⇄ violet`

**What it does:** Matches values in your pipeline against a key column in another table and pulls back a matching value. Like Excel VLOOKUP — key-based single-column enrichment.

**Input:** Wire a Table's output to the **Input Table** port. All source columns become available.

**Output:** All incoming columns, plus one new column containing the matched value.

> **VLookup vs Join:** VLookup pulls back a single column from a reference table. Join brings across all columns from both tables. Use VLookup when you only need one extra column; use Join when you need a full merge.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **Key column (incoming)** | The column in your data to search with (e.g. `ProductCode`). |
| **Reference node** | Which Table or operator node holds the lookup data. |
| **Ref key column** | The column in the reference table to match against. |
| **Ref value column** | The column in the reference table to pull back on a match. |
| **Output column label** | Name for the new column added to the output. |

Only the first match is returned (exact match, like `VLOOKUP(..., FALSE)`). Unmatched rows get an empty cell.

#### Step-by-Step Example

Tables: **Orders** (`OrderID`, `ProductCode`, `Quantity`) and **Products** (`Code`, `ProductName`, `Price`)

1. Right-click `ProductCode ●` on Orders → **VLookup**
2. Click ⚙:
   - **Key column:** `ProductCode`
   - **Reference node:** `Products`
   - **Ref key column:** `Code`
   - **Ref value column:** `ProductName`
   - **Output label:** `Product Name`
3. Run ▶

Output: All Orders columns + `Product Name` column.

---

### Formula Node  `ƒ green`

**What it does:** Adds a new computed column by evaluating an expression row-by-row. Like adding a formula column in a spreadsheet.

**Input:** Wire a Table's output to the **Input Table** port. All source columns are available as `$ColumnName` references.

**Output:** All incoming columns, plus the new computed column.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **Expression** | Formula using `$ColumnName` references. |
| **Output column label** | Name for the new computed column. |

The config panel shows available column references as hints (e.g. `$Price` `$Qty`) once a source is wired in.

#### Expression Syntax

```
$Price       →  value of "Price" column for the current row
$Qty         →  value of "Qty" column for the current row
```

**Arithmetic**
```
$Price * $Qty           multiply
$Price + 5              add constant
$Revenue / $Units       divide
$Score ** 2             power (squared)
$Value % 10             modulo
```

**Comparison** (returns `true` or `false`)
```
$Price > 100
$Name == 'Widget A'
$Status != 'inactive'
```

**Logic**
```
$Price > 10 && $Qty > 5
$Category == 'A' || $Category == 'B'
```

**String functions**
```
UPPER($Name)                     → "WIDGET A"
LOWER($Name)                     → "widget a"
TRIM($Name)                      → removes leading/trailing spaces
LEN($Name)                       → number of characters
CONCAT($First, ' ', $Last)       → joins multiple values
```

**Math functions**
```
ROUND($Price, 2)    → round to 2 decimal places
ABS($Diff)          → absolute value
FLOOR($Score)       → round down to integer
CEIL($Score)        → round up to integer
```

**IF / conditional**
```
IF($Price > 100, 'Expensive', 'Affordable')
IF($Qty == 0, 'Out of stock', $Qty)
```

String literals use single quotes: `'hello'`. If a column reference doesn't exist or division by zero occurs, the cell shows `#ERR`.

#### Examples

| Goal | Expression | Output label |
|------|-----------|-------------|
| Total per row | `$Price * $Qty` | `Revenue` |
| 10% discount | `ROUND($Price * 0.9, 2)` | `Discounted Price` |
| Letter grade | `IF($Score >= 90, 'A', IF($Score >= 70, 'B', 'C'))` | `Grade` |
| Full name | `CONCAT($FirstName, ' ', $LastName)` | `Full Name` |
| Margin % | `ROUND(($Revenue - $Cost) / $Revenue * 100, 1)` | `Margin %` |

---

### Join Node  `⋈ sky blue`

**What it does:** Combines two tables in one of six ways — from simple row stacking to full relational joins. The canvas wire direction determines which table is Left and which is Right.

**Inputs:** Two fixed ports — **Left Table** and **Right Table**. Wire a Table node's output to each.

**Output:** Combined columns from both tables (exact shape depends on join mode).

> **Relational vs Non-relational:**
> - Tables **without** a shared key → use **Stack rows** or **Paste columns**
> - Tables **with** a shared key column → use **Inner / Left / Right / Full Outer**
>
> The config panel shows key column selectors only when a key-based mode is selected.

#### Join Modes

| Mode | Needs key? | What it produces |
|------|-----------|-----------------|
| **Stack rows** | No | All rows from Left, then all rows from Right. Columns matched by name; mismatched columns get blank cells. |
| **Paste columns** | No | Left and Right columns side by side, aligned by row index. Row 1 next to Row 1. If tables differ in length, shorter side gets blanks. |
| **Inner Join** | Yes | Only rows where the key value exists in **both** tables. |
| **Left Join** | Yes | All rows from Left. Right columns filled where a key match exists, blank otherwise. |
| **Right Join** | Yes | All rows from Right. Left columns filled where a key match exists, blank otherwise. |
| **Full Outer Join** | Yes | All rows from both tables. Blanks on whichever side has no match. |

#### Configuration Fields (key-based modes only)

| Field | What to put |
|-------|------------|
| **Left key column** | The column in the Left source to match on. |
| **Right key column** | The column in the Right source to match on. |

The config panel shows which tables are connected (green = wired, red = missing) before you choose a mode.

#### If two columns share the same name, the Right column is renamed `ColumnName (right)` to avoid overwriting.

#### Step-by-Step Example — Stack

Two regional sales sheets: **Sales_North** and **Sales_East**, same columns.

1. Add a **Join** node
2. Wire `Sales_North ●` → `● Left Table`
3. Wire `Sales_East ●` → `● Right Table`
4. Click ⚙ → Mode: **Stack rows** → Save
5. Run ▶ → output contains all rows from both sheets combined

#### Step-by-Step Example — Inner Join

Tables: **Employees** (`EmpID`, `Name`, `DeptID`) and **Departments** (`DeptID`, `DeptName`, `Budget`)

1. Add a **Join** node
2. Wire `Employees ●` → `● Left Table`
3. Wire `Departments ●` → `● Right Table`
4. Click ⚙:
   - **Mode:** Inner Join
   - **Left key:** `DeptID`
   - **Right key:** `DeptID`
5. Run ▶ → output contains only employees whose DeptID exists in Departments, with all columns from both tables

---

### API Node  `⇡ red`

**What it does:** Fetches JSON from a URL and turns the response into a table of columns. Acts as a data source — no input wires needed.

**Input:** None required.

**Output:** One output column per JSON field in the response.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **URL** | Full URL to fetch. Must support CORS. |
| **Method** | `GET` (default) or `POST`. |
| **JSON path** | Dot-path into the response to reach the data array (e.g. `data.items`). Leave blank to use the full response. |
| **Request headers** | JSON object of extra headers, e.g. `{ "Authorization": "Bearer token" }`. Use `{}` if none needed. |

#### JSON Path Example

```json
{ "status": "ok", "data": { "items": [ {"id":1,"name":"Alice"}, {"id":2,"name":"Bob"} ] } }
```

JSON path `data.items` → extracts the array → columns: `id`, `name`.

#### CORS Note

The API must include `Access-Control-Allow-Origin: *` in its response. Private/enterprise APIs typically require a server-side proxy — the API node cannot bypass browser security restrictions.

---

## Chaining Nodes (Pipelines)

The output of any operator node can be wired into the input of another:

```
[Table: Orders]
         ●─────────────────────────────────────────────────┐
         ●─────────────────────────┐                       │
         ●──────────┐              │                       │
                    ▼              ▼                       ▼
               [Filter]       [Formula]             [Join: Left]
               date > X       Revenue = $Price*$Qty       │
                    │              │                       │
                    └──────────────┴───────────────────────┘
                                   ▼
                              [Join: Stack]
                                   │
                                   ▼
                            [Build Table → export]
```

When you click **▶ Run**, the engine performs a topological sort — every node always executes after all the nodes it depends on, regardless of where you placed the cards on the canvas.

---

## Removing Nodes

- Click the **✕** button on the node card header to delete that node
- Select one or more nodes (click header, or rubber-band drag), then press **Delete** or **Backspace**
- Deleting a node also removes all its connected wires. Connected operator nodes re-evaluate their ⚙ button state immediately.

---

## Cycle Detection

If you create a loop (Node A → Node B → Node A), the engine detects it and marks the cycle nodes with a red **✕** error badge. Non-cycle nodes still execute normally.

---

## Exec State Badges

Each operator node shows a state badge after running:

| Badge | Colour | Meaning |
|-------|--------|---------|
| *(none)* | — | Idle — not yet run |
| `●` pulsing | Amber | Currently running |
| `✓` | Green | Ran successfully |
| `✕` | Red | Failed — hover for error message |

The node card border colour also changes to match.

---

## Building a Table from Output

Select any node (click its header) → click **Build Table** in the toolbar. A new sheet is created from that node's current output data, including all columns added by operator nodes.

---

## Quick Reference

| I want to… | Use |
|------------|-----|
| Keep rows matching a condition | **Filter** |
| Add one column from another table by key | **VLookup** |
| Add a calculated column | **Formula** |
| Stack two tables' rows together | **Join** → Stack rows |
| Paste two tables' columns side by side | **Join** → Paste columns |
| Merge by a shared key column | **Join** → Inner / Left / Right / Outer |
| Pull live data from a URL | **API** |
| Chain multiple transforms | Wire operator outputs into next operator's input |
| Export the result as a sheet | Select node → Build Table |
| Add an operator quickly (pre-wired) | Right-click a teal port → choose operator |
| Remove a node | Click ✕ on card, or select + Delete key |
