# MASTER PROMPT — HOÀN THIỆN KIẾM HIỆP WEB
## XÂY DỰNG GAME VÕ HIỆP OFFLINE HOÀN CHỈNH — PHONG CÁCH VÕ LÂM TRUYỀN KỲ 1
### Full Open World • Character Creation • Monster Farming • Loot • Enhancement • Crafting • Shops • Combat • Online-Ready

---

# 1. VAI TRÒ VÀ MỤC TIÊU

Bạn đóng vai trò là một đội ngũ phát triển game chuyên nghiệp, bao gồm:

- Principal Game Architect
- Senior Game Engine Developer
- Senior TypeScript Developer
- MMORPG Gameplay Designer
- Combat & Skill Designer
- World & Level Designer
- Game Economy Designer
- Technical Artist
- UI/UX Designer
- Audio Designer
- QA Automation Engineer

Nhiệm vụ của bạn là **HOÀN THIỆN DỰ ÁN KIẾM HIỆP WEB ĐANG TỒN TẠI**, không phải tạo demo mới.

Game được xây dựng theo phong cách MMORPG võ hiệp 2D Isometric cổ điển, đặc biệt lấy cảm hứng từ trải nghiệm Võ Lâm Truyền Kỳ 1.

Mục tiêu là tái hiện tối đa cảm giác của thể loại game gốc về:

- Bản đồ.
- Nhân vật.
- Môn phái.
- Luyện cấp.
- Đánh quái.
- Săn boss.
- Nhặt đồ.
- Mua bán.
- Cường hóa.
- Võ công.
- Ngũ hành.
- Nhiệm vụ.
- Thành thị.
- NPC.
- Hoạt động võ lâm.
- Quá trình phát triển nhân vật lâu dài.

Dùng tài nguyên đồ họa, âm thanh và dữ liệu có quyền sử dụng hợp pháp; không sao chép trực tiếp asset, mã nguồn hoặc nội dung độc quyền.

## Yêu cầu quan trọng

**Tôi không muốn thêm một bản prototype hay vertical slice sơ sài. Tôi muốn phát triển thành một game nhập vai offline thực sự có chiều sâu và có thể chơi hàng chục, thậm chí hàng trăm giờ nếu nội dung được mở rộng đầy đủ.**

Game phải:

1. Chạy trên website.
2. Hỗ trợ PC và mobile.
3. Hoạt động offline sau khi tải đủ tài nguyên.
4. Có gameplay thực sự.
5. Có bản đồ rộng lớn.
6. Có nhiều hoạt động.
7. Có hệ thống phát triển nhân vật sâu.
8. Có đồ họa, âm thanh, animation chất lượng.
9. Có hệ thống lưu tiến trình đầy đủ.
10. Giữ kiến trúc có thể chuyển thành MMORPG Online sau này.

Không được bỏ những hệ thống đã hoạt động để làm lại một dự án khác.

---

# 2. KIỂM TRA VÀ KẾ THỪA SOURCE HIỆN TẠI

Trước tiên, phải đọc và phân tích repository hiện tại.

Kiểm tra toàn bộ:

- Phaser scenes.
- Rendering pipeline.
- UI React.
- Game simulation.
- GameSession.
- Character system.
- Map system.
- Movement.
- Navigation.
- Monster AI.
- Combat.
- Skills.
- Inventory.
- Equipment.
- Quests.
- NPC interactions.
- Save/load.
- Asset management.
- Audio.
- Tests.
- Documentation.

Xác định chính xác những tính năng:

- Đã hoàn thành.
- Đã tồn tại nhưng còn lỗi.
- Mới chỉ có UI.
- Mới chỉ có backend/game logic.
- Có dữ liệu nhưng chưa tích hợp.
- Chưa được xây dựng.
- Cần thay đổi kiến trúc.

Tạo bảng audit trong:

`docs/IMPLEMENTATION_STATUS.md`

Không dựa vào tên file hoặc báo cáo cũ để kết luận chức năng đã hoàn thành.

Sau khi audit, **bắt đầu sửa code thực tế**, không dừng lại ở tài liệu.

---

# 3. THIẾT KẾ LẠI TRẢI NGHIỆM VÀO GAME LẦN ĐẦU

Hiện tại game không được tự động đưa người chơi vào một nhân vật mẫu như một bản demo.

## 3.1. First Launch Flow

Khi người dùng mở game lần đầu:

1. Hiển thị màn hình loading.
2. Tải những tài nguyên tối thiểu cần thiết.
3. Kiểm tra dữ liệu nhân vật trong IndexedDB.
4. Nếu chưa có nhân vật, mở màn hình tạo nhân vật.
5. Nếu đã có, mở màn hình chọn nhân vật.
6. Sau khi chọn nhân vật mới vào thế giới game.

Không đưa người chơi trực tiếp vào gameplay trước khi tạo nhân vật.

## 3.2. Màn hình tạo nhân vật

Thiết kế giao diện đẹp theo phong cách võ hiệp cổ điển.

Có:

- Nhân vật được hiển thị và preview animation.
- Nhập tên nhân vật.
- Chọn giới tính nhân vật nếu asset hỗ trợ.
- Chọn ngoại hình.
- Chọn khuôn mặt.
- Chọn kiểu tóc.
- Chọn màu tóc.
- Chọn trang phục khởi đầu.
- Xem trước nhân vật.
- Giới thiệu môn phái.
- Chọn môn phái hoặc chọn chưa gia nhập môn phái.
- Nút tạo nhân vật.

### Quy tắc đặt tên

- Hỗ trợ Unicode và tiếng Việt có dấu.
- Giới hạn chiều dài hợp lý.
- Không cho tên chỉ gồm khoảng trắng.
- Kiểm tra ký tự không hợp lệ.
- Không cho trùng tên giữa các nhân vật local theo quy tắc chuẩn hóa.
- Hiển thị lỗi rõ ràng.
- Không mất tên đã nhập khi đổi ngoại hình.

## 3.3. Màn hình chọn nhân vật

Có:

- Danh sách nhân vật đã tạo.
- Chân dung.
- Tên.
- Môn phái.
- Cấp độ.
- Ngũ hành.
- Trang bị đang mặc.
- Bản đồ đang đứng.
- Thời gian chơi.
- Nút vào game.
- Nút tạo nhân vật mới.
- Nút xóa với xác nhận và backup.

Mục tiêu hỗ trợ ít nhất 5 slot nhân vật local, có thể cấu hình.

## 3.4. New Character Initialization

Khi tạo nhân vật phải khởi tạo chính xác:

