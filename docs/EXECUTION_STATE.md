# Phiên sửa 3 lỗi tự nhặt đồ / nhật ký của tự chiến — 22/10/2026 (mới nhất)

Scope: `packages/game-core/src/engine/world.ts` (nhặt đồ, tự chiến, step), `apps/web/src/app/App.tsx` (nhật ký UI). Không đổi cân bằng rơi đồ/kinh tế, không đổi AI chọn mục tiêu, không đổi panel cấu hình tự chiến.

## Đã sửa

- **Lỗi 1 (thiếu dòng nhật ký)**: core đã đi **một đường duy nhất** — `die()` phát `death`, rơi đồ + `pickup()` phát `loot` cho cả đánh tay, kỹ năng và tự chiến (kiểm chứng bằng test: tự chiến giết quái có đủ dòng "Đánh bại …" và "Nhặt được …"). Lỗi mất dòng nằm ở UI: `App.tsx` dùng `id: Date.now() + e.id` (trùng khoá React khi nhiều sự kiện cùng mili giây) và bộ đệm chỉ 80 dòng. Đổi sang bộ đếm `++logSeq.current` và đệm 300 dòng; nội dung/định dạng dòng giữ nguyên.
- **Lỗi 2 (không chủ động đi nhặt)**: thêm `autoPickupStep()` trong `world.ts`, gọi ở nhánh `autoCombatTick()` khi **không còn mục tiêu** — đi tới món đồ gần nhất của mình trong bán kính quét 12 ô (đúng bộ lọc phẩm chất), rồi quay lại quét quái. Túi đầy: không đi, báo "Hành trang đầy…" 1 lần/phiên (`autoPickupFullNotified`, reset khi bật lại tự chiến) và giữ hành vi `stopWhenFull`. Tắt "Tự nhặt đồ" → không đi nhặt.
- **Lỗi 3 (đi ngang qua không nhặt)**: trong `step()`, người chơi còn sống, **không bật tự chiến**, không `autoCombatPaused` (hội thoại/shop), không `pendingInteraction` → tự nhặt đồ của mình trong đúng bán kính 1.8 ô của đường bấm-nhặt (áp cho bấm chuột, phím, tự tìm đường). Bấm nhặt từ xa vẫn như cũ.

## Kiểm chứng

- `tsc --noEmit` PASS, `eslint .` PASS, `pnpm build` PASS, `vitest run` **389/389** (thêm `tests/integration/auto-pickup.test.ts` 6 case: tự chiến có đủ dòng giết/nhặt, chủ động đi nhặt trong 12 ô, tắt công tắc thì không nhặt, đi bộ qua thì nhặt, tạm dừng thì không, bấm từ xa vẫn đi nhặt).
- Hiển thị nhật ký trên UI và cảm nhận trên máy thật: **chưa kiểm chứng trực quan** — cần người chơi xác nhận.


# Phiên QA 22/10: 3 lỗi tồn (A1/A2/A3) + cảm giác chuyển động (B1/B2/B3) — 22/10/2026 (mới nhất)

Scope: `packages/game-core` (chỉ hành trang khởi đầu), `apps/web/src/game` (hiển thị + preferences), `apps/web/src/app` (phiên bản, xóa cache), `src/ui`. Không đổi cân bằng (sát thương/hồi chiêu/tốc độ/tầm/giá/phần thưởng), không thêm thư viện/hình ảnh.

## Phần A

- **A1**: `packages/game-core/src/engine/world.ts` `createWorld()` — gỡ `robe` (Đạo Bào Thanh Vân) khỏi hành trang khởi đầu vì đây là thưởng NV01 `bandits` (`rewardItem: "robe"`). Hành trang mới: `hp×8, mp×5` + 180 bạc; mặc sẵn chỉ có `sword`. Rà 28 nhiệm vụ: `hp` (5 nhiệm vụ), `mp` (3), `sword` (1) cũng trùng loại với khởi đầu nhưng **giữ nguyên** — hp/mp là đồ tiêu hao xếp chồng (thưởng cộng vào stack, không tạo ô trùng), `sword` là trang bị đang mặc. Không thu hồi đồ của nhân vật cũ. Test cũ dựa vào robe khởi đầu đã được cấp tường minh (`core.test.ts`, `v02-economy`, `v02-combat`, `full-offline`, `tests/e2e/game.spec.ts`).
- **A2**: `apps/web/src/app/pwa-cache.ts` + `ui/CacheReset.tsx` — reload bằng `?_cb=<ms>` rồi gỡ tham số trong `main.tsx`; khóa nút + nhãn "Đang xóa bộ nhớ đệm…"; hủy SW và xóa Cache Storage mỗi bước try/catch riêng, log `[cache-reset]`, lỗi không chặn reload. Không đụng IndexedDB/localStorage.
- **A3**: `apps/web/src/app/version.ts` là nguồn duy nhất (`__APP_VERSION__`/`__APP_BUILD_DATE__` do `vite.config.ts` chèn từ `package.json` + ngày build); lobby và panel Thiết lập cùng hiện `BẢN OFFLINE · v0.6.0 · dd/mm/yyyy`; 7 `package.json` lên 0.6.0.

## Phần B (chỉ hiển thị)

- Khảo sát **B1.1 = (a)**: logic 20Hz (`LocalGameSession` 50ms) + `WorldScene.update()` đuổi hàm mũ `1−exp(−delta/65)`; `world.ts:1899-1926` đã đi liền qua nút và chuẩn hóa vector chéo nên không phải (b).
- `scene/WorldScene.ts`: `MotionState` theo từng view — nội suy `prev→next` theo `(now − tickAt)/50ms`, cắt ngay khi đổi map hoặc nhảy > 320px; nhún thân ±1.5px theo quãng đường; hướng giữ 100ms (đổi ngay khi > 90° hoặc đang đánh); trượt lùi hiển thị 10px (tinh anh/boss 4px) 60/40/140ms; dừng hình 35ms cho 2 thực thể, bỏ khi ≥ 5 thực thể giao chiến.
- `renderers/motion.ts` (mới): hằng số + hàm thuần (`STEP_CYCLE_PX = 28`, `CAMERA_SMOOTHING = 8`, `BOB_AMPLITUDE_PX = 1.5`, `DIRECTION_HOLD_MS = 100`, `HITSTOP_MS = 35`, `KNOCKBACK_PX = 10`) và công tắc `ENABLE_MOTION_SMOOTHING`.
- `animations/sprite-frames.ts` + `actor-sprites.ts` + `monster-sprites.ts`: chọn khung walk/run theo `distancePx` (28px/chu kỳ), giữ nguyên cách chọn theo thời gian khi không truyền.
- `camera/CameraController.ts`: giảm chấn `1 − e^(−8·dt)`, bám thẳng khi nhảy > 400px.
- `preferences.ts` + `ui/ClientSettings.tsx`: công tắc `hitStop` (mặc định bật).

## Kiểm chứng đã chạy

- `tsc --noEmit` PASS; `eslint .` PASS; `vitest run` **383/383** (thêm `tests/integration/motion.test.ts` 8 case); `pnpm build` PASS (precache 71 entry).
- A2: `playwright test tests/e2e/cache-reset.spec.ts` PASS (cache đánh dấu biến mất, SW đăng ký lại, save IndexedDB còn nguyên).
- A3: probe trình duyệt trên preview — lobby và Thiết lập cùng chuỗi `BẢN OFFLINE · v0.6.0 · 22/10/2026`.
- A1: script core — hành trang `hp×8, mp×5`, 180 bạc, thưởng NV01 cộng đúng 1 `robe`.

## Chưa làm / giới hạn

- **B3.1/B3.2** chưa dời sát thương về mốc 35% chu kỳ và chưa bật lunge (`lungeOffset()` có sẵn nhưng chưa nối) — thay đổi nằm trong `CombatRuntime.basic` và ảnh hưởng nhiều test combat.
- **B1.3** làm mượt chuỗi điểm và **B1.5** lệch pha AI theo id: chưa làm (B1.3 không cần theo kết luận (a)).
- **B2.1** trễ walk→stand 120ms: chưa làm.
- Cảm giác mượt B1/B2/B3 **chưa kiểm chứng trực quan**; cần người chơi xác nhận trên máy thật.

# Phiên gói 10 tính năng trải nghiệm (A1–C3) — mới nhất

