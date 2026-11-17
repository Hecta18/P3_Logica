import { EXAMPLES, cloneExample } from '../examples';
import type { Example } from '../examples';
import { generateTuples, tupleCount, tupleKey } from '../logic/tuples';
import type { SymbolDecl } from '../logic/types';
import { LIMITS } from '../logic/types';
import { parseDomainInput } from '../logic/validation';

export interface FormState {
  domainInput: string;
  functions: SymbolDecl[];
  predicates: SymbolDecl[];
  functionTables: Record<string, Record<string, string>>;
  predicateTables: Record<string, Record<string, boolean>>;
  formula: string;
  environment: Record<string, string>;
}

let idCounter = 0;

export function newSymbolId(prefix: string): string {
  idCounter += 1;
  return `sym-${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function fromExample(example: Example): FormState {
  const clone = cloneExample(example);
  return {
    domainInput: clone.domainInput,
    functions: clone.functions,
    predicates: clone.predicates,
    functionTables: clone.functionTables,
    predicateTables: clone.predicateTables,
    formula: clone.formula,
    environment: clone.environment
  };
}

export const form = $state<FormState>(fromExample(EXAMPLES[0]));

export function loadExampleIntoForm(example: Example): void {
  const next = fromExample(example);
  form.domainInput = next.domainInput;
  form.functions = next.functions;
  form.predicates = next.predicates;
  form.functionTables = next.functionTables;
  form.predicateTables = next.predicateTables;
  form.formula = next.formula;
  form.environment = next.environment;
  syncInterpretationTables();
}

export function resetForm(): void {
  form.domainInput = '';
  form.functions = [];
  form.predicates = [];
  form.functionTables = {};
  form.predicateTables = {};
  form.formula = '';
  form.environment = {};
}

function nextName(kind: 'function' | 'predicate'): string {
  const used = new Set([
    ...form.functions.map((symbol) => symbol.name),
    ...form.predicates.map((symbol) => symbol.name)
  ]);
  const base = kind === 'function' ? 'f' : 'P';
  if (!used.has(base)) {
    return base;
  }
  let index = 2;
  while (used.has(`${base}${index}`)) {
    index += 1;
  }
  return `${base}${index}`;
}

export function addFunction(): void {
  form.functions = [
    ...form.functions,
    { id: newSymbolId('f'), name: nextName('function'), arity: 1 }
  ];
  syncInterpretationTables();
}

export function addPredicate(): void {
  form.predicates = [
    ...form.predicates,
    { id: newSymbolId('P'), name: nextName('predicate'), arity: 1 }
  ];
  syncInterpretationTables();
}

export function removeFunction(id: string): void {
  form.functions = form.functions.filter((symbol) => symbol.id !== id);
  delete form.functionTables[id];
  syncInterpretationTables();
}

export function removePredicate(id: string): void {
  form.predicates = form.predicates.filter((symbol) => symbol.id !== id);
  delete form.predicateTables[id];
  syncInterpretationTables();
}

export function removeSymbol(kind: 'function' | 'predicate', id: string): void {
  if (kind === 'function') {
    removeFunction(id);
  } else {
    removePredicate(id);
  }
}

export function syncInterpretationTables(): void {
  const domain = parseDomainInput(form.domainInput).domain;
  const domainSet = new Set(domain);
  const functionIds = new Set(form.functions.map((symbol) => symbol.id));
  const predicateIds = new Set(form.predicates.map((symbol) => symbol.id));

  for (const id of Object.keys(form.functionTables)) {
    if (!functionIds.has(id)) {
      delete form.functionTables[id];
    }
  }
  for (const id of Object.keys(form.predicateTables)) {
    if (!predicateIds.has(id)) {
      delete form.predicateTables[id];
    }
  }

  for (const symbol of form.functions) {
    if (
      !Number.isInteger(symbol.arity) ||
      symbol.arity < 1 ||
      domain.length === 0 ||
      tupleCount(domain.length, symbol.arity) > LIMITS.maxTuplesPerSymbol
    ) {
      continue;
    }
    const current = form.functionTables[symbol.id] ?? {};
    const expected = generateTuples(domain, symbol.arity);
    const next: Record<string, string> = {};
    for (const tuple of expected) {
      const key = tupleKey(tuple);
      const value = current[key];
      if (value && domainSet.has(value)) {
        next[key] = value;
      }
    }
    form.functionTables[symbol.id] = next;
  }

  for (const symbol of form.predicates) {
    if (
      !Number.isInteger(symbol.arity) ||
      symbol.arity < 1 ||
      domain.length === 0 ||
      tupleCount(domain.length, symbol.arity) > LIMITS.maxTuplesPerSymbol
    ) {
      continue;
    }
    const current = form.predicateTables[symbol.id] ?? {};
    const expected = generateTuples(domain, symbol.arity);
    const next: Record<string, boolean> = {};
    for (const tuple of expected) {
      next[tupleKey(tuple)] = current[tupleKey(tuple)] === true;
    }
    form.predicateTables[symbol.id] = next;
  }
}
