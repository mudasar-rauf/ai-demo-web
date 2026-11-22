import { AppShell } from '@astryxdesign/core/AppShell';
import { LinkProvider } from '@astryxdesign/core/Link';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { AppNav } from './AppNav';

/**
 * The app's layout: the Astryx theme, the app shell with its top navigation, and the
 * page in the shell's main region. A plain component, so tests render it inside a
 * test router; the document shell (<html>, <body>) lives only in src/routes/__root.tsx.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Theme theme={neutralTheme}>
      {/* Every Astryx link (nav items, Link, Button with href) navigates through the router. */}
      <LinkProvider component={Link}>
        <AppShell topNav={<AppNav />} mobileNav={false}>
          {children}
        </AppShell>
      </LinkProvider>
    </Theme>
  );
}
