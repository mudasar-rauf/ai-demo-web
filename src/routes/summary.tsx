import { createFileRoute } from '@tanstack/react-router';
import { SummaryScreen } from '../screens/summary/SummaryScreen';

// Frozen: the Summary screen's issue changes only src/screens/summary/.
export const Route = createFileRoute('/summary')({
  component: SummaryScreen,
});
