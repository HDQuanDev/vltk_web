# Nguồn art môi trường v1

Tạo mới bằng **built-in ImageGen** trong phiên overhaul; không lấy từ asset game thương mại. Prompt props nằm trong [prompts.json](prompts.json); texture nền trong [ground-prompt.txt](ground-prompt.txt), cũng dùng built-in ImageGen. Chưa đánh dấu production-ready; bốn prop và material nền còn cần review phối cảnh/scale/occlusion/biến thể trong bộ art cuối.

| Asset | Nguồn giữ nguyên | File runtime chuẩn hóa |
|---|---|---|
| Nhà | [house-v1.png](house-v1.png) | [house-v1.png](../../../apps/web/public/assets/overhaul/house-v1.png) |
| Thông | [tree-v1.png](tree-v1.png) | [tree-v1.png](../../../apps/web/public/assets/overhaul/tree-v1.png) |
| Mai | [cherry-v1.png](cherry-v1.png) | [cherry-v1.png](../../../apps/web/public/assets/overhaul/cherry-v1.png) |
| Trúc | [bamboo-v1.png](bamboo-v1.png) | [bamboo-v1.png](../../../apps/web/public/assets/overhaul/bamboo-v1.png) |
| Vật liệu nền | [ground-v1.png](ground-v1.png) | [ground-v1.png](../../../apps/web/public/assets/overhaul/ground-v1.png) |

Runtime chỉ uniform resize max512px bằng `sips -Z 512`, giữ tỷ lệ và alpha. Source nằm riêng và nằm ngoài public/build/ServiceWorker; runtime gồm4prop PNG và1texture nền. Không dùng source tĩnh làm toàn game world hoặc cắt thành animation giả.

Metadata ID/pivot/display size/quality tại `packages/game-content/src/visual-assets.ts`. Chạy `pnpm validate:assets`, xem `/asset-inspector.html` trên dev server, rồi rà scene PC/mobile. NPC/actor/terrain/icon vẫn có asset phát triển, cần thay để đạt cùng phong cách production.
