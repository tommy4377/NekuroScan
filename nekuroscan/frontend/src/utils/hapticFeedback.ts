/**
 * HAPTIC FEEDBACK - Vibration API utility
 * ✅ SEZIONE 4.4: Haptic Feedback (Mobile)
 */

interface HapticPattern {
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'custom';
  duration?: number;
  pattern?: number[];
}

const HAPTIC_PATTERNS: Record<string, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30],
  pageTurn: [15],
  tap: [5],
  longPress: [20, 50, 20]
};

/**
 * Check if Vibration API is available
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Trigger haptic feedback
 */
export const triggerHaptic = (pattern: HapticPattern | string): void => {
  if (!isHapticSupported()) {
    return; // Graceful fallback
  }

  try {
    let vibrationPattern: number[];

    if (typeof pattern === 'string') {
      // Use predefined pattern
      vibrationPattern = HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.light;
    } else if (pattern.pattern) {
      // Use custom pattern
      vibrationPattern = pattern.pattern;
    } else if (pattern.type) {
      // Use predefined type
      vibrationPattern = HAPTIC_PATTERNS[pattern.type] || HAPTIC_PATTERNS.light;
    } else if (pattern.duration) {
      // Single duration
      vibrationPattern = [pattern.duration];
    } else {
      // Default
      vibrationPattern = HAPTIC_PATTERNS.light;
    }

    navigator.vibrate(vibrationPattern);
  } catch (error) {
    // Graceful fallback - ignore errors
    console.warn('[HapticFeedback] Error triggering haptic:', error);
  }
};

/**
 * Convenience functions for common patterns
 */
export const hapticFeedback = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  pageTurn: () => triggerHaptic('pageTurn'),
  tap: () => triggerHaptic('tap'),
  longPress: () => triggerHaptic('longPress'),
  custom: (pattern: number[]) => triggerHaptic({ pattern })
};

/**
 * Cancel any ongoing vibration
 */
export const cancelHaptic = (): void => {
  if (isHapticSupported()) {
    try {
      navigator.vibrate(0);
    } catch (error) {
      // Ignore errors
    }
  }
};

