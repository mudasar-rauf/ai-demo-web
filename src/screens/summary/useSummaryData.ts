import type { Summary } from '../../api/types';
import { useApiResource, type Resource } from '../../api/useApiResource';

/** The Summary screen's data: GET /tasks/summary, loaded on mount and on reload(). */
export function useSummaryData(): Resource<Summary> {
  return useApiResource((api) => api.getSummary(), []);
}