- Unique Character ID.
- Tên.
- Ngoại hình.
- Thuộc tính.
- Cấp 1.
- EXP.
- HP/MP.
- Map spawn.
- Inventory khởi đầu.
- Equipment khởi đầu.
- Skills khởi đầu.
- Quest state.
- Currency.
- Save version.

Không được sử dụng cùng một object state hoặc item instance giữa các nhân vật.

Khi reload phải hiển thị chính xác nhân vật trước đó và không tự tạo nhân vật mặc định khác.

---

# 4. NÂNG CẤP THẾ GIỚI VÀ BẢN ĐỒ — ƯU TIÊN RẤT CAO

Bản đồ hiện tại quá nhỏ, thiếu không gian di chuyển và khám phá.

**Yêu cầu xây dựng thế giới lớn hơn nhiều lần, nhiều bản đồ liên kết và có nội dung thực sự.**

## 4.1. Kiến trúc bản đồ lớn

Phát triển map system hỗ trợ:

- Isometric tilemaps.
- Large maps.
- Map chunks.
- Chunk loading/unloading.
- Viewport culling.
- Collision.
- Navigation grid.
- A* pathfinding.
- NPC spawns.
- Monster spawn regions.
- Resource nodes.
- Portals.
- Map transitions.
- Minimap.
- World map.
- Points of interest.
- Terrain layers.
- Foreground occlusion.

Bản đồ lớn không được yêu cầu nạp toàn bộ vật thể vào bộ nhớ cùng lúc.

Sử dụng chunking, ví dụ 32×32 hoặc 64×64 tiles/chunk, lựa chọn dựa trên benchmark thực tế.

Cần quản lý riêng:

- Render chunks.
- Navigation chunks.
- Entity simulation regions.
- Asset loading.
- Collision regions.

Không tạo bản đồ lớn chỉ bằng cách scale background.

## 4.2. Kích thước bản đồ

Tùy loại bản đồ, hướng tới năng lực hỗ trợ:

- Thôn nhỏ: khoảng 256×256 logical tiles.
- Thành thị: 384×384 đến 512×512 tiles.
- Bãi luyện cấp: 512×512 tiles hoặc lớn hơn.
- Khu vực rừng/núi: 512×512 đến 1024×1024 tiles nếu streaming đáp ứng.
- Hang động: nhiều tầng hoặc nhiều connected maps.

Các con số phải được hiệu chỉnh theo kích thước tile và world scale đang sử dụng.

Mục tiêu là không gian khám phá lớn thực sự, không phải số tile hình thức.

Một bãi luyện cấp phải có nhiều khu vực farm quái khác nhau, không hết đường đi sau vài chục giây.

## 4.3. Mục tiêu số lượng bản đồ

Xây dựng world content hướng tới tối thiểu 40 bản đồ có thể chơi và khám phá:

- 6 thành thị, làng và trung tâm giao dịch.
- 10 khu vực môn phái.
- 16 bản đồ luyện cấp theo nhiều cấp độ.
- 6 hang động/phó bản.
- 2 khu boss đặc biệt.

Tiếp tục mở rộng sau đó.

Không được tạo 40 bản đồ rỗng hoặc chỉ khác màu đất.

Mỗi map phải có:

- Phong cách địa hình riêng.
- Nhiều vật thể.
- Đường đi hợp lý.
- Quái phù hợp.
- NPC khi cần.
- Khu vực đặc biệt.
- Bãi farm.
- Nhiệm vụ.
- Tài nguyên.
- Điểm truyền tống.
- Một hoặc nhiều điểm khám phá.

## 4.4. Bản đồ và môi trường

Cần có:

- Thành cổ.
- Tân thủ thôn.
- Chợ.
- Phố thương nhân.
- Võ đường.
- Đạo quán.
- Chùa.
- Rừng trúc.
- Rừng rậm.
- Núi đá.
- Núi tuyết.
- Sông.
- Hồ.
- Cầu.
- Hang động.
- Đầm lầy.
- Đền cổ.
- Sa mạc.
- Pháo đài.
- Chiến trường.

Môi trường phải chi tiết, có vật thể với tỷ lệ thống nhất.

Không để mặt đất là một texture lặp đơn điệu trên toàn bản đồ.

## 4.5. Chuyển bản đồ

Có:

- Portal.
- NPC truyền tống.
- Cổng thành.
- Lối vào hang.
- Lối lên tầng.
- World map travel khi đã mở khóa.

Khi chuyển map:

- Không mất HP/MP sai.
- Không nhân đôi quái.
- Không nhân đôi NPC.
- Không rò rỉ texture.
- Không mất quest progress.
- Không spawn vào tường.
- Không bị kẹt camera.
- Lưu mapId và position chính xác.

## 4.6. Bản đồ thế giới

Xây dựng World Map UI với:

- Danh sách khu vực.
- Cấp độ khuyến nghị.
- Bản đồ đã khám phá.
- Vị trí nhân vật.
- NPC quan trọng.
- Portal.
- Khu vực farm.
- Boss.
- Điểm đánh dấu nhiệm vụ.

Có chức năng định hướng đến điểm đã chọn nếu có đường đi hợp lệ.

---

# 5. NÂNG CẤP HỆ THỐNG DI CHUYỂN — PHẢI MƯỢT

Di chuyển hiện tại còn thô và chưa tạo cảm giác điều khiển nhân vật thực sự.

## 5.1. Movement System

Tách:

- Movement input.
- Target position.
- Pathfinding.
- Movement velocity.
- Collision resolution.
- Animation state.
- Rendering interpolation.

Không cập nhật vị trí trực tiếp theo frame rate.

Simulation dùng fixed timestep, renderer nội suy giữa các snapshot khi phù hợp.

## 5.2. Click-to-Move

Trên PC:

- Click vào mặt đất để di chuyển.
- Click vị trí xa để tự tìm đường.
- Click vị trí mới để thay đổi đích.
- Không bị giật khi tìm lại đường.
- Không chạy xuyên vật cản.
- Không vòng vo vô lý.
- Không rung lắc ở waypoint.
- Dừng đúng gần đích với tolerance hợp lý.

Pathfinding phải có chi phí giới hạn.

Không chạy A* lại trên toàn bản đồ mỗi frame.

## 5.3. Joystick Mobile

Joystick cần:

- Điều khiển mượt theo hướng.
- Hỗ trợ nhiều hướng liên tục.
- Dead zone.
- Input smoothing.
- Multi-touch.
- Không bị kẹt khi nhấc tay.
- Không mất input khi bấm skill đồng thời.
- Tùy chỉnh kích thước.
- Tùy chỉnh vị trí.
- Hỗ trợ fixed/floating joystick.

