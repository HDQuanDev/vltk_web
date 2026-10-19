# MASTER PROMPT — KIẾM HIỆP WEB
## FULL GAME OVERHAUL — VISUAL QUALITY, OPEN WORLD, COMPLETE RPG SYSTEMS
### Tái cấu trúc chất lượng sản phẩm, hoàn thiện gameplay offline và bảo toàn khả năng mở rộng MMORPG Online

---

# PHẦN 1. BỐI CẢNH DỰ ÁN

Bạn đang tiếp tục phát triển một dự án game võ hiệp 2D Isometric chạy trên Web, hỗ trợ máy tính và điện thoại.

Dự án đã có một vertical slice v0.1.0 bao gồm một phần của các hệ thống:

- Phaser renderer.
- React UI.
- TypeScript game-core độc lập.
- LocalGameSession.
- Character creation.
- Movement/pathfinding.
- Monster AI.
- Combat cơ bản.
- Skills cơ bản.
- Inventory/equipment cơ bản.
- Quest cơ bản.
- IndexedDB save.
- PWA.
- Automated testing.

Bản game có thể chơi thử, nhưng chất lượng sản phẩm chưa đáp ứng mục tiêu.

Người dùng nhận thấy:

1. Header và footer đang chiếm nhiều diện tích màn hình, đặc biệt trên mobile landscape.
2. Giao diện HUD chưa đẹp và chưa được tối ưu như game thực tế.
3. Sprite nhân vật còn thô, ít chi tiết.
4. Bản đồ nhỏ, di chuyển một đoạn đã hết khu vực.
5. Bản đồ thiếu mật độ vật thể và yếu tố khám phá.
6. Nhà cửa, cây cối, vật thể chưa có chất lượng hình ảnh đủ tốt.
7. Kỹ năng thiếu hiệu ứng hình ảnh rõ ràng.
8. Đánh quái chưa có cảm giác va chạm và uy lực.
9. Âm thanh, nhạc nền và hiệu ứng nghe chưa hay.
10. Hình ảnh vật phẩm, icon, trang bị chưa bắt mắt.
11. Chưa có hệ thống cường hóa/đập đồ hoàn chỉnh.
12. Chưa có chế tạo vật phẩm hoàn chỉnh.
13. Chưa có cửa hàng và hệ thống mua bán đầy đủ.
14. Còn thiếu nhiều hệ thống RPG quan trọng khác.
15. Game chưa có thế giới và nội dung đủ lớn để chơi lâu dài.

## MỤC TIÊU CUỐI CÙNG

Phát triển dự án thành một game nhập vai võ hiệp offline đầy đủ, có thế giới lớn, hệ thống môn phái, võ công, trang bị, kinh tế, chế tạo, nhiệm vụ, boss, đồng hành, phó bản và hoạt động dài hạn.

Tham khảo cảm giác chơi của MMORPG võ hiệp cổ điển như Võ Lâm Truyền Kỳ 1, nhưng không sao chép tài nguyên độc quyền.

Game phải có chất lượng trình bày tương đương một sản phẩm độc lập nghiêm túc, không phải prototype sử dụng hình khối và icon placeholder.

Các phiên bản phát triển là mốc kiểm tra, không được tự ý hạ phạm vi cuối cùng xuống MVP.

Không tuyên bố hoàn thành sản phẩm khi vẫn thiếu những tính năng, nội dung hoặc tài nguyên bắt buộc.

---

# PHẦN 2. CÁCH LÀM VIỆC

## 2.1. Không tạo project mới

Kiểm tra và tiếp tục trực tiếp trong repository hiện tại.

Trước khi sửa, đọc:

- package.json và workspace definitions.
- Game core.
- Renderer.
- Scene management.
- GameSession.
- Game commands.
- Content definitions.
- Game assets.
- Inventory/equipment.
- UI components.
- Save/load.
- Tests.
- Roadmap.
- Architecture documentation.

Xác định cấu trúc code và conventions hiện tại.

Tái sử dụng các hệ thống đã hoạt động tốt.

Không tạo một architecture song song chỉ vì dễ code hơn.

Nếu cần thay đổi kiến trúc, phải chỉ rõ:

- Lý do.
- Những file liên quan.
- Lợi ích.
- Rủi ro.
- Cách migration.
- Test regression.

## 2.2. Đánh giá trung thực

Không được:

- Dùng button giả.
- Chỉ vẽ giao diện chức năng mà không có logic.
- Tạo dữ liệu trang trí rồi tuyên bố đã có hệ thống.
- Đổi nhãn hoặc màu sprite rồi gọi là thêm loại quái mới.
- Tạo map rất lớn nhưng trống rỗng.
- Thêm 100 kỹ năng chỉ khác ID.
- Dùng ảnh tĩnh làm game world giả.
- Che lỗi bằng fallback không có thông báo.
- Bỏ qua các test lỗi.
- Đánh dấu hoàn thành khi mới build thành công.

## 2.3. Tài liệu đầu ra

Trước khi triển khai, tạo hoặc cập nhật:

- docs/audit/visual-review.md
- docs/audit/gameplay-gaps.md
- docs/architecture/rendering.md
- docs/architecture/world-streaming.md
- docs/design/art-bible.md
- docs/design/audio-bible.md
- docs/design/ui-ux.md
- docs/design/item-economy.md
- docs/design/gameplay-systems.md
- docs/roadmap/full-release.md
- docs/IMPLEMENTATION_STATUS.md

Tài liệu và báo cáo bằng tiếng Việt.

Tên class, interface, function và file bằng tiếng Anh.

Tiếp tục viết code sau bước audit, không dừng ở việc tạo tài liệu.

---

# PHẦN 3. NÂNG CẤP GAME ENGINE VÀ RENDERING

## 3.1. Audit renderer hiện tại

Kiểm tra Phaser đang dùng phiên bản nào, renderer đang chạy WebGL hay Canvas fallback, cách quản lý texture, sprite, camera, effects, depth sorting và tilemap.

Đánh giá:

- Texture batching.
- Sprite atlas.
- Draw calls.
- Texture memory.
- Alpha blending.
- Isometric depth ordering.
- Foreground occlusion.
- Camera movement.
- Object culling.
- Resource loading/unloading.
- Garbage collection.
- Render resolution.
- High DPI scaling.

