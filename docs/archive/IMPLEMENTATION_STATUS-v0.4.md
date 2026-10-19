# Audit Full Offline RPG — 19/10/2026

Nguồn yêu cầu hiện hành: [FULL_OFFLINE_RPG.md](FULL_OFFLINE_RPG.md). Kế thừa source hiện tại; không tạo project mới. Đây là audit đọc code thực tế trước triển khai, không phải chứng nhận nghiệm thu. Kết quả kiểm chứng mới nằm ở cuối tài liệu.

| Hệ thống | Bằng chứng trong source | Trạng thái trước đợt này / thiếu hụt |
|---|---|---|
| Lần đầu vào game | `App.tsx:init` gọi `createGame()` khi DB rỗng, tự load record đầu | **Sai yêu cầu**: bỏ qua tạo/chọn nhân vật |
| Tạo/chọn nhân vật | `Panels.tsx:characters`, `App.tsx:createCharacter/replaceSession` | Có UI trong modal, 10 phái/nam nữ; chưa có entry screen, tên Unicode chuẩn hóa/trùng tên, giới hạn slot. Không có mặt/tóc/trang phục tùy chỉnh |
| Xóa nhân vật | `SaveRepository.delete` xóa cả saves/backups/archives | Có xác nhận UI nhưng **không giữ backup khi xóa** |
| Save/load | Storage Zod + Dexie transaction, migrations v1/v0.2, archive nguồn, import/export | Hoạt động ở hệ thống hiện có; chưa có ground loot/playtime, cập nhật cache/PWA và lỗi quota cần kiểm tra sâu |
| Simulation/session | `GameWorld`, `CombatRuntime`, `LocalGameSession` | Node độc lập DOM, 20Hz, commands/seeded RNG/multi-actor. Chưa RemoteGameSession/server vận hành |
| Di chuyển | `findPath` heap A*, navigation blocked index, core step 20Hz | Có collision/đường chéo, giới hạn tìm; joystick gửi move mỗi140ms, chưa dead zone, đường hết gần đích có thể giữ path cũ |
| Renderer/camera | `WorldScene.update`, `CameraController` | Nội suy exponential, follow/dead zone/zoom; camera và actor chưa dùng cùng vị trí nội suy |
| Mobile/PWA | joystick120px, touch ground move tắt, modal full viewport, `useLandscapeMode` | Có hướng ngang và portrait guard; chưa xác nhận thiết bị thật/iOS, không bảo đảm native orientation lock mọi trình duyệt |
| Map/streaming | `ChunkWorldRenderer`, `world/chunks`, `highlands`, `navigation` | 4 map, terrain8×8/chunk + LRU/culling; navigation và simulation entities vẫn toàn map/active map, không gọi là streaming toàn bộ |
| Map content/portals | content maps4, vùng highlands128×128, core interact/populateMap | Có4 map liên kết/NPC/resource/quest; chưa40map, map lớn256–1024, 10khu phái, 6dungeon |
| Quái/AI | `ai/brain` idle/patrol/chase/ranged/poison/pack/return/boss phase | 6definitions (gồm1boss), spawn placements cố định; thiếu100–120loại, spawn zone population/activation radius và nhiều boss |
| Farm/EXP | world auto combat + core combat death/experience | Đánh/chết/EXP/level/respawn thật; auto chưa có loot/filter/anchor; chưa cân bằng hành trình100cấp |
| Loot | `world.die`: `owner.gold +=` và `addItem` trực tiếp | **Chưa có ground entities, pickup hoặc lưu đồ dưới đất** |
| Items/inventory |11definitions,3equipment slots,4rarity, `itemBonuses`, UI equip/compare/lock/sort | Tích hợp thật ở phạm vi nhỏ; chưa6rarity, affix/set/refinement,300–500items |
| Kinh tế | `EconomyTransactions`, world buy/sell; `WorkshopPanel/StoragePanel` | Craft7nghề/7recipes, gather/kho/gems/enhance có rules và UI; enhance tối đa+10, shop mua đơn, chưaquantity/stock/buyback, lò rèn VFX chưa đạt |
| Skills/ngũ hành |10phái/20nhánh/141skills, combat runtime/stats/formulas | Có rules khác biệt theo primitive; chưa sư phụ/quest/khu phái riêng, respec skill, art riêng toàn bộ chiêu |
| Quests/NPC |15quests,5NPC,7objective kinds, navigation NPC/portal/objective | Cóaccept/update/claim chống nhận lặp; thiếu100quest, tutorialloot/shop/enhance, multiobjective/branching dialogue/NPC schedules |
| Art/animation | atlas thủ tục8hướng×8states, SVG actor,5PNG environment, visual manifests | Đang là art phát triển. **0asset nghiệm thu production**; mặt/tóc/layer equipment/sprite sản xuất chưa có, không giả lập đã xong |
| VFX/audio | `CombatVFXRenderer` pooled effects; AudioManager buses/voice limit/track fade | Có hiệu ứng event-driven và âm tổng hợp; chưa thư viện art/nhạc cụ/âm thu, không tính damage trong VFX |
| Dungeon/hoạt động | Không có instance state/entry/waves/completion | **Chưa triển khai** dungeon/companion/mount/guildNPC/arena/siege |
| Tests/performance |240unit/integration và28E2E theo báo cáo cũ | Chưa chạy lại đợt này; E2E còn giả định tự vàoVôDanh và nhiều fixture nhập tài nguyên. Không coi số test cũ là bằng chứng mới, không khẳng định FPSmobile |