Scope: `packages/game-core` (tự chiến trong core, tinh anh theo giờ, thành tựu, dịch chuyển nhanh, Hồi Thành Phù), `packages/game-protocol` (field/lệnh mới), `packages/game-storage` (schema mới + bản lưu dự phòng xoay vòng), `packages/game-content` (item `town-scroll`, `elites`, `achievements`), `apps/web` (panel Tự chiến/Thành tựu, HUD, renderer), `apps/web/src/styles/*` (glow bậc cường hóa, `.fps-counter`, `.travel-row`).

## Đã triển khai (theo 10 mục đặc tả)

- **A1 tự chiến thật**: `autoCombatTick()` chạy trong `step()` theo `AUTO_COMBAT_TICK_MS = 250` (5 tick mô phỏng), thứ tự uống thuốc → buff tự thân (`autoCombatBuff`) → nhặt đồ 3 ô → chọn mục tiêu 12 ô (ưu tiên quái đang đánh mình) → AOE khi ≥3 quái → đơn mục tiêu nội lực cao nhất → đánh thường. Chống kẹt: 3 lần tìm đường thất bại hoặc 5 giây không gây sát thương → bỏ qua 10 giây. `autoCombatPaused` là lệnh riêng để tạm dừng ngầm khi mở hội thoại/shop. Click quái chỉ đuổi đánh (`autoChase`), không bật tự chiến. Phím **F** bật/tắt, chuột phải mở `AutoCombatPanel` (lưu vào `preferences`).
- **A2 thanh máu + tên quái**: vẽ trong `WorldScene` cùng lớp với số sát thương; chỉ hiện khi là target / đang giao chiến / đã mất máu / là tinh anh; màu theo ngưỡng HP (>50% xanh, 25–50% vàng, <25% đỏ); tên tinh anh vàng kim kèm chữ "Tinh Anh".
- **A3 số sát thương phân loại**: `damageSource` (`basic|skill|dot|dodge`) gắn ngay tại `combat/runtime.ts` `hit()`; `CombatVFXRenderer.damagePopupStyle()` chọn màu/cỡ; trần 30 popup; nháy đỏ 90ms khi trúng đòn (bỏ qua dot); công tắc "Số sát thương" mặc định bật.
- **A4 trang bị phát sáng**: `enhancementGlowClass()` (jade +5, azure +7, violet +9, gold +11 có nhịp 1,2s) áp cho `ItemSlot` ở hành trang/trang bị/kho; nhân vật là sprite nguyên bộ nên dùng quầng sáng dưới chân từ +9 (`WorldScene`); chú thích bậc phát sáng trong `WorkshopPanel`.
- **B1 di chuyển nhanh**: item `town-scroll` (Hồi Thành Phù, 50 bạc, bán ở Diệp dược sư), dùng qua `useItem` → về đúng `RESPAWN_POINT` (14,14); chặn khi đã ở Tân Thủ Thôn, dùng được khi đang giao chiến. Thiên hạ đồ có khối "Dịch chuyển nhanh": chỉ khu đã khám phá, 30 bạc, cooldown 10 giây thật (`travelReadyAt`), chặn khi đang giao chiến, điểm đến lấy từ `portal.destination`.
- **B2 tinh anh theo giờ**: `elites` data-driven (Lang Vương Tinh Anh ở Thanh Trúc Lâm, Sơn Tặc Đầu Lĩnh ở Tân Thủ Thôn), HP×6 / attack×1.6 / exp×6 nhân lúc sinh, scale 1.35, tên vàng kim + vòng sáng vàng. Chu kỳ 30 phút thật; mốc sau khi hạ lưu vào `eliteSpawns` trong bản lưu. Thưởng 150–300 bạc + 1 Huyền Thiết + 30% trang bị. `definitionId` giữ quái gốc nên nhiệm vụ "Lang vương" vẫn đếm.
- **B3 thành tựu**: 10 mục trong `achievements`, bộ đếm lưu theo nhân vật (`kills`, `wolfKills`, `peakGold`, `enhancementSuccess` + suy ra cấp/bạc/khu vực/nhiệm vụ), `AchievementPanel` dùng khung panel Nhiệm vụ, nhận thưởng đúng 1 lần (authority kiểm tra), toast "Đạt thành tựu: …" qua hàng đợi sẵn có.
- **C1 bảo vệ bản lưu**: 3 bản dự phòng xoay vòng (`BACKUP_SLOTS`, chỉ ghi khi dữ liệu khác và cách ≥5 phút), tự khôi phục bản mới nhất khi bản chính lỗi + thông báo mốc thời gian (hiện ở cả màn chọn nhân vật), dòng "Lần lưu/lần xuất gần nhất" + nhắc xuất khi quá 7 ngày, tên file `<tên>-<YYYYMMDD-HHmm>.json`.
- **C2 vòng sáng ban đêm**: `syncPlayerGlow()` dùng texture gradient tạo một lần (`ensureGlowTexture`), bán kính 3 ô, độ sáng theo `nightFactorFromClock`, tắt hoàn toàn ban ngày; công tắc riêng `playerNightLight` (mặc định bật).
- **C3 giới hạn khung hình + FPS**: `applyFpsLimit()` ghi trực tiếp `fpsLimit`/`hasFpsLimit`/`_limitRate` của `TimeStep` khi `settings.fps` đổi (không tải lại); bỏ ghi chú "cần tải lại"; công tắc "Hiện FPS" (mặc định tắt) với `.fps-counter` cập nhật ≤2 lần/giây.

## Quyết định thiết kế

- Tự chiến chạy trong **core** (authority), không phải client loop.
- Cấu hình tự chiến lưu ở `preferences` (cấu hình chung), đẩy xuống core qua `configureAuto` sẵn có.
- Mốc "chờ 30 phút" của tinh anh **không** ghi wall-clock vào snapshot khi khởi tạo (giữ tính xác định của replay); mốc "lần đầu bật" giữ trong bộ nhớ world, chỉ mốc sau khi hạ mới lưu.
- Phím tự chiến = **F**. Giá Hồi Thành Phù = **50 bạc**. Phí dịch chuyển = **30 bạc**.
- Khối dịch chuyển nhanh dùng class `.travel-row` riêng, không tái dùng `.destination-row` (tránh lẫn với danh sách địa điểm).

## Kiểm chứng đã chạy

| Lệnh | Kết quả |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | 375/375 pass (26 file), gồm `tests/integration/upgrade-features.test.ts` (29 case mới) |
| `pnpm validate:content` | PASS |
| `pnpm build` | PASS |
| `npx playwright test` | 72/72 pass, gồm `tests/e2e/upgrade-features.spec.ts` (7 case mới) |
| `pnpm healthcheck` | 5/5 bước đạt, 1/1 kiểm tra bundle đạt (14.0s) |

## Chưa tự kiểm chứng được

- A2/A3 là hiệu ứng canvas: chỉ xác nhận qua hành vi UI (không sinh DOM cho từng con quái, công tắc lưu được), **chưa đo pixel** màu số sát thương hay thời lượng nháy đỏ trên màn hình thật.
- Chưa chờ 30 phút thật cho tinh anh; đã kiểm bằng cách đặt mốc trong quá khứ (đúng phương pháp đặc tả cho phép).
- Chưa đo FPS/thermal trên thiết bị thật; FPS chỉ đọc trong headless SwiftShader.
- Bản lưu dự phòng: test tự động không chờ được 5 phút, nên chỉ khẳng định `BACKUP_SLOTS = 3` và luồng export/import; việc khôi phục thật đã kiểm ở E2E `streaming.spec.ts` (làm hỏng bản chính 1 lần).

# Phiên sửa lỗi "hệ thống nhiệm vụ KHÔNG tăng tiến độ" (QA 21/10/2026)

Scope: Toàn bộ chuỗi nhiệm vụ — `packages/game-core` (đếm tiến độ + ghi nhận hội thoại), `packages/game-protocol` (event `quest` + `questTalks`), `packages/game-storage` (lưu `questTalks`), `packages/game-content` (nhãn mục tiêu), `apps/web` (nguồn tiến độ duy nhất, toast, panel + khung theo dõi), `apps/web/src/styles/game.css` (sửa layout hội thoại ở màn ngang thấp).

## Nguyên nhân gốc rễ (có bằng chứng đo được)

**Bộ đếm tiến độ KHÔNG hỏng. Nguyên nhân là UI ở màn ngang thấp (≤1000×550).**

