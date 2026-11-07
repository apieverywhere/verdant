# Requirements — Caro 3×3 “Vanishing” (Thung lũng hoàng hôn)

> Giai đoạn 1 của quy trình **Spec-Driven Development (SDD)**: mô tả *cái gì* cần xây.
> Thiết kế kỹ thuật ở [design.md](./design.md), kế hoạch thực thi ở [tasks.md](./tasks.md).
> Tiêu chí chấp nhận viết theo dạng EARS (`KHI … THÌ hệ thống PHẢI …`).

## Bối cảnh

Game caro 3×3 biến thể **vanishing tic‑tac‑toe**: mỗi bên chỉ giữ tối đa 3 quân trên bàn.
Khi đặt quân thứ 4, quân đặt sớm nhất của chính người đó biến mất. Vì bàn không bao giờ đầy,
ván đấu không thể hòa theo kiểu cổ điển — cần luật hòa riêng.

Giao diện theo design “Caro 3×3 – Thung lũng hoàng hôn”: cảnh 3D (three.js) một bàn cờ
trên đảo đá giữa thung lũng lúc hoàng hôn, HUD kính mờ phía trên/dưới.

Stack bắt buộc: **Next.js** (App Router, TypeScript), cài đặt / chạy / build bằng **Bun**,
3D bằng **three.js**, AI bằng **minimax + alpha‑beta pruning**.

---

## R1 — Luật chơi cơ bản

**User story:** Là người chơi, tôi muốn đánh caro 3×3 luân phiên X/O để phân thắng bại.

1. KHI ván mới bắt đầu THÌ hệ thống PHẢI hiển thị bàn trống 3×3 và lượt của người đi trước.
2. Ván đầu tiên (hoặc sau “Xóa tỉ số” / đổi chế độ) X đi trước. KHI bấm “Ván mới” sau một ván có người thắng THÌ người thua PHẢI đi trước; sau ván hòa hoặc ván bỏ dở, người đi trước đổi luân phiên.
3. KHI người chơi chọn một ô trống trong lượt của mình THÌ hệ thống PHẢI đặt quân và chuyển lượt.
4. KHI người chơi chọn ô đang có quân (kể cả quân sắp biến mất) THÌ hệ thống PHẢI bỏ qua nước đó.
5. KHI một bên có 3 quân thẳng hàng (ngang, dọc, chéo) THÌ hệ thống PHẢI kết thúc ván, công bố người thắng và cộng điểm.
6. KHI ván đã kết thúc THÌ hệ thống PHẢI chặn mọi nước đi cho tới khi bắt đầu ván mới.

## R2 — Luật biến mất (vanishing)

**User story:** Là người chơi, tôi muốn mỗi bên chỉ có 3 quân để ván cờ luôn biến động.

1. Mỗi người chơi PHẢI có tối đa 3 quân trên bàn tại mọi thời điểm (tổng tối đa 6).
2. KHI người chơi đặt quân thứ 4 THÌ quân đặt sớm nhất của chính người đó PHẢI biến mất **trước** khi kiểm tra thắng.
   Hệ quả: quân vừa biến mất không được tính vào hàng thắng; người chơi thắng nếu 3 quân còn lại thẳng hàng.
3. Quân của đối thủ KHÔNG BAO GIỜ bị ảnh hưởng bởi nước đi của mình.
4. Trong chế độ **Đấu với máy**, KHI người đang tới lượt đã có 3 quân THÌ hệ thống PHẢI làm nổi bật (mờ dần / nhấp nháy) quân sẽ biến mất ở nước này và ghi vị trí trên thanh trạng thái.
   Trong chế độ **2 người**, hệ thống KHÔNG ĐƯỢC báo trước quân nào sắp biến mất (không làm mờ, không ghi chú) — người chơi phải tự nhớ thứ tự quân của mình.
5. KHI một quân biến mất THÌ hệ thống PHẢI chạy hiệu ứng biến mất (thu nhỏ, bay lên, mờ dần).

## R3 — Luật hòa

1. KHI cùng một thế cờ (vị trí quân, thứ tự đặt quân của mỗi bên, người tới lượt) xuất hiện lần thứ 3 THÌ hệ thống PHẢI tuyên bố hòa và cộng điểm hòa.

## R4 — Chế độ chơi

