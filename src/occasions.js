// Occasion dates. All dates are 'YYYY-MM-DD' strings; birthdays are 'MM-DD'.
// Pure functions: no clock, no database. Callers pass "today".

// 'event' is a custom event; its date comes from the event, { date, repeats }.
export const OCCASIONS = ['christmas', 'birthday', 'event'];

// A gift bought up to this many days after an occasion counts as a late gift for it.
const LATE_GIFT_DAYS = 14;

const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
const toIso = (d) => d.toISOString().slice(0, 10);

export function addDays(iso, days) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function daysBetween(fromIso, toIso_) {
  return Math.round((toDate(toIso_) - toDate(fromIso)) / 86_400_000);
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function occurrenceInYear(occasion, year, birthday = null) {
  if (occasion === 'christmas') return `${year}-12-25`;
  if (!birthday) return null;
  const md = birthday === '02-29' && !isLeap(year) ? '02-28' : birthday;
  return `${year}-${md}`;
}

// The first occurrence on or after fromIso.
export function nextOccurrence(occasion, fromIso, birthday = null) {
  const year = Number(fromIso.slice(0, 4));
  const thisYear = occurrenceInYear(occasion, year, birthday);
  if (thisYear === null) return null;
  return thisYear >= fromIso ? thisYear : occurrenceInYear(occasion, year + 1, birthday);
}

// A custom event's first date on or after fromIso: every year on its month and day,
// or just once (null once it has passed).
export function nextEventDate(event, fromIso) {
  if (!event.repeats) return event.date >= fromIso ? event.date : null;
  return nextOccurrence('birthday', fromIso, event.date.slice(5));
}

// Which occurrence a gift bought on giftIso is for: a recent past one if the gift is
// late (within LATE_GIFT_DAYS), otherwise the next one. The user can override it.
// A one-off event is always its own date.
export function defaultOccasionDate(occasion, giftIso, birthday = null, event = null) {
  if (occasion === 'event') {
    if (!event) return giftIso;
    return event.repeats ? nextEventDate(event, addDays(giftIso, -LATE_GIFT_DAYS)) : event.date;
  }
  const next = nextOccurrence(occasion, addDays(giftIso, -LATE_GIFT_DAYS), birthday);
  return next ?? giftIso;
}

// Occasions from today within `days`, soonest first. Never empty: if nothing falls in
// the window, the single next occasion is returned so there is always something to show.
export function upcomingOccasions(people, todayIso, days, events = []) {
  const all = [{ occasion: 'christmas', date: nextOccurrence('christmas', todayIso), personId: null }];
  for (const p of people) {
    if (!p.birthday) continue;
    all.push({ occasion: 'birthday', date: nextOccurrence('birthday', todayIso, p.birthday), personId: p.id });
  }
  for (const e of events) {
    const date = nextEventDate(e, todayIso);
    if (date) all.push({ occasion: 'event', date, personId: null, eventId: e.id });
  }
  all.sort((a, b) => a.date.localeCompare(b.date) || (a.personId ?? 0) - (b.personId ?? 0));
  const end = addDays(todayIso, days - 1);
  const inWindow = all.filter((o) => o.date <= end);
  return inWindow.length ? inWindow : all.slice(0, 1);
}
