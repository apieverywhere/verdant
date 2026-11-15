# Design — Verdant: sảnh, hướng dẫn chơi, khung game dùng chung

> Giai đoạn 2 của SDD.

## 1. Route và trang

| Route | File | Nội dung |
|---|---|---|
| `/` | `src/app/page.tsx` → `components/Lobby.tsx` | Sảnh |
| `/lantern-line` | `src/app/lantern-line/page.tsx` → `components/Game.tsx` + `BoardScene.tsx` | Lantern Line |
| `/ember-and-tide` | `src/app/ember-and-tide/page.tsx` → `FireWaterGame.tsx` + `FireWaterScene.tsx` | Ember & Tide |
| `/tidepool` | `src/app/tidepool/page.tsx` → `TidepoolGame.tsx` + `TidepoolScene.tsx` | Tidepool |
| `/canopy` | `src/app/canopy/page.tsx` → `CanopyGame.tsx` + `CanopyScene.tsx` | Canopy |
| `/sitemap`, `/privacy`, `/terms` | xem [site-seo](../site-seo/design.md) | Trang phụ |

- `src/lib/games.ts` là nguồn duy nhất về danh sách game: `id`, tên, route, ngày `updated`, mô tả SEO, cảnh, màu nền thẻ. Thứ tự trong mảng là thứ tự trên sảnh, phần tử đầu là game mặc định.
- Route cũ chuyển hướng 308 trong `next.config.ts`. Thư mục code nội bộ giữ tên cũ (`lib/game` = Lantern Line, `lib/fire-water` = Ember & Tide).
- Mọi trang đều prerender tĩnh. Trang game là Server Component chỉ khai báo `metadata`, `viewport.themeColor`, JSON-LD rồi render component game (client).

## 2. Sảnh

- `Lobby.tsx` là Client Component (để chữ theo ngôn ngữ đang chọn) nhưng vẫn prerender bằng tiếng Anh. Thẻ game lấy mô tả từ `t.cards[id]` và tag từ `t.tags`; hình cảnh nằm ở `components/gameArt.tsx`, dùng chung với ảnh chia sẻ.
- Header và footer (`SiteChrome.tsx`) dùng chung cho sảnh và `/sitemap`. Trên sảnh, link điều hướng là anchor trong trang (`#games`, `#about`); ở trang khác thì trỏ về `/#…`.
- **Game chơi gần nhất:** mỗi trang game gọi `rememberGame(id)` khi mở (`lib/recentGame.ts`, localStorage `verdant:last-game`). `PlayRecentLink` đọc qua `useSyncExternalStore`, server luôn render game mặc định nên không lệch hydration; trình duyệt chặn storage thì vẫn về game mặc định; tab khác chơi game thì tab này cập nhật theo sự kiện `storage`.

## 3. Hướng dẫn chơi

- `HowToPlay.tsx`: nút “?” và `<dialog>` gốc gọi `showModal()`. Modal gốc cho sẵn bẫy focus, Esc, trả focus và làm trơ cảnh phía sau. Bấm vào chính `<dialog>` (không phải nội dung) được coi là bấm ra nền.
- Nút Back dùng `aria-disabled` thay cho `disabled`, vì nút bị disable sẽ làm focus rơi ra ngoài hộp thoại.
- `helpCards.tsx`: mỗi thẻ là `{ title: Localized, text: Localized, art }`. Văn bản hai ngôn ngữ nằm cạnh hình của nó; nhãn chữ trong SVG dùng `<Tr en vi />`. Hình của Canopy ghép từ các phần (cây theo nấc, người leo, đèn) để khớp với cây trên bàn.

## 4. HUD dùng chung

`components/Hud.tsx`: `TitleCard`, `Scoreboard`/`Score`/`Divider`, `HudButtons` (nút “?” do game truyền vào, nút Cài đặt cố định), `StatusPill`, `DifficultyPicker`, `Toolbar`, `NoWebGL`.