- Đo tại viewport 844×390: khung hội thoại `.panel-body` có `clientHeight=281` nhưng `scrollHeight=571`. Nút "Nhận nhiệm vụ" nằm ở `top=353.39, bottom=391.89` trong khi `.panel-body` kết thúc ở `357.5` → chỉ **4.1px trong 38.5px** của nút nằm trong vùng cuộn → người chơi **không bấm được** → nhiệm vụ **không bao giờ được nhận**.
- Vì `s.quests` rỗng nên chuỗi "Nói chuyện với trưởng thôn" trong `App.tsx` (chỉ hiện khi `activeQuest` undefined) hiện vĩnh viễn → đúng triệu chứng QA báo.
- Mọi giả thuyết (a)–(g) trong đề bài đều **sai** với code hiện tại: `die()` vẫn gọi `advanceObjective`; so khớp theo `d.id` (id ổn định) chứ không theo tên hiển thị; `s.quests` là nguồn duy nhất; sự kiện trước khi accept bị bỏ qua là cố ý; `forest-scout.target = "forest"` đúng id map; save giữ `quests`; tracker đọc snapshot sống.

## Đã triển khai

- **Layout hội thoại mobile** (`apps/web/src/styles/game.css`): thêm block `@media (max-width:1000px) and (max-height:550px)` thu gọn cảnh thoại + danh sách nhiệm vụ để nút "Nhận nhiệm vụ" luôn nằm trọn trong khung cuộn.
- **Nguồn tiến độ duy nhất** (`apps/web/src/ui/quest-progress.ts`, file mới): `questDisplays(snapshot)`, `trackedQuest(displays)`, `questStepLabel(display)`, `questOrder(index)` (2 chữ số). Cả Panel Nhiệm vụ (`Panels.tsx`) và khung theo dõi (`App.tsx`) đọc từ đây → không thể lệch nhau. Kèm `data-quest-id/order/status/progress` để test E2E đối chiếu hai nơi.
- **Toast tiến độ** (`packages/game-protocol` thêm event `"quest"`; `packages/game-core/src/engine/world.ts` `advanceObjective` phát `${questTargetLabel(d)} ${progress}/${count}`): hiện "Sơn tặc 2/5" qua cơ chế toast sẵn có + dòng log `[Hệ thống]`. Toast đổi thành hàng đợi tối đa 3 dòng (`.toast-stack`) để nhiều nhiệm vụ cùng target đều hiện được.
- **Bước hội thoại**: core ghi `questTalks[npcId] = tick` khi tương tác NPC; `questTalks` thêm vào `CharacterProgress` (optional → bản lưu cũ nạp được), storage schema, `progressKeys`, `projectView`. Tracker chuyển từ "Nói chuyện với trưởng thôn" → "Nhận nhiệm vụ: <tên>" ngay sau khi nói chuyện.
- **Số thứ tự 2 chữ số**: `questOrder()` dùng `padStart(2,"0")` cho cả 28 nhiệm vụ ở Panel, khung theo dõi và `QuestOffers.tsx` → hết lỗi "010".
- **Nhãn mục tiêu** (`packages/game-content/src/index.ts`): `questObjectiveLabel` hỗ trợ thêm `talk`/`equip`; thêm `questTargetLabel` cho thông báo ngắn; `validateContent` kiểm tra target của `talk`/`equip`.

## Kết luận vụ "Đạo Bào Thanh Vân"

**Đồ khởi đầu theo thiết kế, KHÔNG phải phần thưởng phát sớm.** Bằng chứng: `createGame` cấp sẵn 1 chiếc `robe` cho nhân vật mới (`packages/game-core/src/engine/world.ts`, inventory `characterId + ":robe"`), đồng thời NV01 cũng thưởng `robe` (`packages/game-content/src/index.ts`). QA nhận thêm 1 chiếc nữa khi claim NV01 là đúng thiết kế. **Giữ nguyên, không xóa.**

## Kiểm chứng đã chạy

| Lệnh                        | Kết quả                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `pnpm typecheck`            | PASS                                                       |
| `pnpm lint`                 | PASS                                                       |
| `pnpm test`                 | 346/346 pass (25 file), gồm `tests/integration/quest-progress.test.ts` (15 case mới) và 2 case storage mới |
| `pnpm validate:content`     | PASS                                                       |
| `pnpm build`                | PASS                                                       |
| `npx playwright test`       | 65/65 pass, gồm `tests/e2e/quest-progress.spec.ts` (3 case mới ở 844×390) |
| `pnpm healthcheck`          | 5/5 bước đạt, 1/1 kiểm tra bundle đạt (20.6s)            |

## Chưa tự kiểm chứng được

- Chưa chạy trên bản live `https://vltk.quanhd.net/` (chỉ build local); cần deploy để QA xác nhận lại trên bản phát hành.
- Chưa đo trên thiết bị Android/iOS thật; số đo layout đều lấy ở Chromium 844×390.

## Bước tiếp theo

1. Deploy bản build mới và để QA chạy lại đúng kịch bản: nhận NV01 → hạ 5 Sơn tặc (0/5 → 5/5) → nhận thưởng 1 lần → reload → không nhận lại được.
2. Tiếp tục `docs/WORK_QUEUE.md` — G1 (hành trình đầy đủ PC/mobile) và F1 (100+ quest).

---

# Phiên Rework Game HUD & Functional Accessibility — 21/10/2026 (mới nhất)

Scope: Tầng UI client (`apps/web/src/app/App.tsx`, `apps/web/src/styles/overhaul.css`, `tests/e2e/hud-accessibility.spec.ts`). Cải tiến bố cục HUD và hệ thống truy cập chức năng trong game: đưa 6 chức năng cốt lõi thường dùng ra thanh truy cập nhanh ngoài HUD; tổ chức lại menu ba gạch thành 4 nhóm ngữ nghĩa; di chuyển menu tránh che minimap; bảo đảm tương thích responsive trên 5 viewport (desktop-wide 1720×860, laptop 1366×768, tablet 1024×768, mobile-landscape 844×390, mobile-portrait 390×844) mà không đổi theme, icon, backend, GameSession, combat hay save schema.

## Đã triển khai

- **Thanh truy cập nhanh (Quick Access Toolbar)**:
  - Đưa 6 chức năng ưu tiên hàng đầu ra ngoài HUD: Nhân vật (`character`, phím tắt `C`), Hành trang (`inventory`, phím tắt `I`), Võ học (`skills`, phím tắt `K`), Nhiệm vụ (`quests`, phím tắt `J`), Bản đồ (`map`, phím tắt `M`), Kho đồ (`warehouse`).
  - Tái sử dụng `togglePanel()` và state quản lý modal chung hiện có; hiển thị trạng thái active/pressed đồng bộ khi panel đang mở.
  - Thêm nút toggle thu gọn/mở rộng thanh truy cập nhanh (`quickCollapsed`) với icon Chevron kiếm hiệp để tiết kiệm không gian khi người chơi muốn giao diện gọn.
  - Phân tách rõ ràng giữa cụm Quick Access và cụm System Actions (`offline-status`, `save-state`, `compactHud`, `miniExpanded`, `settings`, `mobileMenu`) qua đường kẻ phân cách mang phong cách cổ trang vàng đồng.
- **Tổ chức lại Menu ba gạch (4 nhóm chức năng)**:
  - Nhóm 1 (Nhân vật & Vật phẩm): Nhân vật, Hành trang, Kho đồ, Nhân vật khác.
  - Nhóm 2 (Chiến đấu & Phát triển): Võ học, Nghề nghiệp, Công xưởng.
  - Nhóm 3 (Khám phá & Thông tin): Nhiệm vụ, Bản đồ, Cẩm nang.
  - Nhóm 4 (Hệ thống): Tắt/bật âm thanh, Thiết lập (kèm nút Cập nhật game khi có SW update).
  - Bổ sung thanh tiêu đề có tên "Giang Hồ Ký", hiển thị ngân lượng hiện có (bạc) và nút đóng menu `X` trực quan.
  - Đổi layout menu từ grid 3 cột đơn điệu sang cấu trúc nhóm flex column kết hợp grid phân cấp (grid-4, grid-3, grid-2) với tiêu đề phân nhóm khắc hoa văn vàng đồng cổ điển.
