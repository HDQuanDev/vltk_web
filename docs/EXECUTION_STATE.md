# Phiên visual overhaul — 19/10/2026 (mới nhất)

Scope: UI/UX, art pipeline, renderer/presentation. Không sửa `packages/game-core`, content definitions, protocol, storage hay save schema. Bản nhận không có `.git`; không thể git status/worktree/diff, không reset/clean. Source UI trước sửa giữ ở `artifacts/visual-before/source/`. Nội dung handoff trước được giữ nguyên phía dưới.

## Đã triển khai

- `GameUI.tsx`: GamePanel focus trap/restore, ItemSlot/tooltip/comparison, resource bar, portrait, localized status strip; theme ink/bronze/jade trong `visual-system.css`.
- Lobby: backdrop và portrait gốc, preview model procedural8hướng riêng. Nam/nữ có hair/skirt silhouette khác; chưa phải production sprite.
- HUD: full viewport giữ nguyên, thêm target health/status/MP warning/mobile EXP/compact toggle; utility và potion touch44px.
- Inventory: 8cột, row tracks rõ ràng tránh overlap844, grid/detail scroll riêng, footer/tiện ích trong cửa sổ. Equipment chỉ5slotthật quanh preview; stat compare dùng itemBonuses.
- Kinh tế: shop buy/sell/filter/currency qua commands, crafting material badges, gem stats, kho đối chiếu hai phía. Forge dùng receipt enhanceLog mới sau một click, skip/close/reload không dispatch lại, finite effects, reduce motion theo client và OS.
- Art: 36icon128²,6portrait256²,lobby1920×1080,WebGLatlas768²; source/prompts tại `assets/source/interface` và `docs/visual/ASSET_PROVENANCE.md`. **Tất cả review-required**; portraits có nền vẽ, không phải alpha cutout.
- Audio:5WAV original physical-model **development** (forge success/failure/craft/coin/equip), preload sau unlock, cap16/mixer/dispose, event.success chọn kết quả, PWA cache. Chưa có audio production/real-device listening review.
- Renderer: ground loot dùng atlas+beam6rarity; actor depth, prop occlusion và camera dùng vị trí đang interpolate. Core vẫn authority.

## File chính

UI: `apps/web/src/ui/{GameUI,ArtIcon,interface-art,ShopPanel,Panels,WorkshopPanel,StoragePanel,CharacterLobby}.tsx/ts`; App/main, `styles/visual-system.css`; preferences/audio; animations/atlas, WorldScene, ChunkWorldRenderer, GroundLootRenderer; devtools/asset-inspector; Vite cacheWAV.

Pipeline: `scripts/build-interface-art.mjs`, `scripts/build-presentation-audio.mjs`, `scripts/capture-visual.mjs`, `scripts/smoke-webkit.mjs`, mở rộng `scripts/validate-assets.mjs`. Tests: `tests/integration/interface-art.test.ts`, audio.test mở rộng, `tests/e2e/visual-overhaul.spec.ts`.

## Kiểm chứng và giới hạn

Lượt chốt đã PASS: `pnpm typecheck`, `pnpm lint`, `pnpm test` **295/295 (18file)**, `pnpm validate:content`, `pnpm validate:assets`, `pnpm build` (70precache/~10.8MiB), `pnpm exec playwright test` **56/56**. WebKit smoke1366/844 (creation/HUD/inventory/equip/save/reload) PASS0error/overflow; WebKit đã chạy lại sau build. Capture sau sửa5viewport có113checkpoint,0pageerror/assets404/overflow/dialog ngoài viewport; xem `artifacts/visual-after/capture-report.json` và `verification-summary.json`.

`pnpm report:content` xác minh6maps/16monsters/2bosses/45items/28quests/14NPC/144skills. Profile core/footprint đã chạy nhưng bị tải song song browser/tests; không dùng làm chứng cứ cải thiện hiệu năng hay FPSthiếtbị. Chi tiết/bằng chứng/giới hạn tại `docs/visual/AFTER_REVIEW.md`.

