# Verdant

Sảnh game 3D chơi ngay trên trình duyệt. Cảnh low‑poly dựng bằng **three.js**, giao diện
**Next.js 16 + React 19**, chạy và build bằng **Bun**.

| Route | Game |
|---|---|
| `/` | Sảnh game; nút Play now / Play ở hero đưa về game chơi gần nhất (mặc định Lantern Line) |
| `/lantern-line` | **Lantern Line** (Tic‑Tac‑Toe 3×3) biến thể **vanishing**: mỗi bên chỉ giữ tối đa **3 quân**, đặt quân thứ 4 thì quân đặt sớm nhất của mình biến mất; máy chơi bằng **minimax + alpha‑beta pruning** |
| `/ember-and-tide` | **Ember & Tide** (5×5×5, Fire vs Water): quân rơi vào 25 cột, cao tối đa 5; **4 quân liền nhau theo bất kỳ hướng 3D nào** là thắng |
| `/tidepool` | **Tidepool** (bàn lục giác 61 lỗ, Pearl vs Coral): đẩy hàng bi, **đẩy 6 bi của đối thủ xuống biển** là thắng |
| `/canopy` | **Canopy** (bàn 5×5, Amber vs Violet): đi một người leo, cho một ô cây mọc, có thể phá một cây lùi một nấc, **thắp đèn lồng trên 2 ngọn cây cùng lúc** là thắng |

![Sảnh game](e2e/screenshots/7-lobby.png)

Mọi game mở ở chế độ đấu máy, mức Dễ. Nút **Cài đặt** (bánh răng, trên header và trong mỗi game) cho chọn
ngôn ngữ **English / Tiếng Việt** và chỉnh âm lượng nhạc nền, hiệu ứng. Nhạc và hiệu ứng được **tổng hợp bằng Web Audio**
(`src/lib/audio/`): mỗi cảnh một theme ambient riêng (hoàng hôn, hồ băng, đầm phá, rừng bình minh), chỉ phát trong trang
game sau lần chạm đầu tiên; sảnh im lặng. File âm thanh duy nhất là tiếng gió nền `public/audio/wind.mp3`.

