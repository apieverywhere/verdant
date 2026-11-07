# Design — Verdant (sảnh game) & Ember & Tide 5×5×5

> Giai đoạn 2 của SDD.

## 1. Route

| Route | File | Nội dung |
|---|---|---|
| `/` | `src/app/page.tsx` → `components/Lobby.tsx` | Sảnh, Server Component thuần |
| `/lantern-line` | `src/app/lantern-line/page.tsx` → `components/Game.tsx` | Lantern Line (caro 3×3) |
| `/ember-and-tide` | `src/app/ember-and-tide/page.tsx` → `components/FireWaterGame.tsx` | Ember & Tide |

Tên và route của game nằm ở `src/lib/games.ts`. Route cũ `/tic-tac-toe`, `/fire-and-water` chuyển hướng 308 sang route mới (`next.config.ts`). Thư mục code nội bộ (`lib/game`, `lib/fire-water`, `FireWaterGame`) giữ tên cũ.

“Game chơi gần nhất”: mỗi trang game gọi `rememberGame(id)` khi mở (`lib/recentGame.ts`, `localStorage`). `PlayRecentLink` đọc giá trị qua `useSyncExternalStore`; server luôn render game mặc định, nên không lệch hydration, và trình duyệt chặn storage thì vẫn về game mặc định.

Mỗi page tự khai báo `metadata` và `viewport.themeColor` theo màu nền của cảnh.

## 2. Mô hình dữ liệu

Chỉ số ô: `i = x + 5·z + 25·y`, chỉ số cột: `col = x + 5·z`. Dùng lại `Player`/`Cell`/`Outcome`: X = Fire, O = Water.

`src/lib/fire-water/` tách biệt khỏi `lib/game/` vì hai game khác nhau ở mọi luật:

- `rules.ts` — engine thuần: `createGame`, `applyMove(state, col)`, `dropCell`, `stackHeight`, bảng `LINES` và `CELL_LINES`.
- `ai.ts` — `chooseColumn(state, difficulty, random)`: Easy và Medium chấm điểm một lớp theo thiết kế, Hard gọi `search.ts`.
- `search.ts` — negamax + alpha-beta, đào sâu dần trong giới hạn số nút; đếm quân theo từng đường để cập nhật lượng giá và phát hiện thắng tăng dần thay vì quét 302 đường mỗi nút. Thắng ngay và chặn bắt buộc được xử lý trước khi rẽ nhánh.
- `match.ts` — reducer trận, cùng hình dạng action với caro.

## 3. Cảnh 3D

`FireWaterController` là bản song song của `SceneController`: cùng hợp đồng (nhận view thuần, tự suy ra hoạt ảnh bằng diff), cùng quy ước ánh sáng và `glow()`. Dùng lại `Geo`, `waterMaterial`; thêm `Geo.extrude`, `moonSkyMaterial` (cực quang), `moonTerrainH`.

- Pool 125 mesh, đổi `geometry` theo chủ quân thay vì giữ 250 mesh.
- Picking giải tích như thiết kế: mặt bàn trước, rồi ray với từng hình trụ cột (thân + nắp) lấy giao gần nhất; Raycaster chỉ cấp tia. Nhờ vậy bấm vào chồng quân cao vẫn trúng đúng cột.

## 4. Vòng đời WebGL

Điều hướng SPA tạo canvas mới cho mỗi lần vào game, nên `dispose()` phải trả context ngay thay vì chờ GC. Không thể gọi `forceContextLoss()` vô điều kiện: Strict Mode chạy lại effect trên chính canvas đó, context mất thì cảnh trắng. Vì cleanup của `useEffect` chạy sau khi DOM đã gỡ, `canvas.isConnected` phân biệt được unmount thật với lần chạy lại.

## 5. HUD & theme

`components/Hud.tsx` gom phần chung: `TitleCard`, `Score`, `StatusPill`, `Toolbar`. Màu lấy từ biến CSS; class `.moon` trên `.stage` đổi bộ biến sang bảng màu hồ băng, nên không có CSS riêng cho từng game.

## 6. Khác biệt có chủ đích so với canvas

- Artboard Main vẽ caro thường với AI minimax không biến mất. Game thật giữ luật vanishing, độ khó và AI đã kiểm chứng (L2.1), và thêm dòng gợi ý luật vào phụ đề.
- Hai placeholder trong canvas không đưa lên bản chạy: `[Game #3]` thành “More games”, `[Contact / social links]` bỏ đi cho tới khi có link thật.