- Màu lấy từ biến CSS. Class trên `.stage` (`.moon`, `.lagoon`, `.forest`) đổi bộ biến theo cảnh, nên không có CSS riêng cho từng game.
- `Toolbar` trên điện thoại thu vào thẻ “Options” (`aria-expanded`), bấm New game thì tự đóng.
- Mọi chữ lấy từ `useT()` (xem [settings-i18n](../settings-i18n/design.md)).
- `ResultCard` (G1.11): nhận `RoundResult { tone, title, detail, score, round, icon }` do component game tính bằng `useMemo` từ `winner` / `reason` / tỉ số, cùng `gameId` để đặt lại trạng thái ẩn khi sang ván mới. Hiện sau 1,1 s (`setTimeout`), focus vào “Play again”; `role="dialog"` không modal, `data-testid="result"`. Nằm trong `.hud` nhưng lớp `.result-wrap` phủ toàn stage với `pointer-events: none`, chỉ thẻ nhận chuột, nên cảnh vẫn kéo xoay được quanh thẻ. Nút trên thẻ tên “Play again” để không trùng với “New game” của thanh công cụ (selector E2E).

## 5. Luồng trận dùng chung

- Mỗi game có reducer thuần `match.ts` với cùng nhóm action: `newGame`, `resetScores`, `setMode`, `setDifficulty`, và các nước đi mang `source: 'human' | 'ai'`. Reducer từ chối nước đi sai nguồn (người không đi thay máy và ngược lại).
- Đổi chế độ hoặc độ khó: bàn mới, xoá tỉ số. Chọn lại đúng giá trị đang có thì không làm gì.
- Người đi trước: Lantern Line và Ember & Tide dùng `nextStarter` (`lib/game/match.ts`), người thua đi trước, hoà hoặc bỏ dở thì luân phiên. Tidepool và Canopy luân phiên mỗi ván.
- Trang game tạo trận bằng `initialMatch('ai', 'easy')` (G1.1). Mặc định trong chữ ký hàm vẫn là `'hard'` để test dùng.
- `gameId` tăng mỗi ván mới: cảnh 3D dựa vào nó để đặt lại quân mà không chạy hoạt ảnh.

## 6. Cảnh 3D dùng chung

- **Hợp đồng controller:** mỗi game có một controller trong `src/lib/scene/` (`SceneController`, `FireWaterController`, `TidepoolController`, `CanopyController`). Controller không giữ luật chơi: nhận `view` thuần, tự suy ra hoạt ảnh bằng cách so với view trước, gọi lại `onPick` khi người chơi bấm. Picking là phép tính giải tích (Raycaster chỉ cấp tia).
- **Tải lười:** component game nạp component cảnh bằng `next/dynamic` với `ssr: false`; component cảnh gọi `onReady` ngay khi controller dựng xong cảnh và nhận view đầu tiên. `SceneLoader` phủ lên cho tới khi `ready || noGL`. Tano chỉ dùng transform và opacity (CSS) nên vẫn chạy khi luồng chính bận dựng cảnh.
- **Hiệu năng (G1.6):** env map PMREM nhỏ (64) cho phản chiếu của quân; shadow map 1024 với `autoUpdate = false`, chỉ vẽ lại trong khoảng thời gian sau mỗi thay đổi; `FrameBudget` (`frameBudget.ts`) giảm `pixelRatio` từng bước khi khung hình chậm, tối đa còn một nửa, và không tăng lại để tránh hình ảnh nhấp nháy độ nét. `pixelRatio` tối đa 1,75.
- **Vòng đời WebGL (G1.8):** điều hướng SPA tạo canvas mới mỗi lần vào game, nên `dispose()` phải trả context ngay thay vì chờ GC. Không thể gọi `forceContextLoss()` vô điều kiện vì Strict Mode chạy lại effect trên cùng canvas. Cleanup của `useEffect` chạy sau khi DOM đã gỡ, nên `canvas.isConnected` phân biệt được unmount thật với lần chạy lại.
- **Màn hình dọc:** camera tự lùi theo FOV ngang để bàn luôn vừa khung, và hạ điểm nhìn để bàn không bị HUD dưới che.

## 7. Khác biệt có chủ đích so với canvas

- Artboard Main vẽ caro thường. Game thật giữ luật vanishing và AI đã kiểm chứng.
- Placeholder `[Game #3]` của canvas thành thẻ “More games”.
- Medium của Tidepool là AI 2-ply của design, còn Hard là AI tìm kiếm mới (xem [tidepool](../tidepool/design.md)).
