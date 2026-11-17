import {
  generateTuples,
  tupleCount,
  tupleFromKey,
  tupleKey,
  tupleLabel
} from './tuples';
import type {
  FunctionInterpretation,
  PredicateInterpretation,
  Structure,
  SymbolDecl,
  ValidationError
} from './types';
import { LIMITS } from './types';

const SYMBOL_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;

export function isValidSymbolName(name: string): boolean {
  return SYMBOL_NAME_PATTERN.test(name);
}

export interface DomainParseResult {
  domain: string[];
  errors: ValidationError[];
}

export function parseDomainInput(input: string): DomainParseResult {
  const errors: ValidationError[] = [];
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      domain: [],
      errors: [
        {
          section: 'dominio',
          code: 'DOMINIO_VACIO',
          message: 'El dominio no puede estar vacío.'
        }
      ]
    };
  }

  const rawParts = trimmed.split(',');
  const parts = rawParts.map((part) => part.trim());
  const domain: string[] = [];
  const positions = new Map<string, number>();

  if (parts.some((part) => part.length === 0)) {
    errors.push({
      section: 'dominio',
      code: 'ELEMENTO_VACIO',
      message: 'Hay un elemento vacío en el dominio. Revisa las comas consecutivas o finales.'
    });
  }

  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (positions.has(part)) {
      errors.push({
        section: 'dominio',
        code: 'ELEMENTO_DUPLICADO',
        message: `El elemento “${part}” está repetido en el dominio.`
      });
      continue;
    }
    positions.set(part, positions.size);
    domain.push(part);
  }

  if (domain.length > LIMITS.maxDomainElements) {
    errors.push({
      section: 'dominio',
      code: 'DOMINIO_GRANDE',
      message: `El dominio supera el límite práctico de ${LIMITS.maxDomainElements} elementos.`
    });
  }

  return { domain: domain.slice(0, LIMITS.maxDomainElements), errors };
}

