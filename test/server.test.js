import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';

let server, base, db;
let parseEntry = null;

before(async () => {
  db = openDb(':memory:');
  const app = createApp({ db, today: () => '2026-11-20', parseEntry: (...a) => parseEntry(...a) });
  server = createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, fields) =>
  fetch(base + path, { method: 'POST', body: new URLSearchParams(fields), redirect: 'manual' });
const flashOf = (res) => new URL(res.headers.get('location'), base).searchParams.get('flash');
const get = async (path) => (await fetch(base + path)).text();

test('home with an empty list says so and offers to add a gift', async () => {
  const html = await get('/');
  assert.match(html, /Your list is empty/);
  assert.match(html, /Add a gift/);
});

test('a new name asks for confirmation instead of silently creating a person', async () => {
  const res = await post('/gifts', { person: 'Amy', what: 'Scarf', occasion: 'christmas', cost: '25' });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /isn&#39;t on your list yet/);
  assert.equal(db.listPeople().length, 0);
});

test('confirmed new name saves the gift and Christmas 2026 shows them covered', async () => {
  const res = await post('/gifts', { person: 'Amy', what: 'Scarf', occasion: 'christmas', cost: '25', confirmNew: '1' });
  assert.equal(res.status, 303);
  const [gift] = db.listGifts();
  assert.equal(gift.occasionDate, '2026-12-25');
  assert.equal(gift.costCents, 2500);
  db.addPerson({ name: 'Ben' });
  const home = await get('/');
  assert.match(home, /Christmas 2026/);
  assert.match(home, /Still to buy \(1\)[\s\S]*Ben[\s\S]*Covered \(1\)[\s\S]*Amy/);
});

test('blank cost saves; unreadable cost saves blank and says so', async () => {
  let res = await post('/gifts', { person: 'Ben', what: 'Book', occasion: 'christmas', cost: '' });
  assert.equal(res.status, 303);
  res = await post('/gifts', { person: 'Ben', what: 'Mug', occasion: 'christmas', cost: 'about 20' });
  assert.match(flashOf(res), /isn't a number/);
  const ben = db.findPersonByName('Ben');
  assert.ok(db.listGifts().filter((g) => g.personId === ben.id).every((g) => g.costCents === null));
});

test('a second gift for the same person and occasion is kept and flagged', async () => {
  const res = await post('/gifts', { person: 'Amy', what: 'Gloves', occasion: 'christmas' });
  assert.match(flashOf(res), /Possible duplicate/);
  const amy = db.findPersonByName('Amy');
  const page = await get(`/people/${amy.id}`);
  assert.equal(page.match(/possible duplicate<\/span>/g).length, 2);
});

test('a person with no gifts shows "Nothing recorded yet" and a quick add', async () => {
  const cat = db.addPerson({ name: 'Cat' });
  const page = await get(`/people/${cat.id}`);
  assert.match(page, /Nothing recorded yet/);
  assert.match(page, /Add a gift for Cat/);
});

test('missing "what" is refused with the form kept filled in', async () => {
  const res = await post('/gifts', { person: 'Amy', what: '', occasion: 'christmas', cost: '9' });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /value="9"/);
});

test('type-to-log fills the form for review and does not save', async () => {
  parseEntry = async () => ({ person: 'Amy', what: 'Socks', occasion: 'birthday', cost: '' });
  const before = db.listGifts().length;
  const res = await post('/gifts/parse', { entry: 'socks for amy bday' });
  const html = await res.text();
  assert.match(html, /value="Socks"/);
  assert.match(html, /value="birthday" checked/);
  assert.equal(db.listGifts().length, before);
});

test('type-to-log failure falls back to the plain form', async () => {
  parseEntry = async () => { throw new Error('network down'); };
  const res = await post('/gifts/parse', { entry: 'socks for amy' });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Fill in the form below instead/);
});

test('page text is escaped', async () => {
  await post('/gifts', { person: '<b>Eve</b>', what: 'x', confirmNew: '1' });
  const eve = db.findPersonByName('<b>Eve</b>');
  assert.doesNotMatch(await get(`/people/${eve.id}`), /<b>Eve<\/b>/);
});
