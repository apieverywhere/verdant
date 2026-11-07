# Tasks — Verdant (sảnh game) & Ember & Tide 5×5×5

> Giai đoạn 3 của SDD.

- [x] **T1. Spec** — requirements.md, design.md, tasks.md.
- [x] **T2. Engine Fire & Water** `src/lib/fire-water/rules.ts` — rơi quân, 302 đường, thắng, hòa. _(F1)_
  - Kiểm chứng: `tests/fire-water.test.ts`.
- [x] **T3. Reducer trận** `src/lib/fire-water/match.ts`. _(F2)_
  - Kiểm chứng: `tests/fire-water.test.ts`.
- [x] **T4. AI** `src/lib/fire-water/ai.ts`. _(F3)_
  - Kiểm chứng: `tests/fire-water.test.ts`.
- [x] **T5. Cảnh hồ băng** `src/lib/scene/FireWaterController.ts`, `moonSkyMaterial`, `moonTerrainH`, `Geo.extrude`. _(F4.1–F4.4)_
- [x] **T6. HUD dùng chung** `src/components/Hud.tsx`, theme `.moon`; Game.tsx dùng lại, chữ sang tiếng Anh. _(L2)_
- [x] **T7. Trang Fire & Water** `src/components/FireWaterGame.tsx` + lưới bàn phím. _(F2, F4.5)_
- [x] **T8. Sảnh** `src/components/Lobby.tsx`, route `/`, `/tic-tac-toe`, `/fire-and-water`. _(L1.1–L1.4)_
- [x] **T9. Trả WebGL context khi rời trang** `dispose()` của cả hai controller. _(L1.5)_
  - Kiểm chứng: `e2e/smoke.ts` (điều hướng qua lại, không có cảnh báo context).
- [x] **T10. Kiểm thử tổng** — `bun test`, `bun run typecheck`, `bun run build`, `bun run e2e`.
- [x] **T11. Tài liệu** — README.
- [x] **T12. Độ khó Fire & Water** `src/lib/fire-water/search.ts`, `ai.ts`, `match.ts`, `DifficultyPicker` trong Hud. _(F3)_
  - Kiểm chứng: `tests/fire-water.test.ts` (bẫy hai đường, giới hạn thời gian, Hard thắng Medium, Medium thắng Easy), `e2e/smoke.ts`.
- [x] **T13. Hướng dẫn chơi** `src/components/HowToPlay.tsx` (nút “?” + `<dialog>` modal), `helpCards.tsx` (thẻ chuyển từ canvas, thay thẻ hòa của Tic-Tac-Toe bằng thẻ luật vanishing). _(H1)_
  - Kiểm chứng: `e2e/smoke.ts` (mở bằng “?”, đúng số thẻ, Esc đóng và trả focus, không cuộn ngang ở 390 px).
- [x] **T14. Slider hướng dẫn, người thua đi trước, footer** — `HowToPlay.tsx` thành slider; `nextStarter` trong `lib/game/match.ts` dùng chung cho hai game; băng CTA + footer trong `Lobby.tsx`; đổi tên thương hiệu thành Verdant. _(H1.1, R1.2, F2.2, L1.6)_
  - Kiểm chứng: `tests/match.test.ts`, `tests/fire-water.test.ts` (người thua đi trước, hòa/bỏ dở thì luân phiên), `e2e/smoke.ts` (đi hết các bước, ← →, mở lại về bước 1, footer).
- [x] **T15. Đổi tên game, nút Play về game gần nhất** — `src/lib/games.ts`, `lib/recentGame.ts`, `PlayRecentLink.tsx`; route `/lantern-line`, `/ember-and-tide` + redirect từ route cũ. _(L1.2, L1.7)_
  - Kiểm chứng: `e2e/smoke.ts` (lần đầu vào về Lantern Line, sau khi chơi Ember & Tide thì về Ember & Tide, route cũ trả 308).
