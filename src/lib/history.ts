import { useSyncExternalStore } from "react";
import type { GameRecord, SessionRecord } from "./types";

/** localStorage 위에 올린 아주 작은 외부 스토어. 서버 렌더에서는 항상 빈 목록. */
function createStore<T>(key: string, limit = 200) {
  const EMPTY: T[] = [];
  const listeners = new Set<() => void>();
  let cachedRaw: string | null = null;
  let cachedList: T[] = EMPTY;

  function readRaw(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function load(): T[] {
    if (typeof window === "undefined") return EMPTY;
    const raw = readRaw();
    if (raw === cachedRaw) return cachedList;
    cachedRaw = raw;
    try {
      cachedList = raw ? (JSON.parse(raw) as T[]) : EMPTY;
    } catch {
      cachedList = EMPTY;
    }
    return cachedList;
  }

  function notify() {
    listeners.forEach((l) => l());
  }

  function add(item: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify([item, ...load()].slice(0, limit)));
    } catch {
      // 저장이 막힌 환경(시크릿 모드 등)에서는 조용히 넘어간다.
    }
    notify();
  }

  function clear() {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    notify();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }

  function use(): T[] {
    return useSyncExternalStore(subscribe, load, () => EMPTY);
  }

  return { load, add, clear, use };
}

const sessions = createStore<SessionRecord>("think-first-history-v1");
const games = createStore<GameRecord>("think-first-games-v1");

export const loadHistory = sessions.load;
export const saveRecord = sessions.add;
export const saveGame = games.add;

export function clearHistory() {
  sessions.clear();
  games.clear();
}

/** 클라이언트에서 hydration이 끝났는지 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useHistory(): { records: SessionRecord[]; games: GameRecord[]; hydrated: boolean } {
  return { records: sessions.use(), games: games.use(), hydrated: useHydrated() };
}
