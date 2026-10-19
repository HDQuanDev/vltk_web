# Gameplay systems và thứ tự phụ thuộc

Giữ protocolv1, schemaSavev2, fixed20Hz/seed/command/event/snapshot/session. V0.3 đổi contentversion, không tạo kiến trúc song song. Gameplay mới vẫn chạy trong Node khôngDOM; render/audio/preferences không tính outcome.

Đợt hiện tại: world metadata/paths/areas → heapnavigation → chunkterrain/props/camera → HUD/input/VFX/audio → quest/NPC navigation và area objectives → migration/archive → tests/QA. NPC/event dialog race, hotbar trùng và doubletap nâng đồ được sửa tại lớp đang chịu trách nhiệm.

RPG còn thiếu phụ thuộc theo thứ tự: itemgenerator/affix/set/refinement/shopsstock → economy/NPCmarket; instanceID/checkpoint/reset → dungeon; companionroles/follow/targetassist → party; mountmovement/restrictions/save/animation; guildNPC/arena/siege cần factions/objectives/ownership/budget. Story/sectNPC/quests/regions phải được author cùng progression và reward, không thêm definitions rỗng để đạt count.

Đích vẫn10phái/20nhánh/140+skills, khoảng50map,100quái/20boss,500items,150quest,10dungeon,6+nghề và100cấp có nội dung. Hiện mới4map/6quái/1boss/11items/15quests, chưa có dungeon/companion/mount/guild/arena/siege. Sharedcore reuse đã có; authoritative server/RemoteGameSession/Colyseus chưa vận hành.
