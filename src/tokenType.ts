// Port of TokenType.java.
// Java used an `enum`; here a string-literal union works just as well,
// is trivially serializable, and reads fine in switch statements.
export type TokenType =
  // Single-character tokens.
  | "LEFT_PAREN" | "RIGHT_PAREN" | "LEFT_BRACE" | "RIGHT_BRACE"
  | "COMMA" | "DOT" | "MINUS" | "PLUS" | "SEMICOLON" | "SLASH" | "STAR"
  // One or two character tokens.
  | "BANG" | "BANG_EQUAL"
  | "EQUAL" | "EQUAL_EQUAL"
  | "GREATER" | "GREATER_EQUAL"
  | "LESS" | "LESS_EQUAL"
  // Literals.
  | "IDENTIFIER" | "STRING" | "NUMBER"
  // Keywords.
  | "AND" | "CLASS" | "ELSE" | "FALSE" | "FUN" | "FOR" | "IF" | "NIL" | "OR"
  | "PRINT" | "RETURN" | "SUPER" | "THIS" | "TRUE" | "VAR" | "WHILE"
  | "EOF";
