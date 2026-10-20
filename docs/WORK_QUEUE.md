# Work queue

Danh sách việc đang mở, lấy từ [ROADMAP](ROADMAP.md) và [FULL_OFFLINE_RPG](FULL_OFFLINE_RPG.md). Trạng thái: `open` · `in-progress` · `blocked` · `done`. Không xoá việc; chỉ đổi trạng thái và ghi bằng chứng. Việc `done` gần nhất được ghi vào [EXECUTION_STATE](EXECUTION_STATE.md).

## A — Streaming / large farm (gate trước khi nhân content)

| ID   | Việc                                                                                                                       | Trạng thái | Điều kiện hoàn thành                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| A1   | View projection cho vòng publish 20Hz + `worldTotals`, save vẫn dùng authority                                              | done       | `viewSnapshot` + 8 case integration + assertion browser; đo ở `artifacts/world-footprint.json`                 |
| A2   | Paging/eviction cho dormant memory (entity/loot dormant của map đã thăm hiện vẫn resident)                                  | evaluated  | Đã đo: ~1.35MB heap/map256 đầy quái (~53MB ở40map). Không phải blocker cho content; chỉ làm khi số đo mới (512/1024 map) yêu cầu |
| A3   | Delta publish / interest radius (hiện gửi view đầy đủ theo bản đồ mỗi tick)                                                 | open       | Có contract delta + test replay/ACK; không lệch state giữa các lần publish                                     |
| A4   | Navigation cold-index/query trên thiết bị thật (17ms/1.55ms trên máy dev, chưa chứng minh mobile)                            | open       | Đo trên Android/iOS thật, ghi thiết bị và ngân sách; chỉ khi đó mới tính 512/1024                               |
| A5   | Xác minh publish/tick ở 512/1024 map và nhiều actor hơn                                                                     | blocked    | Phụ thuộc A2/A3/A4                                                                                             |
| A6   | Worker/incremental cho build index và query khi số đo yêu cầu                                                               | blocked    | Chỉ mở khi A4 cho thấy cần                                                                                     |

## B — World / monster content (sau gate A)

| ID   | Việc                                                                                                    | Trạng thái | Điều kiện hoàn thành                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| B1   | Đủ 40+ map có nội dung: 6 hub/làng, 10 khu môn phái, 16 bãi luyện cấp, 6 hang động, 2 khu boss        | in-progress | Đã có Thanh Vân Sơn 320×320 (15 POI, 16 bãi, hồ+sông+2 cầu, vách đá, NPC/quest/resource/portal riêng); còn 34 map nữa |
| B2   | 100–120 monster definition với AI/kỹ năng/ngũ hành/loot khác biệt thực sự                              | in-progress | Đã thêm 10 quái cấp 9–16 (pack/melee/ranged/assassin/poison/boss) + 3 kỹ năng riêng cho quái; còn ~90 definition |
| B3   | 20 boss với mechanic riêng và telegraph                                                                 | open       | Mới có 2 boss (Hắc Phong Trại Chủ, Vân Sơn Yêu Vương dùng phase+summon+telegraph)                              |

## C — Itemization

| ID   | Việc                                                                                     | Trạng thái | Điều kiện hoàn thành                                                                    |
| ---- | ---------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| C1   | 300–500+ item có nguồn nhận và vai trò sử dụng thật                                       | in-progress | Đã có 45 item (thêm 33: vũ khí/giáp/mũ/giày/phụ kiện/thuốc/nguyên liệu/ngọc) đều có loot hoặc giá bán; còn ~255 item |
| C2   | 6 cấp phẩm chất, đủ slot (vũ khí/giáp/mũ/giày/lưng/nhẫn/dây chuyền/vòng/bùa)             | in-progress | Đã có 6 phẩm chất và 5 slot (weapon/armor/boots/helmet/accessory) + `requiredLevel`; còn lưng/nhẫn/dây chuyền/vòng |
| C3   | Random affix, element, set bonus, ilvl, requirements, socket                                  | in-progress | Affix ngẫu nhiên theo RNG authority (roll khi rơi, cộng thật vào chỉ số, lưu save) đã có; còn element riêng, set bonus, socket sâu |

## D — Shop / economy

| ID   | Việc                                                                              | Trạng thái | Điều kiện hoàn thành                                                        |
| ---- | --------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| D1   | Shop: stock/restock/buyback/filter/quantity, NPC market theo cung–cầu và game clock | open       | Giao dịch chống nhân đôi item/tiền khi bấm nhiều lần; có test transaction   |
| D2   | Cường hóa tới +15: RNG authority, safeLevel +5, mất cấp 1/2, Đá Hộ Mệnh, chi phí, log 20 dòng, preview + lịch sử trong UI | done       | 8 case integration (an toàn, RNG, bảo vệ, chi phí nguyên tử, trần, log/save, replay, item có nguồn) + assertion E2E UI |
| D2b  | VFX/SFX lò rèn cho cường hóa (tia lửa, golden burst, khói thất bại, âm thanh) và playtest cân bằng +15                     | open       | Có asset/VFX thật; event `equipment.success` đã sẵn; có số đo/playtest tỉ lệ trước khi coi là hoàn tất                   |
| D3   | Refinement, gem upgrade, affix reroll, profession progression                       | open       | Có recipe/điều kiện/nguồn nguyên liệu và test                                |

## E — Art / combat / audio

