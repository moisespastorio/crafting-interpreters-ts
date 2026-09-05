// Port of AstPrinter.java. Not wired into the CLI by default (same as the
// book once statements land), but handy for debugging: prints an AST as
// a Lisp-y s-expression, e.g. `(* (- 123) (group 45.67))`.
import type { ExprVisitor } from "./expr.js";
import * as E from "./expr.js";
import type { StmtVisitor } from "./stmt.js";
import * as S from "./stmt.js";
import type { Token } from "./token.js";

type Part = E.Expr | S.Stmt | Token | string | unknown[];

export class AstPrinter implements ExprVisitor<string>, StmtVisitor<string> {
  print(node: E.Expr | S.Stmt): string {
    return (node as E.Expr).accept
      ? (node as any).accept(this)
      : "";
  }

  printExpr(expr: E.Expr): string {
    return expr.accept(this);
  }

  printStmt(stmt: S.Stmt): string {
    return stmt.accept(this);
  }

  visitBlockStmt(stmt: S.Block): string {
    let builder = "(block ";
    for (const statement of stmt.statements) {
      builder += statement.accept(this);
    }
    builder += ")";
    return builder;
  }

  visitClassStmt(stmt: S.Class): string {
    let builder = `(class ${stmt.name.lexeme}`;
    if (stmt.superclass !== null) {
      builder += ` < ${this.printExpr(stmt.superclass)}`;
    }
    for (const method of stmt.methods) {
      builder += ` ${this.printStmt(method)}`;
    }
    builder += ")";
    return builder;
  }

  visitExpressionStmt(stmt: S.ExpressionStmt): string {
    return this.parenthesize(";", stmt.expression);
  }

  visitFunctionStmt(stmt: S.FunctionStmt): string {
    let builder = `(fun ${stmt.name.lexeme}(`;
    stmt.params.forEach((param, i) => {
      if (i !== 0) builder += " ";
      builder += param.lexeme;
    });
    builder += ") ";
    for (const body of stmt.body) {
      builder += body.accept(this);
    }
    builder += ")";
    return builder;
  }

  visitIfStmt(stmt: S.If): string {
    if (stmt.elseBranch === null) {
      return this.parenthesize2("if", stmt.condition, stmt.thenBranch);
    }
    return this.parenthesize2("if-else", stmt.condition, stmt.thenBranch, stmt.elseBranch);
  }

  visitPrintStmt(stmt: S.Print): string {
    return this.parenthesize("print", stmt.expression);
  }

  visitReturnStmt(stmt: S.ReturnStmt): string {
    if (stmt.value === null) return "(return)";
    return this.parenthesize("return", stmt.value);
  }

  visitVarStmt(stmt: S.Var): string {
    if (stmt.initializer === null) {
      return this.parenthesize2("var", stmt.name);
    }
    return this.parenthesize2("var", stmt.name, "=", stmt.initializer);
  }

  visitWhileStmt(stmt: S.While): string {
    return this.parenthesize2("while", stmt.condition, stmt.body);
  }

  visitAssignExpr(expr: E.Assign): string {
    return this.parenthesize2("=", expr.name.lexeme, expr.value);
  }

  visitBinaryExpr(expr: E.Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitCallExpr(expr: E.Call): string {
    return this.parenthesize2("call", expr.callee, expr.args);
  }

  visitGetExpr(expr: E.Get): string {
    return this.parenthesize2(".", expr.object, expr.name.lexeme);
  }

  visitGroupingExpr(expr: E.Grouping): string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: E.Literal): string {
    if (expr.value === null) return "nil";
    return String(expr.value);
  }

  visitLogicalExpr(expr: E.Logical): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitSetExpr(expr: E.Set): string {
    return this.parenthesize2("=", expr.object, expr.name.lexeme, expr.value);
  }

  visitSuperExpr(expr: E.Super): string {
    return this.parenthesize2("super", expr.method);
  }

  visitThisExpr(_expr: E.This): string {
    return "this";
  }

  visitUnaryExpr(expr: E.Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  visitVariableExpr(expr: E.Variable): string {
    return expr.name.lexeme;
  }

  private parenthesize(name: string, ...exprs: E.Expr[]): string {
    let builder = `(${name}`;
    for (const expr of exprs) {
      builder += " " + expr.accept(this);
    }
    builder += ")";
    return builder;
  }

  private parenthesize2(name: string, ...parts: Part[]): string {
    let builder = `(${name}`;
    builder += this.transform(parts);
    builder += ")";
    return builder;
  }

  private transform(parts: Part[]): string {
    let builder = "";
    for (const part of parts) {
      builder += " ";
      if (this.isExpr(part)) {
        builder += (part as E.Expr).accept(this);
      } else if (this.isStmt(part)) {
        builder += (part as S.Stmt).accept(this);
      } else if (Array.isArray(part)) {
        builder += this.transform(part as Part[]);
      } else if (this.isToken(part)) {
        builder += (part as Token).lexeme;
      } else {
        builder += String(part);
      }
    }
    return builder;
  }

  private isExpr(part: unknown): part is E.Expr {
    return (
      part instanceof E.Assign || part instanceof E.Binary || part instanceof E.Call ||
      part instanceof E.Get || part instanceof E.Grouping || part instanceof E.Literal ||
      part instanceof E.Logical || part instanceof E.Set || part instanceof E.Super ||
      part instanceof E.This || part instanceof E.Unary || part instanceof E.Variable
    );
  }

  private isStmt(part: unknown): part is S.Stmt {
    return (
      part instanceof S.Block || part instanceof S.Class || part instanceof S.ExpressionStmt ||
      part instanceof S.FunctionStmt || part instanceof S.If || part instanceof S.Print ||
      part instanceof S.ReturnStmt || part instanceof S.Var || part instanceof S.While
    );
  }

  private isToken(part: unknown): part is Token {
    return (
      typeof part === "object" &&
      part !== null &&
      "lexeme" in part &&
      "type" in part &&
      "line" in part
    );
  }
}
