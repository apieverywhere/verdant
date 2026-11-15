# Requirements — Verdant: sảnh, hướng dẫn chơi, khung game dùng chung

> Giai đoạn 1 của SDD. Nguồn thiết kế: canvas “Verdant – Multi-game website” (artboard Home, Main, Caro5, Tidepool, Canopy, Sitemap).
> Luật từng game nằm ở spec riêng: [Lantern Line](../vanishing-tic-tac-toe/), [Ember & Tide](../ember-and-tide/), [Tidepool](../tidepool/), [Canopy](../canopy/).
> Trang phụ và SEO: [site-seo](../site-seo/). Cài đặt và ngôn ngữ: [settings-i18n](../settings-i18n/).

## L — Sảnh game

- **L1.1** Trang `/` hiển thị sảnh gồm: header (logo, Games, About, Play now, nút Cài đặt), hero, lưới game, thẻ “More games / Coming soon”, mục About, băng CTA và footer.
- **L1.2** Mỗi game đang chạy có thẻ (hình cảnh, nhãn NEW, mô tả, tag, nút Play) dẫn tới route riêng: `/lantern-line`, `/ember-and-tide`, `/tidepool`, `/canopy`. Danh sách lấy từ `src/lib/games.ts` và tiêu đề ghi “N games live”.
- **L1.3** Route cũ `/tic-tac-toe` và `/fire-and-water` PHẢI chuyển hướng vĩnh viễn (308) sang `/lantern-line` và `/ember-and-tide`.
- **L1.4** Từ mỗi trang game có liên kết “← Verdant” về `/`. Trên điện thoại, liên kết này thu thành nút tròn mũi tên.
- **L1.5** Mục “About” trên header cuộn mượt tới mục About (ba đoạn giới thiệu site) ở giữa trang.
- **L1.6** Cuối sảnh có băng CTA “Interested in working with me?” với linh vật Tano, và footer: Facebook, Instagram, LinkedIn của tác giả, link Terms of Service và Privacy Policy, bản quyền, Sitemap, logo. Không link nào trỏ tới `#`, trừ nút “Connect now” của băng CTA (chưa có đích).
- **L1.7** Nút “Play now” trên header và nút “Play <tên game>” ở hero PHẢI đưa tới game chơi gần nhất trên trình duyệt này. Lần đầu vào thì tới game mặc định Lantern Line.
- **L1.8** Sảnh dùng được ở chiều rộng 390 px: không cuộn ngang, vùng bấm tối thiểu 44 px.

## H — Hướng dẫn chơi

- **H1.1** Mỗi trang game có nút “?” ở góc phải trên. Bấm vào mở hộp thoại “How to play” dạng slider: mỗi lần một bước có hình minh hoạ, nút Back / Next (bước cuối là “Got it” và đóng hộp thoại), chấm tiến độ và “n / N”, phím ← → để chuyển bước. Mở lại luôn bắt đầu từ bước 1.
- **H1.2** Hộp thoại là modal: focus nằm trong hộp thoại; Esc, nút đóng, “Got it” hay bấm ra nền đều đóng; focus quay về nút “?”; cảnh 3D phía sau không nhận thao tác.
- **H1.3** Nội dung PHẢI đúng luật đang chạy (ví dụ thẻ “Full board = draw” của canvas không áp dụng cho caro vanishing, được thay bằng thẻ luật 3 quân).
- **H1.4** Dùng được ở 390 px: hộp thoại vừa màn hình và tự cuộn.
- **H1.5** Chữ trên thẻ (tiêu đề, nội dung, nhãn trong hình) PHẢI theo ngôn ngữ đang chọn (I1).

## G — Khung game dùng chung

- **G1.1** Mọi game PHẢI mở ở chế độ **Đấu máy**, mức **Dễ**, người chơi đi trước. Người chơi đổi sang 2 người hoặc mức khác bằng thanh công cụ.
- **G1.2** HUD giống nhau ở mọi game: thẻ tiêu đề, bảng điểm, nút “?” và nút Cài đặt, thanh trạng thái `aria-live`, thanh công cụ (chế độ, độ khó khi đấu máy, New game, Reset score), dòng hướng dẫn điều khiển.
- **G1.3** Trên điện thoại: hàng trên gồm nút quay về, bảng điểm, nút “?” và nút Cài đặt, cùng một hàng; thanh công cụ ẩn sau thẻ “Options” ở đáy; ẩn dòng gợi ý và dòng hướng dẫn điều khiển.
- **G1.4** Trong lúc cảnh 3D đang tải và dựng, PHẢI hiện màn chờ Tano (nổi giận, nổ tung, cháy đen rồi hồi lại) cùng dòng “Loading…”. Màn chờ mờ đi khi cảnh sẵn sàng hoặc khi trình duyệt không có WebGL.
- **G1.5** three.js và cảnh chỉ tải sau khung trang (lazy), để trang hiện ngay.
- **G1.6** Cảnh 3D PHẢI mượt trên GPU yếu: độ phân giải tự giảm (tối đa còn một nửa) khi khung hình chậm và không tăng lại; bóng đổ chỉ vẽ lại khi có vật chuyển động.
- **G1.7** Máy tính nghĩ trong Web Worker để cảnh không bao giờ giật; luôn có khoảng “đang nghĩ” tối thiểu ~600–650 ms. Trình duyệt không có Worker thì tính trên luồng chính.
- **G1.8** Chuyển qua lại giữa các trang nhiều lần không được làm rò rỉ WebGL context.
- **G1.9** Không có WebGL thì hiện thông báo và vẫn chơi được bằng bàn phím (Tab).
- **G1.10** Mỗi game có bàn điều khiển bàn phím ẩn (hiện khi được focus) với `aria-label` mô tả từng ô, quân hoặc nước đi.
- **G1.11** KHI một ván kết thúc THÌ, sau khoảng 1 s (để kịp thấy hiệu ứng đường thắng), hệ thống PHẢI hiện thẻ kết quả giữa màn hình: số ván, ai thắng (hoặc hoà) với biểu tượng phe, lý do kết thúc, tỉ số hiện tại, nút “Play again” (được focus) và “View board”. Thẻ không phải modal: cảnh phía sau vẫn xoay được; đóng bằng “View board”, nút ×, Esc hoặc khi ván mới bắt đầu. Màu viền theo kết quả (vàng khi thắng, san hô khi máy thắng).