- **Tránh che khuất Minimap & Tối ưu Responsive**:
  - Trên desktop/laptop/tablet/mobile landscape: Neo `mobile-menu` sang bên trái của minimap (`right: calc(14px + 176px)` khi thu nhỏ, `+ 292px` khi mở rộng bản đồ nhỏ), giữ trọn vẹn minimap, toạ độ và đồng hồ giờ giang hồ không bị che khuất khi menu mở.
  - Trên tablet (1024×768): Điều chỉnh breakpoint `@media (max-width: 1200px)` và định vị `.location-heading` sang `left: 285px`, tạo khoảng đệm thông thoáng giữa thông tin nhân vật và thanh HUD.
  - Trên mobile landscape (844×390): Tinh chỉnh kích thước nút HUD (33–34px) và giới hạn độ rộng `.location-heading`, loại bỏ hoàn toàn hiện tượng chồng lấn với thanh chức năng.
  - Trên mobile portrait (390×844): Chuyển `.hud-actions` sang bố cục 2 hàng dọc (`flex-direction: column; align-items: flex-end`) gồm hàng 1 (Hệ thống) và hàng 2 (Truy cập nhanh); dời `.right-sidebar` (minimap) xuống `top: 138px` và `mobile-menu` xuống `top: 196px`. Ngăn chặn hoàn toàn hiện tượng tràn ngang (horizontal overflow) và cuộn ngang trên màn hình hẹp; menu mở bên dưới minimap mà không che khuất minimap hay khu vực joystick/chiến đấu.
- **Gỡ bỏ lớp phủ Vignette CSS dìm màu (`.world-viewport:after`)**: Tắt lớp bóng mờ inset tối viền trên viewport canvas trong `overhaul.css`, giúp toàn bộ màn hình sáng rõ, trong trẻo và sắc nét hơn.
- **Sửa triệt để lỗi lớp phủ hình chữ nhật lơ lửng ở giữa màn hình (`EnvironmentRenderer.ts`, `ForegroundRenderer.ts`)**: Trong Phaser 3, camera zoom (0.86 trên mobile, hoặc khi lăn chuột trên PC) làm các đối tượng `setScrollFactor(0)` bị co lại quanh tâm camera. Đã cập nhật tọa độ tâm và kích thước `(viewW, viewH)` theo `1 / cam.zoom`, ghim chính xác lớp đêm/sương phủ kín 100% viewport và đưa tán lá tiền cảnh lên sát mép trên màn hình, triệt tiêu hoàn toàn viền hộp chữ nhật dìm màu ở giữa màn hình.
- **Bảo toàn ngôn ngữ thiết kế**:
  - Giữ nguyên màu nền cổ trang kiếm hiệp xanh đậm `#182b22bb` / `#1c3329fa`, viền đồng `#b59b5a`, ánh sáng vàng hoàng kim `#f5d78a`, typography serif/Arial, hiệu ứng hover, active glow và toàn bộ icon có sẵn (`lucide-react`).

## Kiểm chứng đã chạy

- `tests/e2e/hud-accessibility.spec.ts` (mới): kiểm thử trên cả 5 viewport theo yêu cầu:
  - 1720×860 (desktop-wide): PASS
  - 1366×768 (desktop-laptop): PASS
  - 1024×768 (tablet): PASS
  - 844×390 (mobile-landscape): PASS
  - 390×844 (mobile-portrait): PASS
  - Xác nhận trực tiếp: mở panel qua thanh nhanh, highlight trạng thái active, mở menu ba gạch, đủ 4 nhóm, tương tác mở panel con từ menu và đóng menu tự động, không chồng lấn minimap (assertion toTheLeft || below).
  - Ảnh chụp 10 file tại `artifacts/hud-review/` cho trạng thái bình thường và trạng thái menu mở trên cả 5 viewport.
- `pnpm healthcheck`: **5/5 bước đạt, 1/1 kiểm tra bundle đạt** (21.7s):
  - `typecheck`: PASS
  - `lint`: PASS
  - `test`: PASS 329/329
  - `validate:content`: PASS 3/3
  - `validate:assets`: PASS
  - Bundle `three` vẫn cô lập ở chunk riêng, không lọt vào bundle chính.
- `pnpm test:e2e`: **56/56 tests đạt** (gồm `game.spec.ts`, `overhaul.spec.ts`, `visual-overhaul.spec.ts`, `full-offline.spec.ts`, `hud-accessibility.spec.ts`). Không có bất kỳ regression nào trên toàn bộ test suite.

## Giới hạn

- Trên màn hình cực hẹp (<360px), số lượng nút hệ thống có thể cần thu gọn thêm tuỳ thuộc vào tỉ lệ màn hình; breakpoint hiện tại đã tối ưu toàn diện từ chuẩn iPhone (390px) trở lên.
- Phím tắt (C, I, K, J, M) chỉ hiển thị huy hiệu trên màn hình desktop/laptop nơi bàn phím vật lý khả dụng; trên mobile huy hiệu phím tắt được ẩn để giữ giao diện thanh thoát và tránh rối mắt.

# Phiên nút "Xóa bộ nhớ đệm & tải lại" trong Thiết lập — 21/10/2026 (mới nhất)

Scope: tầng client. Thêm nút trong panel Thiết lập để thoát tình trạng điện thoại giữ bản game cũ nhiều giờ do service worker phục vụ từ cache. Không đổi gameplay, không đổi dữ liệu lưu.

## Đã triển khai

- `apps/web/src/app/pwa-cache.ts`: `clearAppCache()` xóa toàn bộ `CacheStorage` và hủy đăng ký mọi service worker; trả `{ cachesDeleted, workersRemoved, failures }`. Lỗi được **đếm** thay vì ném ra để nút vẫn tải lại được; `caches.delete()` trả `false` (cache đã biến mất) không tính là lỗi. **Không** đụng IndexedDB (bản lưu) hay localStorage (tuỳ chọn).
- `apps/web/src/ui/CacheReset.tsx`: khối "Bộ nhớ đệm & cập nhật" — xác nhận bằng `window.confirm`, hiện tiến trình/kết quả qua `role="status"`, rồi `location.reload()` sau 700ms. Gắn vào panel Thiết lập ngay dưới mục "Tiến trình của bạn" (`Panels.tsx`).
- Bản lưu vẫn an toàn vì chỉ xóa cache PWA; SW đăng ký lại ở lần tải kế tiếp và lấy mã mới từ mạng.

## Kiểm chứng đã chạy

- `tests/integration/pwa-cache.test.ts` (4 case): xóa đủ key, thiếu API, lỗi được đếm, cache đã biến mất không tính lỗi. `pnpm test` **329/329**.
- `tests/e2e/cache-reset.spec.ts`: chạy trên bản build + preview thật, SW đang kiểm soát trang. Đặt cache đánh dấu `kiem-hiep-sentinel`, bấm nút, xác nhận dialog → sau khi tự tải lại: cache đánh dấu **đã biến mất**, app vào lại được, service worker **đăng ký lại**, bản lưu trong IndexedDB **còn nguyên**. `playwright test` **57/57**.
- `pnpm healthcheck` PASS (typecheck, lint, test, validate), bundle `three` vẫn ở chunk riêng.

## Giới hạn

- Bản đang cài trên máy người dùng phải có nút này thì mới dùng được; lần đầu vẫn cần một lần xóa cache thủ công (hoặc bấm "Cập nhật game" khi banner cập nhật hiện) để nhận bản mới.
- Nút không xóa HTTP cache của trình duyệt cho tài nguyên ngoài SW (không có tài nguyên như vậy trong app hiện tại).

# Phiên healthcheck (endpoint `/healthz` + lệnh `pnpm healthcheck`) — 21/10/2026 (mới nhất)

Scope: công cụ kiểm tra, không đổi gameplay hay tầng hiển thị. Thêm `apps/web/healthz-plugin.ts` (plugin Vite) gắn `GET /healthz` vào máy chủ dev + preview; thêm `scripts/healthcheck.mjs` và lệnh `pnpm healthcheck`. Repo là PWA tĩnh, `apps/server` chỉ có README nên endpoint được gắn vào máy chủ đang phục vụ app thay vì thêm service mới.

## Đã triển khai

- `GET /healthz` → JSON `status/service/mode/version/packageManager/three/git/process/bundle.checks/warnings`. **200** khi khoẻ, **503** khi preview thiếu `apps/web/dist`; `?full=1` thêm tên + kích thước chunk; hỗ trợ `HEAD`; `cache-control: no-store`; quét bundle có cache 5 giây nên monitor gọi liên tục không tốn I/O.
- `pnpm healthcheck`: mặc định chạy `typecheck`, `lint`, `test`, `validate:content`, `validate:assets`; `--fast` chỉ typecheck + lint; `--full` thêm `build` + `test:e2e`; `--runtime` thêm verify headless 3D và 2D (`scripts/verify-renderer-3d.mjs`); `--json` cho CI. In môi trường (node/pnpm/git/three), bảng bundle kèm gzip, và kiểm tra ràng buộc "three không nằm trong bundle chính" (quét `WebGLRenderer` trong chunk `index-*`). Mã thoát 1 khi có bước hỏng, in 25 dòng log cuối của bước hỏng.

