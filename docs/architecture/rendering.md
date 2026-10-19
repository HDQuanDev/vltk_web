# Rendering v0.5

Giữ Phaser3.90, AUTO chọn WebGL hoặc Canvas theo khả năng browser; không có bằng chứng cần đổi sang Pixi/custom engine. Bootstrap dùng RESIZE, antialias, subpixel, FPS setting30/60 và3activepointers. Render resolution mặc định; chưa chứng nhận highDPI/thiết bị thật.

| Module | Trách nhiệm |
|---|---|
| WorldScene | Nhận snapshot/event, lifecycle, input, entity views/NPC/portal |
| ChunkWorldRenderer | Terrain/prop index, visible chunks, canvas textures, LRU, unload và counters |
| CameraController | Follow/dead zone/zoom/bounds/reduced motion |
| CombatVFXRenderer | Graphics/text pools, lifetime/budget, hình ngũ hành khác nhau |
| EnvironmentRenderer | Weather/lighting/resources/projectiles theo snapshot |
| preferences | QualityAuto/Low/Medium/High và client controls/volumes |
| visual-assets | ID/path/dimensions/pivot/quality/source của props |

Core không import các lớp trên. Renderer không tính damage, loot hoặc quest. Animation dùng state/direction/tick; VFX chỉ phản hồi kết quả authority. Asset lỗi đi qua loaderror thông báo, không âm thầm thay hình thành công giả.

Terrain không còn canvas3072×1664 cố định. Chunk8×8 có bbox772×388px ở resolution1, độc lập kích thước toàn map. Props ngoài viewport/prefetch bị destroy cùngchunk, texture bị remove; actor/lootview ngoài viewport cũng được destroy, authority data giữ nguyên. Queue ưu tiên visible trước prefetch, tạo tối đa2chunk/frame, sau chunk đầu dừng nếu đã dùng4ms; camera đổi hủy pending cũ. Chuyển map dọn texture/views/effects theo lifecycle. Quality giảm resolution terrain, số weather strokes và VFX; không thay simulation. Active chunks được bảo vệ khỏi eviction; cache limit có thể tăng tới số active nếu viewport cần nhiều hơn cấu hình.

Camera clamp vào render envelope có18ô cảnh quan không đi được quanh vùng logic. Click ra ngoài walkable vẫn bị core từ chối; việc render biên tránh lộ màu trống, không mở thêm đất chơi. Reduced motion tắt shake và giảm tween. Chưa đủ targetfocus/resetbutton/userzoom controls trên mobile.

Đã đo120visits tổng2viewport qua Thanh Sơn/Vân Khê,6mapchanges/viewport; tối đa32/26cachechunks,36.56/16.71MiB terrain CPU và0missingtextures. `created-released=cached` qua mọi checkpoint, heap sauGC khoảng10–11MB ở bài đo ngắn. Chi tiết `artifacts/streaming-browser.json`. Chưa đo drawcalls/GPUmemory/thermal hoặc render dài trên điện thoại thật. Budget4ms không bảo đảm mộtchunk đơn lẻ dưới4ms; maximum renderer update đã đo9ms. Vẫn cần production atlas batching, thiết bị thật và memory soak dài.

Auto hiện chọn theo viewport; chưa tự chỉnh theo FPS/nhiệt/GPU. Teardown scene xử lý cả shutdown và destroy; wrapper detach canvas ngay khi đổi character, rồi để Phaser hoàn tất destroy ở frame kế tiếp.

Rock/lantern/gate development texture hiện chỉ cóvariant0. Renderer dùngvariant0 khi catalog yêu cầu variant thủ tục chưa có; không tính thành asset biến thể mới. Inspector cómissingTexturescounter và test0. Các PNG thiếu thật vẫn đi qua loader error.

## Presentation consistency 19/10/2026

Actor depth và prop occlusion dùng cùng vị trí đang được interpolate mà camera đang follow. Fade occlusion theo delta render, reduced motion đổi ngay. Không sửa simulation position. Ground loot dùng chung atlas interface768²/128frame, beam đủ rare/epic/legendary/mythic; fallback development graphics vẫn có nếu texture chưa sẵn, loader lỗi tiếp tục thông báo thật.
