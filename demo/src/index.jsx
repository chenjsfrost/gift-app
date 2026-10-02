import { Composition, registerRoot } from 'remotion';
import { Demo, DURATION } from './Demo.jsx';

const Root = () => <Composition id="Demo" component={Demo} durationInFrames={DURATION} fps={30} width={1920} height={1080} />;

registerRoot(Root);
