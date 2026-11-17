import { ParseError } from './errors';

export type TokenType =
  | 'IDENT'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EQ'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'IMPLIES'
  | 'FORALL'
  | 'EXISTS'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

const MACROS: Record<string, TokenType> = {
  neg: 'NOT',
  lnot: 'NOT',
  land: 'AND',
  wedge: 'AND',
  lor: 'OR',
  vee: 'OR',
  to: 'IMPLIES',
  rightarrow: 'IMPLIES',
  Rightarrow: 'IMPLIES',
  forall: 'FORALL',
  exists: 'EXISTS'
};

const SINGLE_CHARACTER_TOKENS: Record<string, TokenType> = {
  '(': 'LPAREN',
  ')': 'RPAREN',
  ',': 'COMMA',
  '=': 'EQ',
  '¬': 'NOT',
  '∧': 'AND',
  '∨': 'OR',
  '→': 'IMPLIES',
  '⇒': 'IMPLIES',
  '∀': 'FORALL',
  '∃': 'EXISTS'
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === '\\') {
      const start = index;
      index += 1;
      const nameStart = index;
      while (index < source.length && /[A-Za-z]/.test(source[index])) {
        index += 1;
      }
      const name = source.slice(nameStart, index);
      if (!name) {
        throw new ParseError('Se esperaba el nombre de un comando LaTeX después de “\\”.', start);
      }
      const type = MACROS[name];
      if (!type) {
        throw new ParseError(`Comando LaTeX no reconocido: \\${name}.`, start, 'SIMBOLO_DESCONOCIDO');
      }
      tokens.push({ type, value: `\\${name}`, start, end: index });
      continue;
    }

    const singleType = SINGLE_CHARACTER_TOKENS[character];
    if (singleType) {
      tokens.push({ type: singleType, value: character, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (/[A-Za-z]/.test(character)) {
      const start = index;
      index += 1;
      while (index < source.length && /[A-Za-z0-9]/.test(source[index])) {
        index += 1;
      }
      tokens.push({ type: 'IDENT', value: source.slice(start, index), start, end: index });
      continue;
    }

    throw new ParseError(
      `Carácter no permitido en la fórmula: “${character}”. Los nombres deben comenzar con letra y contener solo letras o dígitos.`,
      index
    );
  }

  tokens.push({ type: 'EOF', value: '', start: source.length, end: source.length });
  return tokens;
}

export function positionToLineColumn(source: string, position: number): { line: number; column: number } {
  const before = source.slice(0, Math.max(0, position));
  const lines = before.split('\n');
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
}
