import { useCallback, useEffect, useState } from "react";

type SetStoredValue<T> = (value: T | ((currentValue: T) => T)) => void;

function readLocalStorage<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") {
    return initialValue;
  }

  const item = window.localStorage.getItem(key);

  if (!item) {
    return initialValue;
  }

  try {
    return JSON.parse(item) as T;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetStoredValue<T>, () => void] {
  const [storedValue, setStoredValue] = useState(() =>
    readLocalStorage(key, initialValue)
  );

  useEffect(() => {
    setStoredValue(readLocalStorage(key, initialValue));
  }, [initialValue, key]);

  const setValue = useCallback<SetStoredValue<T>>(
    (value) => {
      setStoredValue((currentValue) => {
        const nextValue =
          value instanceof Function ? value(currentValue) : value;
        window.localStorage.setItem(key, JSON.stringify(nextValue));

        return nextValue;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [initialValue, key]);

  return [storedValue, setValue, removeValue];
}
