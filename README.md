# lox-ts

TypeScript port of **jlox**, the tree-walking interpreter from Bob Nystrom's
[*Crafting Interpreters*](https://craftinginterpreters.com/), originally
written in Java at
https://github.com/munificent/craftinginterpreters/tree/master/java/com/craftinginterpreters.

Runs directly with [`tsx`](https://github.com/privatenumber/tsx) — no build
step needed.

## Usage

```bash
npm install

# REPL
npm start

# Run a script
npx tsx src/lox.ts examples/closures-and-classes.lox
```

## Structure (mirrors the original Java package 1:1)

| File | Java equivalent | Role |
|---|---|---|
| `src/tokenType.ts` | `TokenType.java` | Token kind (string-literal union instead of `enum`) |
| `src/token.ts` | `Token.java` | A single lexical token |
| `src/scanner.ts` | `Scanner.java` | Source text → tokens |
| `src/expr.ts` | `Expr.java` | Expression AST nodes + visitor interface |
| `src/stmt.ts` | `Stmt.java` | Statement AST nodes + visitor interface |
| `src/parser.ts` | `Parser.java` | Tokens → AST (recursive descent) |
| `src/resolver.ts` | `Resolver.java` | Static scope resolution pass |
| `src/environment.ts` | `Environment.java` | Variable scopes / bindings |
| `src/interpreter.ts` | `Interpreter.java` | Tree-walking evaluator |
| `src/loxCallable.ts` | `LoxCallable.java` | Interface for anything callable |
| `src/loxFunction.ts` | `LoxFunction.java` | User-defined functions/methods |
| `src/loxClass.ts` | `LoxClass.java` | Class objects |
| `src/loxInstance.ts` | `LoxInstance.java` | Class instances |
| `src/returnException.ts` | `Return.java` | Control-flow signal for `return` |
| `src/runtimeError.ts` | `RuntimeError.java` | Runtime error type |
| `src/astPrinter.ts` | `AstPrinter.java` | Debug: prints AST as s-expressions |
| `src/lox.ts` | `Lox.java` | CLI entry point (REPL / run file) |

## Notable Java → TypeScript translation choices

- **`enum TokenType`** → a string-literal union type. Cheaper, and reads
  fine in `switch` statements.
- **Nested static classes** (`Expr.Binary`, `Stmt.If`, ...) → flat exported
  classes (`Binary`, `If`, ...) implementing a plain `Expr`/`Stmt`
  interface. TypeScript has no clean equivalent of Java's nested static
  classes, so `import * as E from "./expr.js"` + `E.Binary` is the closest
  parallel to `Expr.Binary`.
- **`instanceof Double` / `instanceof String`** → `typeof x === "number"` /
  `"string"`, since JS has one numeric type.
- **The `ParseError` / `Return` control-flow exceptions** → plain classes
  that don't extend `Error`, mirroring the Java code's explicit trick of
  skipping stack-trace capture (`super(null, null, false, false)`) — in JS
  you get that for free by not extending `Error` at all.
- **`java.util.Stack`** (in `Resolver`) → a plain array used as a stack.
- **Circular class references** (`Lox` ↔ `Scanner`/`Parser`/`Interpreter`,
  `Interpreter` ↔ `LoxFunction`/`LoxClass`) → resolved the same way ES
  modules always resolve cycles: `import type` where only the type is
  needed, and real imports are only *read* inside function bodies (never
  at module top level), so by the time they're actually called the whole
  module graph has finished loading.

Not ported: `tool/GenerateAst.java`, the code-generator that produces
`Expr.java`/`Stmt.java` in the original repo. Since `expr.ts`/`stmt.ts` here
are hand-written directly (not generated), there was nothing for it to
generate — happy to add a TS equivalent generator if you want one.

## Verified against the book's test cases

- Arithmetic, strings, scoping, `for`/`while`/`if` ✅
- Closures (counter-generator pattern) ✅
- Recursion (`fib`) ✅
- Classes, `init`, inheritance, `this`, `super` ✅
- Native `clock()` function ✅
- Parse errors, resolver errors, runtime errors — same messages and exit
  codes as jlox (65 for syntax/resolution errors, 70 for runtime errors) ✅
- REPL mode with persistent state across lines ✅
