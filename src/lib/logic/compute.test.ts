import { describe, expect, it } from 'vitest';
import { evaluateInput } from './compute';
import { generateTuples, tupleKey } from './tuples';
import type { EvaluationInput, SymbolDecl } from './types';

function tableFor(
  domain: string[],
  arity: number,
  value: (tuple: string[]) => string | boolean
): Record<string, string | boolean> {
  const table: Record<string, string | boolean> = {};
  for (const tuple of generateTuples(domain, arity)) {
    table[tupleKey(tuple)] = value(tuple);
  }
  return table;
}

const P: SymbolDecl = { id: 'P', name: 'P', arity: 1 };
const f: SymbolDecl = { id: 'f', name: 'f', arity: 1 };

function baseInput(overrides: Partial<EvaluationInput> = {}): EvaluationInput {
  return {
    domainInput: '0, 1',
    functions: [],
    predicates: [P],
    functionTables: {},
    predicateTables: {
      P: tableFor(['0', '1'], 1, ([value]) => value === '0') as Record<string, boolean>
    },
    formula: 'P(x)',
    environment: { x: '0' },
    ...overrides
  };
}

describe('compute orchestrator', () => {
  it('evaluates a valid open formula with assignment', () => {
    const result = evaluateInput(baseInput());
    expect(result.status).toBe('valid');
    expect(result.truth).toBe(true);
    expect(result.freeVariables).toEqual(['x']);
    expect(result.formulaLatex).toBe('P(x)');
    expect(result.errors).toEqual([]);
    expect(result.trace).toBeDefined();
  });

  it('evaluates a valid closed formula and reports a counterexample', () => {
    const result = evaluateInput(
      baseInput({ formula: '∀x P(x)', environment: {} })
    );
    expect(result.status).toBe('valid');
    expect(result.truth).toBe(false);
    expect(result.certificate).toBe('counterexample');
    expect(result.freeVariables).toEqual([]);
  });

  it('rejects missing environments without assigning a truth value', () => {
    const result = evaluateInput(baseInput({ environment: {} }));
    expect(result.status).toBe('invalid');
    expect(result.truth).toBeUndefined();
    expect(result.errors.some((error) => error.code === 'ASIGNACION_FALTANTE')).toBe(true);
  });

  it('rejects invalid assignments', () => {
    const result = evaluateInput(baseInput({ environment: { x: '9' } }));
    expect(result.status).toBe('invalid');
    expect(result.errors.some((error) => error.code === 'ASIGNACION_INVALIDA')).toBe(true);
  });

  it('rejects syntax errors without evaluating', () => {
    const result = evaluateInput(baseInput({ formula: 'P(x' }));
    expect(result.status).toBe('invalid');
    expect(result.truth).toBeUndefined();
    expect(result.errors.some((error) => error.section === 'sintaxis')).toBe(true);
  });

  it('rejects unknown symbols and arity errors', () => {
    const unknown = evaluateInput(baseInput({ formula: 'Z(x)' }));
    expect(unknown.status).toBe('invalid');
    expect(unknown.errors.some((error) => error.code === 'SIMBOLO_DESCONOCIDO')).toBe(true);

    const arity = evaluateInput(baseInput({ formula: 'P(x, x)' }));
    expect(arity.status).toBe('invalid');
    expect(arity.errors.some((error) => error.code === 'ARIDAD')).toBe(true);
  });

  it('rejects empty relations', () => {
    const result = evaluateInput(
      baseInput({
        predicateTables: {
          P: tableFor(['0', '1'], 1, () => false) as Record<string, boolean>
        }
      })
    );
    expect(result.status).toBe('invalid');
    expect(result.errors.some((error) => error.code === 'RELACION_VACIA')).toBe(true);
    expect(result.truth).toBeUndefined();
  });

  it('rejects incomplete function tables', () => {
    const table = tableFor(['0', '1'], 1, () => '1') as Record<string, string>;
    delete table[tupleKey(['0'])];
    const result = evaluateInput(
      baseInput({
        functions: [f],
        functionTables: { f: table },
        formula: 'f(x) = y',
        environment: { x: '0', y: '1' }
      })
    );
    expect(result.status).toBe('invalid');
    expect(result.errors.some((error) => error.code === 'FALTA_VALOR_FUNCION')).toBe(true);
  });

  it('supports equality-only formulas with no declared symbols', () => {
    const result = evaluateInput({
      domainInput: '0, 1',
      functions: [],
      predicates: [],
      functionTables: {},
      predicateTables: {},
      formula: 'x = y',
      environment: { x: '0', y: '0' }
    });
    expect(result.status).toBe('valid');
    expect(result.truth).toBe(true);
  });

  it('evaluates function terms', () => {
    const result = evaluateInput({
      domainInput: '0, 1, 2',
      functions: [f],
      predicates: [],
      functionTables: {
        f: tableFor(['0', '1', '2'], 1, ([value]) =>
          value === '0' ? '1' : value === '1' ? '2' : '0'
        ) as Record<string, string>
      },
      predicateTables: {},
      formula: 'f(x) = y',
      environment: { x: '0', y: '1' }
    });
    expect(result.status).toBe('valid');
    expect(result.truth).toBe(true);
  });

  it('rejects invalid domains before evaluation', () => {
    const duplicate = evaluateInput(baseInput({ domainInput: '0, 0' }));
    expect(duplicate.status).toBe('invalid');
    expect(duplicate.errors.some((error) => error.code === 'ELEMENTO_DUPLICADO')).toBe(true);

    const empty = evaluateInput(baseInput({ domainInput: '' }));
    expect(empty.status).toBe('invalid');
    expect(empty.errors.some((error) => error.code === 'DOMINIO_VACIO')).toBe(true);
  });

  it('rejects invalid language declarations', () => {
    const result = evaluateInput(
      baseInput({
        functions: [{ id: 'g', name: 'P', arity: 1 }],
        predicates: [P]
      })
    );
    expect(result.status).toBe('invalid');
    expect(result.errors.some((error) => error.code === 'NOMBRE_DUPLICADO')).toBe(true);
  });

  it('reports complete verification for a true universal', () => {
    const result = evaluateInput(
      baseInput({
        predicates: [P],
        predicateTables: {
          P: tableFor(['0', '1'], 1, () => true) as Record<string, boolean>
        },
        formula: '∀x P(x)',
        environment: {}
      })
    );
    expect(result.status).toBe('valid');
    expect(result.truth).toBe(true);
    expect(result.certificate).toBe('complete');
    expect(result.trace?.kind).toBe('forall');
  });
});
