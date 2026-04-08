# TIFANY: Table Formatter and Editor

TIFANY (Table Formatter and Editor) is a powerful, browser-based application for parsing, editing, and formatting HTML tables. It provides a visual interface for complex data manipulation, structure building, and visual transformation without the need for external dependencies.

## 🚀 Key Features

*   **Multi-Format Parsing**: Load data from HTML, CSV, TSV, ASCII, or plain text.
*   **Visual Grid Editor**: Direct cell manipulation with drag-and-drop structural updates.
*   **Advanced Modes**:
    *   **Draw Mode**: Manually build table structures from raw text using interactive painting.
    *   **Node Editor**: Build visual data pipelines for filtering, joining, and calculating table data.
*   **Rich Styling**: Apply classes, IDs, colors, and spacing visually.
*   **Built-in Interactivity**: Support for collapsible rows (accordions) and tabbed column switching.
*   **Multi-Format Export**: Generate clean code in HTML, JSON, Markdown, CSV, or SQL.

## 📚 Documentation

Detailed guides are available to help you get the most out of TIFANY:

*   **[Getting Started](docs/getting-started.md)**: A user-centric guide to importing data, basic editing, and the interface.
*   **[Operation Modes](docs/modes.md)**: Explore the visual grid, Draw Mode, and the Node Editor pipeline.
*   **[Styles and IDs](docs/styles-and-id.md)**: Guide to applying CSS classes, visual styles, and built-in interactive utilities.
*   **[Functions and Operations](docs/functions.md)**: Technical reference for structure manipulation, transformations, and exports.
*   **[Node Editor Engine](docs/node-editor-engine.md)**: Advanced documentation for the visual execution engine.

## 🛠️ Project Structure

```text
tools/table-formatter/
├── src/
│   ├── js/             # Application logic (Core, Features, Components)
│   ├── css/            # UI and Feature styling
│   └── index.html      # Application entry point
├── docs/               # User and Technical documentation
├── examples/           # Implementation examples
└── dist/               # Production builds
```

## 🏁 Getting Started

Requirements:
*   A modern web browser (Chrome, Firefox, Edge, Safari).

Run Locally:
1.  Open `src/index.html` directly in your browser.
2.  Alternatively, serve the root directory using a static file server:
    ```bash
    npx http-server ./src
    ```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 CANWORKSTUDIOS