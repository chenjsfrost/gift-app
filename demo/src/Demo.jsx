// The landing page's demo video: the screenshots from capture.sh in a browser window,
// a slow camera move on each, and a caption above. Positions are CSS pixels of the
// app's 1440×900 viewport, the size capture.sh shoots at.
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['400', '600', '700'], subsets: ['latin'] });

const VIEW_W = 1440;
const VIEW_H = 900;
const WIN_W = 1300;
const K = WIN_W / VIEW_W;
const FG = '#1d1d1f';
const FG2 = '#6e6e73';
const BG = 'radial-gradient(120% 90% at 50% 0%, #fff3e6 0%, #f5f5f7 65%)';
const PINK = 'linear-gradient(160deg, #ff6b6b, #e0245e)';
const FADE = 15;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const shot = (name) => staticFile(`shots/${name}.png`);

// The line typed in the type-to-log box, and where that box's text and button sit (03-empty).
const TYPED = 'silk scarf for Mei Ling, birthday, 85';
const TYPE_BOX = { x: 396, y: 289, size: 17, spacing: -0.187 };
const BUTTON = { x: 917.4, y: 263.6, w: 142.6, h: 51 };

const GiftIcon = ({ size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
  </svg>
);

const Brand = ({ scale = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 22, transform: `scale(${scale})` }}>
    <div style={{ width: 96, height: 96, borderRadius: 26, background: PINK, display: 'grid', placeItems: 'center', boxShadow: '0 20px 40px -16px rgba(224,36,94,.6)' }}>
      <GiftIcon size={56} />
    </div>
    <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: '-0.04em', color: FG }}>Gift</div>
  </div>
);

// A move from one view to another: x, y is the top-left corner shown, s the zoom.
function useCamera(from, to, [start, end]) {
  const t = interpolate(useCurrentFrame(), [start, end], [0, 1], { ...clamp, easing: ease });
  const at = (k) => from[k] + (to[k] - from[k]) * t;
  return { x: at('x'), y: at('y'), s: at('s') };
}

