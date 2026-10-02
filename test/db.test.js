import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';

const fresh = () => openDb(':memory:');

test('people: add, list by name, and find by name ignoring case and spaces', () => {
  const db = fresh();
  db.addPerson({ name: 'Ben' });
  const amy = db.addPerson({ name: 'Amy', birthday: '10-20' });
  assert.deepEqual(amy, { id: amy.id, name: 'Amy', birthday: '10-20', onChristmasList: true });
  assert.deepEqual(db.listPeople().map((p) => p.name), ['Amy', 'Ben']);
  assert.equal(db.findPersonByName('  amy ').id, amy.id);
  assert.equal(db.findPersonByName('Zed'), null);
});

test('people: names must be unique and non-empty', () => {
  const db = fresh();
  db.addPerson({ name: 'Amy' });
  assert.throws(() => db.addPerson({ name: 'amy' }), /already/);
  assert.throws(() => db.addPerson({ name: '  ' }), /name/);
});

test('people: bad birthday is rejected, blank birthday is fine', () => {
  const db = fresh();
  assert.throws(() => db.addPerson({ name: 'A', birthday: '13-01' }), /birthday/);
  assert.equal(db.addPerson({ name: 'B', birthday: '' }).birthday, null);
});

test('people: update birthday and Christmas list', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const got = db.updatePerson(p.id, { birthday: '03-14', onChristmasList: false });
  assert.deepEqual(got, { id: p.id, name: 'Amy', birthday: '03-14', onChristmasList: false });
});

const giftFor = (personId, extra = {}) => ({
  personId, what: 'Scarf', occasion: 'christmas', occasionDate: '2026-12-25', givenDate: '2026-11-20', costCents: 2500, ...extra,
});

test('gifts: add and list', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const g = db.addGift(giftFor(p.id));
  assert.equal(g.what, 'Scarf');
  assert.deepEqual(db.listGifts(), [g]);
});

test('gifts: blank cost and blank given date are saved', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const g = db.addGift(giftFor(p.id, { costCents: null, givenDate: null }));
  assert.equal(g.costCents, null);
  assert.equal(g.givenDate, null);
});

test('gifts: the same person and occasion twice saves both', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  db.addGift(giftFor(p.id));
  db.addGift(giftFor(p.id));
  assert.equal(db.listGifts().length, 2);
});

test('gifts: missing person, missing what, or unknown occasion is rejected', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  assert.throws(() => db.addGift(giftFor(999)), /person/);
  assert.throws(() => db.addGift(giftFor(p.id, { what: ' ' })), /what/);
  assert.throws(() => db.addGift(giftFor(p.id, { occasion: 'easter' })), /occasion/);
});

test('gifts: delete one', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const g = db.addGift(giftFor(p.id));
  db.deleteGift(g.id);
  assert.deepEqual(db.listGifts(), []);
});
