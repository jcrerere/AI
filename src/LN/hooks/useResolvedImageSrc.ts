import { useEffect, useState } from 'react';
import { isLocalImageUri, resolveLocalImageSource } from '../utils/localImageStore';

export const useResolvedImageSrc = (src?: string | null): string => {
  const [resolvedSrc, setResolvedSrc] = useState(() => {
    const text = `${src || ''}`.trim();
    return isLocalImageUri(text) ? '' : text;
  });

  useEffect(() => {
    let cancelled = false;
    const nextSrc = `${src || ''}`.trim();
    if (!nextSrc) {
      setResolvedSrc('');
      return () => {
        cancelled = true;
      };
    }
    if (!isLocalImageUri(nextSrc)) {
      setResolvedSrc(nextSrc);
      return () => {
        cancelled = true;
      };
    }
    void resolveLocalImageSource(nextSrc)
      .then(result => {
        if (!cancelled) {
          setResolvedSrc(result || '');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedSrc('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
};
