// Port of Parser.java.
import type { Token } from "./token.js";
import type { TokenType } from "./tokenType.js";
import * as E from "./expr.js";
import * as S from "./stmt.js";
import { Lox } from "./lox.js";

// Java throws a private static `ParseError` (a RuntimeException subclass)
// purely as a control-flow signal to unwind back to `synchronize()`.
// Same trick as ReturnException: a plain class, no Error subclassing
// needed, since nothing ever reads a message or stack trace off it.
class ParseError {}

export class Parser {
  private readonly tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): S.Stmt[] {
    const statements: S.Stmt[] = [];
    while (!this.isAtEnd()) {
      const decl = this.declaration();
      if (decl !== null) statements.push(decl);
    }

    console.log(statements);

    return statements;
  }

  private expression(): E.Expr {
    return this.assignment();
  }

  private declaration(): S.Stmt | null {
    try {
      if (this.match("CLASS")) return this.classDeclaration();
      if (this.match("FUN")) return this.function("function");
      if (this.match("VAR")) return this.varDeclaration();

      return this.statement();
    } catch (error) {
      if (error instanceof ParseError) {
        this.synchronize();
        return null;
      }
      throw error;
    }
  }

  private classDeclaration(): S.Stmt {
    const name = this.consume("IDENTIFIER", "Expect class name.");

    let superclass: E.Variable | null = null;
    if (this.match("LESS")) {
      this.consume("IDENTIFIER", "Expect superclass name.");
      superclass = new E.Variable(this.previous());
    }

    this.consume("LEFT_BRACE", "Expect '{' before class body.");

    const methods: S.FunctionStmt[] = [];
    while (!this.check("RIGHT_BRACE") && !this.isAtEnd()) {
      methods.push(this.function("method"));
    }

    this.consume("RIGHT_BRACE", "Expect '}' after class body.");

    return new S.Class(name, superclass, methods);
  }

  private statement(): S.Stmt {
    if (this.match("FOR")) return this.forStatement();
    if (this.match("IF")) return this.ifStatement();
    if (this.match("PRINT")) return this.printStatement();
    if (this.match("RETURN")) return this.returnStatement();
    if (this.match("WHILE")) return this.whileStatement();
    if (this.match("LEFT_BRACE")) return new S.Block(this.block());

    return this.expressionStatement();
  }

  private forStatement(): S.Stmt {
    this.consume("LEFT_PAREN", "Expect '(' after 'for'.");

    let initializer: S.Stmt | null;
    if (this.match("SEMICOLON")) {
      initializer = null;
    } else if (this.match("VAR")) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: E.Expr | null = null;
    if (!this.check("SEMICOLON")) {
      condition = this.expression();
    }
    this.consume("SEMICOLON", "Expect ';' after loop condition.");

    let increment: E.Expr | null = null;
    if (!this.check("RIGHT_PAREN")) {
      increment = this.expression();
    }
    this.consume("RIGHT_PAREN", "Expect ')' after for clauses.");

    let body = this.statement();

    if (increment !== null) {
      body = new S.Block([body, new S.ExpressionStmt(increment)]);
    }

    body = new S.While(condition ?? new E.Literal(true), body);

    if (initializer !== null) {
      body = new S.Block([initializer, body]);
    }

    return body;
  }

  private ifStatement(): S.Stmt {
    this.consume("LEFT_PAREN", "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume("RIGHT_PAREN", "Expect ')' after if condition.");

    const thenBranch = this.statement();
    let elseBranch: S.Stmt | null = null;
    if (this.match("ELSE")) {
      elseBranch = this.statement();
    }

    return new S.If(condition, thenBranch, elseBranch);
  }

  private printStatement(): S.Stmt {
    const value = this.expression();
    this.consume("SEMICOLON", "Expect ';' after value.");
    return new S.Print(value);
  }

  private returnStatement(): S.Stmt {
    const keyword = this.previous();
    let value: E.Expr | null = null;
    if (!this.check("SEMICOLON")) {
      value = this.expression();
    }

    this.consume("SEMICOLON", "Expect ';' after return value.");
    return new S.ReturnStmt(keyword, value);
  }

  private varDeclaration(): S.Stmt {
    const name = this.consume("IDENTIFIER", "Expect variable name.");

    let initializer: E.Expr | null = null;
    if (this.match("EQUAL")) {
      initializer = this.expression();
    }

    this.consume("SEMICOLON", "Expect ';' after variable declaration.");
    return new S.Var(name, initializer);
  }

  private whileStatement(): S.Stmt {
    this.consume("LEFT_PAREN", "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume("RIGHT_PAREN", "Expect ')' after condition.");
    const body = this.statement();

    return new S.While(condition, body);
  }

  private expressionStatement(): S.Stmt {
    const expr = this.expression();
    this.consume("SEMICOLON", "Expect ';' after expression.");
    return new S.ExpressionStmt(expr);
  }

  private function(kind: string): S.FunctionStmt {
    const name = this.consume("IDENTIFIER", `Expect ${kind} name.`);
    this.consume("LEFT_PAREN", `Expect '(' after ${kind} name.`);
    const parameters: Token[] = [];
    if (!this.check("RIGHT_PAREN")) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 parameters.");
        }

        parameters.push(this.consume("IDENTIFIER", "Expect parameter name."));
      } while (this.match("COMMA"));
    }
    this.consume("RIGHT_PAREN", "Expect ')' after parameters.");

    this.consume("LEFT_BRACE", `Expect '{' before ${kind} body.`);
    const body = this.block();
    return new S.FunctionStmt(name, parameters, body);
  }

  private block(): S.Stmt[] {
    const statements: S.Stmt[] = [];

    while (!this.check("RIGHT_BRACE") && !this.isAtEnd()) {
      const decl = this.declaration();
      if (decl !== null) statements.push(decl);
    }

    this.consume("RIGHT_BRACE", "Expect '}' after block.");
    return statements;
  }

  private assignment(): E.Expr {
    const expr = this.or();

    if (this.match("EQUAL")) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof E.Variable) {
        const name = expr.name;
        return new E.Assign(name, value);
      } else if (expr instanceof E.Get) {
        return new E.Set(expr.object, expr.name, value);
      }

      this.error(equals, "Invalid assignment target."); // Reported, not thrown.
    }

    return expr;
  }

  private or(): E.Expr {
    let expr = this.and();

    while (this.match("OR")) {
      const operator = this.previous();
      const right = this.and();
      expr = new E.Logical(expr, operator, right);
    }

    return expr;
  }

  private and(): E.Expr {
    let expr = this.equality();

    while (this.match("AND")) {
      const operator = this.previous();
      const right = this.equality();
      expr = new E.Logical(expr, operator, right);
    }

    return expr;
  }

  private equality(): E.Expr {
    let expr = this.comparison();

    while (this.match("BANG_EQUAL", "EQUAL_EQUAL")) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new E.Binary(expr, operator, right);
    }

    return expr;
  }

  private comparison(): E.Expr {
    let expr = this.term();

    while (this.match("GREATER", "GREATER_EQUAL", "LESS", "LESS_EQUAL")) {
      const operator = this.previous();
      const right = this.term();
      expr = new E.Binary(expr, operator, right);
    }

    return expr;
  }

  private term(): E.Expr {
    let expr = this.factor();

    while (this.match("MINUS", "PLUS")) {
      const operator = this.previous();
      const right = this.factor();
      expr = new E.Binary(expr, operator, right);
    }

    return expr;
  }

  private factor(): E.Expr {
    let expr = this.unary();

    while (this.match("SLASH", "STAR")) {
      const operator = this.previous();
      const right = this.unary();
      expr = new E.Binary(expr, operator, right);
    }

    return expr;
  }

  private unary(): E.Expr {
    if (this.match("BANG", "MINUS")) {
      const operator = this.previous();
      const right = this.unary();
      return new E.Unary(operator, right);
    }

    return this.call();
  }

  private finishCall(callee: E.Expr): E.Expr {
    const args: E.Expr[] = [];
    if (!this.check("RIGHT_PAREN")) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match("COMMA"));
    }

    const paren = this.consume("RIGHT_PAREN", "Expect ')' after arguments.");

    return new E.Call(callee, paren, args);
  }

  private call(): E.Expr {
    let expr = this.primary();

    while (true) {
      if (this.match("LEFT_PAREN")) {
        expr = this.finishCall(expr);
      } else if (this.match("DOT")) {
        const name = this.consume("IDENTIFIER", "Expect property name after '.'.");
        expr = new E.Get(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private primary(): E.Expr {
    if (this.match("FALSE")) return new E.Literal(false);
    if (this.match("TRUE")) return new E.Literal(true);
    if (this.match("NIL")) return new E.Literal(null);

    if (this.match("NUMBER", "STRING")) {
      return new E.Literal(this.previous().literal);
    }

    if (this.match("SUPER")) {
      const keyword = this.previous();
      this.consume("DOT", "Expect '.' after 'super'.");
      const method = this.consume("IDENTIFIER", "Expect superclass method name.");
      return new E.Super(keyword, method);
    }

    if (this.match("THIS")) return new E.This(this.previous());

    if (this.match("IDENTIFIER")) {
      return new E.Variable(this.previous());
    }

    if (this.match("LEFT_PAREN")) {
      const expr = this.expression();
      this.consume("RIGHT_PAREN", "Expect ')' after expression.");
      return new E.Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private error(token: Token, message: string): ParseError {
    Lox.error(token, message);
    return new ParseError();
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === "SEMICOLON") return;

      switch (this.peek().type) {
        case "CLASS":
        case "FUN":
        case "VAR":
        case "FOR":
        case "IF":
        case "WHILE":
        case "PRINT":
        case "RETURN":
          return;
      }

      this.advance();
    }
  }
}
