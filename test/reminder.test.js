import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReminder } from '../src/reminder.js';

const amy = { id: 1, name: 'Amy' };
const ben = { id: 2, name: 'Ben Tan' };
const xmas = (missing, covered = []) => ({
  occ: { occasion: 'christmas', date: '2026-12-25', personId: null },
  label: 'Christmas 2026',
  covered,
  missing,
});
const appUrl = 'http://localhost:3000';

test('lists who is still to buy, with what they got last time', () => {
  const r = buildReminder({
    today: '2026-11-20',
    days: 60,
    appUrl,
    sections: [xmas(
      [{ person: ben, lastGift: { what: 'Scarf', occasion: 'christmas', occasionDate: '2025-12-25', costCents: 2500 } },
       { person: amy, lastGift: null }],
      [{ person: { id: 3, name: 'Cat' }, gifts: [] }],
    )],
  });
  assert.equal(r.subject, 'Gifts: 2 still to buy for Christmas 2026 (in 35 days)');
  assert.match(r.text, /Christmas 2026 · 25 Dec 2026 · in 35 days/);
  assert.match(r.text, /- Ben Tan \(last time: Scarf, Christmas 2025, S\$25\.00\)/);
  assert.match(r.text, /- Amy \(nothing recorded yet\)/);
  assert.match(r.text, /Covered: 1 of 3/);
  assert.match(r.text, /http:\/\/localhost:3000/);
});

test('several occasions: subject counts all open gifts', () => {
  const bday = {
    occ: { occasion: 'birthday', date: '2026-11-25', personId: 1 },
    label: "Amy's birthday 2026",
    covered: [],
    missing: [{ person: amy, lastGift: null }],
  };
  const r = buildReminder({ today: '2026-11-20', days: 60, appUrl, sections: [bday, xmas([{ person: ben, lastGift: null }])] });
  assert.equal(r.subject, 'Gifts: 2 still to buy across 2 occasions (next in 5 days)');
});

test('occasions outside the window are left out', () => {
  const r = buildReminder({ today: '2026-10-01', days: 30, appUrl, sections: [xmas([{ person: ben, lastGift: null }])] });
  assert.equal(r, null);
});

test('nothing open means no email', () => {
  const r = buildReminder({ today: '2026-11-20', days: 60, appUrl, sections: [xmas([], [{ person: amy, gifts: [] }])] });
  assert.equal(r, null);
});
