// Port of Return.java.
//
// In Java, Return extends RuntimeException but calls the special
// `super(null, null, false, false)` constructor specifically to skip
// filling in a stack trace, because it's used as a plain control-flow
// signal (unwinding the stack to a `call()`), not a real error.
//
// In TypeScript/JavaScript we get that same "no stack trace" behavior
// for free by NOT extending Error at all -- any value can be thrown.
// A plain class is the direct equivalent of that Java trick.
export class ReturnException {
  readonly value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}
