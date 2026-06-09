// AppSidebar — canonical name for the unified L1 sidebar.
// Thin re-export of TeamsLikeSidebar so there is a single source of truth
// (no duplicated sidebar logic). Style lives in App.css (.teams-sidebar).
export { default } from '../shared/TeamsLikeSidebar';
export { default as AppSidebar } from '../shared/TeamsLikeSidebar';
