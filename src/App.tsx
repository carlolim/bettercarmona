import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { CommunityLayout } from './community/CommunityLayout';
import { CommunityHome, CommunityNotFound } from './community/Home';
import { LocaleSync } from './community/LocaleSync';
import { SiteHeader } from './community/SiteHeader';
import { TransparencyLayout } from './community/TransparencyLayout';
import About from './pages/About';
import Home from './pages/Home';
import Project from './pages/Project';
import Enacted from './pages/Enacted';

/** Old budget addresses, from before the pages moved under /transparency, keep working with their filters. */
function LegacyRedirect({ to }: { to?: string }) {
  const { pathname, search, hash } = useLocation();
  return <Navigate replace to={{ pathname: to ?? `/transparency${pathname}`, search, hash }} />;
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
        {/* Task 005 replaces this with the community About page, and keeps the budget page at /transparency/about-the-data. */}
        <Route path="/about" element={<LegacyRedirect to="/transparency/about-the-data" />} />
        <Route path="/projects/:dataset/:id" element={<LegacyRedirect />} />
        <Route path="*" element={<CommunityNotFound />} />
      </Routes>
    </>
  );
}
