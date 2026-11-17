import { EvaluationError, EvaluationLimitError } from './errors';
import { formulaToLatex, predicateLatex, termToLatex, textLatex, tupleLatex } from './latex';
import { tupleKey } from './tuples';
import type {
  BinaryTrace,
  Certificate,
  Formula,
  Structure,
  Term,
  TermEvaluation,
  Trace
} from './types';
import { LIMITS } from './types';

interface EvaluationContext {
  structure: Structure;
  assignment: Record<string, string>;
  steps: number;
}

function bump(context: EvaluationContext): void {
  context.steps += 1;
  if (context.steps > LIMITS.maxEvaluationSteps) {
    throw new EvaluationLimitError(
      `La evaluación superó el límite de ${LIMITS.maxEvaluationSteps.toLocaleString('es')} pasos. Reduce el dominio o la fórmula.`
    );
  }
}

export function evaluateTerm(
  term: Term,
  structure: Structure,
  assignment: Record<string, string>,
  context?: EvaluationContext
): TermEvaluation {
  const contextValue =
    context ??
    ({
      structure,
      assignment,
      steps: 0
    } satisfies EvaluationContext);

  bump(contextValue);

  if (term.kind === 'variable') {
    const value = assignment[term.name];
    if (value === undefined) {
      throw new EvaluationError(`La variable “${term.name}” no tiene asignación.`);
    }
    return {
      kind: 'variable',
      name: term.name,
      latex: termToLatex(term),
      value,
      children: []
    };
  }

  const children = term.args.map((argument) =>
    evaluateTerm(argument, structure, assignment, contextValue)
  );
  const interpretation = structure.functions[term.name];
  if (!interpretation) {
    throw new EvaluationError(`No hay interpretación para la función “${term.name}”.`);
  }
  const key = tupleKey(children.map((child) => child.value));
  const value = interpretation.values[key];
  if (value === undefined) {
    throw new EvaluationError(
      `La función “${term.name}” no está definida para el tuple ${tupleLatex(children.map((child) => child.value))}.`
    );
  }

  return {
    kind: 'application',
    name: term.name,
    latex: termToLatex(term),
    value,
    children
  };
}

