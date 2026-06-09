const CACHE_KEY = 'star_strike_rush_legacy_script_cache_v1';

export function readCachedLegacyScript() {
  try {
    return sessionStorage.getItem(CACHE_KEY) || '';
  } catch {
    return '';
  }
}

export function writeCachedLegacyScript(source) {
  try {
    sessionStorage.setItem(CACHE_KEY, source);
  } catch {
    // Cache failures should never stop the game from loading.
  }
}
