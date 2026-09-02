// PageTopNavigation — canonical name for the L2 page navigation.
// Wrapper over the unified TopNav (variant="level2"): primary area tabs with a strong active
// state. Single source of truth, no duplicated interaction logic.
import { TopNav } from './TopNav';
import type { TopNavItem } from './TopNav';

export type { TopNavItem };

interface PageTopNavigationProps {
  items: TopNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  visualLabel?: string;
  idPrefix?: string;
  panelId?: string;
}

export function PageTopNavigation(props: PageTopNavigationProps) {
  return <TopNav variant="level2" {...props} />;
}

export default PageTopNavigation;
