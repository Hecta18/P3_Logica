export type SymbolKind = 'function' | 'predicate';

export interface SymbolDecl {
  id: string;
  name: string;
  arity: number;
}

export interface SymbolInfo {
  kind: SymbolKind;
  arity: number;
}

export type SymbolTable = Map<string, SymbolInfo>;

export interface FunctionInterpretation {
  arity: number;
  values: Record<string, string>;
}

export interface PredicateInterpretation {
  arity: number;
  trueTuples: Record<string, true>;
}

export interface Structure {
  domain: string[];
  functions: Record<string, FunctionInterpretation>;
  predicates: Record<string, PredicateInterpretation>;
}

export type Term =
  | { kind: 'variable'; name: string }
  | { kind: 'application'; name: string; args: Term[] };

export type Formula =
  | { kind: 'atom'; name: string; args: Term[] }
  | { kind: 'equality'; left: Term; right: Term }
  | { kind: 'not'; arg: Formula }
  | { kind: 'and' | 'or' | 'implies'; left: Formula; right: Formula }
  | { kind: 'forall' | 'exists'; variable: string; body: Formula };

export interface TermEvaluation {
  kind: 'variable' | 'application';
  name: string;
  latex: string;
  value: string;
  children: TermEvaluation[];
}

interface TraceBase {
  formulaLatex: string;
  value: boolean;
}

export interface AtomTrace extends TraceBase {
  kind: 'atom';
  name: string;
  terms: TermEvaluation[];
  tuple: string[];
  inRelation: boolean;
  detailLatex: string;
}

export interface EqualityTrace extends TraceBase {
  kind: 'equality';
  left: TermEvaluation;
  right: TermEvaluation;
  detailLatex: string;
}

export interface NotTrace extends TraceBase {
  kind: 'not';
  child: Trace;
  reason: string;
}

export interface BinaryTrace extends TraceBase {
  kind: 'and' | 'or' | 'implies';
  left: Trace;
  right?: Trace;
  rightEvaluated: boolean;
  decisive: 'left' | 'right' | 'both';
  reason: string;
}

export interface QuantifierEntry {
  element: string;
  body: Trace;
}

export interface QuantifierTrace extends TraceBase {
  kind: 'forall' | 'exists';
  variable: string;
  entries: QuantifierEntry[];
  certificate: 'witness' | 'counterexample' | 'complete';
}

export type Trace =
  | AtomTrace
  | EqualityTrace
  | NotTrace
  | BinaryTrace
  | QuantifierTrace;

export type Certificate = 'witness' | 'counterexample' | 'complete' | 'direct';

export type ErrorSection =
  | 'dominio'
  | 'lenguaje'
  | 'sintaxis'
  | 'tuplas'
  | 'entorno'
  | 'limites';

export interface ValidationError {
  section: ErrorSection;
  code: string;
  message: string;
  symbol?: string;
  position?: number;
}

export interface EvaluationInput {
  domainInput: string;
  functions: SymbolDecl[];
  predicates: SymbolDecl[];
  functionTables: Record<string, Record<string, string>>;
  predicateTables: Record<string, Record<string, boolean>>;
  formula: string;
  environment: Record<string, string>;
}

export interface EvaluationResult {
  status: 'valid' | 'invalid';
  truth?: boolean;
  errors: ValidationError[];
  formulaSource: string;
  formulaLatex?: string;
  freeVariables: string[];
  structure?: Structure;
  environment: Record<string, string>;
  trace?: Trace;
  certificate?: Certificate;
}

export interface HistoryEntry extends EvaluationResult {
  id: number;
  createdAt: string;
}

export interface TraceRow {
  depth: number;
  kind: 'trace' | 'binding' | 'certificate';
  formulaLatex?: string;
  value?: boolean;
  reason?: string;
  detailLatex?: string;
  label?: string;
  bindingVariable?: string;
  bindingElement?: string;
  certificate?: Certificate;
}

export const LIMITS = {
  maxDomainElements: 100,
  maxArity: 6,
  maxTuplesPerSymbol: 20_000,
  maxEvaluationSteps: 2_000_000
} as const;
