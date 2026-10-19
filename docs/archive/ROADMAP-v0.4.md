# Lộ trình Full Offline RPG — sau audit v0.4.0

Yêu cầu hiện hành giữ đầy đủ tại [FULL_OFFLINE_RPG](FULL_OFFLINE_RPG.md). Không bỏ scope của các phase sau. [Audit source và thay đổi](IMPLEMENTATION_STATUS.md) phân biệt implementation, test và art/performance còn thiếu.

| Phase | Đã có | Công việc tiếp theo / điều kiện nghiệm thu |
|---|---|---|
| 1 — Core experience | Entry tạo/chọn,5slot/Unicode, actorpreview, groundloot/pickup/auto, EXP, save migration, steering fixedtick, camera follow/nội suy | Production actor/ngoại hình/preview đúngnamnữ, customjoysticklayout, tutorial nhận/nhặt/equip/shop/enhance, realdevice input/camera và save soak; chưa tuyên bố hoàn tất phase |
| 2 — Openworld |4map liênkết,128×128highlands,chunk8×8 terrain/props/culling/LRU,A* | Navchunks/simulationregions/spawnzones trước khi mở rộng256–1024tiles. Đích40+map có nội dung:6hub,10sect,16farm,6dungeon,2bosszones. Benchmarks và resource/quest/NPC/POI mỗi map, không map rỗng |
| 3 — Items |11items,3slots,4rarity,tooltip/equip/compare/lock/sort |6rarity, đủslots, itemlevel/affixgenerator/set,300–500items có cách nhận/sử dụng và icon,loot tables/phẩmchất cân bằng |
| 4 — Economy |7nghề/7recipes,gather,kho,gems,enhance+10,shop |+15/protection preview và authoritativeRNG,VFXlò rèn/lịch sử,refinement/set/gem upgrades,quantity/stock/buyback/shop art/kho mở rộng; transaction/persistence tests |
| 5 — Combat/art |10phái/20nhánh/141skill primitives,5hệ/AI6loại,boss1phase mechanics,VFXpool/audio mixer |8hướng productionactors/monsters, artVFX/SFX từngnhóm,100–120monsterdefs/20bosses cómechanics riêng và provenance art; balance/playtest |
| 6 — RPG content |15quests/5NPC,7objectivekinds |100+quests/story/tutorial/sect/daily,6+dungeons thật cóentry/waves/boss/rewards/save,companions/worldactivities và progression100cấp có cân bằng |
| 7 — Polish |PWA precache/import/export/backup/migrations và automated regression |Android/iOS thật, Safari,orientation/caches/quota/update fault injection,memoryGPU/FPS/render soak,art/audio review,full hànhtrình master PC/mobile |
| Online sau offline |Node core/20Hz/GameSession/commands/seed/actorownership |RemoteGameSession/authoritative adapter/auth/instances/interest/reconnect; offline save không được server tin tưởng |

Thứ tự kế tiếp: ổn định tutorial farm/nhặt/equip và regression; benchmark navigation/simulation streaming rồi làm một vùng farm lớn có spawnzones, NPC/quest và đủ hoạt động trước khi nhân ra nhiều vùng. Sau đó itemization và lò rèn/cửa hàng theo dependency. Backlog chi tiết cũ bên dưới được giữ làm tham khảo; số liệu cũ không thay audit hiện tại.

---

> Baseline v0.2. Thay đổi v0.3 và trạng thái hiện tại: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [rendering](architecture/rendering.md), [world streaming](architecture/world-streaming.md), [full-release](roadmap/full-release.md).

# Lộ trình tới Full Offline RPG v1.0

Toàn bộ [MASTER_GAME_DESIGN.md](MASTER_GAME_DESIGN.md) là scope được giữ nguyên. Bảng dưới gắn các phần của master vào công việc còn lại; không thay các yêu cầu chi tiết trong bản nguồn. Bản 0.2 hiện mở nền combat/animation và vài hệ thống phụ thuộc sớm, chưa hoàn tất các milestone lớn.

