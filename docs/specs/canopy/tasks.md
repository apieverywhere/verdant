# Tasks — Canopy (leo cây, trồng cây, thắp đèn)

> Giai đoạn 3 của SDD. Spec viết bù sau khi code đã có; các việc đã xong được ghi lại theo lịch sử commit.

- [x] **T1. Spec** — requirements.md, design.md, tasks.md (viết bù 15/11/2026).
- [x] **T2. Engine** `src/lib/canopy/rules.ts` — đi, mọc, tỉa, đèn, thắng bằng 2 đèn, thua khi hết nước. _(C1, C2, C3)_
  - Kiểm chứng: `tests/canopy.test.ts` (`board`, `stepping`, `growing`, `cutting`, `lanterns`, `no move left`).
- [x] **T3. Reducer trận** `src/lib/canopy/match.ts`. _(C1.3, C2.4, C4.4)_
  - Kiểm chứng: `tests/canopy.test.ts` (`match`: chọn, đi, mọc, tỉa, luân phiên người đi trước, khoá bàn khi thắng, Violet chỉ đi qua máy).
- [x] **T4. Máy** `src/lib/canopy/search.ts`, `ai.ts`, `ai.worker.ts`. _(C5)_
  - Kiểm chứng: `tests/canopy.test.ts` (`computer player`: lượt hợp lệ ở mọi mức, thắp đèn thắng, Hard chặn đèn thắng, chỉ chọn phần còn lại của lượt, giữ trong ngân sách nút qua một ván dài).
- [x] **T5. Cây low-poly** `src/lib/scene/trees.ts` — 4 nấc là cùng cây ở các tuổi, có biến thể. _(C6.2)_
- [x] **T6. Cảnh khoảng rừng** `CanopyController.ts` — bục, bàn, người leo, đèn, điểm đánh dấu, vòng sáng, đom đóm. _(C6)_
- [x] **T7. Trang** `CanopyGame.tsx`, `CanopyScene.tsx`, route `/canopy`, thẻ sảnh, ảnh chia sẻ, thẻ hướng dẫn (hình ghép từ chính các phần của cây). _(C4)_
  - Kiểm chứng: `e2e/smoke.ts` (nhấc người leo, đi rồi được hỏi mọc, giữa lượt không chọn được người leo khác, không có gì để tỉa thì chuyển lượt, “Skip cutting”, không tỉa được cây vừa mọc, mũi tên san hô tỉa cây, bàn phím, máy chơi cả lượt).
- [x] **T8. Mở ở Đấu máy, mức Easy.** _(C5.1, G1.1)_
  - Kiểm chứng: `e2e/smoke.ts` (“canopy: Easy is the default”).
- [x] **T9. Chữ song ngữ** — trạng thái, tên nấc, mô tả ô và người leo qua `t.cn`; nhãn nấc trong hình hướng dẫn. _(I1)_
