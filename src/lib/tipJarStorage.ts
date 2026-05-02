const STORAGE_KEY = 'barstart-de-tip-jar-v1';

export function loadTipJar() {
  const storage = getStorage();
  if (!storage) {
    return 0;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveTipJar(amount: number) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(amount));
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
