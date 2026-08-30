export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2,
    }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
};

export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const truncateText = (text, maxLength = 160) => {
  const value = String(text || '');
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
};
