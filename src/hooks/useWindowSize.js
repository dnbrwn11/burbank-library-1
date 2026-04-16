import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    width,
    mob: width < 640,
    tab: width >= 640 && width < 1024,
  };
}
