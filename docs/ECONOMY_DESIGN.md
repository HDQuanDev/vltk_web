> Baseline v0.2. Thay đổi v0.3 và trạng thái hiện tại: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [rendering](architecture/rendering.md), [world streaming](architecture/world-streaming.md), [full-release](roadmap/full-release.md).

# Kinh tế và bảo toàn vật phẩm

Hiện có bạc, NPC mua/bán, 32 ô túi, 64 ô kho, ba ô trang bị, khóa/sắp xếp/lọc đồ, thu thập/craft, cường hóa và ngọc. 7 nghề có XP/cấp: hái thuốc, khai khoáng, gỗ, luyện dược, rèn, giáp, ngọc. Chỉ 7 công thức và 12 item definitions; chưa đủ itemization cho v1.0.

## Quy tắc hiện tại

- Cường hóa +0 đến +15. Tới +5 luôn thành công và không mất cấp; từ +6 dùng tỉ lệ trong `enhancementRules.successRates` (0.9 giảm dần còn 0.25 ở +14). Thất bại mất 1 cấp từ +8 và 2 cấp từ +13; Đá Hộ Mệnh (bán ở thợ rèn, 220 bạc) tiêu hao mỗi lần đập có bật bảo vệ và giữ nguyên cấp khi thất bại, phụ phí 120 bạc. Giá 50 + cấp hiện tại×35 bạc, quặng 1 + cấp hiện tại. Mỗi cấp tăng chỉ số nền trang bị 15%. Kết quả roll dùng RNG authority đã seed nên replay/save-load xác định; 20 dòng gần nhất lưu trong `enhanceLog` của nhân vật.
- Một ô ngọc ban đầu, ô thứ hai ở +3. Bích Ngọc +4 công; Hổ Phách +3 thủ. Khảm 40 bạc; tháo 100 bạc và trả ngọc về túi.
- Craft kiểm tra NPC gần đúng station, cấp nghề, bạc, vật liệu không khóa và khả năng chứa output sau khi dùng nguyên liệu. Cấp nghề = 1 + floor(sqrt(XP/30)).
- Gửi/rút cả instance/stack, giữ enhancement/gems/lock, yêu cầu gần trưởng thôn. Không bán/tiêu hao nguyên liệu khóa. Khóa không ngăn thao tác cường hóa do người chơi chủ động thực hiện.
- Resource cooldown theo simulation tick; không sinh lại do tải trang hoặc tạm dừng. Timer lưu trong snapshot.

EconomyTransactions xây draft dữ liệu vật phẩm/tiền/nghề, kiểm tra tất cả điều kiện rồi commit. Thất bại giữ nguyên tiền, đồ, XP và bộ đếm ID. Socket/tháo lặp với instance không còn tồn tại bị từ chối. Test bao gồm túi đầy nhưng vật liệu dùng hết giải phóng ô và trường hợp không giải phóng đủ ô.

Mua/bán/trang bị/quest reward cũng chạy ở core có owner. Offline import có thể sửa số liệu nên không được tin làm nguồn economy online.

## Chưa triển khai

NPC market theo cung cầu/stock/game clock; repair/durability; affix pools, item level, set bonuses, phụ kiện/mũ/đai/vòng/cổ tay; đủ 6 phẩm chất và 500 definitions có vai trò; profession phụ kiện/gia công; sink/source balance dài hạn. Nâng cấp hiện dễ dự đoán để kiểm tra giao dịch, chưa phải economy cân bằng cuối.
