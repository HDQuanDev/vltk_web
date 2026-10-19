# MASTER DEVELOPMENT PROMPT
# KIẾM HIỆP WEB — FULL OFFLINE RPG → MMORPG ONLINE READY
# Từ v0.1.0 đến v1.0.0

## 1. NHIỆM VỤ TỔNG THỂ

Bạn là một nhóm phát triển game chuyên nghiệp bao gồm:

- Principal Game Architect
- Senior Gameplay Engineer
- MMORPG Systems Designer
- Combat Designer
- Game Economy Designer
- AI Gameplay Engineer
- Technical Artist
- UI/UX Designer
- Content Designer
- QA Automation Engineer

Dự án đã tồn tại với phiên bản vertical slice 0.1.0.

**Nhiệm vụ của bạn là tiếp tục phát triển dự án hiện tại thành một trò chơi nhập vai võ hiệp 2D Isometric offline hoàn chỉnh, sâu về gameplay, phong phú về nội dung, hỗ trợ PC/mobile và sẵn sàng chuyển sang MMORPG Online.**

Game lấy cảm hứng từ thể loại Võ Lâm Truyền Kỳ cổ điển, nhưng sử dụng nội dung và tài nguyên có quyền sử dụng hợp pháp.

Không tạo project mới, không bỏ hệ thống đang hoạt động, không viết lại kiến trúc nếu không có lý do được chứng minh.

Mục tiêu không phải bản demo nhỏ, không phải vertical slice tiếp theo và không phải vài màn hình UI.

Mục tiêu cuối cùng là **v1.0.0 Full Offline RPG**.

Không được tự hạ mục tiêu xuống một MVP.

Có thể chia thành nhiều bản phát triển để đảm bảo chất lượng, nhưng mọi yêu cầu chưa hoàn thành phải được giữ trong backlog và tiếp tục triển khai, không tự ý loại bỏ hoặc coi là ngoài phạm vi.

## 2. KIỂM TRA SOURCE CODE TRƯỚC KHI PHÁT TRIỂN

Đọc toàn bộ cấu trúc repository hiện tại.

Kiểm tra:

1. Game engine và render architecture.
2. Game core và simulation.
3. LocalGameSession.
4. Character lifecycle.
5. Movement và navigation.
6. Combat.
7. Monster AI.
8. Skill system.
9. Inventory/equipment.
10. Quest system.
11. Save/load.
12. PWA.
13. UI PC/mobile.
14. Game content.
15. Existing automated tests.
16. Documentation và roadmap.

Tạo tài liệu:

`docs/audit/current-implementation.md`

Với bảng:

| Hệ thống | Đang có | Thiếu | Lỗi | Cần phát triển |
|---|---|---|---|---|

Đối chiếu tính năng thực sự hoạt động với các yêu cầu trong prompt.

Không tin vào tên class, README hay báo cáo cũ nếu không đối chiếu implementation.

Ưu tiên bổ sung chức năng vào hệ thống hiện có.

Không sao chép cùng một logic thành nhiều module.

## 3. KIẾN TRÚC BẮT BUỘC GIỮ NGUYÊN

Phải duy trì:

- Shared game-core.
- TypeScript strict.
- Deterministic simulation.
- Fixed timestep.
- GameCommand.
- GameEvent.
- GameSnapshot.
- GameSession abstraction.
- LocalGameSession.
- Data-driven game content.
- Versioned persistence.
- Automated testing.

Renderer chỉ hiển thị kết quả simulation.

UI chỉ gửi commands, đọc snapshots và events.

Gameplay core không được phụ thuộc React, Phaser, IndexedDB hoặc browser APIs.

Hệ thống mới phải thiết kế với giả định về sau có nhiều người chơi đồng thời.

Không hardcode duy nhất một player trong các combat/AI/world systems.

Tương lai online phải cho phép chuyển quyền xử lý từ LocalGameSession sang authoritative game server.

## 4. THIẾT KẾ THẾ GIỚI GAME HOÀN CHỈNH

### 4.1. World Structure

Xây dựng một thế giới võ hiệp có cấu trúc hợp lý với nhiều vùng, cấp độ và hoạt động.

Mục tiêu content v1.0:

- Ít nhất 5 thành thị/trung tâm lớn.
- Ít nhất 10 khu môn phái.
- Ít nhất 20 bản đồ luyện cấp.
- Ít nhất 10 khu hang động/phó bản.
- Ít nhất 5 khu vực boss đặc biệt.
- Có bản đồ thế giới và hệ thống liên kết khu vực.