## 5.4. Character Animation

Nhân vật phải có:

- Idle.
- Walk.
- Run nếu phù hợp.
- Attack.
- Cast.
- Hit.
- Death.
- Revive.

Mục tiêu hỗ trợ 8 hướng nhất quán.

Animation phải tương ứng hướng di chuyển.

Không dùng một sprite tĩnh trượt trên mặt đất như sản phẩm hoàn chỉnh.

## 5.5. Camera

Sửa:

- Camera giật.
- Zoom không đúng.
- Camera lệch nhân vật.
- Camera hiển thị quá ít thế giới.
- Camera bị chặn bởi HUD.
- Camera lộ vùng ngoài map.

Có:

- Smooth follow.
- Adaptive zoom.
- Camera bounds.
- Camera transitions.
- Cấu hình zoom PC/mobile.

---

# 6. QUÁI VẬT VÀ FARM LEVEL — GAMEPLAY CHÍNH

Đây là phần cực kỳ quan trọng.

**Người chơi phải có thể đi đến bãi quái, đánh liên tục, nhận EXP, lên cấp, nhặt vật phẩm và trở nên mạnh hơn.**

## 6.1. Quái vật đa dạng

Xây dựng monster catalog hướng tới ít nhất 100–120 monster definitions có khác biệt thực sự về:

- Sprite.
- Level.
- Attributes.
- Element.
- Movement.
- Attack.
- AI.
- Skills.
- EXP.
- Loot table.
- Spawn region.

Các nhóm:

- Động vật hoang dã.
- Sơn tặc.
- Thổ phỉ.
- Võ sĩ.
- Sát thủ.
- Quái độc.
- Quái ngũ hành.
- Quái hang động.
- Quái tinh anh.
- Thủ lĩnh.
- Boss.

## 6.2. Hệ thống bãi quái

Mỗi map farm phải có nhiều spawn zones.

Spawn zone định nghĩa:

- Monster type.
- Level range.
- Population target.
- Maximum alive.
- Spawn positions.
- Respawn delay.
- Aggro behavior.
- Patrol area.
- Safe distance from towns.
- Elite spawn chance.

Thiết kế mật độ quái đủ để luyện cấp liên tục, nhưng không dồn tất cả quái vào một chỗ.

Quái không được xuất hiện ngay trên người chơi hoặc trong vật cản.

Có spawn/respawn hợp lý.

Quái ở xa người chơi có thể được mô phỏng giản lược để tiết kiệm tài nguyên.

## 6.3. AI quái

Có:

- Idle.
- Patrol.
- Detect player.
- Chase.
- Attack.
- Use skills.
- Retreat khi phù hợp.
- Return home.
- Dead.
- Respawn.

Quái không đứng yên chờ bị đánh.

Có sự khác biệt giữa:

- Quái chủ động.
- Quái bị động.
- Quái đánh gần.
- Quái đánh xa.
- Quái đi theo nhóm.
- Quái tinh anh.
- Boss.

## 6.4. Combat Farming Loop

Một vòng farm chuẩn:

1. Người chơi đến bãi luyện cấp.
2. Phát hiện quái.
3. Chọn mục tiêu.
4. Di chuyển tới phạm vi tấn công.
5. Sử dụng đánh thường/kỹ năng.
6. Quái phản công.
7. Quái chết.
8. Hiển thị EXP nhận được.
9. Rơi vàng và vật phẩm.
10. Người chơi nhặt đồ.
11. Quái hồi sinh.
12. Người chơi tiếp tục luyện cấp.

Toàn bộ phải là gameplay thật, không phải animation giả.

## 6.5. Auto Farm

Xây dựng chức năng auto đánh quái offline.

Có cấu hình:

- Bật/tắt auto.
- Phạm vi farm.
- Ưu tiên mục tiêu.
- Tự đánh thường.
- Tự dùng skills.
- Skill rotation.
- Tự dùng thuốc HP.
- Tự dùng thuốc MP.
- Tự nhặt đồ.
- Lọc phẩm chất vật phẩm.
- Dừng khi HP thấp.
- Dừng khi hành trang đầy.
- Giới hạn không rời khỏi bãi farm.
- Phát hiện kẹt đường và xử lý.

Auto farm phải sử dụng cùng GameCommands và gameplay rules như điều khiển thủ công.

Không được trực tiếp cộng EXP hoặc tạo vật phẩm.

---

# 7. HỆ THỐNG ĐÁNH QUÁI RƠI VẬT PHẨM

Hiện tại cần hoàn thiện cơ chế loot đúng kiểu MMORPG cổ điển.

## 7.1. Monster Loot

Khi quái chết, hệ thống phải tính:

- EXP.
- Gold.
- Item drops.
- Drop probability.
- Item rarity.
- Item level.
- Monster-specific loot.
- Elite modifiers.
- Boss rewards.

Có seeded RNG để kiểm thử.

## 7.2. Vật phẩm rơi trên mặt đất

Không chỉ tự động thêm vật phẩm vào hành trang.

Phải tạo **Ground Loot Entities**:

- Vật phẩm xuất hiện trên đất tại vị trí quái chết.
- Có icon hoặc sprite phù hợp.
- Có tên vật phẩm.
- Màu tên theo phẩm chất.
- Có hiệu ứng vật phẩm hiếm.
- Có animation rơi nhẹ hoặc xuất hiện.
- Có lifetime hợp lý.
- Có khả năng nhặt.

Tránh các vật phẩm rơi chồng lên nhau khiến không thể chọn.

## 7.3. Nhặt đồ

Hỗ trợ:

- Click nhặt.
- Chạm để nhặt.
- Tự đi lại gần nếu ngoài phạm vi.
- Auto pickup.
- Pickup radius.
- Inventory capacity.
- Stack matching.
- Loot filters.

Khi nhặt:

- Ground entity phải biến mất.
- Inventory được cập nhật.
- Hiển thị thông báo nhận đồ.
- Phát âm thanh pickup.
- Không được nhặt hai lần.
- Không được tạo item trùng vì spam click.

## 7.4. Item Rarity

Có nhiều phẩm chất:

- Thường.
- Tốt.
- Hiếm.
- Quý.
- Cực phẩm.
- Huyền thoại.

Mỗi rarity có:

- Màu riêng.
- Border icon riêng.
- Hiệu ứng rơi riêng khi phù hợp.
- Sound cue đặc biệt với đồ quý.
- Thuộc tính phù hợp.
- Xác suất cân bằng.

Đồ hiếm phải tạo cảm giác phấn khích khi rơi.

