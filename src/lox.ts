// Port of Lox.java.
import * as fs from "node:fs";
import * as readline from "node:readline";
import { pathToFileURL } from "node:url";
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
    // `jlox` in Java never had to worry about this: `System.in` is always
    // a real, blocking stream. Node is more Unix-y about it and exposes
    // `process.stdin.isTTY`, which is only `true` when stdin is an actual
    // interactive terminal. When you launch this via something that
    // doesn't attach one (many IDE "run" buttons, some task runners),
    // stdin is already at EOF the instant the process starts, so
    // `readline`'s `question()` just quietly closes without ever
    // printing "> " or calling its callback -- the exact silent exit
    // you were seeing.
    if (!process.stdin.isTTY) {
      Lox.runNonInteractive();
      return;
    }

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

  // Fallback for when stdin isn't an interactive terminal. If something
  // was actually piped in (`cat script.lox | npm start`), read it all and
  // run it as one program -- same spirit as the REPL, just without a
  // prompt to print. If nothing at all comes through, say so instead of
  // exiting without a trace.
  private static runNonInteractive(): void {
    let input = "";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (chunk) => {
      input += chunk;
    });

    process.stdin.on("end", () => {
      if (input.trim().length === 0) {
        console.log(
          "No interactive terminal detected, and nothing was piped in on stdin.\n" +
            "The REPL needs a real terminal to prompt for input. Try one of:\n" +
            "  npx tsx src/lox.ts examples/closures-and-classes.lox   " +
            "(run a script file)\n" +
            "  echo 'print 1 + 2;' | npx tsx src/lox.ts               " +
            "(pipe a program in)\n" +
            "  npx tsx src/lox.ts                                    " +
            "(run this directly in a real terminal for the REPL)",
        );
        return;
      }

      Lox.run(input);
      if (Lox.hadError) process.exitCode = 65;
      if (Lox.hadRuntimeError) process.exitCode = 70;
    });
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
const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  Lox.main(process.argv.slice(2));
}