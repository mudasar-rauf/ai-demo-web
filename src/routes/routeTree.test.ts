import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { routeTree } from '../routeTree.gen';

// The real route tree, checked without rendering: the document shell does not mount in jsdom.
// Screen tests use a test router with the same paths (src/test/renderWithRouter.tsx).
describe('the route tree', () => {
  it('has exactly the routes /, /tasks/$id and /summary', () => {
    // Building a router resolves each route's full path; nothing is rendered or loaded.
    const router = createRouter({ routeTree, history: createMemoryHistory() });
    expect(Object.keys(router.routesByPath).sort()).toEqual(['/', '/summary', '/tasks/$id']);
  });
});
