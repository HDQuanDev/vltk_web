> Hiện hành v0.5:5maps, gồm Thanh Sơn128 và Vân Khê256. Vân Khê có12POI/10spawnzones/sông3cầu,2NPC/4quest/5resource mới; farm/boss tái dùng catalog cũ. Navigation/region rules và giới hạn tại [world streaming](architecture/world-streaming.md); số liệu tại [status](IMPLEMENTATION_STATUS.md). Phần baseline dưới đây được giữ để đối chiếu lịch sử.

> Baseline v0.2. Thay đổi v0.3 và trạng thái hiện tại: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [rendering](architecture/rendering.md), [world streaming](architecture/world-streaming.md), [full-release](roadmap/full-release.md).

# Thế giới và simulation

Ba map hiện có: Tân Thủ Thôn (NPC, shop, quest khởi đầu, thuốc/gỗ); Thanh Trúc Lâm (sói, cung thủ, rắn độc, quặng/thuốc/trúc); Hắc Phong Trại (boss, thích khách/cung thủ, tài nguyên yêu cầu nghề). Cổng nối Thôn ↔ Rừng ↔ Trại. Mỗi map có blocked grid, spawn, props, A*, minimap và isometric projection từ world coordinates.

Terrain/props được vẽ mới bằng canvas, không dùng screenshot làm nền. Depth theo chân entity/Y của props; vùng che player làm nhà/cây trong suốt khi thật sự giao nhau với silhouette. Có resource art, lighting/ngày đêm, mưa/sương/lá; effects thấp giảm hạt. Chưa có địa hình nhiều cao độ, water animation chất lượng sản xuất, NPC schedules hoặc regional event.

Một ngày 24.000 ticks (20 phút), bắt đầu 06:00. Thời tiết seed quyết định mỗi 2.400 ticks (2 phút). Resource dùng availableAt, boss/monster respawn dùng tick. Pause dừng tất cả timer simulation, save/load giữ deadline. Không dùng Date.now để cấp loot/EXP.

Map đã thăm giữ entity trạng thái: HP, corpse, respawn timer, phase, vị trí. Load bổ sung spawn definitions mới theo ID ổn định, không reset spawn cũ. Không có player ở map thì AI/movement dừng, khi quay lại deadline respawn được xử lý theo tick. V0.1 đã xóa dữ liệu map khi rời đi; migration không thể khôi phục dữ liệu đã mất trong định dạng nguồn.

## Đích v1.0 giữ nguyên

5 thành/trung tâm, 10 khu môn phái, 20 map luyện cấp, 10 hang động/phó bản, 5 khu boss (khoảng 50 map). Phong cách thành cổ/làng/rừng trúc/rừng rậm/tuyết/sa mạc/đầm lầy/hang/chùa/đạo quán/cung điện/chiến trường/pháo đài/bãi luyện. Mỗi nơi phải có mục đích gameplay, cấp đề nghị, biome, NPC, spawn, cổng, âm thanh, tài nguyên, hoạt động và phần thưởng riêng.

Chưa tạo các map rỗng để đủ chỉ tiêu. Ưu tiên mở tuyến nội dung cấp 8–20 cùng sect NPC/quest, sau đó dungeon instances có checkpoint/reset/reward trước khi nhân rộng vùng cao cấp.
