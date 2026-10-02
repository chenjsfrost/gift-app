// Type-to-log: turn one typed line ("scarf for Amy, xmas, 25") into a draft for the
// gift form. Claude reads the line; plain code then enforces the rules that matter,
// so a wrong guess can never invent a cost or a date. The user always reviews and saves.
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5-5';

const SYSTEM = `You read one short note a person typed while buying a gift, and pull out the fields for their gift log.

Rules:
- person: the recipient's name as written. If it matches or clearly refers to a name on their list (different case, a typo, a possessive like "Amy's"), use the list spelling exactly. Otherwise keep it as typed. Empty if no recipient is named.
- what: the gift itself, short, in the note's words (e.g. "Lego set", "scarf"). Empty if not stated.
- occasion: "christmas" for Christmas/Xmas, "birthday" for birthday/bday. Empty if not stated.
- cost: the price only if the note states one, as a plain number with no currency (e.g. "25", "12.50"). Empty if no price is given. Never estimate a price.
- given_date: YYYY-MM-DD only if the note says when it was bought ("yesterday", "on 3 Nov"), worked out from today's date. Otherwise empty.
- occasion_date: YYYY-MM-DD only if the note names which year's Christmas ("last Christmas", "Christmas 2025"). Christmas is 25 December. Otherwise empty.
- If the note has more than one gift, use only the first one.
Never guess a field. Empty is always better than a guess.`;

const FIELDS = ['person', 'what', 'occasion', 'cost', 'given_date', 'occasion_date'];

const SCHEMA = {
  type: 'object',
  properties: {
    person: { type: 'string' },
    what: { type: 'string' },
    occasion: { type: 'string', enum: ['christmas', 'birthday', ''] },
    cost: { type: 'string' },
    given_date: { type: 'string' },
    occasion_date: { type: 'string' },
  },
  required: FIELDS,
  additionalProperties: false,
};

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Numbers written in the note, e.g. "S$25.50" -> ["25.50"], "1,200" -> ["1200"].
const numbersIn = (text) => (text.match(/\d[\d,]*(\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));

// Deterministic guard rails applied to whatever the model returned.
export function cleanDraft(raw, entry, peopleNames) {
  const str = (k) => (typeof raw?.[k] === 'string' ? raw[k].trim() : '');

  let person = str('person');
  const bare = person.toLowerCase().replace(/['’]s$/, '');
  const known = peopleNames.find((n) => n.toLowerCase() === bare);
  if (known) person = known;

  let cost = str('cost').replace(/^(sgd|s?\$)\s*/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cost) || !numbersIn(entry).some((n) => Number(n) === Number(cost))) cost = '';

  const occasion = ['christmas', 'birthday'].includes(str('occasion')) ? str('occasion') : '';
  const date = (k) => (ISO_DATE.test(str(k)) ? str(k) : '');

  return { person, what: str('what'), occasion, cost, givenDate: date('given_date'), occasionDate: date('occasion_date') };
}

export function createEntryParser({ client = new Anthropic({ timeout: 30_000, maxRetries: 1 }), model = MODEL } = {}) {
  return async function parseEntry(entry, { today, peopleNames }) {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: `Today is ${today}.\nPeople on their list: ${peopleNames.length ? peopleNames.join(', ') : '(none yet)'}\n\nNote: ${entry}`,
        },
      ],
    });
    if (response.stop_reason !== 'end_turn') throw new Error(`model stopped: ${response.stop_reason}`);
    const text = response.content.find((b) => b.type === 'text')?.text;
    if (!text) throw new Error('model returned no text');
    const draft = cleanDraft(JSON.parse(text), entry, peopleNames);
    // Only keep what the model actually found; the form fills in its own defaults.
    return Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== ''));
  };
}