Không đổi Phaser chỉ vì cho rằng một engine khác sẽ đẹp hơn.

Phân tích khả năng:

A. Tiếp tục sử dụng Phaser và nâng cấp render pipeline.

B. Sử dụng PixiJS làm renderer thay thế nếu benchmark chứng minh cần thiết.

C. Xây dựng custom rendering layer chỉ khi có yêu cầu cụ thể mà các lựa chọn trên không xử lý tốt.

Nếu Phaser hiện tại đáp ứng được mục tiêu, tiếp tục sử dụng Phaser.

Không viết lại game-core.

## 3.2. Rendering architecture

Tách các lớp:

- WorldRenderer.
- EntityRenderer.
- TerrainRenderer.
- PropRenderer.
- CharacterRenderer.
- AnimationController.
- CombatVFXRenderer.
- EnvironmentEffectsRenderer.
- LightingController.
- CameraController.
- AssetManager.
- RenderQualityManager.

Chỉ tạo abstraction khi có mục đích thực tế; không bắt buộc một class cho mọi tên trên.

Game logic không phụ thuộc các renderer.

Renderers đọc snapshots và visual events.

## 3.3. Camera chuyên nghiệp

Hỗ trợ:

- Smooth follow.
- Camera dead zone.
- Camera bounds.
- Zoom thích ứng thiết bị.
- Screen shake có giới hạn.
- Camera transitions.
- Map transition.
- Focus target.
- Camera reset.
- Accessibility: giảm chuyển động.
- Giới hạn tốc độ camera.
- Pixel-perfect hoặc subpixel rendering phù hợp asset style.

Camera không được lộ vùng ngoài map.

Không làm nhân vật luôn bị che bởi các HUD panels.

## 3.4. Hiệu ứng môi trường

Triển khai khi phù hợp:

- Ambient lighting.
- Day/night tint.
- Fog.
- Rain.
- Snow.
- Leaves.
- Water animation.
- Fire/torch animation.
- Dust.
- Moving shadows.
- Environmental particles.
- Weather transitions.

Hiệu ứng môi trường phải được tối ưu theo thiết bị.

Không dùng postprocessing toàn màn hình quá nặng trên smartphone.

## 3.5. Performance mode

Cung cấp:

- Low.
- Medium.
- High.
- Auto.

Cho phép cấu hình:

- FPS cap.
- Particle density.
- Weather effects.
- Shadows.
- Resolution scale.
- Floating damage numbers.
- Ambient animation.
- Screen shake.

Thiết lập hiệu năng không được làm thay đổi simulation gameplay.

---

# PHẦN 4. XÂY DỰNG ART PIPELINE CHUYÊN NGHIỆP

Đây là một trong những yêu cầu quan trọng nhất.

Không được tiếp tục coi placeholder hiện tại là asset sản xuất.

## 4.1. Art direction

Xây dựng art bible riêng cho game.

Phong cách mục tiêu:

- Võ hiệp phương Đông cổ điển.
- Góc nhìn 2D Isometric.
- Bản đồ và nhân vật có chiều sâu.
- Chi tiết kiến trúc rõ.
- Màu sắc hài hòa.
- Không khí giang hồ.
- Phong cách nhất quán giữa các môn phái.
- Hiệu ứng võ công nổi bật nhưng không che khuất gameplay.

Chọn một phong cách duy nhất cho production assets, không trộn low-poly, flat vector, pixel-art và tranh minh họa không đồng bộ.

## 4.2. Asset specification

Định nghĩa:

- Tile projection.
- Tile dimensions.
- World units.
- Sprite canvas size.
- Feet anchor.
- Sprite origin.
- Character scale.
- NPC scale.
- Monster scale.
- Prop scale.
- Animation frame convention.
- Frame naming.
- Sprite atlas convention.
- Asset IDs.
- Atlas metadata.
- Direction mapping.
- Animation duration.

Ví dụ có thể chọn logical tile 64×32 cho Isometric, nhưng phải xác minh sự tương thích với bản đồ và renderer hiện tại trước khi chốt.

Không ép scale asset sai tỷ lệ chỉ để vừa ô.

## 4.3. Character sprite pipeline

Hỗ trợ 8 hướng:

- N.
- NE.
- E.
- SE.
- S.
- SW.
- W.
- NW.

Các animation:

- Idle.
- Walk.
- Run.
- Normal attack.
- Skill cast.
- Hit.
- Death.
- Revive.
- Interaction.
- Mounted idle.
- Mounted movement.

Không bắt buộc tất cả nhân vật có mounted animations ngay nếu hệ thống thú cưỡi chưa hoàn thiện, nhưng pipeline phải hỗ trợ.

Có hệ thống:

- Animation state.
- Direction selection.
- Sprite sheet loading.
- Animation blending hoặc transitions phù hợp 2D.
- Shadow sprite.
- Weapon overlays.
- Armor appearance.
- Visual equipment layers.

Asset pipeline phải cho phép thay sprite mà không thay gameplay logic.

## 4.4. Asset production thực tế

Nếu môi trường có công cụ tạo hình ảnh/asset, có thể dùng để tạo nguồn hình ảnh gốc hợp pháp.

Tuy nhiên phải phân biệt:

- Concept art.
- Sprite sheet.
- Animation frames.
- Tileable textures.
- Tileset.
- UI icons.
- VFX textures.
- Production assets.

Một ảnh concept không tự động là sprite sheet có thể sử dụng.

Phải chuẩn hóa kích thước, pivot, nền trong suốt, các frame animation và metadata.

Không tạo sprite animation bằng cách cắt tùy tiện một bức tranh có phối cảnh không nhất quán.

Nếu không có công cụ tạo asset, phải tạo asset specifications và manifest, báo cáo thiếu asset để bổ sung từ pipeline bên ngoài.

Không tuyên bố asset đã hoàn thiện khi vẫn dùng placeholder.

## 4.5. Asset quality gates

Kiểm tra:

- Asset reference tồn tại.
- Atlas metadata hợp lệ.
- Animation frames đủ.
- Frame dimension thống nhất.
- Feet anchor nhất quán.
- Không bị viền trắng/đen.
- Không mất transparency.
- Không méo khi đổi hướng.
- Không sai scale.
- Không xuất hiện texture bleeding.

