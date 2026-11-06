import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { CommunityAbout } from './community/About';
import { CommunityLayout } from './community/CommunityLayout';
import { CommunityHome, CommunityNotFound } from './community/Home';
import { CommunityHotlines } from './community/Hotlines';
import { LocaleSync } from './community/LocaleSync';
import { SiteHeader } from './community/SiteHeader';
import { TransparencyLayout } from './community/TransparencyLayout';
import About from './pages/About';
import Home from './pages/Home';
import Project from './pages/Project';
import Enacted from './pages/Enacted';

/** Old budget addresses, from before the pages moved under /transparency, keep working with their filters. */
function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate replace to={{ pathname: `/transparency${pathname}`, search, hash }} />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <LocaleSync />
      <SiteHeader />
      <Routes>
        {['', '/fil'].map((prefix) => [
          <Route key={`${prefix}-community`} path={prefix || '/'} element={<CommunityLayout />}>
            <Route index element={<CommunityHome />} />
            <Route path="about" element={<CommunityAbout />} />
            <Route path="hotlines" element={<CommunityHotlines />} />
          </Route>,
          <Route key={`${prefix}-transparency`} path={`${prefix}/transparency`} element={<TransparencyLayout />}>
            <Route index element={<Home />} />
            <Route path="gaa" element={<Enacted />} />
            <Route path="about-the-data" element={<About />} />
            <Route path="projects/:dataset/:id" element={<Project />} />
          </Route>,
        ])}
        {/* Offices and their districts are a section of the budget page; old links land there. */}
        <Route path="/districts" element={<Navigate to="/transparency#offices" replace />} />
        <Route path="/gaa" element={<LegacyRedirect />} />
        <Route path="/projects/:dataset/:id" element={<LegacyRedirect />} />
        <Route path="*" element={<CommunityNotFound />} />
      </Routes>
    </>
  );
}
