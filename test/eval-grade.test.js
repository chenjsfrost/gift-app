// Checks the eval's grader itself, so a score from `npm run eval` can be trusted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeDraft, oracleDraft } from '../eval/grade.mjs';
import { cleanDraft } from '../src/ai/parse-entry.js';

const { cases, people } = JSON.parse(readFileSync(new URL('../eval/cases.json', import.meta.url), 'utf8'));

test('cases: ids are unique and every case has a note and expected fields', () => {
  const ids = cases.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of cases) {
    assert.ok(c.note && c.expected && c.tags?.length, c.id);
    for (const k of Object.keys(c.expected))
      assert.ok(['person', 'what', 'whatKeywords', 'occasion', 'cost', 'givenDate', 'occasionDate'].includes(k), `${c.id}: ${k}`);
  }
});

test('oracle: the expected answer passes every metric on every case', () => {
  for (const c of cases) {
    const g = gradeDraft(oracleDraft(c.expected), c.expected);
    assert.ok(Object.values(g).every((v) => v === 1), `${c.id}: ${JSON.stringify(g)}`);
  }
});

test('oracle survives the app\'s own clean-up step', () => {
  // If cleanDraft would mangle a correct model answer, the eval would blame the model.
  for (const c of cases) {
    const e = { person: '', what: '', occasion: '', cost: '', givenDate: '', occasionDate: '', ...c.expected };
    const raw = { person: e.person, what: e.what, occasion: e.occasion, cost: e.cost, given_date: e.givenDate, occasion_date: e.occasionDate };
    const g = gradeDraft(cleanDraft(raw, c.note, people), c.expected);
    assert.equal(g.all_fields, 1, `${c.id}: ${JSON.stringify(g)}`);
  }
});

test('null: an empty draft fails the headline on every case that has something to find', () => {
  const fails = cases.filter((c) => gradeDraft({}, c.expected).all_fields === 0).length;
  assert.equal(fails, cases.length);
});

test('a made-up cost is caught by the guardrail metric', () => {
  const c = cases.find((x) => x.id === 'numbers-01'); // "2 mugs for Ben Tan, xmas"
  const g = gradeDraft({ ...oracleDraft(c.expected), cost: '2' }, c.expected);
  assert.equal(g.no_made_up_cost, 0);
  assert.equal(g.all_fields, 0);
});

test('wrong-but-plausible answers fail', () => {
  const c = cases.find((x) => x.id === 'basic-01'); // "scarf for Amy, xmas, 25"
  const ok = oracleDraft(c.expected);
  assert.equal(gradeDraft({ ...ok, person: 'Ben Tan' }, c.expected).person, 0);
  assert.equal(gradeDraft({ ...ok, what: 'scarf for Amy' }, c.expected).what, 0);
  assert.equal(gradeDraft({ ...ok, what: 'scarf 25' }, c.expected).what, 0);
  assert.equal(gradeDraft({ ...ok, occasion: 'birthday' }, c.expected).occasion, 0);
  assert.equal(gradeDraft({ ...ok, cost: '2.5' }, c.expected).cost, 0);
});

test('not over-strict: case, wording around the keyword, and number format are accepted', () => {
  const c = cases.find((x) => x.id === 'basic-02'); // Lego set, 89.90
  const g = gradeDraft({ person: 'sam', what: 'LEGO Star Wars set', occasion: 'birthday', cost: '89.9' }, c.expected);
  assert.equal(g.all_fields, 1, JSON.stringify(g));
});
