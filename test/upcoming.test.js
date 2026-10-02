import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { lastGiftBefore, upcomingSections, laterSections } from '../src/upcoming.js';

const gift = (what, occasion, occasionDate, eventId = null) => ({ what, occasion, occasionDate, eventId });

test('lastGiftBefore: never a gift for an occasion still to come, same kind first', () => {
  const history = [ // newest first, as personHistory returns it
    gift('Lego', 'christmas', '2026-12-25'),
    gift('Scarf', 'christmas', '2025-12-25'),
    gift('Kindle', 'birthday', '2025-10-14'),
  ];
  assert.equal(lastGiftBefore({ occasion: 'birthday', date: '2026-10-14' }, history).what, 'Kindle');
  assert.equal(lastGiftBefore({ occasion: 'christmas', date: '2026-12-25' }, history).what, 'Scarf');
  assert.equal(lastGiftBefore({ occasion: 'birthday', date: '2026-01-05' }, [gift('Scarf', 'christmas', '2025-12-25')]).what, 'Scarf');
  assert.equal(lastGiftBefore({ occasion: 'christmas', date: '2025-12-25' }, history.slice(0, 2)), null);
});

test('lastGiftBefore: for a custom event, the same event counts as the same kind', () => {
  const history = [gift('Cake', 'event', '2026-02-01', 2), gift('Card', 'event', '2025-06-01', 1)];
  assert.equal(lastGiftBefore({ occasion: 'event', eventId: 1, date: '2026-06-01' }, history).what, 'Card');
});

test('upcomingSections: spend so far and the same occasion last year', () => {
  const db = openDb(':memory:');
  const amy = db.addPerson({ name: 'Amy' });
  const ben = db.addPerson({ name: 'Ben', birthday: '11-01' });
  db.addGift({ personId: amy.id, what: 'Scarf', occasion: 'christmas', occasionDate: '2025-12-25', costCents: 4500 });
  db.addGift({ personId: ben.id, what: 'Book', occasion: 'christmas', occasionDate: '2025-12-25', costCents: null });
  db.addGift({ personId: amy.id, what: 'Lego', occasion: 'christmas', occasionDate: '2026-12-25', costCents: 12900 });
  db.addGift({ personId: ben.id, what: 'Socks', occasion: 'birthday', occasionDate: '2025-11-01', costCents: null });
  const [bday, xmas] = upcomingSections(db, '2026-10-02', 90);
  assert.deepEqual([xmas.spentCents, xmas.lastYearCents], [12900, 4500]);
  assert.deepEqual([bday.spentCents, bday.lastYearCents], [0, null]); // no price logged last year
});

test('laterSections: occasions after the window up to a year ahead, none listed twice', () => {
  const db = openDb(':memory:');
  db.addPerson({ name: 'Amy', birthday: '03-14' });
  db.addEvent({ name: 'Lunar New Year', date: '2027-02-06', repeats: false });
  db.addEvent({ name: 'Far off', date: '2028-01-01', repeats: false });
  const today = '2026-10-02';
  const shown = upcomingSections(db, today, 90);
  assert.deepEqual(shown.map((s) => s.label), ['Christmas 2026']);
  assert.deepEqual(laterSections(db, today, 90, shown).map((s) => s.label), ['Lunar New Year 2027', "Amy's birthday 2027"]);
  // With nothing in the window the home page shows the next occasion; Later skips it.
  const quiet = '2027-01-01';
  const next = upcomingSections(db, quiet, 20);
  assert.deepEqual(next.map((s) => s.label), ['Lunar New Year 2027']);
  assert.deepEqual(laterSections(db, quiet, 20, next).map((s) => s.label), ["Amy's birthday 2027", 'Christmas 2027']);
});
