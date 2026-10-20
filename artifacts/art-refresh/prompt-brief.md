> **Bản v3 (20/10/2026):** 36 icon đã được khử viền trắng bợt quanh mép và bóc các mảng hào quang nền sót lại (nhẫn, thảo dược) để đặt lên ô đồ nền tối không bị thô. File icon + 3 atlas đã thay mới; chân dung, lobby, môi trường giữ nguyên như v2. Nếu đã nối v2 rồi thì chỉ cần thay thư mục icons/ và 3 file atlas, không phải nối lại từ đầu.

# Việc cần làm: thay TOÀN BỘ art giao diện + môi trường của vltk_web bằng bộ art mới

Trong thư mục này có bộ art mới (đã kiểm tra bằng mắt, tách nền trong suốt, đúng tên file như bản cũ):

- `icons/` — 36 icon PNG lẻ, nền trong suốt, tên dạng `<key>-v1.png`
- `atlas/` — `icons-v1.png`, `icons-extra-v1.png` (bản nguồn vẽ lại, đúng hình học atlas cũ), `icons-atlas-v1.png` (atlas runtime 768×768 trong suốt), `portraits-v1.png` (tấm nguồn 6 chân dung, đúng khổ 1536×1024)
- `portraits/` — 6 chân dung lẻ 512×512: `portrait-male-v1.png`, `portrait-female-v1.png`, `portrait-elder-v1.png`, `portrait-merchant-v1.png`, `portrait-smith-v1.png`, `portrait-teacher-v1.png`
- `lobby/lobby-v1.png` — ảnh sảnh chờ 1920×1080
- `moi-truong/master/` — 5 art môi trường bản gốc lớn: `house-v1.png`, `tree-v1.png`, `cherry-v1.png`, `bamboo-v1.png` (đã tách nền trong suốt), `ground-v1.png` (texture nền đất liền mạch, lặp không lộ mối nối)
- `moi-truong/runtime-512/` — 5 file tương ứng đã thu về tối đa 512px, đúng chuẩn runtime hiện tại

Hãy nối bộ art này vào code theo đúng các bước dưới đây. KHÔNG sửa logic game, KHÔNG đổi tên file, KHÔNG đổi `apps/web/src/ui/interface-art.ts`, `atlas-cells.json`, `packages/game-content/src/visual-assets.ts` trừ khi bước kiểm tra cuối phát hiện lệch key thật sự.

## Bước 0 — Tìm đúng cơ chế đang chạy (làm trước, báo lại nếu khác mô tả)
Đọc `apps/web/src/ui/interface-art.ts`, `scripts/build-interface-art.mjs` và `docs/visual/ASSET_PROVENANCE.md`. Xác định:
1. Thư mục thật đang serve các file `/assets/interface/*.png` (thường là `apps/web/public/assets/interface/` hoặc được copy từ `assets/source/interface/` lúc build).
2. File runtime môi trường nằm ở `apps/web/public/assets/overhaul/` (theo `assets/source/overhaul/README.md`).
Nếu cơ chế khác hẳn mô tả trên, DỪNG và báo lại trước khi ghi đè bất cứ file nào.

## Bước 1 — Icon (36)
1. Ghi đè cả 36 file `<key>-v1.png` trong thư mục runtime bằng file trong `icons/`. Đủ 36 key: sword, saber, spear, staff, daggers, robe, helmet, boots, ring, pendant, talisman, potion-red, potion-blue, ore, herb, wood, gem, ward, slash, lightning, wind, lotus, shield, manual, fan, scale-armor, bamboo-hat, crown, silk, hide, jade-ore, storm-iron, jade-gem, amber-gem, dragon-sword, elixir.
2. Ghi đè atlas runtime `icons-atlas-v1.png` (bản trong `atlas/`) vào đúng vị trí bản cũ.
3. Ghi đè 2 file nguồn `assets/source/interface/icons-v1.png` và `icons-extra-v1.png` bằng bản trong `atlas/` để lần build/sync sau không đè ngược lại. Giữ nguyên `atlas-cells.json`. Lưu ý: atlas nguồn mới nền TRẮNG, còn icon lẻ và atlas runtime nền TRONG SUỐT — đây là chủ đích, đừng tự ý đổi.

## Bước 2 — Chân dung (6) + lobby
1. Ghi đè file nguồn `assets/source/interface/portraits-v1.png` bằng `atlas/portraits-v1.png`. Thứ tự ô trong tấm mới: hàng 1 = male, female, elder; hàng 2 = merchant, smith, teacher. Đối chiếu thứ tự này với danh sách portraits trong `interfaceArtManifest` trước khi build; nếu thứ tự trong code khác, báo lại thay vì tự hoán đổi.
2. Nếu runtime dùng file lẻ `portrait-<id>-v1.png` (256×256), ghi đè bằng 6 file trong `portraits/` (bản 512×512, thu nhỏ về 256 nếu pipeline yêu cầu đúng cỡ).
3. Ghi đè `lobby-v1.png` ở cả nguồn `assets/source/interface/` và thư mục runtime bằng `lobby/lobby-v1.png`.

## Bước 3 — Môi trường (5)
1. Ghi đè 5 file nguồn trong `assets/source/overhaul/` bằng `moi-truong/master/`.
2. Ghi đè 5 file runtime trong `apps/web/public/assets/overhaul/` bằng `moi-truong/runtime-512/` (đây chính là bản "uniform resize max 512px giữ alpha" mà README của thư mục overhaul mô tả).
3. `ground-v1.png` là texture lặp liền mạch: kiểm tra code đang dùng nó dạng tile/repeat; nếu đang dùng dạng ảnh tĩnh một lần thì vẫn thay như thường, không sửa code.

## Bước 4 — Chạy lại pipeline nếu có
Nếu repo có script build art (ví dụ `node scripts/build-interface-art.mjs`) hoặc lệnh validate (`pnpm validate:assets`), chạy chúng sau khi ghi đè và báo kết quả. Nếu script tự cắt lại từ file nguồn thì để script chạy bình thường — file nguồn đã được thay ở Bước 1–3.

## Bước 5 — Kiểm tra trực quan (bắt buộc)
Chạy app, mở lần lượt các màn: Shop, Workshop, SectSkills, Storage, CharacterLobby và cảnh thế giới có nhà/cây/mặt đất. Xác nhận:
- Cả 36 icon hiển thị ảnh mới, không còn icon nào rơi về hình vẽ SVG phẳng dự phòng.
- 6 chân dung và ảnh lobby hiển thị đúng nhân vật, không lệch thứ tự.
- Nhà, thông, mai, trúc đứng đúng trên nền đất mới, viền tách nền sạch, không còn mảng trắng.
Liệt kê rõ key/file nào còn thiếu hoặc lệch (nếu có). Nếu mọi thứ khớp, báo "đã thay xong toàn bộ" kèm danh sách file đã ghi đè.

## Bước 6 — Cập nhật tài liệu
Trong `docs/visual/ASSET_PROVENANCE.md`, cập nhật các mục icon/portraits/lobby/overhaul: nguồn gốc = bộ art AI tạo ngày 19/10/2026, trạng thái vẫn để "review-required" cho tới khi chủ dự án duyệt trực quan xong. Không xoá lịch sử cũ, chỉ thêm ghi chú thay thế.
