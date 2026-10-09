import { useSyncExternalStore } from "react";
import type { SessionRecord } from "./types";

const KEY = "think-first-history-v1";
const EMPTY: SessionRecord[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedList: SessionRecord[] = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function loadHistory(): SessionRecord[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    cachedList = raw ? (JSON.parse(raw) as SessionRecord[]) : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

function notify() {
  listeners.forEach((l) => l());
}

export function saveRecord(record: SessionRecord) {
  try {
    const list = [record, ...loadHistory()].slice(0, 200);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 조용히 넘어간다.
  }
  notify();
}

export function clearHistory() {
  try {
    window.localStorage.removeItem(KEY);
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

/** 서버 렌더에서는 빈 목록, 클라이언트에서는 localStorage 기록을 돌려준다. */
export function useHistory(): { records: SessionRecord[]; hydrated: boolean } {
  const records = useSyncExternalStore(subscribe, loadHistory, () => EMPTY);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return { records, hydrated };
}
