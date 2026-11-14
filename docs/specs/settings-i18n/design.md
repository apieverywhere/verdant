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

## 4. Âm thanh (phát triển sau)

Hướng đề xuất, sẽ chốt khi bắt đầu làm:

- Module `src/lib/audio.ts` bọc Web Audio API: một `AudioContext` dùng chung, hai `GainNode` (`music`, `sfx`) nối vào output. Gain = `(volume / 100)²` để thanh trượt nghe đều tai.
- Đăng ký theo dõi kho cài đặt (`subscribe` giống `useSettings`) để đổi gain ngay khi kéo thanh trượt (A1.5).
- Mở khoá `AudioContext` ở `pointerdown` / `keydown` đầu tiên (A1.4); `visibilitychange` để tạm dừng nhạc (A1.6).
- Hook `useSfx()` trả về `play(name)`; component game gọi ở các sự kiện của reducer (nước đi, thắng, thua). Controller 3D không biết gì về âm thanh, giữ hợp đồng “nhận view”.
- File trong `public/audio/` (định dạng nén, ví dụ `.ogg` + `.m4a` dự phòng), tải lười bằng `fetch` + `decodeAudioData` khi cần lần đầu (A1.7).
- Bản quyền âm thanh: chỉ dùng tài nguyên tự làm hoặc có giấy phép cho phép dùng thương mại; ghi nguồn trong README.
