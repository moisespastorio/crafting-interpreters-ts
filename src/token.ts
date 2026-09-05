// Port of Token.java.
import type { TokenType } from "./tokenType.js";

export class Token {
  readonly type: TokenType;
  readonly lexeme: string;
  // Java's `Object literal` becomes `unknown`: it's a number, a string, or null.
  readonly literal: unknown;
  readonly line: number;

  constructor(type: TokenType, lexeme: string, literal: unknown, line: number) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  toString(): string {
    return `${this.type} ${this.lexeme} ${this.literal}`;
  }
}
