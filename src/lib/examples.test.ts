import { describe, expect, it } from 'vitest';
import { EXAMPLES, cloneExample } from './examples';
import { evaluateInput } from './logic/compute';
import type { Certificate } from './logic/types';

interface Expectation {
  status: 'valid' | 'invalid';
  truth?: boolean;
  certificate?: Certificate;
}

const EXPECTATIONS: Record<string, Expectation> = {
  'universal-falso': {
    status: 'valid',
    truth: false,
    certificate: 'counterexample'
  },
  'existencial-testigo': {
    status: 'valid',
    truth: true,
    certificate: 'witness'
  },
  'universal-verdadero': {
    status: 'valid',
    truth: true,
    certificate: 'complete'
  },
  'existencial-falso': {
    status: 'valid',
    truth: false,
    certificate: 'complete'
  },
  'abierta-entorno': {
    status: 'valid',
    truth: false,
    certificate: 'direct'
  },
  'funcion-igualdad': {
    status: 'valid',
    truth: true,
    certificate: 'complete'
  },
  anidado: {
    status: 'valid',
    truth: true,
    certificate: 'complete'
  },
  'solo-igualdad': {
    status: 'valid',
    truth: true,
    certificate: 'direct'
  },
  'error-aridad': { status: 'invalid' },
  'error-relacion-vacia': { status: 'invalid' },
  'error-funcion-incompleta': { status: 'invalid' }
};

describe('ejemplos manuales', () => {
  for (const example of EXAMPLES) {
    it(`mantiene el resultado esperado de "${example.title}"`, () => {
      const clone = cloneExample(example);
      const result = evaluateInput({
        domainInput: clone.domainInput,
        functions: clone.functions,
        predicates: clone.predicates,
        functionTables: clone.functionTables,
        predicateTables: clone.predicateTables,
        formula: clone.formula,
        environment: clone.environment
      });

      const expected = EXPECTATIONS[example.id];
      expect(expected, `Falta la expectativa de ${example.id}`).toBeDefined();
      expect(result.status).toBe(expected.status);
      expect(result.truth).toBe(expected.truth);
      expect(result.certificate).toBe(expected.certificate);
    });
  }
});
