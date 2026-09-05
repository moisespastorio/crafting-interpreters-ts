// Port of RuntimeError.java.
import type { Token } from "./token.js";

export class RuntimeError extends Error {
  readonly token: Token;

  constructor(token: Token, message: string) {
    super(message);
    this.token = token;
    this.name = "RuntimeError";
  }
}
