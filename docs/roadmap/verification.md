# Kiểm chứng v0.5.0 — 19/10/2026

Môi trường macOS Apple Silicon/Node22.22/pnpm10.34.5, Chromium headless/Playwright2workers. Chỉ viewport/touch emulation; chưa Android/iOS/Safari thật. Bằng chứng v0.4 giữ ở [archive](../archive/verification-v0.4.md).

| Kiểm tra            | Kết quả / giới hạn                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck           | PASS monorepo và shared-core Node ES2022 khôngDOM                                                                                                       |
| Lint                | PASS                                                                                                                                                    |
| Unit/integration    | 291/291,17files; thêm10case Thanh Vân Sơn (liên kết bản đồ, spawn/elite/boss, quái dùng kỹ năng, ô mũ/phụ kiện, phụ từ, rơi boss, chuỗi quest, gather, service tiền tiêu, nguồn item); giữ8case projection và8case cường hóa+15                          |
| Browser full suite  | 46/46,2workers, khoảng2phút; thêm2case đi cổng sang Thanh Vân Sơn (PC1366/mobile932) kiểm quái mới được publish, save và offline reload                            |
| Final cap hardening | Core suite/build và7browser cases entry/loot/streaming/recovery chạy lại sau sửa ưu tiên hiếm khi reserve đầy                                           |
| Build/PWA           | PASS;21precacheentries khoảng3.53MiB. Phaser1.2MB/app660KB raw còn cảnh báo bundle; annotation Zod warning, không che threshold                         |
| Content/assets      | 6maps/16monsterdefs(2boss)/45items/144skills/14NPC/28quests/26spawnzones/22resources/0dungeon.5PNG review-required,0production-ready                         |
| Core performance    | `pnpm profile:core` → streaming-core.json; actual128/256maps,12POI được query và5warmrounds; simulationtour fixture36visits,97entitymax,serialized~68KB. `pnpm profile:footprint` → world-footprint.json; world40map3159entity: tickp95≈2.9–3.2ms, authority9.4ms/2.13MB, view0.42ms/6KB |
| Render performance  | `pnpm profile:world` → streaming-browser.json;60visits/6mapchanges mỗi viewport1366/932,0pageerrors/0missingtextures,lifecyclebalanced                  |

## Bằng chứng hành trình và fixture

- `starterJourney` dùng create/commands thật: nhận/claim3quest, giết quái/boss, nhặt và trang bị đồ kiếm được, đi portal; không đặtlevel/tiền/HP/đồ trực tiếp.
- Farm mới tiếp tục từ nhân vật đó qua Thôn→Thanh Sơn→Vân Khê, gặpNPC/nhậnquest, đi bộ vào Trúc Lâm Tây, AUTO range12/rotation/pickup/potions, tự phân điểm kiếm được và dùng heal trảMP/cooldown. **36.000ticks=30phút game:375kills,cấp4→12,bạc1654→8926**,47entity;checkpoint31–34KB,save/load/replay ở giữa bãi. `artifacts/farm-30min.json` ghi timings/grantsfalse; không phải30phút browser hoặc balance100cấp.
- `tests/fixtures/v0.5-earned-farm.json` là checkpoint được tạo bởi hành trình trên. Hai browser tests import tệp qua UI, chọn waypoint, lưu, ngắt mạng/reload và kiểm inventory/quests/entities. Đây là acceptance load/render/offline, **không tính thành hai hành trình mới khôngimport**.
- Core simulationtour di chuyển fixture tức thời giữa camp để đo activation/caps/clone, ghi rõ không chứng minh progression.4h fixture cũ có thaystats/tài nguyên kiểmsoát; không gộp thành nongrant journey.
- Browser slot recovery cố ý làm hỏng riêng primary bằng IndexedDB fixture; UI vẫn chọn slot lành, phục hồi đúngbackup và giữarchive. Không sửa gameplaydata qua devAPI trong normaljourney.

## Số đo mới

`streaming-core.json`: cold-index highlands~9.25ms,riverlands~17.04ms; query xa riverlands tối đa~1.55ms/847visited, warm-cachep95~0.007ms. Tour36visits có tickp95max~0.19ms,clonep95max~0.30ms và97entity. Timing phụ thuộc máy/load/GC; không dùng ngưỡng thời gian nhỏ làm flakyassertion.

