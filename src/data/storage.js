export const APP_DB_NAME = "hifz-trackr";
export const APP_DB_VERSION = 1;
export const APP_STORE_NAME = "app-state";
export const APP_STATE_KEY = "hifz-trackr-app-state";
export const LOCAL_STORAGE_KEY = "hifz-trackr-state";
export const LEGACY_APP_DB_NAME = "tap-hifz";
export const LEGACY_APP_STATE_KEY = "tap-hifz-app-state";
export const LEGACY_LOCAL_STORAGE_KEY = "tap-hifz-state";
export const INDEXED_DB_TIMEOUT_MS = 750;
const LEGACY_REPETITION_THRESHOLD_KEY = ["ayah", "Thresholds"].join("");
const LEGACY_TRANSITION_COUNT_THRESHOLD_KEY = ["transition", "Thresholds"].join("");

const cloneValue = globalThis.structuredClone
  ? (value) => globalThis.structuredClone(value)
  : (value) => JSON.parse(JSON.stringify(value));

export function resolveStoredLastPage(value, recentPages = [], fallback = 1) {
  const candidates = [value, recentPages?.[0], fallback];
  const page = candidates.find((candidate) => Number.isInteger(candidate) && candidate >= 1);
  return page || 1;
}

export function mergeStoredState(base, value) {
  const mergedRecentPages = Array.isArray(value?.recentPages) ? value.recentPages : base.recentPages;
  const savedSettings = value?.settings || {};
  const {
    [LEGACY_REPETITION_THRESHOLD_KEY]: legacyRepetitionThresholds,
    [LEGACY_TRANSITION_COUNT_THRESHOLD_KEY]: legacyTransitionCountThresholds,
    ...storedSettings
  } = savedSettings;

  return {
    ...cloneValue(base),
    ...value,
    lastPage: resolveStoredLastPage(value?.lastPage, mergedRecentPages, base.lastPage),
    settings: {
      ...base.settings,
      ...storedSettings,
      repetitionThresholds: {
        ...base.settings.repetitionThresholds,
        ...(legacyRepetitionThresholds || {}),
        ...(value?.settings?.repetitionThresholds || {})
      },
      transitionCountThresholds: {
        ...base.settings.transitionCountThresholds,
        ...(legacyTransitionCountThresholds || {}),
        ...(value?.settings?.transitionCountThresholds || {})
      }
    }
  };
}

export function selectInitialStateSource({
  currentIndexedState,
  legacyIndexedState,
  localRawState,
  legacyRawState,
  defaultState
}) {
  if (currentIndexedState) {
    return { source: APP_STATE_KEY, state: mergeStoredState(defaultState, currentIndexedState) };
  }

  if (localRawState) {
    return {
      source: LOCAL_STORAGE_KEY,
      state: mergeStoredState(defaultState, JSON.parse(localRawState))
    };
  }

  if (legacyIndexedState) {
    return {
      source: LEGACY_APP_STATE_KEY,
      state: mergeStoredState(defaultState, legacyIndexedState)
    };
  }

  if (legacyRawState) {
    return {
      source: LEGACY_LOCAL_STORAGE_KEY,
      state: mergeStoredState(defaultState, JSON.parse(legacyRawState))
    };
  }

  return { source: "default", state: cloneValue(defaultState) };
}

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function canUseLocalStorage() {
  return typeof localStorage !== "undefined";
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function openStateDb(dbName = APP_DB_NAME) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, APP_DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(APP_STORE_NAME)) db.createObjectStore(APP_STORE_NAME);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    request.addEventListener("blocked", () => reject(new Error("IndexedDB open blocked")));
  });
}

function withStoreRequest(mode, task, mapResult = (request) => request.result, dbName = APP_DB_NAME) {
  return openStateDb(dbName).then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(APP_STORE_NAME, mode);
    const store = transaction.objectStore(APP_STORE_NAME);
    const request = task(store);
    let requestResult = null;
    let requestError = null;

    request.addEventListener("success", () => {
      requestResult = mapResult(request);
    });
    request.addEventListener("error", () => {
      requestError = request.error;
    });

    transaction.addEventListener("complete", () => {
      db.close();
      if (requestError) {
        reject(requestError);
        return;
      }
      resolve(requestResult);
    });
    transaction.addEventListener("error", () => {
      db.close();
      reject(transaction.error || requestError);
    });
    transaction.addEventListener("abort", () => {
      db.close();
      reject(transaction.error || requestError);
    });
  }));
}

async function readIndexedState() {
  return withStoreRequest("readonly", (store) => store.get(APP_STATE_KEY), (request) => request.result || null);
}

async function readLegacyIndexedState() {
  return withStoreRequest(
    "readonly",
    (store) => store.get(LEGACY_APP_STATE_KEY),
    (request) => request.result || null,
    LEGACY_APP_DB_NAME
  );
}

async function writeIndexedState(state) {
  await withStoreRequest("readwrite", (store) => store.put(state, APP_STATE_KEY), () => undefined);
}

export async function loadPersistedState(defaultState) {
  let currentIndexedState = null;
  let legacyIndexedState = null;
  if (canUseIndexedDb()) {
    try {
      currentIndexedState = await withTimeout(readIndexedState(), INDEXED_DB_TIMEOUT_MS, "IndexedDB read");
    } catch {
      currentIndexedState = null;
    }

    if (!currentIndexedState) {
      try {
        legacyIndexedState = await withTimeout(readLegacyIndexedState(), INDEXED_DB_TIMEOUT_MS, "Legacy IndexedDB read");
      } catch {
        legacyIndexedState = null;
      }
    }
  }

  const localRawState = canUseLocalStorage() ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
  const legacyRawState = canUseLocalStorage() ? localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY) : null;
  const selected = selectInitialStateSource({
    currentIndexedState,
    legacyIndexedState,
    localRawState,
    legacyRawState,
    defaultState
  });

  if (selected.source !== APP_STATE_KEY && canUseIndexedDb()) {
    try {
      await withTimeout(writeIndexedState(selected.state), INDEXED_DB_TIMEOUT_MS, "IndexedDB write");
      if (canUseLocalStorage()) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
      }
    } catch {
      if (canUseLocalStorage()) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selected.state));
      }
    }
  }

  return selected.state;
}

export async function savePersistedState(state) {
  if (canUseIndexedDb()) {
    try {
      await withTimeout(writeIndexedState(state), INDEXED_DB_TIMEOUT_MS, "IndexedDB write");
      return;
    } catch {
      // Fall back to localStorage below.
    }
  }

  if (canUseLocalStorage()) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}
