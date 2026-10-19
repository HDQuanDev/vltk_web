# CODEX MASTER CONTINUATION PROMPT
# KIẾM HIỆP WEB — TỪ v0.4.0 ĐẾN FULL OFFLINE RPG v1.0
## OPEN WORLD EXPANSION • FARMING • CONTENT PRODUCTION • ART • ECONOMY • FULL RPG

## 1. NHIỆM VỤ

Tiếp tục trực tiếp trên repository Kiếm Hiệp Web hiện tại.

Phiên bản báo cáo mới nhất: v0.4.0.

Đây là dự án game nhập vai võ hiệp 2D Isometric chạy trực tiếp trên Web, hỗ trợ PC và mobile, hoạt động offline và có kiến trúc mở rộng thành MMORPG Online.

**Mục tiêu không phải làm tiếp một vertical slice nhỏ. Mục tiêu là tiếp tục hiện thực hóa TOÀN BỘ Full Offline RPG đã được định nghĩa trong tài liệu yêu cầu.**

Đọc toàn bộ các tài liệu đang tồn tại:

- FULL_OFFLINE_RPG.md
- IMPLEMENTATION_STATUS.md
- MASTER_GAME_DESIGN.md
- ROADMAP.md hoặc các tài liệu roadmap tương đương
- Các tài liệu kiến trúc rendering, world streaming, combat, economy, art và online migration.

File `FULL_OFFLINE_RPG.md` là phạm vi yêu cầu sản phẩm chính. Không tự thay thế hoặc rút ngắn yêu cầu bằng prompt hiện tại.

Các chỉ tiêu số lượng trong tài liệu phải được giữ nguyên trừ khi có mâu thuẫn kỹ thuật được chứng minh và báo cáo rõ.

Không tạo project mới.

Không viết lại kiến trúc đã hoạt động.

Không tái triển khai tính năng đã hoàn thành nếu không có lỗi.

Không coi số lượng test lớn là bằng chứng game đã hoàn chỉnh.

---

# 2. HIỆN TRẠNG ĐÃ BIẾT

Theo báo cáo v0.4.0:

- 4 playable maps.
- 6 monster definitions, bao gồm 1 boss.
- 11 item definitions.
- 141 skill definitions/primitives.
- 5 NPC.
- 15 quests.
- 0 dungeon.
- 10 môn phái.
- 20 nhánh võ công.
- 7 nghề nghiệp.
- 7 crafting recipes.
- 11 resource nodes.
- 0 production-ready art.
- 251 unit/integration tests PASS theo báo cáo.
- 41 Chromium E2E tests PASS theo báo cáo.

Các chức năng đã được triển khai gồm:

- First-launch character creation.
- Character selection.
- Unicode character names.
- 5 character slots.
- Gender choice cơ bản.
- Character save/load.
- Ground loot.
- Loot pickup.
- Auto pickup.
- Monster farming và EXP.
- Fixed-tick movement.
- Smooth steering cơ bản.
- Camera interpolation.
- Chunk terrain renderer.
- Inventory/equipment cơ bản.
- Crafting cơ bản.
- Enhancement +10.
- Gem/socket cơ bản.
- Shop cơ bản.
- Warehouse cơ bản.
- Audio mixer.
- Combat VFX renderer.

Đây là baseline tham khảo, không phải bằng chứng thay cho kiểm tra code.

Trước khi sửa, xác minh lại tình trạng hiện tại.

Không làm lại character creation, ground loot hoặc steering nếu chúng đã hoạt động chính xác.

---

# 3. MỤC TIÊU CHẤT LƯỢNG

Tôi muốn game có trải nghiệm giống thể loại MMORPG võ hiệp cổ điển thực sự.

Game phải tạo được những cảm giác sau:

1. Đi lại trong một thế giới rộng lớn.
2. Khám phá nhiều vùng địa hình khác nhau.
3. Bãi quái đông, phân bố hợp lý và có thể luyện cấp liên tục.
4. Nhân vật di chuyển và chiến đấu mượt.
5. Mỗi quái có cách đánh, độ khó và vật phẩm rơi phù hợp.
6. Đánh quái có khả năng rơi trang bị quý khiến người chơi muốn săn tiếp.
7. Nhân vật càng luyện cấp càng mạnh và mở khóa thêm nội dung.
8. Có thành thị đông NPC, cửa hàng, thợ rèn, kho, thương nhân.
9. Cường hóa đồ phải có cảm giác hồi hộp, hiệu ứng đẹp và kết quả có ý nghĩa.
10. Bản đồ, nhân vật, kỹ năng, vật phẩm và UI phải có art direction đồng nhất.
11. Người chơi có thể chơi lâu dài, không hết nội dung sau vài phút.
12. Game phải hoạt động tốt trên cả PC và mobile.

Không chỉ thêm dữ liệu. Phải tạo ra trải nghiệm có thể cảm nhận khi chơi thực tế.

---

# 4. ƯU TIÊN CAO NHẤT: WORLD STREAMING HOÀN CHỈNH

Hệ thống hiện tại đã có chunk rendering nhưng navigation và entity simulation vẫn chưa được streaming đầy đủ.

Đây là trở ngại lớn trước khi mở rộng bản đồ.

## 4.1. Navigation Chunks

Triển khai navigation theo vùng/chunk.

Có:

- Navigation chunk index.
- Walkability data.
- Cross-chunk navigation.
- Hierarchical pathfinding khi cần.
- Pathfinding cache có invalidation đúng.
- Obstacle changes.
- Path query budget.
- Async hoặc incremental path requests khi phù hợp.
- Cancellation của path cũ.
- Fallback khi không tìm được đường.

Không tạo toàn bộ A* search trên bản đồ 1024×1024 mỗi lần người chơi click.

Không khiến nhân vật bị đứng hoặc giật khi tìm đường xa.

## 4.2. Simulation Regions

Phân chia entity simulation theo vùng.

Quy định rõ:

- Active region.
- Nearby region.
- Inactive region.
- Spawn management.
- AI update scheduling.
- Respawn progression.
- Resource lifetime.
- Ground loot lifetime.
- Quest-related entities.

Không cập nhật AI đầy đủ cho toàn bộ quái trên mọi bản đồ.

Tuy nhiên, khi quay lại khu vực, trạng thái phải tuân thủ game rules.

Không được reset quái, loot, boss hoặc quest entities sai cách.

## 4.3. Map Streaming

Hỗ trợ:

- Map chunk loading.
- Chunk unloading.
- Texture reference counting hoặc resource lifecycle tương đương.
- Viewport culling.
- Prop culling.
- Object pooling khi hợp lý.
- Chunk prefetch.
- Map transition.
- World navigation.
- Spawn region activation.
- Memory budget diagnostics.

Không làm memory tăng liên tục khi đi qua nhiều khu vực.

## 4.4. Large Map Validation

Sau khi kiến trúc streaming hoạt động, xây dựng ít nhất một khu luyện cấp thực sự rộng.

Mục tiêu năng lực: từ 256×256 đến 512×512 logical tiles, tùy tỷ lệ tile và benchmark.

Bản đồ thử nghiệm không được là hàng vạn tile trống.

Phải có:

- Nhiều bãi quái.
- Đường chính.
- Đường phụ.
- Cây cối.
- Sông hoặc địa hình tự nhiên.
- Chướng ngại.
- Điểm khám phá.
- NPC.
- Nhiệm vụ.
- Resource nodes.
- Elite monsters.
- Boss hoặc khu mini-boss.
- Liên kết sang bản đồ khác.

Phải đo được chi phí render, simulation, pathfinding và memory.

---

# 5. MỞ RỘNG THẾ GIỚI LÊN 40+ BẢN ĐỒ

Sau khi hạ tầng hỗ trợ large maps đạt kiểm thử, mở rộng nội dung có hệ thống.

Mục tiêu:

- 6 thành thị, làng hoặc trung tâm.
- 10 bản đồ môn phái.
- 16 bãi luyện cấp.
- 6 dungeon.
- 2 boss zones đặc biệt.

Tổng ít nhất 40 map, sau đó tiếp tục mở rộng theo full roadmap.

## 5.1. Không tạo map rác

Mỗi map phải có:

- Map identity.
- Biome.
- Level range.
- Gameplay purpose.
- Unique landmarks.
- NPC.
- Monster spawn zones.
- Loot opportunities.
- Resources nếu phù hợp.
- Quests.
- Map connections.
- Collision/navigation.
- Minimap.
- Environment audio.
- Visual assets.

