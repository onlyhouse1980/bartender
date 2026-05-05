import type { Drink } from '../data/bartending';

const STORAGE_KEY = 'barstart-de-imported-drinks-v1';

export function loadImportedDrinks(): Drink[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isDrinkRecord) as Drink[];
  } catch {
    return [];
  }
}

export function saveImportedDrinks(drinks: Drink[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(drinks));
  } catch {
    // Ignore quota and private-mode storage failures.
  }
}

function getStorage() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
}

function isDrinkRecord(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Drink>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.category === 'string' &&
    Array.isArray(candidate.ingredients) &&
    Array.isArray(candidate.method)
  );
}
