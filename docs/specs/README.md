# Spec — Verdant

Dự án theo **Spec-Driven Development (SDD)**: mọi tính năng đi qua ba giai đoạn, mỗi giai đoạn là một file.

1. `requirements.md` — *cái gì*: bối cảnh, user story, tiêu chí chấp nhận viết theo EARS (`KHI … THÌ hệ thống PHẢI …`), đánh mã theo tiền tố của spec.
2. `design.md` — *xây thế nào*: kiến trúc, mô hình dữ liệu, thuật toán, quyết định thiết kế và lý do.
3. `tasks.md` — *làm theo thứ tự nào*: mỗi việc trỏ về requirement và ghi cách kiểm chứng. `[x]` đã xong, `[ ]` còn lại.

Cập nhật lần cuối: 15/11/2026.

## Danh sách spec

| Spec | Phạm vi | Mã | Trạng thái |
|---|---|---|---|
| [vanishing-tic-tac-toe](vanishing-tic-tac-toe/) | Lantern Line: caro 3×3 “vanishing”, AI tối ưu | R1–R8 | Xong |
| [game-lobby](game-lobby/) | Sảnh `/`, hướng dẫn chơi, khung game dùng chung (HUD, loader, hiệu năng cảnh 3D) | L, H, G | Xong |
| [ember-and-tide](ember-and-tide/) | Ember & Tide: thả quân 5×5×5, nối 4 | F1–F4 | Xong |
| [tidepool](tidepool/) | Tidepool: đẩy bi trên bàn lục giác 61 lỗ | TP1–TP5 | Xong, thiếu E2E |
| [canopy](canopy/) | Canopy: leo cây, trồng, tỉa, thắp đèn trên bàn 5×5 | C1–C5 | Xong |
| [site-seo](site-seo/) | Trang phụ, pháp lý, SEO, thống kê truy cập, icon | S1–S5 | Xong |
| [settings-i18n](settings-i18n/) | Cài đặt: đa ngôn ngữ Anh/Việt; nhạc nền và hiệu ứng tổng hợp bằng Web Audio | ST, I, A | Xong, cần người nghe tinh chỉnh |

## Quy ước chung

- **Truy vết hai chiều.** Tên `describe` trong test mang mã requirement (`describe('R2 — vanishing rule')`, `describe('F1 — rules')`). Spec mới có thể đặt tên theo nhóm (`board`, `moves`, `computer`), nhưng `tasks.md` phải ghi file test kiểm chứng.
- **Đổi luật, AI hay hành vi:** sửa spec trước, rồi cập nhật test, rồi mới sửa code. Chạy `bun test`, `bun run typecheck`, `bun run build`, `bun run e2e` (và `bun run verify:ai` nếu đụng AI của Lantern Line).
- **Logic game là module thuần** trong `src/lib/<game>/` (`rules.ts`, `match.ts`, `ai.ts`, `search.ts`), không phụ thuộc React hay three.js. Cảnh 3D chỉ nhận một `view` và tự suy ra hoạt ảnh.
- **Quyết định chung cho mọi game** (chi tiết ở [game-lobby](game-lobby/requirements.md#g--khung-game-dùng-chung)): mở trang ở chế độ *Đấu máy* mức *Dễ*; người thua ván trước đi trước (hoặc luân phiên người đi trước); AI mạnh chạy trong Web Worker với giới hạn theo số nút; chữ trên giao diện đi qua bộ từ điển `src/lib/i18n.ts`; âm thanh tổng hợp bằng Web Audio (`src/lib/audio/`), chỉ trong trang game.
- **Chữ trên site** xưng ngôi thứ nhất số ít (I / me / mình). Tên site và tên game (Verdant, Lantern Line, Ember & Tide, Tidepool, Canopy) không dịch.
- **Spec viết bằng tiếng Việt**, còn code, comment và chữ gốc trên giao diện viết bằng tiếng Anh.

## Thêm một game mới

1. Tạo `docs/specs/<game>/` với đủ ba file, chọn một tiền tố mã chưa dùng.
2. Thêm game vào `src/lib/games.ts` (tên, route, `updated`, mô tả SEO) để sảnh, sitemap và ảnh chia sẻ tự cập nhật.
3. Thêm chữ của game vào cả `en` và `vi` trong `src/lib/i18n.ts`, và thẻ hướng dẫn song ngữ vào `helpCards.tsx`.
4. Thêm thẻ vào sảnh (`CARDS` trong `Lobby.tsx`), trang trong `src/app/<route>/` (metadata, JSON-LD, `opengraph-image.tsx`) và các bước kiểm tra trong `e2e/smoke.ts`.
5. Thêm một theme vào `THEMES` (`src/lib/audio/music.ts`), gọi `useMusic(theme)` trong component game và ánh xạ sự kiện của reducer sang hiệu ứng bằng `useOnChange` (thêm hiệu ứng mới vào `sfx.ts` nếu cần).
