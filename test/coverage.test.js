import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDuplicateFlags, coverage, personHistory } from '../src/coverage.js';

const amy = { id: 1, name: 'Amy', birthday: '10-20', onChristmasList: true };
const ben = { id: 2, name: 'Ben', birthday: null, onChristmasList: true };
const cat = { id: 3, name: 'Cat', birthday: '01-05', onChristmasList: false };
const people = [ben, cat, amy];

const gift = (id, personId, occasion, occasionDate, extra = {}) => ({
  id, personId, occasion, occasionDate, what: `gift ${id}`, givenDate: occasionDate, costCents: 1000, ...extra,
});

const xmas26 = { occasion: 'christmas', date: '2026-12-25', personId: null };

test('withDuplicateFlags: same person, occasion and date are both flagged', () => {
  const got = withDuplicateFlags([
    gift(1, 1, 'christmas', '2026-12-25'),
    gift(2, 1, 'christmas', '2026-12-25'),
    gift(3, 1, 'christmas', '2025-12-25'),
    gift(4, 2, 'christmas', '2026-12-25'),
  ]);
  assert.deepEqual(got.map((g) => g.possibleDuplicate), [true, true, false, false]);
});

test('withDuplicateFlags: does not change the input', () => {
  const input = [gift(1, 1, 'christmas', '2026-12-25')];
  withDuplicateFlags(input);
  assert.equal('possibleDuplicate' in input[0], false);
});

test('coverage: Christmas splits the Christmas list into covered and still to buy', () => {
  const got = coverage(xmas26, people, [gift(1, 1, 'christmas', '2026-12-25')]);
  assert.deepEqual(got.covered.map((c) => c.person.name), ['Amy']);
  assert.deepEqual(got.missing.map((p) => p.name), ['Ben']);
});

test('coverage: gifts for other occasions or other years do not count', () => {
  const got = coverage(xmas26, people, [
    gift(1, 1, 'christmas', '2025-12-25'),
    gift(2, 2, 'birthday', '2026-12-25'),
  ]);
  assert.deepEqual(got.covered, []);
  assert.deepEqual(got.missing.map((p) => p.name), ['Amy', 'Ben']);
});

test('coverage: someone off the Christmas list who got a gift still shows as covered', () => {
  const got = coverage(xmas26, people, [gift(1, 3, 'christmas', '2026-12-25')]);
  assert.deepEqual(got.covered.map((c) => c.person.name), ['Cat']);
  assert.deepEqual(got.missing.map((p) => p.name), ['Amy', 'Ben']);
});

test('coverage: a birthday only concerns that person', () => {
  const bday = { occasion: 'birthday', date: '2026-10-20', personId: 1 };
  assert.deepEqual(coverage(bday, people, []).missing.map((p) => p.name), ['Amy']);
  const got = coverage(bday, people, [gift(1, 1, 'birthday', '2026-10-20')]);
  assert.deepEqual(got.covered.map((c) => c.person.name), ['Amy']);
  assert.deepEqual(got.missing, []);
});

test('coverage: covered entries carry their gifts with duplicate flags', () => {
  const got = coverage(xmas26, people, [
    gift(1, 1, 'christmas', '2026-12-25'),
    gift(2, 1, 'christmas', '2026-12-25'),
  ]);
  assert.equal(got.covered[0].gifts.length, 2);
  assert.ok(got.covered[0].gifts.every((g) => g.possibleDuplicate));
});

test('personHistory: newest first, only that person', () => {
  const got = personHistory(1, [
    gift(1, 1, 'christmas', '2024-12-25'),
    gift(2, 2, 'christmas', '2026-12-25'),
    gift(3, 1, 'birthday', '2026-10-20'),
    gift(4, 1, 'christmas', '2025-12-25'),
  ]);
  assert.deepEqual(got.map((g) => g.id), [3, 4, 1]);
});

test('personHistory: empty when nothing recorded', () => {
  assert.deepEqual(personHistory(1, []), []);
});

test('personHistory: blank cost is kept as null', () => {
  const got = personHistory(1, [gift(1, 1, 'christmas', '2026-12-25', { costCents: null })]);
  assert.equal(got[0].costCents, null);
});