Tạo trang nội bộ để preview sprite và animation.

---

# PHẦN 5. THIẾT KẾ LẠI UI PC VÀ MOBILE

## 5.1. Xóa header/footer cố định khỏi gameplay

Đây là yêu cầu bắt buộc.

Không tiếp tục đặt website header và footer chiếm chiều cao viewport khi game đang hoạt động.

Cấu trúc:

- GameViewport chiếm toàn bộ không gian chơi.
- HUD overlay.
- Menu overlay.
- Modal panels.
- Contextual interaction overlay.

Trên mobile landscape, chiều cao vùng render mục tiêu là toàn bộ visual viewport, không bị trừ bởi header/footer ứng dụng.

Không giả định browser có thể loại bỏ thanh địa chỉ hệ điều hành khi chưa vào chế độ PWA/fullscreen.

### Mobile

Loại bỏ thanh logo/web header cố định.

Chuyển:

- Settings.
- Save status.
- Menu.
- Currency.
- Notifications.

Sang các nút HUD có thể mở/đóng.

Bỏ footer cố định.

Hiển thị trạng thái autosave tạm thời, tự biến mất sau thời gian phù hợp.

### PC

Cho phép giữ thanh menu game thật nhỏ hoặc menu nổi.

Không thiết kế giống website dashboard.

## 5.2. HUD Adaptive Layout

Thiết kế HUD theo các vùng:

- Top left: avatar, HP, MP, level.
- Top right: minimap, menu.
- Left middle: quest tracker có thể thu gọn.
- Bottom left: movement controls cho mobile.
- Bottom right: skills/attack controls.
- Bottom center: hotbar khi phù hợp.
- World overlay: damage, target name, interactions.

Không để HUD chặn trung tâm bản đồ.

## 5.3. Mobile Controls

Có:

- Floating joystick.
- Fixed joystick option.
- Attack.
- Skill buttons.
- Target lock.
- Auto attack.
- Potion quick slots.
- Dodge/mobility nếu có.
- Interact.
- Mount.
- Quick menu.
- Expand skill bar.

Hỗ trợ:

- Touch move.
- Multi-touch.
- Pointer cancellation.
- Safe area.
- Dynamic viewport.
- Landscape orientation.
- Notch.
- Pixel ratio.
- Touch target sizing.
- Customizable controls.

Phải kiểm tra trường hợp người chơi vừa giữ joystick vừa bấm kỹ năng.

## 5.4. Desktop Controls

Hỗ trợ:

- Click-to-move.
- Target selection.
- Skill hotkeys.
- Inventory hotkey.
- Character info hotkey.
- World map hotkey.
- Quest hotkey.
- Settings hotkey.
- Mouse wheel zoom khi thích hợp.
- Rebindable controls.

Không để phím tắt game kích hoạt khi đang nhập tên nhân vật hoặc nhập text.

## 5.5. Visual UI redesign

Thiết kế UI bằng một design system thống nhất:

- Dark martial-arts theme.
- Gold/bronze accents.
- Stone/wood/metal panels.
- Consistent typography.
- Skill rarity colors.
- Equipment rarity colors.
- Icon treatments.
- Tooltips.
- Interactive feedback.
- Disabled states.
- Loading states.
- Error states.
- Confirmation dialogs.

Không dùng những khung HTML thô với border đơn giản như UI cuối cùng.

Ưu tiên 9-slice panel backgrounds, decorative assets và typography dễ đọc.

Không hy sinh khả năng đọc chữ chỉ vì trang trí.

---

# PHẦN 6. THẾ GIỚI VÀ BẢN ĐỒ QUY MÔ LỚN

## 6.1. Vấn đề hiện tại

Bản đồ hiện tại nhỏ và thiếu không gian khám phá.

Không giải quyết bằng cách chỉ phóng to background.

Phải xây dựng world/map system hỗ trợ bản đồ lớn thực sự.

## 6.2. Large Map Architecture

Hỗ trợ:

- Large tilemaps.
- Map chunks.
- Chunk streaming.
- Asset lazy loading.
- Chunk unloading.
- Viewport culling.
- Navigation chunks.
- Spatial index.
- Spawn zones.
- Interaction zones.
- Map portals.
- Region metadata.

Không nạp tất cả textures và props của thế giới cùng lúc.

Không tạo một tilemap khổng lồ khiến mobile hết RAM.

## 6.3. Kích thước mục tiêu

Thiết kế các map theo loại.

Các mức đề xuất:

- Thôn/làng: tương đương tối thiểu khoảng 256×256 logical tiles nếu phù hợp gameplay.
- Thành thị: khoảng 384×384 hoặc lớn hơn.
- Bản đồ luyện cấp: khoảng 512×512.
- Khu vực rộng đặc biệt: hỗ trợ 1024×1024 hoặc tổ chức thành nhiều connected regions.

Đây là mục tiêu năng lực hệ thống, không bắt buộc giữ nguyên các con số nếu logical tile size hoặc world scale hiện tại khác.

Yêu cầu quan trọng hơn:

- Có thể di chuyển và khám phá lâu hơn đáng kể so với bản đồ hiện tại.
- Có các địa điểm khác nhau.
- Có đường đi.
- Có vật cản.
- Có hoạt động.
- Có nhiều khu quái.
- Có NPC.
- Có điểm thưởng.
- Có cổng chuyển map.

Không lấp map bằng các tile lặp vô nghĩa.

## 6.4. Map Design

Mỗi bản đồ lớn phải có:

- Main paths.
- Side paths.
- Points of interest.
- Safe zone.
- Combat zones.
- Named areas.
- Spawn regions.
- Resource gathering areas.
- Hidden or optional areas.
- Landmarks.
- Exit/portal locations.

Có thể bổ sung khu vực bí mật và treasure locations.

Phải tạo world navigation hợp lý, tránh bản đồ lớn nhưng đi lại tẻ nhạt.

## 6.5. Tiled Editor

Đánh giá pipeline tạo bản đồ bằng Tiled.

Hỗ trợ import TMJ/JSON hoặc format tương đương.

Có thể sử dụng:

