// PageSecondaryNavigation — canonical name for the L3 contextual navigation.
// Wrapper over the unified TopNav (variant="level3"): contextual underline navigation used
// everywhere (including Diario), with no duplicated interaction logic.
import { TopNav } from './TopNav';
import type { TopNavItem } from './TopNav';

export type { TopNavItem };

interface PageSecondaryNavigationProps {
  items: TopNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  visualLabel?: string;
  idPrefix?: string;
  panelId?: string;
}

export function PageSecondaryNavigation(props: PageSecondaryNavigationProps) {
  return <TopNav variant="level3" {...props} />;
}

export default PageSecondaryNavigation;
