import { CurrencyCode } from "../types";

export const formatCurrency = (amount: number, currency: CurrencyCode = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getMonthLabel = (dateStr: string) => {
    try {
        if (!dateStr) return 'Select Date';
        const parts = dateStr.split('-');
        if (parts.length !== 2) return dateStr;
        const [y, m] = parts.map(Number);
        if (isNaN(y) || isNaN(m)) return dateStr;
        return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
};