`world-footprint.json` (máy dev, Node22, `node --expose-gc`): 40map/3159entity tốn ~52.9MB heap (~1.35MB mỗi map256 đầy quái), tickp95~3.0–3.2ms, authority9.4ms/2.13MB so với view0.42ms/6KB. Số đo này dùng để quyết định A2 không chặn content; chưa đo trên thiết bị thật và chưa tính GPU/native buffer.

`streaming-browser.json`: PC max32cache/27active/40textures/166objects/36.56MiBterrainCPU; mobileviewport max26cache/17active/34textures/133objects/16.71MiB. Tối đa2chunktạo/frame, rendererupdatep95max5.0/4.9ms,peak8.1/9.0ms. `created-released=cached` qua mọi sample,0missingtextures. Heap sauGC PC10.91→10.96→10.92MB, mobile10.62→10.75→10.85MB; bài ngắn này chưa loại trừ growth lâu dài. Không bao gồm GPU/nativebuffers; inspector không phải fullgameactor/audio/camera soak. Không chứng nhận FPSmobile. Thanh Vân Sơn320×320 có3475prop/5891blocked/2355water/84bridge và đã chơi được trong browser test mới; chưa đo lại renderer budget riêng cho map320 ngoài2case E2E đó.

## Lỗi phát hiện/sửa

- Nav graph chỉ gộpchunk có thể nhầm hai phía sông; dùng connectedcomponents/gateway rồi fine search trongcomponent, chia cùngbudget.
- Rockvariant1/2 chưa có texture thủ tục gâyômissing; renderer dùngvariant0 hiện có vàinspectorassert0missing, không tính thànhbiến thểartmới.
- Import từngsave có thể vượt5slot; kiểm limit/name trongtransactionsave. Slot hỏng khiếncatalogđứt; listSlots/recoveryUI riêng, tênrecordhỏng không chặn save tốt.
- Notify loot hết4giây nhưng vẫn chiếm2slots selection; tách notification lifetime vàlọc hết hạn trước khi lấy2món. Testsnapshot20Hz không resetTTL/đồ mới vẫn hiện.
- Browser cũ chờnúttoast sau4giây trong khiđi menu/lưu/chụpảnh; đổi đúnghànhtrình nhặt ngay rồi dừngauto, giữassertEXP/drop/currency/save. Fixture migration vẫn0.2gốc, assertionđích đổi0.5.
- Publish20Hz clone cả world nên chi phí tăng theo số bản đồ đã thăm; chuyển sang view projection. Bản đầu của projection quét `state.entities` ba lần (scope/tổng/clone) làm chi phí tăng thêm; gộp còn một vòng quét. HUD loot trước đây đọc trực tiếp `groundLoot`/`deferredLoot` nên sau khi lọc sẽ mất nghĩa toàn world; đọc `worldTotals` và ghi rõ số entity gửi/dormant.
- Quái có `skillIds` nhưng không bao giờ dùng kỹ năng: monster sinh ra với `mp/maxMp = 0`. Sửa bằng cấp mana theo cấp quái, hồi nội lực khi quay về và cho brain thi triển kỹ năng bằng RNG authority.
- Zone boss Vân Đỉnh không spawn khi bãi lính cùng vùng tiêu hết ngân sách 4 spawn/tick; thêm bãi sát sơn môn và giữ boss ở cuối danh sách zone, đồng thời tăng số tick trong test để xác nhận boss thật sự xuất hiện.
- Cổng mới đặt ở toạ độ không nằm trên đường đi của checkpoint nên E2E phải đi bộ quá lâu; dời cổng Vân Khê → Thanh Vân Sơn về sát Trúc Lâm Tây (cách 6 bước) và thêm bãi quái ngay sơn môn để vào map là có quái đánh.

## Cổng còn mở

Productionart/audio, collision/bridgevisualpolish, realdeviceAndroid/iOS/Safari,installedPWA/nativeorientation/highDPI/notch,drawcalls/GPU/thermal,30phút render vànhiềugiờmemory,quota/eviction/updatefaults. View projection đã bỏ clone fullworld khỏi vòng publish20Hz và có assertion browser, nhưng dormant data/definitions/navindex vẫn resident; chưa có paging/eviction, delta publish, Worker/incrementalrequests hoặc512/1024certification. A có bằngchứng logic/integration/desktopheadless và số đo publish/footprint tới40map trên máy dev, chưa production/deviceacceptance;B–G giữ trong [ROADMAP](../ROADMAP.md).
