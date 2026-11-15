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

## Âm thanh (15/11/2026)

- [x] **T13. Quyết định nguồn** — tổng hợp bằng Web Audio, không dùng file; sảnh không có âm thanh. _(A1.2, A1.3b)_
- [x] **T14. Engine** `src/lib/audio/engine.ts` — context chung, hai kênh gain, theo dõi cài đặt, mở khoá sau cú chạm đầu, dừng khi tab ẩn. _(A1.1, A1.4–A1.7)_
  - Kiểm chứng: `tests/audio.test.ts` (`gainFor`); script dò Playwright (không có context trước cú chạm, không cảnh báo console).
- [x] **T15. Hiệu ứng** `src/lib/audio/sfx.ts` + `useOnChange` trong bốn component game, `tap` cho nút HUD, mẫu khi thả thanh trượt. _(A1.3)_
- [x] **T16. Nhạc theo cảnh** `src/lib/audio/music.ts` — 4 theme, scheduler lookahead, ambience, vào/ra êm, im khi slider 0. _(A1.2, A1.5)_
  - Kiểm chứng: `tests/audio.test.ts` (hợp âm trong gam, random walk); script dò (nhạc chạy tiếp sau 6 s, dừng khi về sảnh, 0 node khi tắt nhạc).
- [x] **T17. Ghi chú trong hộp thoại** đổi thành “âm thanh bắt đầu sau lần chạm đầu tiên; sảnh không có nhạc”; README cập nhật.
- [x] **T17b. Tiếng gió thật** — thay lớp gió tổng hợp bằng bản ghi Pixabay (yêu cầu của tác giả sau khi nghe), `public/audio/wind.mp3`, fallback tổng hợp. _(A1.3b)_
  - Kiểm chứng: script dò (sảnh không tải file; ba game trên cạn tải và decode được 39,8 s; Tidepool không tải; không lỗi console).
- [x] **T18a. Tiếng thắng làm lại** sau khi nghe thử: fanfare ~2 s nhiều lớp (whoosh, va đập, arpeggio, hợp âm sawtooth swell, lấp lánh, nốt cao ngân) theo gam của nhạc nền cảnh (`fanfareRootHz`, cảnh thứ dùng trưởng tương đối). Kiểm chứng: `tests/audio.test.ts` dựng mọi hiệu ứng trên AudioContext giả.
- [ ] **T18. Nghe và tinh chỉnh** — mình chỉ kiểm được bằng máy (node, trạng thái, không lỗi), chưa nghe được. Cần người nghe thử từng cảnh trên loa và tai nghe, chỉnh `TUNE`-kiểu: gain pad/lead/ambience, mật độ giai điệu, âm sắc hiệu ứng (`sfx.ts`), độ dài fade.
- [ ] **T19. E2E cho âm thanh** — đưa script dò vào `e2e/smoke.ts` (đếm oscillator, trạng thái context, dừng khi về sảnh).
- [ ] **T20. (Tuỳ chọn) Tôn trọng `prefers-reduced-motion`?** Không áp dụng cho âm thanh; cân nhắc một nút tắt nhanh trong HUD nếu người chơi hay cần tắt gấp.
