import { Outlet } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';

export function CommunityLayout() {
  return (
    <>
      <div id="main-content" tabIndex={-1} className="site-content community-content"><Outlet /></div>
      <SiteFooter />
    </>
  );
}
