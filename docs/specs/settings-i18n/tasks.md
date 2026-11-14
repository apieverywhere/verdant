# Tasks — Cài đặt: đa ngôn ngữ và âm thanh

> Giai đoạn 3 của SDD.

## Đã xong (15/11/2026)

- [x] **T1. Spec** — requirements.md, design.md, tasks.md.
- [x] **T2. Kho cài đặt** `src/lib/settings.ts` — lưu, parse an toàn, đồng bộ giữa các tab, ngôn ngữ mặc định theo trình duyệt. _(ST1.3–ST1.5, I1.2, A1.1)_
- [x] **T3. Từ điển** `src/lib/i18n.ts` — `en` / `vi`, `useT`, `Localized`, `Tr`. _(I1.1, I1.6)_
- [x] **T4. Hộp thoại Cài đặt** `src/components/SettingsDialog.tsx`, CSS trong `globals.css`; nút trong header và `HudButtons`. _(ST1.1, ST1.2, ST1.6)_
- [x] **T5. Dịch giao diện** — Lobby, SiteChrome, PlayRecentLink, Hud, HowToPlay, helpCards, SceneLoader và bốn component game; `LangSync` trong layout. _(I1.3, I1.4)_
- [x] **T6. Đổi thẻ “Settings” trên điện thoại thành “Options”**, sửa `e2e/smoke.ts`. _(ST1.1)_
- [x] **T7. Kiểm thử** — `bun run typecheck`, `bun test` (128), `bun run build` (mọi trang vẫn tĩnh), `bun run e2e` (đạt toàn bộ); chụp ảnh kiểm tra tiếng Việt ở 1280 px và 390 px.

## Còn lại cho đa ngôn ngữ

- [ ] **T8. E2E cho Cài đặt** — mở bằng bánh răng, đổi sang Tiếng Việt thì chữ HUD và `<html lang>` đổi, tải lại vẫn giữ, Esc đóng và trả focus, thanh trượt về 0 hiện “Off”.
- [ ] **T9. Unit test cho `settings.ts`** — parse dữ liệu hỏng, kẹp âm lượng, ngôn ngữ mặc định theo `navigator.languages`.
- [ ] **T10. Dịch `aria-label` của hình trong thẻ hướng dẫn** (khoảng 25 chuỗi trong `helpCards.tsx`). _(I1.3)_
- [ ] **T11. Privacy Policy nhắc tới `verdant:settings`** — xem [site-seo T9](../site-seo/tasks.md). _(S2.2)_
- [ ] **T12. (Tuỳ chọn) Bỏ khoảnh khắc chữ tiếng Anh khi tải trang** — ví dụ ẩn chữ cho tới khi hydrate, hoặc route theo ngôn ngữ (`/vi/...`) nếu cần SEO tiếng Việt. Cân nhắc kỹ vì sẽ đổi cấu trúc route. _(I1.7)_

## Âm thanh (phát triển sau)

- [ ] **T13. Chốt danh sách âm thanh và nguồn** — nhạc nền cho 4 cảnh (và sảnh?), hiệu ứng theo A1.3; giấy phép. _(A1.2, A1.3)_
- [ ] **T14. Module `src/lib/audio.ts`** — `AudioContext` chung, hai `GainNode`, theo dõi kho cài đặt, mở khoá sau tương tác đầu tiên, dừng khi tab ẩn. _(A1.4–A1.7)_
  - Kiểm chứng: unit test cho công thức gain và trạng thái khoá; E2E kiểm tra không có lỗi console khi chưa có file âm thanh.
- [ ] **T15. Hiệu ứng trong các game** — `useSfx()`, gọi ở nước đi / thắng / thua / hoà / bấm nút cho cả bốn game. _(A1.3)_
- [ ] **T16. Nhạc nền theo cảnh.** _(A1.2)_
- [ ] **T17. Bỏ ghi chú “sắp có” trong hộp thoại** khi âm thanh đã chạy; cập nhật README.
