// Port of LoxCallable.java.
import type { Interpreter } from "./interpreter.js";

export interface LoxCallable {
  arity(): number;
  call(interpreter: Interpreter, args: unknown[]): unknown;
  // Java gets a free `toString()` from Object; we require it explicitly
  // here since callers rely on it (e.g. stringify(), REPL output).
  toString(): string;
}

export function isLoxCallable(value: unknown): value is LoxCallable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LoxCallable).call === "function" &&
    typeof (value as LoxCallable).arity === "function"
  );
}
