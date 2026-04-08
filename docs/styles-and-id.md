# Styles and IDs

TIFANY allows you to apply custom classes, IDs, and visual styles to any element within your table (Cell, Row, or Column). Additionally, several built-in utility classes provide advanced interactivity such as collapsible rows and tabbed column switching.

---

## 1. Built-in Utility Classes

TIFANY includes pre-configured classes that trigger specific behaviors when applied to table elements.

### Collapsible Rows (`accordion-header`)
The `accordion-header` class transforms a row into a clickable toggle that expands or collapses the rows beneath it.

*   **How to apply**: Apply the class `accordion-header` to a `<tr>` element.
*   **Behavior**: When clicked, all subsequent `<tr>` elements will be toggled (hidden/shown) until another `accordion-header` row is encountered.
*   **Use Case**: Grouping large datasets into expandable sections (e.g., a "Summary" row that expands to show "Details").

### Column Tab Switching (`sp-$index`)
The `sp-` system allows you to create tabs that switch the visibility of specific columns or cells.

*   **How to apply**: 
    1.  Apply a class in the format `sp-1`, `sp-2`, etc., to cells or columns.
    2.  Use the **Tabs** input in the top toolbar to generate a tab bar with matching indices.
*   **Behavior**: Selecting a tab (e.g., Tab "1") will make all elements with the class `sp-1` active (visible) while hiding others in the same group.
*   **Use Case**: Creating multi-view tables where users can toggle between different data categories (e.g., "Monthly" vs "Quarterly" views).

### Visual Emphasis (`highlighted`)
A built-in class for highlighting specific cells with a distinct background color.
*   **Use Case**: Marking important data points or search results.

### Text Orientation (`sideways-face`)
Rotates the text within a cell by 90 degrees or flips it vertically.
*   **Use Case**: Vertical headers for narrow columns.

### Sticky Headers (`freeze-pane`)
Keeps the selected row or column visible while scrolling through large tables.
*   **Use Case**: Maintaining context in tables with hundreds of rows.

---

## 2. Applying Styles and IDs

Use the **Styles & ID** section in the left panel to modify selected elements.

### Element Selection
Choose whether to apply changes to:
*   **Cell**: The specific `<td>` or `<th>` selected.
*   **Row**: Every cell within the parent `<tr>`.
*   **Column**: Every cell sharing the same visual column index.

### Custom Classes and IDs
*   **Class Name**: Enter any string to add it to the element's `class` attribute.
    *   **sp- Prefix**: Toggle the **sp-** button next to the input to automatically prefix your class name (e.g., entering `1` becomes `sp-1`).
*   **ID**: Assign a unique `id` attribute to the element.

### Visual Properties (Inline Styles)
| Property | Control |
| :--- | :--- |
| **Colors** | Modify Background, Text, or Border colors via the color picker. |
| **Spacing** | Set precise Padding or Margin values (Top, Right, Bottom, Left). |
| **Border Collapse** | Toggle between `collapse` and `separate` for the table grid. |

---

## 3. Table Attributes

Manage structural HTML attributes directly:

*   **Colspan**: Merges the current cell with the specified number of columns to its right.
*   **Rowspan**: Merges the current cell with the specified number of rows beneath it.

> [!TIP]
> Use the **Apply to Selected** button after configuring your styles to execute the changes. Use **Undo** if the result is not as expected.
