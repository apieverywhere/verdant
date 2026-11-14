# Tasks — Ember & Tide (thả quân 5×5×5)

> Giai đoạn 3 của SDD. T2–T7 và T12 chuyển từ [game-lobby/tasks.md](../game-lobby/tasks.md), giữ số cũ.

- [x] **T2. Engine** `src/lib/fire-water/rules.ts` — rơi quân, 302 đường, thắng, hoà. _(F1)_
  - Kiểm chứng: `tests/fire-water.test.ts` (`F1 — rules`).
- [x] **T3. Reducer trận** `src/lib/fire-water/match.ts`. _(F2)_
  - Kiểm chứng: `tests/fire-water.test.ts` (`F2 — match flow`).
- [x] **T4. AI Easy / Medium** `src/lib/fire-water/ai.ts`. _(F3.2, F3.3)_
  - Kiểm chứng: `tests/fire-water.test.ts` (`F3.2`, `F3.3`).
- [x] **T5. Cảnh hồ băng** `FireWaterController.ts`, `moonSkyMaterial`, `moonTerrainH`, `Geo.extrude`. _(F4.1–F4.4)_
- [x] **T7. Trang** `src/components/FireWaterGame.tsx` + lưới bàn phím. _(F2, F4.5)_
  - Kiểm chứng: `e2e/smoke.ts` (thả quân bằng canvas, chồng quân khi bấm vào chồng, thắng theo cột dọc, khoá bàn, bàn phím).
- [x] **T12. Hard** `src/lib/fire-water/search.ts`, `DifficultyPicker`. _(F3.4)_
  - Kiểm chứng: `tests/fire-water.test.ts` (`F3.4`: bẫy hai đường, không chồng lên quân giữa; `F3 — strength order`: Hard thắng Medium, Medium thắng Easy).
- [x] **T24. Hard mạnh hơn, chạy trong Worker** — ngân sách 300 000 nút, `ai.worker.ts`. _(F3.4, F3.5)_
  - Kiểm chứng: `tests/fire-water.test.ts`, `e2e/smoke.ts` (“computer thinking status”, “computer answered with one piece”).
- [x] **T25. Dựng lại cảnh** — shader hồ băng có cực quang, đảo tuyết, lò lửa và đèn thuỷ triều, quân vát cạnh vật liệu vật lý, bóng đổ. _(F4.1, F4.2)_
- [x] **T26. Mở ở Đấu máy, mức Easy.** _(F3.1, G1.1)_
  - Kiểm chứng: `e2e/smoke.ts` (“ember & tide: Easy is the default”).
- [x] **T27. Chữ song ngữ** — trạng thái, nhãn bảng điểm, nhãn bàn phím qua `t.fw`. _(I1)_
