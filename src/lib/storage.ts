import { set, get, del } from 'idb-keyval';
import debounce from 'lodash.debounce';

export const safeLocalStorageSet = (key: string, value: any) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage (quota exceeded?)`, e);
  }
};

export const safeSetItem = async (key: string, value: any) => {
  try {
    await set(key, value);
  } catch (err) {
    console.warn(`IndexedDB save failed for ${key}, falling back to localStorage`, err);
    safeLocalStorageSet(key, value);
  }
};

const debouncedSavers: Record<string, ReturnType<typeof debounce>> = {};

export const debouncedSafeSetItem = (key: string, value: any, delay: number = 500) => {
  if (!debouncedSavers[key]) {
    debouncedSavers[key] = debounce(async (k: string, v: any) => {
      await safeSetItem(k, v);
    }, delay);
  }
  debouncedSavers[key](key, value);
};

export const safeGetItem = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const val = await get(key);
    if (val !== undefined) return val as T;
    
    const lsVal = localStorage.getItem(key);
    if (lsVal !== null) {
      try {
        return JSON.parse(lsVal) as T;
      } catch (e) {
        return lsVal as unknown as T;
      }
    }
  } catch (err) {
    console.warn(`Error reading ${key} from storage`, err);
  }
  return fallback;
};
