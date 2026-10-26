import { useEffect, useState } from 'react';

/**
 * Phones (below Chakra's `md` breakpoint, 48em) and portrait tablets get the stacked
 * layout: the side panel would leave too little room for the VTuber there.
 */
const STACKED_QUERY = '(max-width: 47.99em), (orientation: portrait) and (max-width: 63.99em)';

/**
 * True when the app should use the stacked phone layout. Follows rotation and window resizing.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(STACKED_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(STACKED_QUERY);
    const handleChange = () => setIsPhone(query.matches);
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isPhone;
}
