import { Outlet } from 'react-router-dom';
import { ChatLauncher } from '../chat/ChatLauncher';
import { SiteFooter } from './SiteFooter';

export function CommunityLayout() {
  return (
    <>
      <div id="main-content" tabIndex={-1} className="site-content community-content"><Outlet /></div>
      <SiteFooter />
      <ChatLauncher />
    </>
  );
}
