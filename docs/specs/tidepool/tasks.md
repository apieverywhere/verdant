# Tasks — Tidepool (đẩy bi trên bàn lục giác)

> Giai đoạn 3 của SDD. Spec viết bù sau khi code đã có; các việc đã xong được ghi lại theo lịch sử commit.

- [x] **T1. Spec** — requirements.md, design.md, tasks.md (viết bù 15/11/2026).
- [x] **T2. Engine** `src/lib/tidepool/rules.ts` — bàn 61 lỗ, thế mở đầu, chọn hàng, đi dọc / đi ngang, đẩy, hất rơi, thắng, đếm thế cờ. _(TP1, TP2, TP3)_
  - Kiểm chứng: `tests/tidepool.test.ts` (`board`, `selection lines`, `moves`).
- [x] **T3. Reducer trận** `src/lib/tidepool/match.ts`. _(TP1.3, TP4.1, TP4.4)_
  - Kiểm chứng: `tests/tidepool.test.ts` (`match`).
- [x] **T4. Máy Easy / Medium** `src/lib/tidepool/ai.ts`. _(TP5.2, TP5.3, TP5.5)_
- [x] **T5. Máy Hard** `src/lib/tidepool/search.ts`, `ai.worker.ts`. _(TP5.4–TP5.6)_
  - Kiểm chứng: `tests/tidepool.test.ts` (`computer`: nước hợp lệ ở mọi mức, đi nước thắng, tránh bị hất rơi, thấy cú hất 2 nước trước, giữ trong ngân sách nút); `bun scripts/bench-tidepool.ts`.
- [x] **T6. Cảnh đầm phá** — port từ artboard Tidepool. _(TP6)_
- [x] **T7. Trang** `TidepoolGame.tsx`, `TidepoolScene.tsx`, route `/tidepool`, thẻ sảnh, thẻ hướng dẫn, điều khiển bàn phím. _(TP4)_
- [x] **T8. Dựng lại cảnh** — bục tổ ong, shader đầm phá, bi clearcoat / iridescence, điểm đánh dấu dạng đá quý, đèn giấy. _(TP6)_
- [x] **T9. Mở ở Đấu máy, mức Easy.** _(TP5.1, G1.1)_
- [x] **T10. Chữ song ngữ** — trạng thái, nhãn bảng điểm, tên lỗ (`cellPos`), hướng và mô tả nước đi qua `t.tp`. _(I1)_
- [ ] **T11. E2E cho Tidepool** — `e2e/smoke.ts` hiện chỉ kiểm tra Tidepool có trên sảnh. Cần thêm: trang mở ở Đấu máy / Easy, chọn hàng bi bằng canvas, điểm vàng đi được, máy đáp lại một nước, bàn phím, không cuộn ngang ở 390 px.
