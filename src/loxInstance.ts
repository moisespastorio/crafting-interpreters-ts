// Port of LoxInstance.java.
import type { Token } from "./token.js";
import type { LoxClass } from "./loxClass.js";
import { RuntimeError } from "./runtimeError.js";

export class LoxInstance {
  private readonly klass: LoxClass;
  private readonly fields = new Map<string, unknown>();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token): unknown {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.klass.findMethod(name.lexeme);
    if (method !== null) return method.bind(this);

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: Token, value: unknown): void {
    this.fields.set(name.lexeme, value);
  }

  toString(): string {
    return `${this.klass.name} instance`;
  }
}
