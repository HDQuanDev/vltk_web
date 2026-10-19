# Audit implementation gốc v0.1.0

Đã đọc core/world, navigation/formulas/inventory, session, protocol, toàn bộ catalog/schema, storage, scene/renderers, bootstrap/audio, App/Panels, styles, tests và tài liệu. Bảng này phản ánh mã trước đợt phát triển tiếp theo, không suy luận từ README.

| Hệ thống | Đang có | Thiếu | Lỗi/giới hạn tìm thấy | Cần phát triển |
|---|---|---|---|---|
| Render/animation | 6 SVG tĩnh, bob/swing, Y-sort | 8 hướng, frame animation, hit/revive/interaction | `facing` chỉ có dấu X; chết bằng xoay cả ảnh | Atlas theo manifest, state machine, anchor chân |
| Map | 3 map, canvas terrain/props, collision, A* | Biome mở rộng, lighting, weather, resources, foreground fade | Rời map xóa toàn bộ quái; quay lại reset quái và loot | Lưu map instances, lazy render, môi trường theo game clock |
| Core | Tick 20Hz, seeded RNG, snapshots, commands | Projectiles/status/cast/threat | Một số command/reward gắn playerId chính | Actor-owned RPG data, chung combat pipeline |
| Session | Local timer, clone snapshot, subscribe/dispose | Pause, headless soak/profile | Tab nền throttle làm chậm game; chưa có pause rõ ràng | Pause theo simulation state, test lifecycle |
| Nhân vật | Tạo/chọn/xóa, stat allocation | Cấp 100, reset, progression breakdown | Cấp giới hạn 60; 3 phái chung chiêu | Cấu hình 10 môn phái và các nhánh thực sự |
| Combat | Melee/hitscan/AOE/heal/guard | Travel/hit collision, cast, interrupt, DOT/HOT/CC/shield/leech | Guard đặc biệt nằm trong cooldown; chưa animation lock | Data-driven effects và pipeline có thứ tự |
| AI/boss | Detect/chase/attack/leash/patrol/respawn, boss tăng damage | Ranged positioning, threat, telegraph, summons/phase mechanics | Boss vẫn dùng phần lớn AI quái thường | Brain state/config và nguy hiểm có thời gian né |
| Skills | 5 definitions | Tối thiểu 140 và >=20 nhánh chất lượng | Môn phái không có identity qua skill | Skill ownership/loadout/branches/passives |
| Inventory/equipment | 8 items, stack 32 ô, 3 equipment slots, shop | Affix/gems/sets/lock/warehouse/craft/enhance | Số ô lặp trong UI/schema/core; item requirements chỉ cấp | Transactions dùng chung và upgrade ảnh hưởng derived stats |
| Quest | 3 kill quest tuyến tính, claim idempotent | >=150, đa objective/repeat/dialogue branches | UI có một số hướng dẫn hardcode sơn tặc/lang vương | Event progress và catalog objective phong phú |
| Save | Dexie primary + backup, validate, import/export | Migration schema/content, quota handling, soak nhiều giờ | Chỉ nhận literal contentVersion; save mới thay backup kể cả primary cũ hỏng | Migration có lưu bản nguyên gốc; lỗi dễ hiểu; test legacy fixture |
| PWA | Workbox precache app/SVG, offline reload E2E | Cache content mở rộng, asset monitoring | Phải giữ URL/revision duy nhất và kiểm tra tài nguyên mới | Regression offline sau mọi phiên bản |
| PC/mobile | HUD/panels, joystick, quick skills | Target lock, skill presets, active loadout, UI hệ thống mới | Hotbar dùng `skills.slice`, không theo phái | Shared loadout + adaptive touch UI |
| Audio | Tone SFX và pentatonic loop | Ambient/footsteps/channels/voice limits | Chưa audio manager đầy đủ | Gắn kênh và giới hạn polyphony |
| Server reuse | Core Node không DOM, typed contracts, replay | Ownership RPG đa actor, instances, transport/auth | Rất nhiều dữ liệu RPG ở snapshot local cấp root | Tái dùng rules; không coi save offline là trusted |
| QA | 49 unit/integration, 9 E2E | Migration/long session/perf smoke/classes/8-direction | Chưa bằng chứng thiết bị điện thoại thật | Matrix trạng thái và coverage thật |
| Nội dung v1.0 khác | Chưa có | Companion/guild/arena/siege/dungeon/crafting/marketplace | Chưa triển khai; không thể đánh dấu hoàn tất | Giữ nguyên toàn bộ trong roadmap phụ thuộc |

Fixture `tests/fixtures/v0.1-save.json` được xuất từ GameWorld v0.1 thật trước khi sửa schema để kiểm tra migration. Không được sửa fixture thành format mới để làm test qua.
