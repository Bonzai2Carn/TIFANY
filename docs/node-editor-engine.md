# Node Editor — Execution Engine Guide

## How It Works (The Big Picture)

The Node Editor is a **visual data pipeline**. Data flows from left to right through connected nodes via wires:

```
[ Table Node ] ──wire──▶ [ Filter Node ] ──wire──▶ [ Formula Node ] ──wire──▶ [ Result ]
```

1. **Table nodes** are your raw data — they load automatically from your imported sheets. They have no configuration and do no computation.
2. **Operator nodes** (Filter, VLookup, Formula, API) receive data through wires, transform it, and output the result.
3. When you click **▶ Run**, the engine figures out the correct order to execute nodes (topological sort), runs each one in sequence, and populates the output.

**Ports** are the connection points on each node card:
- **Blue dot (left side)** = input port — data flows **in**
- **Teal dot (right side)** = output port — data flows **out**

Drag from any port to another port to draw a wire. Each wire carries **one column of data** from source to destination.

---

## Workflow Summary

```
1. Import a sheet (it appears as a Table node automatically)
2. Click "Add Node ▾" → choose an operator type
3. Click ⚙ on the operator node → fill in its config → Save
4. Draw wires: from Table node's output ports → to operator node's input ports
5. Click ▶ Run
6. The operator node fills with output rows
7. Optionally wire output into another operator node to chain transforms
8. Click "Build Table" on any node to export it back to a sheet
```

---

## Node Types

---

### Table Node

**What it is:** A read-only view of an imported sheet. Every sheet you load appears as a Table node. It holds the raw data and acts as the starting point for all pipelines.

**Ports:** Each column header has both an input port (blue) and output port (teal), because table nodes can both receive updated data and send data downstream.

**No configuration needed.** Table nodes never need a ⚙ config — they just hold data.

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

**What it does:** Receives rows from a connected table and keeps only the rows that match a condition. Like a SQL `WHERE` clause.

**Inputs:** Any number of columns (wire multiple output ports from a table node in).

**Output:** The same columns, but with only the matching rows.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **Column to filter** | Which column to test against the condition. Only columns that are wired in will appear here. |
| **Operator** | How to compare the column value to your test value (see table below). |
| **Value** | The value to compare against. For `regex` this is a regular expression. |

#### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `= equals` | Exact match (numeric or text) | Column = `100` or Column = `Widget A` |
| `≠ not equals` | Exclude exact match | Column ≠ `0` |
| `> greater than` | Numeric greater than | Price > `20` |
| `< less than` | Numeric less than | Quantity < `10` |
| `≥ >=` | Greater than or equal | Price >= `25` |
| `≤ <=` | Less than or equal | Price <= `10` |
| `contains` | Text substring match | Product contains `Widget` |
| `matches regex` | Regular expression test | Product matches `^Widget [AB]$` |

> **Note on types:** If both the column value and your test value look like numbers, the comparison is numeric. Otherwise it falls back to text comparison.

#### Step-by-Step Example

Goal: Keep only sales where Price > 10.

1. Add a **Filter** node via **Add Node ▾**
2. Wire `Sales.Price ●` (teal output port) → `● Filter input port`
3. Wire `Sales.Product ●` and `Sales.Quantity ●` too (so all columns pass through)
4. Click ⚙ on the Filter node:
   - **Column to filter:** `Price`
   - **Operator:** `> greater than`
   - **Value:** `10`
5. Click **▶ Run**

**Result:** Filter node shows only Widget B (Price=25).

---

### VLookup Node  `⇄ violet`

**What it does:** Matches values in your data against a key column in another table and pulls back a matching value — like Excel VLOOKUP or a SQL JOIN.

**Inputs:** One column that acts as the lookup key (e.g. a product ID or name).

**Output:** All incoming columns, plus a new column containing the matched value from the reference table.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **Key column (incoming)** | The column in your pipeline that you want to look up. This is the value you're searching with. |
| **Reference node** | Which node contains the lookup table. Can be any Table node or another operator node that has already run. |
| **Ref key column** | The column in the reference table to match against. This is what gets searched. |
| **Ref value column** | The column in the reference table to pull back when a match is found. |
| **Output column label** | The name to give the new column that gets added to your output. |

#### How Matching Works

- For each row in your data, the value in the **key column** is looked up in the **ref key column**
- If a match is found, the corresponding value from the **ref value column** is returned
- If no match is found, the cell is left empty

Only the first match is used (same as Excel VLOOKUP with `FALSE`/exact match).

#### Step-by-Step Example

You have two tables:
- **Orders** — `OrderID`, `ProductCode`, `Quantity`
- **Products** — `Code`, `ProductName`, `Price`

Goal: Add the product name and price to your orders.

**Wire for ProductName:**
1. Add a **VLookup** node
2. Wire `Orders.ProductCode ●` → VLookup input
3. Click ⚙:
   - **Key column:** `ProductCode`
   - **Reference node:** `Products`
   - **Ref key column:** `Code`
   - **Ref value column:** `ProductName`
   - **Output label:** `Product Name`
4. Run ▶

**Result:**

| OrderID | ProductCode | Quantity | Product Name |
|---------|-------------|----------|--------------|
| 001     | P-100       | 5        | Widget A     |
| 002     | P-200       | 2        | Widget B     |
| 003     | P-999       | 1        |  *(no match)* |

---

