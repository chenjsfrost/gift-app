// Local web server. createApp() is the request handler, so tests can drive it
// with an in-memory database and a fixed "today".
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { defaultOccasionDate } from './occasions.js';
import { personHistory, withDuplicateFlags } from './coverage.js';
import { upcomingSections, localToday } from './upcoming.js';
import { parseCost } from './money.js';
import * as views from './views.js';
import { createEntryParser } from './ai/parse-entry.js';

export const HOME_WINDOW_DAYS = 60;


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

// Day + month selects -> 'MM-DD', or null when either is blank.
function birthdayFrom(f) {
  if (!f.bday || !f.bmonth) return null;
  const [d, m] = [Number(f.bday), Number(f.bmonth)];
  const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  if (!maxDay || d < 1 || d > maxDay) throw new Error('That birthday date doesn\'t exist.');
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
    if (req.method === 'GET' && path === '/people') {
      return send(res, 200, views.peoplePage({ people: db.listPeople(), flash }));
    }
    if (req.method === 'POST' && path === '/people') {
      const f = await readForm(req);
      try {
        const p = db.addPerson({ name: f.name, birthday: birthdayFrom(f), onChristmasList: f.christmas === '1' });
        return redirect(res, withFlash('/people', `Added ${p.name}.`));
      } catch (err) {
        return send(res, 400, views.peoplePage({ people: db.listPeople(), error: err.message }));
      }
    }
    if (req.method === 'POST' && (m = path.match(/^\/people\/(\d+)$/))) {
      const f = await readForm(req);
      try {
        const p = db.updatePerson(Number(m[1]), { birthday: birthdayFrom(f), onChristmasList: f.christmas === '1' });
        return redirect(res, withFlash('/people', `Saved ${p.name}.`));
      } catch (err) {
        return send(res, 400, views.peoplePage({ people: db.listPeople(), error: err.message }));
      }
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
  const parseEntry = process.env.ANTHROPIC_API_KEY ? createEntryParser() : null;
  createServer(createApp({ db, parseEntry })).listen(port, '127.0.0.1', () => {
    console.log(`Gift app running at http://localhost:${port}`);
    if (!parseEntry) console.log('Type-to-log is off: set ANTHROPIC_API_KEY in .env to turn it on.');
  });
}
