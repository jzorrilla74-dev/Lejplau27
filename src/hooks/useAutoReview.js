import { useEffect, useRef } from 'react';

export function useAutoReview({ rooms, onTrigger, enabled = false }) {
  const timerRef = useRef(null);
  const prevRoomsLen = useRef(rooms.length);

  useEffect(() => {
    if (!enabled || rooms.length === 0) return;

    if (rooms.length !== prevRoomsLen.current) {
      prevRoomsLen.current = rooms.length;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onTrigger();
      }, 30000);
    }

    return () => clearTimeout(timerRef.current);
  }, [rooms, enabled, onTrigger]);
}
