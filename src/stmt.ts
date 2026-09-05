// Port of Stmt.java. Same flat-class approach as expr.ts.
import type { Token } from "./token.js";
import type { Expr, Variable } from "./expr.js";

export interface StmtVisitor<R> {
  visitBlockStmt(stmt: Block): R;
  visitClassStmt(stmt: Class): R;
  visitExpressionStmt(stmt: ExpressionStmt): R;
  visitFunctionStmt(stmt: FunctionStmt): R;
  visitIfStmt(stmt: If): R;
  visitPrintStmt(stmt: Print): R;
  visitReturnStmt(stmt: ReturnStmt): R;
  visitVarStmt(stmt: Var): R;
  visitWhileStmt(stmt: While): R;
}

export interface Stmt {
  accept<R>(visitor: StmtVisitor<R>): R;
}

export class Block implements Stmt {
  constructor(public readonly statements: Stmt[]) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}

export class Class implements Stmt {
  constructor(
    public readonly name: Token,
    public readonly superclass: Variable | null,
    public readonly methods: FunctionStmt[],
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitClassStmt(this);
  }
}

// Java calls this `Expression`; TS's DOM lib already exports an unrelated
// `Expression`-ish name in some ambient globals, so this is suffixed
// `ExpressionStmt` to keep it unambiguous. Same story for `Return` below,
// which would otherwise collide with returnException.ts's export.
export class ExpressionStmt implements Stmt {
  constructor(public readonly expression: Expr) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}

export class FunctionStmt implements Stmt {
  constructor(
    public readonly name: Token,
    public readonly params: Token[],
    public readonly body: Stmt[],
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitFunctionStmt(this);
  }
}

export class If implements Stmt {
  constructor(
    public readonly condition: Expr,
    public readonly thenBranch: Stmt,
    public readonly elseBranch: Stmt | null,
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitIfStmt(this);
  }
}

export class Print implements Stmt {
  constructor(public readonly expression: Expr) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}

export class ReturnStmt implements Stmt {
  constructor(
    public readonly keyword: Token,
    public readonly value: Expr | null,
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitReturnStmt(this);
  }
}

export class Var implements Stmt {
  constructor(
    public readonly name: Token,
    public readonly initializer: Expr | null,
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}

export class While implements Stmt {
  constructor(
    public readonly condition: Expr,
    public readonly body: Stmt,
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitWhileStmt(this);
  }
}
