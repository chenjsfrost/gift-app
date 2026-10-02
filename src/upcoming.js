// Upcoming occasions with covered / still-to-buy. One source for both the home page
// and the reminder email, so a missed email never shows something the app doesn't.
import { upcomingOccasions } from './occasions.js';
import { coverage, personHistory } from './coverage.js';
import { occasionLabel } from './views.js';

export function upcomingSections(db, today, days) {
  const people = db.listPeople();
  const gifts = db.listGifts();
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  return upcomingOccasions(people, today, days).map((occ) => {
    const { covered, missing } = coverage(occ, people, gifts);
    return {
      occ,
      label: occasionLabel(occ.occasion, occ.date, nameOf.get(occ.personId)),
      covered,
      missing: missing.map((person) => ({ person, lastGift: personHistory(person.id, gifts)[0] ?? null })),
    };
  });
}

export const localToday = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
