import type { SymbolDecl, SymbolTable } from './types';

export function buildSymbolTable(
  functions: readonly SymbolDecl[],
  predicates: readonly SymbolDecl[]
): SymbolTable {
  const table: SymbolTable = new Map();
  for (const symbol of functions) {
    table.set(symbol.name, { kind: 'function', arity: symbol.arity });
  }
  for (const symbol of predicates) {
    table.set(symbol.name, { kind: 'predicate', arity: symbol.arity });
  }
  return table;
}
