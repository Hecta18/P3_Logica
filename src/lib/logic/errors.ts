export class ParseError extends Error {
  readonly code: string;
  readonly position: number;

  constructor(message: string, position: number, code = 'SINTAXIS') {
    super(message);
    this.name = 'ParseError';
    this.code = code;
    this.position = position;
  }
}

export class EvaluationLimitError extends Error {
  constructor(message = 'La evaluación excedió el límite de seguridad.') {
    super(message);
    this.name = 'EvaluationLimitError';
  }
}

export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationError';
  }
}
