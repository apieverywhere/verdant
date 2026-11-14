# Requirements — Canopy (leo cây, trồng cây, thắp đèn)

> Giai đoạn 1 của SDD, viết bù ngày 15/11/2026 cho tính năng ra mắt ngày 13/11.
> Nguồn thiết kế: artboard Canopy của canvas “Verdant – Multi-game website”.
> Phần chung (HUD, màn chờ, Worker, chế độ mặc định) theo [game-lobby §G](../game-lobby/requirements.md#g--khung-game-dùng-chung).

## Bối cảnh

Amber (X, hổ phách) đấu Violet (O, tím) trên bàn rừng 5×5 lúc bình minh. Mỗi bên có 2 người leo. Mỗi lượt: đi một người leo, cho một ô cây mọc lên, có thể tỉa một cây xuống. Ai có đèn lồng màu mình sáng trên 2 ngọn cây cùng lúc là thắng. Route `/canopy`.

## C1 — Bàn và thế mở đầu

- **C1.1** Bàn 5×5, mỗi ô có một nấc mọc: 0 rêu → 1 cây non → 2 cây nhỡ → 3 ngọn cây → 4 hoa nở. Lúc đầu toàn bộ là rêu.
- **C1.2** Mỗi bên 2 người leo: Amber ở cột 2 và 4 của hàng gần, Violet đối xứng ở hàng xa.
- **C1.3** Ván đầu Amber đi trước. Mỗi “New game”, bên đi trước đổi luân phiên. “Reset score”, đổi chế độ hoặc đổi độ khó thì Amber đi trước và xoá số ván thắng.

## C2 — Một lượt

- **C2.1 Đi.** Người chơi chọn một người leo của mình và bước sang 1 trong 8 ô xung quanh (kể cả chéo). Lên cao tối đa 1 nấc, xuống bao nhiêu nấc cũng được. Không bước vào ô có người leo khác hoặc ô hoa nở.
- **C2.2 Mọc (bắt buộc).** Sau khi đi, người chơi cho một ô trống (không có người leo, chưa phải hoa nở) cạnh người leo vừa đi mọc thêm một nấc.
- **C2.3 Tỉa (tuỳ chọn).** Sau khi mọc, người chơi có thể tỉa một ô trống đã mọc (không phải rêu) cạnh người leo đó lùi một nấc, trừ ô vừa cho mọc trong lượt; hoặc bấm “Skip cutting”. KHI không còn ô nào để tỉa THÌ lượt PHẢI tự kết thúc ngay sau bước mọc.
- **C2.4** Trong lúc mọc và tỉa, chỉ người leo vừa đi được dùng; không chọn được người leo khác.
- **C2.5** Thao tác không hợp lệ PHẢI bị bỏ qua mà không đổi trạng thái.

## C3 — Đèn lồng, thắng, thua

- **C3.1** Bước lên ngọn cây thì thắp đèn màu mình ở đó; đèn vẫn sáng khi rời đi. Bước lên ngọn cây đang có đèn đối thủ thì giành luôn đèn.
- **C3.2** Ô mọc thành hoa nở hoặc bị tỉa xuống dưới ngọn cây thì mất đèn. Hoa nở bị tỉa thành ngọn cây chưa có đèn.
- **C3.3** KHI một bên có 2 đèn màu mình sáng cùng lúc THÌ bên đó thắng ngay (kể cả ngay sau bước đi, không cần mọc).
- **C3.4** KHI đến lượt một bên mà không người leo nào bước được THÌ bên đó thua.
- **C3.5** Không có luật hoà: vì cây có thể bị tỉa, ván có thể kéo dài; người chơi tự bấm “New game”.

## C4 — Điều khiển và giao diện

- **C4.1** Bấm người leo của mình để nhấc lên; điểm vàng hiện ở các ô bước được. Ở bước mọc hiện mầm xanh, ở bước tỉa hiện mũi tên san hô, kèm nút “Skip cutting”. Bấm chỗ trống thì đặt người leo xuống (chỉ trước khi đi).
- **C4.2** Thanh trạng thái ghi lượt và bước hiện tại (chọn người leo / đi / mọc / tỉa). Bảng điểm hiện số đèn đang sáng (x/2) và số ván thắng; khi kết thúc ghi lý do (hai ngọn cây sáng đèn, hoặc đối thủ hết nước đi).
- **C4.3** Bàn phím: danh sách người leo của bên đang đi (vị trí và nấc ô), và danh sách ô cho bước hiện tại với mô tả (nấc từ → tới, đèn được thắp / giành / bị dập).
- **C4.4** Khi đấu máy, người chơi là Amber, máy là Violet; máy chơi cả lượt (đi, mọc, tỉa hoặc bỏ qua) với từng phần cách nhau một chút để người chơi theo dõi được.

## C5 — Máy

- **C5.1** Có 3 mức Easy / Medium / Hard; trang mở ở mức Easy (G1.1).
- **C5.2** Easy: chỉ nhìn lượt của mình, 35% chơi một lượt ngẫu nhiên.
- **C5.3** Medium: cùng thuật toán với Hard nhưng ngân sách nhỏ: thấy đe doạ trực tiếp, không tính xa.
- **C5.4** Hard: tìm kiếm trên cả lượt (đi + mọc + tỉa), khoảng 0,7 s/lượt (tối đa ~2 s), đọc 3–4 lượt; chạy trong Web Worker.
- **C5.5** Medium và Hard PHẢI thắp đèn thắng khi có thể; Hard PHẢI chặn đèn thắng của đối thủ.
- **C5.6** Ở bước mọc và tỉa, máy chỉ chọn trong những phần còn lại của lượt.

## C6 — Cảnh 3D

- **C6.1** Khoảng rừng lúc bình minh: cây lá rộng và cây lá kim bao quanh, thưa dần lên đồi; bục đá phủ rêu, đá tảng, nấm; đom đóm bay và nhấp nháy.
- **C6.2** Bàn gỗ vuông viền vàng, ô rêu. Mỗi nấc mọc là cùng một cây ở tuổi khác nhau (thân cong có rễ và cành, tán nhiều cụm lá, đỉnh tán phẳng để người leo đứng), không phải các khối chồng lên nhau. Các ô cạnh nhau dùng biến thể cây khác nhau.
- **C6.3** Người leo là tinh linh rừng có chiếc lá trên đầu, luôn quay về phía camera; nhảy khi bước. Đèn giấy lơ lửng trên ngọn cây (trên đầu người leo nếu có), chiếu sáng tán lá theo màu chủ.
- **C6.4** Cây vừa mọc vươn lên từ kích thước nấc trước; cây bị tỉa thu lại. Vòng sáng: vàng dưới người leo đang chọn, mờ ở ô vừa bước, xanh ở ô vừa mọc, san hô ở ô vừa tỉa.