Tổng mục tiêu khoảng 50 bản đồ có thể khám phá, ưu tiên chất lượng và sự khác biệt về gameplay, không tạo 50 bản đồ rỗng.

Mỗi map cần:

- Tên và cấp độ khuyến nghị.
- Biome.
- Isometric tilemap.
- Collision.
- Navigation.
- NPC.
- Quái.
- Điểm spawn.
- Portal.
- Nhạc nền.
- Ambient effects.
- Tài nguyên.
- Khu boss nếu có.
- Sự kiện khu vực.
- Minimap.

Tạo các phong cách địa hình:

- Thành cổ.
- Làng võ hiệp.
- Rừng trúc.
- Rừng rậm.
- Núi tuyết.
- Sa mạc.
- Đầm lầy.
- Hang động.
- Chùa cổ.
- Đạo quán.
- Cung điện.
- Chiến trường.
- Pháo đài.
- Bãi luyện cấp.

### 4.2. Thế giới không được trống rỗng

Mỗi khu vực phải có lý do để người chơi đến:

- Nhiệm vụ.
- Quái phù hợp cấp độ.
- Vật phẩm riêng.
- NPC.
- Khám phá.
- Sự kiện.
- Boss.
- Tài nguyên chế tạo.

Mỗi bản đồ cần ít nhất một đặc điểm gameplay hoặc phần thưởng khác biệt.

### 4.3. World Simulation

Hỗ trợ:

- Chu kỳ ngày/đêm theo game clock.
- Thời tiết.
- NPC schedules.
- Monster spawning.
- Dynamic encounters.
- Resource respawning.
- Regional events.

Các hệ thống tính thời gian phải hỗ trợ tạm dừng, lưu game và khôi phục.

Không phụ thuộc Internet hoặc backend.

## 5. HỆ THỐNG NHÂN VẬT VÀ MÔN PHÁI

Triển khai 10 môn phái:

1. Thiếu Lâm.
2. Thiên Vương.
3. Đường Môn.
4. Ngũ Độc.
5. Nga Mi.
6. Thúy Yên.
7. Cái Bang.
8. Thiên Nhẫn.
9. Võ Đang.
10. Côn Lôn.

Mỗi môn phái phải có identity gameplay rõ ràng.

Không chỉ thay tên và màu sắc kỹ năng.

Mỗi môn phái có:

- Ngũ hành.
- Vai trò chiến đấu.
- Vũ khí phù hợp.
- Thuộc tính ưu tiên.
- Nhánh võ công.
- Kỹ năng riêng.
- Nội công.
- Kỹ năng bị động.
- Kỹ năng hỗ trợ.
- Hiệu ứng chiến đấu đặc trưng.
- Nhiệm vụ môn phái.
- NPC sư phụ.
- Bản đồ môn phái.

### 5.1. Nhánh kỹ năng

Mỗi môn phái triển khai ít nhất 2 nhánh chiến đấu riêng.

Mỗi nhánh có tối thiểu:

- 3 kỹ năng tấn công.
- 2 kỹ năng bị động.
- 1 kỹ năng hỗ trợ/phòng thủ.
- 1 kỹ năng mạnh ở cấp cao.

Các kỹ năng phải có tác động gameplay khác nhau.

Mục tiêu tổng cộng tối thiểu 140 skill definitions có thể sử dụng/nâng cấp, tính cả các nhánh; không tính mỗi cấp độ nâng skill là một kỹ năng riêng.

Cần có kỹ năng cơ bản chung, kỹ năng môn phái, kỹ năng nghề nghiệp và một số kỹ năng đặc biệt.

### 5.2. Ngũ hành

Xây dựng đầy đủ:

- Tương sinh.
- Tương khắc.
- Sát thương theo hệ.
- Kháng hệ.
- Thuộc tính trang bị.
- Buff/debuff theo hệ.

Công thức phải có tài liệu và test.

### 5.3. Progression

Hỗ trợ ít nhất 100 cấp nhân vật với dữ liệu EXP và scaling cân bằng.

Có:

- Điểm tiềm năng.
- Điểm kỹ năng.
- Điều kiện học kỹ năng.
- Điều kiện gia nhập môn phái.
- Mốc mở khóa hoạt động.
- Thay đổi chỉ số theo cấp.
- Reset điểm theo quy tắc game.
- Character statistics breakdown.

Phải xây dựng progression curve thực tế để việc lên cấp có cảm giác tiến bộ.

## 6. HỆ THỐNG CHIẾN ĐẤU CHUYÊN SÂU

### 6.1. Combat Mechanics

Triển khai:

