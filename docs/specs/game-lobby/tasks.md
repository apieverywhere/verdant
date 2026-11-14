# Tasks — Verdant: sảnh, hướng dẫn chơi, khung game dùng chung

> Giai đoạn 3 của SDD. Việc của Ember & Tide (trước đây nằm ở đây, T2–T7, T12) đã chuyển sang [ember-and-tide/tasks.md](../ember-and-tide/tasks.md).

- [x] **T1. Spec** — requirements.md, design.md, tasks.md.
- [x] **T6. HUD dùng chung** `src/components/Hud.tsx`, theme theo class trên `.stage`. _(G1.2)_
- [x] **T8. Sảnh** `src/components/Lobby.tsx`, route `/`. _(L1.1, L1.2, L1.8)_
- [x] **T9. Trả WebGL context khi rời trang** — `dispose()` của mọi controller. _(G1.8)_
  - Kiểm chứng: `e2e/smoke.ts` (điều hướng qua lại, không có cảnh báo context).
- [x] **T10. Kiểm thử tổng** — `bun test`, `bun run typecheck`, `bun run build`, `bun run e2e`.
- [x] **T11. Tài liệu** — README.
- [x] **T13. Hướng dẫn chơi** `HowToPlay.tsx` (nút “?” + `<dialog>` modal), `helpCards.tsx`. _(H1.1–H1.4)_
  - Kiểm chứng: `e2e/smoke.ts` (mở bằng “?”, đúng số bước, Esc đóng và trả focus, vừa 390 px).
- [x] **T14. Slider hướng dẫn, người thua đi trước, footer** — `nextStarter` trong `lib/game/match.ts`; băng CTA và footer; đổi thương hiệu thành Verdant. _(H1.1, L1.6)_
  - Kiểm chứng: `tests/match.test.ts`, `e2e/smoke.ts` (đi hết các bước, ← →, mở lại về bước 1, footer).
- [x] **T15. Đổi tên game, nút Play về game gần nhất** — `lib/games.ts`, `lib/recentGame.ts`, `PlayRecentLink.tsx`, redirect route cũ. _(L1.3, L1.7)_
  - Kiểm chứng: `e2e/smoke.ts` (lần đầu về Lantern Line, sau khi chơi Ember & Tide thì về Ember & Tide, route cũ trả 308).
- [x] **T16. HUD điện thoại** — nút quay về tròn, một hàng trên cùng, thanh công cụ thu vào thẻ ở đáy, cuộn mượt cho anchor của sảnh. _(L1.4, L1.5, G1.3)_
  - Kiểm chứng: `e2e/smoke.ts` (“phone: back, score and help share one row”, “toolbar hidden until Options is tapped”, không cuộn ngang ở 390 px).
- [x] **T17. Mục About, header/footer dùng chung** — `SiteChrome.tsx`, link mạng xã hội thật. _(L1.5, L1.6)_
  - Kiểm chứng: `e2e/smoke.ts` (“About scrolls to the About section”, “footer: 3 social links and 2 legal links”).
- [x] **T18. Thẻ sảnh cho bốn game** — hình cảnh vẽ lại trong `gameArt.tsx`, dùng chung với ảnh chia sẻ. _(L1.2)_
  - Kiểm chứng: `e2e/smoke.ts` (“lobby lists all four games”).
- [x] **T19. Màn chờ Tano và tải lười cảnh 3D** — `SceneLoader.tsx`, `next/dynamic`, `onReady`. _(G1.4, G1.5)_
- [x] **T20. Hiệu năng cảnh** — `frameBudget.ts`, PMREM nhỏ, shadow map vẽ theo yêu cầu. _(G1.6)_
- [x] **T21. Mở ở chế độ Đấu máy, mức Dễ** cho cả bốn game. _(G1.1)_
  - Kiểm chứng: `e2e/smoke.ts` (“opens against the computer”, “Easy is the default” cho từng game).
- [x] **T22. Nút Cài đặt trong HUD và header** — `HudButtons`; đổi thẻ “Settings” trên điện thoại thành “Options”. _(G1.2, G1.3; xem [settings-i18n](../settings-i18n/))_
- [x] **T23. Chụp lại ảnh `e2e/screenshots/`** có nút Cài đặt và thẻ “Options” (15/11/2026).
