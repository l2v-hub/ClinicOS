// PageSecondaryNavigation — canonical name for the L3 contextual navigation.
// Wrapper over the unified TopNav (variant="level3"): segmented grey control,
// white active pill, blue active text. Used everywhere (incl. Diario) — no
// per-page custom tabs, no duplicated logic.
import { TopNav } from './TopNav';
import type { TopNavItem } from './TopNav';

export type { TopNavItem };

interface PageSecondaryNavigationProps {
  items: TopNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}

export function PageSecondaryNavigation(props: PageSecondaryNavigationProps) {
  return <TopNav variant="level3" {...props} />;
}

export default PageSecondaryNavigation;