---

# 8. HỆ THỐNG VẬT PHẨM VÀ TRANG BỊ PHONG PHÚ

Mục tiêu xây dựng ít nhất 300–500 item definitions có ý nghĩa, sau đó mở rộng thêm bằng random affixes và equipment variants.

Không chỉ tạo item JSON để tăng số lượng.

## 8.1. Các loại item

- Kiếm.
- Đao.
- Thương.
- Côn.
- Ám khí.
- Cung nếu class hỗ trợ.
- Trượng.
- Giáp.
- Áo.
- Mũ.
- Đai.
- Giày.
- Nhẫn.
- Dây chuyền.
- Vòng tay.
- Bùa.
- Thuốc HP.
- Thuốc MP.
- Nguyên liệu.
- Đá cường hóa.
- Ngọc.
- Vật phẩm nhiệm vụ.
- Công thức chế tạo.
- Vật phẩm đặc biệt.

## 8.2. Equipment Attributes

Trang bị có:

- Item level.
- Required level.
- Required class.
- Rarity.
- Element.
- Base stats.
- Bonus stats.
- Random affixes.
- Enhancement level.
- Gem sockets.
- Set ID.
- Durability nếu game design sử dụng.
- Value.

## 8.3. Random Equipment Generation

Khi trang bị rơi ra có thể tạo thuộc tính ngẫu nhiên theo luật:

- Affix pools.
- Item level.
- Rarity.
- Element.
- Allowed item slots.
- Stat ranges.
- Prefix/suffix.
- Drop source.

Không được sinh thuộc tính sai loại item.

Cùng một loại kiếm có thể có nhiều tổ hợp thuộc tính khác nhau.

## 8.4. UI Hành Trang

Thiết kế hành trang đẹp, không phải grid HTML thô.

Có:

- Slot background.
- Item rarity frame.
- Item icon.
- Stack count.
- Enhancement indicator.
- Tooltip.
- Compare equipment.
- Equip.
- Unequip.
- Use.
- Sell.
- Lock.
- Sort.
- Filter.
- Search nếu có nhiều đồ.

Trên PC có tooltip theo hover.

Trên mobile có panel chi tiết khi chạm.

Có icon thực sự phù hợp vật phẩm.

Không dùng cùng một icon chung cho hàng trăm vật phẩm.

---

# 9. HỆ THỐNG CƯỜNG HÓA / ĐẬP ĐỒ HOÀN CHỈNH

Đây là hệ thống trọng tâm và phải có trải nghiệm hấp dẫn.

## 9.1. Giao diện lò rèn

Thiết kế một cửa sổ cường hóa đẹp theo phong cách võ hiệp.

Có:

- NPC thợ rèn.
- Background lò rèn.
- Slot trang bị.
- Các slot nguyên liệu.
- Cấp hiện tại.
- Cấp mục tiêu.
- Thuộc tính trước/sau.
- Tỷ lệ thành công.
- Chi phí bạc.
- Vật liệu bảo vệ.
- Nút cường hóa.
- Lịch sử nâng cấp của phiên.
- Hiệu ứng kết quả.

## 9.2. Enhancement Levels

Thiết kế hệ thống +0 đến +15, có thể cấu hình.

Mỗi cấp có:

- Success rate.
- Currency cost.
- Material requirements.
- Attribute increase.
- Failure consequence.
- Protection rules.

Dùng bảng cân bằng từ game-content.

Không hardcode trong React.

Không hiển thị xác suất khác với xác suất simulation thực sự sử dụng.

## 9.3. Hiệu ứng cường hóa

Quy trình VFX mong muốn:

1. Người chơi đặt trang bị vào lò.
2. Các vật liệu bay hoặc phát sáng vào trung tâm.
3. Lò rèn bắt đầu nóng lên.
4. Ánh sáng tăng dần.
5. Xuất hiện vòng năng lượng.
6. Các hạt lửa/tia sáng.
7. Animation hoàn tất.
8. Hiển thị kết quả.

### Thành công

- Ánh sáng vàng mạnh.
- Hạt sáng bung ra.
- Âm thanh kim loại và âm thanh thành công.
- Trang bị phát sáng.
- Hiển thị +level mới.
- Thuộc tính thay đổi.
- Hiển thị thông báo thành công.

### Thất bại

- Ánh sáng giảm hoặc vỡ.
- Hiệu ứng khói/tia lửa tắt.
- Âm thanh thất bại.
- Hiển thị hậu quả thật theo quy tắc.
- Không giả vờ thành công.

### Cường hóa cấp cao

Ở các mức cao có thể có hiệu ứng đặc biệt:

- Aura.
- Weapon glow.
- Trails.
- Item border animation.

Không biến VFX thành nguồn quyết định kết quả. Simulation phải quyết định trước, animation chỉ thể hiện kết quả.

## 9.4. Logic nâng cấp

Bắt buộc kiểm tra:

- Item ownership.
- Item eligibility.
- Max upgrade level.
- Required materials.
- Currency.
- Protection item.
- RNG outcome.
- Stat changes.
- Item instance update.
- Inventory changes.
- Save consistency.

Không có lỗi double-click tạo kết quả trùng.

Không được mất tiền sai khi thao tác bị từ chối.

Không bị cộng chỉ số nhiều lần khi save/reload.

## 9.5. Luyện hóa và khảm ngọc

Hoàn thiện:

- Khảm ngọc.
- Tháo ngọc.
- Nâng cấp ngọc.
- Luyện lại thuộc tính.
- Bảo vệ thuộc tính.
- Set equipment bonuses.
- Vật liệu hiếm.

Mỗi hệ thống cần UI, gameplay logic, hiệu ứng, dữ liệu và persistence thật.

---

# 10. HỆ THỐNG CHẾ TẠO ĐỒ

Triển khai hệ thống nghề nghiệp và chế tạo.

## 10.1. Nghề nghiệp

- Khai khoáng.
- Hái thuốc.
- Thu thập gỗ.
- Luyện dược.
- Rèn vũ khí.
- Chế tạo giáp.
- Chế tạo phụ kiện.

## 10.2. Resource Gathering

Trên bản đồ có:

- Mỏ quặng.
- Cây thuốc.
- Cây gỗ.
- Tài nguyên quý.
- Resource respawn.
- Gathering interaction.
- Gathering rewards.

## 10.3. Crafting

Có:

- Recipes.
- Materials.
- Currency costs.
- Profession levels.
- Unlock conditions.
- Success rules nếu có.
- Crafted item attributes.
- Profession EXP.

UI chế tạo cần đẹp và dễ sử dụng.

