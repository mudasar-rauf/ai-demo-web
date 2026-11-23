import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import type { Summary } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { shareDone } from './shareDone';
import { useSummaryData } from './useSummaryData';

/** The Summary screen (/summary): how many tasks there are, how many are open and done, and the share done. */
export function SummaryScreen() {
  const summary = useSummaryData();

  return (
    <>
      <Text as="h1">Summary</Text>
      {summary.status === 'loading' && <LoadingState />}
      {summary.status === 'error' && <ErrorState error={summary.error} onRetry={summary.reload} />}
      {summary.status === 'ready' && <SummaryFigures summary={summary.data} />}
    </>
  );
}

/** Each figure's label and value, side by side in a description list. */
function SummaryFigures({ summary }: { summary: Summary }) {
  return (
    <MetadataList orientation="horizontal">
      <MetadataListItem label="Total tasks">{summary.total}</MetadataListItem>
      <MetadataListItem label="Open">{summary.open}</MetadataListItem>
      <MetadataListItem label="Done">{summary.done}</MetadataListItem>
      <MetadataListItem label="Share done">{`${shareDone(summary)}%`}</MetadataListItem>
    </MetadataList>
  );
}