Baseline ở `artifacts/visual-before/`; ảnh final ở `artifacts/visual-after/`; ảnh vòng sửa ở `artifacts/visual-iterations/`. Fixture kinh tế/map/combat là synthetic saves nhập qua UI thật, không phải progression journey; các E2E journey không grant cũ vẫn giữ.

## Chưa hoàn thành và bước tiếp theo

Blocker art mới: lượt ImageGen tạo cổng paifang trả HTTP403 Forbidden; không có output, không đổi runtime. CLI fallback chưa được yêu cầu; xem ASSET_PROVENANCE. Bản kiểm chứng56E2E/295unit vẫn nguyên vẹn.

1. Review atlas/catalog trên game và thay actor/NPC/monster production theo `docs/visual/SPRITE_SPEC.md`:8hướng,11state,layers,anchor/timing; portrait mới không thay thế việc này.
2. World art: terrain/roads/water/bridge/cliff/gate/lantern và kiến trúc đa dạng; hiện vẫn trộn PNG review-required với procedural.
3. VFX/ngũ hành/skill animation/nhạc/SFX production;5WAV development không đóng E2/E3/D2b. Cân bằng +15 vẫn thuộc gameplay playtest, không tự sửa công thức.
4. D1/D3 gameplay do phiên gameplay phụ trách; sau khi contracts có stock/buyback/quantity/refinement/gem upgrade, tích hợp UI thật và regression; không tạo control giả.
5. Hoàn thành G2–G5:30phút render/heap/GPU, real Android/iOS/Safari installedPWA,quota/updatefaults,screen reader/input rebinding. WebKit headless không chứng minh thiết bị thật.

Không có tự động hóa/agent chạy ngầm sau khi phiên kết thúc. Local dev/preview server chỉ phục vụ xem game, không phải tiến trình phát triển tiếp.

---

# Execution state

Cập nhật: phiên "content-first" (Thanh Vân Sơn + quái/item/NPC/quest mới) sau phiên A1 (view projection) và D2 (cường hóa +15). File này là điểm tiếp nhận cho phiên sau: đọc mục "Bước tiếp theo" trước khi bắt đầu.

## Phiên content-first (mới nhất)

- B1 — Bản đồ luyện cấp lớn `thanhvanson` 320×320 (`packages/game-content/src/thanhvanson.ts`): 15 POI (6 điểm khám phá + 1 khu boss), 9 tuyến đường, hồ Vân + sông + 2 cầu đá, dãy đá tây bắc và vách đá đông bắc, 10 nhà/cổng/đèn, 3475 prop/5891 blocked/2355 water/84 bridge. Portal 2 chiều với Vân Khê (cổng Vân Khê ở Trúc Lâm Tây, cách checkpoint 6 bước).
- B2 — 10 quái mới cấp 9–16 (mist-wolf, stone-ape, cloud-archer, shadow-blade, venom-moth, thunder-crane, bandit-lord, jade-serpent, storm-drummer, cloud-beast boss) + 16 bãi quái (2 bãi sát sơn môn), tinh anh theo zone. Quái có `skillIds` giờ thật sự thi triển kỹ năng: 3 kỹ năng riêng cho quái, mana theo cấp, hồi nội lực khi quay về, chọn skill bằng RNG authority.
- C1 — 33 item mới (45 tổng) với 6 phẩm chất, `requiredLevel`, ô mũ/phụ kiện, phụ từ ngẫu nhiên roll khi rơi (cộng thật vào chỉ số, lưu trong save), 4 recipe mới và loot table theo cấp quái.
- B3 — 7 NPC tiền tiêu (thợ rèn/dược/thủ kho có `service`, sư phụ, từ chủ, lão khoáng, lão đò) + 9 nhiệm vụ theo chuỗi `requires` (kill/collect/explore/craft/equip) + 6 resource node mới.
- A2 — Đánh giá lại bằng memory profiling: ~1.35MB heap mỗi map256 đầy quái (~53MB ở 40 map), tick p95 ~3ms ⇒ **không chặn content**; giữ trong backlog.

## Đã hoàn thành trong phiên này