## Kiểm chứng đã chạy

- Dev server (`vite --port 5199`): `GET /healthz` → **200**, `bundle.checks.threeInSeparateChunk: true`; `HEAD` → 200 không body.
- Preview server (`vite preview --port 5299`): **200**, `?full=1` trả `main 712.525 B` / `three 528.739 B`.
- Preview khi tạm đổi tên `apps/web/dist` → **503**, `status: "unavailable"`, warning "Không thấy apps/web/dist…"; đã khôi phục `dist` ngay sau đó.
- `pnpm healthcheck` → **5/5 bước đạt, 1/1 kiểm tra bundle đạt** (21.9s). Đã chạy thử `--json` và nhánh hỏng (thay một bước bằng script không tồn tại → exit 1, in log cuối).

## Giới hạn

- Endpoint chỉ tồn tại trên máy chủ dev/preview của Vite. Bản deploy tĩnh (PWA trên CDN) **không có** endpoint này; muốn monitor môi trường production phải có backend/service thật.
- Endpoint chỉ đọc dữ liệu sẵn (package.json, git, bundle), **không** chạy typecheck/test, nên không thay thế `pnpm healthcheck` trong CI.

# Phiên bộ hiển thị 3D (Three.js) chạy song song với bản Phaser 2D — 21/10/2026 (mới nhất)

Scope: chỉ tầng hiển thị `apps/web/src/game/` (+ `preferences.ts`, `bootstrap.ts` rẽ nhánh). Không sửa `packages/`, không sửa `App.tsx`/`src/ui/`, không đổi luật chơi. Thêm 2 pref trong `ClientPreferences`: `renderMode` ("2d" | "3d", mặc định "2d") và `shadows3d` (mặc định false). **Đổi `renderMode` chỉ có hiệu lực ở lần `bootGame` kế tiếp** (không chuyển nóng giữa phiên). **Chưa có nút bật/tắt trong panel Thiết lập** vì `src/ui/` nằm ngoài phạm vi — hiện đổi được qua localStorage/`setPreferences`.

## Đã triển khai

- `apps/web/src/game/three/` (mới, 16 file): `ThreeWorld.ts` (khung bộ hiển thị), `coords.ts`, `camera-constants.ts`, `input-constants.ts`, `element-colors.ts`, `Terrain3D.ts`, `Props3D.ts`, `Actors3D.ts`, `atlas-cache.ts`, `instanced-material.ts`, `WorldObjects3D.ts`, `Effects3D.ts`, `Weather3D.ts`, `daynight.ts`, `Input3D.ts`, `dom-overlay.ts`.
- `bootstrap.ts`: rẽ nhánh theo `getPreferences().renderMode`; nhánh 3D nạp lười `import("./three/ThreeWorld")`, mọi lỗi (nạp module hoặc dựng WebGLRenderer) → hạ pref về "2d", khởi động Phaser 2D **và** gọi `callbacks.onError`. Nhánh "2d" giữ nguyên từng dòng hành vi cũ.
- `renderers/ChunkWorldRenderer.ts`: `terrainCanvas` được `export` (chỉ thêm từ khóa) và nhận thêm tham số tuỳ chọn `bounds` (mặc định `null` → dùng `chunkBounds` như cũ) để bản 3D vẽ đúng vùng 768×384. **Bản 2D không đổi hành vi.**
- `preferences.ts`: `renderMode` + `shadows3d` (interface, default, whitelist nạp lại).

### Quyết định kỹ thuật quan trọng

- **Camera đặt trên đường phân giác**: offset `(d, h, d)` với `d = 12`, `h = d·√(2/3) ≈ 9.798` (thay cho `(0, 19, 13.5)` trong thiết kế). Chỉ khi đó phép chiếu phối cảnh của three mới khớp **đúng** phép chiếu iso 2D (`worldToScreen` 48:24) — nhờ đó texture đất vẽ sẵn theo iso không bị méo và hướng nhìn khớp (phải màn hình = world `(+x,−y)`). Offset như thiết kế làm quảng trường thành hình vuông.
- **Công thức neo chân**: `center = H·(originY − 0.5)` với `originY = feetY/frameHeight = 246/256`; đường chân sprite nằm đúng world y = 0 (có test đơn vị).
- **Lật texture đất**: `v = 1 − (sy − bounds.y)/bounds.height`; ánh xạ world→pixel là hàm affine nên gán UV ở 4 đỉnh là chính xác cả trong tam giác.
- **Bảng màu nguyên tố**: sao chép sang `three/element-colors.ts` (file gốc `animations/atlas.ts` import Phaser, không import trực tiếp để tránh kéo Phaser vào bundle three). Có test so khớp giá trị.

## Kiểm chứng đã chạy

- `pnpm typecheck` PASS. `pnpm lint` PASS. `pnpm test` **325/325** (23 file; thêm 7 case `tests/integration/renderer-3d.test.ts`). `pnpm validate:content` PASS. `pnpm build` PASS. `pnpm validate:assets` PASS, không lỗi mới.
- **Bundle**: `three` nằm ở chunk riêng `dist/assets/ThreeWorld-*.js` (528.74 kB / gzip 135.16 kB); bundle chính `index-*.js` **không đổi** (712.53 kB, giống hệt trước khi thêm three) → người chơi ở chế độ 2D không tải three.
- **Số đo 3D** (`scripts/verify-renderer-3d.mjs`, headless Chromium + SwiftShader, 1366×768, quality high, Tân Thủ Thôn): renderer `ThreeJS`, **60 FPS**, renderMs 0.68–0.87, `renderer.info.render.calls` = **48**, triangles 680, geometries 37, textures 30, programs 11, chunks 25/25, terrain CPU 28.1 MiB. Ảnh: `artifacts/renderer-3d/3d/`.
- **Số đo mobile** (844×390, DPR 2, quality medium): renderer `ThreeJS`, **60 FPS**, renderMs 0.77, draw calls 52, không lỗi.
- **Số đo 2D đối chiếu** (cùng script, `MODE=2d`): renderer `WebGL`, 60 FPS, renderMs 0.10, textures 85, chunks 26/32 — hành vi 2D không đổi.
- **Đổi map 4 vòng** (làng→rừng→làng→rừng): textures GPU 29 → 27 → 29 → 27 (dao động theo loại prop/atlas của từng map, **không tích luỹ**). Đã sửa 2 nguồn rò: texture SVG của NPC không được dispose, và atlas nạp dở tạo texture sau khi đổi map (thêm số thế hệ trong `atlas-cache.ts`).
- **Fallback WebGL** (`scripts/verify-renderer-3d-fallback.mjs`): chặn `getContext("webgl")` → pref tự hạ về "2d", thông điệp `Không khởi động được bộ hiển thị 3D (WebGL bị chặn…). Đã chuyển về bản 2D.`, không có pageerror.
- **Ảnh đối chiếu** (`scripts/verify-renderer-3d-behaviour.mjs`, ảnh trong `artifacts/renderer-3d/behaviour/`):
  - `01-directions.png`: 8 nhân vật H0–H7 đặt ở 8 hướng `Direction8` — mỗi hướng nằm đúng vị trí world (theo phép chiếu iso, `+x` sang phải, `+y` xuống dưới).
  - `02-combat.png`: **chữ bay sát thương hiện** ("4", "32" bay trên quái), quái chết nằm nghiêng **mờ 0.55**, probe "Boss" vẽ lớn hơn quái thường, HUD mục tiêu "Sơn tặc Cấp 1" cập nhật HP 33/65.
  - `03-night-rain.png`: nền chuyển sang xanh đêm (minimap ghi "Giờ Tý"), **mưa hiện bằng `LineSegments`** rơi trong hộp quanh người chơi.
  - `04-loot.png`: nhãn NPC/portal/nút tài nguyên hiện đúng vị trí.

## Giới hạn còn lại