- Ground layer.
- Decoration layer.
- Collision layer.
- Navigation layer.
- Props layer.
- Foreground occlusion layer.
- Object layer.
- Spawn layer.
- Portal layer.

Không để thông tin gameplay quan trọng phụ thuộc màu pixel của background image.

## 6.6. Isometric Depth

Xử lý:

- Actor Y sorting.
- Feet anchor sorting.
- Tall object occlusion.
- Roof fade khi nhân vật vào nhà.
- Bridges.
- Overpasses nếu map cần.
- Interactive props.
- Foreground effects.

Phải có kiểm thử nhân vật đứng trước/sau nhà, cây và cầu.

## 6.7. World Content Targets

Mục tiêu lâu dài:

- 5 thành thị lớn.
- 10 bản đồ môn phái.
- 20+ bản đồ luyện cấp.
- 10+ hang động/phó bản.
- 5+ khu boss đặc biệt.
- Bản đồ thế giới có kết nối hợp lý.

Bản đồ phải có nội dung thực sự.

Không đánh dấu map hoàn thành chỉ vì có tile data.

---

# PHẦN 7. ANIMATION VÀ SKILL EFFECTS

## 7.1. Combat Visual Pipeline

Tách skill logic khỏi rendering.

Skill events có thể tạo:

- Cast start.
- Cast completion.
- Projectile spawn.
- Projectile travel.
- Impact.
- Damage.
- Status effect.
- Death.

Renderer ánh xạ events thành animation và VFX.

## 7.2. VFX Engine

Tạo hệ thống VFX có quản lý vòng đời.

Hỗ trợ:

- Sprite animation.
- Particle systems.
- Trails.
- Glows.
- Projectiles.
- Area indicators.
- Impact flashes.
- Aura.
- Burst.
- Damage numbers.
- Floating status icons.
- Boss telegraphs.

Có pooling khi hợp lý.

Có giới hạn số lượng particles.

Có visual quality presets.

## 7.3. Phong cách ngũ hành

Mỗi hệ phải có visual language riêng:

Kim:
- Ánh kim.
- Lưỡi kiếm.
- Đường chém sắc.
- Hiệu ứng va chạm kim loại.

Mộc:
- Lá.
- Dây leo.
- Độc.
- Hiệu ứng sinh trưởng.

Thủy:
- Nước.
- Băng.
- Sương.
- Sóng năng lượng.

Hỏa:
- Lửa.
- Cháy.
- Bùng nổ.
- Vệt nhiệt.

Thổ:
- Đất đá.
- Bụi.
- Chấn động.
- Lá chắn.

Không chỉ đổi màu cùng một particle để tạo toàn bộ kỹ năng.

## 7.4. Skill Animation Requirements

Mỗi kỹ năng phải có:

- Animation/VFX reference.
- Cast timing.
- Impact timing.
- Audio reference.
- Targeting visual.
- Cooldown presentation.
- Hit feedback.

Không được có kỹ năng gây sát thương nhưng không có phản hồi rõ ràng.

## 7.5. Animation Quality

Không sử dụng một ảnh nhân vật trượt trên mặt đất để giả chuyển động trong bản sản xuất.

Nếu thiếu asset 8 hướng, báo cáo rõ đang có bao nhiêu hướng và trạng thái.

Có animation preview tool.

---

# PHẦN 8. THIẾT KẾ LẠI ÂM THANH GAME

## 8.1. Audio Audit

Kiểm tra:

- Âm thanh hiện đang sử dụng.
- Chất lượng file.
- Codec.
- Volume.
- Loop.
- Latency.
- Mixing.
- Repetition.
- Trigger timing.
- Browser autoplay limitations.
- Mobile Safari behavior.

Không đơn thuần tăng âm lượng hoặc thay một file nhạc khác rồi coi như hoàn thành.

## 8.2. Audio Manager

Thiết kế các audio buses:

- Master.
- Music.
- Ambient.
- Combat SFX.
- UI SFX.
- Voice nếu có.

Có hệ thống:

- Volume.
- Mute.
- Fade in/out.
- Crossfade.
- Audio pooling.
- Priority.
- Max simultaneous sounds.
- Spatial attenuation nếu phù hợp.
- Resource lifecycle.

Sử dụng Web Audio API hoặc lớp audio phù hợp với stack hiện tại.

## 8.3. Music Design

Các nhóm nhạc:

- Main menu.
- Character creation.
- Peaceful village.
- Major city.
- Forest.
- Mountains.
- Dungeon.
- Normal combat.
- Boss encounter.
- Victory.
- Defeat.

Phong cách:

- Võ hiệp cổ trang.
- Nhạc cụ truyền thống phương Đông.
- Nhịp điệu phù hợp môi trường.
- Melody rõ.
- Không lặp quá gây khó chịu.

Không lấy nhạc thương mại hoặc soundtrack VLTK không có quyền.

## 8.4. SFX

Bắt buộc có các nhóm:

- Footsteps theo loại địa hình nếu có asset.
- Sword slash.
- Weapon impact.
- Projectile cast.
- Magic impact.
- Fire.
- Ice.
- Lightning.
- Poison.
- Healing.
- Buff.
- Level up.
- Loot pickup.
- Item equip.
- Item sell/buy.
- Enhancement.
- Crafting.
- Quest completion.
- UI click.
- Monster attack.
- Monster death.
- Boss phase.

Có variation để tránh nghe cùng một âm thanh lặp liên tục.

## 8.5. Audio Testing

Kiểm tra:

- Không có sound spam.
- Không clip âm thanh.
- Không phát nhạc chồng lớp sai.
- Không tiếp tục phát audio sau khi đóng session.
- Pause/resume hoạt động.
- Mobile browser xử lý unlock audio hợp lệ.
- Chuyển map không làm audio memory tăng liên tục.

---

# PHẦN 9. HỆ THỐNG VẬT PHẨM VÀ UI TRANG BỊ

## 9.1. Item UI Redesign

Thiết kế lại:

- Item icon.
- Inventory grid.
- Equipment slots.
- Rarity border.
- Tooltip.
- Item details.
- Item comparison.
- Item actions.
- Item stack count.
- Lock indicator.
- Upgrade level.
- Gem sockets.
- Item set information.

Icon phải đủ đẹp và đồng nhất.