- A1 — View projection cho vòng publish 20Hz ([WORK_QUEUE](WORK_QUEUE.md)):
  - `packages/game-core/src/world/projection.ts`: `projectView`, `viewScope`, `worldTotals`. Một vòng quét `state.entities` vừa tính tổng toàn world vừa chọn bản đồ thuộc view; entity/loot/projectile/telegraph/resource/spawnregion được lọc theo bản đồ đang có người chơi.
  - `GameWorld.viewSnapshot()` mới; `GameWorld.snapshot()` vẫn là authority đầy đủ cho save/kiểm thử.
  - `LocalGameSession.publish()` dùng view; `getSnapshot()` vẫn trả authority.

- D2 — Cường hóa tới +15 ([WORK_QUEUE](WORK_QUEUE.md)):
  - `enhancementRules` mở rộng: `maxLevel:15`, `safeLevel:5` (luôn thành công, không mất cấp), `successRates` 0.9→0.25 cho +5..+14, mất 1 cấp từ +8 và 2 cấp từ +13, `protectionItemId: "ward-stone"`, `protectionGold:120`; helper `enhanceCost`/`enhanceSuccessRate`/`enhanceFailureLoss`.
  - Item mới `ward-stone` (Đá Hộ Mệnh, material, 220 bạc, bán ở thợ rèn) — nguồn nhận và công dụng thật.
  - `EconomyTransactions` nhận RNG authority (`context.random`), roll bằng `this.random` của `GameWorld` nên `rngState` giữ replay/save-load xác định; lệnh `enhance` có `protect?: boolean`; event `equipment` mang `success`/`value`.
  - `CharacterProgress.enhanceLog` (20 dòng gần nhất) + schema save optional `enhanceLog`, `enhancement` max15; save cũ vẫn round-trip vì không dùng default.
  - `WorkshopPanel`: preview tỉ lệ/hậu quả/chi phí, checkbox Đá Hộ Mệnh, danh sách lịch sử; CSS `.enhance-log`/`.enhance-protect`.
  - `GameSnapshot.worldTotals?` (protocol) để HUD báo tổng entity/quái/loot/map.
  - `Panels.tsx`: dòng diagnostics ghi số entity gửi/tổng, dormant, và đọc tổng loot pool từ `worldTotals` thay vì đếm payload đã lọc.
- Đo quy mô 40 map: `scripts/profile-footprint.mjs` + `pnpm profile:footprint` → `artifacts/world-footprint.json` (map256 tổng hợp tái dùng monster definition thật; fixture relocation, không phải hành trình progression).

## File đã thay đổi

Mới (phiên content-first): `packages/game-content/src/thanhvanson.ts`, `tests/integration/thanhvanson.test.ts`, `tests/e2e/thanhvanson.spec.ts`, `artifacts/thanhvanson-1366.png`, `artifacts/thanhvanson-932.png`.

Mới (phiên A1/D2): `packages/game-core/src/world/projection.ts`, `scripts/profile-footprint.mjs`, `tests/integration/projection.test.ts`, `tests/integration/enhancement.test.ts`, `AGENTS.md`, `docs/WORK_QUEUE.md`, `docs/EXECUTION_STATE.md`, `artifacts/world-footprint.json`.

Sửa (phiên content-first): `packages/game-content/src/index.ts` (6 phẩm chất, `requiredLevel`, ô mũ/phụ kiện, `affixPool`, 10 quái mới, 33 item, 4 recipe, 7 NPC + `service`, 9 quest, 6 resource, 3 kỹ năng quái, portal Vân Khê↔Thanh Vân Sơn), `packages/game-content/src/thanhvanson.ts` (bãi sát sơn môn, reserved, portal), `packages/game-core/src/ai/brain.ts` (quái dùng kỹ năng), `packages/game-core/src/engine/world.ts` (mana/respawn quái, `isEquipment` + `requiredLevel` khi mặc, phụ từ khi rơi loot, auto-loot theo 6 phẩm chất, `nearNpc` theo `service`), `packages/game-core/src/combat/stats.ts` (phụ từ + maxHp/maxMp), `packages/game-core/src/inventory/loot.ts` (`rollAffixes`), `packages/game-core/src/world/loot-pool.ts` (`rarityPriority`), `packages/game-protocol/src/index.ts` (`ItemAffix`, `lootRarity` 6 mức), `packages/game-protocol/src/validation.ts`, `packages/game-storage/src/index.ts` (affixes, lootRarity), `apps/web/src/ui/Panels.tsx` (nhãn phẩm chất, phụ từ, yêu cầu cấp, slot mới), `apps/web/src/ui/ActivityPanel.tsx`, `apps/web/src/game/renderers/GroundLootRenderer.ts` (màu 6 phẩm chất), `apps/web/src/styles/game.css`, `tests/integration/overhaul-world.test.ts`, `tests/e2e/streaming.spec.ts`, `README.md`, `docs/*`.

