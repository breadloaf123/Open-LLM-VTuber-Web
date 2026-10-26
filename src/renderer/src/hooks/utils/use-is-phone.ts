import { useEffect, useState } from 'react';

/** Below Chakra's `md` breakpoint (48em); matches the phone rules in theme/yawidoc.css */
const PHONE_QUERY = '(max-width: 47.99em)';

/**
 * True on phone-sized screens. Follows rotation and window resizing.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const handleChange = () => setIsPhone(query.matches);
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isPhone;
}
