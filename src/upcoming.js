// Upcoming occasions with covered / still-to-buy. One source for both the home page
// and the reminder email, so a missed email never shows something the app doesn't.
import { addDays, upcomingOccasions } from './occasions.js';
import { coverage, personHistory } from './coverage.js';
import { occasionLabel } from './views.js';

const sameKind = (occ) => (g) => g.occasion === occ.occasion && (occ.occasion !== 'event' || g.eventId === occ.eventId);

// The most recent gift for an occasion before `occ`, same kind first (last birthday
// for a birthday), so "last time" never shows a gift for something still to come.
export function lastGiftBefore(occ, history) {
  const past = history.filter((g) => g.occasionDate < occ.date);
  return past.find(sameKind(occ)) ?? past[0] ?? null;
}

const sumCents = (gifts) => gifts.reduce((t, g) => t + (g.costCents ?? 0), 0);

// The same occasion one year earlier: last Christmas, this person's last birthday,
// or the same custom event.
function lastYearsGifts(occ, gifts) {
  const year = String(Number(occ.date.slice(0, 4)) - 1);
  return gifts.filter(
    (g) => sameKind(occ)(g) && g.occasionDate.startsWith(year) && (occ.occasion !== 'birthday' || g.personId === occ.personId),
  );
}

export function upcomingSections(db, today, days) {
  const people = db.listPeople();
  const gifts = db.listGifts();
  const events = db.listEvents();
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const eventName = new Map(events.map((e) => [e.id, e.name]));
  return upcomingOccasions(people, today, days, events).map((occ) => {
    const { covered, missing } = coverage(occ, people, gifts);
    const lastYear = lastYearsGifts(occ, gifts);
    return {
      occ,
      label: occasionLabel(occ.occasion, occ.date, occ.occasion === 'event' ? eventName.get(occ.eventId) : nameOf.get(occ.personId)),
      covered,
      missing: missing.map((person) => ({ person, lastGift: lastGiftBefore(occ, personHistory(person.id, gifts)) })),
      spentCents: sumCents(covered.flatMap((c) => c.gifts)),
      lastYearCents: lastYear.some((g) => g.costCents !== null) ? sumCents(lastYear) : null,
    };
  });
}

// Occasions after the home page's detailed window, up to `days` ahead, so you can plan
// further out. `shown` are the sections already on the page; none is listed twice.
const keyOf = ({ occ }) => [occ.occasion, occ.date, occ.personId, occ.eventId].join('|');
export function laterSections(db, today, afterDays, shown = [], days = 365) {
  const end = addDays(today, afterDays - 1);
  const seen = new Set(shown.map(keyOf));
  return upcomingSections(db, today, days).filter((s) => s.occ.date > end && !seen.has(keyOf(s)));
}

export const localToday = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
