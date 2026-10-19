# Visual implementation & review — 19/10/2026

Đã sửa trực tiếp project hiện có. Giữ nguyên game-core/content/protocol/storage/save schema, công thức và authority20Hz. Không có `.git` trong thư mục tiếp nhận, không tạo commit/worktree/diff và không reset/clean. Source UI trước sửa được giữ trong `artifacts/visual-before/source/`.

## Những thay đổi đã tích hợp

| Nhóm              | Kết quả                                                                                                                                                                                                | Trạng thái art/QA                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Entry PC/mobile   | Backdrop sơn môn, portrait nam/nữ, roster, lựa chọn môn phái; toggle xem model8hướng; nút tạo vừa844×390                                                                                               | UI integrated, screenshot reviewed; portrait/backdrop review-required                                                   |
| HUD               | Full viewport; chân dung/HP/MP/EXP; target bar; buff/debuff có nhãn Việt/thời gian; MP warning; thu gọn thông tin phụ; safe area, utility/potion44px                                                   | UI integrated; Chromium5viewport, WebKit2viewport; real-device chưa đo                                                  |
| Inventory/tooltip | 8cột, kích thước hàng rõ ràng; grid/detail scroll riêng; utilities/currency giữ trong cửa sổ; enhancement/quantity/lock/gem/selection; hover bounded PC, touch detail mobile; compare dùng itemBonuses | Integrated + browser tests; 36bitmap semantic mapping cho45item, không tuyên bố45icon độc bản                           |
| Equipment         | Chỉ5slot thật quanh model; nhãn từngslot; stat/equip/unequip dùng commands                                                                                                                             | Integrated/reviewed; model vẫn procedural development                                                                   |
| NPC/shop          | Portrait elder/merchant/smith riêng; dialogue; buy/sell/filter/wallet; quest ở phần mở rộng; quý phẩm xác nhận bán                                                                                     | Giao dịch thật đã test save/reload; không có buyback/stock/quantity giả                                                 |
| Forge             | Scene riêng, offering/materials/protection/rate/preview/history; charging/success/failure; skip, close/reload không replay; giảm chuyển động; hiệu ứng hữu hạn                                         | UI + receipt integration tested; VFX/CSS + painted icons là development presentation, chưa đóng production D2b/playtest |
| Craft/gem/storage | Output/material badges đủ/thiếu, disable thiếu tài nguyên; gem stat/socket preview; nhìn đồng thời túi/kho, filters, capacity                                                                          | Integrated + existing economy E2E; refinement/gem upgrade vẫn chờ core                                                  |
| World/render      | Ground loot bitmap atlas + rarity beams; actor depth/occlusion cùng vị trí interpolate mà camera follow; fade theo delta                                                                               | Regression qua streaming/map/offline; actor/monster/NPC/terrain/props production còn thiếu                              |
| Skill/audio       | Painted skill-family icons, cooldown/MP states;5WAV physical-model SFX và actual outcome event, cap16, preload/unlock/dispose/PWA                                                                      | Audio development, chưa có nghe nghiệm thu trên thiết bị thật; VFX pool/procedural animation còn cần production art     |

Asset source, prompt set, IDs, metadata và chất lượng: [ASSET_PROVENANCE](ASSET_PROVENANCE.md). Sprite còn phải sản xuất: [SPRITE_SPEC](SPRITE_SPEC.md). Dev `/asset-inspector.html` có item catalog dùng cùng mapping runtime.

## Bằng chứng đã chạy