### Formula Node  `ƒ green`

**What it does:** Adds a new computed column to your data by evaluating an expression for every row. Like adding a formula column in Excel.

**Inputs:** The columns whose values you want to use in your expression (wire them in first).

**Output:** All incoming columns, plus the new computed column.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **Expression** | The formula to evaluate per row. Reference column values with `$ColumnName`. |
| **Output column label** | The name of the new column that will be added. |

#### Expression Syntax

Column references use a `$` prefix followed by the column label:

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
$Value % 10             modulo (remainder)
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

**String literals** use single quotes: `'hello'`

**Error values:** If a column reference doesn't exist, or division by zero occurs, the cell shows `#ERR`.

#### Step-by-Step Examples

**Total revenue per row**
- Expression: `$Price * $Qty`
- Output label: `Revenue`

**Discount price**
- Expression: `ROUND($Price * 0.9, 2)`
- Output label: `Discounted Price`

**Grade category**
- Expression: `IF($Score >= 90, 'A', IF($Score >= 70, 'B', 'C'))`
- Output label: `Grade`

**Full name from parts**
- Expression: `CONCAT($FirstName, ' ', $LastName)`
- Output label: `Full Name`

**Margin percentage**
- Expression: `ROUND(($Revenue - $Cost) / $Revenue * 100, 1)`
- Output label: `Margin %`

---

### API Node  `⇡ red`

**What it does:** Fetches JSON data from a URL and turns the response into a table of columns. Useful for bringing in live data from external services without importing a file.

**Inputs:** None required (API nodes are data *sources*, like table nodes — they don't need wires coming in).

**Output:** One output column per JSON field found in the response.

#### Configuration Fields

| Field | What to put |
|-------|------------|
| **URL** | The full URL to fetch from. Must be HTTPS and support CORS. |
| **Method** | `GET` for reading data (most APIs). `POST` if the API requires it. |
| **JSON path** | Optional dot-separated path to drill into the response (see below). Leave blank to use the whole response. |
| **Request headers** | JSON object of extra headers to send. e.g. `{ "Authorization": "Bearer token123" }`. Leave as `{}` if not needed. |

#### JSON Path

Many APIs wrap their data inside nested objects. The JSON path lets you point directly at the array you want.

**Example response:**
```json
{
  "status": "ok",
  "data": {
    "items": [
      { "id": 1, "name": "Alice", "score": 95 },
      { "id": 2, "name": "Bob",   "score": 82 }
    ]
  }
}
```

If JSON path = `data.items`, the node will extract the `items` array and produce:

| id | name  | score |
|----|-------|-------|
| 1  | Alice | 95    |
| 2  | Bob   | 82    |

If you leave JSON path blank, the entire response is used. If the response is a single object (not an array), it becomes one row.

#### Step-by-Step Example

Fetching public posts from JSONPlaceholder (a free test API):

1. Add an **API** node
2. Click ⚙:
   - **URL:** `https://jsonplaceholder.typicode.com/posts`
   - **Method:** `GET`
   - **JSON path:** *(leave blank)*
   - **Headers:** `{}`
3. Click **▶ Run**
4. API node populates with columns: `userId`, `id`, `title`, `body`
5. Wire `API.title ●` to a Filter node → filter where `title` contains a keyword

#### CORS Note

The API must allow cross-origin requests from your browser. Public APIs and services that include `Access-Control-Allow-Origin: *` in their response headers will work. Private or enterprise APIs often require a proxy — the API node cannot bypass browser CORS restrictions.

---

## Chaining Nodes (Pipelines)

Nodes can be chained together. The output of one operator feeds the input of the next.

```
[Table: Orders]
    │ ProductCode ●──────────────────────────┐
    │ Qty ●──────────────────────┐           │
    │ OrderDate ●──────┐         │           │
                       ▼         ▼           ▼
                  [Filter]   [VLookup: enrich with product name]
                  (date > X)     │
                                 ▼
                            [Formula: Revenue = $Price * $Qty]
                                 │
                                 ▼
                            [Build Table → export sheet]
```

**The engine automatically figures out the order.** When you click ▶ Run it performs a topological sort — Table nodes always run "before" the operators that consume them, regardless of where you placed the cards on the canvas.

---

## Cycle Detection

If you accidentally create a loop (Node A → Node B → Node A), the engine detects it and marks the cycle nodes with a red **✕** error badge. Non-cycle nodes still execute. The `execError` will read `"Cycle detected"`.

---

## Exec State Badges

Each operator node shows a small badge after running:

| Badge | Colour | Meaning |
|-------|--------|---------|
| `●` (pulsing) | Amber | Currently running |
| `✓` | Green | Ran successfully |
| `✕` | Red | Failed — hover to see the error message |

The node card border also changes colour to match (amber / green / red).

---

## Building a Table from Output

After running, select any node (click its header) and click **Build Table** in the toolbar. This creates a new sheet from that node's current output data — including any columns added by formula or vlookup nodes.

---

## Quick Reference

| I want to… | Use |
|------------|-----|
| Keep rows matching a condition | **Filter** |
| Add a column from another table by matching a key | **VLookup** |
| Add a calculated column (`Price * Qty`, grades, etc.) | **Formula** |
| Pull live data from a URL into the pipeline | **API** |
| Combine multiple transforms in sequence | Chain nodes with wires |
| Export the result as a sheet | Select node → Build Table |
