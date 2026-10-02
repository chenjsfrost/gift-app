// Builds the reminder email from the same sections the home page shows.
// Returns null when nothing is open in the window, so no email is sent.
import { addDays, daysBetween } from './occasions.js';
import { formatCost } from './money.js';
import { formatDate, occasionLabel } from './views.js';

const inDays = (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

export function buildReminder({ sections, today, days, appUrl }) {
  const end = addDays(today, days - 1);
  const open = sections.filter((s) => s.occ.date <= end && s.missing.length);
  if (!open.length) return null;

  const total = open.reduce((n, s) => n + s.missing.length, 0);
  const soonest = inDays(daysBetween(today, open[0].occ.date));
  const subject =
    open.length === 1
      ? `Gifts: ${total} still to buy for ${open[0].label} (${soonest})`
      : `Gifts: ${total} still to buy across ${open.length} occasions (next ${soonest})`;

  const blocks = open.map((s) => {
    const lines = s.missing.map(({ person, lastGift: g }) =>
      g
        ? `- ${person.name} (last time: ${g.what}, ${occasionLabel(g.occasion, g.occasionDate, g.eventName)}, ${formatCost(g.costCents)})`
        : `- ${person.name} (nothing recorded yet)`,
    );
    const all = s.missing.length + s.covered.length;
    return [
      `${s.label} · ${formatDate(s.occ.date)} · ${inDays(daysBetween(today, s.occ.date))}`,
      `Still to buy (${s.missing.length}):`,
      ...lines,
      `Covered: ${s.covered.length} of ${all}`,
    ].join('\n');
  });

  const text = `${blocks.join('\n\n')}\n\nCheck before you shop: ${appUrl}\n`;
  return { subject, text };
}
