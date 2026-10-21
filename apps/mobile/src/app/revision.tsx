import { PracticeScreen } from '../features/practice/PracticeScreen';
import { buildReview } from '../features/review/reviewSession';

export default function ReviewSessionRoute() {
  return <PracticeScreen mode="review" build={buildReview} />;
}
