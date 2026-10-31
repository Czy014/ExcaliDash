import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
type Preferences = {
  theme?: "light" | "dark";
  dashboardSortField?: "name" | "createdAt" | "updatedAt";
  dashboardSortDirection?: "asc" | "desc";
  language?: string;
  gridStep?: number;
  editorAutoHide?: boolean;
  compactSidebar?: boolean;
};
type PreferenceKey = keyof Preferences;

const STORAGE_KEY = "excalidash-preferences";

// Ignore stale fields outside the supported workspace preferences.
const KNOWN_KEYS: PreferenceKey[] = [
  "theme",
  "dashboardSortField",
  "dashboardSortDirection",
  "language",
  "gridStep",
  "editorAutoHide",
  "compactSidebar",
];

const pickKnown = (source: Partial<Preferences>): Preferences => {
  const out: Preferences = {};
  for (const key of KNOWN_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
};

// One-time migration of the pre-context localStorage keys so an upgrade never
// drops a user's already-chosen theme/sort/language.
const readLegacyPreferences = (): Preferences => {
  const legacy: Preferences = {};
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "dark" || theme === "light") legacy.theme = theme;
  } catch {
    /* ignore unavailable storage */
  }
  try {
    const lang = localStorage.getItem("excalidash-lang");
    if (lang) legacy.language = lang;
  } catch {
    /* ignore */
  }
  try {
    const rawSort = localStorage.getItem("excalidash-dashboard-sort");
    if (rawSort) {
      const parsed = JSON.parse(rawSort) as {
        field?: unknown;
        direction?: unknown;
      };
      if (typeof parsed.field === "string") {
        legacy.dashboardSortField =
          parsed.field as Preferences["dashboardSortField"];
      }
      if (typeof parsed.direction === "string") {
        legacy.dashboardSortDirection =
          parsed.direction as Preferences["dashboardSortDirection"];
      }
    }
  } catch {
    /* ignore */
  }
  return pickKnown(legacy);
};

const readStoredPreferences = (): Preferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Preferences>;
      return pickKnown(parsed);
    }
  } catch {
    /* fall through to legacy migration */
  }
  return readLegacyPreferences();
};

interface PreferencesContextType {
  preferences: Preferences;
  updatePreferences: (partial: Partial<Preferences>) => void;
  setPreference: <K extends PreferenceKey>(
    key: K,
    value: Preferences[K],
  ) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [preferences, setPreferences] = useState<Preferences>(
    readStoredPreferences,
  );

  // Keep preferences across reloads and offline sessions.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore unavailable storage in private/embedded contexts.
    }
  }, [preferences]);

  const updatePreferences = useCallback((partial: Partial<Preferences>) => {
    const known = pickKnown(partial);
    if (Object.keys(known).length === 0) return;
    setPreferences((prev) => ({ ...prev, ...known }));
  }, []);

  const setPreference = useCallback(
    <K extends PreferenceKey>(key: K, value: Preferences[K]) => {
      updatePreferences({ [key]: value } as Partial<Preferences>);
    },
    [updatePreferences],
  );

  return (
    <PreferencesContext.Provider
      value={{ preferences, updatePreferences, setPreference }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};

/**
 * Read/write a single local preference. Returns a `[value, setValue]`
 * tuple; `value` falls back to `defaultValue` until the key is set.
 */
export const usePreference = <K extends PreferenceKey>(
  key: K,
  defaultValue: NonNullable<Preferences[K]>,
): readonly [NonNullable<Preferences[K]>, (value: Preferences[K]) => void] => {
  const { preferences, setPreference } = usePreferences();
  const value = (preferences[key] ?? defaultValue) as NonNullable<
    Preferences[K]
  >;
  const setValue = useCallback(
    (next: Preferences[K]) => setPreference(key, next),
    [key, setPreference],
  );
  return [value, setValue] as const;
};
