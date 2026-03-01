/**
 * Safe arithmetic expression evaluator.
 * Supports +, -, *, / and parentheses on numeric values.
 * Returns 0 for invalid expressions.
 */
export function safeEval(expression: string): number {
  const trimmed = expression.trim();
  if (!trimmed) return 0;

  // Only allow digits, operators, parentheses, dots, and whitespace
  if (!/^[\d+\-*/().\s]+$/.test(trimmed)) return parseFloat(trimmed) || 0;

  try {
    const result = parse(trimmed);
    return isFinite(result) ? Number(result.toFixed(2)) : 0;
  } catch {
    return 0;
  }
}

// Recursive descent parser
let pos: number;
let input: string;

function parse(expr: string): number {
  pos = 0;
  input = expr;
  const result = parseExpression();
  skipWhitespace();
  if (pos < input.length) throw new Error('Unexpected character');
  return result;
}

function skipWhitespace() {
  while (pos < input.length && input[pos] === ' ') pos++;
}

function parseExpression(): number {
  let result = parseTerm();
  skipWhitespace();
  while (pos < input.length && (input[pos] === '+' || input[pos] === '-')) {
    const op = input[pos];
    pos++;
    const right = parseTerm();
    result = op === '+' ? result + right : result - right;
    skipWhitespace();
  }
  return result;
}

function parseTerm(): number {
  let result = parseFactor();
  skipWhitespace();
  while (pos < input.length && (input[pos] === '*' || input[pos] === '/')) {
    const op = input[pos];
    pos++;
    const right = parseFactor();
    result = op === '*' ? result * right : result / right;
    skipWhitespace();
  }
  return result;
}

function parseFactor(): number {
  skipWhitespace();

  // Handle unary minus
  if (pos < input.length && input[pos] === '-') {
    pos++;
    return -parseFactor();
  }

  // Handle parentheses
  if (pos < input.length && input[pos] === '(') {
    pos++;
    const result = parseExpression();
    skipWhitespace();
    if (pos < input.length && input[pos] === ')') {
      pos++;
    }
    return result;
  }

  // Parse number
  const start = pos;
  while (pos < input.length && (input[pos] >= '0' && input[pos] <= '9' || input[pos] === '.')) {
    pos++;
  }
  if (start === pos) throw new Error('Expected number');
  return parseFloat(input.slice(start, pos));
}
