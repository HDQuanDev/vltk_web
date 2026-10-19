# Kiểm chứng bản phát triển 0.2.0

Môi trường thực thi: macOS Apple Silicon, Node 22.22.0, pnpm 10.34.5, Chromium headless qua Playwright. Đây chưa phải kiểm tra Android/iPhone/Safari thật.

## Kết quả đã chạy

| Lệnh | Kết quả |
|---|---|
| `pnpm typecheck` | Đạt strict TS toàn repo + core ES2022/Node không DOM |
| `pnpm lint` | Đạt |
| `pnpm test` | 226/226 tests, 10 files |
| `pnpm validate:content` | 3/3 tests; schema/references/branches/recipes/resources/quest graph/spawns |
| `pnpm report:content` | Catalog + coverage thực tế, 20 dòng baseline nhánh từ combat core |
| `pnpm build` | Đạt, PWA precache 16 entries, 1860.33 KiB |
| `pnpm test:e2e` | 16/16 Chromium browser tests, khoảng45giây |

Build vẫn có cảnh báo chunk lớn (Phaser khoảng1.2MB chưa nén; app khoảng588KB) và annotation từ dependency Zod. Không có lỗi build. Không giấu cảnh báo bằng tăng ngưỡng cảnh báo.

## Nội dung kiểm thử

- 49 regression tests v0.1 vẫn đạt: combat/AI/pathfinding/progression/quest/inventory/session/storage và hành trình đầu game đến boss. Test portal được cập nhật để yêu cầu giữ dữ liệu các map đã thăm, thay hành vi xóa map cũ.
- 154 combat tests mới: mỗi definition trong141skill có test cast hoặc passive thực thi; thêm projectile bay/né/wall/pierce, cast interrupt, DOTstack/expiry, shield/silence, telegraph né/death cancel, summons cleanup, branch passive, ownership đa actor và server không pause.
- 9 economy tests: enhance ảnh hưởng stat/cost, locked materials, craft thành công/thất bại/túi đầy, gems không nhân đôi, giới hạn ô, bank metadata, resource/profession/quest, daily deadline/claim idempotency.
- 6 migration/replay tests: fixture v0.1 thật, DBupgrade/archive/import, corrupt primary không phá backup, futureversion reject,384frames và replay nhiều actor.
- 7 contract/world tests: envelope xấu/NaN/extrafield/sequence/actor, stat ưu tiên từng phái, replay không phụ thuộc locale, clock/resume, thêm spawn mới không reset xác cũ, crossrefs/ownership/gems metadata trong save.
- 1 soak:288000ticks tương đương4giờ game chạy tăng tốc,8checkpointvalidate. Tối đa21entity,1projectile và khoảng20KB ởcheckpoint; resume và chạy tiếp1200ticks cho snapshot giống world liên tục. Số liệu thực tại `artifacts/long-session.json`.

## Browser E2E

5 viewport1920×1080,1366×768,844×390,932×430,390×844: HUD/túi/equip, không tràn ngang, hitboxes tròn của4skill+attack không chồng nhau. Các ca còn lại: nhận quest/đi/lưu/reload; skill gâydamage/kill/lootEXP; joystick/skill; nhiều character/export; productionoffline reload/portal/save; chiêu đầu của cả10phái giết target quaHUD; branch/bind/passive giữ saureload; craft/enhance/socket/bank cảPC/mobile; seedingDBv1 thật rồiapp tựmigrate + sourcearchive; mobile ngắtmạng trước craft/save/reloadhai lần.

Fixtures E2E dùng import bản lưu hợp lệ để vào đúng tình huống, không cấp debug API trong production. Test hành trình khởi đầu riêng chạy gameplay commands bình thường. E2E nhiều phái chờ loot mới của từng lượt, không đọc log cũ để làm kết quả qua giả.

## Rà hình ảnh

Đã mở xem ảnh desktop, mobile ngang và contact sheet atlas; đã sửa thân áo nhìn nghiêng, clipping khung sprite, vùng nhà trong suốt quá rộng và nút skill thứ4 mobile chồng nút thứ3. Ảnh tại `artifacts/game-*.png`, `artifacts/animation-states.png`. Art vẫn đơn giản, không đạt độ chi tiết ảnh tham chiếu; NPC chưa có atlas8hướng.

## Giới hạn bằng chứng

Soak tăng tốc không chứng minh4giờ render/điện thoại hoặc memoryGPU khôngleak. Viewport Chromium không thay iOS/Android thật. Bài đo DPS một target Kim đứng yên không chứng minh class/boss/level100 balance; số đếm141 definitions không nghĩa141 cơ chế độc lập. Chưa có nội dung dài hạn,50maps,100quái,20bosses,500items,150quests,10dungeons và hệ thống companion/guild/arena/siege. Các mục bắt buộc còn lại trong [ROADMAP](../ROADMAP.md).
