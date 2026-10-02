# Gift App

One place to check who you gave what to, when you gave it, and roughly how much it cost, so you don't have to remember it before the next occasion.

## Success measure

- **Outcome:** before an occasion, I can say who I've already given to, what I gave, when, and roughly what it cost, using the app instead of my memory.
- **Baseline (fill in before using):** for Christmas 2025, I can recall this for ___ of ___ people.
- **Target:** for **Christmas 2026 (25 Dec 2026)**, every person on my list can be answered from the app.
- **Guardrail:** the time and money I spend on gifts must not go up.
- **Riskiest assumption:** that I'll log each gift as I buy it, with no one chasing me.
- **Pass mark:** I log every gift for Christmas 2026. At my next occasion, I answer "what did I give this person last time?" from the app.

## Run

Needs Node 24 or newer. It runs locally on your PC.

```
npm install
cp .env.example .env    # then fill it in
npm start               # http://localhost:3000
npm test                # tests for the core logic
npm run remind          # send the reminder email now
npm run eval            # score the type-to-log feature (calls Claude, about $0.50 a run)
```

Amounts are shown in SGD.