**Nguồn âm thanh:** “Wind Blowing” của [SoundReality](https://pixabay.com/users/soundreality-31074404/) trên
[Pixabay](https://pixabay.com/sound-effects/nature-wind-blowing-457954/), giấy phép Pixabay Content License (miễn phí, không bắt buộc ghi công);
được cắt thành vòng lặp liền mạch, chuyển mono và chuẩn hoá âm lượng bằng ffmpeg.

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
bun test             # 131 unit test: luật chơi, luồng trận, AI của cả bốn game, âm thanh
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

Máy có 3 mức (`src/lib/fire-water/ai.ts`, spec: [`docs/specs/ember-and-tide/`](docs/specs/ember-and-tide/)):

| Mức | Cách chơi |
|---|---|
| Dễ | 35% đi ngẫu nhiên, còn lại chấm điểm theo đường còn sống, không nhìn ô phía trên |
| Trung bình | luôn thắng ngay và chặn, tránh làm lộ ô phía trên cho đối thủ |
| Khó | negamax + alpha‑beta đào sâu dần (`search.ts`), giới hạn 300 000 nút (~0,5–1 s/nước trong Web Worker), đọc 6–7 ply |

## Luật Tidepool

1. Bàn lục giác 61 lỗ, mỗi bên 14 viên bi. Pearl đi trước ở ván đầu, sau đó người đi trước đổi luân phiên.
2. Mỗi lượt chọn 1–3 viên bi của mình nằm liền nhau trên một đường thẳng và đi 1 ô (các điểm vàng chỉ chỗ đi được).
3. Đi **dọc theo đường**: hàng nhiều bi hơn được đẩy hàng ít hơn của đối thủ (3 đẩy 2, 3 đẩy 1, 2 đẩy 1); bằng nhau hoặc có bi mình chắn phía sau thì không đẩy được.
4. Đi **ngang** (2–3 viên cùng bước sang bên): mọi ô đích phải trống, không bao giờ đẩy.
5. Bi bị đẩy ra khỏi mép lăn theo rãnh xuống khay; ai đẩy được **6 viên** trước là thắng.

Máy (Coral) có 3 mức (`src/lib/tidepool/ai.ts`, chạy trong Web Worker):

| Mức | Cách chơi |
|---|---|
| Dễ | nhìn 1 nước, 35% đi ngẫu nhiên |
| Trung bình | AI 2 ply của design: với mỗi nước, giả sử đối thủ đáp trả tệ nhất cho mình |
| Khó | negamax + alpha‑beta đào sâu dần, bảng chuyển vị, quiescence cho các nước đẩy rơi (`search.ts`), giới hạn 400 000 nút (~0,7 s/nước trên laptop, tối đa ~1,6 s, đọc 4–6 ply). Khi đang dẫn thì ép vào giữa; tránh lặp lại thế cờ đã gặp để không đi vòng vòng |

Đo bằng `bun scripts/bench-tidepool.ts` (đấu cả ván, hai bên đổi lượt đi trước).

## Luật Canopy

1. Bàn 5×5 toàn rêu, mỗi bên 2 người leo. Amber đi trước ở ván đầu, sau đó người đi trước đổi luân phiên.
2. Mỗi lượt có ba bước. **Đi**: chọn một người leo, bước sang 1 trong 8 ô xung quanh; lên cao tối đa 1 tầng, xuống bao nhiêu tầng cũng được; không vào ô có người leo hoặc ô đã nở hoa.
3. **Mọc** (bắt buộc): cho một ô trống cạnh người leo vừa đi mọc thêm một nấc: rêu → cây non → cây nhỡ → ngọn cây → hoa.
4. **Phá** (tùy chọn): phá một cây cạnh người leo đó lùi một nấc, hoặc bấm *Skip cutting*. Không phá được cây vừa cho mọc trong lượt, ô rêu và ô có người đứng. Phá ngọn cây thì đèn trên đó tắt; hoa bị phá thành ngọn cây (chưa có đèn). Không còn cây nào để phá thì lượt tự kết thúc.
5. Bước lên **ngọn cây** thì thắp đèn lồng màu mình ở đó (đèn vẫn sáng khi rời đi); bước lên ngọn cây đang có đèn của đối thủ thì giành luôn đèn.
6. Ngọn cây mọc thêm lần nữa thì **nở hoa**: không ai đứng được và đèn trên đó tắt.
7. Ai có **2 đèn lồng màu mình sáng cùng lúc** là thắng. Đến lượt mà không bước được nước nào thì thua. Vì cây có thể bị phá, ván không có giới hạn: nếu giằng co mãi thì người chơi tự bấm *New game*.

Máy (Violet) có 3 mức (`src/lib/canopy/ai.ts`, chạy trong Web Worker):

| Mức | Cách chơi |
|---|---|
| Dễ | chỉ nhìn lượt của mình, 35% đi ngẫu nhiên |
| Trung bình | cùng thuật toán với mức Khó nhưng chỉ 6 000 nút: thấy được đe dọa trực tiếp, không tính xa |
| Khó | negamax + alpha‑beta đào sâu dần trên cả lượt (đi + mọc + phá) (`search.ts`), giới hạn 250 000 nút (~0,7 s/nước trên laptop, tối đa ~2 s, đọc 3–4 lượt) |

Cây trên bàn (`src/lib/scene/trees.ts`) là cây low‑poly thật: thân cong có rễ và cành, tán gồm nhiều cụm lá; 4 nấc mọc là cùng một cây ở các tuổi khác nhau, đỉnh tán phẳng để người leo đứng.

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
src/components/          Lobby, Hud (HUD dùng chung), SettingsDialog, Game + BoardScene, FireWaterGame + FireWaterScene, TidepoolGame + TidepoolScene, CanopyGame + CanopyScene
src/lib/game/            Tic‑Tac‑Toe: types, rules (engine thuần), match (reducer trận), ai
src/lib/fire-water/      Ember & Tide: rules, match, ai
src/lib/tidepool/        Tidepool: rules, match, ai
src/lib/canopy/          Canopy: rules, match, ai, search
src/lib/settings.ts, i18n.ts  cài đặt (ngôn ngữ, âm lượng) và từ điển Anh/Việt
src/lib/audio/           engine (AudioContext, kênh nhạc / hiệu ứng), sfx (hiệu ứng tổng hợp), music (4 theme ambient), hook React
public/audio/wind.mp3    tiếng gió nền (Pixabay, xem Nguồn âm thanh)
src/lib/scene/           SceneController, FireWaterController, TidepoolController, CanopyController (three.js), geometry, terrain, shaders, trees
tests/                   bun test + bộ giải chính xác
scripts/verify-ai.ts     kiểm tra AI toàn bộ thế cờ
scripts/bench-tidepool.ts  đấu thử các mức AI của Tidepool
e2e/smoke.ts             kiểm thử trình duyệt
docs/specs/…             spec SDD: requirements → design → tasks
```

## Quy trình phát triển (SDD)

Dự án theo **Spec‑Driven Development**: mọi tính năng bắt đầu từ spec trong `docs/specs/`.
Mục lục, quy ước và trạng thái từng spec ở [`docs/specs/README.md`](docs/specs/README.md).

| Spec | Phạm vi |
|---|---|
| [`vanishing-tic-tac-toe`](docs/specs/vanishing-tic-tac-toe/) | Lantern Line |
| [`game-lobby`](docs/specs/game-lobby/) | Sảnh, hướng dẫn chơi, khung game dùng chung |
| [`ember-and-tide`](docs/specs/ember-and-tide/) | Ember & Tide |
| [`tidepool`](docs/specs/tidepool/) | Tidepool |
| [`canopy`](docs/specs/canopy/) | Canopy |
| [`site-seo`](docs/specs/site-seo/) | Trang phụ, pháp lý, SEO, thống kê |
| [`settings-i18n`](docs/specs/settings-i18n/) | Cài đặt: Anh/Việt, âm lượng (âm thanh làm sau) |

Mỗi spec có ba file: `requirements.md` (user story + tiêu chí EARS) → `design.md` (kiến trúc, dữ liệu,
thuật toán) → `tasks.md` (việc cần làm, mỗi việc trỏ về requirement và cách kiểm chứng).
Khi đổi luật hay AI: sửa spec trước → cập nhật test → sửa code → `bun test` (và `bun run verify:ai` với Lantern Line).
