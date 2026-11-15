# Design — Cài đặt: đa ngôn ngữ và âm thanh

> Giai đoạn 2 của SDD.

## 1. Kho cài đặt — `src/lib/settings.ts`

```ts
type Lang = 'en' | 'vi';
interface Settings { lang: Lang; music: number; sfx: number } // music, sfx: 0–100
```

- Lưu ở localStorage khoá `verdant:settings` dạng JSON, cùng cách làm với `lib/recentGame.ts`.
- `useSettings()` dùng `useSyncExternalStore`. Snapshot phía server luôn là `DEFAULT_SETTINGS` (`en`, 70, 80), nên HTML prerender là tiếng Anh và không lệch hydration.
- `getSettings()` lưu bản parse cuối cùng theo chuỗi gốc, để snapshot giữ nguyên object khi dữ liệu chưa đổi (yêu cầu của `useSyncExternalStore`).
- `parse` chịu được dữ liệu hỏng: JSON lỗi, ngôn ngữ lạ hoặc thiếu thì về ngôn ngữ của trình duyệt (I1.2); âm lượng không phải số thì về mặc định; số ngoài khoảng thì kẹp về 0–100 và làm tròn.
- `updateSettings(patch)` ghi storage rồi báo cho các listener. Ghi thất bại thì giữ giá trị trong biến `memory` (ST1.4).
- Sự kiện `storage` của tab khác báo cho các listener (ST1.5).

## 2. Từ điển — `src/lib/i18n.ts`

- `en` là bản gốc; `type Dict = typeof en`; `const vi: Dict = { … }`. Thiếu khoá hoặc sai kiểu ở `vi` là lỗi TypeScript (I1.6).
- Chuỗi có tham số là hàm: `wins: (n) => \`Wins ${n}\``. Chuỗi theo game nằm trong nhóm `ttt`, `fw`, `tp`, `cn`; tên phe (`names`), tên hướng (`tp.dirs`) và tên nấc cây (`cn.stages`) cũng nằm trong từ điển.
- `useT()` trả về `Dict` của ngôn ngữ đang chọn. `LANG_NAMES` cho bộ chọn ngôn ngữ.
- Văn bản dài đi kèm markup của nó (thẻ hướng dẫn) dùng `Localized = Record<Lang, string>` đặt ngay cạnh hình; nhãn ngắn trong SVG dùng component `<Tr en vi />`.
- Thứ tự từ khác nhau giữa hai ngôn ngữ nên mọi câu ghép đều là hàm của từ điển (`tf.stack(cell, height, top)`), không ghép chuỗi trong component.
- Tên ô cho bàn phím: engine giữ `cellName` tiếng Anh cho test; giao diện dựng tên từ toạ độ qua `t.*.cell(row, col)` (Tidepool dùng `cellPos`).
- Lobby và `SiteChrome` là Client Component để đọc ngôn ngữ; trang vẫn prerender tĩnh.
- `LangSync` (trong `layout.tsx`) đặt `document.documentElement.lang` theo ngôn ngữ (I1.4).

## 3. Giao diện — `src/components/SettingsDialog.tsx`

- Nút bánh răng + `<dialog>` gốc với `showModal()`, cùng cách làm với `HowToPlay` (focus, Esc, bấm nền).
- Ngôn ngữ: nhóm nút `.segmented` với `aria-pressed`, mỗi nút có `lang` riêng.
- Âm lượng: `<input type="range">` 0–100 bước 5, có `<label>`, `<output>` và `aria-valuetext` (“70%” / “Off”). Phần đã kéo tô bằng biến CSS `--fill`.
- Vị trí: `SiteHeader` (class `nav-settings`) và `HudButtons` trong `Hud.tsx` (class `hud-settings`, cùng kiểu với nút “?”, xếp dọc dưới nó). Class của nút và hộp thoại tách khỏi `.help-btn` / `.help-dialog` để không trùng selector của E2E.
- Thẻ mở thanh công cụ trên điện thoại đổi tên từ “Settings” thành “Options” để không lẫn với Cài đặt.

## 4. Âm thanh — `src/lib/audio/`