Không tạo hàng chục map chỉ khác texture hoặc tên.

## 5.2. Kết nối thế giới

Thiết kế tuyến khám phá hợp lý:

Tân Thủ Thôn
→ Vùng luyện cấp thấp
→ Thành thị đầu tiên
→ Các bãi quái cấp cao hơn
→ Môn phái
→ Rừng/núi
→ Hang động
→ Khu boss
→ Thành thị mới
→ Các vùng luyện cấp tiếp theo.

Có world map thể hiện:

- Tên vùng.
- Cấp độ khuyến nghị.
- Kết nối.
- Vị trí người chơi.
- Map đã khám phá.
- NPC quan trọng.
- Khu quái.
- Boss.
- Teleport.

Không tự động mở khóa toàn bộ mọi bản đồ nếu game design yêu cầu khám phá.

## 5.3. Khu vực phải có chiều sâu

Mỗi thành thị cần các dịch vụ:

- Weapon merchant.
- Armor merchant.
- Potion merchant.
- Blacksmith.
- Warehouse.
- Crafting.
- Quest NPC.
- Transport NPC.
- Special merchant.

Các làng hoặc khu vực nhỏ có thể ít dịch vụ hơn nhưng phải có mục đích.

Các bản đồ luyện cấp cần quái và loot phù hợp progression.

---

# 6. HOÀN THIỆN HỆ THỐNG MONSTER SPAWN VÀ FARM

Hiện tại chỉ có 6 monster definitions.

Mục tiêu tăng lên 100–120 loại quái thực sự đa dạng.

## 6.1. Monster Catalog

Tạo quái có:

- Unique ID.
- Tên.
- Sprite reference.
- Level.
- Element.
- Combat stats.
- AI archetype.
- Skills.
- Aggro radius.
- Leash radius.
- Patrol behavior.
- Loot table.
- EXP.
- Spawn conditions.
- Respawn delay.

Không lấy cùng quái đổi màu rồi tính là monster mới hoàn toàn.

## 6.2. Spawn Zones

Xây dựng hệ thống định nghĩa:

- Zone ID.
- Map ID.
- Zone polygon hoặc area.
- Monster pool.
- Min/max population.
- Spawn density.
- Respawn interval.
- Level distribution.
- Elite chance.
- Safe spawn validation.
- Activation radius.
- Maximum simultaneous entities.

Các bãi quái phải đủ đông để farm, nhưng không gây quá tải thiết bị.

Spawn controller phải hoạt động qua simulation, không phụ thuộc renderer FPS.

## 6.3. Spawn Logic

Không spawn:

- Trong tường.
- Trong nhà.
- Trên portal.
- Trên NPC.
- Trong vùng an toàn không cho phép.
- Ngay trên nhân vật.
- Ngoài vùng được cấu hình.

Khi quái chết:

- Sinh ground loot theo loot table.
- Trao EXP đúng quy tắc.
- Ghi nhận nhiệm vụ.
- Lên lịch respawn.
- Cập nhật spawn population.

## 6.4. Farm Loop

Hoàn thiện:

- Auto target.
- Auto attack.
- Auto skill.
- Auto loot.
- Loot rarity filters.
- Potion threshold.
- Farm radius.
- Farm anchor.
- Target priority.
- Leash avoidance.
- Stuck detection.
- Safe stop.

Không cho auto farm gian lận bằng cách cộng EXP hoặc tạo item trực tiếp.

## 6.5. Ground Loot Scalability

Hiện tại có giới hạn 512 ground loot entities.

Kiểm tra giới hạn này khi có nhiều spawn zones.

Không âm thầm từ chối drop hiếm khi vượt giới hạn.

Thiết kế giải pháp có kiểm soát như:

- Per-region ground loot pools.
- Cleanup theo chính sách công khai.
- Entity activation.
- Storage/serialization cho khu không hoạt động.
- Drop admission rules có thể kiểm thử.
- Metrics về drop bị từ chối hoặc đã hết hạn.

Không được làm mất vật phẩm do streaming sai hoặc bị nhân đôi khi load lại.

---

