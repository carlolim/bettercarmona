import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/** Paths for the budget pages, which live under `/transparency`, keeping the `/fil` prefix when the reader has it. */
export function useTransparencyPath() {
  const { pathname } = useLocation();
  const fil = pathname === '/fil' || pathname.startsWith('/fil/');
  return useCallback((path = '/') => `${fil ? '/fil' : ''}/transparency${path === '/' ? '' : path}`, [fil]);
}