Không dùng các hình placeholder chung cho hàng trăm vật phẩm.

## 9.2. Item Types

Hỗ trợ:

- Weapons.
- Armor.
- Helmets.
- Boots.
- Belts.
- Rings.
- Necklaces.
- Bracelets.
- Consumables.
- Crafting materials.
- Gems.
- Quest items.
- Rare treasures.
- Mount items nếu được triển khai.

## 9.3. Equipment Effects

Trang bị phải thay đổi chỉ số thực tế.

Hệ thống attribute calculation:

Base stats
+ Level progression
+ Equipment stats
+ Enhancement stats
+ Gem stats
+ Set bonuses
+ Passive skills
+ Buff/debuff

Phải định nghĩa thứ tự áp dụng và rounding rules.

Không cộng dồn sai khi equip/unequip liên tục.

## 9.4. Equipment Visuals

Nếu asset cho phép, vũ khí và trang phục phải hiển thị trên nhân vật.

Thiết kế visual equipment layers:

- Base body.
- Armor.
- Weapon.
- Headgear.
- Accessories.
- Aura.
- Mount.

Nếu không thể hiển thị đủ do thiếu assets, phải báo cáo rõ chứ không đánh dấu hoàn thành.

---

# PHẦN 10. HỆ THỐNG CƯỜNG HÓA / ĐẬP ĐỒ

Đây là hệ thống gameplay bắt buộc phải triển khai.

## 10.1. Enhancement System

Thiết kế hệ thống nâng cấp trang bị có cấu hình dữ liệu.

Các tính năng:

- Chọn trang bị.
- Hiển thị cấp cường hóa hiện tại.
- Hiển thị cấp sau.
- Hiển thị thuộc tính trước/sau.
- Hiển thị vật liệu cần.
- Hiển thị tiền cần.
- Hiển thị tỷ lệ thành công.
- Hiển thị hậu quả nếu thất bại.
- Nút cường hóa.
- Animation.
- Âm thanh.
- Kết quả thành công/thất bại.

## 10.2. Enhancement Levels

Mặc định thiết kế thang +0 đến +15, có thể cấu hình.

Không hardcode khả năng thành công trong UI.

Tỷ lệ thành công phải đặt trong dữ liệu cân bằng.

Có thể sử dụng cơ chế:

- Success.
- Failure no change.
- Failure downgrade.
- Protected failure.
- Material loss.

Không tự động hủy trang bị nếu game design không quy định.

## 10.3. Enhancement Materials

Ví dụ các nhóm:

- Enhancement stone.
- Protection stone.
- Blessing material.
- Gold.
- Special materials.

Có inventory validation.

Không cho cường hóa khi thiếu tài nguyên.

## 10.4. Transaction Safety

Quá trình cường hóa phải là một transaction logic:

1. Validate item.
2. Validate ownership.
3. Validate required materials.
4. Validate currency.
5. Roll seeded RNG.
6. Apply outcome.
7. Consume resources.
8. Emit enhancement event.
9. Persist result.

Không có tình huống trừ tiền nhưng không đổi trạng thái vì một lỗi xử lý không được kiểm soát.

Không thể dùng double-click để cường hóa hai lần ngoài ý muốn.

## 10.5. Equipment Enhancement UI

Tạo cửa sổ có:

- Equipment slot.
- Materials.
- Current stats.
- Preview stats.
- Success rate.
- Protection option.
- Total cost.
- Enhancement button.
- Result animation.

Responsive cho mobile và PC.

---

# PHẦN 11. KHẢM NGỌC, LUYỆN HÓA VÀ TRANG BỊ BỘ

## 11.1. Gem Socketing

Hỗ trợ:

- Socket slots.
- Gem types.
- Gem level.
- Element restrictions.
- Socketing costs.
- Gem removal rules.
- Stat bonuses.

## 11.2. Item Refinement

Hệ thống luyện hóa:

- Thay đổi một hoặc nhiều affix theo quy tắc.
- Chi phí luyện hóa.
- Preview phạm vi kết quả.
- Lock affix nếu có nguyên liệu.
- Validate item compatibility.
- Transaction safety.

## 11.3. Set Equipment

Có:

- Set ID.
- Required pieces.
- 2-piece bonus.
- 3-piece bonus.
- 4-piece bonus hoặc các mốc phù hợp.

UI hiển thị tiến độ kích hoạt set.

---

# PHẦN 12. CHẾ TẠO VẬT PHẨM

## 12.1. Crafting Framework

Thiết kế data-driven crafting recipes.

Mỗi recipe có:

- Recipe ID.
- Output.
- Required materials.
- Required currency.
- Required profession.
- Required profession level.
- Success rules.
- Crafting time nếu được thiết kế.
- Unlock conditions.

## 12.2. Nghề nghiệp

Triển khai:

- Khai khoáng.
- Hái thuốc.
- Thu thập gỗ.
- Luyện dược.
- Rèn vũ khí.
- Chế tạo giáp.
- Chế tạo phụ kiện.

Các nghề phải tạo được vật phẩm có giá trị gameplay.

## 12.3. Crafting UI

Có:

- Recipe categories.
- Search.
- Filters.
- Material preview.
- Missing materials.
- Output preview.
- Crafting quantity.
- Crafting button.
- Crafting result.
- Profession EXP.
- Recipe discovery.

## 12.4. Crafting Transactions

Đảm bảo:

- Không nhân đôi nguyên liệu.
- Không nhận sản phẩm nếu thiếu tài nguyên.
- Không tạo item có ID trùng.
- Không vượt inventory capacity.
- Không mất dữ liệu khi save/reload.

---

# PHẦN 13. CỬA HÀNG, MUA BÁN VÀ KHO

## 13.1. NPC Shops

Các loại cửa hàng:

- Weapon shop.
- Armor shop.
- Potion shop.
- Material shop.
- Gem shop.
- General goods.
- Special merchant.

Mỗi cửa hàng có catalog riêng.

## 13.2. Shop UI

Có:

- Danh sách item.
- Giá.
- Icon.
- Item details.
- Current money.
- Quantity.
- Buy.
- Sell.
- Buyback nếu thiết kế hỗ trợ.
- Inventory capacity validation.

## 13.3. Price Rules

Hỗ trợ:

