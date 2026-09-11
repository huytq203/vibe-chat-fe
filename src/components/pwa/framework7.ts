import Framework7Core from 'framework7/lite-bundle';
import Framework7React from 'framework7-react';

// Đăng ký plugin ngay khi module UI Framework7 đầu tiên được import. Tách khỏi
// component shell để Toolbar/Popup không phụ thuộc vào thứ tự render của React.
const installFramework7Plugin = Framework7Core.use.bind(Framework7Core);
installFramework7Plugin(Framework7React);

export { App, Toolbar } from 'framework7-react';
