# World streaming v0.5

## Navigation

`game-core/world/navigation.ts`: chunk16×16, typed walkability grid, connected components bên trong chunk và gateway qua cạnh. Coarse heap A* chọn component route; fine A* nối từng gateway trong component để không nhầm hai bờ sông/vùng bị tường cắt. Route dài không bảo đảm ngắn nhất toàn cục; bảo đảm các bước hợp lệ, không cắt góc. Fine/coarse/fallback chia cùng `maxVisited` (default16384); AI dùng budget120–350. Hết budget/unreachable trả route rỗng; move dừng và báo lỗi, auto có failure stop. Move mới thay route, stop/steer xóa route cũ ngay; không có async queue để phát kết quả cũ trễ.

LRU64 routes/index, bản trả về được copy. `setNavigationObstacle` thay collision và invalidate index/routes; chỉnh mảng tại chỗ phải gọi `invalidateNavigation`, gồm cả chỉnh cùng chiều dài. Thay array/length/dimensions tự tạo index mới. Index tĩnh được giữ theo WeakMap, **chưa stream walkability từ disk hoặc Worker**. Đã đo cold-index256 khoảng17ms và query xa tối đa1.55ms trên máy dev; đồng bộ có budget phù hợp phép đo này, chưa chứng minh mobile. Bắt buộc đo thiết bị trước mở512/1024 và chuyển xây index/query sang Worker/incremental khi cần.

## Regions / spawn

Spatial bucket16 tái dựng ở tick boundary; AI target/pack query trong vùng, có margin một cell cho entity đã di chuyển trong tick. Active cách bất kỳ player cùngmap≤24ô, nearby≤48ô, xa hơn inactive. Active AI20Hz, nearby1Hz; nearby movement vẫn20Hz để giữ tốc độ. Status/cast/projectile/telegraph nguồn và entity đang giao chiến/return tiếp tục xử lý; distance không hủy damage. Corpse summon dọn kể cả ngoài vùng. Static spawn map cũ giữ ID/thứ tự, respawn trễ đến lần kích hoạt; zone mới dùng stable member ID `zone:map:zone:slot`.

Zone controller chạy20Hz, kiểm tra từngzone1Hz khi player trong activation radius, cấp tối đa4spawns/tick cho toàn world và capmonster sống/map. Circle/polygon, weighted pool/level, density clamp min/max, elite và respawn jitter dùng authority seeded RNG. Pool/level/elite được lấy mẫu khi tạo member lần đầu; slot giữ loại/cấp/elite khi hồi sinh, vị trí mới được kiểm tra lại. Đây là population có identity ổn định, chưa phải event reroll mỗi lần respawn. Tránh collision/nhà/NPC/portal/safe/player và chồng quái sống. Khi đầy/không tìm điểm sau24thử, giữ slot chờ; không spawn chui. Entity đã gặp giữ HP/phase/timer và identity; respawn chỉ khi deadline tới và zone được kích hoạt, không reset bằng reload. `spawnRegions.nextCheckAt/serial` và metadata entity được validate/lưu.

Quest state/NPC identity không thuộc render cache. Resource `availableAt`, clock/weather và loot expiry theo simulation tick, pause dừng tick. Loot ở vùng vắng vẫn hết hạn; resource không reset qua streaming.

## Loot pools

64active drops/region16,512active toànworld,2048reserve. Reserve chứa cùng GroundLoot/instance ID/deadline, không tự cộng túi và không nhân đôi. Dormant loot chuyển reserve mỗi20ticks khi còn chỗ; reserve gần đúng owner trong48ô promote tối đa16món/giây, ưu tiên phẩm chất. Đồ hiếm có thể chuyển common sang reserve; nếu reserve đầy thì thay common thấp hơn, ghi `commonReplaced` và thông báo công khai. Nếu không còn common có thể nhường chỗ và tất cả giới hạn đã đầy, từ chối có error/counter `rejected`; không tuyên bố bảo toàn vô hạn. `expired` đếm TTL cleanup cảhai pools. Thu hồi common theo chính sách này là gameplay rule, không do renderer unload.

## Render / bộ nhớ

Chunk8×8 texture/prop ownership theo scene. Queue ưu tiên viewport rồi prefetchmargin360, tối đa2tạo/frame và dừng sau4ms khi đã tạo mộtchunk; mộtchunk có thể vượt4ms. Camera đổi thì rebuild pending list, bỏ request cũ. Cache20/26/32 theoquality, tăng tới active count nếuviewport cần. Destroy objects rồi remove texture; basepack dùng chung tồn tại theo scene. Actor/loot views ngoài viewport được hủy, simulation data giữ nguyên. VFX pool dùng hệ thống cũ.

Diagnostics: active/cached/queued, created/released, propobjects/missingtextures, terrain CPUbytes; session có active/nearby/inactive/AI/tick/clone và loot counters. CPUcanvas không phải GPU allocation.

## View projection / dormant

`GameWorld.snapshot()` vẫn là authority đầy đủ (structuredClone) cho lưu trữ và kiểm thử. Vòng publish20Hz của `LocalGameSession` dùng `GameWorld.viewSnapshot()`: chỉ entity, loot, projectile, telegraph, resource và spawnregion thuộc bản đồ đang có player, kèm `worldTotals` (tổng entity/quái/loot/map) để HUD báo dung lượng pool. Dormant data, definitions và navindex vẫn resident trong authority và không bị view thay đổi; mọi kết quả gameplay vẫn do simulation quyết định. Đây là projection đầu tiên của bước1–3 trong [online migration](../ONLINE_MIGRATION.md), chưa phải interest management qua mạng.

Chi phí publish vì vậy không tăng theo số bản đồ đã thăm: ở world40map/3159entity, publish đầy đủ tốn9.4ms và2.13MB, còn view tốn0.42ms và6KB (`artifacts/world-footprint.json`, `pnpm profile:footprint`). Phần còn lại tăng theo tổng entity là một vòng quét dormant (khoảng0.24ms ở3159entity) để tính `worldTotals`. Chưa có paging/eviction cho dormant memory, delta publish hoặc Worker; phải đo và thiết kế trước khi mở512/1024.

Tái lập: `pnpm profile:core`, `pnpm profile:footprint`, `pnpm profile:world` (dev5173), tests streaming-regions/projection và E2E streaming. Chưa có Tiled importer, per-map production asset packs, streaming network hoặc server adapter. Không coi cấu trúc thư mục là online vận hành.