# 7. ITEMIZATION — TỪ 11 ITEMS LÊN 300–500+

Thiết kế hệ thống đồ phong phú để tạo động lực săn đồ.

## 7.1. Các nhóm item

- Sword.
- Saber.
- Spear.
- Staff.
- Hidden weapons.
- Armor.
- Helmet.
- Boots.
- Belt.
- Necklace.
- Ring.
- Bracelet.
- Talisman.
- Potion.
- Enhancement stones.
- Gems.
- Crafting materials.
- Quest materials.
- Rare treasures.
- Set equipment.

## 7.2. Trang bị ngẫu nhiên

Bổ sung:

- Item level.
- Affix pools.
- Random affix generation.
- Elemental properties.
- Stat ranges.
- Item rarity.
- Equipment requirements.
- Set bonuses.
- Enhancement compatibility.
- Gem sockets.

Trang bị có cùng tên có thể có thuộc tính khác nhau.

Mọi item instance phải có ID duy nhất.

## 7.3. Sáu cấp phẩm chất

- Common.
- Uncommon.
- Rare.
- Epic.
- Legendary.
- Mythic.

Hiển thị màu, border, glow, loot beam và âm thanh phù hợp.

Đồ hiếm phải có giá trị gameplay, không chỉ khác màu.

## 7.4. Đồ rơi từ quái

Phân bố loot theo:

- Level.
- Monster type.
- Monster rank.
- Map.
- Boss.
- Rarity.
- Loot table weights.

Quái cấp thấp không được thường xuyên rơi đồ cấp cao vô lý.

Đồ boss có thể sở hữu affix hoặc set đặc biệt.

## 7.5. Asset vật phẩm

Mỗi nhóm vật phẩm phải có icon đẹp, thống nhất.

Không dùng cùng một SVG hoặc biểu tượng đơn giản cho toàn bộ item.

Nếu chưa có asset, xây dựng art manifest và pipeline tạo icon, không đánh dấu production-ready.

---

# 8. THIẾT KẾ LẠI HÀNH TRANG VÀ TRANG BỊ

UI hiện tại cần nâng cấp lên chất lượng MMORPG.

Yêu cầu:

- Inventory grid trang trí phù hợp võ hiệp.
- Full equipment slot layout.
- Character paper doll.
- Rarity borders.
- Item glow.
- Item comparison.
- Detailed tooltips.
- Item locks.
- Sort/filter.
- Stack splitting.
- Quick equip.
- Equipment set indicators.
- Enhancement indicators.
- Gem socket indicators.
- Item source information nếu có.

Mobile phải có giao diện tối ưu riêng.

Không thu nhỏ panel PC và khiến chữ khó đọc.

---

# 9. HOÀN THIỆN CỬA HÀNG

Hiện tại shop còn đơn giản.

Triển khai hệ thống NPC Merchant hoàn chỉnh.

## 9.1. Shop UI

Có:

- NPC portrait.
- Shop name.
- Shop categories.
- Item icons.
- Item rarity.
- Item prices.
- Current gold.
- Item details.
- Item comparison.
- Purchase quantity.
- Buy.
- Sell.
- Buyback.
- Stock.
- Filters.
- Confirmation khi cần.

UI phải mang phong cách RPG võ hiệp, không giống một bảng dữ liệu website.

## 9.2. Merchant Economy

Các cửa hàng có:

- Catalog riêng.
- Stock.
- Restock rules.
- Buy/sell prices.
- Limited items.
- Special offers nếu phù hợp.
- Price configuration.

Có transaction validation.

Không double-spend.

Không duplication exploit.

Không bán vật phẩm bị khóa trái quy tắc.

## 9.3. NPC Marketplace

Thêm chợ NPC mô phỏng bằng AI.

Có:

- Listings.
- Price bands.
- Limited quantity.
- Refresh rules.
- Item categories.
- NPC demand.

Không giả vờ các listing thuộc người chơi online.

---

# 10. ĐẬP ĐỒ / CƯỜNG HÓA CHẤT LƯỢNG CAO

Nâng từ +10 lên +15.

Đồng thời hoàn thiện toàn bộ trải nghiệm cường hóa.

## 10.1. Enhancement Rules

Có:

