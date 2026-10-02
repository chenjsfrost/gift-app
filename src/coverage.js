// Who is covered for an occasion, duplicate marking, and per-person history.
// Pure functions over plain people and gift objects.

const keyOf = (g) => `${g.personId}|${g.occasion}|${g.eventId ?? ''}|${g.occasionDate}`;
const byName = (a, b) => a.name.localeCompare(b.name);

// Two or more gifts for the same person, occasion and date are kept, but flagged.
export function withDuplicateFlags(gifts) {
  const counts = new Map();
  for (const g of gifts) counts.set(keyOf(g), (counts.get(keyOf(g)) ?? 0) + 1);
  return gifts.map((g) => ({ ...g, possibleDuplicate: counts.get(keyOf(g)) > 1 }));
}

const isFor = (occ) => (g) =>
  g.occasion === occ.occasion && g.occasionDate === occ.date && (occ.occasion !== 'event' || g.eventId === occ.eventId);

// occ: { occasion, date, personId, eventId } from upcomingOccasions.
export function coverage(occ, people, gifts) {
  const forOcc = withDuplicateFlags(gifts.filter(isFor(occ)));
  const giftedIds = new Set(forOcc.map((g) => g.personId));
  const expected =
    occ.occasion === 'christmas'
      ? people.filter((p) => p.onChristmasList || giftedIds.has(p.id))
      : occ.occasion === 'event'
        ? people.filter((p) => p.eventIds?.includes(occ.eventId) || giftedIds.has(p.id))
        : people.filter((p) => p.id === occ.personId);

  const covered = [];
  const missing = [];
  for (const person of [...expected].sort(byName)) {
    const theirs = forOcc.filter((g) => g.personId === person.id);
    if (theirs.length) covered.push({ person, gifts: theirs });
    else missing.push(person);
  }
  return { covered, missing };
}

export function personHistory(personId, gifts) {
  return withDuplicateFlags(gifts.filter((g) => g.personId === personId)).sort(
    (a, b) =>
      b.occasionDate.localeCompare(a.occasionDate) ||
      (b.givenDate ?? '').localeCompare(a.givenDate ?? '') ||
      b.id - a.id,
  );
}