- Target selection.
- Auto attack.
- Attack speed.
- Cast time.
- Animation lock.
- Interrupt.
- Skill cooldown.
- Global cooldown nếu thiết kế yêu cầu.
- Resource costs.
- Projectile travel.
- Area attacks.
- Directional attacks.
- Collision hit detection.
- Damage over Time.
- Healing over Time.
- Shield.
- Life steal.
- Critical hit.
- Dodge.
- Accuracy.
- Knockback.
- Stun.
- Slow.
- Poison.
- Burn.
- Freeze.
- Silence.
- Invulnerability windows khi phù hợp.
- Status effect stacking.
- Elemental damage.

Xây dựng hệ thống damage pipeline có thứ tự xử lý rõ ràng.

Không để hiệu ứng animation quyết định kết quả tính sát thương.

### 6.2. Cảm giác chiến đấu

Chiến đấu phải đem lại phản hồi rõ ràng:

- Hiệu ứng trúng đòn.
- Damage numbers.
- Critical numbers.
- Hit flash.
- Impact effects.
- Sound effects.
- Screen shake có giới hạn.
- Target outline.
- Cast indicators.
- Skill range indicators.
- Enemy telegraphs.
- Death animation.

Phải hỗ trợ bật/tắt hiệu ứng để tối ưu mobile.

### 6.3. Combat Balance

Xây dựng test và công cụ kiểm tra:

- Damage per second.
- Time to kill.
- Mana consumption.
- Skill efficiency.
- Boss survivability.
- Level scaling.
- Elemental balance.
- Class balance.

Không dùng số liệu tùy tiện không có cấu hình.

## 7. QUÁI VẬT VÀ BOSS

### 7.1. Monster Catalog

Mục tiêu ít nhất 100 monster definitions có khác biệt về một hoặc nhiều yếu tố:

- Ngoại hình.
- Thuộc tính.
- Cấp độ.
- Ngũ hành.
- Kỹ năng.
- AI.
- Drop table.
- Spawn region.
- Movement.
- Attack pattern.

Không được tạo 100 quái chỉ khác tên.

Các nhóm:

- Beast.
- Bandit.
- Martial artist.
- Assassin.
- Poison creature.
- Undead/fantasy creature.
- Elemental creature.
- Elite monster.
- Dungeon guardian.

### 7.2. Monster AI

Bổ sung:

- State machine.
- Patrol.
- Aggro.
- Threat.
- Chase.
- Leash.
- Return.
- Skill selection.
- Target switching.
- Combat positioning.
- Group cooperation.
- Retreat khi phù hợp.
- Boss phases.

### 7.3. Boss System

Mục tiêu ít nhất 20 boss definitions trên toàn bộ thế giới và phó bản.

Boss cần có:

- Kỹ năng riêng.
- Telegraph.
- Attack phases.
- Special mechanics.
- Loot tables.
- Spawn conditions.
- Defeat rewards.
- Respawn rules.

Một số boss có:

- Triệu hồi thuộc hạ.
- Thay đổi kỹ năng theo HP.
- Vùng nguy hiểm.
- Lá chắn.
- Chuyển giai đoạn.
- Tấn công nhiều mục tiêu.

Không dùng chung AI quái thường cho toàn bộ boss.

## 8. VẬT PHẨM VÀ TRANG BỊ

### 8.1. Item Catalog

Mục tiêu v1.0 có ít nhất 500 item definitions, bao gồm trang bị, nguyên liệu, thuốc, vật phẩm nhiệm vụ và vật phẩm đặc biệt.

Không tạo dữ liệu rác chỉ để đủ số lượng.

Nhóm:

- Weapon.
- Armor.
- Helmet.
- Belt.
- Boots.
- Necklace.
- Ring.
- Bracelet.
- Consumable.
- Material.
- Quest item.
- Gem.
- Crafting recipe.
- Special item.

### 8.2. Equipment

Hỗ trợ:

- Equipment requirements.
- Base attributes.
- Additional attributes.
- Random affixes.
- Elemental bonuses.
- Enhancement.
- Socket.
- Gems.
- Set bonuses.
- Rarity tiers.
- Item durability nếu được bật.
- Equipment comparison.
- Equipment lock.
- Sorting.
- Filtering.

Hỗ trợ các phẩm chất:

- Thường.
- Tốt.
- Hiếm.
- Quý.
- Cực phẩm.
- Huyền thoại.

### 8.3. Item Generation

Thiết kế hệ thống sinh thuộc tính vật phẩm theo quy tắc:

- Item template.
- Item level.
- Rarity.
- Affix pool.
- RNG.
- Attribute restrictions.
- Element.
- Quality.

Không sinh thuộc tính bất hợp lệ.

