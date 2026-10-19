> Tài liệu lịch sử v0.1. Trạng thái và thiết kế hiện tại: [IMPLEMENTATION_STATUS](../IMPLEMENTATION_STATUS.md), [SYSTEM_ARCHITECTURE](../SYSTEM_ARCHITECTURE.md), [COMBAT_DESIGN](../COMBAT_DESIGN.md), [ROADMAP](../ROADMAP.md). Các mô tả thiếu tính năng bên dưới phản ánh baseline trước nâng cấp.

# Vật phẩm và kinh tế

ItemDefinition nằm trong content; ItemInstance có ID duy nhất, definitionId và quantity. Hành trang 32 ô, consumable/material tối đa 99 mỗi stack. Vũ khí, áo và giày không stack. `canAddItem` kiểm tra đủ chỗ trước mọi mutation, kể cả mua đồ và nhận thưởng.

Trang bị cần đạt cấp, equip thay vật phẩm cũ trong cùng ô và tính lại chỉ số. Tháo đồ khi đầy túi bị từ chối. Bán từng đơn vị được 1/3 giá mua, tối thiểu 1 bạc. Mua và bán chỉ hợp lệ khi ở gần NPC tương ứng. Không có request backend cho economy offline.

Sơn tặc rơi linh thảo/đan dược, sói rơi huyền thiết/giày hiếm, boss chắc chắn rơi Huyền Thiên Kiếm. Loot dùng seeded RNG với so sánh `roll < chance` nên xác suất 0 không rơi, 1 luôn rơi. Đồ được nhặt tự động sau khi quái chết; chưa có vật phẩm nằm trên đất hoặc click nhặt riêng.

Durability, enhancement, gem sockets, bank và các ô nhẫn/dây chuyền/mũ chưa triển khai. Không có nút UI giả cho các tính năng đó.
