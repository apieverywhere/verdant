# Requirements — Verdant (sảnh game) & Ember & Tide 5×5×5

> Giai đoạn 1 của SDD. Nguồn thiết kế: canvas “Verdant – Multi-game website” (trước đây “Game Lobby”) (artboard Home, Main, Caro5).
> Caro 3×3 giữ nguyên spec ở [`../vanishing-tic-tac-toe/`](../vanishing-tic-tac-toe/); ở đây chỉ ghi phần thay đổi.

## L1 — Sảnh game

- **L1.1** Trang `/` hiển thị sảnh: header (Games, About, Play now), hero, danh sách game, thẻ “Coming soon”, băng CTA, footer. Mục “About” cuộn tới băng CTA và vẫn thấy trọn linh vật.
- **L1.2** Mỗi game đang chạy có thẻ dẫn tới route riêng: `/lantern-line` (Lantern Line, trước là Tic-Tac-Toe 3×3), `/ember-and-tide` (Ember & Tide, trước là Fire & Water 5×5×5). Route cũ PHẢI chuyển hướng vĩnh viễn sang route mới.
- **L1.3** Từ mỗi trang game có liên kết “← Verdant” quay về `/`.
- **L1.4** Sảnh dùng được ở chiều rộng 390 px, không cuộn ngang; vùng bấm tối thiểu 44 px.
- **L1.5** Chuyển qua lại giữa các trang nhiều lần không được làm rò rỉ WebGL context.
- **L1.6** Cuối sảnh có băng CTA “Interested in working with us?” với linh vật Tano và footer đen: mạng xã hội, link pháp lý, bản quyền, Sitemap, logo Verdant. Đích của các link chưa có nên tạm là `#`.
- **L1.7** Nút “Play now” ở header và nút Play ở hero đưa tới game chơi gần nhất trên trình duyệt này (nút hero ghi “Play <tên game>”); chưa chơi game nào thì tới game mặc định Lantern Line.

## L2 — Caro 3×3 trong hệ sinh thái

- **L2.1** Luật vanishing, độ khó và AI giữ nguyên (R1–R5).
- **L2.2** Toàn bộ chữ chuyển sang tiếng Anh theo thiết kế; phần thiết kế không có (gợi ý biến mất) dịch cùng giọng. Riêng nhãn độ khó của mọi game ghi tiếng Việt: Dễ / Trung bình / Khó.

## H1 — Hướng dẫn chơi

- **H1.1** Mỗi trang game có nút “?” cạnh bảng điểm; bấm vào mở hộp thoại “How to play” dạng slider: mỗi lần một bước có hình minh họa, nút Back / Next (bước cuối là “Got it” để đóng), chấm tiến độ và “n / N”, phím ← → để chuyển bước; mở lại luôn bắt đầu từ bước 1.
- **H1.2** Hộp thoại là modal: focus nằm trong hộp thoại, Esc / nút đóng / “Got it” / bấm ra nền đều đóng, và focus quay về nút “?”; cảnh 3D phía sau không nhận thao tác.
- **H1.3** Nội dung phải đúng luật đang chạy. Thẻ “Full board = draw” của canvas Tic-Tac-Toe mô tả caro thường nên được thay bằng thẻ luật vanishing (tối đa 3 quân, hòa khi lặp thế cờ 3 lần).
- **H1.4** Dùng được ở 390 px: các thẻ xếp một cột và hộp thoại tự cuộn.

## F1 — Luật Ember & Tide

- **F1.1** Bàn 5×5, mỗi ô là một cột chứa tối đa 5 quân; Fire (X) và Water (O) luân phiên.
- **F1.2** Khi chọn một ô, quân rơi xuống vị trí thấp nhất còn trống của cột; cột đầy thì nước đi không hợp lệ.
- **F1.3** 4 quân liền nhau theo bất kỳ hướng nào trong 13 hướng 3D (302 đường) là thắng.
- **F1.4** Đủ 125 quân mà không ai thắng thì hòa.

## F2 — Luồng trận

- **F2.1** Hỗ trợ 2 người và đấu máy; đổi chế độ thì xóa tỉ số, Fire đi trước.
- **F2.2** “New game” giữ tỉ số; người thua ván trước đi trước, sau ván hòa hoặc ván bỏ dở thì đổi luân phiên (cùng luật R1.2 của Tic-Tac-Toe). “Reset score” xóa tỉ số, Fire đi trước.
- **F2.3** Khi đấu máy, người chơi là Fire, máy là Water; người không thể đi thay máy.

## F3 — AI

- **F3.1** Có 3 mức Easy / Medium / Hard, mặc định Hard; chọn lại mức bắt đầu ván mới và xóa tỉ số.
- **F3.2** Easy: 35% đi ngẫu nhiên, còn lại chấm điểm theo đường còn sống, không nhìn ô phía trên. Người mới thắng được.
- **F3.3** Medium: luôn thắng ngay nếu có thể, nếu không thì chặn; tránh làm lộ ô phía trên để đối thủ thắng; kèm nhiễu nhỏ để mỗi ván một khác.
- **F3.4** Hard: tìm kiếm alpha-beta nhiều nước, thấy được bẫy hai đường, thắng áp đảo Medium khi tự đấu.
- **F3.5** Mỗi nước của Hard không vượt quá 300 ms để không làm giật cảnh 3D; có giới hạn theo số nút nên kết quả không phụ thuộc tốc độ máy.

## F4 — Cảnh 3D & giao diện

- **F4.1** Cảnh hồ băng dưới trăng: cực quang, sao, núi tuyết, thông, đảo băng, đèn trời.
- **F4.2** Quân hình trụ có dấu lửa/giọt nước, rơi từ trên xuống; thanh vàng nối đường thắng.
- **F4.3** Rê chuột hiện quân mờ ở vị trí sẽ rơi xuống; nhấn vào ô hoặc vào chồng quân đều chọn cột đó.
- **F4.4** Kéo để xoay, cuộn để phóng to; trên màn hình dọc camera tự lùi để thấy đủ bàn.
- **F4.5** Có lưới nút bàn phím và thông báo trạng thái `aria-live`; không có WebGL thì hiện thông báo.