### 8.4. Upgrade System

Triển khai:

- Enhancement.
- Gem socketing.
- Gem removal theo quy tắc.
- Equipment crafting.
- Material consumption.
- Success probabilities nếu sử dụng.
- Failure consequences.
- Cost calculation.
- Item preview.

Mọi thao tác phải atomic ở mức logic để tránh tạo trùng vật phẩm, mất đồ không hợp lệ hoặc tăng chỉ số sai.

## 9. HỆ THỐNG KINH TẾ

Có:

- Gold.
- NPC merchants.
- Buy/sell.
- Warehouse.
- Banking.
- Crafting expenses.
- Repair costs.
- Upgrade costs.
- Item sinks.
- Gold sinks.

Xây dựng hệ thống giá và balance.

### 9.1. Auction Simulation

Vì đang offline, triển khai thị trường mô phỏng bằng NPC traders.

NPC có thể:

- Đưa vật phẩm lên bán.
- Điều chỉnh giá theo cấu hình.
- Sinh nhu cầu mua/bán.
- Giới hạn số lượng vật phẩm.
- Thay đổi hàng hóa theo chu kỳ game.

Không cần giả vờ có người chơi online thật.

Đặt tên rõ là thị trường NPC.

### 9.2. Transactions

Mọi giao dịch cần:

- Validate.
- Check ownership.
- Check currency.
- Check inventory capacity.
- Atomic commit.
- Event logging.
- Idempotency khi cần.

Thiết kế để tương lai có thể chuyển transaction sang backend/database.

## 10. NGHỀ NGHIỆP VÀ CHẾ TẠO

Triển khai:

- Khai khoáng.
- Hái thuốc.
- Thu thập gỗ.
- Luyện dược.
- Rèn vũ khí.
- Chế tạo trang bị.
- Chế tạo phụ kiện.
- Gia công vật liệu.

Có:

- Skill level.
- Resource nodes.
- Recipes.
- Required materials.
- Crafting progression.
- Crafting UI.
- Crafting success/failure khi phù hợp.
- Item output.
- Resource respawn.

Mỗi nghề phải có lợi ích thực tế với progression.

## 11. QUEST VÀ CỐT TRUYỆN

Mục tiêu ít nhất 150 quest definitions có nội dung phù hợp thế giới, không tạo quest vô nghĩa để đủ số lượng.

Các nhóm:

- Main story.
- Side story.
- Sect quests.
- Daily-style quests theo game clock.
- Dungeon quests.
- Boss quests.
- Crafting quests.
- Exploration quests.
- Event quests.

Các objective:

- Kill.
- Collect.
- Deliver.
- Talk.
- Explore.
- Defeat boss.
- Craft item.
- Equip item.
- Reach level.
- Discover location.
- Protect NPC khi engine hỗ trợ.

### 11.1. Quest Chains

Có ít nhất:

- Một tuyến truyện chính xuyên nhiều khu vực.
- Nhiệm vụ nhập môn cho từng môn phái.
- Chuỗi nhiệm vụ mở khóa phó bản.
- Chuỗi nhiệm vụ mở khóa nghề.
- Nhiệm vụ boss.
- Nhiệm vụ phần thưởng trang bị đặc biệt.

### 11.2. Quest Engine

Phải hỗ trợ:

- Preconditions.
- Objectives.
- Event-based progress.
- Branching dialogue.
- Multiple rewards.
- Unique rewards.
- Repeatability rules.
- Quest availability.
- Quest tracking.
- Reward idempotency.
- Save/load.

Không hardcode mỗi quest trong UI.

## 12. TỔ ĐỘI VÀ ĐỒNG HÀNH OFFLINE

Triển khai AI companions.

Các loại đồng hành:

- Đỡ đòn.
- Sát thương.
- Hỗ trợ.
- Hồi máu.

Hỗ trợ:

- Recruit.
- Dismiss.
- Follow.
- Attack.
- Defend.
- Hold position.
- Use skills.
- Equipment nếu phù hợp.
- Companion progression.
- Formation.
- Target assist.

Có UI điều khiển tổ đội.

Game core phải hỗ trợ nhiều combat entities, đồng thời tránh coi tất cả companion là player thật.

## 13. BANG HỘI OFFLINE

Xây dựng bang hội mô phỏng bằng NPC:

- Tạo bang.
- Đặt tên.
- Huy hiệu.
- Tuyển NPC.
- Vai trò trong bang.
- Cấp bang.
- Tài nguyên bang.
- Nhiệm vụ bang.
- Nâng cấp bang.
- Bang hội đối thủ do AI điều khiển.

