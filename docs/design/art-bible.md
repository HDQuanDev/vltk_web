# Art bible và hợp đồng asset

Đích: võ hiệp cổ điển, orthographic2:1, vật liệu đá/gỗ/ngói có chi tiết, palette đất ấm/jade/ngói xanh xám/đồng cũ. Actor và skill cần đọc được trên nền, không dùng glow phủ kín telegraph. Bộ hiện tại **chưa thống nhất production style** vì actor/NPC/terrain vẫn procedural/SVG, dù props mới đã nhiều chi tiết hơn.

Thông số runtime: tile96×48/worldunit1; actor64×96, feet(32,88),8hướng E/SE/S/SW/W/NW/N/NE,6frames×8states idle/walk/attack/cast/hit/dead/revive/interact. Muốn đổi sprite phải giữ mapping/anchor hoặc cập nhật manifest/loader; không đổi combat. Run/mountedidle/mountedmovement và armor/weapon overlay sản xuất chưa có.

4prop và1groundmaterial mới tạo bằng built-inImageGen: nhà, thông, mai, trúc. Giữ original PNG và prompts tại assets/source/overhaul; runtime chuẩn hóa bằng uniform resize max512px, không làm méo aspect. Không cắt một concept thành animation. Metadata tại visual-assets.ts chứa ID/path/canvas/pivot/displaywidth/license/quality.

Pipeline: tạo source → xem alpha/geometry → normalize không đổi tỷ lệ → điền manifest → validatePNGdimensions/alpha → xem asset browser/pivot → scenePC/mobile → human production review. Hiện4props đều review-required, production-ready0. Cần biến thể kiến trúc, foliage scale/depth/occlusion chính xác hơn và thay actor/NPC trước khi nghiệm thu đồ họa.

Công cụ dev: /asset-inspector.html và /animation-inspector.html; không nằm trong production build. ValidationCLI không thay review viền/bleeding/phối cảnh trên thiết bị thật. Browser test kiểm tra alpha transparent corner và tỷ lệ pixel rõ/trong suốt; source không lấy từ tài nguyên game thương mại.

## Visual overhaul 19/10/2026

Thêm bộ interface original ImageGen: 36 icon128², atlas WebGL768², 6 portrait256², nền entry1920×1080. Metadata/mapping client-only tại `apps/web/src/ui/interface-art.ts`; source/prompts/provenance ở [visual provenance](../visual/ASSET_PROVENANCE.md). Pipeline portable `scripts/build-interface-art.mjs` giữ tỷ lệ, kiểm tra source dimensions trước crop/pack; `validate:assets` kiểm tra runtime metadata. Inspector có item catalog dùng đúng mapping runtime.

Chân dung là framed illustration (nền vẽ), không tính là sprite alpha. Chưa có actor production, 11state hay equipment overlay sản xuất; xem [sprite handoff](../visual/SPRITE_SPEC.md). Female procedural có silhouette tóc/vạt áo khác; vẫn là development art. Các status production/review-required/development không thay thế nhau.