- Base price.
- Buy price.
- Sell price.
- Merchant modifiers.
- Reputation discounts nếu có.
- Item rarity.
- Item condition.

## 13.4. Warehouse

Có:

- Personal warehouse.
- Item deposit.
- Item withdrawal.
- Slot capacity.
- Currency storage nếu phù hợp.
- Sorting.
- Filtering.
- Expansion.

## 13.5. Offline NPC Marketplace

Thiết kế chợ NPC mô phỏng:

- Listing.
- Dynamic stock.
- Price ranges.
- Item categories.
- Refresh cycles.
- Buying/selling.
- Market events.

Không giả lập đây là giao dịch với người chơi online thật.

---

# PHẦN 14. HOÀN THIỆN COMBAT

## 14.1. Combat Rules

Kiểm tra và hoàn thiện:

- Hit chance.
- Evasion.
- Physical damage.
- Elemental damage.
- Defense.
- Resistance.
- Critical damage.
- Attack speed.
- Cast speed.
- Projectile collision.
- Melee reach.
- AoE.
- Buff stacking.
- Debuff stacking.
- Crowd control.
- Death.
- Respawn.

## 14.2. Combat Experience

Mỗi đòn đánh phải có cảm giác rõ ràng:

- Start animation.
- Attack timing.
- Target reaction.
- Impact visual.
- Impact audio.
- Damage popup.
- Hit confirmation.
- Death feedback.

## 14.3. Skills

Xây dựng skill archetypes:

- Single target.
- Projectile.
- Multi-projectile.
- Cone.
- Line.
- AoE.
- Chain.
- Summon.
- Heal.
- Shield.
- Buff.
- Debuff.
- Damage over time.
- Movement.
- Passive.

Tách skill definition, execution và VFX.

## 14.4. Class Identity

Các môn phái phải có cơ chế chiến đấu khác nhau thực sự.

Không tạo 10 class sử dụng chung một bộ kỹ năng chỉ thay màu sắc.

---

# PHẦN 15. QUÁI VẬT, BOSS VÀ AI

## 15.1. Monster Variety

Tạo các archetypes:

- Melee aggressor.
- Ranged attacker.
- Support/healer.
- Tank.
- Fast assassin.
- Poison specialist.
- Area caster.
- Elite.
- Boss.

## 15.2. AI Behavior

Hỗ trợ:

- Patrol.
- Detection.
- Aggro.
- Chase.
- Attack selection.
- Kiting.
- Retreat.
- Leash.
- Return home.
- Group coordination.
- Skill cooldown.
- Threat selection.

## 15.3. Boss Mechanics

Boss cần có:

- Named abilities.
- Phase changes.
- Warning zones.
- Special attacks.
- Summon waves.
- Buff/debuff mechanics.
- Unique rewards.

Không chỉ tăng HP lên 100 lần rồi gọi là boss.

---

# PHẦN 16. QUEST VÀ CỐT TRUYỆN

Hoàn thiện:

- Main quests.
- Side quests.
- Sect quests.
- Repeatable quests.
- Exploration quests.
- Crafting quests.
- Dungeon quests.
- Boss quests.
- Event quests.

Có:

- Quest chains.
- Preconditions.
- Multiple objectives.
- Reward choices nếu phù hợp.
- Dialogue branching.
- Quest tracking.
- Quest navigation.
- Completed quest history.

Mỗi khu vực lớn cần có nội dung nhiệm vụ riêng.

Quest phải kiểm tra tiến trình thông qua game events.

Không cho nhận thưởng nhiều lần ngoài quy tắc.

---

# PHẦN 17. ĐỒNG HÀNH, THÚ CƯỠI, BANG HỘI VÀ HOẠT ĐỘNG

## 17.1. Companions

Triển khai:

- Recruitment.
- Companion stats.
- Companion skills.
- Follow behavior.
- Combat AI.
- Roles.
- Upgrade.
- Equipment khi phù hợp.
- Party UI.

## 17.2. Mounts

Có:

- Mount catalog.
- Mount acquisition.
- Mount movement.
- Mount animations.
- Mount stats nếu thiết kế sử dụng.
- Dismount.
- Mount restrictions.
- Save/load.

## 17.3. Offline Guild

Mô phỏng bằng NPC:

- Guild creation.
- Members.
- Guild quests.
- Guild upgrades.
- Guild treasury.
- Rival NPC factions.

## 17.4. Activities

Có thể triển khai:

- Arena vs AI.
- Tournament.
- Dungeon.
- World bosses.
- Siege simulation.
- Daily-style events theo game clock.
- Treasure hunting.
- Exploration achievements.

Mọi hoạt động phải có phần thưởng và quy tắc tiến trình thực sự.

---

# PHẦN 18. THẾ GIỚI SỐNG ĐỘNG

Không chỉ đặt NPC đứng yên.

Bổ sung khi hợp lý:

- NPC patrol.
- Merchant schedules.
- Villagers walking.
- Guards.
- Ambient animals.
- Resource nodes.
- Random encounters.
- Day/night.
- Weather.
- Environmental sound.
- Regional events.

NPC ambient không được tiêu tốn CPU tương đương combat AI.

AI ngoài vùng hoạt động có thể dùng cập nhật giản lược.

---

# PHẦN 19. DỮ LIỆU VÀ CÔNG CỤ TẠO CONTENT

## 19.1. Data-driven definitions

Tất cả:

- Items.
- Skills.
- Monsters.
- Bosses.
- Quests.
- NPCs.
- Shops.
- Crafting recipes.
- Equipment affixes.
- Maps.
- Loot tables.

Phải có definitions và schema validation.

## 19.2. Content tooling

Xây dựng tools hữu ích cho phát triển lâu dài:

- Asset browser.
- Sprite animation preview.
- Map inspector.
- Item editor.
- Skill editor.
- Quest graph inspector.
- Loot simulator.
- Enhancement simulator.
- Combat balance simulator.
- Audio preview.
- Content validator.

Ưu tiên CLI và giao diện developer tools đơn giản có thể dùng thực sự.

Không cần làm CMS phức tạp nếu chưa mang lại lợi ích.

## 19.3. Coverage Report

Báo cáo:

