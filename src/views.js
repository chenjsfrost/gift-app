// HTML pages. Plain server-rendered forms, no client-side JavaScript.
import { formatCost } from './money.js';
import { daysBetween, nextEventDate } from './occasions.js';
import { seasonFor } from './season.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (iso) => (iso ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : '—');
const formatBirthday = (md) => (md ? `${Number(md.slice(3, 5))} ${MONTHS[Number(md.slice(0, 2)) - 1]}` : null);

// name: the person's name for a birthday, or the event's name for a custom event.
export function occasionLabel(occasion, date, name = null) {
  const year = date.slice(0, 4);
  if (occasion === 'christmas') return `Christmas ${year}`;
  if (occasion === 'event') return `${name ?? 'Event'} ${year}`;
  const personName = name;
  return personName ? `${personName}'s birthday ${year}` : `Birthday ${year}`;
}

const whenLabel = (today, date) => {
  const d = daysBetween(today, date);
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
};

const giftUrl = (params) => `/gifts/new?${new URLSearchParams(params)}`;
const dupBadge = (g) => (g.possibleDuplicate ? ' <span class="badge">possible duplicate</span>' : '');

// A few falling flakes, petals, drops or leaves behind the page. CSS only, fixed
// positions (no randomness), so pages render the same every time.
const PARTICLES = 14;
function sky(season) {
  const bits = Array.from({ length: PARTICLES }, (_, i) => {
    const x = (i * 37 + 11) % 100;
    const dur = 11 + ((i * 7) % 9);
    const delay = -((i * 5.3) % dur).toFixed(1);
    const size = 0.6 + ((i * 3) % 5) / 10;
    return `<span style="--x:${x}%;--dur:${dur}s;--delay:${delay}s;--size:${size.toFixed(1)}"></span>`;
  });
  return `<div class="sky sky-${season.key}" aria-hidden="true">${bits.join('')}</div>`;
}

