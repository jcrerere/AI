import type React from 'react';
import { forwardRef } from 'react';
import { useResolvedImageSrc } from '../../hooks/useResolvedImageSrc';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const PersistentImage = forwardRef<HTMLImageElement, Props>(function PersistentImage(
  { src, fallbackSrc, ...props },
  ref,
) {
  const resolvedSrc = useResolvedImageSrc(typeof src === 'string' ? src : '');
  const finalSrc = resolvedSrc || fallbackSrc;
  if (finalSrc) {
    return <img ref={ref} src={finalSrc} {...props} />;
  }
  return <img ref={ref} {...props} />;
});

export default PersistentImage;