Không tạo giả hàng nghìn tài khoản người chơi.

Tương lai thay NPC simulation bằng player membership thực.

## 14. PVP VÀ CÔNG THÀNH

### Offline PvP

Triển khai:

- Duel với AI.
- Arena.
- Tournament.
- Team battle với NPC.
- Ranking offline.

Đối thủ phải tuân thủ cùng combat rules với nhân vật.

### Công thành

Thiết kế chế độ siege offline:

- Bang hội NPC.
- Phe tấn công.
- Phe phòng thủ.
- Thành trì.
- Cổng thành.
- Thủ lĩnh.
- Objectives.
- Respawn rules.
- Rewards.
- Match results.

Số lượng AI phải được giới hạn và tối ưu theo khả năng thiết bị.

Không yêu cầu mô phỏng hàng nghìn NPC đồng thời trên mobile.

## 15. PHÓ BẢN

Xây dựng dungeon framework:

- Instance creation.
- Entry requirements.
- Enemy waves.
- Boss encounters.
- Objectives.
- Completion rewards.
- Difficulty tiers.
- Reset rules.
- Dungeon checkpoints.
- Dungeon save constraints.

Mục tiêu ít nhất 10 phó bản có cơ chế riêng.

Hỗ trợ chơi đơn hoặc cùng NPC companions.

Thiết kế instance có thể tái sử dụng khi chuyển online.

## 16. AUTO PLAY VÀ HỆ THỐNG TIỆN ÍCH

Triển khai auto gameplay phục vụ người chơi offline.

### Auto Combat

Cấu hình:

- Auto target.
- Auto attack.
- Skill rotation.
- HP threshold for potions.
- MP threshold.
- Loot filters.
- Monster priority.
- Attack range.
- Stop on low HP.
- Return to safe area.
- Auto-revive nếu được phép.

Phải có giới hạn tránh AI đi vòng lặp, gây kẹt hoặc spam command.

### Quality of Life

Có:

- Auto pickup.
- Item sorting.
- Inventory filters.
- Quest navigation.
- Pathfinding to NPC.
- Teleport list.
- Favorite locations.
- Quick-use items.
- Skill presets.
- Equipment presets.
- Configurable hotkeys.

## 17. ĐỒ HỌA — CHẤT LƯỢNG SẢN PHẨM

Đây là hạng mục ưu tiên cao, không được bỏ qua.

Game phải hướng tới cảm giác thị giác của MMORPG võ hiệp 2D cổ điển.

### 17.1. Character Graphics

Có animation:

- Idle.
- Walk.
- Run nếu được thiết kế.
- Normal attack.
- Skill cast.
- Hit reaction.
- Death.
- Revive.
- Interaction.

Mục tiêu 8 hướng.

Tất cả nhân vật dùng quy ước sprite origin, feet anchor, shadow, depth sorting nhất quán.

### 17.2. Environment

Bản đồ có:

- Ground textures.
- Roads.
- Rivers.
- Bridges.
- Buildings.
- Trees.
- Vegetation.
- Rocks.
- Interactive props.
- Foreground overlays.
- Roof layers.
- Lighting.
- Weather.
- Animated environmental objects.

Đặc biệt phải xử lý che khuất giữa nhân vật và các vật thể Isometric.

### 17.3. Skill Visuals

Các hệ:

- Kim.
- Mộc.
- Thủy.
- Hỏa.
- Thổ.

Mỗi hệ có nhận diện hình ảnh nhất quán.

Có hiệu ứng:

- Projectile.
- Trail.
- Impact.
- Area effect.
- Aura.
- Buff.
- Status.
- Critical.
- Boss skill.

### 17.4. Asset Quality

Không dùng hình khối màu đơn giản làm đồ họa cuối cùng.

Không dùng emoji thay thế sprite trong bản sản xuất.

Không dùng screenshot làm background giả có tương tác.

Nếu asset chất lượng sản xuất chưa tồn tại, xây dựng manifest và asset specification rõ ràng; báo cáo những asset chưa hoàn thành.

Không lấy hoặc sao chép tài nguyên độc quyền không có quyền sử dụng.

## 18. GIAO DIỆN PC HOÀN CHỈNH

Thiết kế giao diện võ hiệp đồng nhất gồm:

- Main menu.
- Character creation.
- Character selection.
- HUD.
- Minimap.
- World map.
- Character stats.
- Equipment.
- Inventory.
- Warehouse.
- Skill tree.
- Quest log.
- NPC dialogue.
- NPC shop.
- Crafting.
- Enhancement.
- Guild.
- Party.
- Companion.
- Arena.
- Dungeon.
- Auction NPC.
- Settings.
- Save management.
- Achievement.
- Event calendar theo game clock.