Không cho chế tạo khi thiếu nguyên liệu.

Không được nhân đôi nguyên liệu hoặc sản phẩm.

---

# 11. CỬA HÀNG NPC ĐẸP VÀ ĐẦY ĐỦ

Hiện tại cần xây dựng cửa hàng như một hệ thống thực sự.

## 11.1. NPC Merchants

Các loại NPC:

- Người bán vũ khí.
- Người bán giáp.
- Người bán thuốc.
- Người bán nguyên liệu.
- Người bán ngọc.
- Thợ rèn.
- Thợ chế tạo.
- Thương nhân đặc biệt.
- Người quản lý kho.

## 11.2. Shop UI

Giao diện theo phong cách fantasy MMORPG cổ điển.

Có:

- Ảnh/chân dung NPC.
- Tên cửa hàng.
- Danh mục.
- Danh sách vật phẩm.
- Item icons.
- Giá.
- Số lượng.
- Tooltip.
- So sánh trang bị.
- Buy.
- Sell.
- Buyback nếu hỗ trợ.
- Currency balance.
- Inventory capacity.
- Stock status.

Không dùng giao diện bảng dữ liệu kiểu dashboard quản trị.

Cửa hàng phải mang cảm giác là một phần của thế giới game.

## 11.3. Buy/Sell

Mua vật phẩm:

- Kiểm tra tiền.
- Kiểm tra số lượng.
- Kiểm tra slot.
- Trừ tiền.
- Nhận item.
- Cập nhật UI.
- Phát SFX.
- Lưu tiến trình.

Bán vật phẩm:

- Kiểm tra ownership.
- Kiểm tra item lock.
- Tính giá.
- Trừ item.
- Cộng tiền.
- Cập nhật UI.
- Lưu tiến trình.

Không cho xuất hiện duplication exploit.

## 11.4. Kho đồ

Xây dựng warehouse NPC.

Có:

- Kho nhân vật.
- Gửi đồ.
- Rút đồ.
- Sắp xếp.
- Lọc.
- Mở rộng slot.
- Lưu state.

---

# 12. NHIỀU NPC HƠN VÀ THẾ GIỚI SỐNG ĐỘNG

NPC không chỉ đứng yên làm cảnh.

## 12.1. Các loại NPC

- Trưởng thôn.
- Chủ tiệm.
- Thợ rèn.
- Thầy dạy võ.
- Sư phụ môn phái.
- Thương nhân.
- Người giao nhiệm vụ.
- Lính gác.
- Người dẫn đường.
- Người truyền tống.
- Người quản lý kho.
- Người chế tạo.
- Người thu mua.
- NPC đối thoại.
- Người dân.
- NPC đồng hành.
- NPC võ sĩ.
- NPC bí ẩn.

## 12.2. NPC Interaction

Có:

- Hover/selection feedback.
- Click interaction.
- Dialogue.
- Multiple choices.
- Quest acceptance.
- Shop.
- Training.
- Enhancement.
- Crafting.
- Teleport.
- Warehouse.

NPC interaction phải dùng GameCommands hoặc hệ thống interaction phù hợp.

Không để NPC chỉ hiển thị câu thoại vô nghĩa.

## 12.3. NPC Behavior

Các NPC môi trường có thể:

- Đi tuần.
- Đứng gác.
- Dạo phố.
- Đi đến vị trí định sẵn.
- Phản ứng khi người chơi đến gần.
- Đổi animation.
- Hoạt động theo game clock.

Cần tối ưu AI NPC ngoài viewport.

## 12.4. NPC Content

Mỗi thành thị cần có các dịch vụ chính.

Mỗi môn phái cần có sư phụ và nhiệm vụ riêng.

Mỗi khu vực luyện cấp cần ít nhất một số điểm tương tác hoặc khám phá có ý nghĩa.

---

# 13. NHÂN VẬT, MÔN PHÁI VÀ NGŨ HÀNH

Phát triển hệ thống 10 môn phái võ hiệp:

- Thiếu Lâm.
- Thiên Vương.
- Đường Môn.
- Ngũ Độc.
- Nga Mi.
- Thúy Yên.
- Cái Bang.
- Thiên Nhẫn.
- Võ Đang.
- Côn Lôn.

Mỗi môn phái có:

- Ngũ hành.
- Vũ khí.
- Gameplay identity.
- Stats ưu tiên.
- Nhánh kỹ năng.
- Skills chủ động.
- Passive skills.
- Buff/debuff.
- Khu vực môn phái.
- NPC sư phụ.
- Nhiệm vụ môn phái.

Không chỉ đổi tên nhân vật và thay màu kỹ năng.

## 13.1. Character Progression

Có:

- Cấp độ.
- EXP.
- HP/MP.
- Điểm tiềm năng.
- Điểm kỹ năng.
- Thuộc tính.
- Attack.
- Defense.
- Accuracy.
- Evasion.
- Critical.
- Elemental resistance.
- Attack speed.
- Movement speed.

## 13.2. Skill Trees

Có:

- Nhiều nhánh.
- Học kỹ năng.
- Nâng skill.
- Skill prerequisites.
- Skill levels.
- Skill point spending.
- Skill reset theo quy tắc.

## 13.3. Ngũ hành

Triển khai:

- Kim.
- Mộc.
- Thủy.
- Hỏa.
- Thổ.

Có tương sinh, tương khắc, kháng, sát thương hệ và các ảnh hưởng của trang bị.

Toàn bộ công thức phải có test.

---

# 14. HIỆU ỨNG KỸ NĂNG VÀ CHIẾN ĐẤU

Hiện tại kỹ năng quá thô.

Phải có hệ thống VFX thực sự.

## 14.1. Skill Effect Engine

Hỗ trợ:

- Projectile.
- Slash trail.
- Aura.
- Explosion.
- AoE.
- Beam.
- Chain attack.
- Heal.
- Shield.
- Buff.
- Debuff.
- Poison.
- Fire.
- Ice.
- Lightning.
- Ground impact.
- Hit flash.
- Critical effect.

## 14.2. Các bước chiến đấu

Một skill nên có các event:

- CastStarted.
- CastCompleted.
- ProjectileSpawned.
- DamageApplied.
- StatusEffectApplied.
- TargetDied.

Renderer sẽ dùng các event để tạo VFX.

Không tính damage trực tiếp trong animation.

## 14.3. Combat Feel

Có:

- Hit sound.
- Weapon trails.
- Impact particles.
- Floating damage.
- Critical indicators.
- Hit reaction.
- Camera feedback.
- Target highlight.
- Enemy HP bars.
- Boss HP bars.
- Skill cooldown overlays.

