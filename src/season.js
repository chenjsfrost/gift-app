// Which festive theme to show for a date. Pure: callers pass the date.
//   winter  1 Dec – 6 Jan   snow
//   spring  7 Jan – 30 Apr  blossom petals
//   summer  1 May – 31 Aug  light rain
//   autumn  1 Sep – 30 Nov  falling leaves

export const SEASONS = {
  winter: { key: 'winter', emoji: '🎄', greeting: "Season's greetings! Time to wrap things up." },
  spring: { key: 'spring', emoji: '🌸', greeting: 'Spring is here. A good time to plan ahead.' },
  summer: { key: 'summer', emoji: '🌦️', greeting: 'Summer showers, and a birthday or two.' },
  autumn: { key: 'autumn', emoji: '🍂', greeting: 'Autumn leaves are falling, and Christmas is on its way.' },
};

export function seasonFor(iso) {
  const md = iso.slice(5, 10);
  if (md >= '12-01' || md <= '01-06') return SEASONS.winter;
  if (md <= '04-30') return SEASONS.spring;
  if (md <= '08-31') return SEASONS.summer;
  return SEASONS.autumn;
}