## Thứ tự thực hiện

1. Luồng đầu vào tạo/chọn nhân vật, tên Unicode và5slot, xóa có archive.
2. Ground loot authoritative: drop/pickup/ownership/expiry/capacity/save/migration; renderer PC/mobile và auto pickup.
3. Kiểm tra regression với hành trình UI không cấp tài nguyên qua debug; cập nhật báo cáo số liệu và roadmap.
4. Tiếp tục các phase2–7 trong master: map/content, itemization, kinh tế, combat/art, RPG content và polish. Các phần này vẫn thuộc phạm vi, không được coi là hoàn tất từ skeleton/definitions.

## Đã triển khai sau audit — v0.4.0

- **Entry flow thật:** IndexedDB được đọc trước. DB rỗng vào tạo nhân vật, DB có dữ liệu vào chọn nhân vật; Phaser/simulation chỉ khởi động sau khi chọn/tạo thành công. Không sinh nhân vật mặc định. Preview dùng cùng hàm vẽ frame8hướng của actor; vẫn là art phát triển.
- **Tên/slot:** chuẩn hóa Unicode NFKC, khoảng trắng và hoa/thường theo tiếng Việt để chống trùng; lỗi rõ ràng; transaction tạo mới giới hạn5slot cấu hình được. Tạo ID bằng cryptographic random bytes, dùng được cả HTTPIP LAN không có `randomUUID`. State/item instances độc lập. Xóa giữ snapshot trong archive, không xóa lịch sử migration.
- **Character selection:** tên, phái/cấp/ngũ hành, trang bị đang mặc, map và playtime; reload trở về lựa chọn thay vì tự vào game. Chưa tùy biến mặt/tóc/màu/trang phục hoặc chọn chưa nhập phái; ngoại hình nam/nữ hiện chỉ lưu lựa chọn và tint actor cũ, chưa có model riêng đạt art nghiệm thu.
- **Ground loot:** bạc/item được sinh ở vị trí quái chết, sở hữu theo actor, instance ID duy nhất, tồn tại10phút game. Không cộng thẳng vào túi. Icon theo loại, tên/màu rarity, rơi/nảy/glow/beam đồ hiếm, xếp lệch nhãn tránh trùng; click/chạm nhãn hoặc nút nhặt gần nhân vật. Command `pickup` tự tiếp cận, kiểm tra cùngmap/owner/tầm/LOS/expiry/capacity, không xóa loot khi túi đầy, không nhận trùng. Giới hạn512ground entities để giới hạn memory; nếu vượt ngưỡng thông báo rõ và không sinh thêm drop, cần tiếp tục cân bằng/streaming cho mật độ cao.
- **Auto pickup:** bật/tắt, lọc theo4rarity hiện có, luôn nhặt bạc, tầm theo vị trí bật tự chiến, dừng khi túi đầy/sinh lực thấp. Dùng cùng quy tắc pickup và inventory. Chưa có target priority/custom skill rotation/safe-return nâng cao.
- **Steering:** joystick gửi hướng `steer`80ms, simulation fixed20Hz tính vận tốc/collision/trượt dọc vật cản; dead zone18% hành trình cần, TTL6tick chống input kẹt. ClickPC vẫnA*, touch nền không di chuyển. `stop` xóa input; di chuyển tới vị trí rất gần không giữ path cũ. Camera theo vị trí actor đã nội suy, nội suy exponential độc lậpFPS. Space xử lý keydown để không mất nhấn ngắn giữa2frame.
- **Persistence:** schema vẫn2, content lên0.4.0; migration v0.1/v0.2/v0.3 giữ nguyên archive nguồn, thêm mặc định groundLoot/playtime/autopickup. Ground loot/expiry/owner/ID và playtime được lưu/load/validate. Không coi tạm dừng vì portrait là lựa chọn pause được lưu của nhân vật.