1. Hệ thống PHẢI có 2 chế độ: “2 người” (cùng máy) và “Đấu với máy”.
2. KHI đổi chế độ THÌ hệ thống PHẢI reset bàn và tỉ số.
3. Trong chế độ đấu máy, người chơi là X, máy là O.
4. KHI tới lượt máy THÌ hệ thống PHẢI hiển thị “Máy đang nghĩ…”, chặn thao tác người chơi và đi sau ~600 ms.

## R5 — AI (minimax + alpha‑beta)

**User story:** Là người chơi, tôi muốn đấu với máy có nhiều mức độ khó.

1. AI PHẢI dùng thuật toán minimax (dạng negamax) với cắt tỉa alpha‑beta, giới hạn độ sâu và hàm lượng giá heuristic.
2. Hệ thống PHẢI có 3 mức: **Dễ**, **Vừa**, **Khó**, mặc định **Khó**; đổi mức PHẢI bắt đầu ván mới.
3. Ở mọi mức, KHI AI có nước thắng ngay THÌ AI PHẢI đi nước đó (trừ mức Dễ được phép “lỡ tay” ngẫu nhiên).
4. Ở mức Vừa và Khó, KHI đối thủ đe dọa thắng ở nước kế tiếp và có thể chặn THÌ AI PHẢI chặn.
5. Ở mức Khó, AI PHẢI chơi tối ưu: không bao giờ thua từ thế không thua, và luôn thắng từ thế thắng
   (kiểm chứng bằng bộ giải chính xác — retrograde analysis — trong test).
6. Nước đi của AI ở mức Khó PHẢI tính xong dưới 100 ms (trung vị, ở thế khó nhất — bàn trống) và luôn nằm trong thời gian chờ 600 ms. Đo thực tế toàn bộ thế cờ: đỉnh ~190 ms do JIT/GC.
7. Kết quả alpha‑beta PHẢI bằng đúng kết quả minimax thuần ở cùng độ sâu (test kiểm chứng).
8. Khi nhiều nước có cùng điểm tốt nhất, AI PHẢI chọn ngẫu nhiên trong số đó để ván đấu đa dạng.

## R6 — Cảnh 3D & hiệu ứng (giữ nguyên design)

1. Cảnh PHẢI dựng bằng three.js: bầu trời hoàng hôn (gradient, mặt trời, sao lấp lánh), địa hình núi low‑poly, mặt nước gợn sóng phản chiếu, rừng thông, đảo đá, khung bàn viền vàng, 4 đèn đá ở góc bàn, đèn trời bay lên.
2. Hiệu ứng PHẢI giữ như design:
   - quân rơi xuống (từ cao 3.4, phóng to 0.55→1, easing cubic‑out, 460 ms), quân X xoay nửa vòng khi rơi;
   - ô hover đổi màu theo người tới lượt;
   - khi thắng: 3 ô sáng nhấp nháy, 3 quân nảy lên xuống và phát sáng, thanh vàng mọc dần nối 3 quân (sau 380 ms, dài dần trong 420 ms);
   - đèn trời bay lên, lắc lư, xoay; sao nhấp nháy; mặt nước gợn theo thời gian;
   - camera tự xoay chậm sau 7 giây không tương tác.
3. Tương tác: kéo để xoay (pitch giới hạn 0.16–1.35), cuộn để zoom (10–42), nhấn vào ô để đánh; con trỏ `pointer` khi hover ô hợp lệ, `grab`/`grabbing` khi kéo.
4. KHI trình duyệt không hỗ trợ WebGL THÌ hệ thống PHẢI hiển thị thông báo thay thế.

## R7 — HUD & khả năng truy cập

1. HUD PHẢI có: tiêu đề + phụ đề, bảng điểm (X / Hòa / O với nhãn “Bạn/Máy” hoặc “Người X/Người O”), thanh trạng thái `aria-live`, nhóm chế độ, nhóm độ khó (chỉ khi đấu máy), nút “Ván mới”, “Xóa tỉ số”, dòng hướng dẫn.
2. Bàn cờ PHẢI chơi được bằng bàn phím / trình đọc màn hình qua lưới 9 nút ẩn (sr‑only, hiện khi focus) có `aria-label` mô tả ô.
3. Giao diện PHẢI dùng được ở chiều rộng điện thoại (HUD xuống dòng, không cuộn ngang).

## R8 — Build, test, tài liệu

1. `bun install`, `bun run dev`, `bun run build`, `bun run start`, `bun test` PHẢI chạy được.
2. Logic game và AI PHẢI là module thuần (không phụ thuộc React/three) và có unit test.
3. Tài liệu: README (cách chạy), spec (requirements / design / tasks).
