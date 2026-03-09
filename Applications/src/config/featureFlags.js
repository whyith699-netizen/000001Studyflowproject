import { Capacitor } from '@capacitor/core';

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
};

export const isNativePlatform = Capacitor.isNativePlatform();
export const isNotesEnabledOnNative = parseBoolean(import.meta.env.VITE_ENABLE_NOTES_ON_NATIVE, false);
export const isNotesFeatureEnabled = !isNativePlatform || isNotesEnabledOnNative;