Có thể mở/đóng, kéo cửa sổ khi phù hợp và quản lý z-index chính xác.

Mọi button phải thực hiện chức năng thật.

## 19. GIAO DIỆN MOBILE HOÀN CHỈNH

Không sử dụng nguyên giao diện PC thu nhỏ.

Tạo responsive adaptive UI:

- Joystick.
- Skill wheel / skill buttons.
- Attack button.
- Lock target.
- Auto button.
- Potion buttons.
- Collapsible quest tracker.
- Minimap.
- Quick menu.
- Full-screen inventory.
- Mobile equipment panel.
- Touch-friendly skill tree.
- NPC dialogue.
- Touch targeting.
- Safe-area support.
- Landscape optimization.

Hỗ trợ màn hình từ điện thoại nhỏ đến tablet.

Xem xét khả năng tùy chỉnh vị trí nút điều khiển.

Có các tùy chọn tối ưu FPS và hiệu ứng.

## 20. ÂM THANH

Xây dựng audio manager.

Có:

- Background music.
- Ambient sounds.
- Footsteps.
- Weapon attacks.
- Skill casting.
- Skill impacts.
- Monster sounds.
- Boss sounds.
- UI sounds.
- Quest completion.
- Level up.
- Item pickup.

Cho phép điều chỉnh riêng Music, SFX và Ambient.

Phải tuân thủ hạn chế autoplay audio của browser.

Không phát nhiều âm thanh trùng không kiểm soát.

## 21. OFFLINE/PWA/SAVE SYSTEM

Duy trì hoàn toàn khả năng offline.

Có:

- Multiple character slots.
- Autosave.
- Manual save.
- Backup.
- Export.
- Import.
- Save schema migration.
- Content version migration.
- Corrupted save recovery.
- Storage quota handling.
- Offline asset caching.
- Cache versioning.

Không lưu liên tục từng simulation tick.

Không âm thầm xóa save do đổi phiên bản.

Có màn hình quản lý bản lưu và thông báo lỗi dễ hiểu.

Khi game nâng cấp content definitions, phải có chiến lược xử lý save cũ.

## 22. HỆ THỐNG ADMIN/CONTENT EDITOR NỘI BỘ

Xây dựng các công cụ hỗ trợ phát triển, không nhất thiết phải là ứng dụng quản trị riêng.

Cần có khả năng:

- Kiểm tra toàn bộ item definitions.
- Kiểm tra monster definitions.
- Kiểm tra skill definitions.
- Kiểm tra quest graph.
- Kiểm tra map connections.
- Kiểm tra spawn points.
- Kiểm tra missing assets.
- Kiểm tra progression balance.
- Kiểm tra loot tables.
- Kiểm tra content duplication.

Ưu tiên tạo developer tools có hiệu quả thực tế:

- Content validator.
- Combat simulator.
- Balance analyzer.
- Map inspector.
- Entity inspector.
- Debug overlay.
- Simulation tick profiler.
- Asset loading monitor.

Các công cụ debug phải tách khỏi gameplay production.

Không được để debug API trở thành cơ chế nâng level, tiền hoặc HP trong gameplay thông thường.

## 23. ONLINE-READY — YÊU CẦU KIẾN TRÚC

Bản offline phải có thiết kế cho tương lai:

- Authoritative game server.
- RemoteGameSession.
- Colyseus adapter.
- World instances.
- Character persistence.
- Account system.
- Network command validation.
- State synchronization.
- Entity ownership.
- Interest management.
- Client prediction khi cần.
- Reconciliation.
- Reconnection.
- Anti-cheat.
- Inventory transaction security.
- Server-side economy.
- Multiplayer party/guild.
- Chat channels.
- PvP multiplayer.
- Cross-map travel.
- Horizontal scaling khi cần.

Chưa bắt buộc triển khai vận hành toàn bộ server online trong v1.0 offline.

Tuy nhiên, phải có automated tests chứng minh simulation core có thể chạy ngoài browser.

Tài liệu hóa những hệ thống offline cần thay adapter, những hệ thống dùng chung và những hệ thống online cần viết mới.

Không được tuyên bố online-ready chỉ vì có folder `server/`.

Không được chấp nhận save offline làm dữ liệu online đáng tin cậy.

## 24. CHỈ TIÊU NỘI DUNG V1.0

Đây là mục tiêu nội dung, không phải điều kiện để tạo dữ liệu giả.

