import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonFor } from '../src/season.js';

test('season follows the date, with winter spanning the new year', () => {
  const at = (iso) => seasonFor(iso).key;
  assert.equal(at('2026-11-30'), 'autumn');
  assert.equal(at('2026-12-01'), 'winter');
  assert.equal(at('2027-01-06'), 'winter');
  assert.equal(at('2027-01-07'), 'spring');
  assert.equal(at('2027-04-30'), 'spring');
  assert.equal(at('2027-05-01'), 'summer');
  assert.equal(at('2027-08-31'), 'summer');
  assert.equal(at('2027-09-01'), 'autumn');
});