- **`onError` khi 3D lỗi khiến `App.tsx` hiện màn hình lỗi** (có nút "Thử lại") dù bản 2D đã khởi động được. `App.tsx` nằm ngoài phạm vi sửa của phiên này; cần một thay đổi nhỏ ở `App.tsx` (giữ `error` ở mức cảnh báo thay vì chặn game) mới cho chơi liên tục ngay sau lỗi 3D. Pref `renderMode` **đã** tự hạ về "2d" nên lần tải lại vào thẳng bản 2D.
- **Số đo hiệu năng chạy trên SwiftShader (phần mềm), không phải GPU thật**; chưa đo trên thiết bị thật. Ngân sách "≤200 draw calls" đạt (48) và "≥60 FPS" đạt trên môi trường đo, nhưng cần xác nhận lại trên GPU thật.
- **Chưa kiểm chứng bằng mắt**: quái nháy sáng 70ms, nhặt đồ khi loot chồng quái, nói chuyện NPC, qua cổng, trời tối dần theo `worldClock` — đều đã có mã theo đúng số liệu bản 2D nhưng mới chỉ chụp được ảnh tĩnh ở Tân Thủ Thôn.
- **Loot rơi đất chưa kiểm chứng được trong bản 3D**: script thử nghiệm đặt loot thủ công vào save rồi import — `snapshot.groundLoot` bị mất **ngay ở đường import của `App.tsx`** (đã kiểm tra: chế độ **2D cũng không thấy** loot đó → vấn đề nằm ở import path, không phải ở bộ hiển thị 3D; `validateSave` → `GameWorld` → `projectView` → session đều giữ loot, đã có test Node). Bản 3D đọc `snapshot.groundLoot` y hệt bản 2D nên khi loot tới được snapshot thì hiển thị như bản 2D.
- **Vật thể trang trí còn thiếu so với bản 2D** (ghi rõ trong `docs/visual/RENDERER_3D.md`): đốm sáng đèn lồng ban đêm, vệt đuôi đạn bay, vòng đất lan của boss (quake/storm), tiền cảnh parallax, camera nhìn trước/zoom chuột, cao độ địa hình, dự phòng atlas thủ tục.
- **Prop không có loại `rock`/`lantern`/`gate`** trong `propAssets` (chỉ house/tree/cherry/bamboo) → loại prop này không hiện ở bản 3D. Bản 2D vẽ chúng bằng texture thủ tục (`renderers/art.ts`).
# Phiên hiệu ứng "giả 3D" môi trường (đèn lồng, hoàng hôn, sương, tiền cảnh, camera) — 20/10/2026 (mới nhất)

Scope: chỉ tầng hiển thị `apps/web/src/game/` + `preferences.ts`. Không sửa `packages/`, không sửa `App.tsx`/`src/ui/`, không đổi luật chơi. 5 công tắc mới trong `ClientPreferences` (mặc định bật, lưu chung khóa `kiem-hiep-client-v1`); **chưa có nút bật/tắt trong panel Thiết lập** vì `src/ui/` nằm ngoài phạm vi được sửa — hiện chỉ đổi được qua localStorage/`setPreferences`.

## Đã triển khai

- `world/daynight.ts`: `dayPhaseFromClock`, `nightFactorFromClock` (đúng công thức cũ của `EnvironmentRenderer`), `duskFactorFromClock` = |cos(2π·day)| (0 giữa trưa/giữa đêm, 1 ở hai chuyển giao). `EnvironmentRenderer` dùng lại hai hàm đầu thay vì tính tại chỗ.
- `EnvironmentRenderer`: lớp hoàng hôn `0xff8c3a` depth 8998 (alpha = dusk·0.16); sương chiều sâu 2 dải gradient `0xdfe9ea` depth 9001 (alpha 1 − night·0.5, tắt ở quality "low"); ẩn hẳn lớp khi alpha ≈ 0.
- `ChunkWorldRenderer`: đốm sáng đèn lồng theo vòng đời chunk (`ChunkView.glows`, blend ADD, bán kính 90px, alpha 0.55·nightFactor), trần `qualityBudget().maxEffects` theo khoảng cách tới người chơi; `update()` nhận thêm `nightFactor` từ WorldScene.
- `WorldScene`: bóng actor đổi theo trạng thái (cast/attack 0.85/0.22, dead 0.15, còn lại 1/0.4, boss giữ 60×12), đốm sáng người chơi 70px (0.3·nightFactor), khởi tạo/hủy `ForegroundRenderer`, truyền `nightFactor`.
- `renderers/ForegroundRenderer.ts` (mới): 2 lớp tile parallax scrollFactor 0 — ngọn cây (depth 9600, cao 11% màn hình, alpha 0.55) và mây (depth 9550, 4%, alpha 0.3); hệ số trôi 0.15/0.3, reducedMotion → đứng yên, quality "low" → không tạo lớp.
- `camera/CameraController.ts`: nhìn trước tối đa 24px theo hướng di chuyển (nội suy 1−e^(−delta/140), đứng yên > 300ms thì về 0) + phóng 1.05 khi tốc độ > movementSpeed·1.15 liên tục 1s; zoom người dùng vẫn do lăn chuột quản lý; reducedMotion tắt cả hai.
- `CombatVFXRenderer` + `world/boss-effects.ts`: sự kiện skill/impact của quái có `bossMechanic` quake/storm → vòng elip lan trên mặt đất (90×45px, cùng bể Graphics, cùng trần maxEffects) và `WorldScene.effect()` rung `shake(120, 0.0025)` khi effects "high" + không reducedMotion.
- `renderers/art.ts`: `ensureGlowTexture`, `ensureDepthFogTextures`, `ensureForegroundTextures` (canvas tạo một lần).
- **Sửa lỗi có sẵn**: `scene.add.rectangle(..., 0x122138, 0)` tạo `fillAlpha = 0`; Phaser nhân alpha object với `fillAlpha` nên lớp đêm **chưa bao giờ vẽ**. Đã đổi sang `fillAlpha 1` + `setAlpha()`.

## Kiểm chứng đã chạy

- `pnpm typecheck`, `pnpm lint` PASS. `pnpm test` **318/318** (22 file; thêm 4 case daynight + 2 case boss mechanic). `pnpm validate:content` PASS. `pnpm build` PASS (precache 70 entry/9673 KiB). `pnpm validate:assets` PASS, không lỗi mới. `pnpm test:e2e` **56/56**.
- Chụp 4 mốc worldClock (Ngọ/Dậu/Tý/Mão) bằng `scripts/capture-daynight-effects.mjs` + save tổng hợp nhập qua UI: `artifacts/daynight-effects/{before,after}/`. Tắt cả 5 công tắc cho ảnh trùng bản trước khi sửa (meanAbsDiff 0.12–0.39, đổi 0.19–0.22% pixel — chỉ nhiễu animation), riêng mốc Tý khác 80.7% pixel vì lớp đêm nay mới thật sự vẽ.
- Từng công tắc (so với ảnh tắt hết, cùng mốc): chỉ glow (Tý) đổi 5.8% pixel, sáng 78.71 vs 77.61; chỉ dusk (Dậu) đổi 80% pixel, sáng 102.73 vs 97.41; chỉ fog (Ngọ) đổi 21.5% pixel, sáng 100.88 vs 97.53; chỉ parallax (Ngọ) đổi 5.4% pixel, sáng 95.95 vs 97.53. reducedMotion bật ở mốc Tý: meanAbsDiff 0.48 (1.5% pixel) so với bản thường → hiệu ứng tĩnh, không phụ thuộc chuyển động.
- Đổi map qua cổng 2 vòng (làng→rừng→làng→rừng→làng): objects 85→98→89→100→94; mức tăng mỗi lần về làng (+4, +5) trùng bản trước khi sửa (+4, +5) → không rò đối tượng sáng/tiền cảnh.
- Hiệu năng (`onDiagnostics`, cảnh Tân Thủ Thôn: đứng yên 30s, rồi 4 vòng chạy 5s, headless Chromium + SwiftShader, renderer WebGL, 1366×768) — fps đứng/chạy, trước → sau (bật hết): quality high 30.73/28.70 → 26.40/23.90 (−14.1%/−16.7%); quality low 30.63/28.80 → 32.27/30.55 (+5.4%/+6.1%). **Mức high không đạt yêu cầu ≤3%**: đo tách cho thấy chi phí nằm ở fill-rate của lớp phủ toàn màn hình (chỉ dusk −7…−9%, chỉ fog −10…−15%), `renderMs` của WorldScene gần như không đổi (0.11–0.15ms). Đã giảm bằng cách chỉ vẽ 2 dải sương có gradient và tắt dusk+fog ở "low"; muốn đạt 3% ở "high" phải bỏ chính hiệu ứng. Chưa đo trên GPU thật.

## Giới hạn còn lại

- Chưa chụp được khoảnh khắc boss Hắc Phong Trại Chủ dùng quake (rung + vòng đất): điều kiện kích hoạt đã có test đơn vị (`bossMechanicEvent`), phần vẽ chỉ kiểm bằng đọc code, không phải ảnh chụp.
- Camera nhìn trước/phóng nhẹ không thể hiện trong ảnh tĩnh (lead về 0 khi đứng yên) và ngưỡng phóng cần haste (tốc độ đi bộ cố định 3.4); chưa có ảnh đối chiếu cho hạng mục này.
- 5 công tắc chưa có UI trong panel Thiết lập (xem scope ở trên).


