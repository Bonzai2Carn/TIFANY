# TafneEngine — Standalone Engine Reference

`TafneEngine` is the computation layer extracted from Table IDE and exposed as a standalone namespace. The three engines below run independently of the table editor UI — no HTML shell required, no sheet state, no jQuery for two of the three.

```js
window.TafneEngine = {
  FormulaParser,    // expression evaluator      — zero DOM, worker-safe
  LabFunctions,     // 26 validate/transform fns — zero DOM, worker-safe
  VisualGridMapper, // grid coordinate engine    — DOM, main-thread
  version: '2.0.0'
}
```

**Loading**

```html
<!-- individual scripts (development) -->
<script src="src/js/components/visualGridMapper.js"></script>
<script src="src/js/features/nodeFormulaParser.js"></script>
<script src="src/js/features/labFunctions.js"></script>
<script src="src/js/core/engine.js"></script>
<!-- TafneEngine is now available on window -->
```

---

## FormulaParser  *(worker-safe)*

A recursive descent expression evaluator. Takes a formula string and a row context object, returns a string result. Never throws — malformed expressions return `'#ERR'`.

**When to use it:** Any time you need user-defined computed columns in a table-like interface — no-code tools, reporting dashboards, ETL UIs — and you cannot use `eval()` for security reasons.

### API

| Method | Signature | Returns |
|--------|-----------|---------|
| `evaluate` | `(expr: string, rowCtx: object) → string` | Result as string, or `'#ERR'` |
| `validate` | `(expr: string) → null \| string` | `null` = valid; error message if invalid |

`rowCtx` maps column names (prefixed with `$`) to their string values for the current row:

```js
{ '$Price': '49.99', '$Qty': '3', '$Label': 'Widget A' }
```

### Supported syntax

| Feature | Syntax | Example |
|---------|--------|---------|
| Column reference | `$ColumnName` or `${Column Name}` | `$Price` |
| Arithmetic | `+ - * / % **` | `$Price * $Qty` |
| Comparison | `== != > < >= <=` | `$Qty > 5` |
| Logical | `&& \|\|` (short-circuit) | `$Active == 'true' && $Qty > 0` |
| Unary | `- !` | `!$Archived` |
| Parentheses | `( expr )` | `($Price - $Cost) / $Price` |
| String literals | `'text'` | `'bulk'` |
| Number literals | `42  3.14` | `$Price * 1.08` |
| Functions | see below | `ROUND($Price, 2)` |

### Built-in functions

| Function | Signature | Example |
|----------|-----------|---------|
| `IF` | `IF(cond, then, else)` | `IF($Qty > 10, 'bulk', 'standard')` |
| `UPPER` | `UPPER(str)` | `UPPER($Label)` |
| `LOWER` | `LOWER(str)` | `LOWER($Status)` |
| `TRIM` | `TRIM(str)` | `TRIM($Name)` |
| `LEN` | `LEN(str)` | `LEN($Notes)` |
| `CONCAT` | `CONCAT(a, b, ...)` | `CONCAT($First, ' ', $Last)` |
| `ROUND` | `ROUND(n, decimals)` | `ROUND($Price * 1.08, 2)` |
| `ABS` | `ABS(n)` | `ABS($Delta)` |
| `FLOOR` | `FLOOR(n)` | `FLOOR($Score)` |
| `CEIL` | `CEIL(n)` | `CEIL($Rating)` |

> Numeric comparison is applied automatically when both operands look like numbers. Otherwise string comparison is used. Division by zero returns `'#ERR'`.

### Examples

```js
const fp = TafneEngine.FormulaParser;
const row = { '$Price': '49.99', '$Qty': '3', '$Tag': 'widget' };

fp.evaluate('$Price * $Qty', row);
// → '149.97'

fp.evaluate("IF($Qty > 5, 'bulk', 'standard')", row);
// → 'standard'

fp.evaluate('ROUND($Price * 1.08, 2)', row);
// → '53.99'

fp.evaluate('CONCAT(UPPER($Tag), \'-\', $Qty)', row);
// → 'WIDGET-3'

// Validate before saving a user-entered formula
fp.validate('$Price * ');
// → 'Unexpected token: {"t":"EOF"}'  (non-null = invalid)

fp.validate('$Price * $Qty');
// → null  (valid)
```

