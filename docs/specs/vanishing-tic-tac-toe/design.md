# Design — Caro 3×3 “Vanishing”

> Giai đoạn 2 của SDD: mô tả *xây như thế nào*. Mỗi mục tham chiếu requirement tương ứng (R‑x.y).

## 1. Kiến trúc tổng quan

```
src/
├── app/                      Next.js App Router
│   ├── layout.tsx            font Be Vietnam Pro (next/font), metadata, <html lang="vi">
│   ├── page.tsx              render <Game/>
│   └── globals.css           token màu + style HUD (glass panels, nút, segmented)
├── components/
│   ├── Game.tsx              client component: state ván đấu, điểm, chế độ, lịch AI, HUD
│   └── BoardScene.tsx        client component: mount/unmount three.js scene vào <canvas>
└── lib/
    ├── game/
    │   ├── types.ts          Player, Cell, GameState, Difficulty
    │   ├── rules.ts          engine thuần: createGame, applyMove, legalMoves, … (R1–R3)
    │   ├── match.ts          reducer cấp trận: điểm, chế độ, độ khó, đổi người đi trước (R1.2, R4)
    │   └── ai.ts             negamax + alpha‑beta + bảng chuyển vị, heuristic, độ khó (R5)
    └── scene/
        ├── geometry.ts       bộ dựng low‑poly (tri/quad/box/frustum/torus → BufferGeometry)
        ├── terrain.ts        noise, fbm, chiều cao địa hình
        ├── shaders.ts        ShaderMaterial cho bầu trời và mặt nước
        └── SceneController.ts lớp điều khiển three.js: dựng cảnh, input, picking, animate (R6)
tests/
├── rules.test.ts             luật chơi
├── match.test.ts             luồng trận đấu, quyền đi của người/máy
├── ai.test.ts                AI: thắng ngay, chặn, alpha‑beta == minimax, tối ưu, hiệu năng
└── solver.ts                 bộ giải chính xác (retrograde) dùng làm “trọng tài” cho test
scripts/verify-ai.ts          kiểm tra AI tối ưu trên toàn bộ thế cờ
e2e/smoke.ts                  E2E: Chrome headless click thật lên canvas 3D
```

Luồng dữ liệu một chiều:

```
 click/keyboard ──► Game (React state, GameState bất biến) ──► rules.applyMove
        ▲                         │ props: view (board, queues, line, winner, turn …)
        │                         ▼
 SceneController.onPick ◄── BoardScene ──► SceneController.setView(view) ──► render loop
```

- `GameState` là **bất biến**; mọi nước đi tạo state mới → dễ test, dễ render.
- `SceneController` không giữ luật chơi; chỉ nhận `view` và tự suy ra hiệu ứng
  (quân mới xuất hiện → anim rơi; quân mất đi → anim biến mất) bằng cách so sánh với view trước.
- AI chạy đồng bộ trong `setTimeout` (≈ 600 ms “suy nghĩ” cho cảm giác tự nhiên); thời gian tính thực < 100 ms.

## 2. Mô hình dữ liệu (R1, R2, R3)

```ts
type Player = 'X' | 'O';
type Cell = Player | null;
interface GameState {
  board: Cell[];                    // 9 ô, index = row*3 + col
  queues: Record<Player, number[]>; // ô của từng bên theo thứ tự đặt, cũ nhất ở đầu (≤ 3)
  turn: Player;
  winner: Player | 'D' | null;      // 'D' = hòa
  line: number[] | null;            // 3 ô thắng
  history: Record<string, number>;  // positionKey → số lần xuất hiện (luật hòa)
  lastRemoved: { cell: number; player: Player } | null;
  moveCount: number;
}
```

`positionKey = board + '|' + queues.X + '|' + queues.O + '|' + turn` — gồm cả thứ tự đặt quân,
vì hai thế cờ cùng vị trí nhưng khác thứ tự sẽ diễn biến khác nhau.

### applyMove(state, cell) — thứ tự xử lý

1. Bỏ qua (trả về chính `state`) nếu ván đã kết thúc, ô ngoài 0‥8, hoặc ô không trống (R1.4, R1.6).
2. Đặt quân, đẩy `cell` vào cuối `queues[turn]`.
3. Nếu `queues[turn].length > 3` → lấy phần tử đầu ra, xóa ô đó (R2.2) và ghi `lastRemoved`.
4. Kiểm tra 8 đường thắng cho `turn` → nếu có: `winner = turn`, `line` (R1.5).
5. Nếu chưa thắng: đổi lượt, tăng `history[positionKey]`; nếu đạt 3 → `winner = 'D'` (R3.1).

