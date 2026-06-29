import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_STATE_KEY,
  INDEXED_DB_TIMEOUT_MS,
  LEGACY_APP_STATE_KEY,
  LEGACY_LOCAL_STORAGE_KEY,
  LOCAL_STORAGE_KEY,
  SEED_BACKUP_KEY,
  SEED_BACKUP_LOCAL_STORAGE_KEY,
  clearSeedBackup,
  loadSeedBackup,
  mergeStoredState,
  saveSeedBackup,
  selectInitialStateSource,
  loadPersistedState
} from "../src/data/storage.js";

const defaultState = {
  ayahProgress: {},
  transitionProgress: {},
  lastPage: 1,
  lastRoute: { screen: "home", tab: "progress", page: 1, target: null },
  recentPages: [],
  ayahBookmarks: [],
  pageBookmarks: [],
  practiceEvents: [],
  helpSeen: false,
  settings: {
    theme: "dark",
    sound: false,
    vibration: "auto",
    reviewQueueSize: 12,
    doubleTapWindow: 250,
    repetitionThresholds: { weakMax: 9, buildingMax: 19, strongMax: 39 },
    transitionCountThresholds: { weakMax: 9, buildingMax: 19, strongMax: 39 }
  }
};

test("mergeStoredState preserves nested settings defaults while applying saved values", () => {
  const merged = mergeStoredState(defaultState, {
    recentPages: [12],
    settings: {
      theme: "light",
      repetitionThresholds: { weakMax: 4 }
    }
  });

  assert.deepEqual(merged.recentPages, [12]);
  assert.equal(merged.lastPage, 12);
  assert.equal(merged.settings.theme, "light");
  assert.equal(merged.settings.repetitionThresholds.weakMax, 4);
  assert.equal(merged.settings.repetitionThresholds.buildingMax, 19);
  assert.equal(merged.settings.transitionCountThresholds.strongMax, 39);
});

test("mergeStoredState migrates legacy threshold names to count threshold names", () => {
  const legacyRepetitionThresholdKey = ["ayah", "Thresholds"].join("");
  const legacyTransitionCountThresholdKey = ["transition", "Thresholds"].join("");
  const merged = mergeStoredState(defaultState, {
    settings: {
      [legacyRepetitionThresholdKey]: { weakMax: 3 },
      [legacyTransitionCountThresholdKey]: { strongMax: 49 }
    }
  });

  assert.equal(merged.settings.repetitionThresholds.weakMax, 3);
  assert.equal(merged.settings.transitionCountThresholds.strongMax, 49);
  assert.equal(legacyRepetitionThresholdKey in merged.settings, false);
  assert.equal(legacyTransitionCountThresholdKey in merged.settings, false);
});

test("selectInitialStateSource prefers IndexedDB state when it exists", () => {
  const currentIndexedState = { recentPages: [99] };
  const legacyState = { recentPages: [12] };

  const result = selectInitialStateSource({
    currentIndexedState,
    legacyIndexedState: null,
    localRawState: null,
    legacyRawState: JSON.stringify(legacyState),
    defaultState
  });

  assert.equal(result.source, APP_STATE_KEY);
  assert.deepEqual(result.state.recentPages, [99]);
  assert.equal(result.state.lastPage, 99);
});

test("selectInitialStateSource imports legacy localStorage state when IndexedDB is empty", () => {
  const result = selectInitialStateSource({
    currentIndexedState: null,
    legacyIndexedState: null,
    localRawState: null,
    legacyRawState: JSON.stringify({ recentPages: [5], settings: { sound: true } }),
    defaultState
  });

  assert.equal(result.source, LEGACY_LOCAL_STORAGE_KEY);
  assert.deepEqual(result.state.recentPages, [5]);
  assert.equal(result.state.lastPage, 5);
  assert.equal(result.state.settings.sound, true);
});