**Web Worker usage**

```js
// worker.js
importScripts('nodeFormulaParser.js', 'engine.js');

self.onmessage = function (e) {
  const { rows, formula, headers } = e.data;
  const results = rows.map(function (row) {
    const ctx = {};
    headers.forEach(function (h, i) { ctx['$' + h] = row[i]; });
    return TafneEngine.FormulaParser.evaluate(formula, ctx);
  });
  self.postMessage(results);
};
```

---

## LabFunctions  *(worker-safe)*

26 pure functions for data validation, transformation, and analysis. Every function receives `(rows, params)` and returns a result. No DOM, no globals, no side effects.

**When to use it:** Data quality pipelines — CSV import wizards, ETL UIs, batch audit tools. The functions match exactly what users see in Table IDE's Lab Mode, so running them server-side or in a worker gives consistent results with the in-browser experience.

**Input shape** — flat array of plain objects, one per row, keys as column names:

```js
const rows = [
  { Name: 'Alice', Age: '29', Email: 'alice@co.com' },
  { Name: '',      Age: '31', Email: 'bob@co.com'   },
  { Name: 'Alice', Age: 'n/a', Email: 'alice@co.com' },
];
```

### Validate functions

Return `flags[]` — an array of `{ rowIndex, message, level: 'error' | 'warn' }` objects. An empty array means no issues found.

| Function | Params | What it flags |
|----------|--------|--------------|
| `flagEmpty` | `{ column }` | Rows where the column is empty or whitespace-only |
| `flagDuplicate` | `{ column }` | Rows where the column value is not unique |
| `flagOutOfRange` | `{ column, min, max }` | Rows where numeric value falls outside [min, max] |
| `flagNonNumeric` | `{ column }` | Rows where the value is not a valid number |
| `flagPatternMismatch` | `{ column, pattern }` | Rows where the value does not match a regex |
| `flagLeadingTrailingSpace` | `{ column }` | Rows with leading or trailing whitespace |

### Transform functions

Return a new `rows[]` array with the transformation applied. Original array is not mutated.

| Function | Params | What it does |
|----------|--------|-------------|
| `trimWhitespace` | `{ column }` | Trim leading/trailing whitespace from all values |
| `normalizeCase` | `{ column, mode: 'upper'\|'lower'\|'title' }` | Apply case normalization |
| `replaceValue` | `{ column, find, replace }` | String replace (substring or regex) |
| `fillEmpty` | `{ column, fill }` | Replace empty values with a default |
| `dedupeRows` | `{ column }` | Remove rows with duplicate values in column (keeps first) |
| `filterRows` | `{ column, op, value }` | Keep only rows matching a condition |
| `sortRows` | `{ column, order: 'asc'\|'desc' }` | Sort rows by column value |
| `addColumn` | `{ name, formula }` | Append a computed column using FormulaParser syntax |
| `renameColumn` | `{ from, to }` | Rename a column key across all rows |
| `dropColumn` | `{ column }` | Remove a column from all rows |
| `numberFormat` | `{ column, decimals }` | Round numeric values to N decimal places |

### Analyze functions

Return a summary object describing the column's data distribution.

