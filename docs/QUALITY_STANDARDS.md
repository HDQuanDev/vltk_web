> Baseline v0.2. Thay đổi v0.3 và trạng thái hiện tại: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [rendering](architecture/rendering.md), [world streaming](architecture/world-streaming.md), [full-release](roadmap/full-release.md).

# Tiêu chuẩn chất lượng và cổng nghiệm thu

Mỗi đợt phải đạt typecheck (gồm core Node không DOM), lint, content validation, unit/integration, migration/backup, build và browser E2E. Không sửa fixture cũ thành schema mới để làm test qua. Một feature phải có rule core, dữ liệu, UI PC/mobile, save nếu cần, kiểm chứng và tài liệu giới hạn.

## Đồ họa/hiệu năng

Atlas hiện 384 frames mỗi loại, anchor nhất quán, manifest quality `requires-production-art-review`. Công cụ dev `/animation-inspector.html` xem 8 hướng/trạng thái, không build vào production. Art gốc procedural chưa tương đương ảnh tham chiếu; NPC vẫn có sprite tĩnh. Cần review hướng vũ khí, clipping, walk contact, hit/death, appearance/equipment, readability trên mobile và VFX/audio từng phái.

Diagnostics settings đo actualFps, CPU thời gian update scene, số objects/textures. Đây không phải GPU frame time hoặc chứng nhận FPS thiết bị thật. Cần đo desktop, Android tầm trung, iPhone/Safari, portrait/landscape, thermal throttling, memory sau nhiều lần chuyển map. Không ghi 60 FPS nếu chưa đo.

## Save/offline

Test v0.1 fixture thật → v2 giữ tiến trình và archive nguồn; corrupted primary không ghi đè backup tốt; future version từ chối; lỗi/quota hiện thông báo. PWA chỉ nghiệm thu ở production với Service Worker đã cache; chặn mạng rồi reload, chơi và lưu, reload lần nữa. Không coi dev server hoặc mở trang từ HTTP LAN là bằng chứng Service Worker.

Soak 288.000 ticks = 4 giờ game chạy tăng tốc trong Node, 8 checkpoint validate và resume replay. Không gọi đó là 4 giờ render, sử dụng điện thoại thật hoặc chứng minh không có leak GPU.

## Nội dung

Đếm definitions là điều kiện cần, chưa đủ. Mỗi map/quest/boss phải khác gameplay hoặc phần thưởng; skill phải thực thi được và có identity; item phải có đường dùng/nguồn/sink hợp lý. Bài đo DPS một target không đủ nghiệm thu class balance. Không tạo hàng trăm bản sao tên khác để nâng coverage.

Bản v1.0 chỉ phát hành sau đủ hệ thống/nội dung theo master, không blocker save/gameplay, các hành trình A–H được chứng minh, offline thật, PC/mobile usable, art/audio và báo cáo thiết bị. Xem [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) cho phần chưa đạt.
