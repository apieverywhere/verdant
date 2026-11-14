# Design — Trang phụ, pháp lý, SEO, thống kê truy cập

> Giai đoạn 2 của SDD.

## 1. Nguồn dữ liệu

| File | Nội dung |
|---|---|
| `src/lib/site.ts` | `SITE_NAME`, `SITE_TAGLINE`, `SITE_DESCRIPTION`, `SITE_URL`, `LEGAL_UPDATED`, `formatDate`, `CONTACT_EMAIL` |
| `src/lib/games.ts` | Mỗi game: `name`, `href`, `updated` (lastmod), `kind` (vế sau của tiêu đề), `scene`, `description`, `genre`, `artBg` |
| `src/lib/seo.ts` | `gameMetadata(game)`, `gameJsonLd(game)` dùng chung cho các trang game |
| `.env.example` | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` |

`SITE_URL` = `NEXT_PUBLIC_SITE_URL` → `https://${VERCEL_PROJECT_PRODUCTION_URL}` → `https://verdantverse.vercel.app`, bỏ dấu `/` cuối.

## 2. Metadata

- `layout.tsx`: `metadataBase`, mẫu tiêu đề `%s · Verdant`, Open Graph `website` / `en_US`, Twitter `summary_large_image`, meta xác minh Google chỉ khi có biến môi trường, `viewport.themeColor`.
- Mỗi trang game: `metadata = gameMetadata(game)` (tiêu đề `name – kind`, canonical = `href`) và `<JsonLd data={gameJsonLd(game)} />` (`VideoGame`: thể loại, nền tảng web, 1–2 người, miễn phí, ảnh = `opengraph-image` của route).
- Trang chủ: canonical `/`, JSON-LD `@graph` gồm `WebSite` và `ItemList`.

## 3. Ảnh chia sẻ

- `src/lib/ogImage.tsx`: `renderOgImage({ kicker, title, subtitle, art, artBg })` vẽ thẻ 1200×630 bằng `ImageResponse`.
- `src/lib/gameOgImage.tsx`: `gameOgImage(id)` lấy hình từ `GAME_ART` (`components/gameArt.tsx`, chung với thẻ sảnh). Mỗi route có `opengraph-image.tsx` chỉ re-export.

## 4. Sitemap và robots

- `src/app/sitemap.ts` sinh `sitemap.xml` từ `GAMES` và `LEGAL_UPDATED`. Phải đi cùng nhóm với trang `/sitemap` (`src/app/sitemap/page.tsx`, mảng `GROUPS`).
- `src/app/robots.ts`: `allow: /`, `sitemap: ${SITE_URL}/sitemap.xml`.

## 5. Trang pháp lý

- Server Component tĩnh, chỉ tiếng Anh, style `.legal`. Ngày cập nhật hiển thị bằng `formatDate(LEGAL_UPDATED)`.
- Dữ liệu site lưu trong localStorage hiện có: `verdant:last-game` (game chơi gần nhất) và `verdant:settings` (ngôn ngữ, âm lượng nhạc và hiệu ứng, xem [settings-i18n](../settings-i18n/design.md)). Tỉ số chỉ nằm trong trang đang mở.

## 6. Icon

`scripts/gen-icons.tsx` vẽ logo ra `src/app/favicon.ico`, `src/app/apple-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`. `src/app/manifest.ts` khai báo chúng cùng `icon.svg`.

## 7. Thống kê

`<Analytics />` và `<SpeedInsights />` (`@vercel/analytics/next`, `@vercel/speed-insights/next`) ở cuối `<body>` trong `layout.tsx`. E2E bỏ qua lỗi 404 của các script này khi chạy local.