test("selectInitialStateSource imports legacy IndexedDB state when current storage is empty", () => {
  const result = selectInitialStateSource({
    currentIndexedState: null,
    legacyIndexedState: { recentPages: [18], settings: { sound: true } },
    localRawState: null,
    legacyRawState: null,
    defaultState
  });

  assert.equal(result.source, LEGACY_APP_STATE_KEY);
  assert.deepEqual(result.state.recentPages, [18]);
  assert.equal(result.state.lastPage, 18);
  assert.equal(result.state.settings.sound, true);
});

test("selectInitialStateSource uses the current localStorage key before legacy storage", () => {
  const result = selectInitialStateSource({
    currentIndexedState: null,
    legacyIndexedState: { recentPages: [18] },
    localRawState: JSON.stringify({ recentPages: [22], settings: { theme: "light" } }),
    legacyRawState: JSON.stringify({ recentPages: [5], settings: { sound: true } }),
    defaultState
  });

  assert.equal(result.source, LOCAL_STORAGE_KEY);
  assert.deepEqual(result.state.recentPages, [22]);
  assert.equal(result.state.lastPage, 22);
  assert.equal(result.state.settings.theme, "light");
});

test("mergeStoredState keeps an explicit saved last page over recent pages", () => {
  const merged = mergeStoredState(defaultState, {
    lastPage: 440,
    recentPages: [12, 11]
  });

  assert.equal(merged.lastPage, 440);
  assert.deepEqual(merged.lastRoute, { screen: "reading", tab: "progress", page: 440, target: null });
  assert.deepEqual(merged.recentPages, [12, 11]);
});

test("mergeStoredState preserves explicit saved home route", () => {
  const merged = mergeStoredState(defaultState, {
    lastPage: 440,
    lastRoute: { screen: "home", tab: "bookmarks", page: 440, target: "2:255" }
  });

  assert.equal(merged.lastPage, 440);
  assert.deepEqual(merged.lastRoute, { screen: "home", tab: "bookmarks", page: 440, target: null });
});

test("mergeStoredState ignores invalid last page and falls back to recent pages", () => {
  const merged = mergeStoredState(defaultState, {
    lastPage: 0,
    recentPages: [604]
  });

  assert.equal(merged.lastPage, 604);
  assert.deepEqual(merged.lastRoute, { screen: "reading", tab: "progress", page: 604, target: null });
});

test("mergeStoredState caps stored recent pages at five items", () => {
  const merged = mergeStoredState(defaultState, {
    recentPages: [12, 11, 10, 9, 8, 7]
  });

  assert.deepEqual(merged.recentPages, [12, 11, 10, 9, 8]);
});

test("mergeStoredState preserves the help seen flag when stored", () => {
  const merged = mergeStoredState(defaultState, {
    helpSeen: true
  });

  assert.equal(merged.helpSeen, true);
});