# Phiên thay art giao diện + môi trường v3 — 20/10/2026

Scope: chỉ tài nguyên hiển thị. Không sửa logic game, không đổi tên file, không sửa `apps/web/src/ui/interface-art.ts`, `atlas-cells.json`, `interfaceArtManifest`. Nguồn: bộ art AI 19/10/2026 (v3) trong `art-moi/`, đã xoá sau khi nối.

## Đã thay

- 36 icon → `apps/web/public/assets/interface/<key>-v1.png` (bản 384² thu về **128²**, giữ alpha; bản gốc lưu `assets/source/interface/icons-v3/`).
- Atlas runtime `icons-atlas-v1.png` 768² (lấy nguyên bản bộ mới) + 3 atlas nguồn `icons-v1.png`, `icons-extra-v1.png`, `portraits-v1.png` (đúng hình học cũ).
- 6 chân dung 512² → **256²** runtime; `lobby-v1.png` 1920×1080 (runtime + nguồn).
- 5 art môi trường: master → `assets/source/overhaul/`, bản ≤512 → `apps/web/public/assets/overhaul/`.
- `packages/game-content/src/visual-assets.ts`: chỉ cập nhật `width/height` 4 prop theo PNG mới (house 512×383, tree 512×497, cherry 512×406, bamboo 358×512); `pivot`/`displayWidth` giữ nguyên.
- Thêm `scripts/capture-art-refresh.mjs` (chụp + kiểm tra 9 màn) và `artifacts/art-refresh/` (ảnh + report).

## Kiểm chứng

- `pnpm validate:assets` PASS: 44 file interface (36 icon 128² + atlas 768² + 6 chân dung 256² + lobby 1920×1080) + 4 prop + ground khớp manifest.
- Đối chiếu atlas 36 ô với icon lẻ: tương quan 0.69–0.94 (chỉ khác do resample) → đúng thứ tự, không lệch key.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` PASS (precache 70 entry/9666 KiB). `pnpm test` **310/310**. `pnpm test:e2e` **56/56**.
- `node scripts/capture-art-refresh.mjs` PASS: 9 ảnh (lobby, world, inventory, tooltip, shop, workshop, storage, skills, character); **0 icon rơi về SVG dự phòng**, 0 ảnh lỗi, 0 pageerror; 44 file interface + 5 file overhaul trả 200; art môi trường ground/house/tree/cherry/bamboo đều được nạp; chân dung hội thoại = `portrait-merchant-v1.png`.
- Icon mới: coverage 9–77%, viền gần như trong suốt, tỷ lệ pixel trắng đục ở mép ≤6% (chỉ `slash`/`ward` có lõi sáng chạm mép). Môi trường: 57–70% pixel trong suốt hoàn toàn, trắng đục ≤1.1%.

## Quyết định và giới hạn

- **Không chạy `scripts/build-interface-art.mjs`**: script cắt icon từ atlas nguồn và tô nền `#171410` từng ô → sẽ phá lớp trong suốt của bộ v3. Runtime icon dùng bản cắt sẵn trong `icons/` (thu 128²). Nếu cần dựng lại từ atlas phải bỏ bước tô nền.
- Icon runtime là 128² (không phải 384² như file gốc) vì `interfaceArtManifest.iconSize=128` và `validate:assets` kiểm tra đúng khổ; bản 384² giữ trong `assets/source/`.
- Prop mới có tỷ lệ khác nên cây/cherry/bamboo hiển thị cao hơn trước ~15–50% (giữ `displayWidth`); nếu thấy quá cao thì chỉnh `displayWidth` trong `visual-assets.ts`.
- Art vẫn **review-required**; chưa đo thiết bị thật.
- Flake có sẵn: các test E2E khổ 1366 (`overhaul`, `full-offline`, thỉnh thoảng `visual-overhaul` forge) fail khi chạy song song 2 worker, pass khi chạy riêng; đã tái hiện trên code base trước các thay đổi art.

## Bước tiếp theo

1. Chủ dự án duyệt trực quan 9 ảnh trong `artifacts/art-refresh/`, đối chiếu icon với `artifacts/art-refresh/preview-icon.png`.
2. Nếu duyệt: đổi `quality`/`provenance` trong `interface-art.ts`, `visual-assets.ts` và mục này từ review-required sang production.
3. Cân nhắc tinh chỉnh `displayWidth`/`pivot` của prop nếu tầm vóc cây/nhà chưa đúng ý.
# Phiên sprite nhân vật 20 bộ (10 phái × 2 giới) — 20/10/2026

Scope: tầng hiển thị/tài nguyên. Không sửa `packages/game-core`, protocol, save schema hay luật gameplay. Nhân vật người chơi dùng ảnh PNG theo (phái, giới); thiếu ảnh thì tự rơi về atlas procedural như cũ.

## Đã triển khai

- Tài nguyên: `apps/web/public/assets/actors/<phái>/<male|female>/sprites/{down,right,up}/<state>.png` — 20 bộ + bộ trung lập `neutral/male` = **21 bộ × 39 file = 819 PNG 256×256** (~29.3MB). Map thư mục gốc `vodang/thieulam/thienvuong/duongmon/ngudoc/ngami/cuiyan/caibang/thiennhan/conlon` → id phái thật trong `classDefinitions`. `preview-tong-hop.png` **không** vào runtime.
- `packages/game-content/src/visuals.ts`: `actorSpriteManifest` (baseUrl `/assets/actors`, 13 state, 3 hướng, feetY 246, displayHeight 112, walk 6fps/run 8fps, `hurtHpRatio` 0.34, `fallback: "neutral/male"`, `sets` cho 10 phái × nam/nữ).
- Tách phần dùng chung: `apps/web/src/game/animations/sprite-frames.ts` (hướng/state/URL/neo chân) — `monster-sprites.ts` giữ nguyên API cũ và gọi lại module này; `actor-sprites.ts` mới cho nhân vật (`actorSpriteOwner`, `actorSpriteFrame`, `actorSpriteWarmUrls`, `actorSpriteFiles`).
- Cache dùng chung: `sprite-texture-cache.ts` (thay `monster-sprite-cache.ts`) — tải lazy từng khung, `warm()` nạp trước stand/walk×3 hướng theo bộ đang có trên bản đồ, `retain()` dọn texture khi đổi bản đồ, `dispose()` khi scene shutdown. WorldScene giữ 2 instance (`monsterSprites`, `actorSprites`).
- `WorldScene.ts`: `EntityView.spriteSource` là union quái/nhân vật; `syncActorSprite` đổi texture/origin/flip mỗi frame cho cả hai; nhân vật sprite **không** bị tint phái đè lên art (procedural thì vẫn tint như cũ); label/bar/cast bar/status dời theo chiều cao khung; `appearanceFor()` gom logic nam/nữ (player cục bộ vs player khác).
- `CharacterLobby.tsx`: phần "Xem ngoại hình" dùng sprite mới theo (phái, giới), xoay 4 hướng (trái = phải lật ngang), vẫn fallback procedural khi thiếu/chưa tải xong.
- PWA: `globIgnores` thêm `assets/actors/**`, runtime cache `CacheFirst` cho `assets/(monsters|actors)/*.png` — precache vẫn 70 entry/~10.8 MiB.
- Công cụ/kiểm tra: `apps/web/actor-inspector.html` (`?set=<phái>/<giới>`), `scripts/capture-actor-sprites.mjs`, `pnpm validate:assets` mở rộng, `tests/integration/actor-sprites.test.ts` (7 case).

## Kiểm chứng đã chạy

