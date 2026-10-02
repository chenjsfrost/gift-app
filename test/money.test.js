import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCost, formatCost } from '../src/money.js';

test('parseCost: plain and decorated amounts become cents', () => {
  assert.equal(parseCost('25'), 2500);
  assert.equal(parseCost('25.5'), 2550);
  assert.equal(parseCost('S$ 12.99'), 1299);
  assert.equal(parseCost('$1,250'), 125000);
  assert.equal(parseCost('SGD 40'), 4000);
  assert.equal(parseCost(19.9), 1990);
});

test('parseCost: blank or unreadable is null, never an error', () => {
  for (const v of ['', '  ', null, undefined, 'abc', '-5', '5s']) assert.equal(parseCost(v), null, String(v));
});

test('parseCost: zero is a real cost (a free or handmade gift)', () => {
  assert.equal(parseCost('0'), 0);
});

test('formatCost: SGD with two decimals, blank shows a dash', () => {
  assert.equal(formatCost(2550), 'S$25.50');
  assert.equal(formatCost(0), 'S$0.00');
  assert.equal(formatCost(null), '—');
});
