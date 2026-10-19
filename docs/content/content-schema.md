> Tài liệu lịch sử v0.1. Trạng thái và thiết kế hiện tại: [IMPLEMENTATION_STATUS](../IMPLEMENTATION_STATUS.md), [SYSTEM_ARCHITECTURE](../SYSTEM_ARCHITECTURE.md), [COMBAT_DESIGN](../COMBAT_DESIGN.md), [ROADMAP](../ROADMAP.md). Các mô tả thiếu tính năng bên dưới phản ánh baseline trước nâng cấp.

# Nội dung và tài nguyên

`packages/game-content/src/index.ts` là catalog nhỏ, typed và được schema Zod kiểm tra. Skill/item được parse khi tạo catalog; validator kiểm tra monster, NPC, class, quest và map, ID trùng, loot reference, quest prerequisite, NPC/reward reference, portal destination và monster spawn. Validator chạy khi ứng dụng khởi động và trong `pnpm validate:content`.

Bài content test kiểm tra asset manifest trỏ tới file thực và kiểm tra core không có browser/storage imports. Các SVG trong `apps/web/public/assets` và các hàm canvas trong `game/renderers/art.ts` là đồ họa gốc do dự án tạo; không chứa screenshot hoặc tài nguyên từ VLTK. Manifest dùng định danh ổn định để thay art mà không sửa damage hoặc progression.

Bản đồ dữ liệu chứa props, blocked cells, NPC catalog, monster spawn và portals. Nên tách từng catalog ra file khi số bản ghi tăng, không cần hàng chục thư mục trống cho tám item. Content expansion phải bổ sung schema và reference test. Quy tắc cycle của prerequisite và kiểm tra atlas đầy đủ cần bổ sung khi triển khai skill tree lớn.

PWA chỉ cache file build và tài nguyên local. Không tải font/CDN/ảnh ngoài. Mỗi SVG chỉ xuất hiện một lần trong precache; file không hash dùng revision để cập nhật chính xác.
