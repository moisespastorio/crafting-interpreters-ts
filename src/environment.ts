// Port of Environment.java.
import type { Token } from "./token.js";
import { RuntimeError } from "./runtimeError.js";

export class Environment {
  readonly enclosing: Environment | null;
  private readonly values = new Map<string, unknown>();

  constructor(enclosing: Environment | null = null) {
    this.enclosing = enclosing;
  }

  get(name: Token): unknown {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme);
    }

    if (this.enclosing !== null) return this.enclosing.get(name);

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }

  assign(name: Token, value: unknown): void {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing !== null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }

  define(name: string, value: unknown): void {
    this.values.set(name, value);
  }

  ancestor(distance: number): Environment {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let environment: Environment = this;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing!;
    }

    return environment;
  }

  getAt(distance: number, name: string): unknown {
    return this.ancestor(distance).values.get(name);
  }

  assignAt(distance: number, name: Token, value: unknown): void {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  toString(): string {
    const entries = Array.from(this.values.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    let result = `{${entries}}`;
    if (this.enclosing !== null) {
      result += " -> " + this.enclosing.toString();
    }

    return result;
  }
}
