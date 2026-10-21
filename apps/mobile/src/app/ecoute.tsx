import { buildListening } from '../features/listen/listenSession';
import { PracticeScreen } from '../features/practice/PracticeScreen';

export default function ListenSessionRoute() {
  return <PracticeScreen mode="listen" build={buildListening} />;
}
