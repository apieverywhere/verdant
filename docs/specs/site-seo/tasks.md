# Tasks — Trang phụ, pháp lý, SEO, thống kê truy cập

> Giai đoạn 3 của SDD. Spec viết bù sau khi code đã có; các việc đã xong được ghi lại theo lịch sử commit.

- [x] **T1. Spec** — requirements.md, design.md, tasks.md (viết bù 15/11/2026).
- [x] **T2. Trang `/sitemap`, `/privacy`, `/terms`** + header/footer dùng chung. _(S1, S2.1, S2.3)_
  - Kiểm chứng: `e2e/smoke.ts` (“privacy policy page”, “terms of service page”, “sitemap page: 3 sections, no placeholder links”).
- [x] **T3. `sitemap.xml` và `robots.txt`.** _(S3.5)_
  - Kiểm chứng: `e2e/smoke.ts` (“sitemap.xml lists every public page”, “robots.txt allows crawling and points to the sitemap”).
- [x] **T4. Xác minh Google Search Console** — meta tag qua biến môi trường và file xác minh trong `public/`. _(S3.6)_
- [x] **T5. Vercel Web Analytics và Speed Insights;** Privacy Policy mô tả thống kê không cookie. _(S5, S2.1)_
- [x] **T6. Gỡ AdSense** — script, banner, quảng cáo giữa ván, `ads.txt`, link cài đặt cookie, phần quảng cáo trong Privacy và Terms. _(S2.4)_
- [x] **T7. SEO** — tiêu đề, canonical, ảnh chia sẻ, JSON-LD, manifest. _(S3.1–S3.4, S4.2)_
  - Kiểm chứng: `e2e/smoke.ts` (“lobby title”, tiêu đề trang game).
- [x] **T8. Icon PNG và `lastmod`** — `scripts/gen-icons.tsx`; `lastmod` theo `updated` và `LEGAL_UPDATED`. _(S3.5, S4.1)_
- [ ] **T9. Cập nhật Privacy Policy cho cài đặt mới** — mục “What the site stores on your device” mới nói tới game chơi gần nhất. Thêm ngôn ngữ và âm lượng (`verdant:settings`), rồi đổi `LEGAL_UPDATED`. _(S2.2)_
