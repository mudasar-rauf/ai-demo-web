import { NotBuiltYet } from '../../components/NotBuiltYet';
import { isSummaryEnabled } from '../../flags';

/** The Summary screen (/summary). Its issue builds it behind VITE_FF_SUMMARY. */
export function SummaryScreen() {
  if (!isSummaryEnabled()) return <NotBuiltYet />;
  // The Summary screen's issue replaces this with the screen.
  return <NotBuiltYet />;
}
