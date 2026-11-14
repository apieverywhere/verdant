# Design — Canopy (leo cây, trồng cây, thắp đèn)

> Giai đoạn 2 của SDD. Hợp đồng controller, tải lười, hiệu năng và vòng đời WebGL dùng chung: [game-lobby/design.md §6](../game-lobby/design.md#6-cảnh-3d-dùng-chung).

## 1. Module

| File | Vai trò |
|---|---|
| `src/lib/canopy/rules.ts` | Engine thuần: bàn, nấc mọc, đi / mọc / tỉa, đèn, thắng, hết nước |
| `src/lib/canopy/match.ts` | Reducer trận: người leo đang chọn, số ván thắng, chế độ, độ khó, người đi trước |
| `src/lib/canopy/search.ts` | Tìm kiếm trên cả lượt: `searchTurn`, `greedyTurn`, `legalTurns` |
| `src/lib/canopy/ai.ts` | `chooseTurn`: điều phối ba mức |
| `src/lib/canopy/ai.worker.ts` | Chạy `chooseTurn` trong Worker |
| `src/lib/scene/CanopyController.ts`, `trees.ts` | Cảnh three.js và cây low-poly |
| `src/components/CanopyGame.tsx`, `CanopyScene.tsx` | Trang, HUD, lịch máy, bàn phím |

## 2. Mô hình dữ liệu

- Ô `cell = row·5 + col`, hàng tính từ phía xa. `NB[cell][dir]` cho 8 hướng, −1 nếu ra ngoài.
- Người leo đánh số 0–3: 0 và 1 của Amber, 2 và 3 của Violet (`ownerOf`, `climbersOf`).
- `CanopyState`: `level[]` (0–4), `lantern[]` (chủ đèn, chỉ ngọn cây mới có), `climbers[]`, `turn`, `phase` (`move` / `grow` / `cut`), `active` (người leo vừa đi), `winner`, `reason` (`lanterns` / `stuck`), `last` (`LastAction` cho hoạt ảnh), `lastStep` / `lastGrow` / `lastCut` (để tô sáng), `actionCount` (cảnh chạy hoạt ảnh khi số này đổi).
- Hằng số: `TREETOP = 3`, `BLOSSOM = 4`, `WIN_LANTERNS = 2`.

### Thứ tự xử lý

- `step(s, climber, to)`: kiểm tra `stepTargets`; di chuyển; nếu ô đích là ngọn cây thì thắp / giành đèn; nếu đủ 2 đèn thì thắng ngay; không thì sang `grow`.
- `grow(s, cell)`: tăng nấc; tới hoa nở thì tắt đèn. Nếu `cutTargets` (trừ ô vừa mọc) rỗng thì chuyển lượt ngay, không thì sang `cut`.
- `cut(s, cell)` / `skipCut(s)`: tỉa lùi một nấc (xuống dưới ngọn cây thì mất đèn) rồi chuyển lượt.
- Chuyển lượt (`pass`): nếu bên kế tiếp không có người leo nào bước được thì bên đó thua (`reason = 'stuck'`). Chỉ cần xét bước đi: người leo bước được thì luôn mọc được (ô vừa rời đi còn trống).
- Mọi hàm trả về chính `state` khi thao tác không hợp lệ.

## 3. Máy

Một **lượt** (`Turn`) gồm `climber`, `to`, `grow`, `cut`; −1 là phần không chơi (`cut = −1` nghĩa là bỏ tỉa, `grow = −1` khi bước đi đã thắng). Lượt đóng gói thành một số nguyên 20 bit.

| Mức | Cách chơi |
|---|---|
| Easy | 35% một lượt ngẫu nhiên; còn lại `greedyTurn`: chấm điểm chính xác mọi lượt ở gốc, cộng nhiễu tới 10 điểm |
| Medium | `searchTurn` với 6 000 nút |
| Hard | `searchTurn` với 250 000 nút: negamax + alpha-beta, đào sâu dần tới 8 lượt |

- Vị trí tìm kiếm nằm trong typed array, lượt được make / unmake tại chỗ.
- Hàm lượng giá (`TUNE`): mỗi đèn 150 (một nửa chiến thắng); mỗi nấc người leo đang đứng +8 (chỉ từ cây nhỡ mới với tới ngọn cây); mỗi ô bước được +1; ngọn cây có thể thắp ở lượt sau +14, hoặc +60 nếu đó sẽ là đèn thứ hai (đối thủ buộc phải đáp trả).
- Lượt bằng điểm được chọn ngẫu nhiên để mỗi ván một khác.
- **Lịch trong trang:** máy nghĩ một lần ở bước `move` cho cả lượt (trong Worker, chờ đủ 650 ms), đi bước đầu và lưu phần còn lại vào `plan`. Bước mọc và tỉa (hoặc bỏ qua) được phát lần lượt, mỗi phần cách 600 ms. Nếu effect bị khởi động lại giữa lượt và kế hoạch không còn hợp lệ thì tính lại phần còn lại trên luồng chính (C5.6).

## 4. Luồng trận

- `select`: chỉ trong lượt người và ở bước `move`; bấm lại người leo đang chọn thì đặt xuống.
- `step` / `grow` / `cut` / `skipCut`: kiểm tra nguồn (người / máy), áp dụng, cộng ván thắng nếu vừa thắng, xoá lựa chọn.
- `fresh`: bàn mới với `gameId + 1`; người đi trước luân phiên, hoặc về Amber khi xoá tỉ số.
- Trang tính `targets` theo bước: `stepTargets` / `growTargets` / `cutTargets(…, lastGrow)`; bấm vào target thì làm thao tác của bước, bấm người leo thì chọn, bấm chỗ khác thì bỏ chọn; giữa lượt chỉ các điểm đánh dấu phản hồi.

## 5. Cảnh 3D

`CanopyController`:

- Ánh sáng của design chiếu từ phía sau (hướng mặt trời mọc), được xoay sang bên để mặt người chơi nhìn thấy được chiếu sáng.
- Cây trên bàn (`trees.ts`): `growthStage(level, seed)` dựng thân cong thon dần có rễ và vài cành, tán gồm các cụm lá đa diện; mỗi nấc là cùng cây ở tuổi khác; tán phẳng trên đỉnh tại `CROWN_BASE`, người leo đứng ở độ cao theo nấc. Mỗi nấc có vài biến thể (`stageGeo[level − 1][variant]`).
- Điểm đánh dấu: đĩa vàng (bước), mầm xanh (mọc), mũi tên san hô (tỉa), nhấp nhô trên ô.
- Picking: tia với hộp đứng ở tâm mỗi ô, lấy giao điểm gần nhất; chỉ nhận ô có điểm đánh dấu hoặc có người leo của bên đang đi.
- Rừng bao quanh (`forestTree`, `pine`, `bush`), bục đá rêu, nấm, đom đóm.

## 6. Theme

Class `.forest` trên `.stage`.
