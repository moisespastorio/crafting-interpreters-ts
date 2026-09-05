// Port of Lox.java.
import * as fs from "node:fs";
import * as readline from "node:readline";
import type { Token } from "./token.js";
import { Scanner } from "./scanner.js";
import { Parser } from "./parser.js";
import { Resolver } from "./resolver.js";
import { Interpreter } from "./interpreter.js";
import type { RuntimeError } from "./runtimeError.js";

// Java has one Interpreter instance shared across a REPL session so
// global variables persist between lines; same idea here, a
// module-level singleton.
const interpreter = new Interpreter();

export class Lox {
  static hadError = false;
  static hadRuntimeError = false;

  static main(args: string[]): void {
    if (args.length > 1) {
      console.log("Usage: jlox [script]");
      process.exit(64);
    } else if (args.length === 1) {
      Lox.runFile(args[0]!);
    } else {
      Lox.runPrompt();
    }
  }

  private static runFile(path: string): void {
    const source = fs.readFileSync(path, "utf8");
    Lox.run(source);

    // Indicate an error in the exit code.
    if (Lox.hadError) process.exit(65);
    if (Lox.hadRuntimeError) process.exit(70);
  }

  private static runPrompt(): void {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const prompt = (): void => rl.question("> ", (line) => {
      if (line === null || line === undefined) {
        rl.close();
        return;
      }
      Lox.run(line);
      Lox.hadError = false;
      prompt();
    });

    prompt();
  }

  private static run(source: string): void {
    const scanner = new Scanner(source);
    const tokens: Token[] = scanner.scanTokens();

    const parser = new Parser(tokens);
    const statements = parser.parse();

    // Stop if there was a syntax error.
    if (Lox.hadError) return;

    const resolver = new Resolver(interpreter);
    resolver.resolve(statements);

    // Stop if there was a resolution error.
    if (Lox.hadError) return;

    interpreter.interpret(statements);
  }

  static error(lineOrToken: number | Token, message: string): void {
    if (typeof lineOrToken === "number") {
      Lox.report(lineOrToken, "", message);
    } else {
      const token = lineOrToken;
      if (token.type === "EOF") {
        Lox.report(token.line, " at end", message);
      } else {
        Lox.report(token.line, ` at '${token.lexeme}'`, message);
      }
    }
  }

  private static report(line: number, where: string, message: string): void {
    console.error(`[line ${line}] Error${where}: ${message}`);
    Lox.hadError = true;
  }

  static runtimeError(error: RuntimeError): void {
    console.error(`${error.message}\n[line ${error.token.line}]`);
    Lox.hadRuntimeError = true;
  }
}

// Equivalent of Java's `public static void main`: only run the CLI when
// this file is executed directly (e.g. `tsx src/lox.ts`), not when it's
// imported by other modules (scanner.ts, parser.ts, etc. import Lox for
// error reporting, and we don't want that import to launch the REPL).
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  Lox.main(process.argv.slice(2));
}