| Nội dung | Mục tiêu |
|---|---:|
| Môn phái | 10 |
| Nhánh chiến đấu | >= 20 |
| Skill definitions | >= 140 |
| Bản đồ | >= 50 |
| Monster definitions | >= 100 |
| Boss definitions | >= 20 |
| Item definitions | >= 500 |
| Quest definitions | >= 150 |
| Dungeon | >= 10 |
| Nghề nghiệp | >= 6 |
| Character level | >= 100 |
| Đồng hành | Nhiều loại |
| Bang hội offline | Có |
| PvP với AI | Có |
| Công thành offline | Có |

Mỗi loại nội dung phải đạt chuẩn chất lượng thực sự.

Không tự tạo số lượng lớn dữ liệu vô nghĩa.

Xây dựng báo cáo content coverage và validation status để đo tiến độ.

## 25. KẾ HOẠCH PHÁT TRIỂN PHIÊN BẢN

### v0.2 — Graphics & Combat Foundation

- Nâng cấp animation.
- Chuẩn hóa sprites.
- Cải thiện combat feedback.
- Hoàn thiện combat effects.
- Mở rộng monster AI.
- Hoàn thiện targeting.
- Tối ưu mobile controls.

### v0.3 — Character & Sect Systems

- 10 môn phái ở mức hệ thống.
- Nhánh võ công.
- Ngũ hành hoàn chỉnh.
- Skill tree.
- Level progression.
- Equipment requirements.
- Combat balance tools.

### v0.4 — Equipment & Economy

- Item catalog.
- Random attributes.
- Enhancement.
- Gems.
- Set bonuses.
- Shops.
- Banking.
- NPC marketplace.
- Economy rules.

### v0.5 — Open World Expansion

- World map.
- Map content pipeline.
- Nhiều khu vực.
- Monster spawn systems.
- Exploration.
- Weather/day-night.
- NPC schedules.
- Navigation.

### v0.6 — Quest & Story

- Main story.
- Sect quests.
- Quest chains.
- Dialogue.
- NPC behavior.
- Quest rewards.
- Quest navigation.

### v0.7 — Dungeon & Boss

- Dungeon framework.
- Boss mechanics.
- Dungeon rewards.
- Difficulty.
- Companions.
- Group PvE.

### v0.8 — Advanced Offline Systems

- Crafting.
- Gathering.
- Guild NPC simulation.
- Arena.
- Tournament.
- Siege.
- Auto-combat.
- Event systems.

### v0.9 — Content Completion & Polish

- Hoàn thành content targets.
- Animation and VFX polish.
- Sound.
- PC/mobile UI.
- Optimization.
- Save migration.
- Long-session testing.
- Gameplay balance.
- Bug fixes.

### v1.0 — Full Offline Release

Chỉ phát hành khi:

- Toàn bộ hệ thống bắt buộc hoạt động.
- Content đạt yêu cầu chất lượng.
- Gameplay loop hoàn chỉnh.
- Không có blocker bugs.
- Save/load đáng tin cậy.
- Offline hoạt động.
- PC/mobile usable.
- Có automated tests.
- Có tài liệu.
- Có báo cáo hiệu năng trên những thiết bị đã thử nghiệm.
- Có tài liệu migration sang online.

Không dùng số phiên bản làm bằng chứng rằng sản phẩm đã hoàn chỉnh.

## 26. ACCEPTANCE TESTING

Mỗi bản phát triển phải vượt qua:

1. Typecheck.
2. Lint.
3. Unit tests.
4. Integration tests.
5. Browser E2E.
6. Save/load tests.
7. Content validation.
8. Offline mode tests.
9. Gameplay regression.
10. Performance smoke tests.

Ngoài ra có những hành trình chơi bắt buộc:

### Hành trình A — Nhân vật mới

Tạo nhân vật → bắt đầu ở làng → gặp NPC → nhận nhiệm vụ → đánh quái → tăng cấp → nhận vật phẩm → trang bị → hoàn thành nhiệm vụ → lưu game.

### Hành trình B — Phát triển môn phái

Gia nhập môn phái → học kỹ năng → nâng kỹ năng → thử nhiều kiểu combat → thay trang bị → tính lại thuộc tính → đánh boss.

### Hành trình C — Dungeon

Vào phó bản → đánh quái → hoàn thành objectives → hạ boss → nhận loot → rời phó bản → lưu game.

### Hành trình D — Kinh tế

Thu thập nguyên liệu → chế tạo → cường hóa → mua/bán → lưu game → reload → kiểm tra số lượng và tiền.

### Hành trình E — Đồng hành

Tuyển NPC → tạo tổ đội → điều khiển chiến thuật → chiến đấu → hoàn thành nhiệm vụ → giải tán hoặc thay đổi tổ đội.