Quyết định: **tổng hợp toàn bộ bằng Web Audio** thay vì file. Không có gì để tải (bundle thêm vài KB), không vướng bản quyền, và nhạc không bao giờ lặp y hệt.

| File | Vai trò |
|---|---|
| `engine.ts` | `AudioContext` duy nhất, hai `GainNode` `music` / `sfx` → master → output; gain = `(volume / 100)²` (`gainFor`); mở khoá ở `pointerdown` / `keydown` đầu tiên (capture); `whenReady(fn)` xếp hàng việc cần context; theo dõi `subscribeSettings` để đổi gain ngay; `visibilitychange` → `suspend` / `resume` |
| `sfx.ts` | 14 hiệu ứng, mỗi cái vài dòng từ hai nguyên tố: `tone` (oscillator + envelope, có thể trượt cao độ, lọc thấp) và `noise` (buffer nhiễu trắng lặp qua biquad có sweep); `bell` ghép ba `tone`. `win` là `fanfare(root)` với root lấy từ `fanfareRootHz()` của theme đang chạy (một quãng tám trên gam của cảnh; cảnh thứ dùng trưởng tương đối) để không chỏi với pad. `renderSfx` / `SFX_NAMES` được export cho test. `playSfx(name)` im lặng khi chưa mở khoá, context không chạy hay slider ở 0; mọi lỗi được nuốt |
| `music.ts` | `THEMES` (4 theme: root MIDI, gam ngũ cung cho giai điệu, 4 hợp âm, giây/ô nhịp, pad, giọng lead, loại ambience); scheduler `setInterval` 200 ms với lookahead 0,6 s; pad = cặp oscillator lệch ±5 cent mỗi nốt, swell 2,5 s, chồng mép sang hợp âm sau; lead = random walk trên gam (`nextLeadNote`), mật độ tăng dần về cuối ô nhịp; ambience = `public/audio/wind.mp3` (bản ghi Pixabay 39,8 s, mono 64 kbps, đã crossfade 3 s cuối vào đầu để lặp liền mạch và chuẩn hoá −23 LUFS bằng ffmpeg) qua lọc thấp có LFO làm gió giật, cutoff và mức khác nhau cho hoàng hôn / hồ băng / rừng, rừng thêm tiếng chim ngẫu nhiên; Tidepool dùng nhiễu nâu tổng hợp làm sóng; file tải lười bằng `fetch` + `decodeAudioData` một lần, lỗi thì về nhiễu nâu; “không gian” = hai delay hồi tiếp dưới lọc thấp. `startMusic(id)` / `stopMusic()`; vào nhạc 4 s, ra 1,2 s. Khi `music.gain` ≈ 0 chỉ giữ nhịp, không dựng nốt |
| `useAudio.ts` | `useMusic(theme)` cho trang game; `useSfx()` → `play(name, delayMs?)`; `useOnChange(value, fn)` để phản ứng với chuyển trạng thái của reducer mà không đưa âm thanh vào reducer |

- Component game ánh xạ trạng thái → âm thanh: Lantern Line theo `moveCount` và `lastRemoved`; Ember & Tide theo `moveCount`; Tidepool theo `game.last` (`off` → clack + splash, `push` → clack, còn lại slide) và `sel.length`; Canopy theo `actionCount` + `game.last.kind` (+ `lit`) và `match.sel`. Kết quả ván: `winner` đổi → win / lose (chỉ khi máy thắng) / draw, trễ ~350 ms để kịp hiệu ứng đường thắng.
- Nút trong `Toolbar`, `DifficultyPicker`, nút “?” và bánh răng phát `tap`. Thả thanh Sound effects phát `place` làm mẫu.
- Controller 3D không biết gì về âm thanh (giữ hợp đồng “nhận view”). Sảnh không gọi `useMusic`, nên im lặng.
- Kiểm chứng: `tests/audio.test.ts` (đường cong âm lượng, hợp âm nằm trong gam, random walk không rời gam); script dò bằng Playwright (không tạo context trước cú chạm, có node sau cú chạm, nhạc dừng khi về sảnh, không node khi slider 0, không cảnh báo console).