Sửa (phiên A1/D2): `packages/game-protocol/src/index.ts` (WorldTotals + `worldTotals?`, `enhance.protect`, `GameEvent.success`, `EnhanceRecord`), `packages/game-protocol/src/validation.ts` (schema enhance), `packages/game-core/src/index.ts` (export), `packages/game-core/src/engine/world.ts` (`viewSnapshot`, `enhanceLog` trong createGame/extractProgress, RNG cho economy), `packages/game-core/src/economy/transactions.ts` (cường hóa +15, preview), `packages/game-content/src/economy.ts` (rules + helper), `packages/game-storage/src/index.ts` (schema enhancement/`enhanceLog`), `packages/game-session/src/index.ts` (publish view), `apps/web/src/ui/WorkshopPanel.tsx`, `apps/web/src/styles/game.css`, `tests/e2e/game.spec.ts`, `package.json` (script), `docs/architecture/world-streaming.md`, `docs/ONLINE_MIGRATION.md`, `docs/ECONOMY_DESIGN.md`, `docs/design/item-economy.md`, `artifacts/content-coverage.json`.

## Kiểm chứng đã chạy

| Lệnh                        | Kết quả                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| `pnpm typecheck`            | PASS                                                                        |
| `pnpm lint`                 | PASS                                                                        |
| `pnpm test`                 | 291/291 pass, 17 file (+10 case Thanh Vân Sơn ngoài 8 projection và 8 cường hóa) |
| `pnpm build`                | PASS, PWA 21 precache entries                                               |
| `npx playwright test`       | 46/46 pass; thêm 2 case đi cổng sang Thanh Vân Sơn (quái mới publish, save, offline reload) |
| `node --expose-gc scripts/profile-footprint.mjs` | 40 map: 3159 entity, ~52.9MB heap, tick p95 ≈ 3ms, authority 9.4ms/2.13MB vs view 0.42ms/6KB |
| `pnpm validate:assets` / `pnpm report:content` | PASS; content report ghi 6 maps/16 quái/45 item/28 quest/14 NPC |

Chưa chạy: đo trên thiết bị thật (Android/iOS/Safari), soak render dài, đo heap nhiều giờ. Không có tuyên bố nào cho các phần này.

## Blocker

- Không có blocker kỹ thuật cho A1. Các giới hạn còn lại thuộc A2–A6 và G2–G5, cần thiết bị/môi trường hoặc thiết kế thêm.
- Dormant entity/loot của map đã thăm vẫn resident trong authority (≈2.13MB JSON ở 3159 entity). Chưa có paging/eviction; đây là A2, phải đo trước khi mở 512/1024.

## Bước tiếp theo

1. Tiếp tục nhân nội dung theo vùng: dùng lại pipeline Thanh Vân Sơn (map 320×320 + zone + loot + quest) để làm bãi/map tiếp theo, thêm quái và item theo cấp — đây là việc ưu tiên nhất theo yêu cầu "ưu tiên trải nghiệm người chơi".
2. D2b: VFX/SFX lò rèn (dùng event `equipment.success` đã có) + playtest cân bằng +15; D1: shop stock/restock/buyback/quantity; D3: refinement/affix reroll/gem upgrade.
3. A2/A3 chỉ làm khi số đo mới yêu cầu (payload view ~6KB, heap ~1.35MB/map); A4 đo thiết bị thật trước khi phát hành.

Không có tiến trình nào chạy ngầm sau khi phiên kết thúc.
