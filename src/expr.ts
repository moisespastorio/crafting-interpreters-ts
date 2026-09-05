// Port of Expr.java.
//
// Java generates these as static nested classes inside an abstract
// `Expr` class (see tool/GenerateAst.java), so you write `Expr.Binary`,
// `Expr.Literal`, etc. TypeScript has no equivalent of "static nested
// classes" that's worth fighting for, so each node is a flat exported
// class instead -- `Binary`, `Literal`, and so on -- implementing the
// shared `Expr` interface. Everywhere the Java book writes `Expr.Binary`,
// this port just writes `Binary` (imported from this module).
import type { Token } from "./token.js";

export interface ExprVisitor<R> {
  visitAssignExpr(expr: Assign): R;
  visitBinaryExpr(expr: Binary): R;
  visitCallExpr(expr: Call): R;
  visitGetExpr(expr: Get): R;
  visitGroupingExpr(expr: Grouping): R;
  visitLiteralExpr(expr: Literal): R;
  visitLogicalExpr(expr: Logical): R;
  visitSetExpr(expr: Set): R;
  visitSuperExpr(expr: Super): R;
  visitThisExpr(expr: This): R;
  visitUnaryExpr(expr: Unary): R;
  visitVariableExpr(expr: Variable): R;
}

export interface Expr {
  accept<R>(visitor: ExprVisitor<R>): R;
}

export class Assign implements Expr {
  constructor(
    public readonly name: Token,
    public readonly value: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitAssignExpr(this);
  }
}

export class Binary implements Expr {
  constructor(
    public readonly left: Expr,
    public readonly operator: Token,
    public readonly right: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitBinaryExpr(this);
  }
}

export class Call implements Expr {
  constructor(
    public readonly callee: Expr,
    public readonly paren: Token,
    public readonly args: Expr[], // Java calls this `arguments`; reserved-ish in JS, renamed.
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitCallExpr(this);
  }
}

export class Get implements Expr {
  constructor(
    public readonly object: Expr,
    public readonly name: Token,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitGetExpr(this);
  }
}

export class Grouping implements Expr {
  constructor(public readonly expression: Expr) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }
}

export class Literal implements Expr {
  constructor(public readonly value: unknown) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }
}

export class Logical implements Expr {
  constructor(
    public readonly left: Expr,
    public readonly operator: Token,
    public readonly right: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLogicalExpr(this);
  }
}

export class Set implements Expr {
  constructor(
    public readonly object: Expr,
    public readonly name: Token,
    public readonly value: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitSetExpr(this);
  }
}

export class Super implements Expr {
  constructor(
    public readonly keyword: Token,
    public readonly method: Token,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitSuperExpr(this);
  }
}

export class This implements Expr {
  constructor(public readonly keyword: Token) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitThisExpr(this);
  }
}

export class Unary implements Expr {
  constructor(
    public readonly operator: Token,
    public readonly right: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitUnaryExpr(this);
  }
}

export class Variable implements Expr {
  constructor(public readonly name: Token) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitVariableExpr(this);
  }
}
