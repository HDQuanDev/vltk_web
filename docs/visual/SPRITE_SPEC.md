# Actor art handoff

Runtime hiện dùng 64×96 px, feet anchor (32,88), tile 96×48/world unit. Hướng E/SE/S/SW/W/NW/N/NE; 6 frame/hướng/state. Mỗi hướng phải vẽ/render độc lập, không xoay một ảnh thành 8 hướng. Giữ 2 px transparent gutter trong từng cell; premultiplied alpha, không matte, không viền trắng. Atlas mobile tối đa 2048 mỗi cạnh: tách theo actor/state nếu vượt, không scale méo hình.

Đang tích hợp: 8 state idle/walk/attack/cast/hit/dead/revive/interact từ atlas procedural. Nữ có silhouette tóc/vạt áo khác, không chỉ tint. Camera/depth/occlusion cùng vị trí được interpolate; gameplay position vẫn authority.

Cần sản xuất: run, mounted-idle, mounted-move; full 11-state set, từng giới tính, vũ khí/môn phái, monster/NPC identity. Hair/face/costume/weapon overlay phải cùng canvas, frame count, direction ordering, anchor và tick timing. Sprite tấn công/niệm phép cần event markers do combat authority gửi, không tự áp damage trong animation.

Manifest tối thiểu: stable ID, version, source/provenance, quality, path, canvas, feet, states/directions/FPS/frame layout, weapon and appearance compatibility. Các chân dung mới là framed illustration, không dùng như sprite cắt nền và không tính thành actor production.

Review: `/animation-inspector.html` ở dev; kiểm tra mọi hướng/state, chân không trượt, đổi hướng không nhảy anchor, dead/revive terminal frames, weapon không crop, silhouette nam/nữ, UI/camera 30/60Hz. Save không lưu frame render.
