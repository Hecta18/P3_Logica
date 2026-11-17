import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { formulaToLatex, setLatex, textLatex, tupleLatex } from './latex';
import { parseFormula } from './parser';
import { buildSymbolTable } from './symbols';

const symbols = buildSymbolTable(
  [{ id: 'f', name: 'f', arity: 2 }],
  [
    { id: 'P', name: 'P', arity: 1 },
    { id: 'R', name: 'R', arity: 2 }
  ]
);

function render(latex: string): string {
  return katex.renderToString(latex, { throwOnError: true, strict: 'ignore' });
}

describe('LaTeX generation', () => {
  it('renders canonical formulas', () => {
    const formula = parseFormula(
      '∀x (P(x) → ∃y R(f(x, y), y)) ∧ ¬(x = y)',
      symbols
    );
    const latex = formulaToLatex(formula);
    expect(latex).toContain('\\forall x\\,');
    expect(latex).toContain('\\exists y\\,');
    expect(latex).toContain('\\land');
    expect(() => render(latex)).not.toThrow();
  });

  it('escapes domain labels safely in text mode', () => {
    const values = ['a_b', '50%', '#1', '{x}', 'a\\b', 'x^2', 'a~b'];
    for (const value of values) {
      expect(() => render(textLatex(value))).not.toThrow();
    }
    expect(() => render(tupleLatex(['a_b', '50%']))).not.toThrow();
    expect(() => render(setLatex([['a_b'], ['50%']]))).not.toThrow();
  });

  it('renders empty sets', () => {
    expect(() => render(setLatex([]))).not.toThrow();
    expect(setLatex([])).toBe('\\varnothing');
  });

  it('renders multi-character names with math identifiers', () => {
    const localSymbols = buildSymbolTable(
      [{ id: 'foo', name: 'foo', arity: 1 }],
      [{ id: 'Bar', name: 'Bar', arity: 1 }]
    );
    const formula = parseFormula('Bar(foo(x))', localSymbols);
    const latex = formulaToLatex(formula);
    expect(latex).toContain('\\mathrm{Bar}');
    expect(latex).toContain('\\mathrm{foo}');
    expect(() => render(latex)).not.toThrow();
  });
});