- `pnpm typecheck`, `pnpm lint` PASS. `pnpm test` **310/310** (20 file; thêm 7 case nhân vật). `pnpm validate:content` PASS.
- `pnpm validate:assets` PASS: 21 bộ/819 file PNG đúng 256×256 + alpha; mọi phái trong manifest đều tồn tại trong `classDefinitions`; `artifacts/asset-audit.json` có `actorSprites` + `reviewRequiredActorSprites`.
- `pnpm build` PASS (precache 70 entry/~10.8 MiB, sprite không vào precache). `pnpm test:e2e` **56/56**.
- `node scripts/capture-actor-sprites.mjs` PASS: 21 ảnh inspector (0 ảnh thiếu), 4 ảnh in-game + 2 ảnh fallback, 18 request sprite trong game (stand/walk ×3 hướng cho cả `wudang/male` và `emei/female`), 0 pageerror, 0 file lỗi. A/B (chặn 404 `/assets/actors/` một lượt): pixel khác trong vùng nhân vật 435–540 mẫu, vùng đối chứng 0–3 → art PNG thật sự được vẽ. Ảnh: `artifacts/actor-sprites/`.
- Kiểm tra lobby riêng: canvas `.lobby-actor` khớp **100%** pixel (so với chính file PNG vẽ cùng kích thước/vị trí) cho `wudang/male` và `emei/female` — tức preview đang vẽ ảnh mới, không phải hình thủ tục.
- Ảnh preview gốc + brief lưu ở `artifacts/actor-sprites/preview/<phái>-<giới>.png` và `prompt-brief.md`; thư mục giải nén `nhan-vat-moi/` (44MB) đã xoá sau khi copy.
- Flake có sẵn (không do phiên này): test E2E `overhaul` khổ 1366 fail khi chạy song song 2 worker, pass khi chạy riêng; tái hiện trên code base trước thay đổi.

## Khác biệt so với brief và giới hạn còn lại

- Brief ghi "4 hướng 0..3" và `CANONICAL_FRAMES`; repo thực tế dùng `Direction8` (8 hướng) và atlas procedural 8 state. Đã ánh xạ: 3 hướng vẽ sẵn + trái = phải lật; chéo gộp theo trục dọc (1/3 → down, 5/7 → up).
- `run-*`, `loot`, `sit` chưa dùng (core không có state chạy/nhặt/ngồi); `revive` dùng ảnh `die`; `hurt` dùng khi HP ≤ 34%. Toàn bộ là ánh xạ hiển thị.
- **NPC vẫn vẽ thủ tục** (không có bộ sprite NPC trong gói); actor production 8 hướng/11 state vẫn thuộc E1. Art vẫn **review-required**; chưa đo FPS/thiết bị thật.

## Bước tiếp theo

1. Người dùng đối chiếu `artifacts/actor-sprites/inspector-*.png` với `artifacts/actor-sprites/preview/*.png`.
2. Nếu cần: bộ sprite NPC/thú cưỡi hoặc thêm hướng chéo thật (chỉ sửa `actorSpriteManifest.directions` + `spriteFacing`).
3. Cân nhắc nén PNG (819+624 file ≈ 54MB trong `public/`) trước khi phát hành PWA.
# Phiên sprite quái 16 bộ — 20/10/2026

Scope: tầng hiển thị/tài nguyên. Không sửa `packages/game-core`, protocol, save schema hay luật gameplay. Sprite quái mới thay bản vẽ thủ tục **chỉ khi** có ảnh; thiếu ảnh thì tự rơi về atlas procedural như cũ.

## Đã triển khai

- Tài nguyên: `apps/web/public/assets/monsters/<id>/sprites/{down,right,up}/<state>.png` — 16 bộ × 39 file = **624 PNG 256×256** (~24.2MB). `preview-tong-hop.png` **không** copy vào runtime. Sau khi đối chiếu xong đã **xoá thư mục giải nén `quai-vat-moi/`** (36MB); ảnh preview lưu ở `artifacts/monster-sprites/preview/<id>.png`, brief gốc ở `artifacts/monster-sprites/prompt-brief.md`.
- `packages/game-content/src/visuals.ts`: `monsterSpriteManifest` (baseUrl, 13 state, 3 hướng, feetY 246, displayHeight 112, bossScale 1.5, walk 6fps/run 8fps, `runSpeedThreshold` 2.2, `hurtHpRatio` 0.34, danh sách 16 id) + `weaponByMonster` cho 10 quái mới (chỉ dùng cho fallback).
- `apps/web/src/game/animations/monster-sprites.ts`: ánh xạ thuần state/direction → file (0→right, 4→right lật ngang, 2/1/3→down, 6/5/7→up), idle→stand, walk→walk-1/2 (run-1/2 khi `speed ≥ 2.2`), attack/cast→đúng tên, hit→hit (hurt khi HP ≤ 34%), dead/revive→die, interact→use; `loot`/`sit` chưa có state trong core.
- `monster-sprite-cache.ts`: tải lazy từng khung bằng `Image` + `textures.addImage`, giữ texture theo quái đang có trên bản đồ (`retain` khi `buildMap`), `dispose` khi scene shutdown.
- `WorldScene.ts`: `EntityView` giữ atlas gốc + thông tin quái; `syncActorSprite` đổi texture/origin/flip mỗi frame, quái sprite **không** bị tint đè, label/bar/cast bar/status chấm dời theo chiều cao khung thật; boss (`brain === "boss"`) 168px, quái thường 112px.
- PWA: `globIgnores: assets/monsters/**` + runtime cache `CacheFirst` — precache giữ 70 entry/11085 KiB, sprite chỉ cache khi dùng.
- Công cụ/kiểm tra: `apps/web/monster-inspector.html` (`?monster=<id>`, 13×3 + cột trái lật, đếm ảnh thiếu), `scripts/capture-monster-sprites.mjs`, mở rộng `scripts/validate-assets.mjs`, `tests/integration/monster-sprites.test.ts` (8 case), alias `@kiem-hiep/*` trong `vitest.config.ts` để test được module tầng web.

## Kiểm chứng đã chạy

- `pnpm typecheck`, `pnpm lint` PASS. `pnpm test` **303/303** (19 file, thêm 8 case mới). `pnpm validate:content` PASS.
- `pnpm validate:assets` PASS: 16 bộ/624 file PNG đúng 256×256 + alpha; `artifacts/asset-audit.json` có `monsterSprites` + `reviewRequiredMonsterSprites`.
- `pnpm build` PASS (precache 70 entry/~10.8 MiB, sprite không nằm trong precache). `pnpm test:e2e` **56/56**.
- `node scripts/capture-monster-sprites.mjs` PASS: 16 ảnh inspector (0 ảnh thiếu), 4 ảnh in-game + 1 ảnh fallback, 624 request sprite (0 lỗi 4xx/5xx), 30 request phát sinh trong game gồm `stand/walk-*/run-*/attack/cast/die`, 0 pageerror. A/B (chặn 404 sprite để buộc vẽ thủ tục): pixel khác trong vùng từng quái 598–1951 mẫu, vùng đối chứng 0–47 → art PNG thật sự được vẽ trong game. Ảnh + báo cáo ở `artifacts/monster-sprites/`.
- Ghi chú flake có sẵn: 2 test E2E 1366 (`full-offline` khởi tạo/đánh quái, `overhaul` hành trình) fail khi chạy song song 2 worker; **tái hiện cả trên code base khi tạm bỏ thay đổi này**, và pass khi chạy riêng → không phải hồi quy của phiên này.

## Khác biệt so với brief và giới hạn còn lại

- Brief nói "giống bộ nhân vật đã nối trước đó": repo **chưa** có hệ sprite ảnh cho actor — actor/NPC vẫn vẽ thủ tục (`animations/atlas.ts`). Vì vậy lớp sprite ảnh mới chỉ áp cho quái, actor/NPC giữ nguyên.
- Bộ ảnh chỉ có 3 hướng + lật ngang, trong khi `docs/visual/SPRITE_SPEC.md` yêu cầu 8 hướng/11 state cho actor production: chéo gộp theo trục dọc nên hướng 1/3 hiển thị `down`, 5/7 hiển thị `up`.
- `loot`/`sit` chưa dùng; `revive` dùng ảnh `die`; `run-*` chỉ dùng cho quái `speed ≥ 2.2` (core không có state chạy). Toàn bộ là ánh xạ hiển thị, không thêm state vào simulation.
- Art vẫn **review-required**; chưa đo FPS/thiết bị thật, chưa có sprite ảnh cho player/NPC, chưa thay prop/tile.

## Bước tiếp theo

1. Người dùng đối chiếu `artifacts/monster-sprites/inspector-*.png` với `artifacts/monster-sprites/preview/<id>.png` (ảnh `preview-tong-hop.png` đã lưu lại trước khi xoá thư mục giải nén), ghi nhận các khuyết điểm ở mục 6 của brief (`artifacts/monster-sprites/prompt-brief.md`); không vẽ lại.
2. Nếu cần khớp spec 8 hướng: bổ sung hướng chéo thật hoặc chấp nhận gộp trục dọc; khi đó chỉ sửa `monsterSpriteManifest.directions` + `monsterFacing`.
3. Sprite ảnh cho player/NPC và atlas actor production vẫn thuộc E1.
# Phiên visual overhaul — 19/10/2026

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
