# Requirements — Tidepool (đẩy bi trên bàn lục giác)

> Giai đoạn 1 của SDD, viết bù ngày 15/11/2026 cho tính năng ra mắt ngày 09/11 và dựng lại cảnh ngày 14/11.
> Nguồn thiết kế: artboard Tidepool của canvas “Verdant – Multi-game website”.
> Phần chung (HUD, màn chờ, Worker, chế độ mặc định) theo [game-lobby §G](../game-lobby/requirements.md#g--khung-game-dùng-chung).

## Bối cảnh

Pearl (X, ngọc trai) đấu Coral (O, san hô) trên bàn lục giác 61 lỗ giữa một đầm phá lúc hoàng hôn. Mỗi lượt đẩy một hàng bi; ai hất được 6 bi của đối thủ xuống biển trước là thắng. Route `/tidepool`.

## TP1 — Bàn và thế mở đầu

- **TP1.1** Bàn lục giác bán kính 4 (61 lỗ), mỗi lỗ có tối đa 6 hàng xóm.
- **TP1.2** Mỗi bên 14 bi: Coral ở hai hàng xa nhất và ba lỗ giữa của hàng thứ ba; Pearl đối xứng ở phía gần người chơi.
- **TP1.3** Ván đầu Pearl đi trước. Mỗi “New game”, bên đi trước đổi luân phiên. “Reset score”, đổi chế độ hoặc đổi độ khó thì Pearl đi trước và xoá số ván thắng.

## TP2 — Nước đi

- **TP2.1** Mỗi lượt, người chơi chọn 1, 2 hoặc 3 bi của mình nằm liền nhau trên một đường thẳng và đi 1 ô theo một trong 6 hướng.
- **TP2.2** Đi **dọc theo hàng**: ô phía trước bi đầu phải trống, hoặc là hàng bi đối thủ ít hơn hàng của mình (3 đẩy 2, 3 đẩy 1, 2 đẩy 1) và phía sau hàng đó là ô trống hoặc mép bàn. Bằng số thì không đẩy được; bi của chính mình chắn phía sau thì không đẩy được.
- **TP2.3** Đi **ngang** (2–3 bi cùng bước sang một bên): mọi ô đích phải trống; đi ngang không bao giờ đẩy.
- **TP2.4** KHI cú đẩy hất bi cuối ra khỏi mép THÌ bi đó PHẢI rời bàn và được cộng vào số bi mất của đối thủ.
- **TP2.5** Nước không hợp lệ PHẢI bị bỏ qua mà không đổi trạng thái.

## TP3 — Kết thúc

- **TP3.1** KHI một bên đẩy rơi bi thứ 6 của đối thủ THÌ bên đó thắng, ván khoá lại và số ván thắng được cộng.
- **TP3.2** Không có luật hoà. Hệ thống đếm số lần mỗi thế cờ xuất hiện để máy tránh đi vòng tròn.

## TP4 — Điều khiển và luồng trận

- **TP4.1** Bấm bi của mình để chọn hoặc bỏ chọn. Bấm thêm một bi nối tiếp được hàng thẳng thì thêm vào lựa chọn; bấm bi làm gãy hàng thì lựa chọn bắt đầu lại từ bi đó. Bấm chỗ khác thì bỏ chọn.
- **TP4.2** Với lựa chọn hiện tại, mỗi nước hợp lệ có một điểm đánh dấu vàng; bấm điểm đó thì đi.
- **TP4.3** Thanh trạng thái ghi lượt, số bi đang chọn và gợi ý bước tiếp theo. Bảng điểm hiện số bi đã đẩy rơi (x/6) và số ván thắng của mỗi bên.
- **TP4.4** Khi đấu máy, người chơi là Pearl, máy là Coral; người không thể đi thay máy.
- **TP4.5** Bàn phím: danh sách nút cho từng bi của bên đang đi (có `aria-pressed`) và, khi đã chọn, danh sách nước đi có mô tả hướng, số bi bị đẩy và việc bi có rơi xuống biển hay không.

## TP5 — Máy

- **TP5.1** Có 3 mức Easy / Medium / Hard; trang mở ở mức Easy (G1.1).
- **TP5.2** Easy: nhìn 1 nước, 35% đi ngẫu nhiên.
- **TP5.3** Medium: AI 2 ply của design (mỗi nước giả sử đối thủ đáp trả tệ nhất cho mình), có nhiễu nhỏ để mỗi ván một khác. Nhiễu không được đẩy một nước đã bị bác bỏ lên trên nước tốt nhất.
- **TP5.4** Hard: tìm kiếm nhiều nước; thấy cú đẩy rơi trước 2 nước; khi đang dẫn thì ép vào giữa thay vì đi qua lại; tránh lặp lại thế cờ đã gặp.
- **TP5.5** Medium và Hard PHẢI đi nước đẩy rơi thắng ván khi có, và PHẢI kéo bi ra khỏi chỗ sắp bị đẩy rơi.
- **TP5.6** Hard chạy trong Web Worker, khoảng 0,7 s mỗi nước (tối đa ~1,6 s) trên laptop, giới hạn theo số nút.

## TP6 — Cảnh 3D

- **TP6.1** Đầm phá lúc hoàng hôn: mặt nước có shader riêng, các đảo cọ, bục cát có đá và đèn đá, đèn giấy bay lên trời và trôi trên mặt nước.
- **TP6.2** Bàn là tổ ong 61 ô lõm nhô lên trong một rãnh dốc, có máng trượt dẫn tới khay chứa (mỗi màu một hàng 6 chỗ) bên cạnh.
- **TP6.3** Bi phủ bóng phản chiếu bầu trời (Pearl có ánh ngũ sắc, Coral bóng ướt); mặt trời đổ bóng thật.
- **TP6.4** Hoạt ảnh: bi trượt theo nước đi; bi bị đẩy rơi lăn qua mép, vòng theo rãnh, xuống máng và nằm vào khay. Vòng sáng đánh dấu nước vừa đi và bi đang chọn; điểm vàng nhấp nhô trên lỗ đích.
