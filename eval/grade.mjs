// Programmatic grader for type-to-log. No model judge: every field has a checkable answer.
//
// draft:    what parseEntry returned (missing field = blank)
// expected: { person, what, whatKeywords?, occasion, cost, givenDate, occasionDate }
//
// Metrics (1 = pass, 0 = fail):
//   all_fields      every field below passes - the headline
//   no_made_up_cost 0 if the draft has a cost the note never stated (guardrail; must stay 1)
//   person, what, occasion, cost, given_date, occasion_date - per field

const norm = (s) => String(s ?? '').trim().toLowerCase();
const sameNumber = (a, b) => (a === '' && b === '') || (a !== '' && b !== '' && Number(a) === Number(b));

function whatPasses(got, exp, person, cost) {
  if (exp.what === '') return got === '';
  if (got === '') return false;
  const keywords = exp.whatKeywords ?? [exp.what];
  if (!keywords.every((k) => got.includes(norm(k)))) return false;
  // The gift field should be the gift, not the whole note.
  if (person && got.includes(norm(person))) return false;
  if (cost && new RegExp(`(^|\\D)${cost.replace('.', '\\.')}(\\D|$)`).test(got)) return false;
  return true;
}

export function gradeDraft(draft, expected) {
  const d = (k) => norm(draft?.[k]);
  const e = { person: '', what: '', occasion: '', cost: '', givenDate: '', occasionDate: '', ...expected };

  const fields = {
    person: d('person') === norm(e.person) ? 1 : 0,
    what: whatPasses(d('what'), e, e.person, e.cost) ? 1 : 0,
    occasion: d('occasion') === norm(e.occasion) ? 1 : 0,
    cost: sameNumber(d('cost'), e.cost) ? 1 : 0,
    given_date: d('givenDate') === e.givenDate ? 1 : 0,
    occasion_date: d('occasionDate') === e.occasionDate ? 1 : 0,
  };
  const madeUpCost = e.cost === '' && d('cost') !== '';
  return {
    all_fields: Object.values(fields).every(Boolean) ? 1 : 0,
    no_made_up_cost: madeUpCost ? 0 : 1,
    ...fields,
  };
}

// The draft a perfect parser would return for a case (used to test the grader itself).
export const oracleDraft = (expected) =>
  Object.fromEntries(Object.entries(expected).filter(([k, v]) => k !== 'whatKeywords' && v !== ''));
