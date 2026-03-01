import { describe, it, expect } from 'vitest';
import { generateId } from '../services/utils';
import { safeEval } from '../services/mathEval';
import { formatCurrency, getMonthLabel } from '../services/financeService';

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('returns UUID format', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('safeEval', () => {
  it('evaluates simple addition', () => {
    expect(safeEval('100+50')).toBe(150);
  });

  it('evaluates division', () => {
    expect(safeEval('100/3')).toBe(33.33);
  });

  it('evaluates multiplication with decimals', () => {
    expect(safeEval('10*2.5')).toBe(25);
  });

  it('evaluates complex expressions', () => {
    expect(safeEval('(100+50)*2')).toBe(300);
  });

  it('evaluates subtraction', () => {
    expect(safeEval('200-75')).toBe(125);
  });

  it('handles whitespace', () => {
    expect(safeEval(' 10 + 20 ')).toBe(30);
  });

  it('returns 0 for empty string', () => {
    expect(safeEval('')).toBe(0);
  });

  it('returns 0 for invalid expressions', () => {
    expect(safeEval('abc')).toBe(0);
  });

  it('returns 0 for expressions with disallowed characters', () => {
    expect(safeEval('alert(1)')).toBe(0);
  });

  it('handles division by zero', () => {
    const result = safeEval('10/0');
    expect(result).toBe(0); // Infinity is not finite, returns 0
  });

  it('handles negative numbers via unary minus', () => {
    expect(safeEval('-5+10')).toBe(5);
  });

  it('respects operator precedence', () => {
    expect(safeEval('2+3*4')).toBe(14);
  });
});

describe('formatCurrency', () => {
  it('formats USD', () => {
    expect(formatCurrency(1000, 'USD')).toContain('1,000');
  });

  it('formats EUR', () => {
    const result = formatCurrency(1000, 'EUR');
    expect(result).toContain('1,000');
  });

  it('formats GBP', () => {
    const result = formatCurrency(1000, 'GBP');
    expect(result).toContain('1,000');
  });

  it('formats JPY', () => {
    const result = formatCurrency(1000, 'JPY');
    expect(result).toContain('1,000');
  });

  it('formats BRL', () => {
    const result = formatCurrency(1000, 'BRL');
    expect(result).toContain('1,000');
  });

  it('defaults to USD if no currency provided', () => {
    const result = formatCurrency(500);
    expect(result).toContain('500');
  });
});

describe('getMonthLabel', () => {
  it('returns month name and year', () => {
    const label = getMonthLabel('2025-01');
    expect(label).toContain('January');
    expect(label).toContain('2025');
  });

  it('returns "Select Date" for empty input', () => {
    expect(getMonthLabel('')).toBe('Select Date');
  });

  it('returns input for invalid format', () => {
    expect(getMonthLabel('invalid')).toBe('invalid');
  });

  it('handles December correctly', () => {
    const label = getMonthLabel('2025-12');
    expect(label).toContain('December');
  });
});
