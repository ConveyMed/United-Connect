import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

// Stale-while-revalidate refresh for a screen's data.
//
// Runs `refresh` when:
//   1. the screen mounts (i.e. the user navigates to it),
//   2. the app returns to the foreground (native + web),
//   3. the network reconnects.
//
// This is the reliability layer that complements realtime: mobile realtime
// sockets drop in the background and don't always resync, so we re-pull on
// focus. Cached data stays on screen the whole time — the refetch runs quietly
// and updates in place, so there is no spinner and no perceived slowdown.
// It is intentionally event-driven (no polling/intervals).
export function useRefreshOnFocus(refresh) {
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    const run = () => { if (ref.current) ref.current(); };

    // 1. On mount / navigation to this screen.
    run();

    // 3. On network reconnect.
    window.addEventListener('online', run);

    // 2. On app foreground (CapacitorApp.appStateChange fires on web too).
    let sub;
    Promise.resolve(
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) run();
      })
    ).then((s) => { sub = s; });

    return () => {
      window.removeEventListener('online', run);
      if (sub && sub.remove) sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
