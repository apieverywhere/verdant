# Design — Ember & Tide (thả quân 5×5×5)

> Giai đoạn 2 của SDD. Hợp đồng controller, tải lười, hiệu năng và vòng đời WebGL dùng chung: [game-lobby/design.md §6](../game-lobby/design.md#6-cảnh-3d-dùng-chung).

## 1. Mô hình dữ liệu

Chỉ số ô: `i = x + 5·z + 25·y` (y là tầng), chỉ số cột: `col = x + 5·z`. Dùng lại `Player`/`Cell` của `lib/game/types.ts`: X = Fire, O = Water.

`src/lib/fire-water/` tách khỏi `lib/game/` vì hai game khác nhau ở mọi luật:

- `rules.ts` — engine thuần: `createGame`, `applyMove(state, col)`, `dropCell`, `stackHeight`, `wouldWin`, bảng `LINES` (302 đường) và `CELL_LINES` (các đường đi qua từng ô). Nước không hợp lệ trả về chính `state`.
- `match.ts` — reducer trận, cùng nhóm action với các game khác; người đi trước theo `nextStarter`.
- `ai.ts` — `chooseColumn(state, difficulty, random)`: Easy và Medium chấm điểm một lớp như design, Hard gọi `search.ts`.
- `search.ts` — Hard (xem §2).
- `ai.worker.ts` — chạy `chooseColumn` trong Web Worker. `FireWaterGame` gửi `{ id, state, difficulty }`, bỏ qua trả lời có `id` cũ, chờ đủ 650 ms “đang nghĩ” rồi mới đi.

## 2. AI

| Mức | Cách chơi |
|---|---|
| Easy | 35% đi ngẫu nhiên; còn lại chấm điểm theo đường còn sống, không nhìn ô phía trên |
| Medium | thắng ngay > chặn > tránh làm lộ ô phía trên cho đối thủ > chấm điểm đường, kèm nhiễu nhỏ |
| Hard | negamax + alpha-beta, đào sâu dần tới 16 ply, giới hạn 300 000 nút |

Chi tiết Hard:

- Đếm quân theo từng đường và cập nhật tăng dần khi đặt/gỡ quân, nên mỗi nút chỉ chạm các đường đi qua ô vừa đặt thay vì quét 302 đường.
- Thắng ngay và chặn bắt buộc được xử lý trước khi rẽ nhánh.
- Đường càng cao càng nhẹ ký (mỗi tầng giảm một nửa) vì ô trên cao chỉ đi được khi cột bên dưới đã đầy.
- Ngân sách 300 000 nút đạt 6–7 ply (0,5–1 s/nước trên laptop). Tự đấu: 100 000 nút đã thắng ngân sách cũ 30 000 nút 19–1, nhưng ở nước mở đầu chỉ tới 5 ply, khiến việc chồng lên quân giữa trông có vẻ tốt; 300 000 nút tới được 6 ply.

## 3. Cảnh 3D

`FireWaterController` (`src/lib/scene/FireWaterController.ts`):

- Hồ băng: shader mặt nước có cực quang phản chiếu, đảo tuyết, thông, hai lò lửa và hai đèn thuỷ triều quanh bàn. Dùng lại `Geo`, `waterMaterial`; thêm `Geo.extrude`, `moonSkyMaterial`, `moonTerrainH`.
- Quân: hình trụ vát cạnh, vật liệu vật lý phản chiếu env map nhỏ; mặt trăng đổ bóng. Pool 125 mesh, đổi `geometry` theo chủ quân thay vì giữ 250 mesh.
- Picking giải tích: thử mặt bàn trước, rồi giao tia với từng hình trụ cột (thân + nắp), lấy giao điểm gần nhất. Nhờ vậy bấm vào chồng quân cao vẫn trúng đúng cột.
- Shadow map vẽ lại khi có quân rơi và trong suốt lúc có đường thắng (thanh vàng chuyển động).

## 4. Theme

Class `.moon` trên `.stage` đổi bộ biến CSS sang bảng màu hồ băng.
