> Tài liệu lịch sử v0.1. Trạng thái và thiết kế hiện tại: [IMPLEMENTATION_STATUS](../IMPLEMENTATION_STATUS.md), [SYSTEM_ARCHITECTURE](../SYSTEM_ARCHITECTURE.md), [COMBAT_DESIGN](../COMBAT_DESIGN.md), [ROADMAP](../ROADMAP.md). Các mô tả thiếu tính năng bên dưới phản ánh baseline trước nâng cấp.

# Tiến trình nhân vật

EXP cần cho cấp tiếp theo = `round(90 * level^1.45)`. Cấp tối đa 60 cho slice này. Mỗi cấp cho 5 tiềm năng và 1 điểm kỹ năng; hồi đầy HP/MP. Chỉ số dẫn xuất:

| Chỉ số    | Công thức                              |
| --------- | -------------------------------------- |
| HP tối đa | 180 + sinh khí × 12 + cấp × 18         |
| MP tối đa | 80 + nội công × 8 + cấp × 10           |
| Công kích | 12 + sức mạnh × 2 + cấp × 3 + trang bị |
| Phòng ngự | 3 + thân pháp × 0.7 + cấp + trang bị   |

Mỗi kỹ năng tối đa cấp 5; cấp kỹ năng tăng power 16% mỗi bậc cho các chiêu gây damage. Heal tăng thêm 5% HP tối đa mỗi bậc. Nhân vật có name, characterId, appearance, class, attributes và điểm chưa phân bổ trong snapshot.

Ba lựa chọn môn phái dùng cùng kỹ năng, khác nguyên tố. Sprite nữ hiện dùng chung silhouette và khác màu. Một bộ animation sprite 8 hướng thực sự và nhánh kỹ năng riêng cho từng môn phái thuộc giai đoạn nội dung tiếp theo.
