> Tài liệu lịch sử v0.1. Trạng thái và thiết kế hiện tại: [IMPLEMENTATION_STATUS](../IMPLEMENTATION_STATUS.md), [SYSTEM_ARCHITECTURE](../SYSTEM_ARCHITECTURE.md), [COMBAT_DESIGN](../COMBAT_DESIGN.md), [ROADMAP](../ROADMAP.md). Các mô tả thiếu tính năng bên dưới phản ánh baseline trước nâng cấp.

# Chuỗi nhiệm vụ

1. Bình yên thôn nhỏ: đánh 5 sơn tặc, nhận đạo bào và mở chương II.
2. Dấu chân trong rừng: hạ 4 lang vương ở Thanh Trúc Lâm, nhận giày và mở chương III.
3. Một kiếm định giang hồ: hạ Hắc Phong Trại Chủ, nhận kiếm và bạc.

Quest chuyển `active → ready → claimed`. Progress chỉ tăng từ sự kiện chết do player sở hữu session đánh bại. Nhận/trả quest phải gần trưởng thôn. Chương sau kiểm tra chương trước đã claim. Claim kiểm tra đủ ô túi trước khi cộng reward và đổi status; thử claim lại không thay state.

Bài integration `journey.test.ts` tạo nhân vật mới và chỉ dùng command để đi qua ba map, hoàn thành chuỗi và quay về nhận thưởng. Bot test dùng vật phẩm khởi đầu, kỹ năng, phân điểm và trang bị; không sửa HP/cấp/quest để bỏ qua chặng.

Quest collect, explore và escort chưa có nội dung. Framework hiện chỉ có kill objective với prerequisite tuyến tính; cần mở rộng union objective và event consumer trước khi thêm dạng mới.