| Lệnh / kiểm tra                                 | Kết quả                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` (cũng chạy trong build)        | PASS monorepo + core khôngDOM                                                                                                                            |
| `pnpm lint`                                     | PASS                                                                                                                                                     |
| `pnpm test`                                     | **295/295**,18file; gồm audio sample/outcome/dispose và asset contract mới                                                                               |
| `pnpm validate:content`                         | PASS,3case                                                                                                                                               |
| `pnpm validate:assets`                          | PASS; PNG dimensions/atlas IDs, portraits/lobby và WAV headers; không đồng nghĩa production art approval                                                 |
| `pnpm build`                                    | PASS,70PWAprecache entries (~10.8MiB). Còn cảnh báo bundle Phaser/chunk>500kB và annotation của Zod                                                      |
| `pnpm exec playwright test`                     | **56/56 PASS**;10case UI mới ngoài46case cũ                                                                                                              |
| `node scripts/smoke-webkit.mjs`                 | PASS1366×768/844×390: creation/HUD/inventory/equip/save/reload;0pageerror,0pageoverflow                                                                  |
| `pnpm report:content`                           | 6maps,16monsters/2bosses,45items,28quests,14NPC,144skills,0dungeon,11recipes                                                                             |
| `pnpm profile:core` và `pnpm profile:footprint` | Đã chạy, artifacts được cập nhật. Có browser/tests chạy song song nên số đo này **không dùng làm so sánh hiệu năng**, không suy ra FPS/GPU/thiết bị thật |

Các regression mới kiểm tra: hai hàng item không overlap; tooltip không vượt viewport; comparison đúng +24 attack từ helper core; focus không thoát modal/ESC; forge skip/reload không lặp transaction; mua/bán cập nhật đúng tiền/quantity/save; portrait/motion giữ khi reload; compact HUD giữ joystick/attack; nút tạo nằm trọn viewport trước khi browser tự scroll.

## Ảnh và cách xem

- Baseline: `artifacts/visual-before/` —5viewport. [Baseline review](BASELINE_REVIEW.md).
- Sau sửa: `artifacts/visual-after/` —1920×1080,1366×768,932×430,844×390,1180×820. `capture-report.json` ghi **113checkpoint:0page error/assets404,0overflow,0dialog ngoài viewport**. Có thêm contact sheets `contact-1366.png`/`contact-844.png`, đã xem trực tiếp toàn bộ16màn hình chính trên mỗi sheet.
- Trang so sánh: `artifacts/visual-review.html`, chọn màn hình/viewport để xem hai ảnh. Chạy game bằng `pnpm dev`/`pnpm preview`; gallery là file review riêng, không phải gameplay page.
- WebKit: `artifacts/visual-after/webkit/` và `report.json`.
- Vòng sửa đầu: `artifacts/visual-iterations/`.

Ảnh quan trọng: `creation-*`, `creation-female-*`, `selection-*`, `hud-*`, `inventory-*`, `equipment-*`, `item-detail-*`, `item-tooltip-*` (PC), `shop-*`, `enhancement-*`, `enhancement-result-*`, `enhancement-failure-*`, `crafting-*`, `gems-*`, `warehouse-*`, `skills-*`, `dialogue-*`, `thanhvanson-*`, `combat-*`, `ground-loot-*`.

Đã xem trực tiếp ảnh trước/sau creation, HUD, inventory/detail/tooltip, equipment, shop, forge thành công/thất bại, combat/loot, PC/mobile. Qua ảnh đã sửa ba lỗi bố cục thật: grid desktop quá cao; mobile row shrinking gây overlap; nút tạo trên phone bị cắt. Shop mobile đưa hàng hóa lên trước quest và thu gọn dialogue. Không dùng việc đổi CSS làm bằng chứng đẹp hơn khi chưa xem game.

**Giới hạn ảnh:** economy/map/combat/failure dùng save fixture qua import UI thật, có validateSave. Fixture failure dùng seeded GameWorld để chọn một lần thất bại có thật rồi người chụp gửi command qua UI. Không sửa RNG trong React, không gọi đây là progression/playtest cân bằng. Ground-loot ảnh hiện có gồm drop thật sau cast qua UI; không đảm bảo đủ6rarity trong cùng một ảnh. Loading/main-menu không có baseline riêng; entry là màn hình tạo/chọn chung. Chưa có ảnh riêng bãi forest ở đợt baseline.

## Còn thiếu — toàn bộ scope vẫn mở

- Production actor8hướng11state, hair/face/costume/weapon overlays, monster/NPC identity; silhouettes procedural mới vẫn chưa đạt art production.
- Terrain/road/water/bridge/cliff/gate/lantern và nhiều kiến trúc đồng nhất. Đèn/cổng/actor hiện vẫn lộ placeholder trong screenshot combat; không đánh dấu world art đã hoàn tất.
- Skill-specific animation/VFX atlas/particles và production music/ambient/weapon/voice SFX.5WAV synthetic development không thay audio production.
- Stock/restock/buyback/quantity/NPC market/refinement/gem upgrade khi gameplay contracts sẵn; UI không giả lập giao dịch thiếu authority.
- Android/iOS thật, Safari installedPWA/cache/quota/update faults,30phút render/heap/GPU/thermal, listening review, keyboard remap/screen reader/focus audit sâu. WebKit headless không chứng minh các điều kiện này.

V1–V6 giữ `in-progress` trong WORK_QUEUE. Đây là đợt nâng cấp UI/presentation đã tích hợp và kiểm thử, **chưa phải nghiệm thu full visual overhaul production**.

Lượt bổ sung art cổng sau QA bị ImageGen trả HTTP403, không tạo output và không đổi bản game đã test. Cổng vẫn là development art. Xem [asset provenance](ASSET_PROVENANCE.md#gate-art-attempt--không-có-output) để tiếp tục; CLI fallback cần API key và yêu cầu rõ theo skill.
