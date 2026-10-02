// Builds the static site for GitHub Pages into _site/: the landing page with the demo
// video, and the sharing preview. No database and no server; the app itself stays on
// your PC. Dates (the Christmas countdown, the season) are as of the day it's built,
// so the Pages workflow rebuilds it every day. Run: npm run build:site
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { landingPage } from './landing.js';
import { sharingPreview } from './sharing-preview.js';
import { sharingPreviewPage } from './views.js';
import { seasonFor } from './season.js';
import { localToday } from './upcoming.js';

const OUT = '_site';
const CODE = 'https://github.com/emocado/gift-app';

const today = localToday();
const season = seasonFor(today);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/preview/sharing`, { recursive: true });

writeFileSync(
  `${OUT}/index.html`,
  landingPage({ today, season, site: { home: './', preview: 'preview/sharing/', code: CODE, video: 'demo.mp4', poster: 'demo-poster.jpg' } }),
);
writeFileSync(
  `${OUT}/preview/sharing/index.html`,
  sharingPreviewPage({ today, ...sharingPreview(today), season, site: { home: '../../', preview: './', code: CODE } }),
);
copyFileSync('demo/out/demo.mp4', `${OUT}/demo.mp4`);
copyFileSync('demo/out/demo-poster.jpg', `${OUT}/demo-poster.jpg`);
// Pages would otherwise run the files through Jekyll.
writeFileSync(`${OUT}/.nojekyll`, '');

console.log(`Built ${OUT}/ for ${today} (${season.key}).`);
