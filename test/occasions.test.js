import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  occurrenceInYear,
  defaultOccasionDate,
  upcomingOccasions,
  nextEventDate,
} from '../src/occasions.js';

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('occurrenceInYear: Christmas is 25 Dec', () => {
  assert.equal(occurrenceInYear('christmas', 2026), '2026-12-25');
});

test('occurrenceInYear: birthday uses the person\'s month and day', () => {
  assert.equal(occurrenceInYear('birthday', 2026, '03-14'), '2026-03-14');
});

test('occurrenceInYear: 29 Feb birthday falls on 28 Feb in non-leap years', () => {
  assert.equal(occurrenceInYear('birthday', 2027, '02-29'), '2027-02-28');
  assert.equal(occurrenceInYear('birthday', 2028, '02-29'), '2028-02-29');
});

test('occurrenceInYear: birthday without a date is null', () => {
  assert.equal(occurrenceInYear('birthday', 2026, null), null);
});

test('defaultOccasionDate: a gift bought ahead counts for the next occurrence', () => {
  assert.equal(defaultOccasionDate('christmas', '2026-11-20'), '2026-12-25');
  assert.equal(defaultOccasionDate('birthday', '2026-01-10', '02-03'), '2026-02-03');
});

test('defaultOccasionDate: a gift bought on the day counts for that day', () => {
  assert.equal(defaultOccasionDate('christmas', '2026-12-25'), '2026-12-25');
});

test('defaultOccasionDate: a late gift within 14 days counts for the occasion just passed', () => {
  assert.equal(defaultOccasionDate('christmas', '2027-01-05'), '2026-12-25');
  assert.equal(defaultOccasionDate('birthday', '2026-02-17', '02-03'), '2026-02-03');
});

test('defaultOccasionDate: more than 14 days after counts for the next one', () => {
  assert.equal(defaultOccasionDate('birthday', '2026-02-18', '02-03'), '2027-02-03');
});

test('defaultOccasionDate: birthday with no known date falls back to the gift date', () => {
  assert.equal(defaultOccasionDate('birthday', '2026-05-01', null), '2026-05-01');
});

const people = [
  { id: 1, name: 'Amy', birthday: '10-20', onChristmasList: true },
  { id: 2, name: 'Ben', birthday: null, onChristmasList: true },
  { id: 3, name: 'Cat', birthday: '01-05', onChristmasList: false },
];

test('upcomingOccasions: lists occasions within the window, soonest first', () => {
  const got = upcomingOccasions(people, '2026-10-02', 90);
  assert.deepEqual(got, [
    { occasion: 'birthday', date: '2026-10-20', personId: 1 },
    { occasion: 'christmas', date: '2026-12-25', personId: null },
  ]);
});

test('upcomingOccasions: includes an occasion that is today', () => {
  const got = upcomingOccasions(people, '2026-12-25', 1);
  assert.deepEqual(got[0], { occasion: 'christmas', date: '2026-12-25', personId: null });
});

test('upcomingOccasions: wraps into next year', () => {
  const got = upcomingOccasions(people, '2026-12-26', 30);
  assert.deepEqual(got, [{ occasion: 'birthday', date: '2027-01-05', personId: 3 }]);
});

test('upcomingOccasions: always returns at least the next occasion', () => {
  const got = upcomingOccasions(people, '2026-10-21', 7);
  assert.deepEqual(got, [{ occasion: 'christmas', date: '2026-12-25', personId: null }]);
});

test('upcomingOccasions: with nobody on the list there is still Christmas', () => {
  const got = upcomingOccasions([], '2026-10-02', 7);
  assert.deepEqual(got, [{ occasion: 'christmas', date: '2026-12-25', personId: null }]);
});

test('nextEventDate: a yearly event rolls over; a one-off ends once passed', () => {
  const yearly = { date: '2026-05-10', repeats: true };
  const once = { date: '2027-03-01', repeats: false };
  assert.equal(nextEventDate(yearly, '2026-10-02'), '2027-05-10');
  assert.equal(nextEventDate(yearly, '2027-05-10'), '2027-05-10');
  assert.equal(nextEventDate(once, '2026-10-02'), '2027-03-01');
  assert.equal(nextEventDate(once, '2027-03-02'), null);
});

test('defaultOccasionDate: events use their own date, with the late-gift rule for yearly ones', () => {
  assert.equal(defaultOccasionDate('event', '2026-05-20', null, { date: '2020-05-10', repeats: true }), '2026-05-10');
  assert.equal(defaultOccasionDate('event', '2026-06-01', null, { date: '2020-05-10', repeats: true }), '2027-05-10');
  assert.equal(defaultOccasionDate('event', '2026-01-01', null, { date: '2027-03-01', repeats: false }), '2027-03-01');
});

test('upcomingOccasions: custom events appear in the window; past one-offs do not', () => {
  const events = [
    { id: 1, date: '2020-11-01', repeats: true },
    { id: 2, date: '2026-01-01', repeats: false },
  ];
  const got = upcomingOccasions([], '2026-10-02', 90, events);
  assert.deepEqual(got.map((o) => [o.occasion, o.date, o.eventId]), [['event', '2026-11-01', 1], ['christmas', '2026-12-25', undefined]]);
});
