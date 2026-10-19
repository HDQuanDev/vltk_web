# Trạng thái overhaul v0.3.0

Đợt này tiếp tục trực tiếp shared core/Phaser/React v0.2, ưu tiên nhóm Visual/UI → rendering/assets/audio → vùng lớn. Mục tiêu Full Offline RPG vẫn giữ nguyên trong [MASTER_OVERHAUL](MASTER_OVERHAUL.md) và [MASTER_GAME_DESIGN](MASTER_GAME_DESIGN.md). **Chưa nghiệm thu game hoàn chỉnh hoặc production art.**

| Hệ thống | Đã triển khai và kiểm chứng | Còn thiếu / trạng thái |
|---|---|---|
| Full viewport | Bỏ header/footer website; menu/settings/lưu là overlay; HP compact, quest collapse, minimap expand, save notice tự ẩn; 5 viewport | Chức năng mới đạt trong phạm vi layout; custom control layout/rebind/expand skill bar chưa đủ |
| Touch | 4 chiêu với vòng cooldown, joystick fixed/floating, giữ một pointer, pointercancel/lostcapture; test giữ joystick và bấm chiêu bằng hai touch IDs | Chưa xác nhận notch/Android/iOS thật; contextual interact/mount và rebind chưa hoàn chỉnh |
| Camera | Smooth follow có dead zone/tốc độ tối đa, wheel zoom, reset khi resize/map, reduced motion, clamp vào dải cảnh quan biên | Biên cảnh quan không đi được rộng18 ô được render để tránh void; không tuyên bố viewport luôn nằm trong vùng walkable |
| World streaming | Terrain8×8/chunk, props index theo chunk, cull/unload/LRU, quality resolution/cache budget; bỏ texture cả map cố định | Chưa streaming navigation data, Tiled TMJ importer hoặc tải asset pack theo từng map; chunk tạo đồng bộ, cần thêm profiling thiết bị |
| Vùng mới | Thanh Sơn Ngoại Vực128×128,8 địa danh,18 spawn placements,5 resource nodes,2NPC,7quest mới, đường chính/nhánh/cổng | Reuse6quái/1boss definitions; chưa50map hoặc nội dung cấp cao, dungeon/encounter/schedule đầy đủ |
| Art pipeline | 4prop +1material nền PNG ImageGen mới đã chuẩn hóa max512px, alpha/pivot/size manifest, asset browser/validator và source prompts; tích hợp trong game | Production-ready **0**;4props và1material cần review. Actor8hướng/8states vẫn procedural, NPC/UI/terrain còn art phát triển; chưa11states run/mounted hoặc armor/weapon layers sản xuất |
| VFX | Pool graphics/text giới hạn;5 hình ngũ hành khác nhau, impact/heal/level/status, projectileheads, reduced motion | Chưa toàn bộ141chiêu có VFX/audio riêng và external sprite VFX library; cần polish timing/visibility |
| Audio | Master/Music/Ambient/Combat/UI buses, mute/volume, unlock gesture, fade/crossfade≤2tracks, voice≤16, noise-buffer cache, variation/attenuation, pause/dispose;3lifecycle tests | Nhạc/SFX tổng hợp gốc; chưa thư viện nhạc cụ/voice thu âm, chưa listening QA/Safari/realdevice |
| RPG fixes | Quest navigation theo map graph/NPC/objective; vùng yêu cầu lọc progress; gán chiêu đổi chỗ tránh trùng; sửa race hội thoại gầnNPC; enhance chốngdoubletap10ticks và lưu cooldown | Itemization/refinement/set/NPCmarket/quantityshop và crafting UI đầy đủ vẫn Partial |
| Save/offline | Schema vẫn2; content0.2→0.3 vàv1→v2 giữ archive nguồn; fixturev0.2 thật có enhancement/gems/kho/nghề; browser import/reload/offline có test | Chưa migration phiên bản tương lai, cache eviction/quota fault injection hoặc PWAupdate đang chơi đầy đủ |
| Shared simulation | Node khôngDOM, heapA*/blocked index, samecommands/ticks/seed, quest progress trong core, ownership/replay giữ nguyên | Chưa authoritative online server/RemoteGameSession/Colyseus/auth/instances/interest management |

## Số liệu thực

10phái /20nhánh /141skill definitions; **4 map playable,6monster definitions,1boss definition,11items,15quests,0dungeon,7nghề/7recipes,11resource nodes**. Không đếm18spawn của vùng mới thành18loại quái; không coi giới hạn cấp100 là nội dung100cấp đã cân bằng.

Baseline226unit/integration và16browsercases được giữ. Đợt mới có11world/migration/asset/transaction tests,3audio lifecycle tests và11browsercases; tổng **240unit/integration +28browserE2E** được xác nhận ở [verification](roadmap/verification.md). Các bài fixture chỉ là kiểm tra quy tắc; hành trình mới nhận quest khảo sát/đi/claim/offline trên PC và mobile không grant tài nguyên.

`artifacts/streaming-browser.json`:24camera jumps trong dev inspector, max32cachedchunks/27activechunks/40textures/134objects, estimate36.56MiB terraincanvas; heap sauGC khoảng9.5MiB, không pageerror. Đây là headless render smoke; chưa chứng minh memoryGPU hoặc FPS điện thoại thật. Soak4giờ simulation cũ vẫn chạy lại, không phải4giờ render.

## Việc còn lại

Tất cả mục chưa đủ definition-of-done giữ **Partial** trong [full-release](roadmap/full-release.md). Chưa có dungeon/companion/mount/guildNPC/arena/siege/achievements, story dài hạn, affix/set/refinement hoặc NPCmarket. Các asset thiết yếu vẫn cần art production. Không có tác vụ tiếp tục ngầm sau khi phiên làm việc dừng.
