// ===================================================================================
// Table IDE ENGINE — CDN / open-tool entry point
//
//   Exposes window.TableIdeEngine as a stable public namespace.
//   Load this script after all component scripts have run.
//
//   Usage (browser):
//     <script src="src/js/components/visualGridMapper.js"></script>
//     <script src="src/js/features/nodeFormulaParser.js"></script>
//     <script src="src/js/features/labFunctions.js"></script>
//     <script src="src/js/core/engine.js"></script>
//     TableIdeEngine.FormulaParser.evaluate('$Price * 1.2', { '$Price': '50' }) // → '60'
//
//   Components:
//     FormulaParser     — recursive descent expression evaluator
//                         evaluate(expr, rowCtx) → string (never throws)
//                         validate(expr)          → null | errorString
//                         rowCtx: { '$ColumnName': 'value', ... }
//
//     LabFunctions      — 26 pure validate/transform/analyze functions
//                         All receive (rows, params) and return results.
//                         No DOM, no network. Safe to call from a worker
//                         via structured-clone of plain row objects.
//
//     VisualGridMapper  — grid coordinate engine for HTML tables
//                         new VisualGridMapper(tableEl)
//                         .buildGrid(), .getVisualPosition(cell)
//                         .getCellsInRow(r), .getCellsInColumn(c)
//                         Requires jQuery and a live DOM table element.
// ===================================================================================

(function (global) {
    global.TableIdeEngine = {
        FormulaParser:    global.nodeFormulaParser,
        LabFunctions:     global.LabFunctions,
        VisualGridMapper: global.VisualGridMapper,
        version: '2.0.0',
    };
})(window);
