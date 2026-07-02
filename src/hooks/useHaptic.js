import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Thin wrapper around @capacitor/haptics that no-ops on web.
 * Usage: const haptic = useHaptic(); haptic.light();
 */
export const useHaptic = () => {
  const light = useCallback(() => {
    if (isNative()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }, []);

  const medium = useCallback(() => {
    if (isNative()) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  }, []);

  const heavy = useCallback(() => {
    if (isNative()) Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
  }, []);

  const success = useCallback(() => {
    if (isNative()) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  }, []);

  const warning = useCallback(() => {
    if (isNative()) Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
  }, []);

  const error = useCallback(() => {
    if (isNative()) Haptics.notification({ type: NotificationType.Error }).catch(() => {});
  }, []);

  const selection = useCallback(() => {
    if (isNative()) Haptics.selectionStart().then(() => Haptics.selectionEnd()).catch(() => {});
  }, []);

  return { light, medium, heavy, success, warning, error, selection };
};

export default useHaptic;