Tối ưu hiệu ứng theo thiết bị.

---

# 15. NÂNG CẤP ĐỒ HỌA VÀ ANIMATION

Phong cách game phải nhất quán.

## 15.1. Visual Target

Mục tiêu hướng tới:

- Võ hiệp 2D Isometric cổ điển.
- Nhân vật chi tiết.
- Nhà cửa đẹp.
- Môi trường có chiều sâu.
- Sprite animation đầy đủ.
- Hiệu ứng võ công đẹp.
- UI đậm chất MMORPG.
- Vật phẩm nhận diện dễ dàng.

Không giữ đồ họa placeholder làm thành phẩm.

## 15.2. Rendering Technology

Kiểm tra Phaser hiện tại.

Ưu tiên tiếp tục sử dụng Phaser nếu đáp ứng được mục tiêu.

Không thay engine chỉ vì hy vọng đồ họa sẽ tự đẹp hơn.

Nếu cần, nâng cấp:

- WebGL rendering.
- Texture atlas.
- Sprite animation.
- Particle systems.
- Shader effects.
- Dynamic lighting phù hợp 2D.
- Depth sorting.
- Camera.
- Scene transitions.
- Asset streaming.

Chỉ cân nhắc PixiJS hoặc engine khác khi có benchmark và kế hoạch migration cụ thể.

## 15.3. Asset Pipeline

Thiết kế pipeline dùng:

- Blender hoặc phần mềm đồ họa để tạo nguyên mẫu 3D nếu phù hợp.
- Render 8 hướng thành sprite.
- Export sprite sheets.
- Texture packing.
- Atlas metadata.
- Animation manifest.
- Phaser integration.

Concept art không được coi là sprite game sản xuất.

Nếu thiếu tài nguyên thật, ghi rõ asset nào đang thiếu và xây dựng pipeline thay thế.

Không báo cáo đồ họa hoàn thành nếu vẫn dùng placeholder.

---

# 16. THIẾT KẾ LẠI GIAO DIỆN PC VÀ MOBILE

Ảnh gameplay hiện tại cho thấy header/footer quá lớn.

## 16.1. Fullscreen Gameplay

Loại bỏ header/footer website cố định trong màn hình gameplay.

Game phải sử dụng toàn bộ visual viewport khả dụng.

HUD hiển thị dạng overlay.

Không bị mất chiều cao bởi navigation bar của ứng dụng web.

## 16.2. PC HUD

Có:

- Character portrait.
- HP/MP.
- EXP.
- Level.
- Minimap.
- Quest tracker.
- Skill bar.
- Inventory button.
- Character button.
- World map.
- Menu.
- Target HP.
- Status effects.

## 16.3. Mobile HUD

Có:

- Compact portrait.
- Compact HP/MP.
- Small minimap.
- Collapsible quests.
- Joystick.
- Attack.
- Skill buttons.
- Auto farm.
- Potions.
- Inventory quick access.
- Menu.

Các nút phải phù hợp touch.

Không để HUD che quá nhiều gameplay.

Có chế độ thu gọn HUD.

## 16.4. UI Artwork

Thiết kế:

- Khung tối.
- Viền đồng/vàng.
- Hoa văn võ hiệp.
- Icon đồng nhất.
- Tooltip đẹp.
- Animation mở cửa sổ.
- Modal transitions.
- Item rarity decorations.

Giao diện hành trang, cửa hàng, cường hóa, chế tạo và kỹ năng phải được thiết kế riêng, không chỉ tái sử dụng một modal chung không phù hợp nội dung.

---

# 17. ÂM THANH GAME

Âm thanh hiện tại chưa đáp ứng yêu cầu.

Phải cải thiện:

- Music quality.
- SFX quality.
- Audio mixing.
- Music transitions.
- Environment ambience.
- Combat feedback.

## 17.1. Background Music

Có nhạc riêng cho:

- Menu.
- Tân thủ thôn.
- Thành thị.
- Rừng.
- Núi.
- Hang động.
- Chiến đấu.
- Boss.
- Chiến thắng.

Ưu tiên nhạc võ hiệp phương Đông.

## 17.2. Sound Effects

Có:

- Footsteps.
- Sword slash.
- Impact.
- Skill cast.
- Monster hit.
- Monster death.
- Loot pickup.
- Level up.
- Item equip.
- Shop buy/sell.
- Enhancement success/failure.
- Crafting.
- Quest complete.
- UI feedback.

## 17.3. Audio System

Có:

- Master volume.
- Music volume.
- SFX volume.
- Ambient volume.
- Mute.
- Audio fade.
- Audio priority.
- Sound variation.
- Resource cleanup.

Không phát âm thanh lặp gây khó chịu.

Không để nhiều âm thanh kỹ năng chồng lên nhau không kiểm soát.

---

# 18. NHIỆM VỤ VÀ CỐT TRUYỆN

Triển khai:

- Main story.
- Side quests.
- Sect quests.
- Daily-style quests theo game clock.
- Monster farming quests.
- Boss quests.
- Exploration quests.
- Crafting quests.
- Dungeon quests.

Mỗi quest có:

- ID.
- NPC.
- Requirements.
- Objectives.
- Rewards.
- Dialogue.
- Progress.
- Completion rules.

Có chuỗi nhiệm vụ chính xuyên qua nhiều khu vực.

Người chơi mới phải có tutorial tự nhiên thông qua nhiệm vụ.

Ví dụ:

1. Gặp trưởng thôn.
2. Nhận nhiệm vụ luyện võ.
3. Đánh quái đầu tiên.
4. Nhặt vật phẩm.
5. Trang bị vũ khí.
6. Mua thuốc.
7. Học kỹ năng.
8. Gặp thợ rèn.
9. Cường hóa lần đầu.
10. Đến bản đồ luyện cấp tiếp theo.
11. Gia nhập môn phái.
12. Mở khóa hoạt động mới.

Tutorial phải dạy gameplay thực tế.

Không chỉ là các hộp thoại hướng dẫn.

---

# 19. BOSS, PHÓ BẢN VÀ HOẠT ĐỘNG

## Boss

Mỗi boss cần có:

- Sprite riêng.
- HP bar.
- Kỹ năng.
- AI riêng.
- Nhiều phase khi phù hợp.
- Telegraph.
- Loot đặc biệt.
- EXP.
- Respawn rules.

## Dungeon

Có:

- Lối vào.
- Entry conditions.
- Quái.
- Boss.
- Objectives.
- Rewards.
- Completion.
- Exit.
- Save rules.

