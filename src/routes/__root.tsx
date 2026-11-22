import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ApiProvider } from '../api/ApiProvider';
import { APP_NAME } from '../components/AppNav';
import { AppLayout } from '../components/AppLayout';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: APP_NAME },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
});

/** The document shell. Only the real app renders it; tests use src/test/renderWithRouter.tsx. */
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return (
    <ApiProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ApiProvider>
  );
}
