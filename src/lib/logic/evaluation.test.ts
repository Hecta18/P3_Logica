import { describe, expect, it } from 'vitest';
import { certificateOfTrace, evaluateFormula } from './evaluate';
import { parseFormula } from './parser';
import { buildSymbolTable } from './symbols';
import { makeFunction, makePredicate, makeStructure } from './testing';
import type { Formula, Structure, Trace, TraceRow } from './types';
import { flattenTrace } from './explain';

const f = { id: 'f', name: 'f', arity: 1 };
const P = { id: 'P', name: 'P', arity: 1 };
const Q = { id: 'Q', name: 'Q', arity: 1 };
const R = { id: 'R', name: 'R', arity: 2 };
const symbols = buildSymbolTable([f], [P, Q, R]);

const domain = ['0', '1', '2'];

function structure(): Structure {
  return makeStructure(
    domain,
    {
      f: makeFunction(domain, 1, ([value]) => (value === '0' ? '1' : value === '1' ? '2' : '0'))
    },
    {
      P: makePredicate(domain, 1, ([value]) => value === '0' || value === '2'),
      Q: makePredicate(domain, 1, ([value]) => value === '1'),
      R: makePredicate(domain, 2, ([left, right]) => left === right)
    }
  );
}

function parse(source: string): Formula {
  return parseFormula(source, symbols);
}

function evaluate(source: string, assignment: Record<string, string> = {}): Trace {
  return evaluateFormula(parse(source), structure(), assignment);
}

describe('evaluator', () => {
  it('evaluates atoms, terms and equality', () => {
    expect(evaluate('P(x)', { x: '0' }).value).toBe(true);
    expect(evaluate('P(x)', { x: '1' }).value).toBe(false);
    expect(evaluate('P(f(x))', { x: '2' }).value).toBe(true);
    expect(evaluate('f(x) = y', { x: '0', y: '1' }).value).toBe(true);
    expect(evaluate('f(x) = y', { x: '0', y: '2' }).value).toBe(false);
    expect(evaluate('x = y', { x: '0', y: '0' }).value).toBe(true);
    expect(evaluate('x = y', { x: '0', y: '1' }).value).toBe(false);
  });

  it('evaluates connectives with decisive short-circuiting', () => {
    const andFalse = evaluate('P(x) ∧ Q(x)', { x: '1' });
    expect(andFalse.value).toBe(false);
    if (andFalse.kind === 'and') {
      expect(andFalse.rightEvaluated).toBe(false);
      expect(andFalse.decisive).toBe('left');
    }

    const orTrue = evaluate('P(x) ∨ Q(x)', { x: '0' });
    expect(orTrue.value).toBe(true);
    if (orTrue.kind === 'or') {
      expect(orTrue.rightEvaluated).toBe(false);
      expect(orTrue.decisive).toBe('left');
    }

    const implicationTrue = evaluate('P(x) → Q(x)', { x: '1' });
    expect(implicationTrue.value).toBe(true);
    if (implicationTrue.kind === 'implies') {
      expect(implicationTrue.rightEvaluated).toBe(false);
      expect(implicationTrue.decisive).toBe('left');
    }

    const implicationFalse = evaluate('P(x) → Q(x)', { x: '0' });
    expect(implicationFalse.value).toBe(false);
    if (implicationFalse.kind === 'implies') {
      expect(implicationFalse.rightEvaluated).toBe(true);
      expect(implicationFalse.decisive).toBe('both');
    }

    expect(evaluate('¬P(x)', { x: '0' }).value).toBe(false);
    expect(evaluate('¬P(x)', { x: '1' }).value).toBe(true);
  });

  it('reports a counterexample for a false universal', () => {
    const trace = evaluate('∀x P(x)');
    expect(trace.value).toBe(false);
    expect(certificateOfTrace(trace)).toBe('counterexample');
    if (trace.kind === 'forall') {
      expect(trace.entries).toHaveLength(1);
      expect(trace.entries[0].element).toBe('1');
    }
    const rows = flattenTrace(trace);
    expect(rows.some((row) => row.label === 'Contraejemplo')).toBe(true);
  });

  it('reports complete verification for a true universal', () => {
    const trace = evaluate('∀x (P(x) ∨ Q(x))');
    expect(trace.value).toBe(true);
    expect(certificateOfTrace(trace)).toBe('complete');
    if (trace.kind === 'forall') {
      expect(trace.entries.map((entry) => entry.element)).toEqual(['0', '1', '2']);
    }
    const rows = flattenTrace(trace);
    expect(rows.some((row) => row.label?.startsWith('Comprobación completa'))).toBe(true);
    expect(rows.filter((row) => row.kind === 'binding')).toHaveLength(3);
  });

  it('reports a witness for a true existential', () => {
    const trace = evaluate('∃x Q(x)');
    expect(trace.value).toBe(true);
    expect(certificateOfTrace(trace)).toBe('witness');
    if (trace.kind === 'exists') {
      expect(trace.entries).toHaveLength(1);
      expect(trace.entries[0].element).toBe('1');
    }
    const rows = flattenTrace(trace);
    expect(rows.some((row) => row.label === 'Testigo')).toBe(true);
  });

  it('reports complete verification for a false existential', () => {
    const trace = evaluate('∃x (P(x) ∧ Q(x))');
    expect(trace.value).toBe(false);
    expect(certificateOfTrace(trace)).toBe('complete');
    if (trace.kind === 'exists') {
      expect(trace.entries.map((entry) => entry.element)).toEqual(['0', '1', '2']);
    }
  });

  it('evaluates nested quantifiers', () => {
    expect(evaluate('∀x ∃y R(x, y)').value).toBe(true);
    expect(evaluate('∃x ∀y R(x, y)').value).toBe(false);
    expect(evaluate('∃x ∃y R(x, y)').value).toBe(true);
    expect(evaluate('∀x ∀y R(x, y)').value).toBe(false);
  });

  it('keeps free variables independent from bound variables with the same name', () => {
    const trace = evaluate('P(x) ∧ ∀x Q(x)', { x: '0' });
    expect(trace.value).toBe(false);
    const rows: TraceRow[] = flattenTrace(trace);
    expect(rows[0].formulaLatex).toContain('P(x)');
  });

  it('evaluates formulas with function terms inside atoms', () => {
    const trace = evaluate('P(f(x))', { x: '1' });
    expect(trace.value).toBe(true);
    if (trace.kind === 'atom') {
      expect(trace.terms[0].value).toBe('2');
      expect(trace.detailLatex).toContain('\\in');
    }
  });
});
