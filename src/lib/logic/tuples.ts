export function tupleKey(tuple: readonly string[]): string {
  return JSON.stringify(tuple);
}

export function tupleFromKey(key: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(key);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function generateTuples(domain: readonly string[], arity: number): string[][] {
  let result: string[][] = [[]];
  for (let position = 0; position < arity; position += 1) {
    const next: string[][] = [];
    for (const tuple of result) {
      for (const element of domain) {
        next.push([...tuple, element]);
      }
    }
    result = next;
  }
  return result;
}

export function tupleCount(domainSize: number, arity: number): number {
  if (arity === 0) {
    return 1;
  }
  let total = 1;
  for (let index = 0; index < arity; index += 1) {
    total *= domainSize;
    if (total > Number.MAX_SAFE_INTEGER) {
      return Number.MAX_SAFE_INTEGER;
    }
  }
  return total;
}

export function tupleLabel(tuple: readonly string[]): string {
  return `(${tuple.join(', ')})`;
}
