import { describe, expect, it } from 'vitest';
import { generateTuples, tupleKey } from './tuples';
import {
  parseDomainInput,
  validateEnvironment,
  validateInterpretation,
  validateLanguage
} from './validation';
import type { SymbolDecl } from './types';

function functionTable(
  domain: string[],
  arity: number,
  mapper: (tuple: string[]) => string
): Record<string, string> {
  const table: Record<string, string> = {};
  for (const tuple of generateTuples(domain, arity)) {
    table[tupleKey(tuple)] = mapper(tuple);
  }
  return table;
}

function predicateTable(
  domain: string[],
  arity: number,
  predicate: (tuple: string[]) => boolean
): Record<string, boolean> {
  const table: Record<string, boolean> = {};
  for (const tuple of generateTuples(domain, arity)) {
    table[tupleKey(tuple)] = predicate(tuple);
  }
  return table;
}

const f: SymbolDecl = { id: 'f', name: 'f', arity: 1 };
const P: SymbolDecl = { id: 'P', name: 'P', arity: 1 };

describe('domain validation', () => {
  it('rejects empty domains', () => {
    expect(parseDomainInput('   ').errors[0].code).toBe('DOMINIO_VACIO');
    expect(parseDomainInput('').domain).toEqual([]);
  });

  it('rejects duplicated and empty elements', () => {
    const duplicate = parseDomainInput('a, b, a');
    expect(duplicate.errors.some((error) => error.code === 'ELEMENTO_DUPLICADO')).toBe(true);
    const empty = parseDomainInput('a,,b,');
    expect(empty.errors.some((error) => error.code === 'ELEMENTO_VACIO')).toBe(true);
  });

  it('accepts a valid domain preserving order', () => {
    const result = parseDomainInput(' 0, a, b ');
    expect(result.errors).toEqual([]);
    expect(result.domain).toEqual(['0', 'a', 'b']);
  });

  it('limits the size of the domain', () => {
    const elements = Array.from({ length: 101 }, (_, index) => `e${index}`).join(',');
    const result = parseDomainInput(elements);
    expect(result.errors.some((error) => error.code === 'DOMINIO_GRANDE')).toBe(true);
    expect(result.domain).toHaveLength(100);
  });
});

describe('language validation', () => {
  it('accepts valid symbols', () => {
    expect(validateLanguage([f], [P])).toEqual([]);
  });

  it('rejects invalid names and arities', () => {
    const errors = validateLanguage(
      [
        { id: 'a', name: '1bad', arity: 1 },
        { id: 'b', name: 'ok', arity: 0 },
        { id: 'c', name: 'ok', arity: 9 }
      ],
      []
    );
    expect(errors.some((error) => error.code === 'NOMBRE_INVALIDO')).toBe(true);
    expect(errors.filter((error) => error.code === 'ARIDAD_INVALIDA')).toHaveLength(2);
  });

  it('rejects duplicate names across functions and predicates', () => {
    const errors = validateLanguage([{ id: 'f1', name: 'S', arity: 1 }], [
      { id: 'p1', name: 'S', arity: 2 }
    ]);
    expect(errors.some((error) => error.code === 'NOMBRE_DUPLICADO')).toBe(true);
  });
});

describe('interpretation validation', () => {
  const domain = ['0', '1'];

  it('accepts complete functions and nonempty relations', () => {
    const result = validateInterpretation(
      domain,
      [f],
      [P],
      { f: functionTable(domain, 1, ([value]) => (value === '0' ? '1' : '0')) },
      { P: predicateTable(domain, 1, ([value]) => value === '0') }
    );
    expect(result.errors).toEqual([]);
    expect(result.structure.functions.f.values[tupleKey(['0'])]).toBe('1');
    expect(result.structure.predicates.P.trueTuples[tupleKey(['0'])]).toBe(true);
  });

  it('detects missing function values', () => {
    const table = functionTable(domain, 1, () => '0');
    delete table[tupleKey(['1'])];
    const result = validateInterpretation(domain, [f], [], { f: table }, {});
    expect(result.errors.some((error) => error.code === 'FALTA_VALOR_FUNCION')).toBe(true);
  });

  it('detects function values outside the domain', () => {
    const result = validateInterpretation(
      domain,
      [f],
      [],
      { f: functionTable(domain, 1, () => '9') },
      {}
    );
    expect(result.errors.some((error) => error.code === 'VALOR_INVALIDO')).toBe(true);
  });

  it('detects invalid extra tuples', () => {
    const table = functionTable(domain, 1, () => '0');
    table[tupleKey(['0', '1'])] = '1';
    const result = validateInterpretation(domain, [f], [], { f: table }, {});
    expect(result.errors.some((error) => error.code === 'TUPLE_INVALIDA')).toBe(true);
  });

  it('detects missing predicate rows and empty relations', () => {
    const missing = predicateTable(domain, 1, () => true);
    delete missing[tupleKey(['1'])];
    const missingResult = validateInterpretation(
      domain,
      [],
      [P],
      {},
      { P: missing }
    );
    expect(
      missingResult.errors.some((error) => error.code === 'FALTA_TUPLA_PREDICADO')
    ).toBe(true);

    const emptyResult = validateInterpretation(
      domain,
      [],
      [P],
      {},
      { P: predicateTable(domain, 1, () => false) }
    );
    expect(emptyResult.errors.some((error) => error.code === 'RELACION_VACIA')).toBe(true);
  });

  it('enforces the practical tuple limit before generating tables', () => {
    const bigDomain = Array.from({ length: 100 }, (_, index) => `e${index}`);
    const result = validateInterpretation(
      bigDomain,
      [{ id: 'g', name: 'g', arity: 3 }],
      [],
      {},
      {}
    );
    expect(result.errors.some((error) => error.code === 'LIMITE_TUPLAS')).toBe(true);
  });
});

describe('environment validation', () => {
  it('detects missing and invalid assignments', () => {
    const errors = validateEnvironment(['x', 'y'], { x: '0', y: '9' }, ['0', '1']);
    expect(errors.some((error) => error.code === 'ASIGNACION_FALTANTE')).toBe(false);
    expect(errors.some((error) => error.code === 'ASIGNACION_INVALIDA')).toBe(true);
    expect(validateEnvironment(['x'], {}, ['0'])[0].code).toBe('ASIGNACION_FALTANTE');
  });

  it('accepts valid assignments', () => {
    expect(validateEnvironment(['x'], { x: '1' }, ['0', '1'])).toEqual([]);
  });
});
