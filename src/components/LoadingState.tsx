import { Spinner } from '@astryxdesign/core/Spinner';

/** What a screen shows while its data loads. */
export function LoadingState() {
  return <Spinner aria-label="Loading" />;
}
