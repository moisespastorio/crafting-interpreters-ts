// Port of Resolver.java.
import type { ExprVisitor } from "./expr.js";
import * as E from "./expr.js";
import type { StmtVisitor } from "./stmt.js";
import * as S from "./stmt.js";
import type { Token } from "./token.js";
import type { Interpreter } from "./interpreter.js";
import { Lox } from "./lox.js";

type FunctionType = "NONE" | "FUNCTION" | "INITIALIZER" | "METHOD";
type ClassType = "NONE" | "CLASS" | "SUBCLASS";

export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly interpreter: Interpreter;
  // Java uses java.util.Stack; a plain array with push/pop from the end
  // (its last element standing in for the top of the stack) is the
  // direct JS equivalent.
  private readonly scopes: Map<string, boolean>[] = [];
  private currentFunction: FunctionType = "NONE";
  private currentClass: ClassType = "NONE";

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  resolve(statements: S.Stmt[]): void {
    for (const statement of statements) {
      this.resolveStmt(statement);
    }
  }

  visitBlockStmt(stmt: S.Block): void {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
  }

  visitClassStmt(stmt: S.Class): void {
    const enclosingClass = this.currentClass;
    this.currentClass = "CLASS";

    this.declare(stmt.name);
    this.define(stmt.name);

    if (stmt.superclass !== null && stmt.name.lexeme === stmt.superclass.name.lexeme) {
      Lox.error(stmt.superclass.name, "A class can't inherit from itself.");
    }

    if (stmt.superclass !== null) {
      this.currentClass = "SUBCLASS";
      this.resolveExpr(stmt.superclass);
    }

    if (stmt.superclass !== null) {
      this.beginScope();
      this.peekScope().set("super", true);
    }

    this.beginScope();
    this.peekScope().set("this", true);

    for (const method of stmt.methods) {
      let declaration: FunctionType = "METHOD";
      if (method.name.lexeme === "init") {
        declaration = "INITIALIZER";
      }

      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (stmt.superclass !== null) this.endScope();

    this.currentClass = enclosingClass;
  }

  visitExpressionStmt(stmt: S.ExpressionStmt): void {
    this.resolveExpr(stmt.expression);
  }

  visitFunctionStmt(stmt: S.FunctionStmt): void {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolveFunction(stmt, "FUNCTION");
  }

  visitIfStmt(stmt: S.If): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.thenBranch);
    if (stmt.elseBranch !== null) this.resolveStmt(stmt.elseBranch);
  }

  visitPrintStmt(stmt: S.Print): void {
    this.resolveExpr(stmt.expression);
  }

  visitReturnStmt(stmt: S.ReturnStmt): void {
    if (this.currentFunction === "NONE") {
      Lox.error(stmt.keyword, "Can't return from top-level code.");
    }

    if (stmt.value !== null) {
      if (this.currentFunction === "INITIALIZER") {
        Lox.error(stmt.keyword, "Can't return a value from an initializer.");
      }

      this.resolveExpr(stmt.value);
    }
  }

  visitVarStmt(stmt: S.Var): void {
    this.declare(stmt.name);
    if (stmt.initializer !== null) {
      this.resolveExpr(stmt.initializer);
    }
    this.define(stmt.name);
  }

  visitWhileStmt(stmt: S.While): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.body);
  }

  visitAssignExpr(expr: E.Assign): void {
    this.resolveExpr(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitBinaryExpr(expr: E.Binary): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitCallExpr(expr: E.Call): void {
    this.resolveExpr(expr.callee);

    for (const argument of expr.args) {
      this.resolveExpr(argument);
    }
  }

  visitGetExpr(expr: E.Get): void {
    this.resolveExpr(expr.object);
  }

  visitGroupingExpr(expr: E.Grouping): void {
    this.resolveExpr(expr.expression);
  }

  visitLiteralExpr(_expr: E.Literal): void {
    // Nothing to resolve.
  }

  visitLogicalExpr(expr: E.Logical): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitSetExpr(expr: E.Set): void {
    this.resolveExpr(expr.value);
    this.resolveExpr(expr.object);
  }

  visitSuperExpr(expr: E.Super): void {
    if (this.currentClass === "NONE") {
      Lox.error(expr.keyword, "Can't use 'super' outside of a class.");
    } else if (this.currentClass !== "SUBCLASS") {
      Lox.error(expr.keyword, "Can't use 'super' in a class with no superclass.");
    }

    this.resolveLocal(expr, expr.keyword);
  }

  visitThisExpr(expr: E.This): void {
    if (this.currentClass === "NONE") {
      Lox.error(expr.keyword, "Can't use 'this' outside of a class.");
      return;
    }

    this.resolveLocal(expr, expr.keyword);
  }

  visitUnaryExpr(expr: E.Unary): void {
    this.resolveExpr(expr.right);
  }

  visitVariableExpr(expr: E.Variable): void {
    if (
      this.scopes.length > 0 &&
      this.peekScope().get(expr.name.lexeme) === false
    ) {
      Lox.error(expr.name, "Can't read local variable in its own initializer.");
    }

    this.resolveLocal(expr, expr.name);
  }

  private resolveStmt(stmt: S.Stmt): void {
    stmt.accept(this);
  }

  private resolveExpr(expr: E.Expr): void {
    expr.accept(this);
  }

  private resolveFunction(func: S.FunctionStmt, type: FunctionType): void {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(func.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  private beginScope(): void {
    this.scopes.push(new Map<string, boolean>());
  }

  private endScope(): void {
    this.scopes.pop();
  }

  private peekScope(): Map<string, boolean> {
    return this.scopes[this.scopes.length - 1]!;
  }

  private declare(name: Token): void {
    if (this.scopes.length === 0) return;

    const scope = this.peekScope();
    if (scope.has(name.lexeme)) {
      Lox.error(name, "Already a variable with this name in this scope.");
    }

    scope.set(name.lexeme, false);
  }

  private define(name: Token): void {
    if (this.scopes.length === 0) return;
    this.peekScope().set(name.lexeme, true);
  }

  private resolveLocal(expr: E.Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i]!.has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }
}
