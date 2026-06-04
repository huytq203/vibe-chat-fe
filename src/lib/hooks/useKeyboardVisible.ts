'use client';

import { useEffect, useState } from 'react';

/**
 * Detect bàn phím ảo đang mở trên mobile dùng VisualViewport API.
 * Khi height viewport < 75% window height → bàn phím đang chiếm chỗ.
 * Trả false trên desktop hoặc khi browser không hỗ trợ visualViewport.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      setVisible(vv.height < window.innerHeight * 0.75);
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);
  return visible;
}
