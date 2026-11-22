import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { ApiError } from '../api/client';
import type { ValidationErrorBody } from '../api/types';

export type ErrorStateProps = {
  /** What useApiResource or a mutation rejected with: an ApiError, or a network error from fetch. */
  error: unknown;
  /** Runs the request again, for errors worth retrying. */
  onRetry?: () => void;
};

/**
 * How every screen shows an error:
 * 501 → "Not built yet on the server"; 404 → its detail, with a link to Tasks;
 * 422 → "The request was invalid" and each msg; anything else → "Could not reach the API" with Retry.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (error instanceof ApiError && error.status === 501) {
    return <Banner status="info" title="Not built yet on the server" />;
  }
  if (error instanceof ApiError && error.status === 404) {
    return (
      <Banner
        status="warning"
        title={detailText(error.body) ?? 'Not found'}
        description={<Link href="/">Back to Tasks</Link>}
      />
    );
  }
  if (error instanceof ApiError && error.status === 422) {
    const messages = validationMessages(error.body);
    return (
      // Not collapsed: the reasons are the point of this banner.
      <Banner status="error" title="The request was invalid" collapsible={false}>
        {messages.length > 0 && (
          <List>
            {messages.map((msg, index) => (
              <ListItem key={index} label={msg} />
            ))}
          </List>
        )}
      </Banner>
    );
  }
  return (
    <Banner
      status="error"
      title="Could not reach the API"
      endContent={onRetry && <Button label="Retry" variant="secondary" onClick={onRetry} />}
    />
  );
}

function detailText(body: unknown): string | undefined {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  return typeof detail === 'string' ? detail : undefined;
}

function validationMessages(body: unknown): string[] {
  const detail = (body as Partial<ValidationErrorBody> | undefined)?.detail;
  if (!Array.isArray(detail)) return [];
  return detail.map((item) => item?.msg).filter((msg): msg is string => typeof msg === 'string');
}