`vanishingCell(state)` = `queues[turn][0]` khi `queues[turn].length === 3`, ngược lại `null` (R2.4).
`Game.tsx` chỉ truyền giá trị này xuống HUD/cảnh 3D khi đấu với máy; chế độ 2 người truyền `null` để không lộ quân sắp mất.

**Quyết định thiết kế:** quân cũ biến mất *trước* khi kiểm tra thắng. Đây là luật phổ biến của
“Infinite / Vanishing tic‑tac‑toe” và đảm bảo bất biến “≤ 3 quân” luôn đúng, kể cả tại khoảnh khắc thắng.

## 3. AI — Negamax + alpha‑beta (R5)

### 3.1 Biểu diễn trong lúc tìm kiếm

AI không dùng `GameState` bất biến (tốn cấp phát) mà dùng cấu trúc **mutable** với `make/unmake`:
mảng `board` 9 ô và 2 hàng đợi. `make` ghi lại ô bị xóa để `unmake` khôi phục chính xác.

### 3.2 Thuật toán

```
negamax(pos, depth, α, β, ply):
  nếu depth == 0: return evaluate(pos)          // điểm theo góc nhìn bên tới lượt
  best = -∞
  for move in orderedMoves(pos):
    make(move)
    if thắng: score = WIN - ply                 // thắng càng sớm càng tốt
    else:     score = -negamax(pos, depth-1, -β, -α, ply+1)
    unmake(move)
    best = max(best, score); α = max(α, score)
    if α ≥ β: break                            // cắt tỉa alpha‑beta
  return best
```

- **Negamax** là dạng gọn của minimax cho trò chơi tổng‑bằng‑không: `max(a,b) = -min(-a,-b)`.
- **Sắp xếp nước đi** (giúp cắt tỉa nhiều hơn): nước thắng ngay → nước chặn đối thủ → ô giữa → góc → cạnh.
- **Chọn ngẫu nhiên trong các nước tốt nhất (R5.8):** ở gốc, mỗi nước con được tìm với cửa sổ
  `(best − 1, +∞)` — điểm là số nguyên nên nước bằng điểm `best` vẫn trả về giá trị chính xác,
  nước kém hơn bị cắt sớm.
- **Bảng chuyển vị (transposition table):** trong biến thể này thế cờ lặp lại liên tục (quân biến mất
  rồi được đặt lại), nên mỗi lần `search` dùng một `Map` lưu `{depth, value, bound}` theo khóa số nguyên
  của (thứ tự quân X, thứ tự quân O, lượt). Điểm thắng/thua được lưu tương đối theo nút (`±ply`) để
  dùng lại đúng ở mọi độ sâu. Giảm ~3× số nút ở thế khó nhất (bàn trống: 125 885 → 40 181 nút).

### 3.3 Hàm lượng giá (depth = 0)

Từ góc nhìn bên tới lượt `P` (đối thủ `Q`):

- “Quân bền” của một bên = các quân **không** biến mất ở nước kế tiếp của bên đó
  (nếu có 3 quân, loại quân cũ nhất). Đây là điểm mấu chốt của biến thể vanishing:
  một hàng 2 quân có chứa quân sắp biến mất **không** phải là đe dọa thật.
- Với mỗi đường: chỉ có quân bền của một bên + ô còn lại trống → +10 (2 quân) / +1 (1 quân).
- `P` đang tới lượt và có đe dọa thật → gần như thắng chắc: +50.
- Ô giữa: +3.

`evaluate = score(P) − score(Q)` (được chặn trong ±(WIN/2) để luôn thấp hơn điểm thắng thật).

### 3.4 Độ khó

| Mức | Độ sâu (ply) | Ngẫu nhiên | Hành vi |
|-----|--------|-----------|---------|
| Dễ  | 1 | 35% đi ngẫu nhiên | thấy nước thắng ngay, hay bỏ lỡ chặn |
| Vừa | 3 | 0% | thắng ngay, luôn chặn; thấy bẫy ngắn |
| Khó | 18 | 0% | tối ưu tuyệt đối (kiểm chứng trên toàn bộ 133 364 thế cờ) |

Độ sâu mức Khó được chọn bằng thực nghiệm với bộ giải chính xác (§3.5):

| Độ sâu | Thế cờ chọn sai (mẫu 1/7) | Trung bình | Chậm nhất |
|---|---|---|---|
| 6  | 260 | 0.04 ms | 4.5 ms |
| 10 | 123 | 0.14 ms | 8.2 ms |
| 14 | 2   | 0.51 ms | 20.9 ms |
| 18 | **0** | 2.4 ms | 78 ms (trước khi thêm bảng chuyển vị) |

