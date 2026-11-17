import type { Formula, Term } from './types';

const TEXT_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '$': '\\$',
  '%': '\\%',
  '#': '\\#',
  '&': '\\&',
  '_': '\\_',
  '^': '\\textasciicircum{}',
  '~': '\\textasciitilde{}'
};

export function escapeLatexText(value: string): string {
  return value.replace(/[\\{}$%#&_^~]/g, (character) => TEXT_ESCAPES[character] ?? character);
}

export function textLatex(value: string): string {
  return `\\text{${escapeLatexText(value)}}`;
}

function mathIdentifier(name: string, italic: boolean): string {
  if (/^[A-Za-z]$/.test(name)) {
    return name;
  }
  return italic ? `\\mathit{${name}}` : `\\mathrm{${name}}`;
}

export function variableLatex(name: string): string {
  return mathIdentifier(name, true);
}

export function functionLatex(name: string): string {
  return mathIdentifier(name, false);
}

export function predicateLatex(name: string): string {
  return mathIdentifier(name, false);
}

export function termToLatex(term: Term): string {
  if (term.kind === 'variable') {
    return variableLatex(term.name);
  }
  return `${functionLatex(term.name)}(${term.args.map(termToLatex).join(', ')})`;
}

interface RawLatex {
  latex: string;
  precedence: number;
}

function renderAt(formula: Formula, minimumPrecedence: number): string {
  const rendered = rawFormulaLatex(formula);
  return rendered.precedence < minimumPrecedence ? `(${rendered.latex})` : rendered.latex;
}

function rawFormulaLatex(formula: Formula): RawLatex {
  switch (formula.kind) {
    case 'atom':
      return {
        latex: `${predicateLatex(formula.name)}(${formula.args.map(termToLatex).join(', ')})`,
        precedence: 5
      };
    case 'equality':
      return {
        latex: `${termToLatex(formula.left)} = ${termToLatex(formula.right)}`,
        precedence: 5
      };
    case 'not':
      return {
        latex: `\\neg ${renderAt(formula.arg, 4)}`,
        precedence: 4
      };
    case 'forall':
    case 'exists': {
      const symbol = formula.kind === 'forall' ? '\\forall' : '\\exists';
      return {
        latex: `${symbol} ${variableLatex(formula.variable)}\\, ${renderAt(formula.body, 4)}`,
        precedence: 4
      };
    }
    case 'and':
      return {
        latex: `${renderAt(formula.left, 3)} \\land ${renderAt(formula.right, 4)}`,
        precedence: 3
      };
    case 'or':
      return {
        latex: `${renderAt(formula.left, 2)} \\lor ${renderAt(formula.right, 3)}`,
        precedence: 2
      };
    case 'implies':
      return {
        latex: `${renderAt(formula.left, 2)} \\to ${renderAt(formula.right, 1)}`,
        precedence: 1
      };
  }
}

export function formulaToLatex(formula: Formula): string {
  return rawFormulaLatex(formula).latex;
}

export function tupleLatex(tuple: readonly string[]): string {
  return `\\left(${tuple.map(textLatex).join(',\\, ')}\\right)`;
}

export function setLatex(tuples: readonly (readonly string[])[]): string {
  if (tuples.length === 0) {
    return '\\varnothing';
  }
  return `\\left\\{${tuples.map(tupleLatex).join(',\\, ')}\\right\\}`;
}

export function domainLatex(domain: readonly string[]): string {
  return `\\left\\{${domain.map(textLatex).join(',\\, ')}\\right\\}`;
}
