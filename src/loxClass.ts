// Port of LoxClass.java.
import type { Interpreter } from "./interpreter.js";
import type { LoxCallable } from "./loxCallable.js";
import type { LoxFunction } from "./loxFunction.js";
import { LoxInstance } from "./loxInstance.js";

export class LoxClass implements LoxCallable {
  readonly name: string;
  readonly superclass: LoxClass | null;
  private readonly methods: Map<string, LoxFunction>;

  constructor(name: string, superclass: LoxClass | null, methods: Map<string, LoxFunction>) {
    this.superclass = superclass;
    this.name = name;
    this.methods = methods;
  }

  findMethod(name: string): LoxFunction | null {
    if (this.methods.has(name)) {
      return this.methods.get(name)!;
    }

    if (this.superclass !== null) {
      return this.superclass.findMethod(name);
    }

    return null;
  }

  toString(): string {
    return this.name;
  }

  call(interpreter: Interpreter, args: unknown[]): unknown {
    const instance = new LoxInstance(this);
    const initializer = this.findMethod("init");
    if (initializer !== null) {
      initializer.bind(instance).call(interpreter, args);
    }

    return instance;
  }

  arity(): number {
    const initializer = this.findMethod("init");
    if (initializer === null) return 0;
    return initializer.arity();
  }
}
