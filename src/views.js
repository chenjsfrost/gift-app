// HTML pages. Plain server-rendered forms, no client-side JavaScript.
import { formatCost } from './money.js';
import { daysBetween } from './occasions.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (iso) => (iso ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : '—');
const formatBirthday = (md) => (md ? `${Number(md.slice(3, 5))} ${MONTHS[Number(md.slice(0, 2)) - 1]}` : null);

export function occasionLabel(occasion, date, personName = null) {
  const year = date.slice(0, 4);
  if (occasion === 'christmas') return `Christmas ${year}`;
  return personName ? `${personName}'s birthday ${year}` : `Birthday ${year}`;
}

const whenLabel = (today, date) => {
  const d = daysBetween(today, date);
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
};

const giftUrl = (params) => `/gifts/new?${new URLSearchParams(params)}`;
const dupBadge = (g) => (g.possibleDuplicate ? ' <span class="badge">possible duplicate</span>' : '');

function layout(title, body, flash = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --bg:#fbfaf7; --fg:#1f1d1a; --muted:#6b665e; --line:#e4e0d8; --accent:#2f6b4f; --warn:#9a5b00; --warn-bg:#fff3dc; --card:#fff; }
  @media (prefers-color-scheme: dark) { :root { --bg:#171614; --fg:#ece8e1; --muted:#a39d93; --line:#34312c; --accent:#7cc4a0; --warn:#f0b757; --warn-bg:#3a2c12; --card:#1f1e1b; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 640px; margin: 0 auto; padding: 16px; }
  a { color: var(--accent); }
  nav { display:flex; gap:16px; margin-bottom: 8px; }
  h1 { font-size: 1.5rem; margin: 8px 0 16px; }
  h2 { font-size: 1.15rem; margin: 0 0 4px; }
  h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 16px 0 4px; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 8px 0; border-top: 1px solid var(--line); }
  li:first-child { border-top: 0; }
  .muted { color: var(--muted); font-size: .9rem; }
  .badge { background: var(--warn-bg); color: var(--warn); border-radius: 4px; padding: 0 6px; font-size: .8rem; white-space: nowrap; }
  .flash { background: var(--card); border-left: 4px solid var(--accent); padding: 8px 12px; margin-bottom: 16px; }
  .error { border-left-color: var(--warn); }
  .button, button { display:inline-block; background: var(--accent); color: var(--bg); border: 0; border-radius: 8px; padding: 10px 16px; font: inherit; text-decoration: none; cursor: pointer; }
  button.link { background: none; color: var(--accent); padding: 0; text-decoration: underline; }
  label { display:block; margin: 12px 0 4px; font-weight: 600; }
  input, select, textarea { width: 100%; padding: 10px; font: inherit; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--fg); }
  input[type=radio], input[type=checkbox] { width: auto; }
  .row { display:flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .row label { font-weight: 400; margin: 0; display:flex; gap: 6px; align-items:center; }
  details { margin-top: 12px; }
  form.inline { display: inline; }
</style>
</head>
<body><main>
<nav><a href="/">Home</a><a href="/gifts/new">Add a gift</a><a href="/people">People</a></nav>
${flash}
${body}
</main></body>
</html>`;
}

export const flashBox = (msg, kind = '') => (msg ? `<div class="flash ${kind}">${esc(msg)}</div>` : '');

// sections: [{ occ, label, covered, missing }] — missing entries carry lastGift.
export function homePage({ today, sections, peopleCount, flash }) {
  if (peopleCount === 0) {
    return layout(
      'Gifts',
      `<h1>Gifts</h1><section><p>Your list is empty. Add the people you give gifts to, or just log a gift and the name is added as you go.</p>
       <p><a class="button" href="/gifts/new">+ Add a gift</a> &nbsp; <a href="/people">Add people</a></p></section>`,
      flash,
    );
  }
  const body = sections
    .map(({ occ, label, covered, missing }) => {
      const prefill = { occasion: occ.occasion, occasionDate: occ.date };
      const missingList = missing.length
        ? missing
            .map(
              ({ person, lastGift }) => `<li><a href="/people/${person.id}">${esc(person.name)}</a>
                <a href="${esc(giftUrl({ ...prefill, person: person.name }))}">+ log gift</a>
                <div class="muted">${lastGift ? `Last time: ${esc(lastGift.what)} (${esc(occasionLabel(lastGift.occasion, lastGift.occasionDate))}, ${formatCost(lastGift.costCents)})` : 'Nothing recorded yet'}</div></li>`,
            )
            .join('')
        : '<li class="muted">Nobody left. Everyone is covered.</li>';
      const coveredList = covered.length
        ? covered
            .map(
              ({ person, gifts }) => `<li><a href="/people/${person.id}">${esc(person.name)}</a>
                <div class="muted">${gifts.map((g) => `${esc(g.what)}, ${formatCost(g.costCents)}${dupBadge(g)}`).join('<br>')}</div></li>`,
            )
            .join('')
        : '<li class="muted">Nobody yet.</li>';
      return `<section>
        <h2>${esc(label)}</h2>
        <div class="muted">${formatDate(occ.date)}, ${whenLabel(today, occ.date)}</div>
        <h3>Still to buy (${missing.length})</h3><ul>${missingList}</ul>
        <h3>Covered (${covered.length})</h3><ul>${coveredList}</ul>
      </section>`;
    })
    .join('');
  return layout('Gifts', `<h1>Gifts</h1><p><a class="button" href="/gifts/new">+ Add a gift</a></p>${body}`, flash);
}

export function personPage({ person, history, flash }) {
  const facts = [
    person.birthday ? `Birthday ${formatBirthday(person.birthday)}` : 'No birthday set',
    person.onChristmasList ? 'On the Christmas list' : 'Not on the Christmas list',
  ].join(' · ');
  const addUrl = giftUrl({ person: person.name });
  const list = history.length
    ? `<ul>${history
        .map(
          (g) => `<li><strong>${esc(occasionLabel(g.occasion, g.occasionDate))}</strong>: ${esc(g.what)}, ${formatCost(g.costCents)}${dupBadge(g)}
            <div class="muted">Bought ${formatDate(g.givenDate)} ·
              <form class="inline" method="post" action="/gifts/${g.id}/delete"><button class="link" type="submit">delete</button></form></div></li>`,
        )
        .join('')}</ul>`
    : `<p>Nothing recorded yet.</p>`;
  return layout(
    person.name,
    `<h1>${esc(person.name)}</h1>
     <p class="muted">${esc(facts)} · <a href="/people#p${person.id}">edit</a></p>
     <section><h2>Gift history</h2>${list}</section>
     <p><a class="button" href="${esc(addUrl)}">+ Add a gift for ${esc(person.name)}</a></p>`,
    flash,
  );
}

// values: { person, what, occasion, givenDate, cost, occasionDate, entry }
export function giftFormPage({ values, peopleNames, error, confirmNewPerson, notice, aiEnabled }) {
  const v = values;
  const radio = (val, label) =>
    `<label><input type="radio" name="occasion" value="${val}" ${v.occasion === val ? 'checked' : ''}> ${label}</label>`;
  const typeToLog = aiEnabled
    ? `<section>
        <form method="post" action="/gifts/parse">
          <label for="entry">Type it in one line</label>
          <input id="entry" name="entry" value="${esc(v.entry)}" placeholder="scarf for Amy, xmas, 25" autocomplete="off">
          <p><button type="submit">Fill in the form</button></p>
        </form>
      </section>`
    : '';
  return layout(
    'Add a gift',
    `<h1>Add a gift</h1>
     ${typeToLog}
     ${error ? flashBox(error, 'error') : ''}
     ${notice ? flashBox(notice) : ''}
     <form method="post" action="/gifts">
       <label for="person">Person</label>
       <input id="person" name="person" list="people" value="${esc(v.person)}" required autocomplete="off">
       <datalist id="people">${peopleNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
       ${
         confirmNewPerson
           ? `<div class="row" style="margin-top:8px"><label><input type="checkbox" name="confirmNew" value="1" required>
               Add "${esc(v.person)}" as a new person</label></div>`
           : ''
       }
       <label for="what">What</label>
       <input id="what" name="what" value="${esc(v.what)}" required autocomplete="off">
       <label>Occasion</label>
       <div class="row">${radio('christmas', 'Christmas')}${radio('birthday', 'Birthday')}</div>
       <label for="givenDate">Date bought</label>
       <input id="givenDate" name="givenDate" type="date" value="${esc(v.givenDate)}">
       <label for="cost">Cost (S$)</label>
       <input id="cost" name="cost" inputmode="decimal" value="${esc(v.cost)}" placeholder="Leave blank if unsure">
       <details ${v.occasionDate ? 'open' : ''}><summary>Which year's occasion is this for?</summary>
         <label for="occasionDate">Occasion date</label>
         <input id="occasionDate" name="occasionDate" type="date" value="${esc(v.occasionDate)}">
         <p class="muted">Leave blank to work it out: the next one after the date bought, or the one just passed if the gift is up to 14 days late.</p>
       </details>
       <p><button type="submit">Save</button></p>
     </form>`,
  );
}

function birthdayFields(md) {
  const [m, d] = md ? md.split('-').map(Number) : [0, 0];
  const opt = (val, label, sel) => `<option value="${val}" ${sel ? 'selected' : ''}>${label}</option>`;
  return `<select name="bday" aria-label="Birthday day">${opt('', 'Day', !d)}${Array.from({ length: 31 }, (_, i) => opt(i + 1, i + 1, d === i + 1)).join('')}</select>
    <select name="bmonth" aria-label="Birthday month">${opt('', 'Month', !m)}${MONTHS.map((n, i) => opt(i + 1, n, m === i + 1)).join('')}</select>`;
}

export function peoplePage({ people, flash, error }) {
  const rows = people.length
    ? people
        .map(
          (p) => `<li id="p${p.id}">
            <form method="post" action="/people/${p.id}">
              <a href="/people/${p.id}"><strong>${esc(p.name)}</strong></a>
              <div class="row" style="margin-top:6px">${birthdayFields(p.birthday)}
                <label><input type="checkbox" name="christmas" value="1" ${p.onChristmasList ? 'checked' : ''}> Christmas list</label>
                <button type="submit">Save</button></div>
            </form></li>`,
        )
        .join('')
    : '<li class="muted">Nobody yet.</li>';
  return layout(
    'People',
    `<h1>People</h1>
     ${error ? flashBox(error, 'error') : ''}
     <section><h2>Add someone</h2>
       <form method="post" action="/people">
         <label for="name">Name</label><input id="name" name="name" required autocomplete="off">
         <label>Birthday (optional)</label><div class="row">${birthdayFields(null)}</div>
         <div class="row" style="margin-top:12px"><label><input type="checkbox" name="christmas" value="1" checked> On the Christmas list</label></div>
         <p><button type="submit">Add</button></p>
       </form></section>
     <section><h2>Your list (${people.length})</h2><ul>${rows}</ul></section>`,
    flash,
  );
}

export function notFoundPage() {
  return layout('Not found', '<h1>Not found</h1><p><a href="/">Back home</a></p>');
}