## Hoạt động offline

Có thể mở rộng:

- Võ lâm đại hội với NPC.
- Arena.
- Boss thế giới.
- Đồng hành.
- Bang hội NPC.
- Công thành mô phỏng.
- Săn kho báu.
- Chế tạo đặc biệt.
- Thú cưỡi.

Các hoạt động phải có tiến trình và phần thưởng thực tế.

---

# 20. HỆ THỐNG SAVE GAME

Duy trì IndexedDB offline.

Lưu đầy đủ:

- Character.
- Stats.
- Level.
- EXP.
- Map.
- Position.
- Skills.
- Equipment.
- Inventory.
- Gold.
- Warehouse.
- Enhancement state.
- Item affixes.
- Gem sockets.
- Crafting progress.
- Profession progress.
- Quest progress.
- Boss progress.
- Companion state.
- World state.
- Settings.

Có:

- Autosave.
- Manual save.
- Export.
- Import.
- Backup.
- Migration.
- Validation.
- Corrupted save recovery.

Không xóa dữ liệu nhân vật khi cập nhật phiên bản.

Tạo backup trước migration quan trọng.

---

# 21. GIỮ KHẢ NĂNG CHUYỂN SANG ONLINE

Đây là yêu cầu bắt buộc.

Game vẫn offline, không cần triển khai server online ngay.

Nhưng gameplay logic phải độc lập browser.

Duy trì:

- Shared TypeScript game-core.
- Fixed simulation tick.
- GameCommand.
- GameEvent.
- GameSnapshot.
- LocalGameSession.
- GameSession interface.
- Data-driven content.
- Seeded RNG.
- Versioned serialization.

Tất cả hệ thống mới như:

- Drop items.
- Enhancement.
- Crafting.
- Shop transactions.
- Equipment.
- Quest rewards.
- Character progression.
- Combat.
- Movement.

Phải nằm trong authoritative game simulation hoặc các domain services tương đương, không nằm trong React UI.

Sau này có thể thay LocalGameSession bằng RemoteGameSession, với Colyseus hoặc network server adapter.

Offline saves không được mặc định trở thành dữ liệu online được server tin tưởng.

Không viết lại toàn bộ game-core khi chuyển online.

---

# 22. CHỈ TIÊU NỘI DUNG

Mục tiêu cho bản Full Offline RPG:

| Thành phần | Mục tiêu |
|---|---:|
| Bản đồ có thể chơi | 40+ |
| Thành thị/làng | 6+ |
| Bản đồ môn phái | 10 |
| Bãi luyện cấp | 16+ |
| Monster definitions | 100–120+ |
| Boss | 20+ |
| Item definitions | 300–500+ |
| Kỹ năng | 100+ |
| Môn phái | 10 |
| Quest | 100+ |
| Dungeon | 6+ |
| NPC có vai trò | Nhiều loại |
| Character slots | 5+ |
| Max character level | 100+ |
| Enhancement | +0 đến +15 |
| Professions | 6+ |
| Ngũ hành | 5 hệ |

Đây là mục tiêu sản phẩm đầy đủ, không bắt buộc hoàn thành trong một phiên Codex.

Mỗi mục phải có định nghĩa hoàn thành rõ ràng.

Không tạo nội dung rác để đủ số lượng.

Một item chỉ được tính là hoàn thành khi có dữ liệu hợp lệ, tài nguyên hiển thị, cách nhận hoặc sử dụng trong gameplay và hành vi đúng.

Một bản đồ chỉ được tính là hoàn thành khi người chơi có thể đến, di chuyển, tương tác, khám phá và thực hiện các hoạt động dự kiến.

---

# 23. PERFORMANCE

Game phải tối ưu cho PC và mobile.

## Target

PC:

- Mục tiêu 60 FPS trong gameplay thông thường trên máy tham chiếu phù hợp.

Mobile:

- Mục tiêu 30 FPS ổn định trên điện thoại tầm trung.
- Có lựa chọn 60 FPS khi thiết bị đủ mạnh.

## Optimization

Có:

- Viewport culling.
- Chunk streaming.
- Entity spatial partitioning.
- AI activation radius.
- Texture atlas.
- Asset caching.
- Animation pooling khi phù hợp.
- VFX pooling.
- Texture cleanup.
- Adaptive quality.
- Memory profiling.
- Simulation profiling.

Không để tăng số lượng quái hoặc bản đồ làm FPS giảm nghiêm trọng.

Phải benchmark cảnh có nhiều quái, NPC và hiệu ứng đồng thời.

Không khẳng định đạt FPS trên mobile chỉ dựa vào Chromium headless.

---

# 24. KIỂM THỬ TOÀN BỘ GAMEPLAY

Không chỉ test unit.

Phải kiểm thử gameplay thực tế.

## Character Creation

- Lần đầu vào game phải tạo nhân vật.
- Đặt tên.
- Chọn ngoại hình.
- Chọn môn phái.
- Save.
- Reload.
- Chọn đúng nhân vật.

## World

- Di chuyển trên bản đồ lớn.
- Không xuyên tường.
- Không giật camera.
- Chuyển map.
- NPC hoạt động.
- Monster spawning.
- Pathfinding.

## Farming

- Đánh quái.
- Nhận EXP.
- Lên cấp.
- Quái rơi item.
- Item xuất hiện dưới đất.
- Nhặt item.
- Item vào inventory.
- Monster respawn.
- Auto farm.

## Equipment

- Equip.
- Unequip.
- Stats update.
- Random affixes.
- Enhancement.
- Gem socketing.
- Refinement.
- Save/reload.

## Shop

- Buy.
- Sell.
- Inventory capacity.
- Money validation.
- Item quantity.
- Transaction consistency.

## Crafting

- Gather.
- Consume materials.
- Craft.
- Receive item.
- Profession EXP.
- Save/reload.

## Quests

- Accept.
- Update objectives.
- Complete.
- Receive reward.
- Cannot claim twice.

## Offline

- Load assets.
- Disconnect Internet.
- Continue gameplay.
- Transition between cached maps.
- Save.
- Reload offline.

## Mobile

- Joystick.
- Multi-touch.
- Skill usage.
- NPC interaction.
- Loot pickup.
- Inventory.
- Enhancement.
- Crafting.
- Shop.

Không sử dụng debug hooks để gian lận EXP, item hoặc tiền trong end-to-end gameplay tests.

Unit tests có thể tạo fixtures có kiểm soát.

---

# 25. THỨ TỰ TRIỂN KHAI

Triển khai theo dependency, nhưng giữ mục tiêu hoàn thành toàn bộ game.

