# Requirements — Cài đặt: đa ngôn ngữ và âm thanh

> Giai đoạn 1 của SDD, 15/11/2026. Phần ngôn ngữ (ST, I) đã làm; phần âm thanh (A) mới lưu được âm lượng, còn lại để phát triển sau.

## Bối cảnh

Người chơi chủ yếu là học sinh, sinh viên và dân văn phòng Việt Nam, nhưng site viết bằng tiếng Anh. Cần cho chọn tiếng Việt, và chuẩn bị chỗ chỉnh âm lượng cho nhạc nền và hiệu ứng sắp có. Trước đó (10/11) giao diện đã chuyển sang chỉ dùng tiếng Anh; spec này thay thế quyết định đó.

## ST — Màn Cài đặt

- **ST1.1** Có nút Cài đặt (bánh răng) trên header của sảnh và trang sitemap, và trong HUD của mọi game (cạnh nút “?”).
- **ST1.2** Bấm vào mở hộp thoại modal “Settings” gồm: nhóm Language (English / Tiếng Việt), nhóm Sound (thanh Music, thanh Sound effects, ghi chú rằng âm thanh sắp có), nút Done. Hộp thoại xử lý focus, Esc và bấm ra nền giống hộp thoại hướng dẫn (H1.2).
- **ST1.3** Mọi thay đổi có hiệu lực ngay và được lưu ngay; không có nút Cancel.
- **ST1.4** Cài đặt được lưu trong trình duyệt và giữ qua các lần tải lại. KHI trình duyệt chặn storage THÌ thay đổi vẫn có hiệu lực tới khi tải lại trang.
- **ST1.5** KHI cài đặt đổi ở một tab THÌ các tab khác đang mở PHẢI cập nhật theo.
- **ST1.6** Dùng được ở 390 px; vùng bấm tối thiểu 44 px.

## I — Đa ngôn ngữ

- **I1.1** Hỗ trợ tiếng Anh (`en`) và tiếng Việt (`vi`). Tên ngôn ngữ trong bộ chọn luôn viết bằng chính ngôn ngữ đó (“English”, “Tiếng Việt”).
- **I1.2** KHI người chơi chưa từng chọn ngôn ngữ THÌ hệ thống PHẢI dùng tiếng Việt nếu trình duyệt có tiếng Việt trong danh sách ngôn ngữ ưu tiên, còn lại dùng tiếng Anh.
- **I1.3** Mọi chữ trên giao diện PHẢI theo ngôn ngữ đang chọn: sảnh, header, footer, HUD, thanh trạng thái, bảng điểm, thanh công cụ, màn chờ, hướng dẫn chơi (cả nhãn chữ trong hình), thông báo không có WebGL, và nhãn `aria-label` của điều khiển bàn phím.
- **I1.4** `<html lang>` PHẢI khớp ngôn ngữ đang chọn.
- **I1.5** Không dịch: tên site, tên game, metadata / JSON-LD / ảnh chia sẻ (S3.7), trang Privacy và Terms.
- **I1.6** Thiếu bản dịch cho bất kỳ chuỗi nào PHẢI là lỗi lúc typecheck, không được hiện chuỗi rỗng.
- **I1.7** Trang vẫn prerender tĩnh (bằng tiếng Anh). Người chọn tiếng Việt có thể thấy chữ tiếng Anh trong khoảnh khắc trước khi hydrate; chấp nhận được ở giai đoạn này.

## A — Âm thanh (phát triển sau)

- **A1.1** Hai mức âm lượng độc lập, 0–100 (bước 5): Music (nhạc nền) và Sound effects (hiệu ứng). 0 nghĩa là tắt, hiển thị “Off” / “Tắt”. Mặc định Music 70, Sound effects 80. *(Đã làm: thanh trượt và lưu giá trị.)*
- **A1.2** Mỗi cảnh có một bản nhạc nền lặp, hợp với cảnh (thung lũng hoàng hôn, hồ băng, đầm phá, khoảng rừng bình minh). Sảnh có nhạc riêng hoặc im lặng (sẽ quyết định).
- **A1.3** Hiệu ứng tối thiểu cho mỗi game: đặt / thả / đẩy quân, quân biến mất hoặc rơi xuống biển, thắng, thua, hoà, bấm nút.
- **A1.4** KHI người chơi chưa tương tác với trang THÌ không được phát âm thanh (chính sách autoplay của trình duyệt); nhạc bắt đầu sau lần bấm đầu tiên.
- **A1.5** KHI âm lượng đổi THÌ âm thanh đang phát PHẢI đổi theo ngay, không cần tải lại.
- **A1.6** KHI tab bị ẩn THÌ nhạc nền tạm dừng, và tiếp tục khi quay lại.
- **A1.7** Âm thanh tải lười, không làm chậm lần hiện trang đầu tiên; thiếu file hoặc trình duyệt không hỗ trợ thì im lặng, không báo lỗi.