function Window({ url, cam, children }) {
  return (
    <div style={{ width: WIN_W, borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 50px 90px -40px rgba(0,0,0,.4), 0 0 0 1px rgba(0,0,0,.07)' }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', background: '#ececee', borderBottom: '1px solid rgba(0,0,0,.08)' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
        <div style={{ margin: '0 auto', transform: 'translateX(-30px)', width: 440, height: 28, borderRadius: 8, background: '#fff', color: FG2, fontSize: 15, display: 'grid', placeItems: 'center' }}>
          {`localhost:3000${url}`}
        </div>
      </div>
      <div style={{ width: WIN_W, height: VIEW_H * K, overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: VIEW_W, transformOrigin: '0 0', transform: `scale(${K * cam.s}) translate(${-cam.x}px, ${-cam.y}px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Scene({ title, children }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: BG, fontFamily, alignItems: 'center' }}>
      <div style={{ marginTop: 58, height: 82, fontSize: 50, fontWeight: 700, letterSpacing: '-0.03em', color: FG, opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
        {title}
      </div>
      <div style={{ marginTop: 20 }}>{children}</div>
    </AbsoluteFill>
  );
}

const Picture = ({ name, style }) => <Img src={shot(name)} style={{ display: 'block', width: VIEW_W, ...style }} />;

function ShotScene({ title, url, name, dur, from = { x: 0, y: 0, s: 1 }, to = from }) {
  const cam = useCamera(from, to, [12, dur - 8]);
  return (
    <Scene title={title}>
      <Window url={url} cam={cam}>
        <Picture name={name} />
      </Window>
    </Scene>
  );
}

const Cursor = ({ x, y, press }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" style={{ position: 'absolute', left: x - 5, top: y - 3, transform: `scale(${1 - press * 0.15})`, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.3))' }}>
    <path d="M5 3l14 8-6 1.6L10 19z" fill="#1d1d1f" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

// The line is typed into the empty box, then the cursor presses "Fill in the form".
function TypingScene({ dur }) {
  const frame = useCurrentFrame();
  const cam = useCamera({ x: 0, y: 0, s: 1 }, { x: 240, y: 10, s: 1.5 }, [8, 40]);
  const typed = TYPED.slice(0, Math.round(interpolate(frame, [44, 86], [0, TYPED.length], clamp)));
  const caret = typed.length < TYPED.length || Math.floor(frame / 12) % 2 === 0;
  const move = interpolate(frame, [86, 104], [0, 1], { ...clamp, easing: ease });
  const target = { x: BUTTON.x + BUTTON.w / 2, y: BUTTON.y + BUTTON.h / 2 };
  const press = interpolate(frame, [106, 109, 115], [0, 1, 0], clamp);
  return (
    <Scene title="Type a gift the way you'd text it.">
      <Window url="/gifts/new" cam={cam}>
        <Picture name="03-empty" />
        <div style={{ position: 'absolute', left: TYPE_BOX.x, top: TYPE_BOX.y - 13, height: 26, display: 'flex', alignItems: 'center', fontFamily, fontSize: TYPE_BOX.size, letterSpacing: TYPE_BOX.spacing, color: FG, whiteSpace: 'pre' }}>
          {typed}
          <span style={{ width: 1.5, height: 20, marginLeft: 1, background: FG, opacity: caret ? 1 : 0 }} />
        </div>
        <div style={{ position: 'absolute', left: BUTTON.x, top: BUTTON.y, width: BUTTON.w, height: BUTTON.h, borderRadius: 12, background: `rgba(0,0,0,${press * 0.2})` }} />
        {frame >= 84 && <Cursor x={1150 + (target.x - 1150) * move} y={480 + (target.y - 480) * move} press={press} />}
      </Window>
    </Scene>
  );
}

// The same page in winter at night, then in spring.
function SeasonsScene({ dur }) {
  const frame = useCurrentFrame();
  const cam = useCamera({ x: 120, y: 0, s: 1.2 }, { x: 170, y: 20, s: 1.3 }, [10, dur]);
  const spring_ = interpolate(frame, [62, 80], [0, 1], clamp);
  return (
    <Scene title="A look for every season, light or dark.">
      <Window url="/" cam={cam}>
        <Picture name="09-winter-dark" />
        <Picture name="10-spring" style={{ position: 'absolute', inset: 0, opacity: spring_ }} />
      </Window>
    </Scene>
  );
}

function Title({ children, sub, brandAt = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = spring({ frame: frame - brandAt, fps, config: { damping: 13, mass: 0.8 } });
  const t = spring({ frame: frame - brandAt - 14, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: BG, fontFamily, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Brand scale={b} />
      <div style={{ marginTop: 48, maxWidth: 1400, fontSize: 60, lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.035em', color: FG, opacity: t, transform: `translateY(${(1 - t) * 20}px)` }}>
        {children}
      </div>
      {sub && <div style={{ marginTop: 22, fontSize: 30, color: FG2, opacity: t }}>{sub}</div>}
    </AbsoluteFill>
  );
}

const pink = (s) => <span style={{ background: PINK, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{s}</span>;

// The app's content is 720 wide (x 360 to 1080). WIDE shows it with margin; CLOSE fills the window.
const WIDE = { x: 120, y: 0, s: 1.2 };
const close = (y) => ({ x: 206, y, s: 1.4 });

// [frames, scene]
const SCENES = [
  [80, () => <Title>Never wonder {pink('“what did I get them last time?”')} again.</Title>],
  [150, (d) => <ShotScene dur={d} name="02-home-full" url="/" title="See what's coming up, and who's still to buy for." from={close(0)} to={close(900)} />],
  [125, (d) => <TypingScene dur={d} />],
  [120, (d) => <ShotScene dur={d} name="04-filled" url="/gifts/parse" title="AI fills in the form. You check it, then save." from={close(0)} to={close(257)} />],
  [100, (d) => <ShotScene dur={d} name="05-saved" url="/" title="Saved, and Mei Ling is covered." from={WIDE} to={close(50)} />],
  [130, (d) => <ShotScene dur={d} name="07-person-full" url="/people/10" title="See what you've given each other, and who's ahead." from={close(60)} to={close(330)} />],
  [100, (d) => <ShotScene dur={d} name="06-people" url="/people" title="Everyone's spend and balance at a glance." from={WIDE} to={close(250)} />],
  [95, (d) => <ShotScene dur={d} name="08-events" url="/events" title="Christmas and birthdays built in. Add your own events." from={WIDE} to={close(40)} />],
  [130, (d) => <SeasonsScene dur={d} />],
  [100, () => <Title sub="github.com/emocado/gift-app">Runs on your own PC. Your list stays yours.</Title>],
];

export const DURATION = SCENES.reduce((t, [d]) => t + d, 0) - (SCENES.length - 1) * FADE;

export const Demo = () => (
  <TransitionSeries>
    {SCENES.flatMap(([d, render], i) => [
      i > 0 && <TransitionSeries.Transition key={`fade-${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />,
      <TransitionSeries.Sequence key={`scene-${i}`} durationInFrames={d}>
        {render(d)}
      </TransitionSeries.Sequence>,
    ]).filter(Boolean)}
  </TransitionSeries>
);