## PHASE 1 — CORE GAME EXPERIENCE

- Character creation.
- Character selection.
- Fullscreen gameplay UI.
- Smooth movement.
- Camera improvements.
- Monster farming.
- Ground loot.
- EXP progression.
- Save/load.

## PHASE 2 — OPEN WORLD

- Large maps.
- Chunk streaming.
- Many regions.
- Portals.
- World map.
- NPC population.
- Spawn zones.
- Environment improvements.

## PHASE 3 — COMPLETE ITEM SYSTEM

- Inventory redesign.
- Equipment UI.
- Item rarity.
- Random attributes.
- Loot tables.
- Equipment comparison.
- Item visual assets.

## PHASE 4 — ECONOMY SYSTEMS

- NPC shops.
- Buy/sell.
- Warehouse.
- Enhancement.
- Gem socketing.
- Refinement.
- Crafting.
- Gathering.

## PHASE 5 — COMBAT & ART

- Character animations.
- Monster animations.
- Skill VFX.
- Audio.
- Combat feedback.
- Boss mechanics.
- Class skills.
- Elemental combat.

## PHASE 6 — RPG CONTENT

- 10 sects.
- Quest chains.
- Dungeons.
- Larger monster catalog.
- Item expansion.
- World activities.
- Companions.
- Advanced progression.

## PHASE 7 — FULL GAME POLISH

- Art consistency.
- Audio consistency.
- Balance.
- Performance.
- UI animations.
- Mobile optimization.
- Save migration.
- Offline reliability.
- Browser compatibility.
- Regression tests.

Các phase là trình tự phát triển, không phải lý do để bỏ các yêu cầu còn lại.

---

# 26. DEFINITION OF DONE — KHÔNG ĐƯỢC LÀM GIẢ

Một tính năng chỉ hoàn thành khi:

1. Có implementation.
2. Có UI thực tế nếu cần.
3. Có game logic.
4. Có asset phù hợp.
5. Có interaction.
6. Có save/load nếu ảnh hưởng persistent state.
7. Có test.
8. Hoạt động PC.
9. Hoạt động mobile.
10. Không phá tính năng khác.
11. Có tài liệu.
12. Có thể chuyển sang authoritative online simulation nếu liên quan gameplay.

Không được:

- Tạo UI mà không có logic.
- Tạo logic mà không tích hợp gameplay.
- Tạo item mà không có cách nhận/sử dụng.
- Tạo map trống.
- Tạo NPC vô dụng.
- Tạo boss chỉ có nhiều HP.
- Tạo kỹ năng chỉ thay màu.
- Giữ placeholder nhưng báo cáo production-ready.
- Báo cáo hoàn thành khi test đang lỗi.
- Tuyên bố đã chơi thử thực tế nếu chỉ chạy unit tests.

---

# 27. YÊU CẦU KHI BÁO CÁO

Sau mỗi phase, cung cấp:

### A. Đã hoàn thành

Liệt kê các hệ thống đã hoạt động thực sự.

### B. Số liệu

Báo cáo:

- Số bản đồ playable.
- Số quái.
- Số boss.
- Số item.
- Số kỹ năng.
- Số NPC.
- Số quest.
- Số asset production-ready.
- Số asset placeholder còn thiếu.

### C. Testing

Báo cáo chính xác:

- Typecheck.
- Lint.
- Unit tests.
- Integration tests.
- E2E tests.
- Browser screenshots.
- FPS/memory nếu đã đo được.

### D. Vấn đề

Báo cáo:

- Lỗi chưa sửa.
- Tính năng chưa hoàn thành.
- Nội dung chưa tích hợp.
- Asset đang thiếu.
- Vấn đề hiệu năng.
- Những điểm cần kiểm tra trên điện thoại thật.

### E. Tiếp tục

Cập nhật roadmap và thứ tự công việc tiếp theo.

Không tự ý loại bỏ yêu cầu vì phiên làm việc kết thúc.

Không khẳng định đang tiếp tục chạy nền khi không có tiến trình thực thi thật.

---

# 28. YÊU CẦU CUỐI CÙNG

Tôi muốn sau quá trình phát triển có thể trải nghiệm game theo hành trình sau:

**Mở website lần đầu → Tạo nhân vật → Đặt tên → Chọn môn phái → Vào tân thủ thôn → Nhận nhiệm vụ → Đi khám phá bản đồ rộng lớn → Đánh nhiều quái → Nhận EXP → Lên cấp → Nhặt đồ rơi trên đất → Có cơ hội nhận trang bị hiếm → Quay về thành → Mua thuốc → Bán đồ → Gửi kho → Gặp thợ rèn → Cường hóa trang bị với hiệu ứng đẹp → Khảm ngọc → Thu thập nguyên liệu → Chế tạo đồ → Học võ công mới → Đến nhiều bản đồ luyện cấp → Đánh boss → Săn trang bị cực phẩm → Khám phá thế giới võ hiệp rộng lớn.**

Tất cả phải thực sự hoạt động.

Game phải mang cảm giác MMORPG võ hiệp cổ điển, không phải web app được trang trí theo chủ đề võ hiệp.

Ưu tiên đặc biệt:

1. Chất lượng trải nghiệm như một game thực sự.
2. Bản đồ lớn và nhiều khu vực khám phá.
3. Nhiều quái để luyện cấp.
4. Rơi đồ thật và săn vật phẩm hiếm.
5. Cường hóa có hiệu ứng hấp dẫn.
6. Cửa hàng đẹp và mua bán thực sự.
7. Nhân vật di chuyển mượt.
8. Animation và kỹ năng đẹp.
9. UI mobile/PC chuyên nghiệp.
10. Offline ổn định và online-ready.

**HÃY BẮT ĐẦU NGAY BẰNG VIỆC AUDIT SOURCE CODE HIỆN TẠI, SAU ĐÓ TRIỂN KHAI THỰC TẾ CÁC HỆ THỐNG ĐANG THIẾU.**

Không tạo project mới.

Không chỉ trả về phân tích.

Không tự rút gọn phạm vi sản phẩm.

Không dừng ở một bản demo.

Không tự tuyên bố game hoàn chỉnh khi các hệ thống bắt buộc chưa đạt nghiệm thu.

Mục tiêu cuối cùng là **KIẾM HIỆP WEB — FULL OFFLINE RPG**, với chất lượng, chiều sâu gameplay và phong cách trải nghiệm gần với một game Võ Lâm Truyền Kỳ cổ điển hoàn chỉnh nhất có thể, đồng thời sẵn sàng phát triển thành MMORPG Online trong tương lai.