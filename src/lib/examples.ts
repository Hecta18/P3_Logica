import { generateTuples, tupleKey } from './logic/tuples';
import type { SymbolDecl } from './logic/types';

export interface Example {
  id: string;
  title: string;
  summary: string;
  expected: string;
  domainInput: string;
  functions: SymbolDecl[];
  predicates: SymbolDecl[];
  functionTables: Record<string, Record<string, string>>;
  predicateTables: Record<string, Record<string, boolean>>;
  formula: string;
  environment: Record<string, string>;
}

function symbol(id: string, name: string, arity: number): SymbolDecl {
  return { id, name, arity };
}

function functionTable(
  domain: string[],
  arity: number,
  mapper: (tuple: string[]) => string
): Record<string, string> {
  const table: Record<string, string> = {};
  for (const tuple of generateTuples(domain, arity)) {
    table[tupleKey(tuple)] = mapper(tuple);
  }
  return table;
}

function predicateTable(
  domain: string[],
  arity: number,
  predicate: (tuple: string[]) => boolean
): Record<string, boolean> {
  const table: Record<string, boolean> = {};
  for (const tuple of generateTuples(domain, arity)) {
    table[tupleKey(tuple)] = predicate(tuple);
  }
  return table;
}

const emptyFunctions: SymbolDecl[] = [];
const emptyFunctionTables: Record<string, Record<string, string>> = {};
const emptyPredicates: SymbolDecl[] = [];
const emptyPredicateTables: Record<string, Record<string, boolean>> = {};