- Success rate.
- Currency cost.
- Material cost.
- Failure consequence.
- Downgrade rules.
- Protection materials.
- Stat increase preview.
- Item restrictions.
- Maximum enhancement level.
- Enhancement history.

Tất cả phải dùng authoritative simulation và seeded RNG.

UI không được tự quyết định thành công.

## 10.2. Blacksmith UI

Thiết kế cửa sổ lò rèn đẹp.

Có:

- Lò rèn ở trung tâm.
- Item slot.
- Material slots.
- Current enhancement level.
- Target level.
- Before/after stats.
- Success rate.
- Protection selector.
- Gold required.
- Enhancement button.
- Recent results.

## 10.3. Enhancement VFX

Quy trình:

1. Người chơi chọn trang bị.
2. Vật liệu được hiển thị quanh lò rèn.
3. Bấm cường hóa.
4. Lò rèn bắt đầu sáng.
5. Các hạt năng lượng chuyển động.
6. Âm thanh kim loại vang lên.
7. Ánh sáng đạt đỉnh.
8. Hiển thị kết quả từ simulation.

Thành công:

- Golden burst.
- Sparks.
- Equipment glow.
- Success sound.
- New upgrade level.
- Updated stats.

Thất bại:

- Light collapse.
- Smoke.
- Failure sound.
- Actual penalty.
- Clear notification.

Cần có chế độ rút ngắn/bỏ qua animation sau nhiều lần nâng cấp.

Animation không được làm gameplay state bị mất hoặc sai nếu người dùng thoát cửa sổ giữa chừng.

## 10.4. Các hệ thống liên quan

Hoàn thiện:

- Gem upgrades.
- Gem socketing.
- Gem removal.
- Equipment refinement.
- Affix reroll.
- Affix protection.
- Set bonuses.
- Equipment aura.

Có save/load và transaction tests.

---

# 11. CRAFTING VÀ NGHỀ NGHIỆP

Hiện có 7 nghề nhưng chỉ 7 công thức.

Mở rộng công thức thực sự sử dụng được.

Có:

- Crafting recipe progression.
- Profession levels.
- Gathering resource tiers.
- Crafting materials.
- Crafted equipment.
- Potions.
- Rare recipes.
- Crafting preview.
- Crafting quantity.
- Crafting result animation.
- Crafting SFX.
- Recipe unlocks.

Mỗi nghề phải tạo ra sản phẩm có vai trò trong progression.

Không tạo nghề nghiệp chỉ để hiển thị trên giao diện.

---

# 12. NPC, SƯ PHỤ VÀ NHIỆM VỤ

Hiện tại có 5 NPC và 15 quests.

Mở rộng thành thế giới có hoạt động thực sự.

## 12.1. NPC

Thêm:

- Sect masters.
- Skill trainers.
- Blacksmiths.
- Weapon merchants.
- Armor merchants.
- Potion merchants.
- Warehouse keepers.
- Teleport NPCs.
- Quest givers.
- Crafting masters.
- Guards.
- Villagers.
- Traveling merchants.
- Dungeon guides.
- Boss hunters.

## 12.2. Quest Content

Hướng đến 100+ quests.

Có:

- Main story.
- Side quests.
- Sect quests.
- Farming quests.
- Elite quests.
- Boss quests.
- Exploration.
- Gathering.
- Crafting.
- Dungeon quests.
- Repeatable quests.

Mỗi quest phải có nội dung, mục tiêu và phần thưởng hợp lý.

## 12.3. Tutorial

Hoàn thiện tuyến tutorial:

Tạo nhân vật
→ Gặp trưởng thôn
→ Nhận nhiệm vụ
→ Di chuyển
→ Đánh quái
→ Nhặt đồ
→ Trang bị
→ Mua thuốc
→ Học kỹ năng
→ Gặp thợ rèn
→ Cường hóa
→ Đến bãi luyện cấp mới
→ Gia nhập môn phái.

Không dùng debug commands để vượt qua các bước này.

---

# 13. ART, ANIMATION VÀ ÂM THANH

Đây là thiếu hụt lớn của dự án.

Hiện chưa có production-ready art theo báo cáo.

Không chấp nhận giữ toàn bộ art thủ tục rồi tuyên bố sản phẩm hoàn chỉnh.

## 13.1. Production Art Pipeline