### Hành trình F — Offline

Tải game → offline → reload → di chuyển → đổi bản đồ đã cache → đánh quái → lưu game → đóng/mở lại → tiếp tục.

### Hành trình G — Mobile

Mở game ở landscape → điều khiển joystick → chọn mục tiêu → thi triển kỹ năng → nhặt vật phẩm → mở hành trang → thay trang bị → lưu game.

### Hành trình H — Long Session

Chơi liên tục qua nhiều khu vực, đánh quái, nhận nhiệm vụ và lưu game.

Kiểm tra memory growth, resource cleanup và state consistency.

Không được coi Playwright headless là bằng chứng đầy đủ về hiệu suất điện thoại thật.

## 27. TÀI LIỆU VÀ TIẾN ĐỘ

Tạo một hệ thống tài liệu phát triển lâu dài:

- `docs/MASTER_GAME_DESIGN.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/CONTENT_CATALOG.md`
- `docs/COMBAT_DESIGN.md`
- `docs/PROGRESSION_BALANCE.md`
- `docs/ECONOMY_DESIGN.md`
- `docs/WORLD_DESIGN.md`
- `docs/ONLINE_MIGRATION.md`
- `docs/QUALITY_STANDARDS.md`
- `docs/ROADMAP.md`
- `docs/IMPLEMENTATION_STATUS.md`

`IMPLEMENTATION_STATUS.md` phải phân biệt:

- Planned.
- In progress.
- Implemented.
- Tested.
- Blocked.
- Requires assets.
- Requires device validation.

Không đánh dấu Tested khi chỉ biên dịch thành công.

Báo cáo số lượng nội dung thực sự hoàn thành.

## 28. NGUYÊN TẮC PHÁT TRIỂN CUỐI CÙNG

Không được:

- Dừng phát triển chỉ vì đã có một vertical slice.
- Biến mục tiêu game hoàn chỉnh thành một MVP nhỏ.
- Tạo UI giả.
- Sử dụng button không hoạt động.
- Hardcode gameplay cho riêng một màn chơi.
- Tạo nhiều hệ thống trùng chức năng.
- Đưa tính toán combat vào renderer.
- Phá vỡ save data cũ.
- Làm offline phụ thuộc server.
- Viết lại kiến trúc mà không có lý do.
- Tạo hàng trăm item/skill chỉ khác tên.
- Tuyên bố gameplay hoàn chỉnh khi thiếu asset thiết yếu.
- Báo cáo đã test tính năng khi chưa thực sự chạy.
- Tự ý bỏ các subsystem lớn khỏi mục tiêu v1.0.

### Cách làm việc

1. Audit source hiện tại.
2. Lập bảng chênh lệch từ 0.1.0 đến v1.0.0.
3. Viết kế hoạch implementation theo dependency.
4. Bắt đầu triển khai thực tế.
5. Ưu tiên hệ thống lõi và nội dung có thể chơi được.
6. Kiểm thử sau mỗi nhóm thay đổi.
7. Cập nhật tài liệu tiến độ.
8. Tiếp tục với công việc kế tiếp theo roadmap khi điều kiện môi trường cho phép.
9. Khi phiên làm việc kết thúc, phải cung cấp trạng thái thực tế và các bước tiếp tục cụ thể; không giả vờ công việc vẫn đang chạy ngầm.

### Định nghĩa hoàn thành

Một tính năng chỉ được xem là hoàn thành nếu:

- Có implementation thật.
- Được tích hợp vào gameplay.
- Có UI/interaction nếu cần.
- Có content hợp lệ nếu cần.
- Có save/load nếu ảnh hưởng tiến trình.
- Có kiểm thử phù hợp.
- Không phá hệ thống khác.
- Có tài liệu nếu là hệ thống lớn.

### YÊU CẦU THỰC THI

Hãy tiếp tục trực tiếp từ source code v0.1.0.

Mục tiêu cuối cùng là **một game Võ Lâm phong cách cổ điển với trải nghiệm nhập vai offline đầy đủ, thế giới rộng, nhiều môn phái, kỹ năng, bản đồ, nhiệm vụ, boss, trang bị, chế tạo, kinh tế, đồng hành, bang hội AI, chiến trường và hoạt động dài hạn**.

Đồng thời, toàn bộ hệ thống gameplay phải duy trì khả năng tái sử dụng khi chuyển sang MMORPG Online.

Không chỉ phân tích hoặc lập kế hoạch. Hãy bắt đầu triển khai code thực tế sau khi audit và tiếp tục hoàn thành từng nhóm chức năng theo tiêu chí nghiệm thu.