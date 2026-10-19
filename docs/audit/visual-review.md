# Audit hình ảnh baseline và kết quả đợt overhaul

Ảnh người dùng là bằng chứng bố cục, không phải asset để cắt làm world. Baseline0.2 đã có canvasfull viewport, nhưng header73px/compactmobile và footer đặc che chiều cao; HUD lớn, minimap/quest áp vào tâm. Nguyên nhân là CSSoverlay và cấu trúcwebsite, không phải Phaser tự trừ viewport.

Phaser3.90AUTO/antialias/RESIZE, terraincanvas3072×1664 cố định cho30×30, props512×440, actorprocedural64×96/384frames, NPCSVG. Camera rectanglebounds lộ gócmap, khôngqualityDPR/budgetsđầyđủ. VFX chủ yếu đường/cung/ellipse; audio3triggertones.

V0.3 bỏheader/footer, thêmoverlaycompact,chunkterrain/propLRU,cameraenvelope/reducedmotion,4propPNG/1texture nền/VFXngũhành/mixer. Đã xem screenshotPC/mobile ngang/dọc và asset browser. Nhà/cây chi tiết hơn, alpha thật; actor/NPC/terrain/UI vẫn lệch chất lượng và cần productionart. Không tuyên bố tương đương ảnh tham chiếu hoặc toàn bộ art đã thay.

Bằng chứng:artifacts/overhaul-*.png,highlands-*.png,world-streaming-inspector.png,asset-audit.json,alpha-browser.json. HeadlessQA không chứng nhận FPS/đồhọa trênđiệnthoại thật. Báo cáo [IMPLEMENTATION_STATUS](../IMPLEMENTATION_STATUS.md) giữ các mụcPartial.
