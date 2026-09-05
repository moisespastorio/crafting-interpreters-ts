// Port of Interpreter.java.
import type { ExprVisitor } from "./expr.js";
import * as E from "./expr.js";
import type { StmtVisitor } from "./stmt.js";
import * as S from "./stmt.js";
import { Token } from "./token.js";
import { Environment } from "./environment.js";
import { RuntimeError } from "./runtimeError.js";
import { ReturnException } from "./returnException.js";
import { isLoxCallable, type LoxCallable } from "./loxCallable.js";
import { LoxFunction } from "./loxFunction.js";
import { LoxClass } from "./loxClass.js";
import { LoxInstance } from "./loxInstance.js";
import { Lox } from "./lox.js";

export class Interpreter implements ExprVisitor<unknown>, StmtVisitor<void> {
  readonly globals = new Environment();
  private environment = this.globals;
  // Java keys this map by Expr object identity (a HashMap<Expr, Integer>),
  // relying on default reference-equality hashCode/equals. A JS Map keyed
  // by object reference does exactly the same thing, so no change needed.
  private readonly locals = new Map<E.Expr, number>();

  constructor() {
    this.globals.define("clock", {
      arity(): number {
        return 0;
      },
      call(): unknown {
        return Date.now() / 1000.0;
      },
      toString(): string {
        return "<native fn>";
      },
    } satisfies LoxCallable);
  }

  interpret(statements: S.Stmt[]): void {
    try {
      for (const statement of statements) {
        this.execute(statement);
      }
    } catch (error) {
      if (error instanceof RuntimeError) {
        Lox.runtimeError(error);
      } else {
        throw error;
      }
    }
  }

  private evaluate(expr: E.Expr): unknown {
    return expr.accept(this);
  }

  private execute(stmt: S.Stmt): void {
    stmt.accept(this);
  }

  resolve(expr: E.Expr, depth: number): void {
    this.locals.set(expr, depth);
  }

  executeBlock(statements: S.Stmt[], environment: Environment): void {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  visitBlockStmt(stmt: S.Block): void {
    this.executeBlock(stmt.statements, new Environment(this.environment));
  }

  visitClassStmt(stmt: S.Class): void {
    let superclass: unknown = null;
    if (stmt.superclass !== null) {
      superclass = this.evaluate(stmt.superclass);
      if (!(superclass instanceof LoxClass)) {
        throw new RuntimeError(stmt.superclass.name, "Superclass must be a class.");
      }
    }

    this.environment.define(stmt.name.lexeme, null);

    if (stmt.superclass !== null) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superclass);
    }

    const methods = new Map<string, LoxFunction>();
    for (const method of stmt.methods) {
      const func = new LoxFunction(method, this.environment, method.name.lexeme === "init");
      methods.set(method.name.lexeme, func);
    }

    const klass = new LoxClass(stmt.name.lexeme, superclass as LoxClass | null, methods);

    if (superclass !== null) {
      this.environment = this.environment.enclosing!;
    }

    this.environment.assign(stmt.name, klass);
  }

  visitExpressionStmt(stmt: S.ExpressionStmt): void {
    this.evaluate(stmt.expression);
  }

  visitFunctionStmt(stmt: S.FunctionStmt): void {
    const func = new LoxFunction(stmt, this.environment, false);
    this.environment.define(stmt.name.lexeme, func);
  }

  visitIfStmt(stmt: S.If): void {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: S.Print): void {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitReturnStmt(stmt: S.ReturnStmt): void {
    let value: unknown = null;
    if (stmt.value !== null) value = this.evaluate(stmt.value);

    throw new ReturnException(value);
  }

  visitVarStmt(stmt: S.Var): void {
    let value: unknown = null;
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
  }

  visitWhileStmt(stmt: S.While): void {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  visitAssignExpr(expr: E.Assign): unknown {
    const value = this.evaluate(expr.value);

    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }

    return value;
  }

  visitBinaryExpr(expr: E.Binary): unknown {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case "BANG_EQUAL": return !this.isEqual(left, right);
      case "EQUAL_EQUAL": return this.isEqual(left, right);
      case "GREATER":
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) > (right as number);
      case "GREATER_EQUAL":
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) >= (right as number);
      case "LESS":
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) < (right as number);
      case "LESS_EQUAL":
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) <= (right as number);
      case "MINUS":
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) - (right as number);
      case "PLUS":
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }

        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }

        throw new RuntimeError(expr.operator, "Operands must be two numbers or two strings.");
      case "SLASH":
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) / (right as number);
      case "STAR":
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) * (right as number);
    }

    // Unreachable.
    return null;
  }

  visitCallExpr(expr: E.Call): unknown {
    const callee = this.evaluate(expr.callee);

    const args: unknown[] = [];
    for (const argument of expr.args) {
      args.push(this.evaluate(argument));
    }

    if (!isLoxCallable(callee)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes.");
    }

    const func = callee;
    if (args.length !== func.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${func.arity()} arguments but got ${args.length}.`,
      );
    }

    return func.call(this, args);
  }

  visitGetExpr(expr: E.Get): unknown {
    const object = this.evaluate(expr.object);
    if (object instanceof LoxInstance) {
      return object.get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  visitGroupingExpr(expr: E.Grouping): unknown {
    return this.evaluate(expr.expression);
  }

  visitLiteralExpr(expr: E.Literal): unknown {
    return expr.value;
  }

  visitLogicalExpr(expr: E.Logical): unknown {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === "OR") {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitSetExpr(expr: E.Set): unknown {
    const object = this.evaluate(expr.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    const value = this.evaluate(expr.value);
    object.set(expr.name, value);
    return value;
  }

  visitSuperExpr(expr: E.Super): unknown {
    const distance = this.locals.get(expr)!;
    const superclass = this.environment.getAt(distance, "super") as LoxClass;

    const object = this.environment.getAt(distance - 1, "this") as LoxInstance;

    const method = superclass.findMethod(expr.method.lexeme);

    if (method === null) {
      throw new RuntimeError(expr.method, `Undefined property '${expr.method.lexeme}'.`);
    }

    return method.bind(object);
  }

  visitThisExpr(expr: E.This): unknown {
    return this.lookUpVariable(expr.keyword, expr);
  }

  visitUnaryExpr(expr: E.Unary): unknown {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case "BANG":
        return !this.isTruthy(right);
      case "MINUS":
        this.checkNumberOperand(expr.operator, right);
        return -(right as number);
    }

    // Unreachable.
    return null;
  }

  visitVariableExpr(expr: E.Variable): unknown {
    return this.lookUpVariable(expr.name, expr);
  }

  private lookUpVariable(name: Token, expr: E.Expr): unknown {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  private checkNumberOperand(operator: Token, operand: unknown): asserts operand is number {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(
    operator: Token,
    left: unknown,
    right: unknown,
  ): asserts left is number {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  private isTruthy(object: unknown): boolean {
    if (object === null || object === undefined) return false;
    if (typeof object === "boolean") return object;
    return true;
  }

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === null && b === null) return true;
    if (a === null) return false;

    return a === b;
  }

  private stringify(object: unknown): string {
    if (object === null || object === undefined) return "nil";

    if (typeof object === "number") {
      return String(object);
    }

    return String(object);
  }
}
