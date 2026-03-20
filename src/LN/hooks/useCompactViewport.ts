import { useEffect, useState } from 'react';

const COMPACT_VIEWPORT_QUERY = '(max-width: 767px)';

export const useCompactViewport = (): boolean => {
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(COMPACT_VIEWPORT_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const update = (matches: boolean) => setIsCompactViewport(matches);
    update(media.matches);

    const onChange = (event: MediaQueryListEvent) => update(event.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return isCompactViewport;
};

export default useCompactViewport;
