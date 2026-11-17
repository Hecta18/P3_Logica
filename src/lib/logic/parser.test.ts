import { describe, expect, it } from 'vitest';
import { ParseError } from './errors';
import { freeVariablesOf } from './freeVars';
import { formulaToLatex } from './latex';
import { parseFormula } from './parser';
import { buildSymbolTable } from './symbols';
import type { Formula, SymbolDecl } from './types';

const f: SymbolDecl = { id: 'f', name: 'f', arity: 1 };
const g: SymbolDecl = { id: 'g', name: 'g', arity: 2 };
const P: SymbolDecl = { id: 'P', name: 'P', arity: 1 };
const Q: SymbolDecl = { id: 'Q', name: 'Q', arity: 1 };
const R: SymbolDecl = { id: 'R', name: 'R', arity: 2 };

const symbols = buildSymbolTable([f, g], [P, Q, R]);

function parse(source: string): Formula {
  return parseFormula(source, symbols);
}

function variableNames(formula: Formula): string[] {
  return freeVariablesOf(formula);
}

describe('parser', () => {
  it('accepts LaTeX macros and Unicode symbols', () => {
    const latex = parse('\\forall x (P(x) \\to Q(f(x)))');
    const unicode = parse('∀x (P(x) → Q(f(x)))');
    expect(latex).toEqual(unicode);
    expect(formulaToLatex(latex)).toBe('\\forall x\\, (P(x) \\to Q(f(x)))');
  });

  it('respects precedence and right associativity of implication', () => {
    const formula = parse('P(x) ∨ Q(x) ∧ R(x, y) → P(f(y))');
    expect(formula.kind).toBe('implies');
    if (formula.kind !== 'implies') {
      return;
    }
    expect(formula.left.kind).toBe('or');
    if (formula.left.kind !== 'or') {
      return;
    }
    expect(formula.left.right.kind).toBe('and');

    const chain = parse('P(x) → Q(x) → R(x, x)');
    expect(chain.kind).toBe('implies');
    if (chain.kind === 'implies') {
      expect(chain.right.kind).toBe('implies');
    }
  });

  it('uses the immediately following unary formula as quantifier scope', () => {
    const formula = parse('∀x P(x) ∧ Q(x)');
    expect(formula.kind).toBe('and');
    if (formula.kind === 'and') {
      expect(formula.left.kind).toBe('forall');
      expect(variableNames(formula)).toEqual(['x']);
    }

    const grouped = parse('∀x (P(x) ∧ Q(x))');
    expect(grouped.kind).toBe('forall');
    if (grouped.kind === 'forall') {
      expect(grouped.body.kind).toBe('and');
      expect(variableNames(grouped)).toEqual([]);
    }
  });

  it('supports nested quantifiers and shadowing', () => {
    const formula = parse('∀x (P(x) → ∃x R(x, x))');
    expect(variableNames(formula)).toEqual([]);
  });

  it('parses equality between terms', () => {
    const variableEquality = parse('x = y');
    expect(variableEquality.kind).toBe('equality');
    expect(variableNames(variableEquality)).toEqual(['x', 'y']);

    const functionEquality = parse('f(x) = g(y, x)');
    expect(functionEquality.kind).toBe('equality');
    expect(variableNames(functionEquality)).toEqual(['x', 'y']);
  });

  it('rejects predicate applications used as terms', () => {
    expect(() => parse('P(x) = y')).toThrow(ParseError);
  });

  it('rejects unknown predicates and functions', () => {
    expect(() => parse('Z(x)')).toThrow(/no está declarado/);
    expect(() => parse('h(x) = y')).toThrow(/no está declarado/);
  });

  it('rejects arity mismatches', () => {
    expect(() => parse('P(x, y)')).toThrow(/espera 1 argumento/);
    expect(() => parse('f(x, y) = z')).toThrow(/espera 1 argumento/);
    expect(() => parse('g(x) = y')).toThrow(/espera 2 argumento/);
    expect(() => parse('f')).toThrow(/requiere 1 argumento/);
  });

  it('rejects a declared symbol as a bound variable', () => {
    expect(() => parse('∀P P(x)')).toThrow(/no puede usarse como variable ligada/);
    expect(() => parse('∃f P(x)')).toThrow(/no puede usarse como variable ligada/);
  });

  it('rejects malformed formulas with positions', () => {
    expect(() => parse('P(x')).toThrow(/paréntesis de cierre/);
    expect(() => parse('(P(x)')).toThrow(/paréntesis de cierre/);
    expect(() => parse('P(x) Q(x)')).toThrow(/Token inesperado/);
    expect(() => parse('\\neg')).toThrow(/Se esperaba/);
    expect(() => parse('\\forall')).toThrow(/variable/);
    expect(() => parse('\\unknown P(x)')).toThrow(/no reconocido/);
    expect(() => parse('P(x) & Q(x)')).toThrow(/Carácter no permitido/);
    expect(() => parse('')).toThrow(/vacía/);
  });

  it('detects free variables inside function arguments', () => {
    const formula = parse('P(f(x)) ∧ R(y, z)');
    expect(variableNames(formula)).toEqual(['x', 'y', 'z']);
  });

  it('renders formulas with enough parentheses to preserve meaning', () => {
    expect(formulaToLatex(parse('P(x) → (Q(x) → R(x, x))'))).toBe(
      'P(x) \\to Q(x) \\to R(x, x)'
    );
    expect(formulaToLatex(parse('(P(x) → Q(x)) → R(x, x)'))).toBe(
      '(P(x) \\to Q(x)) \\to R(x, x)'
    );
    expect(formulaToLatex(parse('¬(P(x) ∧ Q(x))'))).toBe('\\neg (P(x) \\land Q(x))');
  });
});