export const EXAMPLES: Example[] = [
  {
    id: 'universal-falso',
    title: 'Universal falso (contraejemplo)',
    summary: 'P se cumple en todo el dominio, Q solo en 0. La implicación falla en 1.',
    expected: 'Falso · Contraejemplo x = 1',
    domainInput: '0, 1',
    functions: emptyFunctions,
    predicates: [symbol('ex1-P', 'P', 1), symbol('ex1-Q', 'Q', 1)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex1-P': predicateTable(['0', '1'], 1, () => true),
      'ex1-Q': predicateTable(['0', '1'], 1, ([value]) => value === '0')
    },
    formula: '\\forall x (P(x) \\to Q(x))',
    environment: {}
  },
  {
    id: 'existencial-testigo',
    title: 'Existencial verdadero (testigo)',
    summary: 'P solo se cumple en el elemento 1 del dominio.',
    expected: 'Verdadero · Testigo x = 1',
    domainInput: '0, 1, 2',
    functions: emptyFunctions,
    predicates: [symbol('ex2-P', 'P', 1)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex2-P': predicateTable(['0', '1', '2'], 1, ([value]) => value === '1')
    },
    formula: '\\exists x P(x)',
    environment: {}
  },
  {
    id: 'universal-verdadero',
    title: 'Universal verdadero (comprobación completa)',
    summary: 'P se cumple en todos los elementos del dominio.',
    expected: 'Verdadero · Comprobación completa de 3 elementos',
    domainInput: '0, 1, 2',
    functions: emptyFunctions,
    predicates: [symbol('ex3-P', 'P', 1)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex3-P': predicateTable(['0', '1', '2'], 1, () => true)
    },
    formula: '\\forall x P(x)',
    environment: {}
  },
  {
    id: 'existencial-falso',
    title: 'Existencial falso (comprobación completa)',
    summary: 'Ningún elemento cumple P y a la vez su negación.',
    expected: 'Falso · Comprobación completa de 2 elementos',
    domainInput: '0, 1',
    functions: emptyFunctions,
    predicates: [symbol('ex4-P', 'P', 1)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex4-P': predicateTable(['0', '1'], 1, ([value]) => value === '0')
    },
    formula: '\\exists x (P(x) \\land \\neg P(x))',
    environment: {}
  },
  {
    id: 'abierta-entorno',
    title: 'Fórmula abierta con entorno',
    summary: 'P(a) es verdadero, pero a = b es falso; la implicación es falsa.',
    expected: 'Falso · Entorno x = a, y = b',
    domainInput: 'a, b',
    functions: emptyFunctions,
    predicates: [symbol('ex5-P', 'P', 1)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex5-P': predicateTable(['a', 'b'], 1, ([value]) => value === 'a')
    },
    formula: 'P(x) \\to x = y',
    environment: { x: 'a', y: 'b' }
  },
  {
    id: 'funcion-igualdad',
    title: 'Función e igualdad (ciclo de longitud 3)',
    summary: 'La función f cicla 0→1→2→0; aplicar f tres veces devuelve el original.',
    expected: 'Verdadero · Comprobación completa de 3 elementos',
    domainInput: '0, 1, 2',
    functions: [symbol('ex6-f', 'f', 1)],
    predicates: emptyPredicates,
    functionTables: {
      'ex6-f': functionTable(['0', '1', '2'], 1, ([value]) =>
        value === '0' ? '1' : value === '1' ? '2' : '0'
      )
    },
    predicateTables: emptyPredicateTables,
    formula: '\\forall x (f(f(f(x))) = x)',
    environment: {}
  },
  {
    id: 'anidado',
    title: 'Cuantificadores anidados',
    summary: 'R es la igualdad en el dominio; todo elemento tiene un y relacionado.',
    expected: 'Verdadero · Universal completo con testigos internos',
    domainInput: '0, 1',
    functions: emptyFunctions,
    predicates: [symbol('ex7-R', 'R', 2)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex7-R': predicateTable(['0', '1'], 2, ([left, right]) => left === right)
    },
    formula: '\\forall x \\exists y R(x, y)',
    environment: {}
  },
  {
    id: 'solo-igualdad',
    title: 'Igualdad sin símbolos declarados',
    summary: 'El lenguaje no declara funciones ni predicados; solo se usa =.',
    expected: 'Verdadero · Evaluación directa',
    domainInput: 'a, b',
    functions: emptyFunctions,
    predicates: emptyPredicates,
    functionTables: emptyFunctionTables,
    predicateTables: emptyPredicateTables,
    formula: 'x = y',
    environment: { x: 'a', y: 'a' }
  },
  {
    id: 'error-aridad',
    title: 'Error de aridad',
    summary: 'P está declarado con aridad 1, pero la fórmula usa dos argumentos.',
    expected: 'Sin valor de verdad · Error de aridad',
    domainInput: '0, 1',
    functions: emptyFunctions,
    predicates: [symbol('ex9-P', 'P', 1)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex9-P': predicateTable(['0', '1'], 1, ([value]) => value === '0')
    },
    formula: 'P(x, y)',
    environment: { x: '0', y: '1' }
  },
  {
    id: 'error-relacion-vacia',
    title: 'Error de relación vacía',
    summary: 'La relación P no contiene ninguna tupla verdadera.',
    expected: 'Sin valor de verdad · Relación vacía',
    domainInput: '0, 1',
    functions: emptyFunctions,
    predicates: [symbol('ex10-P', 'P', 1)],
    functionTables: emptyFunctionTables,
    predicateTables: {
      'ex10-P': predicateTable(['0', '1'], 1, () => false)
    },
    formula: 'P(x)',
    environment: { x: '0' }
  },
  {
    id: 'error-funcion-incompleta',
    title: 'Error de función incompleta',
    summary: 'La tabla de f no define el valor para la tupla (1).',
    expected: 'Sin valor de verdad · Falta un valor de función',
    domainInput: '0, 1',
    functions: [symbol('ex11-f', 'f', 1)],
    predicates: emptyPredicates,
    functionTables: {
      'ex11-f': (() => {
        const table = functionTable(['0', '1'], 1, () => '0');
        delete table[tupleKey(['1'])];
        return table;
      })()
    },
    predicateTables: emptyPredicateTables,
    formula: 'f(x) = y',
    environment: { x: '0', y: '0' }
  }
];

export function cloneExample(example: Example): Example {
  return {
    ...example,
    functions: example.functions.map((item) => ({ ...item })),
    predicates: example.predicates.map((item) => ({ ...item })),
    functionTables: Object.fromEntries(
      Object.entries(example.functionTables).map(([key, table]) => [key, { ...table }])
    ),
    predicateTables: Object.fromEntries(
      Object.entries(example.predicateTables).map(([key, table]) => [key, { ...table }])
    ),
    environment: { ...example.environment }
  };
}
