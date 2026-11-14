# Requirements — Trang phụ, pháp lý, SEO, thống kê truy cập

> Giai đoạn 1 của SDD, viết bù ngày 15/11/2026 cho các thay đổi ngày 08–10/11.
> Nguồn thiết kế: artboard Sitemap của canvas “Verdant – Multi-game website”.

## Bối cảnh

Verdant là site game miễn phí, không tài khoản, triển khai trên Vercel (`https://verdantverse.vercel.app`). Site cần đủ trang pháp lý cho một dịch vụ không thu dữ liệu cá nhân, và được công cụ tìm kiếm hiểu đúng từng game.

## S1 — Trang phụ

- **S1.1** `/sitemap` hiển thị theo artboard Sitemap: ba nhóm Home, Games (mọi game trong `games.ts`), Legal. Chỉ liệt kê trang đã có, không có link giữ chỗ. Dùng header và footer chung.
- **S1.2** `/privacy` và `/terms` là trang chữ đơn giản có link “← Verdant”, ghi ngày cập nhật lấy từ `LEGAL_UPDATED`.
- **S1.3** Chữ trên site xưng ngôi thứ nhất số ít.

## S2 — Pháp lý

- **S2.1** Privacy Policy PHẢI mô tả đúng những gì site lưu và thu: không tài khoản, không hỏi thông tin cá nhân; mọi thứ được lưu trong localStorage của trình duyệt; thống kê truy cập không cookie; trẻ em; cách liên hệ.
- **S2.2** KHI site bắt đầu lưu thêm dữ liệu trên máy người chơi THÌ Privacy Policy PHẢI được cập nhật cùng lúc và `LEGAL_UPDATED` đổi theo.
- **S2.3** Terms of Service gồm: dịch vụ, ai được chơi, sử dụng hợp lý, quyền sở hữu, không bảo đảm, giới hạn trách nhiệm, quyền riêng tư, thay đổi điều khoản, liên hệ.
- **S2.4** Không có quảng cáo. (AdSense đã được gỡ hoàn toàn ngày 09/11/2026: script, banner, quảng cáo giữa ván, `ads.txt`, link cài đặt cookie.)

## S3 — SEO

- **S3.1** Tiêu đề trang chủ “Verdant – Free 3D Board Games in Your Browser”; trang khác dùng mẫu `%s · Verdant`; tiêu đề trang game nói rõ game là gì (`Tidepool – Hex Marble-Pushing Strategy Game`).
- **S3.2** Mỗi trang có canonical trỏ về origin production. Origin lấy từ `NEXT_PUBLIC_SITE_URL`, rồi tới domain production của Vercel, rồi tới mặc định; bản preview vẫn trỏ canonical về production.
- **S3.3** Ảnh chia sẻ 1200×630 cho trang chủ và từng game, dùng lại hình thẻ sảnh.
- **S3.4** JSON-LD schema.org: `WebSite` + `ItemList` các game ở trang chủ; `VideoGame` ở mỗi trang game.
- **S3.5** `/sitemap.xml` liệt kê mọi trang công khai với `lastmod`: trang game theo `updated` trong `games.ts`, trang chủ và `/sitemap` theo game mới nhất, trang pháp lý theo `LEGAL_UPDATED`. `/robots.txt` cho phép mọi thứ và trỏ tới sitemap.
- **S3.6** Xác minh Google Search Console bằng file `public/google52c17318d89ea18e.html` (giữ nguyên, Google kiểm tra lại định kỳ) và tuỳ chọn meta tag qua `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
- **S3.7** Metadata, JSON-LD và ảnh chia sẻ luôn bằng tiếng Anh (`inLanguage: 'en'`), kể cả khi người chơi chọn tiếng Việt.

## S4 — Icon và cài lên màn hình chính

- **S4.1** `favicon.ico`, `icon.svg`, `apple-icon.png` và icon manifest 192 / 512 / maskable 512, sinh từ logo bằng `scripts/gen-icons.tsx`.
- **S4.2** `/manifest.webmanifest`: tên, mô tả, `display: standalone`, màu nền và màu theme `#0e2333`.

## S5 — Thống kê truy cập

- **S5.1** Vercel Web Analytics (lượt xem trang) và Speed Insights (Core Web Vitals), không cookie. Ngoài Vercel thì không làm gì.