export function validateLanguage(
  functions: readonly SymbolDecl[],
  predicates: readonly SymbolDecl[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const names = new Map<string, { kind: 'función' | 'predicado'; count: number }>();

  const validateList = (symbols: readonly SymbolDecl[], kind: 'función' | 'predicado'): void => {
    for (const symbol of symbols) {
      const name = symbol.name.trim();
      if (!name) {
        errors.push({
          section: 'lenguaje',
          code: 'NOMBRE_VACIO',
          message: `El nombre de un símbolo ${kind} no puede estar vacío.`
        });
      } else if (!isValidSymbolName(name)) {
        errors.push({
          section: 'lenguaje',
          code: 'NOMBRE_INVALIDO',
          message: `“${name}” no es un nombre válido. Debe comenzar con una letra y contener solo letras o dígitos.`,
          symbol: name
        });
      } else if (name.length > 40) {
        errors.push({
          section: 'lenguaje',
          code: 'NOMBRE_LARGO',
          message: `El nombre “${name}” es demasiado largo (máximo 40 caracteres).`,
          symbol: name
        });
      }

      if (!Number.isInteger(symbol.arity) || symbol.arity < 1 || symbol.arity > LIMITS.maxArity) {
        errors.push({
          section: 'lenguaje',
          code: 'ARIDAD_INVALIDA',
          message: `La aridad de “${name || '(sin nombre)'}” debe ser un entero entre 1 y ${LIMITS.maxArity}.`,
          symbol: name || undefined
        });
      }

      if (name) {
        const existing = names.get(name);
        if (existing) {
          existing.count += 1;
        } else {
          names.set(name, { kind, count: 1 });
        }
      }
    }
  };

  validateList(functions, 'función');
  validateList(predicates, 'predicado');

  for (const [name, info] of names) {
    if (info.count > 1) {
      errors.push({
        section: 'lenguaje',
        code: 'NOMBRE_DUPLICADO',
        message: `El nombre “${name}” está declarado más de una vez. Los nombres deben ser únicos entre funciones y predicados.`,
        symbol: name
      });
    }
  }

  return errors;
}

function summarize(items: readonly string[], maximum = 5): string {
  if (items.length <= maximum) {
    return items.join(', ');
  }
  return `${items.slice(0, maximum).join(', ')} y ${items.length - maximum} más`;
}

export interface InterpretationValidationResult {
  structure: Structure;
  errors: ValidationError[];
}

export function validateInterpretation(
  domain: readonly string[],
  functions: readonly SymbolDecl[],
  predicates: readonly SymbolDecl[],
  functionTables: Record<string, Record<string, string>>,
  predicateTables: Record<string, Record<string, boolean>>
): InterpretationValidationResult {
  const errors: ValidationError[] = [];
  const structure: Structure = { domain: [...domain], functions: {}, predicates: {} };
  const domainSet = new Set(domain);

  if (domain.length === 0) {
    return { structure, errors };
  }

  for (const symbol of functions) {
    if (!Number.isInteger(symbol.arity) || symbol.arity < 1) {
      continue;
    }
    if (tupleCount(domain.length, symbol.arity) > LIMITS.maxTuplesPerSymbol) {
      errors.push({
        section: 'limites',
        code: 'LIMITE_TUPLAS',
        message: `La interpretación de “${symbol.name}” requiere demasiadas tuplas (${tupleCount(domain.length, symbol.arity)}). El máximo práctico es ${LIMITS.maxTuplesPerSymbol}.`,
        symbol: symbol.name
      });
      continue;
    }

    const expectedTuples = generateTuples(domain, symbol.arity);
    const expectedKeys = new Set(expectedTuples.map(tupleKey));
    const table = functionTables[symbol.id] ?? {};
    const values: Record<string, string> = {};
    const missing: string[] = [];
    let extraReported = false;

    for (const key of Object.keys(table)) {
      if (!expectedKeys.has(key)) {
        if (!extraReported) {
          errors.push({
            section: 'tuplas',
            code: 'TUPLE_INVALIDA',
            message: `La tabla de “${symbol.name}” contiene una tupla que no pertenece al dominio.`,
            symbol: symbol.name
          });
          extraReported = true;
        }
      }
    }

    for (const tuple of expectedTuples) {
      const key = tupleKey(tuple);
      const value = table[key];
      if (!value) {
        missing.push(tupleLabel(tuple));
        continue;
      }
      if (!domainSet.has(value)) {
        errors.push({
          section: 'tuplas',
          code: 'VALOR_INVALIDO',
          message: `El valor “${value}” de “${symbol.name}${tupleLabel(tuple)}” no pertenece al dominio.`,
          symbol: symbol.name
        });
        continue;
      }
      values[key] = value;
    }

    if (missing.length > 0) {
      errors.push({
        section: 'tuplas',
        code: 'FALTA_VALOR_FUNCION',
        message: `Faltan valores en la función “${symbol.name}” para: ${summarize(missing)}.`,
        symbol: symbol.name
      });
    }

    structure.functions[symbol.name] = {
      arity: symbol.arity,
      values
    } satisfies FunctionInterpretation;
  }

  for (const symbol of predicates) {
    if (!Number.isInteger(symbol.arity) || symbol.arity < 1) {
      continue;
    }
    if (tupleCount(domain.length, symbol.arity) > LIMITS.maxTuplesPerSymbol) {
      errors.push({
        section: 'limites',
        code: 'LIMITE_TUPLAS',
        message: `La interpretación de “${symbol.name}” requiere demasiadas tuplas (${tupleCount(domain.length, symbol.arity)}). El máximo práctico es ${LIMITS.maxTuplesPerSymbol}.`,
        symbol: symbol.name
      });
      continue;
    }

    const expectedTuples = generateTuples(domain, symbol.arity);
    const expectedKeys = new Set(expectedTuples.map(tupleKey));
    const table = predicateTables[symbol.id] ?? {};
    const trueTuples: Record<string, true> = {};
    const missing: string[] = [];
    let trueCount = 0;
    let extraReported = false;

    for (const key of Object.keys(table)) {
      if (!expectedKeys.has(key)) {
        if (!extraReported) {
          errors.push({
            section: 'tuplas',
            code: 'TUPLE_INVALIDA',
            message: `La tabla de “${symbol.name}” contiene una tupla que no pertenece al dominio.`,
            symbol: symbol.name
          });
          extraReported = true;
        }
      }
    }

    for (const tuple of expectedTuples) {
      const key = tupleKey(tuple);
      if (!(key in table)) {
        missing.push(tupleLabel(tuple));
        continue;
      }
      if (table[key]) {
        trueTuples[key] = true;
        trueCount += 1;
      }
    }

    if (missing.length > 0) {
      errors.push({
        section: 'tuplas',
        code: 'FALTA_TUPLA_PREDICADO',
        message: `Faltan tuplas en la relación “${symbol.name}”: ${summarize(missing)}.`,
        symbol: symbol.name
      });
    }

    if (trueCount === 0) {
      errors.push({
        section: 'tuplas',
        code: 'RELACION_VACIA',
        message: `La relación “${symbol.name}” no puede ser vacía: marca al menos una tupla verdadera.`,
        symbol: symbol.name
      });
    }

    structure.predicates[symbol.name] = {
      arity: symbol.arity,
      trueTuples
    } satisfies PredicateInterpretation;
  }

  return { structure, errors };
}

export function validateEnvironment(
  freeVariables: readonly string[],
  environment: Record<string, string>,
  domain: readonly string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const domainSet = new Set(domain);

  for (const variable of freeVariables) {
    const value = environment[variable];
    if (!value) {
      errors.push({
        section: 'entorno',
        code: 'ASIGNACION_FALTANTE',
        message: `Falta asignar un valor a la variable libre “${variable}”.`,
        symbol: variable
      });
      continue;
    }
    if (!domainSet.has(value)) {
      errors.push({
        section: 'entorno',
        code: 'ASIGNACION_INVALIDA',
        message: `El valor “${value}” asignado a “${variable}” no pertenece al dominio.`,
        symbol: variable
      });
    }
  }

  return errors;
}

export function interpretationTuples(
  interpretation: PredicateInterpretation
): string[][] {
  return Object.keys(interpretation.trueTuples)
    .map((key) => tupleFromKey(key))
    .filter((tuple): tuple is string[] => tuple !== null);
}
