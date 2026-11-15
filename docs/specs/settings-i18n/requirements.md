# Requirements — Cài đặt: đa ngôn ngữ và âm thanh

> Giai đoạn 1 của SDD, 15/11/2026. Ngôn ngữ (ST, I) và âm thanh (A) đều đã làm; âm thanh được tổng hợp bằng Web Audio, không dùng file.

## Bối cảnh

Người chơi chủ yếu là học sinh, sinh viên và dân văn phòng Việt Nam, nhưng site viết bằng tiếng Anh. Cần cho chọn tiếng Việt, và chuẩn bị chỗ chỉnh âm lượng cho nhạc nền và hiệu ứng sắp có. Trước đó (10/11) giao diện đã chuyển sang chỉ dùng tiếng Anh; spec này thay thế quyết định đó.

## ST — Màn Cài đặt

- **ST1.1** Có nút Cài đặt (bánh răng) trên header của sảnh và trang sitemap, và trong HUD của mọi game (cạnh nút “?”).
- **ST1.2** Bấm vào mở hộp thoại modal “Settings” gồm: nhóm Language (English / Tiếng Việt), nhóm Sound (thanh Music, thanh Sound effects, ghi chú rằng âm thanh bắt đầu sau lần chạm đầu tiên và sảnh không có nhạc), nút Done. Thả thanh Sound effects thì phát một tiếng mẫu để ước lượng mức. Hộp thoại xử lý focus, Esc và bấm ra nền giống hộp thoại hướng dẫn (H1.2).
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

## A — Âm thanh

- **A1.1** Hai mức âm lượng độc lập, 0–100 (bước 5): Music (nhạc nền) và Sound effects (hiệu ứng). 0 nghĩa là tắt, hiển thị “Off” / “Tắt”. Mặc định Music 70, Sound effects 80.
- **A1.2** Mỗi cảnh có nhạc nền riêng, hợp với cảnh và không lặp y hệt: thung lũng hoàng hôn (A trưởng, tiếng gảy kiểu kalimba, gió), hồ băng (D thứ, chuông thuỷ tinh thưa, gió lạnh), đầm phá (F trưởng, marimba, sóng vỗ), khoảng rừng bình minh (G trưởng, sáo, chim hót). **Sảnh và các trang phụ không có nhạc và hiệu ứng.** Rời trang game thì nhạc tắt dần.
- **A1.3** Hiệu ứng theo sự kiện của từng game: Lantern Line đặt quân, quân biến mất; Ember & Tide quân rơi; Tidepool bi lăn, bi va nhau khi đẩy, bi rơi xuống biển, chọn bi; Canopy người leo nhảy, thắp / giành đèn, cây mọc, cây bị tỉa, chọn người leo. Chung: thắng, thua (khi máy thắng), hoà, bấm nút (chế độ, độ khó, ván mới, xoá tỉ số, mở hướng dẫn / cài đặt).
- **A1.3b** Nhạc và hiệu ứng được tổng hợp lúc chạy bằng Web Audio API. Lớp gió nền của ba cảnh trên cạn (hoàng hôn, hồ băng, rừng) là một bản ghi âm thật (“Wind Blowing”, SoundReality, Pixabay Content License) lặp liền mạch; tiếng nước của Tidepool vẫn tổng hợp. KHI file gió không tải được THÌ dùng lại lớp gió tổng hợp, không báo lỗi.
- **A1.4** KHI người chơi chưa tương tác với trang THÌ không được phát âm thanh (chính sách autoplay của trình duyệt); nhạc bắt đầu sau lần bấm đầu tiên.
- **A1.5** KHI âm lượng đổi THÌ âm thanh đang phát PHẢI đổi theo ngay, không cần tải lại. KHI nhạc ở mức 0 THÌ không được dựng nốt nhạc nào (chỉ giữ nhịp), và kéo lên thì hợp âm hiện tại vang ngay.
- **A1.6** KHI tab bị ẩn THÌ nhạc nền tạm dừng, và tiếp tục khi quay lại.
- **A1.7** Trình duyệt không có Web Audio, hoặc một hiệu ứng dựng lỗi, thì im lặng; không bao giờ báo lỗi ra console hay làm hỏng ván chơi. Không được tạo AudioContext trước cú chạm đầu tiên (tránh cảnh báo autoplay).