export function evaluateFormula(
  formula: Formula,
  structure: Structure,
  assignment: Record<string, string>,
  existingContext?: EvaluationContext
): Trace {
  const context =
    existingContext ??
    ({
      structure,
      assignment,
      steps: 0
    } satisfies EvaluationContext);

  bump(context);
  const formulaLatex = formulaToLatex(formula);

  switch (formula.kind) {
    case 'atom': {
      const terms = formula.args.map((term) =>
        evaluateTerm(term, structure, assignment, context)
      );
      const tuple = terms.map((term) => term.value);
      const key = tupleKey(tuple);
      const interpretation = structure.predicates[formula.name];
      if (!interpretation) {
        throw new EvaluationError(`No hay interpretación para el predicado “${formula.name}”.`);
      }
      const inRelation = interpretation.trueTuples[key] === true;
      const termDetails = terms
        .map((term) => `${term.latex} = ${textLatex(term.value)}`)
        .join(',\\; ');
      return {
        kind: 'atom',
        formulaLatex,
        value: inRelation,
        name: formula.name,
        terms,
        tuple,
        inRelation,
        detailLatex: `${tupleLatex(tuple)} ${inRelation ? '\\in' : '\\notin'} ${predicateLatex(formula.name)}^{I} \\quad \\left(${termDetails}\\right)`
      };
    }

    case 'equality': {
      const left = evaluateTerm(formula.left, structure, assignment, context);
      const right = evaluateTerm(formula.right, structure, assignment, context);
      const value = left.value === right.value;
      return {
        kind: 'equality',
        formulaLatex,
        value,
        left,
        right,
        detailLatex: `${textLatex(left.value)} ${value ? '=' : '\\ne'} ${textLatex(right.value)}`
      };
    }

    case 'not': {
      const child = evaluateFormula(formula.arg, structure, assignment, context);
      return {
        kind: 'not',
        formulaLatex,
        value: !child.value,
        child,
        reason: `El subformula es ${child.value ? 'verdadero' : 'falso'}; por tanto, su negación es ${child.value ? 'falsa' : 'verdadera'}.`
      };
    }

    case 'and': {
      const left = evaluateFormula(formula.left, structure, assignment, context);
      if (!left.value) {
        return {
          kind: 'and',
          formulaLatex,
          value: false,
          left,
          rightEvaluated: false,
          decisive: 'left',
          reason:
            'El primer conjuncto es falso; basta un conjuncto falso para que la conjunción sea falsa.'
        };
      }
      const right = evaluateFormula(formula.right, structure, assignment, context);
      return {
        kind: 'and',
        formulaLatex,
        value: right.value,
        left,
        right,
        rightEvaluated: true,
        decisive: right.value ? 'both' : 'right',
        reason: right.value
          ? 'Ambos conjunctos son verdaderos; por ello la conjunción es verdadera.'
          : 'El primer conjuncto es verdadero, pero el segundo es falso; por ello la conjunción es falsa.'
      };
    }

    case 'or': {
      const left = evaluateFormula(formula.left, structure, assignment, context);
      if (left.value) {
        return {
          kind: 'or',
          formulaLatex,
          value: true,
          left,
          rightEvaluated: false,
          decisive: 'left',
          reason:
            'El primer disyunto es verdadero; basta un disyunto verdadero para que la disyunción sea verdadera.'
        };
      }
      const right = evaluateFormula(formula.right, structure, assignment, context);
      return {
        kind: 'or',
        formulaLatex,
        value: right.value,
        left,
        right,
        rightEvaluated: true,
        decisive: right.value ? 'right' : 'both',
        reason: right.value
          ? 'El primer disyunto es falso, pero el segundo es verdadero; por ello la disyunción es verdadera.'
          : 'Ambos disyuntos son falsos; por ello la disyunción es falsa.'
      };
    }

    case 'implies': {
      const left = evaluateFormula(formula.left, structure, assignment, context);
      if (!left.value) {
        return {
          kind: 'implies',
          formulaLatex,
          value: true,
          left,
          rightEvaluated: false,
          decisive: 'left',
          reason:
            'El antecedente es falso; una implicación con antecedente falso es verdadera.'
        };
      }
      const right = evaluateFormula(formula.right, structure, assignment, context);
      return {
        kind: 'implies',
        formulaLatex,
        value: right.value,
        left,
        right,
        rightEvaluated: true,
        decisive: 'both',
        reason: right.value
          ? 'El antecedente y el consecuente son verdaderos; por ello la implicación es verdadera.'
          : 'El antecedente es verdadero y el consecuente es falso; por ello la implicación es falsa.'
      };
    }

    case 'forall': {
      const entries = [];
      for (const element of structure.domain) {
        const childAssignment = { ...assignment, [formula.variable]: element };
        const body = evaluateFormula(formula.body, structure, childAssignment, context);
        if (!body.value) {
          return {
            kind: 'forall',
            formulaLatex,
            value: false,
            variable: formula.variable,
            entries: [{ element, body }],
            certificate: 'counterexample'
          };
        }
        entries.push({ element, body });
      }
      return {
        kind: 'forall',
        formulaLatex,
        value: true,
        variable: formula.variable,
        entries,
        certificate: 'complete'
      };
    }

    case 'exists': {
      const entries = [];
      for (const element of structure.domain) {
        const childAssignment = { ...assignment, [formula.variable]: element };
        const body = evaluateFormula(formula.body, structure, childAssignment, context);
        if (body.value) {
          return {
            kind: 'exists',
            formulaLatex,
            value: true,
            variable: formula.variable,
            entries: [{ element, body }],
            certificate: 'witness'
          };
        }
        entries.push({ element, body });
      }
      return {
        kind: 'exists',
        formulaLatex,
        value: false,
        variable: formula.variable,
        entries,
        certificate: 'complete'
      };
    }
  }
}

export function certificateOfTrace(trace: Trace): Certificate {
  if (trace.kind === 'forall' || trace.kind === 'exists') {
    return trace.certificate;
  }
  return 'direct';
}

export function traceKindLabel(trace: Trace): string {
  switch (trace.kind) {
    case 'atom':
      return 'Átomo';
    case 'equality':
      return 'Igualdad';
    case 'not':
      return 'Negación';
    case 'and':
      return 'Conjunción';
    case 'or':
      return 'Disyunción';
    case 'implies':
      return 'Implicación';
    case 'forall':
      return 'Cuantificador universal';
    case 'exists':
      return 'Cuantificador existencial';
  }
}

export function traceReason(trace: Trace): string {
  switch (trace.kind) {
    case 'atom':
      return trace.inRelation
        ? 'El tuple evaluado pertenece a la relación.'
        : 'El tuple evaluado no pertenece a la relación.';
    case 'equality':
      return trace.value
        ? 'Ambos términos se evalúan al mismo elemento del dominio.'
        : 'Los términos se evalúan a elementos distintos del dominio.';
    case 'not':
    case 'and':
    case 'or':
    case 'implies':
      return trace.reason;
    case 'forall':
      return trace.value
        ? 'El cuerpo es verdadero para todos los elementos del dominio.'
        : 'Se encontró un elemento del dominio que hace falso el cuerpo.';
    case 'exists':
      return trace.value
        ? 'Se encontró un elemento del dominio que hace verdadero el cuerpo.'
        : 'El cuerpo es falso para todos los elementos del dominio.';
  }
}

export type { BinaryTrace };
