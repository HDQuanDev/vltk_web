> Đang triển khai overhaul mới. Audit và kế hoạch trước thay đổi tại [visual-review](audit/visual-review.md), [gameplay-gaps](audit/gameplay-gaps.md), [full-release](roadmap/full-release.md). Các số liệu bên dưới là baseline v0.2, chưa phải kết quả đợt mới.

# Trạng thái triển khai v0.2.0

Đối chiếu source và các kiểm thử thực thi, không đánh dấu toàn bộ checklist hoàn thành từ tên module hoặc số lượng catalog. Phạm vi v1.0 giữ nguyên tại MASTER_GAME_DESIGN.md; ROADMAP.md gắn mọi nhóm yêu cầu vào công việc tiếp theo.

| Checklist của người dùng | Đã triển khai/kiểm chứng | Chưa đạt để nghiệm thu đầy đủ |
|---|---|---|
| Animation 8 hướng và trạng thái chiến đấu | Atlas 384 frames/loại vũ khí, idle/walk/attack/cast/hit/dead/revive/interact, frame dựa tick, feet/depth nhất quán; inspector đã xem | Art procedural còn đơn giản; NPC tĩnh, thiếu equipment/appearance art và polish animation |
| Map địa hình/vật cản/depth/môi trường sống động | 3 map, A*/collision/cổng/Y-sort, che khuất, clock/ngày đêm/thời tiết/tài nguyên; quái giữ trạng thái khi quay lại | Chưa 50 map/biome/đa cao độ, NPC schedules/regional event/ambient audio đầy đủ |
| 10 phái khác lối chơi/kỹ năng | 10 phái,20 nhánh,141 chiêu, ownership/branch/passives/loadout, cơ chế projectile/CC/DOT/heal/shield/leech; test thực thi từng chiêu + HUD10phái | Chưa khóa class balance, nhập môn/sư phụ/quest riêng, art/audio đặc trưng và chiều sâu progression |
| Quái/boss AI đa dạng | 6 brains: melee/pack/ranged/assassin/poison/boss, threat/leash/positioning, boss telegraph/phase/summons/dodge | 6 definitions/1 boss; chưa100quái/20boss hoặc10dungeon |
| Trang bị/nâng cấp/kinh tế tác động thật | Equip, enhance +10,2ngọc,cost/derived stats,kho64,lock/sort,7nghề/7recipes,thu thập; atomicity/reload tested | 11items/3slots; chưa500items/affix/set/6rarity/NPCmarket/repair/tierprogression |
| Nhiệm vụ/hoạt động chơi dài hạn | 8quest kill/collect/craft/explore và repeat game clock; engine có equip/talk/level objectives; claim idempotent | Chưa150quest/truyện dài, companion/guild/PvP/siege/event/dungeon; chưa đạt chơi dài hạn |
| Gameplay PC/mobile | Browser smoke tại1920×1080,1366×768,844×390,932×430 và390×844; menu/hotbar/joystick/skill/craft/gems/kho/reload | Chưa toàn bộ feature v1.0 và chưa Android/iPhone/Safari thật, accessibility/deviceperformance |
| Save/load nhiều giờ/nâng cấp | v1fixturethật→v2+archive,backupcorrupt safety,transactions,4h288000ticksoak/8checkpoints,replayresume,nhiềuactor; migration IndexedDB browser | Chưa soak render dài trên máy/điện thoại, upgrade PWA đang chơi/quota fault injection đủ; bản sau vẫn cần migration mới |
| Offline sau cache | Production precache~1.9MB; chặn mạng→reload→chuyểnmap/lưu; mobilecraft/lưu/reloadoffline | Chưa cache nội dung tương lai, Safari/device storage eviction và PWAupdate regression |
| Shared simulation cho online | Core Node không DOM, commands runtimevalidated,20Hztick/seed,ownerRPGđaactor,replay/serialization,serverpauseblocked | Chưa RemoteGameSession/server/auth/transport/instances/interest/reconnect/persistence server. Kế hoạch online có, vận hành chưa có |

Kết quả xác minh hiện tại: **226/226 unit/integration và 16/16 browser E2E**, typecheck/lint/content validation/build đều đạt. Báo cáo đầy đủ: [verification](roadmap/verification.md).

## Thay đổi quan trọng so với v0.1

Tách combat/AI/economy rules thành module dùng chung; thêm state/status/projectile/telegraph, nhân vật đa actor, phái/nhánh/skills và snapshot v2. Không xóa core/session cũ hoặc tạo game mới. Mở rộng schema và catalog có validation, ghi migration có archive, sửa reset quái khi đổi map và bảo toàn backup nếu primary hỏng. Bổ sung UI thật cho economy và phái ở PC/mobile.

Các số catalog có thể tái tạo bằng `pnpm report:content` → `artifacts/content-coverage.json`; baseline 20 nhánh trong `artifacts/balance-baseline.json`; soak trong `artifacts/long-session.json`. Mỗi chiêu có test thực thi không đồng nghĩa có 141 cơ chế hoàn toàn độc lập hoặc đã cân bằng.

## Còn mở

Toàn bộ khoảng thiếu trong bảng và ROADMAP là công việc bắt buộc tới v1.0. Bản hiện tại vẫn là bản phát triển; không nghiệm thu hoàn tất 10 ô checklist. Chưa có công việc nào tiếp tục ngầm sau khi phiên làm việc dừng.
