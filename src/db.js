// SQLite storage via Node's built-in node:sqlite. One file, one user.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { OCCASIONS } from './occasions.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    birthday TEXT,
    on_christmas_list INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS gifts (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES people(id),
    what TEXT NOT NULL,
    occasion TEXT NOT NULL,
    occasion_date TEXT NOT NULL,
    given_date TEXT,
    cost_cents INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BIRTHDAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const toPerson = (r) => r && { id: r.id, name: r.name, birthday: r.birthday, onChristmasList: r.on_christmas_list === 1 };
const toGift = (r) =>
  r && {
    id: r.id,
    personId: r.person_id,
    what: r.what,
    occasion: r.occasion,
    occasionDate: r.occasion_date,
    givenDate: r.given_date,
    costCents: r.cost_cents,
  };

function cleanBirthday(b) {
  if (b === undefined || b === null || b === '') return null;
  if (!BIRTHDAY.test(b)) throw new Error(`birthday must be MM-DD, got "${b}"`);
  return b;
}

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const getPerson = (id) => toPerson(db.prepare('SELECT * FROM people WHERE id = ?').get(id)) ?? null;
  const getGift = (id) => toGift(db.prepare('SELECT * FROM gifts WHERE id = ?').get(id)) ?? null;

  return {
    listPeople: () => db.prepare('SELECT * FROM people ORDER BY name').all().map(toPerson),
    getPerson,
    findPersonByName: (name) =>
      toPerson(db.prepare('SELECT * FROM people WHERE name = ?').get(String(name).trim())) ?? null,

    addPerson({ name, birthday = null, onChristmasList = true }) {
      const n = String(name ?? '').trim();
      if (!n) throw new Error('name is required');
      if (db.prepare('SELECT 1 FROM people WHERE name = ?').get(n)) throw new Error(`"${n}" is already on your list`);
      const { lastInsertRowid } = db
        .prepare('INSERT INTO people (name, birthday, on_christmas_list) VALUES (?, ?, ?)')
        .run(n, cleanBirthday(birthday), onChristmasList ? 1 : 0);
      return getPerson(lastInsertRowid);
    },

    updatePerson(id, { birthday, onChristmasList }) {
      const p = getPerson(id);
      if (!p) throw new Error('person not found');
      db.prepare('UPDATE people SET birthday = ?, on_christmas_list = ? WHERE id = ?').run(
        birthday === undefined ? p.birthday : cleanBirthday(birthday),
        (onChristmasList ?? p.onChristmasList) ? 1 : 0,
        id,
      );
      return getPerson(id);
    },

    listGifts: () => db.prepare('SELECT * FROM gifts ORDER BY id').all().map(toGift),
    getGift,

    addGift({ personId, what, occasion, occasionDate, givenDate = null, costCents = null }) {
      if (!getPerson(personId)) throw new Error('person not found');
      const w = String(what ?? '').trim();
      if (!w) throw new Error('what is required');
      if (!OCCASIONS.includes(occasion)) throw new Error(`unknown occasion "${occasion}"`);
      if (!ISO_DATE.test(occasionDate ?? '')) throw new Error('occasion date must be YYYY-MM-DD');
      if (givenDate && !ISO_DATE.test(givenDate)) throw new Error('given date must be YYYY-MM-DD');
      const { lastInsertRowid } = db
        .prepare(
          'INSERT INTO gifts (person_id, what, occasion, occasion_date, given_date, cost_cents) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(personId, w, occasion, occasionDate, givenDate || null, costCents ?? null);
      return getGift(lastInsertRowid);
    },

    deleteGift: (id) => db.prepare('DELETE FROM gifts WHERE id = ?').run(id),
  };
}
