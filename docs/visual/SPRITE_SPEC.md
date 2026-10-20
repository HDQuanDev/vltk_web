# Actor art handoff

Runtime hiện dùng 64×96 px, feet anchor (32,88), tile 96×48/world unit. Hướng E/SE/S/SW/W/NW/N/NE; 6 frame/hướng/state. Mỗi hướng phải vẽ/render độc lập, không xoay một ảnh thành 8 hướng. Giữ 2 px transparent gutter trong từng cell; premultiplied alpha, không matte, không viền trắng. Atlas mobile tối đa 2048 mỗi cạnh: tách theo actor/state nếu vượt, không scale méo hình.

Đang tích hợp: 8 state idle/walk/attack/cast/hit/dead/revive/interact từ atlas procedural. Nữ có silhouette tóc/vạt áo khác, không chỉ tint. Camera/depth/occlusion cùng vị trí được interpolate; gameplay position vẫn authority.

Cần sản xuất: run, mounted-idle, mounted-move; full 11-state set, từng giới tính, vũ khí/môn phái, monster/NPC identity. Hair/face/costume/weapon overlay phải cùng canvas, frame count, direction ordering, anchor và tick timing. Sprite tấn công/niệm phép cần event markers do combat authority gửi, không tự áp damage trong animation.

Manifest tối thiểu: stable ID, version, source/provenance, quality, path, canvas, feet, states/directions/FPS/frame layout, weapon and appearance compatibility. Các chân dung mới là framed illustration, không dùng như sprite cắt nền và không tính thành actor production.

Review: `/animation-inspector.html` ở dev; kiểm tra mọi hướng/state, chân không trượt, đổi hướng không nhảy anchor, dead/revive terminal frames, weapon không crop, silhouette nam/nữ, UI/camera 30/60Hz. Save không lưu frame render.

## Lớp sprite ảnh cho quái (20/10/2026)

16 bộ sprite quái đã nối runtime: `apps/web/public/assets/monsters/<monsterId>/sprites/{down,right,up}/<state>.png`, PNG 256×256 nền trong suốt, neo giữa–đáy ở `feetY = 246`. Manifest: `monsterSpriteManifest` trong `packages/game-content/src/visuals.ts`; ánh xạ state/direction và fallback ở `apps/web/src/game/animations/monster-sprites.ts`; tải lazy + dọn texture theo bản đồ ở `monster-sprite-cache.ts`.

- 13 state: stand, walk-1/2, run-1/2, cast, attack, hit, hurt, die, use, loot, sit. Runtime dùng 11: `loot`/`sit` chưa có state tương ứng trong core; `revive` dùng ảnh `die`; `run-*` chỉ dùng cho quái `speed ≥ 2.2` (core không có state chạy).
- 3 hướng vẽ sẵn + trái là ảnh `right` lật ngang. Khác yêu cầu 8 hướng cho actor: `Direction8` chéo gộp theo trục dọc (1/3 → `down`, 5/7 → `up`).
- Hiển thị: quái thường 112px, boss (`brain === "boss"`) ×1.5 = 168px, không tint đè art. Thiếu file hoặc ảnh chưa tải xong → tự quay về atlas procedural, không lỗi và không để ô trống.
- Kiểm tra: `apps/web/monster-inspector.html?monster=<id>` (13 state × 3 hướng + cột trái lật), `node scripts/capture-monster-sprites.mjs` → `artifacts/monster-sprites/` (16 ảnh inspector + ảnh in-game + A/B với fallback), `pnpm validate:assets` xác nhận đủ 624 file.

## Lớp sprite ảnh cho nhân vật người chơi (20/10/2026)

20 bộ (10 phái × nam/nữ) + bộ trung lập: `apps/web/public/assets/actors/<phái>/<male|female>/sprites/{down,right,up}/<state>.png`. Manifest `actorSpriteManifest` (`packages/game-content/src/visuals.ts`); chọn bộ và ánh xạ ở `apps/web/src/game/animations/actor-sprites.ts`; phần hướng/state/URL/neo chân dùng chung với quái ở `sprite-frames.ts`; tải lazy + `warm()` + dọn texture ở `sprite-texture-cache.ts`.

- Chọn bộ: `(definitionId = id phái, appearance = male|female)` → `<phái>/<giới>`; thiếu cặp đó → `neutral/male`; thiếu cả bộ trung lập → atlas procedural. Nhân vật sprite không bị tint phái đè lên art.
- Hiển thị: khung 256px, neo chân 246/256, cao 112px trên bản đồ; trong lobby (`CharacterLobby` "Xem ngoại hình") vẽ 208px và xoay 4 hướng.
- Trạng thái: stand/walk-1/2/cast/attack/hit/hurt/die/use như quái; `run-*`, `loot`, `sit` chưa có state trong core; `revive` dùng `die`.
- Kiểm tra: `apps/web/actor-inspector.html?set=<phái>/<giới>`, `node scripts/capture-actor-sprites.mjs` → `artifacts/actor-sprites/` (21 ảnh inspector + ảnh in-game + A/B fallback), `pnpm validate:assets` xác nhận đủ 819 file.
- Còn thiếu: NPC vẫn procedural; chưa có hướng chéo thật (8 hướng) và chưa có layer vũ khí/giáp tách rời.