test("loadPersistedState resolves IndexedDB reads even when request succeeds before transaction completes", async () => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;

  const listeners = {};
  const request = {
    result: { recentPages: [33] },
    error: null,
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };

  const transactionListeners = {};
  const transaction = {
    error: null,
    objectStore() {
      return {
        get() {
          queueMicrotask(() => listeners.success?.());
          queueMicrotask(() => transactionListeners.complete?.());
          return request;
        }
      };
    },
    addEventListener(type, handler) {
      transactionListeners[type] = handler;
    }
  };

  const db = {
    objectStoreNames: { contains() { return true; } },
    transaction() {
      return transaction;
    },
    close() {}
  };

  globalThis.indexedDB = {
    open() {
      const openListeners = {};
      const openRequest = {
        result: db,
        error: null,
        addEventListener(type, handler) {
          openListeners[type] = handler;
        }
      };
      queueMicrotask(() => openListeners.success?.());
      return openRequest;
    }
  };

  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };

  try {
    const state = await loadPersistedState(defaultState);
    assert.deepEqual(state.recentPages, [33]);
    assert.equal(state.lastPage, 33);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("loadPersistedState falls back to localStorage when IndexedDB open hangs", async () => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.indexedDB = {
    open() {
      return {
        addEventListener() {}
      };
    }
  };

  globalThis.localStorage = {
    getItem(key) {
      if (key !== LEGACY_LOCAL_STORAGE_KEY) return null;
      return JSON.stringify({ recentPages: [7], settings: { theme: "light" } });
    },
    setItem() {},
    removeItem() {}
  };

  try {
    const before = Date.now();
    const state = await loadPersistedState(defaultState);
    const elapsed = Date.now() - before;
    assert.deepEqual(state.recentPages, [7]);
    assert.equal(state.lastPage, 7);
    assert.equal(state.settings.theme, "light");
    assert.ok(elapsed >= INDEXED_DB_TIMEOUT_MS);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("seed backup saves, loads, and clears through localStorage fallback", async () => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;
  const store = new Map();

  globalThis.indexedDB = {
    open() {
      return {
        addEventListener() {}
      };
    }
  };

  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    }
  };

  const backup = { recentPages: [12], settings: { theme: "light" } };

  try {
    await saveSeedBackup(backup);
    assert.equal(store.has(SEED_BACKUP_LOCAL_STORAGE_KEY), true);
    assert.deepEqual(await loadSeedBackup(), backup);

    await clearSeedBackup();
    assert.equal(store.has(SEED_BACKUP_LOCAL_STORAGE_KEY), false);
    assert.equal(await loadSeedBackup(), null);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("seed backup prefers IndexedDB over localStorage when available", async () => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;

  const values = new Map([[APP_STATE_KEY, { recentPages: [33] }], [SEED_BACKUP_KEY, { recentPages: [88] }]]);
  const requestListeners = new Map();
  const transactionListeners = new Map();

  function buildRequest(result) {
    const listeners = {};
    const request = {
      result,
      error: null,
      addEventListener(type, handler) {
        listeners[type] = handler;
      }
    };
    requestListeners.set(request, listeners);
    return request;
  }

  const transaction = {
    error: null,
    objectStore() {
      return {
        get(key) {
          const request = buildRequest(values.get(key) || null);
          queueMicrotask(() => requestListeners.get(request).success?.());
          queueMicrotask(() => transactionListeners.get(transaction).complete?.());
          return request;
        },
        put(value, key) {
          values.set(key, value);
          const request = buildRequest(undefined);
          queueMicrotask(() => requestListeners.get(request).success?.());
          queueMicrotask(() => transactionListeners.get(transaction).complete?.());
          return request;
        },
        delete(key) {
          values.delete(key);
          const request = buildRequest(undefined);
          queueMicrotask(() => requestListeners.get(request).success?.());
          queueMicrotask(() => transactionListeners.get(transaction).complete?.());
          return request;
        }
      };
    },
    addEventListener(type, handler) {
      const listeners = transactionListeners.get(transaction) || {};
      listeners[type] = handler;
      transactionListeners.set(transaction, listeners);
    }
  };

  const db = {
    objectStoreNames: { contains() { return true; } },
    transaction() {
      return transaction;
    },
    close() {}
  };

  globalThis.indexedDB = {
    open() {
      const openListeners = {};
      const openRequest = {
        result: db,
        error: null,
        addEventListener(type, handler) {
          openListeners[type] = handler;
        }
      };
      queueMicrotask(() => openListeners.success?.());
      return openRequest;
    }
  };

  globalThis.localStorage = {
    getItem(key) {
      if (key === SEED_BACKUP_LOCAL_STORAGE_KEY) return JSON.stringify({ recentPages: [5] });
      return null;
    },
    setItem() {},
    removeItem() {}
  };

  try {
    assert.deepEqual(await loadSeedBackup(), { recentPages: [88] });
  } finally {
    globalThis.indexedDB = originalIndexedDb;
    globalThis.localStorage = originalLocalStorage;
  }
});