- Tổng item thực.
- Tổng skill thực.
- Tổng monsters.
- Tổng maps playable.
- Tổng quests completable.
- Số asset placeholders.
- Số asset production-ready.
- Số nội dung chưa liên kết gameplay.
- Số validation errors.

Không được tính content chưa thể sử dụng là hoàn thành.

---

# PHẦN 20. SAVE, OFFLINE VÀ VERSIONING

Giữ offline-first.

Tất cả tính năng mới phải tương thích persistence:

- Equipment upgrades.
- Item affixes.
- Gems.
- Crafting progression.
- Warehouse.
- Shop state.
- Companion state.
- Mount state.
- Guild state.
- Dungeon progress.
- Quest progress.
- World progression.
- Character progression.

Mỗi thay đổi save schema phải có migration.

Không được âm thầm phá save hiện tại của người dùng.

Có import/export và backup.

Kiểm tra IndexedDB transaction safety.

Game phải chơi được offline sau khi các tài nguyên cần thiết đã cache thành công.

Phân biệt data save và asset cache.

Không precache toàn bộ tài nguyên thế giới nếu tổng dung lượng gây vấn đề trên mobile. Có asset pack và cơ chế tải trước, thông báo rõ map nào chưa có sẵn khi offline.

---

# PHẦN 21. ONLINE-READY ARCHITECTURE

Tuyệt đối không phá kiến trúc đã chuẩn bị.

Giữ:

- Pure game-core.
- Game commands.
- Game events.
- Snapshots.
- Deterministic simulation.
- Fixed tick.
- LocalGameSession.
- GameSession contract.
- Versioned protocol.
- Data-driven content.

Mọi hệ thống mới phải có thể chuyển authority sang server.

Ví dụ:

- Cường hóa phải do authoritative simulation quyết định.
- Giao dịch phải được xác minh ở authoritative side.
- Loot phải sinh bởi authoritative RNG.
- Quest reward phải idempotent.
- Crafting phải xác minh nguyên liệu.
- Movement phải có validation.
- PvP không dựa trên damage do client tự báo cáo.

Không triển khai online server ngay chỉ để chứng minh lý thuyết.

Nhưng phải có regression tests chứng minh các gameplay systems có thể chạy trong Node.js không có DOM.

Offline saves không được mặc định trở thành dữ liệu online đáng tin cậy.

---

# PHẦN 22. PERFORMANCE REQUIREMENTS

## PC

Mục tiêu:

- 60 FPS trong cảnh gameplay thông thường trên máy đủ cấu hình.
- Camera mượt.
- Texture loading không giật đáng kể.
- Không tăng memory bất thường.
- Input response tốt.

## Mobile

Mục tiêu:

- 30 FPS ổn định trên smartphone tầm trung được chọn làm thiết bị tham chiếu.
- 60 FPS tùy khả năng thiết bị.
- Touch response tốt.
- Không có nút quan trọng bị che.
- Không bị UI overflow.
- Không liên tục reload texture.
- Không phát quá nhiều VFX đồng thời.

Cần đo thực tế thay vì khẳng định bằng headless Chromium.

## World Performance

Hỗ trợ:

- Viewport culling.
- Spatial partitioning.
- Chunk loading.
- Chunk unloading.
- Asset cache budget.
- Animation budget.
- VFX budget.
- AI tick budget.
- Memory profiling.
- Texture atlas management.

Không tối ưu bằng cách làm simulation khác biệt giữa mobile và desktop.

---

# PHẦN 23. TESTING CHI TIẾT

Giữ toàn bộ regression tests hiện tại.

Bổ sung test cho:

### UI

- HUD không có header/footer cố định.
- Mobile landscape.
- Touch controls.
- Multi-touch.
- UI overlays.
- Inventory.
- Shop.
- Crafting.
- Enhancement.
- Warehouse.
- Skill tree.
- Quest log.

### World

- Large-map navigation.
- Chunk boundaries.
- Map transitions.
- Collision.
- Pathfinding.
- Spawn/despawn.
- Camera bounds.
- Resource cleanup.

### Combat

- Damage.
- Cooldowns.
- Buff/debuff.
- AoE.
- Projectiles.
- Boss phases.
- Monster AI.
- Status effect stacking.

### Inventory/Economy

- Buy.
- Sell.
- Equip.
- Unequip.
- Enhancement.
- Refinement.
- Gem socketing.
- Crafting.
- Depositing.
- Withdrawing.
- Capacity.
- Currency consistency.
- Transaction rollback.

### Save/Load

- Mid-quest save.
- Enhanced item save.
- Crafting progression save.
- Warehouse save.
- Companion save.
- World state save.
- Migration.
- Import/export.
- Reload.
- Offline reload.

### Visual

- Sprite loading.
- Animation selection.
- Direction changes.
- Effects lifecycle.
- Missing asset detection.
- Mobile UI screenshot regression.

### Audio

- Audio unlock.
- Multiple SFX.
- Volume.
- Music transitions.
- Mute.
- Dispose.
- Repeated scene changes.

---

# PHẦN 24. ACCEPTANCE — GAMEPLAY HOÀN CHỈNH

Không chỉ test class/function.

Phải có end-to-end gameplay:

1. Tạo nhân vật.
2. Chọn môn phái.
3. Đi qua khu vực thành thị.
4. Nhận nhiệm vụ.
5. Di chuyển đến bãi luyện cấp lớn.
6. Đánh nhiều loại quái.
7. Sử dụng kỹ năng với VFX và SFX.
8. Nhận EXP.
9. Lên cấp.
10. Nhặt nguyên liệu.
11. Quay lại thành.
12. Mở cửa hàng.
13. Mua vật phẩm.
14. Bán vật phẩm.
15. Trang bị.
16. Chế tạo.
17. Cường hóa.
18. Khảm ngọc.
19. Nhận nhiệm vụ boss.
20. Di chuyển đến khu boss.
21. Chiến đấu.
22. Nhận thưởng.
23. Gửi vật phẩm vào kho.
24. Lưu tiến trình.
25. Reload.
26. Xác minh toàn bộ chỉ số và vật phẩm.
27. Tắt mạng.
28. Tiếp tục chơi offline với các asset đã cache.
29. Thực hiện lại trên giao diện mobile.
30. Kiểm tra gameplay sau khi nâng phiên bản save schema.