function layout(title, body, flash = '', season = seasonFor(new Date().toLocaleDateString('en-CA'))) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap">
<style>
  :root { --bg:#fbfaf7; --bg2:#f3efe6; --fg:#2a2622; --muted:#6e675d; --line:#e8e2d6; --accent:#2f6b4f; --accent2:#c0392b; --on-accent:#fff; --warn:#9a5b00; --warn-bg:#fff3dc; --card:#fff; --particle:#c9d6e3; }
  .s-winter { --bg:#f4f7fb; --bg2:#e6eef7; --accent:#b8322a; --accent2:#2f6b4f; --particle:#bfd0e2; }
  .s-spring { --bg:#fdf8f9; --bg2:#f9e9ee; --accent:#b44a6e; --accent2:#5a8a4a; --particle:#f2b8c9; }
  .s-summer { --bg:#f6fafa; --bg2:#e3f0f1; --accent:#1f7a80; --accent2:#e0a526; --particle:#9cc7cc; }
  .s-autumn { --bg:#fcf8f2; --bg2:#f5e9d8; --accent:#b4562a; --accent2:#7a8a2e; --particle:#d9925a; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#171614; --bg2:#201e1b; --fg:#ece8e1; --muted:#a39d93; --line:#34312c; --accent:#7cc4a0; --accent2:#e88a7f; --on-accent:#171614; --warn:#f0b757; --warn-bg:#3a2c12; --card:#1f1e1b; --particle:#4a4740; }
    .s-winter { --bg:#121720; --bg2:#18202c; --card:#1b222d; --line:#2c3644; --accent:#f08a80; --accent2:#7cc4a0; --particle:#e8eef6; }
    .s-spring { --bg:#1a1517; --bg2:#231b1f; --card:#221c1f; --line:#3a2f34; --accent:#f0a0bb; --accent2:#9cc78a; --particle:#e8a3b8; }
    .s-summer { --bg:#121a1b; --bg2:#172224; --card:#1a2325; --line:#2c3a3c; --accent:#6fc7cd; --accent2:#f0c35a; --particle:#5c8f94; }
    .s-autumn { --bg:#1a1612; --bg2:#231d17; --card:#221d18; --line:#3a3128; --accent:#f0a070; --accent2:#c3cf6e; --particle:#b8703c; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; background: linear-gradient(180deg, var(--bg2), var(--bg) 320px); color:var(--fg); font:16px/1.55 Nunito, ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; padding: 16px; }
  a { color: var(--accent); font-weight: 600; }
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom: 12px; }
  .brand { font-weight: 800; font-size: 1.2rem; color: var(--fg); text-decoration: none; }
  nav { display:flex; gap:4px; background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 4px; }
  nav a { text-decoration:none; padding: 6px 12px; border-radius: 999px; color: var(--fg); }
  nav a:hover { background: var(--bg2); }
  .greeting { color: var(--muted); margin: 0 0 16px; }
  h1 { font-size: 1.6rem; font-weight: 800; margin: 8px 0 8px; }
  h2 { font-size: 1.2rem; font-weight: 800; margin: 0 0 4px; }
  h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 16px 0 4px; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-bottom: 16px; box-shadow: 0 2px 10px rgb(0 0 0 / .04); }
  section.occ { border-top: 4px solid var(--accent); }
  section.occ.birthday { border-top-color: var(--accent2); }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 8px 0; border-top: 1px dashed var(--line); }
  li:first-child { border-top: 0; }
  .muted { color: var(--muted); font-size: .9rem; font-weight: 400; }
  .badge { background: var(--warn-bg); color: var(--warn); border-radius: 999px; padding: 0 8px; font-size: .8rem; white-space: nowrap; }
  .flash { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }
  .error { border-left-color: var(--warn); }
  .button, button { display:inline-block; background: var(--accent); color: var(--on-accent); border: 0; border-radius: 999px; padding: 10px 18px; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; transition: transform .15s ease, filter .15s ease; }
  .button:hover, button:hover { filter: brightness(1.08); transform: translateY(-1px); }
  button.link { background: none; color: var(--accent); padding: 0; text-decoration: underline; font-weight: 600; }
  button.link:hover { transform: none; }
  label { display:block; margin: 12px 0 4px; font-weight: 700; }
  input, select, textarea { width: 100%; padding: 10px 12px; font: inherit; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--fg); }
  input:focus, select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  input[type=radio], input[type=checkbox] { width: auto; accent-color: var(--accent); }
  .row { display:flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .row label { font-weight: 400; margin: 0; display:flex; gap: 6px; align-items:center; }
  details { margin-top: 12px; }
  form.inline { display: inline; }

  /* Pill toggles for lists: a hidden checkbox inside a label. */
  .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top: 4px; }
  .chip { position: relative; display:inline-flex; align-items:center; gap:6px; margin:0; padding: 6px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--bg); font-weight: 600; cursor: pointer; user-select: none; transition: background .15s ease, color .15s ease; }
  .chip input { position:absolute; opacity:0; width:1px; height:1px; }
  .chip:has(input:checked) { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .chip:has(input:checked)::before { content: "✓"; }
  .chip:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* Birthday picker: day and month side by side, with a cake. */
  .bday { display:flex; align-items:center; gap:8px; padding: 6px 8px 6px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--bg); width: fit-content; max-width: 100%; }
  .bday select { width: auto; border: 0; background-color: var(--card); padding: 8px 32px 8px 12px; appearance: none; -webkit-appearance: none; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23948c80' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; }
  .bday .cake { font-size: 1.2rem; }

  /* People and event cards. */
  .card-list > li { padding: 14px 0; }
  .who { display:flex; align-items:center; gap: 12px; }
  .avatar { flex: none; width: 40px; height: 40px; border-radius: 50%; display:grid; place-items:center; font-weight: 800; color: var(--on-accent); background: var(--accent); }
  .card-list > li:nth-child(3n+2) .avatar { background: var(--accent2); }
  .card-list > li:nth-child(3n) .avatar { background: var(--muted); }
  .tags { display:flex; flex-wrap:wrap; gap:6px; margin-top: 4px; }
  .tag { font-size: .8rem; padding: 1px 10px; border-radius: 999px; background: var(--bg2); color: var(--fg); }
  .tag.none { color: var(--muted); }
  .edit { margin: 10px 0 0 52px; }
  .edit summary { cursor: pointer; color: var(--accent); font-weight: 600; font-size: .9rem; }
  .edit[open] summary { margin-bottom: 4px; }
  .actions { display:flex; gap: 12px; align-items:center; flex-wrap: wrap; margin-top: 12px; }

  /* Falling things: few, small, slow, behind the cards. Off for reduced motion. */
  .sky { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
  .sky span { position: absolute; top: -24px; left: var(--x); width: calc(10px * var(--size)); height: calc(10px * var(--size));
    background: var(--particle); opacity: .75; animation: fall var(--dur) linear var(--delay) infinite; }
  .sky-winter span { border-radius: 50%; }
  .sky-spring span { border-radius: 70% 0 70% 0; animation-name: fall, spin; animation-duration: var(--dur), calc(var(--dur) / 2); }
  .sky-autumn span { width: calc(13px * var(--size)); border-radius: 0 80% 0 80%; animation-name: fall, spin; animation-duration: var(--dur), calc(var(--dur) / 2); }
  .sky-summer span { width: 2px; height: calc(16px * var(--size)); border-radius: 2px; opacity: .45; animation-duration: calc(var(--dur) / 4); }
  @keyframes fall {
    0% { transform: translate(0, 0); }
    50% { transform: translate(24px, 52vh); }
    100% { transform: translate(-8px, 105vh); }
  }
  @keyframes spin { to { rotate: 360deg; } }
  @media (prefers-reduced-motion: reduce) { .sky { display: none; } .button, button { transition: none; } }
</style>
</head>
<body class="s-${season.key}">
${sky(season)}
<main>
<header>
  <a class="brand" href="/">🎁 Gift log ${season.emoji}</a>
  <nav><a href="/">Home</a><a href="/gifts/new">Add a gift</a><a href="/people">People</a><a href="/events">Events</a></nav>
</header>
${flash}
${body}
</main></body>
</html>`;
}

export const flashBox = (msg, kind = '') => (msg ? `<div class="flash ${kind}">${esc(msg)}</div>` : '');

// sections: [{ occ, label, covered, missing }] — missing entries carry lastGift.
export function homePage({ today, sections, peopleCount, flash, season }) {
  if (peopleCount === 0) {
    return layout(
      'Gifts',
      `<h1>Gifts</h1><p class="greeting">${esc(season.greeting)}</p><section><p>Your list is empty. Add the people you give gifts to, or just log a gift and the name is added as you go.</p>
       <p><a class="button" href="/gifts/new">+ Add a gift</a> &nbsp; <a href="/people">Add people</a></p></section>`,
      flash,
      season,
    );
  }
  const body = sections
    .map(({ occ, label, covered, missing }) => {
      const prefill = { occasion: occ.occasion === 'event' ? `event:${occ.eventId}` : occ.occasion, occasionDate: occ.date };
      const missingList = missing.length
        ? missing
            .map(
              ({ person, lastGift }) => `<li><a href="/people/${person.id}">${esc(person.name)}</a>
                <a href="${esc(giftUrl({ ...prefill, person: person.name }))}">+ log gift</a>
                <div class="muted">${lastGift ? `Last time: ${esc(lastGift.what)} (${esc(occasionLabel(lastGift.occasion, lastGift.occasionDate, lastGift.eventName))}, ${formatCost(lastGift.costCents)})` : 'Nothing recorded yet'}</div></li>`,
            )
            .join('')
        : '<li class="muted">Nobody left. Everyone is covered.</li>';
      const coveredList = covered.length
        ? covered
            .map(
              ({ person, gifts }) => `<li>✓ <a href="/people/${person.id}">${esc(person.name)}</a>
                <div class="muted">${gifts.map((g) => `${esc(g.what)}, ${formatCost(g.costCents)}${dupBadge(g)}`).join('<br>')}</div></li>`,
            )
            .join('')
        : '<li class="muted">Nobody yet.</li>';
      const icon = { christmas: '🎄', birthday: '🎂', event: '🎉' }[occ.occasion];
      return `<section class="occ ${occ.occasion}">
        <h2>${icon} ${esc(label)}</h2>
        <div class="muted">${formatDate(occ.date)}, ${whenLabel(today, occ.date)}</div>
        <h3>🎁 Still to buy (${missing.length})</h3><ul>${missingList}</ul>
        <h3>Covered (${covered.length})</h3><ul>${coveredList}</ul>
      </section>`;
    })
    .join('');
  return layout(
    'Gifts',
    `<h1>Gifts</h1><p class="greeting">${esc(season.greeting)}</p><p><a class="button" href="/gifts/new">+ Add a gift</a></p>${body}`,
    flash,
    season,
  );
}

export function personPage({ person, history, flash, season, events = [] }) {
  const onEvents = events.filter((e) => person.eventIds?.includes(e.id)).map((e) => e.name);
  const facts = [
    person.birthday ? `Birthday ${formatBirthday(person.birthday)}` : 'No birthday set',
    person.onChristmasList ? 'On the Christmas list' : 'Not on the Christmas list',
    ...(onEvents.length ? [`Also on: ${onEvents.join(', ')}`] : []),
  ].join(' · ');
  const addUrl = giftUrl({ person: person.name });
  const list = history.length
    ? `<ul>${history
        .map(
          (g) => `<li><strong>${esc(occasionLabel(g.occasion, g.occasionDate, g.eventName))}</strong>: ${esc(g.what)}, ${formatCost(g.costCents)}${dupBadge(g)}
            <div class="muted">Bought ${formatDate(g.givenDate)} ·
              <form class="inline" method="post" action="/gifts/${g.id}/delete"><button class="link" type="submit">delete</button></form></div></li>`,
        )
        .join('')}</ul>`
    : `<p>Nothing recorded yet.</p>`;
  return layout(
    person.name,
    `<h1>${esc(person.name)}</h1>
     <p class="muted">${esc(facts)} · <a href="/people?edit=${person.id}#p${person.id}">edit</a></p>
     <section><h2>Gift history</h2>${list}</section>
     <p><a class="button" href="${esc(addUrl)}">+ Add a gift for ${esc(person.name)}</a></p>`,
    flash,
    season,
  );
}

// values: { person, what, occasion, givenDate, cost, occasionDate, entry }
export function giftFormPage({ values, peopleNames, error, confirmNewPerson, notice, aiEnabled, season, events = [] }) {
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
     <section><form method="post" action="/gifts">
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
       <div class="row">${radio('christmas', 'Christmas')}${radio('birthday', 'Birthday')}${events.map((e) => radio(`event:${e.id}`, esc(e.name))).join('')}</div>
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
     </form></section>`,
    '',
    season,
  );
}

function birthdayFields(md) {
  const [m, d] = md ? md.split('-').map(Number) : [0, 0];
  const opt = (val, label, sel) => `<option value="${val}" ${sel ? 'selected' : ''}>${label}</option>`;
  return `<div class="bday"><span class="cake" aria-hidden="true">🎂</span>
    <select name="bday" aria-label="Birthday day">${opt('', 'Day', !d)}${Array.from({ length: 31 }, (_, i) => opt(i + 1, i + 1, d === i + 1)).join('')}</select>
    <select name="bmonth" aria-label="Birthday month">${opt('', 'Month', !m)}${MONTHS.map((n, i) => opt(i + 1, n, m === i + 1)).join('')}</select></div>`;
}

const chip = (name, label, checked) =>
  `<label class="chip"><input type="checkbox" name="${name}" value="1" ${checked ? 'checked' : ''}>${label}</label>`;

// Christmas plus every custom event, as pill toggles.
const listChips = (events, { onChristmasList, eventIds = [] }) =>
  `<div class="chips">${chip('christmas', '🎄 Christmas', onChristmasList)}${events
    .map((e) => chip(`event_${e.id}`, `🎉 ${esc(e.name)}`, eventIds.includes(e.id)))
    .join('')}</div>`;

const initial = (name) => esc([...name.trim()][0]?.toUpperCase() ?? '?');

export function peoplePage({ people, events = [], flash, error, season, openId = null }) {
  const rows = people.length
    ? people
        .map((p) => {
          const tags = [
            p.birthday ? `🎂 ${formatBirthday(p.birthday)}` : null,
            p.onChristmasList ? '🎄 Christmas' : null,
            ...events.filter((e) => p.eventIds?.includes(e.id)).map((e) => `🎉 ${esc(e.name)}`),
          ].filter(Boolean);
          return `<li id="p${p.id}">
            <div class="who"><span class="avatar" aria-hidden="true">${initial(p.name)}</span>
              <div><a href="/people/${p.id}"><strong>${esc(p.name)}</strong></a>
                <div class="tags">${tags.length ? tags.map((t) => `<span class="tag">${t}</span>`).join('') : '<span class="tag none">No birthday or lists yet</span>'}</div></div></div>
            <details class="edit" ${openId === p.id ? 'open' : ''}><summary>Edit birthday and lists</summary>
              <form method="post" action="/people/${p.id}">
                <label>Birthday</label>${birthdayFields(p.birthday)}
                <label>Lists</label>${listChips(events, p)}
                <div class="actions"><button type="submit">Save</button></div>
              </form></details></li>`;
        })
        .join('')
    : '<li class="muted">Nobody yet.</li>';
  return layout(
    'People',
    `<h1>People</h1>
     ${error ? flashBox(error, 'error') : ''}
     <section><h2>Add someone</h2>
       <form method="post" action="/people">
         <label for="name">Name</label><input id="name" name="name" required autocomplete="off">
         <label>Birthday (optional)</label>${birthdayFields(null)}
         <label>Lists</label>${listChips(events, { onChristmasList: true })}
         <div class="actions"><button type="submit">Add</button>
           ${events.length ? '' : '<span class="muted">Want more lists? <a href="/events">Create an event</a>.</span>'}</div>
       </form></section>
     <section><h2>Your list (${people.length})</h2><ul class="card-list">${rows}</ul></section>`,
    flash,
    season,
  );
}

const repeatLabel = (e) => (e.repeats ? `every year on ${formatBirthday(e.date.slice(5))}` : `once, on ${formatDate(e.date)}`);

function eventFields(e, people) {
  const members = e ? people.filter((p) => p.eventIds?.includes(e.id)) : [];
  return `<label for="ename${e?.id ?? ''}">Name</label>
    <input id="ename${e?.id ?? ''}" name="name" value="${esc(e?.name)}" placeholder="Mother's Day, Lunar New Year, Wedding…" required autocomplete="off">
    <label for="edate${e?.id ?? ''}">Date</label>
    <input id="edate${e?.id ?? ''}" name="date" type="date" value="${esc(e?.date)}" required>
    <div class="chips" style="margin-top:8px">${chip('repeats', '🔁 Every year', e ? e.repeats : true)}</div>
    <label>Who's on this list</label>
    ${people.length
      ? `<div class="chips">${people.map((p) => chip(`person_${p.id}`, esc(p.name), members.includes(p))).join('')}</div>`
      : '<p class="muted">Nobody on your list yet. <a href="/people">Add people</a> first, or tick this event when you add them.</p>'}`;
}

export function eventsPage({ events, people, today, flash, error, season, openId = null }) {
  const rows = events.length
    ? events
        .map((e) => {
          const next = nextEventDate(e, today);
          const members = people.filter((p) => p.eventIds?.includes(e.id));
          return `<li id="e${e.id}">
            <div class="who"><span class="avatar" aria-hidden="true">🎉</span>
              <div><strong>${esc(e.name)}</strong>
                <div class="muted">${esc(repeatLabel(e))}${next ? ` · next ${formatDate(next)}, ${whenLabel(today, next)}` : ' · already passed'}</div>
                <div class="tags">${members.length ? members.map((p) => `<span class="tag">${esc(p.name)}</span>`).join('') : '<span class="tag none">Nobody on this list yet</span>'}</div></div></div>
            <details class="edit" ${openId === e.id ? 'open' : ''}><summary>Edit event and list</summary>
              <form method="post" action="/events/${e.id}">${eventFields(e, people)}
                <div class="actions"><button type="submit">Save</button></div></form>
              <form method="post" action="/events/${e.id}/delete" style="margin-top:8px"><button class="link" type="submit">Delete this event</button></form>
            </details></li>`;
        })
        .join('')
    : '<li class="muted">No events yet. Christmas and birthdays are already built in.</li>';
  return layout(
    'Events',
    `<h1>Events</h1>
     <p class="greeting">Christmas and birthdays are built in. Add anything else you give gifts for.</p>
     ${error ? flashBox(error, 'error') : ''}
     <section><h2>Add an event</h2>
       <form method="post" action="/events">${eventFields(null, people)}
         <div class="actions"><button type="submit">Add event</button></div></form></section>
     <section><h2>Your events (${events.length})</h2><ul class="card-list">${rows}</ul></section>`,
    flash,
    season,
  );
}

export function notFoundPage({ season } = {}) {
  return layout('Not found', '<h1>Not found</h1><p><a href="/">Back home</a></p>', '', season);
}