| Function | Params | Returns |
|----------|--------|---------|
| `countValues` | `{ column }` | `{ [value]: count }` frequency map |
| `numericStats` | `{ column }` | `{ min, max, mean, sum, count, nullCount }` |
| `nullRatio` | `{ column }` | `{ total, nullCount, ratio }` |
| `uniqueCount` | `{ column }` | `{ total, unique, duplicates }` |
| `detectType` | `{ column }` | `{ type: 'integer'\|'float'\|'date'\|'boolean'\|'text', confidence }` |
| `pivotTable` | `{ rowKey, colKey, valueKey, agg }` | 2D pivot object keyed by row/col values |
| `histogramBuckets` | `{ column, buckets }` | `[{ label, count }]` array of N buckets |
| `correlationScore` | `{ colA, colB }` | Pearson r as number in [-1, 1] |
| `topN` | `{ column, n }` | `[{ value, count }]` top N most frequent values |

### Example — chained pipeline

```js
const lf = TafneEngine.LabFunctions;

// 1. Clean
let rows = lf.trimWhitespace(rawRows, { column: 'Name' });
rows = lf.normalizeCase(rows, { column: 'Status', mode: 'lower' });

// 2. Validate
const errors = [
  ...lf.flagEmpty(rows,      { column: 'Name' }),
  ...lf.flagDuplicate(rows,  { column: 'Email' }),
  ...lf.flagNonNumeric(rows, { column: 'Age' }),
];
// errors → [{ rowIndex, message, level }, ...]

// 3. Analyze
const stats = lf.numericStats(rows, { column: 'Age' });
// → { min: 22, max: 61, mean: 34.2, sum: 1710, count: 50, nullCount: 2 }

const freq = lf.countValues(rows, { column: 'Status' });
// → { active: 38, inactive: 10, pending: 2 }
```

---

## VisualGridMapper  *(DOM · main-thread)*

Analyzes an HTML `<table>` element and builds a virtual 2D grid that correctly accounts for `colspan` and `rowspan` merges. Without it, `table.rows[r].cells[c]` returns wrong answers on any table that has merged cells.

**When to use it:** Drag-and-drop reordering, range selection, copy/paste, column operations — any table manipulation that needs to know the true visual position of a cell. Required whenever your table can contain merged cells.

> **Dependency:** VisualGridMapper uses jQuery internally. jQuery must be loaded before instantiating it.

### Constructor

```js
const mapper = new TafneEngine.VisualGridMapper(tableEl);
// tableEl: HTMLTableElement or jQuery wrapper — both accepted
// buildGrid() is called automatically in the constructor
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `maxRows` | `number` | Total number of visual rows in the grid |
| `maxCols` | `number` | Total number of visual columns in the grid |
| `grid` | `Array<Array<{element, isOrigin}>>` | Raw 2D grid; each slot points to its origin `<td>` or `<th>` |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getVisualPosition(cell)` | `{ startRow, startCol, rowspan, colspan, isHeader, content }` | Grid position of a cell element |
| `getCellsInRow(rowIndex)` | `HTMLElement[]` | All unique origin cells that occupy visual row *rowIndex* |
| `getCellsInColumn(colIndex)` | `HTMLElement[]` | All unique origin cells that occupy visual column *colIndex* |

### Example

```
A table where row 0, col 1 is merged across 2 rows:

  ┌───────┬───────────┐
  │  A1   │    B1     │  ← B1 has rowspan=2
  ├───────┤           │
  │  A2   │           │
  └───────┴───────────┘
```

```js
const mapper = new TafneEngine.VisualGridMapper(document.querySelector('table'));

mapper.maxRows;  // → 2
mapper.maxCols;  // → 2

const b1 = table.rows[0].cells[1];
mapper.getVisualPosition(b1);
// → { startRow: 0, startCol: 1, rowspan: 2, colspan: 1, isHeader: false }

// Column 1 — returns B1 once (not twice, de-duplicated via Set)
mapper.getCellsInColumn(1);  // → [b1]

// Row 1 — returns A2 and B1 (which spans into row 1)
mapper.getCellsInRow(1);     // → [a2, b1]
```

---

## Related

- [Node Editor Engine](node-editor-engine.md)
- [Function Reference](functions.md)
- [Getting Started](getting-started.md)
- [GinexysEngine Reference](../../schema-editor/docs/engine.md)