Lý do: chuỗi thắng cưỡng bức dài nhất của game là **17 ply**, nên độ sâu 18 luôn nhìn thấy kết thúc.

### 3.5 Kiểm chứng (retrograde solver)

`tests/solver.ts` liệt kê mọi thế cờ hợp lệ (bàn + thứ tự đặt quân + lượt), rồi phân tích ngược
từ thế kết thúc để gán nhãn chính xác `WIN / LOSS / DRAW(vòng lặp vô hạn)` cho bên tới lượt.
Test dùng nhãn này để khẳng định AI mức Khó: từ thế WIN luôn chọn nước dẫn tới LOSS cho đối thủ;
từ thế DRAW không bao giờ chọn nước để đối thủ WIN.

Kết quả phân tích (đáng chú ý cho người chơi):

- 133 364 thế cờ hợp lệ: 91 418 WIN · 26 776 LOSS · 15 170 DRAW (cho bên tới lượt).
- **Thế mở đầu là WIN cho người đi trước — thắng chắc trong 13 ply** nếu chơi hoàn hảo.
  Vì vậy luật “người thua ván trước đi trước” (R1.2) quan trọng cho sự công bằng; khi người chơi
  đi trước, họ có thể thắng mức Khó nếu chơi chuẩn xác.
- Unit test kiểm tra mẫu 1/40; `bun run verify:ai` kiểm tra toàn bộ (≈ 5 phút).

## 4. Cảnh 3D — three.js (R6)

Port 1‑1 từ design (vốn viết bằng WebGL thuần) sang three.js:

| Design (WebGL) | three.js |
|---|---|
| Ma trận persp/lookAt tự viết | `PerspectiveCamera(fov 0.85 rad ≈ 48.7°)`, `camera.lookAt` |
| Shader main: hemi + sun diffuse | `MeshLambertMaterial({ vertexColors, flatShading })` + `HemisphereLight` + `DirectionalLight` (cường độ π để khớp công thức gốc) |
| Fog `1-exp(-(d·k)²)` | `FogExp2(fogColor, 0.0072)` — cùng công thức |
| Shader bầu trời (gradient, mặt trời, sao) | `ShaderMaterial` trên `SphereGeometry`, `BackSide`, bám theo camera |
| Nước có `uSpec` gợn + phản chiếu Fresnel | `ShaderMaterial` riêng (port shader gốc, có fog) |
| `uEmis` (phát sáng) | `material.emissive` + `emissiveIntensity` |
| Tia chọn ô tự tính | `Raycaster` lên 9 mesh ô |
| 26 đèn trời vẽ từng cái | `InstancedMesh` |

Màu: `ColorManagement.enabled = false`, `outputColorSpace = LinearSRGBColorSpace` → giá trị màu
được dùng nguyên như shader gốc, cho ra đúng tông màu của design.

Quân cờ: mỗi ô có sẵn 1 mesh X và 1 mesh O (vật liệu riêng để anim độc lập).
Trạng thái anim từng ô: `placedAt`, `vanishAt`. Quân sắp biến mất: opacity dao động 0.45–0.8,
nảy nhẹ. Quân biến mất: 450 ms thu nhỏ → 0, bay lên 1.6, opacity → 0.

## 5. Giao diện (R4, R7)

Giữ nguyên bố cục/màu của design: panel kính `rgba(22,18,44,.62)` + `backdrop-filter: blur(12px)`,
nhấn vàng `#ffd27a`, X `#ff7a6b`, O `#4fd8cc`, nền `#1a1d4e`, font Be Vietnam Pro.
Bổ sung theo yêu cầu biến thể: nhóm độ khó (khi đấu máy), chip “quân sắp biến mất” trong thanh
trạng thái, dòng hướng dẫn luật. Lưới 9 nút sr‑only phục vụ bàn phím và E2E test.

## 6. Rủi ro & xử lý

| Rủi ro | Xử lý |
|---|---|
| Màn hình dọc (điện thoại) cắt mất bàn cờ | Khoảng cách camera nhân thêm hệ số theo FOV ngang để bàn luôn vừa khung |
| Đồ thị trạng thái có chu trình → minimax vô hạn | Giới hạn độ sâu + luật hòa lặp 3 lần ở cấp ván |
| AI chậm ở độ sâu lớn | Sắp xếp nước + alpha‑beta; đo trong test (R5.6) |
| SSR với three.js (không có `window`) | `BoardScene` là client component, khởi tạo trong `useEffect` |
| WebGL không có | `try/catch` khi tạo renderer → hiện thông báo (R6.4) |
| Rò rỉ GPU khi unmount (React StrictMode mount 2 lần) | `dispose()` geometry/material/renderer, gỡ listener |
