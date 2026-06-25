const THRESHOLD_KEYS = ["weakMax", "buildingMax", "strongMax"];
const THRESHOLD_ERROR = "Thresholds must increase from Weak to Building to Strong.";
const DEVELOPER_THRESHOLDS = { weakMax: 1, buildingMax: 2, strongMax: 3 };
const GENTLE_CHIME_CONFIG = {
  duration: 0.11,
  frequency: 830,
  gain: 0.045,
  secondFrequency: 1245,
  wave: "sine"
};

function isValidThresholdProfile(profile) {
  return THRESHOLD_KEYS.every((key) => Number.isInteger(profile[key]) && profile[key] >= 0)
    && profile.weakMax >= 1
    && profile.weakMax < profile.buildingMax
    && profile.buildingMax < profile.strongMax;
}

export function normalizeThresholdProfile(profile, fallback) {
  const next = {
    weakMax: Number(profile?.weakMax),
    buildingMax: Number(profile?.buildingMax),
    strongMax: Number(profile?.strongMax)
  };

  return isValidThresholdProfile(next) ? next : { ...fallback };
}

export function updateThresholdProfile(profile, key, value, options = {}) {
  if (!THRESHOLD_KEYS.includes(key)) {
    return { profile: { ...profile }, error: "Unknown threshold setting." };
  }

  const max = options.max ?? 999;
  const nextValue = Number(value);
  const next = {
    ...profile,
    [key]: Number.isInteger(nextValue) ? nextValue : NaN
  };

  if (next[key] < 1 || next[key] > max) {
    return { profile: { ...profile }, error: `Thresholds must be between 1 and ${max}.` };
  }

  if (!isValidThresholdProfile(next)) {
    return { profile: { ...profile }, error: THRESHOLD_ERROR };
  }

  return { profile: next, error: null };
}

export function buildTripleActivationState(previous, timestamp, windowMs = 250) {
  const isConsecutive = previous && timestamp - previous.lastTimestamp <= windowMs;
  const count = isConsecutive ? previous.count + 1 : 1;
  const activated = count >= 3;

  return {
    count: activated ? 0 : count,
    lastTimestamp: timestamp,
    activated
  };
}

export function applyDeveloperThresholdMode(state, defaultThresholds) {
  const developerMode = !state.settings.developerMode;
  const thresholds = developerMode ? DEVELOPER_THRESHOLDS : defaultThresholds;

  return {
    ...state,
    settings: {
      ...state.settings,
      developerMode,
      repetitionThresholds: { ...thresholds },
      transitionCountThresholds: { ...thresholds }
    }
  };
}

export function updateNumericSetting(currentValue, rawValue, options) {
  const nextValue = Number(rawValue);
  const label = options.label || "Setting";
  const rangeError = `${label} must be a number between ${options.min} and ${options.max}.`;

  if (!Number.isInteger(nextValue) || nextValue < options.min || nextValue > options.max) {
    return { value: currentValue, error: rangeError };
  }

  if (options.step && (nextValue - options.min) % options.step !== 0) {
    return { value: currentValue, error: `${label} must use increments of ${options.step}.` };
  }

  return { value: nextValue, error: null };
}

export function getCountIncreaseSoundConfig(settings) {
  return settings?.sound ? { ...GENTLE_CHIME_CONFIG } : null;
}
