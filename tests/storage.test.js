import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_STATE_KEY,
  INDEXED_DB_TIMEOUT_MS,
  LEGACY_LOCAL_STORAGE_KEY,
  mergeStoredState,
  selectInitialStateSource,
  loadPersistedState
} from "../src/data/storage.js";

const defaultState = {
  ayahProgress: {},
  transitionProgress: {},
  lastPage: 1,
  recentPages: [],
  ayahBookmarks: [],
  pageBookmarks: [],
  practiceEvents: [],
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
  const indexedState = { recentPages: [99] };
  const legacyState = { recentPages: [12] };

  const result = selectInitialStateSource({
    indexedState,
    legacyRawState: JSON.stringify(legacyState),
    defaultState
  });

  assert.equal(result.source, APP_STATE_KEY);
  assert.deepEqual(result.state.recentPages, [99]);
  assert.equal(result.state.lastPage, 99);
});

test("selectInitialStateSource imports legacy localStorage state when IndexedDB is empty", () => {
  const result = selectInitialStateSource({
    indexedState: null,
    legacyRawState: JSON.stringify({ recentPages: [5], settings: { sound: true } }),
    defaultState
  });

  assert.equal(result.source, LEGACY_LOCAL_STORAGE_KEY);
  assert.deepEqual(result.state.recentPages, [5]);
  assert.equal(result.state.lastPage, 5);
  assert.equal(result.state.settings.sound, true);
});

test("mergeStoredState keeps an explicit saved last page over recent pages", () => {
  const merged = mergeStoredState(defaultState, {
    lastPage: 440,
    recentPages: [12, 11]
  });

  assert.equal(merged.lastPage, 440);
  assert.deepEqual(merged.recentPages, [12, 11]);
});

test("mergeStoredState ignores invalid last page and falls back to recent pages", () => {
  const merged = mergeStoredState(defaultState, {
    lastPage: 0,
    recentPages: [604]
  });

  assert.equal(merged.lastPage, 604);
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
