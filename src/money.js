// Costs are stored as whole cents (or null when unknown) and shown in SGD.

export function parseCost(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/^(sgd|s?\$)\s*/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function formatCost(cents) {
  return cents === null || cents === undefined ? '—' : `S$${(cents / 100).toFixed(2)}`;
}
