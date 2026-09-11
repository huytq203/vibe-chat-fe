# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Halo phục vụ người dùng cần nhắn tin, gọi, làm việc với ghi chú, tác vụ và tệp trong cùng một ứng dụng. Trên điện thoại, sản phẩm được sử dụng như PWA cài đặt với thao tác cảm ứng và điều hướng tuyến tính; trên desktop, người dùng làm việc với bố cục nhiều cột và bàn phím/chuột.

## Product Purpose

Halo gom giao tiếp và cộng tác cá nhân/nhóm vào một trải nghiệm thống nhất. Thành công nghĩa là các tác vụ chính vẫn nhanh, dễ hiểu và giữ đúng ngữ cảnh khi người dùng chuyển giữa chat, ghi chú, công việc, kho tệp và cài đặt.

## Operating Context

- PWA chạy standalone trên iOS và Android, đồng thời hỗ trợ trình duyệt mobile và desktop.
- Các luồng mobile cần hoạt động tốt với notch, status bar, home indicator, bàn phím ảo và nút Back của trình duyệt/hệ điều hành.
- Desktop giữ mô hình nhiều cột, panel và dialog hiện có khi chúng phù hợp với không gian lớn.

## Capabilities and Constraints

- Next.js App Router là nguồn sự thật cho URL, lịch sử điều hướng và deep link.
- Framework7 phụ trách mobile app shell, safe-area, page surface và chuyển cảnh; không thay thế Next.js router.
- Modal nhiều nội dung hoặc có luồng thao tác dài phải trở thành một mobile page có header, Back và lịch sử điều hướng.
- Alert xác nhận, popover và popup ít thông tin vẫn là overlay tạm thời.
- Không làm mất chức năng cốt lõi trên mobile; cùng một mô hình thông tin phải nhất quán giữa mobile và desktop.
- Giữ React 19, TypeScript, Tailwind và hệ component hiện có trong quá trình chuyển đổi tăng dần.

## Brand Commitments

- Tên sản phẩm: Halo.
- Giữ hệ màu, typography tiếng Việt, biểu tượng và tài sản thương hiệu hiện có.
- Giao diện mobile phải mang cảm giác ứng dụng thật nhưng không giả lập cứng một hệ điều hành duy nhất.

## Evidence on Hand

- PWA manifest và splash assets trong `src/app/manifest.ts` và `public/splash/`.
- Mobile navigation, chat, notes, tasks, store và settings đã tồn tại trong `src/features/`.
- Safe-area và visual viewport hiện được xử lý rải rác trong `src/styles/index.css` và các feature component.
- Chưa có nghiên cứu người dùng hoặc benchmark hiệu năng được cung cấp; không được tự tạo các tuyên bố này.

## Product Principles

1. Nội dung chạm tới mép màn hình; chỉ điều khiển tương tác tránh vùng hệ thống.
2. Một luồng dài là một trang có lịch sử, không phải một hộp nổi chật chội.
3. Next.js giữ URL thật; Framework7 làm trải nghiệm mobile có nhịp và affordance bản địa.
4. Mobile ưu tiên một nhiệm vụ tại một thời điểm, desktop giữ sức mạnh đa panel.
5. Safe-area và bàn phím được giải quyết tại app shell, không vá lặp lại trong từng màn hình.

## Accessibility & Inclusion

Các thao tác mobile cần vùng chạm tối thiểu 44px, điều hướng Back rõ ràng, focus có thể nhìn thấy, hỗ trợ reduced motion và không phụ thuộc hover.