E2E chỉ được tính đạt nếu hành động tạo thay đổi gameplay state thực sự.

Không dùng test hook để tự tạo tiền, HP, EXP hoặc item trong hành trình nghiệm thu end-to-end.

---

# PHẦN 25. ROADMAP THỰC THI

## Giai đoạn A — Visual/UI Overhaul

- Xóa header/footer cố định.
- Full viewport gameplay.
- Adaptive HUD.
- Mobile controls.
- UI design system.
- Camera.
- Asset pipeline foundation.
- Sprite animation improvements.

## Giai đoạn B — Graphics and Audio Production

- Art bible.
- Production-grade tileset pipeline.
- Character sprites.
- VFX system.
- Audio manager.
- Sound library integration.
- Music transitions.
- Environment rendering.

## Giai đoạn C — Large World

- Chunked maps.
- Larger villages/cities.
- Training regions.
- NPC distribution.
- Monster spawn regions.
- Map streaming.
- World map.
- Exploration content.

## Giai đoạn D — Combat and Skills

- Comprehensive combat mechanics.
- Skill archetypes.
- Elemental VFX.
- Skill audio.
- Combat feedback.
- Monster AI.
- Boss phases.

## Giai đoạn E — Inventory and Equipment

- Item UI overhaul.
- Equipment affixes.
- Item rarity.
- Equipment comparison.
- Set bonuses.
- Enhancement.
- Gem socketing.
- Refinement.

## Giai đoạn F — Economy and Crafting

- NPC shops.
- Buy/sell.
- Warehouse.
- Resource gathering.
- Professions.
- Crafting.
- Marketplace NPC simulation.

## Giai đoạn G — RPG World Content

- Sect progression.
- Skills.
- Quests.
- Story.
- Monsters.
- Bosses.
- Dungeons.
- World activities.

## Giai đoạn H — Advanced Offline RPG

- Companions.
- Mounts.
- Guild NPC simulation.
- Arena AI.
- Siege simulation.
- Auto combat.
- Achievements.
- Long-term progression.

## Giai đoạn I — Release Quality

- Content completeness.
- Visual polish.
- Audio polish.
- Save migration.
- Performance optimization.
- Mobile real-device testing.
- Browser compatibility.
- Documentation.
- Regression testing.
- Offline validation.
- Online migration validation.

---

# PHẦN 26. DEFINITION OF DONE

Một subsystem chỉ được đánh dấu hoàn thành khi:

1. Code tồn tại và hoạt động.
2. Có data definitions hợp lệ.
3. Có đầy đủ input/interaction.
4. Có UI nếu cần.
5. Có asset nếu cần.
6. Có audio/VFX nếu gameplay yêu cầu.
7. Hoạt động trên PC.
8. Hoạt động trên mobile.
9. Lưu/khôi phục được nếu có persistent state.
10. Không làm hỏng các subsystem liên quan.
11. Có kiểm thử phù hợp.
12. Có tài liệu phát triển.
13. Có thể vận hành trong shared game-core nếu liên quan gameplay.
14. Không có blocker bugs.
15. Không còn placeholder thiết yếu nếu đánh dấu production-ready.

Nếu chưa đáp ứng đầy đủ thì phải báo cáo trạng thái Partial hoặc Blocked.

Không cố đánh dấu Done cho đẹp báo cáo.

---

# PHẦN 27. YÊU CẦU THỰC THI NGAY

Hãy bắt đầu bằng các công việc sau theo thứ tự:

1. Audit repository hiện tại.
2. Phân tích trực tiếp giao diện gameplay hiện có.
3. Xác định nguyên nhân header/footer chiếm diện tích mobile.
4. Kiểm tra asset/render pipeline đang dùng.
5. Kiểm tra nguyên nhân bản đồ quá nhỏ.
6. Kiểm tra audio assets và sound manager.
7. Kiểm tra skill VFX.
8. Kiểm tra các hệ thống inventory, enhancement, crafting, shops hiện có hoặc còn thiếu.
9. Lập dependency-aware implementation plan cho tất cả các yêu cầu trên.
10. Triển khai sửa HUD full viewport thực tế.
11. Triển khai nâng cấp rendering và asset pipeline.
12. Triển khai bản đồ lớn có nội dung thực sự.
13. Triển khai các hệ thống RPG đang thiếu.
14. Chạy tests sau mỗi nhóm thay đổi.
15. Cập nhật implementation status.

Nếu không có giới hạn công cụ hoặc thời gian thì tiếp tục các giai đoạn tiếp theo theo thứ tự phụ thuộc.

Nếu phiên làm việc bị giới hạn, phải hoàn tất một nhóm thay đổi có thể nghiệm thu, giữ repository build được và ghi lại đầy đủ phần còn thiếu để phiên Codex tiếp theo tiếp tục chính xác.

Không báo cáo rằng đã phát triển xong một game đầy đủ chỉ vì một vertical slice đã chạy được.

Không tự ý bỏ đi những tính năng lớn trong phạm vi game.

## MỤC TIÊU CUỐI CÙNG

Tôi muốn một game võ hiệp 2D Isometric có cảm giác như một game MMORPG cổ điển thực sự:

- Đồ họa đẹp và thống nhất.
- Bản đồ lớn, phong phú.
- Nhân vật có animation mượt.
- Kỹ năng có hiệu ứng mạnh và rõ ràng.
- Âm thanh hấp dẫn.
- Hành trang và trang bị đẹp.
- Hệ thống cường hóa/đập đồ.
- Chế tạo.
- Cửa hàng.
- Ngân hàng.
- Ngũ hành.
- Môn phái.
- Kỹ năng.
- Nhiệm vụ.
- Boss.
- Phó bản.
- Đồng hành.
- Bang hội mô phỏng.
- Chiến trường với AI.
- Hoạt động dài hạn.
- Gameplay PC/mobile hoàn chỉnh.
- Chơi offline không cần server.
- Dữ liệu nhân vật được lưu ổn định.
- Có kiến trúc để chuyển sang MMORPG Online mà không viết lại simulation core.

Hãy thực hiện bằng code thực tế trên repository hiện tại, giữ chất lượng và báo cáo chính xác những gì đã làm được.