Phải thiết kế:

- Art bible.
- Character sprite specification.
- Monster sprite specification.
- Environment tileset specification.
- UI asset specification.
- Item icon specification.
- Skill VFX specification.
- Animation manifest.
- Asset validation.
- License/provenance tracking.

Có thể sử dụng công cụ tạo hình ảnh, Blender hoặc pipeline dựng và render sprite để sản xuất asset hợp pháp.

Phải phân biệt concept art với asset có thể dùng trong game.

Nếu không có công cụ tạo asset thực sự, phải báo cáo rõ phần chưa thể hoàn thành; không tuyên bố code có thể thay thế sản xuất đồ họa.

## 13.2. Character Animation

Mục tiêu:

- 8 directions.
- Idle.
- Walk.
- Run.
- Attack.
- Cast.
- Hit.
- Death.
- Revive.

Ngoại hình nam/nữ phải khác biệt thực sự nếu có tùy chọn lựa chọn.

Thêm:

- Face variations.
- Hair variations.
- Hair colors.
- Costume variations.
- Weapon visuals.
- Equipment layers.

Không chỉ lưu gender rồi đổi tint cùng một sprite.

## 13.3. Monster Art

Monster types cần nhận diện khác nhau.

Có animation:

- Idle.
- Walk.
- Attack.
- Hit.
- Death.
- Skill cast nếu có.

Boss cần visual identity riêng.

## 13.4. Skill VFX

Không chỉ dùng chung một particle đổi màu.

Có:

- Slash.
- Projectile.
- Explosion.
- AoE.
- Fire.
- Ice.
- Poison.
- Lightning.
- Aura.
- Heal.
- Buff.
- Shield.
- Boss telegraph.

Mỗi nhóm có VFX và SFX phù hợp.

## 13.5. Audio

Hoàn thiện thư viện:

- Village music.
- City music.
- Forest music.
- Dungeon music.
- Boss music.
- Ambient sounds.
- Footsteps.
- Weapon strikes.
- Monster sounds.
- Skill casting.
- Item drops.
- Item pickup.
- Blacksmith effects.
- Enhancement success/failure.
- Shop transactions.
- Quest completion.

Không dùng âm tổng hợp đơn giản làm chất lượng cuối cùng nếu chưa đạt art/audio review.

Có audio mixer, fade, priority và voice limit.

---

# 14. DUNGEON VÀ BOSS

Hiện dungeon count = 0.

Triển khai dungeon instance architecture.

Có:

- Dungeon ID.
- Instance ID.
- Entry requirements.
- Spawn locations.
- Enemy waves.
- Objectives.
- Boss.
- Completion.
- Failure.
- Rewards.
- Exit.
- Checkpoints khi phù hợp.
- Reset rules.
- Save/load policy.

Mục tiêu ít nhất 6 dungeon có thể chơi đầy đủ.

Boss không được chỉ là monster có nhiều HP.

Các boss phải có:

- Attack patterns.
- Skill telegraphs.
- Phases.
- Special mechanics.
- Unique drops.
- Rewards.

Thiết kế architecture để sau này dungeon có thể chuyển thành multiplayer instances.

---

# 15. CÁC HỆ THỐNG RPG CÒN THIẾU

Giữ nguyên toàn bộ yêu cầu sau trong roadmap:

- Companions.
- Companion AI.
- Companion progression.
- Mounts.
- Mount animation.
- Guild NPC simulation.
- Arena against AI.
- Tournament.
- Siege simulation.
- Auto-farm advanced.
- World events.
- Achievements.
- Skill presets.
- Equipment presets.
- Hotkey customization.
- Inventory expansions.
- Economy balancing.
- Long-term progression to level 100+.

Không bỏ các tính năng này khi làm các phase sớm.

Cần triển khai theo dependencies và có nghiệm thu thực sự.

---

# 16. SAVE, OFFLINE VÀ ONLINE-READY

Bảo toàn:

- IndexedDB.
- Save migrations.
- Save archives.
- Import/export.
- Backups.
- Offline PWA.
- LocalGameSession.
- Shared game-core.
- 20Hz fixed simulation.
- GameCommands.
- GameEvents.
- Snapshots.
- Seeded RNG.

Bổ sung persistence cho:

- Large world state.
- Spawn zone state.
- Ground loot.
- Enhanced items.
- Affixes.
- Gems.
- Shop stock.
- Crafting progression.
- Dungeon progression.
- Companion state.
- Guild state khi được triển khai.

Sửa giới hạn import có thể vượt 5 character slots và hoàn thiện recovery từng slot nếu còn tồn tại.

Không cho save migration làm mất dữ liệu phiên bản cũ.

Hệ thống mới phải chạy được trong Node.js nếu thuộc shared gameplay core.

Khi chuyển online, server phải giữ authority.

Không chấp nhận save offline như dữ liệu server đáng tin cậy.

---

# 17. PERFORMANCE VÀ QA

## 17.1. Browser

Chạy:

- Typecheck.
- Lint.
- Build.
- Unit tests.
- Integration tests.
- Playwright E2E.
- Content validation.
- Asset validation.
- Save migration tests.

Không giảm chất lượng kiểm thử chỉ để tăng tốc phát triển.

## 17.2. Performance

Đo:

- Simulation tick duration.
- Render frame duration.
- Frame time distribution.
- AI update cost.
- Navigation cost.
- Entity counts.
- Active/inactive region counts.
- Loaded chunks.
- Texture memory.
- JS heap.
- Asset loads/unloads.
- Garbage collection pressure.

Không được tuyên bố đạt FPS mobile khi chỉ kiểm tra trên Chromium headless.

## 17.3. Gameplay Soak

Tạo các bài nghiệm thu:

A. Di chuyển liên tục qua nhiều chunks.

B. Chuyển bản đồ nhiều lần.

C. Farm quái ít nhất 30 phút bằng gameplay rules thật.

D. Nhặt nhiều loại vật phẩm.

E. Cường hóa trang bị.

F. Mua bán và crafting.

G. Save/reload giữa các khu vực.

H. Offline reload.

I. Kiểm tra memory sau chu kỳ load/unload.

J. Kiểm tra UI và touch trên mobile viewports.

K. Kiểm tra trên iOS/Android thật khi có thiết bị và môi trường hỗ trợ.

Không dùng test fixtures để tự cấp EXP, vàng và vật phẩm cho toàn bộ hành trình gameplay.

Fixtures có thể dùng trong unit tests biệt lập.

---

# 18. THỨ TỰ THỰC THI TỪ NGAY BÂY GIỜ

## WORK PACKAGE A — OPEN WORLD INFRASTRUCTURE

1. Audit streaming hiện có.
2. Hoàn thiện navigation chunks.
3. Hoàn thiện simulation regions.
4. Hoàn thiện spawn zones.
5. Hoàn thiện entity activation.
6. Benchmark map lớn.
7. Xây dựng một bãi farm lớn có nội dung đầy đủ.
8. Kiểm tra streaming, AI, camera, memory và save/load.

Không mở rộng hàng chục map trước khi hoàn thành khả năng vận hành map lớn.

## WORK PACKAGE B — CONTENT EXPANSION

1. Thiết kế world map.
2. Kết nối các vùng.
3. Tạo nhiều bãi quái.
4. Mở rộng monster catalog.
5. Tạo NPC.
6. Thêm quest.
7. Thêm boss.
8. Thêm resource gathering.
9. Triển khai thêm các map có nội dung theo các đích đã đặt ra.

Không dừng ở một bản đồ thử nghiệm khi hệ thống đã đủ điều kiện nhân rộng.

## WORK PACKAGE C — ITEMIZATION

1. 6 rarity.
2. Full equipment slots.
3. Item level.
4. Affix generator.
5. Set bonuses.
6. Monster loot tables.
7. Item icons.
8. Inventory redesign.
9. Equipment comparison.
10. Item balance tests.

## WORK PACKAGE D — ECONOMY

1. Shop UI redesign.
2. Buy/sell quantities.
3. Merchant stock.
4. Buyback.
5. Warehouse improvements.
6. Enhancement +15.
7. Protection materials.
8. Blacksmith VFX/SFX.
9. Refinement.
10. Gem upgrades.
11. Crafting expansion.
12. Economy tests.

## WORK PACKAGE E — PRODUCTION ART AND AUDIO

