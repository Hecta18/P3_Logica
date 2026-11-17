import type { Formula, Term } from './types';

export function freeVariablesOf(formula: Formula): string[] {
  const bound = new Set<string>();
  const seen = new Set<string>();
  const result: string[] = [];

  const visitTerm = (term: Term): void => {
    if (term.kind === 'variable') {
      if (!bound.has(term.name) && !seen.has(term.name)) {
        seen.add(term.name);
        result.push(term.name);
      }
      return;
    }
    for (const argument of term.args) {
      visitTerm(argument);
    }
  };

  const visitFormula = (current: Formula): void => {
    switch (current.kind) {
      case 'atom':
        for (const argument of current.args) {
          visitTerm(argument);
        }
        return;
      case 'equality':
        visitTerm(current.left);
        visitTerm(current.right);
        return;
      case 'not':
        visitFormula(current.arg);
        return;
      case 'and':
      case 'or':
      case 'implies':
        visitFormula(current.left);
        visitFormula(current.right);
        return;
      case 'forall':
      case 'exists': {
        const wasBound = bound.has(current.variable);
        bound.add(current.variable);
        visitFormula(current.body);
        if (!wasBound) {
          bound.delete(current.variable);
        }
        return;
      }
    }
  };

  visitFormula(formula);
  return result;
}
