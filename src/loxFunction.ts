// Port of LoxFunction.java.
import type { FunctionStmt } from "./stmt.js";
import { Environment } from "./environment.js";
import type { Interpreter } from "./interpreter.js";
import type { LoxCallable } from "./loxCallable.js";
import type { LoxInstance } from "./loxInstance.js";
import { ReturnException } from "./returnException.js";

export class LoxFunction implements LoxCallable {
  private readonly declaration: FunctionStmt;
  private readonly closure: Environment;
  private readonly isInitializer: boolean;

  constructor(declaration: FunctionStmt, closure: Environment, isInitializer: boolean) {
    this.isInitializer = isInitializer;
    this.closure = closure;
    this.declaration = declaration;
  }

  bind(instance: LoxInstance): LoxFunction {
    const environment = new Environment(this.closure);
    environment.define("this", instance);
    return new LoxFunction(this.declaration, environment, this.isInitializer);
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme}>`;
  }

  arity(): number {
    return this.declaration.params.length;
  }

  call(interpreter: Interpreter, args: unknown[]): unknown {
    const environment = new Environment(this.closure);
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i]!.lexeme, args[i]);
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue) {
      if (returnValue instanceof ReturnException) {
        if (this.isInitializer) return this.closure.getAt(0, "this");
        return returnValue.value;
      }
      throw returnValue;
    }

    if (this.isInitializer) return this.closure.getAt(0, "this");
    return null;
  }
}
