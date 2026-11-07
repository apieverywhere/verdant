# Tasks — Caro 3×3 “Vanishing”

> Giai đoạn 3 của SDD: kế hoạch thực thi. Mỗi task ghi requirement nó đáp ứng và cách kiểm chứng.

- [x] **T1. Khởi tạo dự án** — Next.js 16 + React 19 + TypeScript, quản lý bằng Bun; script `dev/build/start/test/typecheck`. _(R8.1)_
- [x] **T2. Viết spec** — requirements.md, design.md, tasks.md.
- [x] **T3. Engine luật chơi** `src/lib/game/rules.ts` — createGame, applyMove (biến mất trước khi kiểm tra thắng), legalMoves, vanishingCell, positionKey, luật hòa lặp 3 lần. _(R1, R2, R3)_
  - Kiểm chứng: `tests/rules.test.ts`.
- [x] **T4. Bộ giải chính xác** `tests/solver.ts` — retrograde analysis toàn bộ không gian trạng thái. _(R5.5)_
- [x] **T5. AI** `src/lib/game/ai.ts` — negamax + alpha‑beta, sắp xếp nước, heuristic “quân bền”, chọn ngẫu nhiên giữa nước bằng điểm, 3 mức độ khó. _(R5)_
  - Kiểm chứng: `tests/ai.test.ts` (thắng ngay, chặn, alpha‑beta == minimax, tối ưu theo solver, < 100 ms).
- [x] **T6. Cảnh 3D three.js** `src/lib/scene/*` — port địa hình, bầu trời, nước, cây, đảo, bàn, đèn, đèn trời; picking bằng Raycaster; camera orbit/zoom/auto‑rotate. _(R6)_
- [x] **T7. Hiệu ứng** — rơi quân, xoay X, hover, thắng (ô nhấp nháy, quân nảy, thanh vàng), quân sắp biến mất, quân biến mất. _(R2.4, R2.5, R6.2)_
- [x] **T8. HUD React** `src/components/Game.tsx` + reducer `src/lib/game/match.ts` — điểm, trạng thái, chế độ, độ khó, ván mới, xóa tỉ số, lưới nút bàn phím, lịch AI. _(R4, R7)_
  - Kiểm chứng: `tests/match.test.ts`.
- [x] **T9. Kiểm thử tổng** — `bun test` (40 test), `bun run typecheck`, `bun run build`, `bun run e2e` (20 kiểm tra trên Chrome headless: click canvas 3D, biến mất, thắng, đấu máy, bàn phím, điện thoại, không lỗi console). _(R8)_
- [x] **T9b. Kiểm chứng AI toàn phần** — `bun run verify:ai`: mức Khó tối ưu ở cả 133 364 thế cờ. _(R5.5, R5.6)_
- [x] **T9c. Sửa sau kiểm thử** — camera tự lùi trên màn hình dọc (bàn bị cắt ở 390 px); thêm favicon (404 trong console).
- [x] **T10. Tài liệu** — README: cách chạy, luật, kiến trúc, AI. _(R8.3)_
- [x] **T11. Ẩn gợi ý quân sắp biến mất ở chế độ 2 người** — chỉ hiện khi đấu với máy. _(R2.4)_
  - Kiểm chứng: `e2e/smoke.ts` (không có gợi ý ở PvP; có gợi ý khi X có 3 quân trong chế độ đấu máy).
