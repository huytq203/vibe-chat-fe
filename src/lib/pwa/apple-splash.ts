type AppleSplashScreen = { url: string; media: string };

/**
 * iOS chỉ dùng ảnh khởi động khớp CHÍNH XÁC kích thước thiết bị, không có fallback.
 * Bảng dưới là [rộng CSS, cao CSS, devicePixelRatio]; file PNG tương ứng nằm ở
 * `public/splash/<rộng*dpr>x<cao*dpr>.png`.
 */
const APPLE_SPLASH_DEVICES = [
  [440, 956, 3], // iPhone 16 Pro Max
  [430, 932, 3], // iPhone 15/16 Pro Max, 15/16 Plus
  [402, 874, 3], // iPhone 16 Pro
  [393, 852, 3], // iPhone 14 Pro, 15, 16
  [428, 926, 3], // iPhone 12/13 Pro Max, 14 Plus
  [390, 844, 3], // iPhone 12/13/14
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [375, 812, 3], // iPhone X/XS, 11 Pro, 12/13 mini
  [414, 896, 2], // iPhone XR, 11
  [375, 667, 2], // iPhone SE 2/3, 8
  [1024, 1366, 2], // iPad Pro 12.9"
  [834, 1194, 2], // iPad Pro 11", iPad Air
  [820, 1180, 2], // iPad Air 10.9"
  [768, 1024, 2], // iPad 9.7"/10.2"
] as const;

export const appleSplashScreens: AppleSplashScreen[] = APPLE_SPLASH_DEVICES.map(
  ([width, height, ratio]) => ({
    url: `/splash/${width * ratio}x${height * ratio}.png`,
    media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
  }),
);