| Đợt | Phạm vi bắt buộc | Trạng thái / công việc tiếp |
|---|---|---|
| 0.2 — graphics/combat (§6,7,17,20) | 8 hướng/trạng thái, projectile/status, telegraph, AI, VFX/audio | Nền hoạt động; cần production art, knockback/animation lock, range/target feedback polish, SFX/ambient/footsteps và audio channels/voice limits |
| 0.3 — nhân vật/phái (§5,16) | 10 phái/20 nhánh/140+ skill, thuộc tính, cấp100, nhập môn, unlock, presets | Có definitions + rules + UI; thiếu sư phụ/nhập môn mỗi phái, skill respec/presets, progression đến100 và balance đa kịch bản |
| 0.4 — trang bị/kinh tế (§8–10) | 500 items, đủ slots/rarity, affix/set/element, enhancement/gems/craft/bank/NPC market | Có 11 items/3 slots, 7 nghề/7 recipes, nâng/ngọc/kho; thiếu affix/item generator/set/phụ kiện/6 rarity, repair nếu bật, NPC stock/price/demand, sink/source balance |
| 0.5 — thế giới (§4,7,17) | 5 hub,10 khu phái,20 luyện cấp,10 dungeon,5 boss zone, world sim | Hiện 3 map; thêm tuyến cấp8–20 trước, biome khác, NPC schedules, dynamic encounters/regional events, navigation/world links, 100 monsters/20bosses với hành vi riêng |
| 0.6 — truyện/quest (§11,18,19) | 150 quest, chính/phụ/phái/nghề/daily/dungeon/boss/event, branching dialogue | Có 8 quest/7 primitive objectives; thiếu multi-objective/deliver/protect/branching/multiple unique rewards, các chuỗi unlock; quest tracking không hardcode |
| 0.7 — dungeon/đồng hành (§12,15) |10 instances có entry/waves/mechanics/checkpoint/reset/rewards/difficulty; NPC party | Chưa triển khai; instance IDs trước, companion tank/damage/support/heal recruit/dismiss/follow/attack/defend/hold/skill/progression/formation/assist và UI party |
| 0.8 — offline nâng cao (§13,14,16) | Bang hội NPC, duel/arena/tournament/team/ranking, siege | Chưa triển khai guild name/emblem/roles/recruit/resources/quests/upgrades/rivals; siege phe/cổng/objective/respawn/result/reward giới hạn AI; auto priority/filters/safe return/revive, favorites/presets/hotkey remap |
| 0.9 — hoàn thiện (§17–22,24,26) | Đủ content, polish art/audio/PC/mobile, devtools, balance, perf/migration/soak | Validator + atlas inspector + combat baseline có; còn map/entity inspector, tick profiler/asset monitor, loot/economy tools, device QA, soak render dài, Safari/PWA update + quota tests |
| 1.0 — nghiệm thu (§25–28) | Full offline với toàn bộ hệ thống, nội dung, A–H acceptance, tài liệu và báo cáo | Chưa đạt; không đổi số phiên bản để thay bằng chứng |
| Online sau offline (§3,23) | Authoritative server/RemoteGameSession/Colyseus/account/sync/ownership/interest/reconnect/security/party/guild/chat/PvP/cross-map | Core Node và nhiều actor đã có proof; chưa vận hành server. Kế hoạch [ONLINE_MIGRATION.md](ONLINE_MIGRATION.md) |

## Các hành trình nghiệm thu còn mở

A nhân vật mới và B môn phái có browser smoke ở phạm vi khởi đầu; chưa bao phủ toàn bộ truyện hoặc progression dài hạn. C dungeon và E đồng hành chưa có. D kinh tế mới kiểm tra craft/enhance/socket/kho/shop, chưa NPC market/affix/repair. F offline và G mobile có Chromium viewport smoke; cần thiết bị thật và Safari. H có soak simulation 4 giờ; cần render/input nhiều giờ và đo memory/device.

Điểm tiếp theo có giá trị cao: hoàn thiện art/animation và tuyến cấp8–20 gắn sư phụ/quest nhập môn từng phái, cùng các phép đo cân bằng; tiếp đó mở itemization/NPC market và instance dungeon đầu tiên. Không coi phần sau là ngoài phạm vi.
