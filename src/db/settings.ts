import { db, type Setting } from "./index";

export type ReaderPreferences = {
  fontSize: number;
  lineWidth: number;
  darkMode: boolean;
};

export type StoragePersistenceState =
  | "unknown"
  | "granted"
  | "denied"
  | "unsupported";

const READER_PREFERENCES_ID = "reader_preferences";
const STORAGE_PERSISTENCE_ID = "storage_persistence";

export const defaultReaderPreferences: ReaderPreferences = {
  fontSize: 1.05,
  lineWidth: 72,
  darkMode: false,
};

const getSetting = async (id: string): Promise<Setting | undefined> =>
  db.settings.get(id);

const setSetting = async (id: string, value: string): Promise<void> => {
  await db.settings.put({ id, value });
};

export const getReaderPreferences = async (): Promise<ReaderPreferences> => {
  const setting = await getSetting(READER_PREFERENCES_ID);

  if (!setting) {
    return defaultReaderPreferences;
  }

  try {
    const parsed = JSON.parse(setting.value) as ReaderPreferences;
    return {
      ...defaultReaderPreferences,
      ...parsed,
    };
  } catch {
    return defaultReaderPreferences;
  }
};

export const setReaderPreferences = async (
  preferences: ReaderPreferences,
): Promise<void> => {
  await setSetting(READER_PREFERENCES_ID, JSON.stringify(preferences));
};

export const getStoragePersistenceState =
  async (): Promise<StoragePersistenceState> => {
    const setting = await getSetting(STORAGE_PERSISTENCE_ID);

    if (!setting) {
      return "unknown";
    }

    if (
      setting.value === "granted" ||
      setting.value === "denied" ||
      setting.value === "unsupported"
    ) {
      return setting.value;
    }

    return "unknown";
  };

export const setStoragePersistenceState = async (
  state: StoragePersistenceState,
): Promise<void> => {
  await setSetting(STORAGE_PERSISTENCE_ID, state);
};
