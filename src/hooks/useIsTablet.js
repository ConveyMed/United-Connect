import { useEffect, useState } from 'react';

// True on iPad / tablet-width viewports (>= 768px). Screens that need a real
// layout change on iPad — multi-column grids, side-by-side panels — branch on
// this. Simple width bumps don't need it; they use the --content-max CSS var.
//
// Kept in sync with the --content-max breakpoint in App.css (768px). Uses
// matchMedia so it only re-renders on the actual breakpoint crossing.
const TABLET_QUERY = '(min-width: 768px)';

export default function useIsTablet() {
  const [isTablet, setIsTablet] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(TABLET_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(TABLET_QUERY);
    const onChange = (e) => setIsTablet(e.matches);
    // addEventListener is the modern API; older WebKit needs addListener.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    setIsTablet(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return isTablet;
}
