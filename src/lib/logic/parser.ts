import { ParseError } from './errors';
import { tokenize } from './lexer';
import type { Token, TokenType } from './lexer';
import type { Formula, SymbolTable, Term } from './types';

class Parser {
  private readonly tokens: Token[];
  private position = 0;

  constructor(
    source: string,
    private readonly symbols: SymbolTable
  ) {
    this.tokens = tokenize(source);
  }

  parse(): Formula {
    const formula = this.parseImplication();
    const token = this.peek();
    if (token.type !== 'EOF') {
      throw new ParseError(`Token inesperado: “${token.value}”. Revisa paréntesis y conectivos.`, token.start);
    }
    return formula;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.position + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const token = this.peek();
    if (token.type !== 'EOF') {
      this.position += 1;
    }
    return token;
  }

  private match(type: TokenType): Token | null {
    if (this.peek().type === type) {
      return this.advance();
    }
    return null;
  }

  private expect(type: TokenType, message: string): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new ParseError(message, token.start);
    }
    return this.advance();
  }

  private parseImplication(): Formula {
    const left = this.parseDisjunction();
    if (this.match('IMPLIES')) {
      return { kind: 'implies', left, right: this.parseImplication() };
    }
    return left;
  }

  private parseDisjunction(): Formula {
    let formula = this.parseConjunction();
    while (this.match('OR')) {
      formula = { kind: 'or', left: formula, right: this.parseConjunction() };
    }
    return formula;
  }

  private parseConjunction(): Formula {
    let formula = this.parseUnary();
    while (this.match('AND')) {
      formula = { kind: 'and', left: formula, right: this.parseUnary() };
    }
    return formula;
  }

  private parseUnary(): Formula {
    if (this.match('NOT')) {
      return { kind: 'not', arg: this.parseUnary() };
    }

    const quantifier = this.peek();
    if (quantifier.type === 'FORALL' || quantifier.type === 'EXISTS') {
      return this.parseQuantifier();
    }

    return this.parsePrimary();
  }

  private parseQuantifier(): Formula {
    const quantifier = this.advance();
    const variableToken = this.expect(
      'IDENT',
      'Se esperaba un nombre de variable después del cuantificador.'
    );

    const declared = this.symbols.get(variableToken.value);
    if (declared) {
      const kind = declared.kind === 'function' ? 'símbolo funcional' : 'predicado';
      throw new ParseError(
        `“${variableToken.value}” está declarado como ${kind} y no puede usarse como variable ligada.`,
        variableToken.start,
        'VARIABLE_INVALIDA'
      );
    }

    if (this.peek().type === 'EOF') {
      throw new ParseError(
        `Falta el cuerpo del cuantificador que liga a “${variableToken.value}”.`,
        this.peek().start
      );
    }

    return {
      kind: quantifier.type === 'FORALL' ? 'forall' : 'exists',
      variable: variableToken.value,
      body: this.parseUnary()
    };
  }

  private parsePrimary(): Formula {
    if (this.match('LPAREN')) {
      const formula = this.parseImplication();
      this.expect('RPAREN', 'Falta el paréntesis de cierre “)”');
      return formula;
    }
    return this.parseAtom();
  }

  private parseAtom(): Formula {
    const nameToken = this.peek();
    if (nameToken.type !== 'IDENT') {
      throw new ParseError('Se esperaba un predicado, una igualdad o un paréntesis.', nameToken.start);
    }

    const info = this.symbols.get(nameToken.value);
    const next = this.peek(1);

    if (next.type === 'LPAREN') {
      if (info?.kind === 'predicate') {
        return this.parsePredicateApplication(nameToken, info.arity);
      }
      if (info?.kind === 'function') {
        const left = this.parseTerm();
        this.expect('EQ', 'Se esperaba “=” después del término.');
        const right = this.parseTerm();
        return { kind: 'equality', left, right };
      }
      throw new ParseError(
        `El símbolo “${nameToken.value}” no está declarado como función ni como predicado.`,
        nameToken.start,
        'SIMBOLO_DESCONOCIDO'
      );
    }

    const left = this.parseTerm();
    this.expect(
      'EQ',
      `Se esperaba “=” después de “${nameToken.value}”. Un término por sí solo no es una fórmula.`
    );
    const right = this.parseTerm();
    return { kind: 'equality', left, right };
  }

  private parsePredicateApplication(nameToken: Token, arity: number): Formula {
    this.advance();
    const args = this.parseArgumentList('predicado');
    if (args.length !== arity) {
      throw new ParseError(
        `El predicado “${nameToken.value}” espera ${arity} argumento(s), pero recibió ${args.length}.`,
        nameToken.start,
        'ARIDAD'
      );
    }
    return { kind: 'atom', name: nameToken.value, args };
  }

  private parseTerm(): Term {
    const nameToken = this.expect('IDENT', 'Se esperaba un término (variable o función).');
    const info = this.symbols.get(nameToken.value);

    if (this.peek().type === 'LPAREN') {
      if (!info) {
        throw new ParseError(
          `El símbolo funcional “${nameToken.value}” no está declarado.`,
          nameToken.start,
          'SIMBOLO_DESCONOCIDO'
        );
      }
      if (info.kind !== 'function') {
        throw new ParseError(
          `El predicado “${nameToken.value}” no puede usarse como término.`,
          nameToken.start,
          'SIMBOLO_INVALIDO'
        );
      }
      const args = this.parseArgumentList('función');
      if (args.length !== info.arity) {
        throw new ParseError(
          `La función “${nameToken.value}” espera ${info.arity} argumento(s), pero recibió ${args.length}.`,
          nameToken.start,
          'ARIDAD'
        );
      }
      return { kind: 'application', name: nameToken.value, args };
    }

    if (info?.kind === 'function') {
      throw new ParseError(
        `La función “${nameToken.value}” requiere ${info.arity} argumento(s) y debe escribirse como ${nameToken.value}(...).`,
        nameToken.start,
        'ARIDAD'
      );
    }

    if (info?.kind === 'predicate') {
      throw new ParseError(
        `El predicado “${nameToken.value}” no puede usarse como término.`,
        nameToken.start,
        'SIMBOLO_INVALIDO'
      );
    }

    return { kind: 'variable', name: nameToken.value };
  }

  private parseArgumentList(kind: 'función' | 'predicado'): Term[] {
    this.expect('LPAREN', `Se esperaba “(” para los argumentos de la ${kind}.`);
    if (this.match('RPAREN')) {
      return [];
    }

    const args: Term[] = [this.parseTerm()];
    while (this.match('COMMA')) {
      args.push(this.parseTerm());
    }
    this.expect('RPAREN', `Falta el paréntesis de cierre en la ${kind}.`);
    return args;
  }
}

export function parseFormula(source: string, symbols: SymbolTable): Formula {
  if (!source.trim()) {
    throw new ParseError('La fórmula está vacía.', 0, 'FORMULA_VACIA');
  }
  return new Parser(source, symbols).parse();
}
