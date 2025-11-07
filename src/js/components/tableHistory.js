// js/classes/tableHistory.js
// ===================================================================================
// 2. TABLE HISTORY MANAGER
// ===================================================================================
class TableHistoryManager {
    constructor(maxHistory = 50) {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistory = maxHistory;
        this.isRestoring = false; // Flag to prevent saving during undo/redo
    }

    saveState(tableHtml) {
        // Don't save if we're restoring a state
        if (this.isRestoring) return;

        // Don't save empty states
        if (!tableHtml || tableHtml.trim() === '') return;

        // Don't save if it's the same as the current state
        if (this.currentIndex >= 0 && this.history[this.currentIndex] === tableHtml) {
            return;
        }

        // Remove future states if we're not at the end
        this.history = this.history.slice(0, this.currentIndex + 1);

        this.history.push(tableHtml);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }

        console.log(`History saved. Current index: ${this.currentIndex}, Total states: ${this.history.length}`);
        // $('.undoState').text(`States: ${this.currentIndex}`);
    }

    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            console.log(`Undo to index: ${this.currentIndex}`);
            return this.history[this.currentIndex];
        }
        console.log('Cannot undo - at beginning of history');
        return null;
    }

    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            console.log(`Redo to index: ${this.currentIndex}`);
            return this.history[this.currentIndex];
        }
        console.log('Cannot redo - at end of history');
        return null;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    clear() {
        this.history = [];
        this.currentIndex = -1;
        console.log('History cleared');
    }
}

// Initialize global history manager
window.historyManager = new TableHistoryManager();

// ===================================================================================
// 3. HISTORY FUNCTIONS
// ===================================================================================

function performUndo() {
    const state = window.historyManager.undo();
    if (state) {
        window.historyManager.isRestoring = true;
        
        $('#tableContainer').html(state);
        window.currentTable = $('#tableContainer table')[0];
        
        if (typeof window.initializeAllFeatures === 'function') {
            window.initializeAllFeatures();
        }
        if (typeof window.setupTableInteraction === 'function') {
            window.setupTableInteraction();
        }
        
        window.historyManager.isRestoring = false;
        
        $.toast({
            heading: 'Undo',
            text: 'Action undone',
            icon: 'info',
            loader: false,
            position: 'top-right',
            hideAfter: 2000
        });
        
        console.log('Undo performed successfully');
    } else {
        $.toast({
            heading: 'Info',
            text: 'Nothing to undo',
            icon: 'info',
            loader: false,
            position: 'top-right',
            hideAfter: 2000
        });
    }
}

function performRedo() {
    const state = window.historyManager.redo();
    if (state) {
        window.historyManager.isRestoring = true;
        
        $('#tableContainer').html(state);
        window.currentTable = $('#tableContainer table')[0];
        
        if (typeof window.initializeAllFeatures === 'function') {
            window.initializeAllFeatures();
        }
        if (typeof window.setupTableInteraction === 'function') {
            window.setupTableInteraction();
        }
        
        window.historyManager.isRestoring = false;
        
        $.toast({
            heading: 'Redo',
            text: 'Action redone',
            icon: 'info',
            loader: false,
            position: 'top-right',
            hideAfter: 2000
        });
        
        console.log('Redo performed successfully');
    } else {
        $.toast({
            heading: 'Info',
            text: 'Nothing to redo',
            icon: 'info',
            loader: false,
            position: 'top-right',
            hideAfter: 2000
        });
    }
}

function saveCurrentState() {
    if (window.currentTable && !window.historyManager.isRestoring) {
        const state = $('#tableContainer').html();
        window.historyManager.saveState(state);
        console.log('Current state saved');
    }
}

function updateHistoryButtons() {
    const canUndo = window.historyManager.canUndo();
    const canRedo = window.historyManager.canRedo();

    const undoCount = this.currentIndex;
    const redoCount = this.history.length - this.currentIndex - 1;
    
    // $('.undoHistory').prop('disabled', !this.canUndo());
    // $('.redoHistory').prop('disabled', !this.canRedo());
    
    // $('.undoHistory').prop('disabled', !canUndo);
    // $('.redoHistory').prop('disabled', !canRedo);
    
    const statusText = `History: ${window.historyManager.currentIndex + 1}/${window.historyManager.history.length}`;
    // $('.undoState').text(`${undoCount} available`);
    // $('.redoState').text(`${redoCount} available`);
    // $('.undoState').text(statusText);
}

// Call this after every operation
window.updateHistoryButtons = updateHistoryButtons;

// Modify saveCurrentState to update buttons
function saveCurrentState() {
    if (window.currentTable && !window.historyManager.isRestoring) {
        const state = $('#tableContainer').html();
        window.historyManager.saveState(state);
        console.log('Current state saved');
        if (typeof window.updateHistoryButtons === 'function') {
            window.updateHistoryButtons();
        }
    }
}

// Make functions globally accessible
window.performUndo = performUndo;
window.performRedo = performRedo;
window.saveCurrentState = saveCurrentState;