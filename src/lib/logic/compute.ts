import {
  certificateOfTrace,
  evaluateFormula
} from './evaluate';
import { EvaluationError, EvaluationLimitError, ParseError } from './errors';
import { formulaToLatex } from './latex';
import { freeVariablesOf } from './freeVars';
import { parseFormula } from './parser';
import { buildSymbolTable } from './symbols';
import {
  parseDomainInput,
  validateEnvironment,
  validateInterpretation,
  validateLanguage
} from './validation';
import type {
  EvaluationInput,
  EvaluationResult,
  Formula,
  Structure,
  ValidationError
} from './types';

export interface FormulaAnalysis {
  formula?: Formula;
  formulaLatex?: string;
  freeVariables: string[];
  errors: ValidationError[];
}

export function analyzeFormulaSource(
  source: string,
  functions: EvaluationInput['functions'],
  predicates: EvaluationInput['predicates']
): FormulaAnalysis {
  const symbols = buildSymbolTable(functions, predicates);
  try {
    const formula = parseFormula(source, symbols);
    return {
      formula,
      formulaLatex: formulaToLatex(formula),
      freeVariables: freeVariablesOf(formula),
      errors: []
    };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        freeVariables: [],
        errors: [
          {
            section: 'sintaxis',
            code: error.code,
            message: error.message,
            position: error.position
          }
        ]
      };
    }
    throw error;
  }
}

function invalidResult(
  input: EvaluationInput,
  errors: ValidationError[],
  formulaLatex: string | undefined,
  freeVariables: string[],
  structure: Structure | undefined
): EvaluationResult {
  return {
    status: 'invalid',
    errors,
    formulaSource: input.formula,
    formulaLatex,
    freeVariables,
    structure,
    environment: { ...input.environment }
  };
}

export function evaluateInput(input: EvaluationInput): EvaluationResult {
  const errors: ValidationError[] = [];

  const domainResult = parseDomainInput(input.domainInput);
  errors.push(...domainResult.errors);

  const languageErrors = validateLanguage(input.functions, input.predicates);
  errors.push(...languageErrors);

  let structure: Structure | undefined;
  if (domainResult.domain.length > 0 && languageErrors.length === 0) {
    const interpretation = validateInterpretation(
      domainResult.domain,
      input.functions,
      input.predicates,
      input.functionTables,
      input.predicateTables
    );
    structure = interpretation.structure;
    errors.push(...interpretation.errors);
  }

  const analysis = analyzeFormulaSource(input.formula, input.functions, input.predicates);
  errors.push(...analysis.errors);

  if (analysis.formula && domainResult.domain.length > 0) {
    errors.push(
      ...validateEnvironment(analysis.freeVariables, input.environment, domainResult.domain)
    );
  }

  if (
    errors.length > 0 ||
    !analysis.formula ||
    !analysis.formulaLatex ||
    !structure
  ) {
    return invalidResult(
      input,
      errors,
      analysis.formulaLatex,
      analysis.freeVariables,
      structure
    );
  }

  try {
    const trace = evaluateFormula(analysis.formula, structure, input.environment);
    return {
      status: 'valid',
      truth: trace.value,
      errors: [],
      formulaSource: input.formula,
      formulaLatex: analysis.formulaLatex,
      freeVariables: analysis.freeVariables,
      structure,
      environment: { ...input.environment },
      trace,
      certificate: certificateOfTrace(trace)
    };
  } catch (error) {
    if (error instanceof EvaluationLimitError || error instanceof EvaluationError) {
      return invalidResult(
        input,
        [
          {
            section: 'limites',
            code: 'EVALUACION_INTERRUMPIDA',
            message: error.message
          }
        ],
        analysis.formulaLatex,
        analysis.freeVariables,
        structure
      );
    }
    throw error;
  }
}
