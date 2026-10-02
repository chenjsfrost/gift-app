// Local web server. createApp() is the request handler, so tests can drive it
// with an in-memory database and a fixed "today".
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { defaultOccasionDate, upcomingOccasions } from './occasions.js';
import { coverage, personHistory, withDuplicateFlags } from './coverage.js';
import { parseCost } from './money.js';
import * as views from './views.js';

export const HOME_WINDOW_DAYS = 60;

const localToday = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

async function readForm(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return Object.fromEntries(new URLSearchParams(body));
}

const send = (res, status, html) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
};
const redirect = (res, location) => {
  res.writeHead(303, { Location: location });
  res.end();
};
const withFlash = (path, msg) => `${path}?${new URLSearchParams({ flash: msg })}`;

// Upcoming occasions with covered / still-to-buy, shared by the home page and the reminder.
export function upcomingSections(db, today, days) {
  const people = db.listPeople();
  const gifts = db.listGifts();
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  return upcomingOccasions(people, today, days).map((occ) => {
    const { covered, missing } = coverage(occ, people, gifts);
    return {
      occ,
      label: views.occasionLabel(occ.occasion, occ.date, nameOf.get(occ.personId)),
      covered,
      missing: missing.map((person) => ({ person, lastGift: personHistory(person.id, gifts)[0] ?? null })),
    };
  });
}

export function createApp({ db, today = localToday, parseEntry = null }) {
  const peopleNames = () => db.listPeople().map((p) => p.name);

  const giftForm = (res, values, extra = {}) =>
    send(res, extra.status ?? 200, views.giftFormPage({ values, peopleNames: peopleNames(), aiEnabled: !!parseEntry, ...extra }));

  const emptyValues = () => ({ person: '', what: '', occasion: 'christmas', givenDate: today(), cost: '', occasionDate: '', entry: '' });

  async function saveGift(req, res) {
    const f = await readForm(req);
    const values = { ...emptyValues(), ...f };
    const name = (f.person ?? '').trim();
    if (!name) return giftForm(res, values, { status: 400, error: 'Who is this gift for?' });

    let person = db.findPersonByName(name);
    if (!person && f.confirmNew !== '1') {
      return giftForm(res, values, { confirmNewPerson: true, notice: `"${name}" isn't on your list yet. Tick the box to add them, or fix the spelling.` });
    }
    try {
      person ??= db.addPerson({ name });
      const occasion = f.occasion || 'christmas';
      const givenDate = f.givenDate || today();
      const occasionDate = f.occasionDate || defaultOccasionDate(occasion, givenDate, person.birthday);
      const costCents = parseCost(f.cost);
      const gift = db.addGift({ personId: person.id, what: f.what, occasion, occasionDate, givenDate, costCents });

      const notes = [`Saved: ${gift.what} for ${person.name} (${views.occasionLabel(occasion, occasionDate)}).`];
      if (costCents === null && (f.cost ?? '').trim()) notes.push(`"${f.cost}" isn't a number, so the cost was left blank.`);
      const flagged = withDuplicateFlags(db.listGifts()).find((g) => g.id === gift.id);
      if (flagged.possibleDuplicate) notes.push(`Possible duplicate: ${person.name} already has a gift logged for this occasion. Both are kept.`);
      return redirect(res, withFlash('/', notes.join(' ')));
    } catch (err) {
      return giftForm(res, values, { status: 400, error: err.message });
    }
  }

  async function parseGift(req, res) {
    const f = await readForm(req);
    const entry = (f.entry ?? '').trim();
    const base = { ...emptyValues(), entry };
    if (!entry) return giftForm(res, base);
    try {
      const draft = await parseEntry(entry, { today: today(), peopleNames: peopleNames() });
      const known = draft.person && db.findPersonByName(draft.person);
      return giftForm(res, { ...base, ...draft }, {
        confirmNewPerson: !!draft.person && !known,
        notice: 'Check the details, then save.',
      });
    } catch (err) {
      console.error('type-to-log failed:', err.message);
      return giftForm(res, base, { error: "Couldn't read that automatically. Fill in the form below instead." });
    }
  }

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const flash = views.flashBox(url.searchParams.get('flash'));
    let m;

    if (req.method === 'GET' && path === '/') {
      return send(res, 200, views.homePage({
        today: today(),
        sections: upcomingSections(db, today(), HOME_WINDOW_DAYS),
        peopleCount: db.listPeople().length,
        flash,
      }));
    }
    if (req.method === 'GET' && path === '/gifts/new') {
      const q = Object.fromEntries(url.searchParams);
      return giftForm(res, { ...emptyValues(), ...q });
    }
    if (req.method === 'POST' && path === '/gifts') return saveGift(req, res);
    if (req.method === 'POST' && path === '/gifts/parse' && parseEntry) return parseGift(req, res);
    if (req.method === 'POST' && (m = path.match(/^\/gifts\/(\d+)\/delete$/))) {
      const gift = db.getGift(Number(m[1]));
      if (!gift) return send(res, 404, views.notFoundPage());
      db.deleteGift(gift.id);
      return redirect(res, withFlash(`/people/${gift.personId}`, `Deleted: ${gift.what}.`));
    }
    if (req.method === 'GET' && (m = path.match(/^\/people\/(\d+)$/))) {
      const person = db.getPerson(Number(m[1]));
      if (!person) return send(res, 404, views.notFoundPage());
      return send(res, 200, views.personPage({ person, history: personHistory(person.id, db.listGifts()), flash }));
    }
    return send(res, 404, views.notFoundPage());
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb(process.env.DB_PATH ?? 'data/gifts.db');
  const port = Number(process.env.PORT ?? 3000);
  createServer(createApp({ db })).listen(port, '127.0.0.1', () => {
    console.log(`Gift app running at http://localhost:${port}`);
  });
}
