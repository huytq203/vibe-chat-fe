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
    // Ghi nhớ chiều cao lúc mount (chưa có bàn phím).
    // So sánh tương đối để tránh false-positive do browser chrome (thanh địa chỉ).
    const baseHeight = vv.height;
    const handler = () => {
      setVisible(baseHeight - vv.height > 150);
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);
  return visible;
}
