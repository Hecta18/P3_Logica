import type { EvaluationResult, HistoryEntry } from '../logic/types';

const STORAGE_KEY = 'p3-logica-history-v1';
const MAX_ENTRIES = 80;

interface StoredHistory {
  nextId: number;
  selectedId: number | null;
  entries: HistoryEntry[];
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.id === 'number' &&
    typeof entry.createdAt === 'string' &&
    (entry.status === 'valid' || entry.status === 'invalid') &&
    typeof entry.formulaSource === 'string' &&
    Array.isArray(entry.errors)
  );
}

function restore(): StoredHistory {
  const storage = safeStorage();
  if (!storage) {
    return { nextId: 1, selectedId: null, entries: [] };
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { nextId: 1, selectedId: null, entries: [] };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { nextId: 1, selectedId: null, entries: [] };
    }
    const candidate = parsed as Partial<StoredHistory>;
    const entries = Array.isArray(candidate.entries)
      ? candidate.entries.filter(isHistoryEntry).slice(-MAX_ENTRIES)
      : [];
    const maxId = entries.reduce((maximum, entry) => Math.max(maximum, entry.id), 0);
    const nextId =
      typeof candidate.nextId === 'number' && candidate.nextId > maxId
        ? candidate.nextId
        : maxId + 1;
    const selectedId =
      typeof candidate.selectedId === 'number' &&
      entries.some((entry) => entry.id === candidate.selectedId)
        ? candidate.selectedId
        : entries.at(-1)?.id ?? null;
    return { nextId, selectedId, entries };
  } catch {
    return { nextId: 1, selectedId: null, entries: [] };
  }
}

class HistoryStore {
  entries = $state<HistoryEntry[]>([]);
  selectedId = $state<number | null>(null);
  nextId = $state(1);

  constructor() {
    const restored = restore();
    this.entries = restored.entries;
    this.selectedId = restored.selectedId;
    this.nextId = restored.nextId;
  }

  get selected(): HistoryEntry | null {
    return this.entries.find((entry) => entry.id === this.selectedId) ?? null;
  }

  add(result: EvaluationResult): HistoryEntry {
    const entry: HistoryEntry = {
      ...result,
      id: this.nextId,
      createdAt: new Date().toISOString()
    };
    this.nextId += 1;
    this.entries = [...this.entries, entry].slice(-MAX_ENTRIES);
    this.selectedId = entry.id;
    this.persist();
    return entry;
  }

  select(id: number): void {
    if (this.entries.some((entry) => entry.id === id)) {
      this.selectedId = id;
      this.persist();
    }
  }

  clear(): void {
    this.entries = [];
    this.selectedId = null;
    this.nextId = 1;
    this.persist();
  }

  private persist(): void {
    const storage = safeStorage();
    if (!storage) {
      return;
    }
    const serialize = (entries: HistoryEntry[]): string =>
      JSON.stringify({
        nextId: this.nextId,
        selectedId: this.selectedId,
        entries
      } satisfies StoredHistory);

    try {
      storage.setItem(STORAGE_KEY, serialize(this.entries));
    } catch {
      try {
        storage.setItem(STORAGE_KEY, serialize(this.entries.slice(-15)));
      } catch {
        // Si el almacenamiento no está disponible o está lleno, el historial
        // sigue funcionando durante la sesión actual.
      }
    }
  }
}

export const history = new HistoryStore();
