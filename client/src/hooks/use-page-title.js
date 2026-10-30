import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Team Finder` : 'Team Finder';
  }, [title]);
}