### Số liệu lấy trực tiếp từ content

`pnpm report:content`: **4maps /6monster definitions (gồm1boss) /11items /141skills /5NPC /15quests /0dungeon /10phái /20nhánh /7nghề /7recipes /11resource nodes**. 11 là sốresource nodes; sốNPC được đối chiếu trực tiếp từcontent là5.

Art production-ready: **0**. Validator xác nhận5PNG cònreview; actor atlas vẫn8hướng×8states×6frames thủ tục, SVG/NPC/UI và iconloot là art phát triển. Không có cơ sở đếm chính xác toàn bộ asset còn thiếu cho40maps/120monsters trước khi chốt art manifest tương ứng; không báo sốplaceholder cũ như thể đã đủ bộasset toàn sản phẩm.

### Chưa nghiệm thu Full Offline RPG

Phase1 đã có các luồng mới hoạt động qua code và automated browser; chưa đạt art/ngoại hình sâu/performance thiết bị thật để đánh dấu toànphase hoàn tất. Phase2–7 giữ nguyên trongmaster và roadmap. Không có40map rỗng,100quái đổi màu hoặc500JSONitem để tăng số liệu. Chưa có dungeon/companion/arena/guild/siege, affix/set/refinement, nâng+15/protection/VFXlò rèn đầy đủ, NPCstock/quantityshop, hoặc truyện100quest.

## Kiểm chứng sau triển khai

Typecheck/lint/build/content report/asset validator **PASS**. **251unit/integration (13files) +41E2E Chromium PASS**; storage được chạy lại15ca sau khi bổ sung lưu cảprimary/backup lúcxóa. Chi tiết, ảnh đã xem, ranhgiới fixture/journey và giới hạn tại [verification](roadmap/verification.md). Có2browserjourney tạo→đánh→drop→pickup→save/reload khônggrant (PC/mobile), cùng2journey khảo sát→thưởng→offline. SốE2E tăng một phần vì táchcase10phái thành10test độc lập, không phải9hệthống gameplay mới.

Các giới hạn save còn mở: tạo mới giới hạn5slot, import giữ hànhvi khôiphục cũ nên có thể vượt sốslot; catalog có record hỏng còn dùng màn hìnhkhôiphục chung thay vì recovery từngslot. Chưa giả lập quota/Safari/PWAupdate đang chơi. Không ghi đãđạt FPSmáythật hoặc productionart.

Layout chọn/tạo trênmobilelandscape đã được thu gọn sauvisualreview,4caentry/loot/orientation chạy lại đạt; cóassertion nútchính nằmtrongviewport màkhôngcầnscroll trang.
