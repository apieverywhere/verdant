# Verdant

Sảnh game 3D chơi ngay trên trình duyệt. Cảnh low‑poly dựng bằng **three.js**, giao diện
**Next.js 16 + React 19**, chạy và build bằng **Bun**.

| Route | Game |
|---|---|
| `/` | Sảnh game; nút Play now / Play ở hero đưa về game chơi gần nhất (mặc định Lantern Line) |
| `/lantern-line` | **Lantern Line** (Tic‑Tac‑Toe 3×3) biến thể **vanishing**: mỗi bên chỉ giữ tối đa **3 quân**, đặt quân thứ 4 thì quân đặt sớm nhất của mình biến mất; máy chơi bằng **minimax + alpha‑beta pruning** |
| `/ember-and-tide` | **Ember & Tide** (5×5×5, Fire vs Water): quân rơi vào 25 cột, cao tối đa 5; **4 quân liền nhau theo bất kỳ hướng 3D nào** là thắng |

![Sảnh game](e2e/screenshots/7-lobby.png)

## Chạy nhanh

Yêu cầu: [Bun](https://bun.sh) ≥ 1.4 (`curl -fsSL https://bun.sh/install | bash`). Không cần cài Node.

```bash
bun install          # cài dependency
bun run dev          # phát triển: http://localhost:3000
bun run build        # build production
bun run start        # chạy bản production (thêm -p 3123 để đổi cổng)
```

## Kiểm thử

```bash
bun test             # 74 unit test: luật chơi, luồng trận, AI của cả hai game
bun run typecheck    # TypeScript strict
bun run verify:ai    # kiểm tra AI mức Khó tối ưu trên TOÀN BỘ 133 364 thế cờ (~5 phút)
bun run e2e          # E2E bằng Chrome headless (cần server đang chạy ở cổng 3123)
```

E2E (`e2e/smoke.ts`) click thật lên canvas 3D (chiếu tâm ô ra tọa độ màn hình), kiểm tra sảnh, luật
biến mất, xếp chồng, thắng, khóa bàn, đấu máy, bàn phím, bố cục điện thoại, không rò rỉ WebGL context
khi chuyển trang và không có lỗi console; ảnh chụp lưu ở `e2e/screenshots/`. Mặc định dùng Google
Chrome cài sẵn trên macOS, đổi bằng biến `CHROME_PATH`.

## Luật Ember & Tide

1. Bàn 5×5, Fire và Water luân phiên chọn một ô; quân rơi xuống vị trí thấp nhất còn trống của cột đó.
2. Mỗi cột cao tối đa 5 quân. Cột đầy thì không chọn được nữa.
3. 4 quân liền nhau theo bất kỳ hướng nào (ngang, dọc, chéo, chéo không gian; 302 đường) là thắng.
4. Đủ 125 quân mà không ai thắng thì hòa. Mỗi “New game”, người thua ván trước đi trước.

Máy có 3 mức (`src/lib/fire-water/ai.ts`, spec: [`docs/specs/game-lobby/`](docs/specs/game-lobby/)):

| Mức | Cách chơi |
|---|---|
| Dễ | 35% đi ngẫu nhiên, còn lại chấm điểm theo đường còn sống, không nhìn ô phía trên |
| Trung bình | luôn thắng ngay và chặn, tránh làm lộ ô phía trên cho đối thủ |
| Khó | negamax + alpha‑beta đào sâu dần (`search.ts`), giới hạn 30 000 nút, đọc được khoảng 4–5 nước |

## Luật Tic‑Tac‑Toe 3×3

1. Bàn 3×3, X và O luân phiên; 3 quân thẳng hàng (ngang, dọc, chéo) là thắng.
2. Mỗi bên tối đa 3 quân. Khi đặt quân thứ 4, quân **cũ nhất của chính bạn biến mất trước**, rồi mới
   kiểm tra thắng (quân vừa mất không được tính).
3. Khi **đấu với máy**, quân sắp biến mất được làm **mờ và nhấp nháy**, thanh trạng thái ghi rõ vị trí của nó.
   Ở chế độ **2 người** không có gợi ý này — mỗi người phải tự nhớ quân nào của mình đặt sớm nhất.
4. Không được đặt vào ô đang có quân (kể cả quân sắp biến mất).
5. Bàn không bao giờ đầy, nên **hòa** khi cùng một thế cờ lặp lại lần thứ 3.
6. Mỗi “New game”, **người thua ván trước đi trước** (hòa hoặc bỏ dở thì đổi luân phiên) — quan trọng vì người đi trước thắng chắc nếu chơi hoàn hảo (xem dưới).

Điều khiển: kéo để xoay cảnh · cuộn để phóng to · nhấn vào ô để đánh · phím Tab để chơi bằng bàn phím · nút “?” mở hướng dẫn có hình minh họa.

## AI của Tic‑Tac‑Toe

`src/lib/game/ai.ts` — negamax (minimax cho trò chơi tổng bằng 0) + cắt tỉa alpha‑beta + bảng chuyển vị:

- **Sắp xếp nước đi**: thắng ngay → chặn → ô giữa → góc → cạnh, để cắt tỉa sớm.
- **Hàm lượng giá hiểu luật biến mất**: hàng 2 quân có chứa quân sắp biến mất không bị coi là đe dọa.
- **Nhiều nước cùng điểm tốt nhất** → chọn ngẫu nhiên để mỗi ván một khác.

| Mức | Độ sâu | Đặc điểm |
|---|---|---|
| Dễ | 1 | 35% đi ngẫu nhiên |
| Vừa | 3 | luôn thắng ngay và chặn |
| Khó | 18 | tối ưu tuyệt đối; ~2 ms/nước trung bình, bàn trống ~80 ms, đỉnh ~190 ms (lần chạy đầu/GC) — nằm gọn trong 600 ms “suy nghĩ” |

Kiểm chứng bằng bộ giải chính xác (retrograde analysis, `tests/solver.ts`) trên toàn bộ không gian
trạng thái. Kết quả thú vị: **người đi trước luôn thắng trong 13 ply nếu chơi hoàn hảo**, chuỗi thắng
cưỡng bức dài nhất là 17 ply — nên mức Khó dùng độ sâu 18.

## Cấu trúc

```
src/app/                 layout (font Be Vietnam Pro), các route, globals.css (token màu của design)
src/components/          Lobby, Hud (HUD dùng chung), Game + BoardScene, FireWaterGame + FireWaterScene
src/lib/game/            Tic‑Tac‑Toe: types, rules (engine thuần), match (reducer trận), ai
src/lib/fire-water/      Ember & Tide: rules, match, ai
src/lib/scene/           SceneController, FireWaterController (three.js), geometry, terrain, shaders
tests/                   bun test + bộ giải chính xác
scripts/verify-ai.ts     kiểm tra AI toàn bộ thế cờ
e2e/smoke.ts             kiểm thử trình duyệt
docs/specs/…             spec SDD: requirements → design → tasks
```

## Quy trình phát triển (SDD)

Dự án theo **Spec‑Driven Development**: mọi tính năng bắt đầu từ spec trong `docs/specs/`
([`game-lobby`](docs/specs/game-lobby/), [`vanishing-tic-tac-toe`](docs/specs/vanishing-tic-tac-toe/)):

1. [requirements.md](docs/specs/vanishing-tic-tac-toe/requirements.md) — user story + tiêu chí chấp nhận (EARS), đánh số R1–R8.
2. [design.md](docs/specs/vanishing-tic-tac-toe/design.md) — kiến trúc, mô hình dữ liệu, thuật toán AI, port cảnh 3D, rủi ro.
3. [tasks.md](docs/specs/vanishing-tic-tac-toe/tasks.md) — danh sách việc, mỗi việc trỏ về requirement và cách kiểm chứng.

Test được đặt tên theo requirement (`describe('R2 — vanishing rule')`…) để truy vết hai chiều.
Khi đổi luật hay AI: sửa spec trước → cập nhật test → sửa code → `bun test && bun run verify:ai`.
