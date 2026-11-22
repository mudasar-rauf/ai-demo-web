import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { useRouterState } from '@tanstack/react-router';

export const APP_NAME = 'Tasks';

/** The top navigation: the app's name and links to Tasks and Summary. */
export function AppNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <TopNav
      label="Main navigation"
      heading={<TopNavHeading heading={APP_NAME} />}
      startContent={
        <>
          <TopNavItem label="Tasks" href="/" isSelected={pathname === '/' || pathname.startsWith('/tasks/')} />
          <TopNavItem label="Summary" href="/summary" isSelected={pathname === '/summary'} />
        </>
      }
    />
  );
}
