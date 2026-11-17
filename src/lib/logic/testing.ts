import { generateTuples, tupleKey } from './tuples';
import type {
  FunctionInterpretation,
  PredicateInterpretation,
  Structure
} from './types';

export function makeFunction(
  domain: string[],
  arity: number,
  mapper: (tuple: string[]) => string
): FunctionInterpretation {
  const values: Record<string, string> = {};
  for (const tuple of generateTuples(domain, arity)) {
    values[tupleKey(tuple)] = mapper(tuple);
  }
  return { arity, values };
}

export function makePredicate(
  domain: string[],
  arity: number,
  predicate: (tuple: string[]) => boolean
): PredicateInterpretation {
  const trueTuples: Record<string, true> = {};
  for (const tuple of generateTuples(domain, arity)) {
    if (predicate(tuple)) {
      trueTuples[tupleKey(tuple)] = true;
    }
  }
  return { arity, trueTuples };
}

export function makeStructure(
  domain: string[],
  functions: Record<string, FunctionInterpretation> = {},
  predicates: Record<string, PredicateInterpretation> = {}
): Structure {
  return { domain, functions, predicates };
}
