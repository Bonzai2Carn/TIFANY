// ===================================================================================
// CELL STORE; UUID-keyed flat data store with copy-on-write dereferencing
// ===================================================================================

window.CellStore = {};

class CellStoreManager {
    constructor() {
        this.store = window.CellStore;
    }

    create(value, type = 'string') {
        const id = crypto.randomUUID();
        this.store[id] = { value, type, refCount: 1 };
        return id;
    }

    get(id) {
        return this.store[id] || null;
    }

    // Copy-on-write: if shared, clone to a new UUID; else return same id for in-place edit
    deref(id) {
        const cell = this.store[id];
        if (!cell) return null;
        if (cell.refCount > 1) {
            cell.refCount--;
            return this.create(cell.value, cell.type);
        }
        return id;
    }

    addRef(id) {
        if (this.store[id]) this.store[id].refCount++;
    }

    release(id) {
        if (!this.store[id]) return;
        this.store[id].refCount--;
        if (this.store[id].refCount <= 0) delete this.store[id];
    }

    update(id, value) {
        if (this.store[id]) this.store[id].value = value;
    }

    snapshot() {
        return JSON.parse(JSON.stringify(this.store));
    }

    restore(snap) {
        window.CellStore = JSON.parse(JSON.stringify(snap));
        this.store = window.CellStore;
    }

    clear() {
        window.CellStore = {};
        this.store = window.CellStore;
    }
}

window.cellStoreManager = new CellStoreManager();
