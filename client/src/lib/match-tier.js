export const matchTier = (score) => {
  if (score >= 85) return { key: 'excellent', label: 'Excellent match', stroke: 'stroke-ink', text: 'text-ink' };
  if (score >= 70) return { key: 'strong', label: 'Strong match', stroke: 'stroke-success', text: 'text-success' };
  if (score >= 50) return { key: 'decent', label: 'Decent match', stroke: 'stroke-warning', text: 'text-warning' };
  return { key: 'low', label: 'Low match', stroke: 'stroke-slate-400', text: 'text-slate-600' };
};
