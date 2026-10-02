#!/usr/bin/env bash
# Screenshots of the running app for the demo video, taken with Playwright CLI.
# Runs the app on a throwaway copy of a database, so your own data is never touched:
#   DEMO_DB=path/to/gifts.db npm run capture     (defaults to ../data/gifts.db)
# Type-to-log needs OPENCODE_API_KEY in ../.env; the shot after "Fill in the form"
# is a real AI response.
set -euo pipefail
cd "$(dirname "$0")"

PORT=3999
URL="http://localhost:$PORT"
OUT=public/shots
TMP=$(mktemp -d)
cp "${DEMO_DB:-../data/gifts.db}" "$TMP/demo.db"

DB_PATH="$TMP/demo.db" PORT=$PORT node --env-file-if-exists=../.env ../src/server.js &
SERVER=$!
pw() { npx playwright-cli -s=gift-demo "$@" > /dev/null; }
trap 'pw close || true; kill $SERVER 2>/dev/null; wait $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
until curl -s -o /dev/null "$URL/"; do sleep 0.3; done

mkdir -p "$OUT"
# The pile sits at the bottom of the window, so a full-page shot would show it mid-page.
full() { pw eval "document.querySelector('.pile').style.display = 'none'"; pw screenshot --hires --full-page --filename="$OUT/$1.png"; }
shot() { pw eval "document.fonts.ready"; sleep 1; pw screenshot --hires --filename="$OUT/$1.png"; }

pw open "$URL/"
shot 01-home
full 02-home-full

pw goto "$URL/gifts/new"
# An empty box (no placeholder) that the video types into; see TYPE_BOX in src/Demo.jsx.
pw eval "document.querySelector('#entry').placeholder = ''"
shot 03-empty
pw fill "#entry" "silk scarf for Mei Ling, birthday, 85"
shot 03-typed
pw click "form[action='/gifts/parse'] button[type=submit]"
shot 04-filled
pw click "form[action='/gifts'] button[type=submit]"
shot 05-saved

pw goto "$URL/people"
shot 06-people
# Marcus has spent more on you than you on him, so his page shows the balance.
pw goto "$(npx playwright-cli -s=gift-demo --raw eval "[...document.querySelectorAll('a')].find((a) => a.textContent.includes('Marcus')).href" | tr -d '"')"
shot 07-person
full 07-person-full
pw goto "$URL/events"
shot 08-events

# Every season has its own look, in light and dark.
season() { pw click ".season-menu summary"; pw click "button[name=season][value=$1]"; }
pw goto "$URL/"
pw set-color-scheme dark
season winter
shot 09-winter-dark
pw set-color-scheme light
season spring
shot 10-spring

echo "Saved $(ls "$OUT" | wc -l) screenshots to demo/$OUT"
