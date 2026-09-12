import React, { useState, useRef } from 'react';

interface UseSwipeGestureProps<T = string> {
  onSwipeRight?: (id: string, extraData?: T) => void;
}

/**
 * Custom hook managing horizontal pointer swipe gestures with left snap-to-reveal
 * and right trigger-action behaviors.
 */
export function useSwipeGesture<T = string>({ onSwipeRight }: UseSwipeGestureProps<T> = {}) {
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [snappedLeft, setSnappedLeft] = useState<Record<string, boolean>>({});
  const pointerStart = useRef<{ x: number; y: number; id: string } | null>(null);
  const isSwipingRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    const currentOffset = snappedLeft[id] ? -200 : 0;
    pointerStart.current = { x: e.clientX - currentOffset, y: e.clientY, id };
    isSwipingRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const id = pointerStart.current.id;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;

    // Determine if horizontal swipe (vs vertical scroll)
    if (!isSwipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      isSwipingRef.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    if (isSwipingRef.current) {
      e.preventDefault();
      // Clamp offsets: swipe right up to 150px, swipe left down to -240px
      const clamped = dx > 0 ? Math.min(150, dx) : Math.max(-240, dx);
      setSwipeOffsets((prev) => ({ ...prev, [id]: clamped }));
    }
  };

  const onPointerUp = (e: React.PointerEvent, id: string, extraData?: T) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;

    if (isSwipingRef.current) {
      if (dx > 80) {
        // Swipe right -> Trigger action
        onSwipeRight?.(id, extraData);
        setSwipeOffsets((prev) => ({ ...prev, [id]: 0 }));
        setSnappedLeft((prev) => ({ ...prev, [id]: false }));
      } else if (dx < -60) {
        // Swipe left -> Snap open to -200px to reveal actions
        setSwipeOffsets((prev) => ({ ...prev, [id]: -200 }));
        setSnappedLeft((prev) => ({ ...prev, [id]: true }));
      } else {
        // Snap back to closest state
        if (snappedLeft[id]) {
          if (dx > -80) {
            setSwipeOffsets((prev) => ({ ...prev, [id]: 0 }));
            setSnappedLeft((prev) => ({ ...prev, [id]: false }));
          } else {
            setSwipeOffsets((prev) => ({ ...prev, [id]: -200 }));
          }
        } else {
          setSwipeOffsets((prev) => ({ ...prev, [id]: 0 }));
        }
      }
    } else {
      // Tap detected. If card was snapped open, tap to close it
      if (snappedLeft[id]) {
        setSwipeOffsets((prev) => ({ ...prev, [id]: 0 }));
        setSnappedLeft((prev) => ({ ...prev, [id]: false }));
      }
    }

    pointerStart.current = null;
    isSwipingRef.current = false;
  };

  const resetSwipe = (id: string) => {
    setSwipeOffsets((prev) => ({ ...prev, [id]: 0 }));
    setSnappedLeft((prev) => ({ ...prev, [id]: false }));
  };

  const onPointerCancel = (id: string) => {
    resetSwipe(id);
    pointerStart.current = null;
    isSwipingRef.current = false;
  };

  return {
    swipeOffsets,
    snappedLeft,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    resetSwipe,
  };
}
