# Requirements — Ember & Tide (thả quân 5×5×5)

> Giai đoạn 1 của SDD. Nguồn thiết kế: artboard Caro5 của canvas “Verdant – Multi-game website”.
> Tách ra từ spec [game-lobby](../game-lobby/) ngày 15/11/2026; mã F giữ nguyên để khớp với `tests/fire-water.test.ts`.
> Phần chung (HUD, màn chờ, Worker, chế độ mặc định) theo [game-lobby §G](../game-lobby/requirements.md#g--khung-game-dùng-chung).

## Bối cảnh

Fire (X) đấu Water (O) trên bàn 5×5. Mỗi ô là một cột, quân thả vào thì rơi xuống và chồng lên tối đa 5 tầng. Nối 4 quân theo bất kỳ hướng 3D nào là thắng. Route `/ember-and-tide` (trước là Fire & Water ở `/fire-and-water`).

## F1 — Luật

- **F1.1** Bàn 5×5, mỗi ô là một cột chứa tối đa 5 quân; Fire và Water luân phiên.
- **F1.2** KHI người chơi chọn một ô THÌ quân PHẢI rơi xuống vị trí thấp nhất còn trống của cột. Cột đầy hoặc ô ngoài bàn thì nước đi không hợp lệ.
- **F1.3** KHI có 4 quân cùng màu liền nhau theo bất kỳ hướng nào trong 13 hướng 3D (302 đường) THÌ bên đó thắng, và bàn khoá lại.
- **F1.4** Đủ 125 quân mà không ai thắng thì hoà.

## F2 — Luồng trận

- **F2.1** Có chế độ 2 người và đấu máy. Đổi chế độ thì xoá tỉ số và Fire đi trước.
- **F2.2** “New game” giữ tỉ số; người thua ván trước đi trước; sau ván hoà hoặc ván bỏ dở thì đổi luân phiên. “Reset score” xoá tỉ số, Fire đi trước.
- **F2.3** Khi đấu máy, người chơi là Fire, máy là Water; người không thể đi thay máy.

## F3 — AI

- **F3.1** Có 3 mức Easy / Medium / Hard. Trang mở ở mức Easy (G1.1). Chọn mức khác thì bắt đầu ván mới và xoá tỉ số.
- **F3.2** Easy: 35% đi ngẫu nhiên, còn lại chấm điểm theo đường còn sống, không nhìn ô phía trên. Người mới thắng được.
- **F3.3** Medium: luôn thắng ngay nếu có thể, nếu không thì chặn; không làm lộ ô phía trên để đối thủ thắng; có nhiễu nhỏ để mỗi ván một khác.
- **F3.4** Hard: tìm kiếm alpha-beta nhiều nước, thấy được bẫy hai đường, thắng áp đảo Medium khi tự đấu, không trả lời nước mở ở ô giữa bằng cách chồng lên đó.
- **F3.5** Máy nghĩ trong Web Worker (khoảng 0,5–1 s mỗi nước, sâu 6–7 ply); giới hạn theo số nút nên sức mạnh không phụ thuộc tốc độ máy.

## F4 — Cảnh 3D và giao diện

- **F4.1** Cảnh hồ băng dưới trăng: mặt hồ phản chiếu có cực quang, sao, núi tuyết, rừng thông, đảo tuyết; hai lò lửa và hai đèn thuỷ triều quanh bàn.
- **F4.2** Quân hình trụ vát cạnh, phủ bóng, có dấu lửa / giọt nước, rơi từ trên xuống; mặt trăng đổ bóng thật; thanh vàng nối đường thắng.
- **F4.3** Rê chuột hiện quân mờ ở vị trí sẽ rơi xuống; bấm vào ô hoặc vào chồng quân đều chọn cột đó.
- **F4.4** Kéo để xoay, cuộn để phóng to; trên màn hình dọc camera tự lùi để thấy đủ bàn.
- **F4.5** Có lưới nút bàn phím (mỗi nút nói chiều cao chồng và quân trên cùng) và thanh trạng thái `aria-live`.