| ID   | Việc                                                                        | Trạng thái | Điều kiện hoàn thành                                                                     |
| ---- | --------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| E1   | Production actor/monster/NPC/tile/prop thay procedural                      | in-progress | 16 bộ sprite quái (624 PNG) + 21 bộ sprite nhân vật theo (phái, giới) (819 PNG) đã nối runtime (map/lobby) với fallback procedural; NPC/tile/prop còn procedural, chưa đạt 8 hướng/11 state. Ảnh: `artifacts/monster-sprites/`, `artifacts/actor-sprites/` |
| E2   | VFX/kỹ năng: trail, projectile, nổ, vùng, ngũ hành, buff/debuff, telegraph   | open       | Mỗi kỹ năng có phản hồi hình ảnh/âm thanh đúng thời điểm                                 |
| E3   | Audio thật: nhạc theo vùng/boss, SFX vũ khí/kỹ năng/loot/mua bán/đập đồ      | open       | Asset thật, có mixer/volume; không dùng synth tối thiểu rồi báo hoàn tất                  |

## F — Full RPG content

| ID   | Việc                                                                             | Trạng thái | Điều kiện hoàn thành                                                              |
| ---- | -------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| F1   | 100+ quest có nội dung (main/side/sect/farm/boss/dungeon/craft/explore/daily)     | open       | Không lặp "giết 10 quái" đổi tên; có objective/điều kiện/thưởng khác nhau          |
| F2   | 6+ dungeon instance: entry condition, wave, boss, reward, checkpoint, reset       | open       | Instance state lưu/khôi phục đúng, reset rule test được                          |
| F3   | Companion, party, mount, NPC guild, duel/arena/tournament, siege, world event     | open       | Từng hệ thống có authority logic + UI + save; không xoá khỏi roadmap              |
| F4   | Progression tới cấp 100 thực tế (EXP/stat/skill/attribute curve)                  | open       | Có số đo cân bằng và test hành trình tới mốc cấp cao                              |

## G — Acceptance / polish
| ID   | Việc                                                                              | Trạng thái | Điều kiện hoàn thành                                                          |
| ---- | --------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| G1   | Hành trình đầy đủ PC/mobile theo master, không dùng test hook cấp đồ/tiền/EXP      | open       | E2E chạy trọn hành trình thật; không grant trong bài kiểm thử                 |
| G2   | Soak render dài, 30 phút render thật, memory nhiều giờ                             | open       | Có số đo trên browser thật, ghi rõ giới hạn                                    |
| G3   | Safari/PWA installed, cache eviction, quota, update fault                          | open       | Fault-inject từng tình huống, không mất save                                  |
| G4   | Accessibility, focus, input customization                                          | open       | Kiểm tra bàn phím/screen reader cơ bản, có test                                |
| G5   | Đo FPS/GPU/thermal trên Android/iOS thật                                           | open       | Chỉ báo đạt khi đo trên thiết bị thật                                         |

## Online (sau offline)

| ID   | Việc                                                                       | Trạng thái | Điều kiện hoàn thành                                                          |
| ---- | -------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| O1   | instanceId/routing/ownership registry (bước 1 online migration còn thiếu)   | open       | Có contract + test nhiều actor nhiều map                                      |
| O2   | RemoteGameSession + transport, ACK sequence, delta theo interest            | open       | Cùng interface `GameSession`, có test reconnect/idempotency                   |
| O3   | Authoritative persistence, auth, anti-cheat, party/guild/chat/PvP           | open       | Không nhận save offline vào economy trusted                                   |

## V — Visual overhaul (phiên UI riêng, 19/10/2026)

Scope theo yêu cầu visual overhaul, không thay thứ tự gameplay/content của phiên khác. Tách UI integrated, visual reviewed và production asset ready. Chi tiết nghiệm thu tại [AFTER_REVIEW](visual/AFTER_REVIEW.md).

| ID | Việc | Trạng thái | Bằng chứng / còn lại |
|---|---|---|---|
| V1 | Design system, entry, full viewport HUD PC/mobile, panel/focus | in-progress | Token ink/bronze/jade, backdrop/portraits, target/status/EXP/compact HUD, safe-area, touch controls. Đã tích hợp, đang chốt ảnh/checks; keyboard customization và device review còn mở |
| V2 | Item art, inventory, equipment, tooltip, ground loot | in-progress | 36 bitmap, semantic mapping cho45 item, atlas768²; grid/detail scroll riêng, 5 slot thật, so sánh từ core helper, khóa/cường hóa/ngọc. Art review-required; chưa phải 45 icon độc bản sản xuất |
| V3 | Shop, forge, craft, gem, warehouse | in-progress | Buy/sell/filter thật; forge authority receipt + skip/motion/finite effects; output/material/gem preview; kho hai phía. D1 stock/restock/buyback/quantity và D3 gameplay vẫn mở; D2b chưa có production art/audio/playtest cân bằng |
| V4 | World art/actor/camera | in-progress | Depth/occlusion theo vị trí render, female silhouette riêng; pipeline/spec đã có. Actor/NPC/monster/tile/bridge production và 11state/layers còn thiếu, E1 vẫn open |
| V5 | Skill/combat/audio presentation | in-progress | Painted skill icons, 6rarity loot, 5WAV development + mixer/PWA. Combat VFX hiện có vẫn là procedural pool; animation/particle art/nhạc/SFX production còn mở |
| V6 | Visual acceptance PC/mobile/WebKit, regressions, performance | in-progress | Chromium screenshots5viewport, WebKit smoke2viewport, tests bổ sung transaction/tooltip/focus/motion. Chưa có thiết bị thật, installed Safari/iOS/Android, GPU/thermal/30phút render, accessibility sâu |
