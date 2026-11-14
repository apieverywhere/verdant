# Design — Tidepool (đẩy bi trên bàn lục giác)

> Giai đoạn 2 của SDD. Hợp đồng controller, tải lười, hiệu năng và vòng đời WebGL dùng chung: [game-lobby/design.md §6](../game-lobby/design.md#6-cảnh-3d-dùng-chung).

## 1. Module

| File | Vai trò |
|---|---|
| `src/lib/tidepool/rules.ts` | Engine thuần: toạ độ, nước đi, đẩy, thắng, đếm thế cờ |
| `src/lib/tidepool/match.ts` | Reducer trận: lựa chọn, số ván thắng, chế độ, độ khó, người đi trước |
| `src/lib/tidepool/ai.ts` | `evaluate` của design, Easy, Medium (`designMove`), điều phối mức |
| `src/lib/tidepool/search.ts` | Hard: `searchMove` |
| `src/lib/tidepool/ai.worker.ts` | Chạy `chooseMove` trong Worker |
| `src/lib/scene/TidepoolController.ts` | Cảnh three.js |
| `src/components/TidepoolGame.tsx`, `TidepoolScene.tsx` | Trang, HUD, lịch máy, bàn phím |
| `scripts/bench-tidepool.ts` | Cho các mức / bộ trọng số đấu cả ván để đo |

## 2. Mô hình dữ liệu

- Toạ độ trục (axial) `(q, r)`, bán kính 4. `CELLS` liệt kê lỗ theo hàng (`r = −4 … 4`), mỗi hàng trái sang phải; `NB[cell][dir]` là lỗ kề hoặc −1 nếu ra ngoài mép. Hướng theo thứ tự E, NE, NW, W, SW, SE. Mỗi lỗ có `ring` (khoảng cách tới tâm, 0–4).
- `TidepoolState`: `board`, `ids` (mã bi ở mỗi lỗ, giữ suốt đời viên bi để làm hoạt ảnh), `owners`, `turn`, `lost`, `winner`, `last` (`MoveResult`: các bước dịch chuyển, bi rơi và ô khay), `moveCount`, `history` (`positionKey` → số lần xuất hiện).
- `Move`: `group` (bi theo thứ tự dọc hàng), `dir`, `push` (số bi đối thủ bị đẩy), `lead` (bi đầu khi đi dọc, −1 khi đi ngang), `off` (cú đẩy có hất bi xuống biển không).
- `lineOf(sel)` sắp lựa chọn thành một hàng thẳng liền nhau 1–3 bi theo bất kỳ thứ tự bấm nào, hoặc trả `null`. `movesForGroup` sinh nước cho một hàng; `allMoves` sinh cho cả bên (mỗi hàng đếm một lần).
- `applyMove` trả về chính `state` khi nước không hợp lệ; `applyBoard` là bản chỉ-bàn dùng cho tìm kiếm.
- `cellPos(i)` trả `{ row, hole }` (hàng 1 ở phía Coral) để giao diện dịch tên lỗ; `cellName` là bản tiếng Anh cho test.

## 3. Máy

| Mức | Cách chơi |
|---|---|
| Easy | nước tốt nhất 1 ply theo `evaluate`, hoặc nước ngẫu nhiên với xác suất 35% |
| Medium | AI 2 ply của design: với mỗi nước, lấy đáp trả tệ nhất cho mình, cộng nhiễu `[0, 2)` |
| Hard | `searchMove`: negamax + alpha-beta, đào sâu dần (tối đa 12), bảng chuyển vị, quiescence 4 ply cho các nước đẩy rơi; ngân sách 400 000 nút |

- **Medium:** nhiễu được rút trước khi tìm, vì cộng nhiễu sau khi đã cắt tỉa có thể nâng một nước bị bác bỏ lên trên nước tốt nhất (lỗi của AI gốc trong design).
- **Biểu diễn của Hard:** bàn là `Int8Array` (0 trống, 1/2 hai bên), nước đi đóng gói thành một số nguyên; mỗi nút chỉ cấp phát một bản sao bàn. Khoá Zobrist cho bảng chuyển vị. Sắp nước: nước của bảng chuyển vị, nước hất rơi, số bi đẩy, độ dài hàng, rồi bảng history.
- **Hàm lượng giá (`TUNE`, chỉnh bằng tự đấu):** mỗi bi trong biển 1 000; giá trị bi theo vòng `[40, 30, 18, 6, −14]` (mép là nơi mất bi); mỗi bi kề cùng màu +4; bi của mình ở mép đang bị đẩy rơi được −160; bi đối thủ ở mép mình đẩy rơi được +200; khi đang dẫn thì cộng thêm `10 × (4 − ring)` để ép vào giữa; ở gốc, trừ 400 cho mỗi lần thế cờ đích đã xuất hiện để không đi vòng tròn.
- **Ngân sách:** 400 000 nút đạt 4–6 ply, ~0,7 s/nước (tối đa ~1,6 s). Tự đấu: 400k thắng 120k 9–1 trong 10 ván, thắng Medium 8–0 (2 ván không kết thúc).
- **Worker:** `TidepoolGame` tạo Worker ở lượt máy đầu tiên (chế độ 2 người không bao giờ tải nó), gửi `{ id, state, difficulty }`, bỏ trả lời có `id` cũ, chờ đủ 650 ms rồi mới đi.

## 4. Luồng trận

- `select`: chỉ trong lượt người. Bấm bi không phải của mình thì bỏ chọn. Bấm bi đã chọn thì bỏ nó (nếu phần còn lại không còn thẳng hàng thì bỏ hết). Bấm bi mới: nếu nối tiếp được hàng thì thêm vào, không thì bắt đầu lại từ bi đó.
- `move`: kiểm tra nguồn (người / máy), áp dụng nước, xoá lựa chọn, cộng ván thắng nếu vừa thắng.
- `fresh`: bàn mới với `gameId + 1`; người đi trước luân phiên, hoặc về Pearl khi xoá tỉ số.

## 5. Cảnh 3D

`TidepoolController`:

- Đầm phá hoàng hôn với vòng đảo cọ; bục cát chia ô theo vòng có nhiễu, đá ở chỗ nước nông, sao biển, đèn đá (ánh sáng nướng sẵn vào cát).
- Bàn: mỗi lỗ là một ô lục giác lõm, sáng dần về tâm; tường dưới mỗi cạnh ngoài để tổ ong nhô khỏi rãnh. Rãnh dốc quanh bàn, cao nhất ở xa bên trái, hở ở góc 0 nơi bắt đầu máng; khay bên phải có hàng Pearl gần bàn và hàng Coral phía sau, mỗi bi một chỗ lõm.
- Bi: vật liệu clearcoat; Pearl có ánh iridescence nhẹ, Coral bóng sâu hơn; phản chiếu env map nhỏ của bầu trời. Mặt trời chỉ đổ bóng trên bục.
- Hoạt ảnh lấy từ `view.last`: bi trượt; bi bị hất đi theo đường cong qua mép, quanh rãnh, xuống máng, vào ô khay. Shadow map vẽ lại đủ lâu để bi lăn tới khay.
- Picking trả `{ kind: 'move', index }` khi trúng điểm vàng, hoặc `{ kind: 'cell', cell }` (−1 là ngoài bàn).
- Camera hạ điểm nhìn dưới bàn để HUD dưới không che; màn hình dọc thì lùi theo bề rộng bàn + rãnh + khay.

## 6. Theme

Class `.lagoon` trên `.stage`.
