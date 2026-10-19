# Visual baseline — 19/10/2026

Chạy game thật trong Chromium bằng Playwright trước khi tích hợp thay đổi. 5 viewport: 1920×1080, 1366×768, 932×430, 844×390, tablet 1180×820. Ảnh ở `artifacts/visual-before/`; `capture-report.json` ghi không có page error/scroll toàn trang ở các checkpoint. Đã xem trực tiếp ảnh creation, HUD, inventory trước sửa. Các cửa sổ kinh tế/Thanh Vân Sơn dùng save fixture qua luồng import thật; đây là kiểm tra hình ảnh, không phải hành trình progression.

Thư mục tiếp nhận không có `.git`; `git status` thất bại. Không reset/clean, không thể tạo diff/worktree. Lưu source các file UI sắp sửa trong `artifacts/visual-before/source/`. Gameplay core/content/protocol/storage không nằm trong phạm vi sửa.

| Màn hình      | Bằng chứng trước sửa / phát hiện chính                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading       | Có luồng boot/loading; chưa chụp riêng trạng thái ngắn này trước sửa                                                                              |
| Main menu     | Entry chung với tạo/chọn nhân vật, không có một main menu riêng                                                                                   |
| Tạo nhân vật  | `creation-{width}.png`, `creation-female-{width}.png`: nền lặp tối, nhiều khoảng trống, sprite phóng lớn placeholder, nam/nữ chưa khác silhouette |
| Chọn nhân vật | `selection-{width}.png`: cùng vấn đề art và portrait SVG chung                                                                                    |
| Gameplay HUD  | `hud-{width}.png`: đã full viewport; icon sơ đồ nhỏ, số HP/MP rất nhỏ trên phone; thiếu target frame React                                        |
| Thành thị     | `hud-{width}.png`: nhà/cây PNG đã có, actor/NPC/đèn/cổng còn procedural                                                                           |
| Bãi luyện cấp | Đã có browser regression qua forest/highlands; chưa có ảnh baseline riêng forest                                                                  |
| Thanh Vân Sơn | `thanhvanson-{width}.png`: có streaming, vẫn trộn art PNG và procedural                                                                           |
| Combat        | Đã có VFX pool; chưa chụp riêng baseline combat                                                                                                   |
| Ground loot   | Rarity 6 màu đã có; chỉ rare/epic có beam; còn hình học procedural                                                                                |
| Inventory     | `inventory-{width}.png`: desktop 4×8 hàng quá cao, footer/tiện ích bị cắt; ô và icon thiếu chi tiết                                               |
| Equipment     | `equipment-{width}.png`: SVG đứng giữa, hàng slot phía dưới, slot trống cùng một Shield icon                                                      |
| Chỉ số        | Chung equipment; chưa có so sánh đồ chọn với đang mặc                                                                                             |
| Skill tree    | `skills-{width}.png`: có logic/khóa/cấp, icon sơ đồ đơn giản                                                                                      |
| NPC dialogue  | `dialogue-{width}.png`: dùng hero SVG chung cho NPC                                                                                               |
| Shop          | `shop-{width}.png`: danh sách giống bảng, 2–3 item, thiếu sell tab/filter và identity                                                             |
| Enhancement   | `enhancement-{width}.png`, `enhancement-result-{width}.png`: preview/log thật nhưng chưa có diễn hoạt kết quả                                     |
| Crafting      | `crafting-{width}.png`: nguyên liệu một chuỗi văn bản, thiếu output/material hierarchy                                                            |
| Warehouse     | `warehouse-{width}.png`: chỉ một phía, khó đối chiếu túi/kho                                                                                      |
| Quest log     | `quests-{width}.png`: hoạt động, khung và hierarchy cần thống nhất                                                                                |
| World map     | `map-{width}.png`: connections hoạt động, biểu diễn vector đơn giản                                                                               |
| Settings      | `settings-{width}.png`: tùy chọn thật, cần giữ readability/focus khi đổi theme                                                                    |

Ưu tiên triển khai ngay: hệ thống vật liệu/typography; inventory vừa viewport; item bitmap và semantic mapping; shop/forge riêng; portrait; mobile kiểm tra ảnh lại. Không tính việc đổi CSS là production art. Map terrain/actor/audio sản xuất vẫn là việc lớn đang mở.