1. Art bible.
2. Character sprite pipeline.
3. Monster sprite pipeline.
4. World tilesets.
5. UI skins.
6. Skill VFX.
7. Audio library.
8. Animation QA.
9. Visual quality review.
10. Mobile render optimization.

Art không phải optional polish. Đây là phần bắt buộc của sản phẩm v1.0.

## WORK PACKAGE F — COMPLETE RPG

1. Main story.
2. Sect quest lines.
3. Skill progression.
4. Level 100 balance.
5. Dungeon instances.
6. Companions.
7. Mounts.
8. Arena.
9. NPC guilds.
10. Siege simulation.
11. World activities.
12. Late-game content.

## WORK PACKAGE G — FINAL RELEASE

1. Full content coverage.
2. Full gameplay journeys.
3. Mobile UI polish.
4. Save reliability.
5. PWA reliability.
6. Art/audio review.
7. Combat/economy balance.
8. Browser compatibility.
9. Real-device performance review.
10. Online-readiness regression.
11. Documentation.
12. Release candidate validation.

---

# 19. ĐỊNH NGHĨA HOÀN THÀNH

Một hệ thống chỉ được đánh dấu Done khi:

- Có implementation thật.
- Tích hợp vào gameplay.
- Có dữ liệu có ý nghĩa.
- Có tương tác.
- Có UI nếu cần.
- Có asset phù hợp nếu cần.
- Có âm thanh/hiệu ứng nếu gameplay yêu cầu.
- Có save/load.
- Có automated tests.
- Không phá các hệ thống khác.
- Hoạt động trên PC/mobile.
- Có tài liệu.
- Không còn blocker.

Phân biệt:

- Architecture Complete.
- Logic Complete.
- Content Complete.
- Art Complete.
- Integrated.
- Tested.
- Production Ready.

Không gộp các trạng thái này thành một chữ Done.

---

# 20. YÊU CẦU TRIỂN KHAI, KHÔNG CHỈ LẬP KẾ HOẠCH

Bắt đầu bằng audit code thực tế.

Sau đó triển khai trực tiếp Work Package A.

Khi A đạt nghiệm thu thì tiếp tục B và các package tiếp theo theo thứ tự phụ thuộc.

Không tự chuyển mục tiêu sang xây dựng thêm tài liệu nếu source còn thiếu gameplay.

Không tạo 40 map rỗng, 500 item JSON vô nghĩa hoặc 100 monster đổi màu chỉ để đạt số liệu.

Không xóa hoặc rút ngắn backlog.

Sau mỗi work package, cập nhật:

- IMPLEMENTATION_STATUS.md.
- Roadmap.
- Content report.
- Test results.
- Asset readiness.
- Performance measurements.
- Unfinished tasks.
- Next execution steps.

Nếu phiên làm việc bị giới hạn, phải giữ trạng thái project ổn định, báo cáo chính xác phần đã làm và phần chưa làm, để lần thực thi tiếp theo có thể tiếp tục mà không phải audit lại toàn bộ từ đầu.

Không tuyên bố v1.0 nếu vẫn còn hệ thống bắt buộc thiếu implementation, asset, content hoặc test.

## KẾT QUẢ CUỐI CÙNG TÔI MUỐN

Tôi muốn có thể:

Tạo nhân vật → Đặt tên → Chọn môn phái → Vào tân thủ thôn → Khám phá thế giới rộng lớn → Đi qua nhiều bản đồ → Đánh nhiều loại quái → Farm EXP → Nhặt vàng và trang bị rơi trực tiếp trên mặt đất → Săn đồ hiếm → Quay về thành → Mua bán → Gửi kho → Cường hóa trang bị với hiệu ứng hấp dẫn → Khảm ngọc → Chế tạo → Học võ công mới → Gia nhập môn phái → Hoàn thành nhiệm vụ → Khám phá hang động → Đánh boss → Nhận phần thưởng quý → Tiếp tục luyện cấp và phát triển nhân vật trong một thế giới võ hiệp có chiều sâu.

Tất cả phải thực sự chơi được.

**Hãy tiếp tục phát triển trực tiếp dự án v0.4.0. Không tạo project mới, không dừng ở prototype, không đánh dấu hoàn thành chỉ vì có mã nguồn hoặc test chạy qua.**