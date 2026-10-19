# Kiểm chứng v0.4.0 — 19/10/2026

Môi trường: macOS Apple Silicon, Node22.22, pnpm10.34.5, Chromium headless/Playwright,2workers. Mobile là viewport/touch emulation; chưa phải thiết bị Android/iOS/Safari thật.

| Kiểm tra | Kết quả |
|---|---|
| Typecheck | PASS: toàn monorepo và core ES2022/Node không DOM |
| Lint | PASS |
| Unit/integration | **251/251**,13files; bổ sung11ca trong `full-offline.test.ts` |
| Storage sau bảo toàn backup lúc xóa | **15/15** ở `full-offline.test.ts` và `storage.test.ts` sau sửa cuối |
| Build | PASS; content0.4.0/schema2/protocol1 |
| Content report | PASS;4maps,6monsters,1boss,11items,141skills,5NPC,15quests,0dungeon |
| Asset validator | PASS metadata/size/alpha; **0production-ready**,5PNG cầnreview; actor procedural |
| Browser E2E | **41/41** ở lượt toàn bộ, khoảng2.1phút. Sau chỉnh layoutmobile:4/4ca entry/loot/orientation chạy lại đạt; bổ sung assertion nút tạo/vào nằm trongviewport. |
| PWA | Precache21entries,khoảng3.5MiB; E2Eoffline reload/maptransition/craft/migration quaUI |
| Soak |288000ticks tương đương4giờ simulation tăng tốc,8checkpoints, replay/resume quaZod; không phải4giờrender |
| FPS/memory điện thoại | Chưa đo; không suy diễn từ Chromium headless |

Sau sửa layout cuối chỉ chạy lại các ca chịu ảnh hưởng; `.last-run.json` phản ánh lượt chạy mục tiêu gần nhất, không chứa lịch sử toàn bộ41ca.

## Test mới và sửa regression

`full-offline.test.ts` bao phủ Unicode/NFKC/whitespace/casefold/ký tựẩn,5slot tạo đồng thời nguyên tử,ID/item độc lập,xóa giữ cảprimary/backup trongarchive; grounddrop nhậnEXP trước nhưng chưa nhậnbạc,pickup spam,ownership/crossmap,instanceid,túiđầy/stackmatching,autopath,expiry,filter/anchor/stopfull,migrationv0.3/serialization/playtime và steering TTL/collision/replay.

`full-offline.spec.ts` có2hànhtrình PC1366×768/mobile932×430 từDBrỗng → tựnhậptên → tạo → Spaceđánhquái → quái chết/drop → tắttựđánhquaUI → clicknhặt → save/reload → màn hìnhchọn → vàođúngnhânvật. Khôngimportfixture,khônggrantEXP/item/gold, khônggọidebughook. Haihànhtrình highlands khảo sát→nhậnthưởng→reload offline cũ tiếp tụcqua.

ThêmtestUI têntiếngViệt/đổipháigiữtên/trùngtên/namnữ/create/select/delete; contextmobiletouch thật ởChromium kiểmtraportaitguard→landscape→modalbackdropfullviewport→pause khi xoaydọc. Các bài kiểmtra migration/economy/10phái dùng importfixture quaUI để kiểmtracơchế riêng, không được gọi là hànhtrình luyện cấp khônggrant.10phái được tách10test độc lập để tránh gom10lần đổiPhaser scene vàpickup vào chungtimeout45s; không nớixácnhậngameplay.

Đã sửa lỗi Space bị mất khi keydown/up cùng diễn ra giữa2frame; dùng eventkeydown. Regression đã đổi kiểmtra bạc sau bước nhặt vì luật mới không cộng bạc thẳng khi quái chết.

## Ảnh đã xem trực tiếp

- [Tạo nhân vật](../../artifacts/character-creation.png).
- [Chọn nhân vật PC](../../artifacts/character-selection-1366.png), [mobile](../../artifacts/character-selection-932.png).
- [Đồ rơi PC](../../artifacts/ground-loot-1366.png), [mobile](../../artifacts/ground-loot-932.png).
- Các ảnhHUD/camera/world cũ được tái tạo bởiE2E; artactor cònthủtục, khôngghi production-ready.

## Giới hạn còn mở

Chưa xongtùybiến mặt/tóc/trangphục và sprite nam/nữriêng; bảng5slot áp dụng tạo mới, import bảnlưu vẫn giữhànhvikhôiphụccũ. Chưa navstreaming/simulationregions,40map/100quái/300–500items/100quests/6dungeons. Chưa lò rèn+15/protection/refinement và shopquantity/stock. Một record hỏng trongcatalog vẫn cóthể dẫnđến màn hìnhkhôiphụcchung; cần catalogrecovery riêngtừngslot, faultinjection/quota/update/Safari và kiểmtra máy thật ởphase7. Không tuyên bố hoàn tất Full Offline RPG.

Build còn cảnh báo bundlePhaser~1.2MB và app~633KB trướcgzip; PWAcache hiện đủnhỏ nhưng cần permapassetpacks và profileGPU/memory khi mở rộngcontent. Không cóbenchmarkmới cho FPS/GPU/thermal; sốsoak làsimulationCPU.

---

## Báo cáo v0.3 được giữ làm lịch sử

# Kiểm chứng v0.3.0 — 19/10/2026

Môi trường: macOS Apple Silicon, Node22.22, pnpm10.34.5, Chromium headless qua Playwright. Không phải chứng nhận Android/iPhone/Safari thật.

| Kiểm tra | Kết quả |
|---|---|
| Typecheck | Đạt toàn repo và core ES2022/Node không DOM |
| Lint | Đạt |
| Unit/integration | 240/240,12files |
| Content validation | 3/3tests, không lỗi references/spawns/recipes/quest graph |
| Asset validation | 4prop PNG alpha +1ground PNG đúng kích thước/pivot;5assets review-required,0production-ready |
| Content/balance report | 4maps/15quests,20nhánh có baseline combat; không đồng nghĩa fullcontent/balance |
| Productionbuild | Đạt,21precacheentries, khoảng3.5MiB |
| BrowserE2E | 28/28 đạt,2workers, khoảng1.5phút; test-results/.last-run.json:passed |

Build còn cảnh báo chunk lớn (Phaser khoảng1.2MB, app khoảng609KB chưa nén) và annotation từ dependencyZod; không có lỗi build. Không giấu cảnh báo bằng nâng threshold.

## Kiểm thử mới

11world/migration/asset/transaction tests: đường đến8địa danh; A*map256cówall/budget/chốngxuyên góc; chunkselection độc lập kích thướcmap128/1024 và qua boundary; camera5viewport trongrenderenvelope; areaquest bằng movement/replay; maprestriction; migrationfixturev0.2giữđồ/ngọc/kho/nghề/archive; hotbarswap; assetdimensions/alpha; antidoubletapenhance10tick vàreload không lách.

3audio lifecycle tests bằng fakeAudioContext: không tạo context trướcgesture; unlock/dispose; voice≤16; mute/pause không tạo âm mới; chuyểnmapliêntục chỉ2musicbuses vàdọnfade. Không coi các test này là listeningQA.

Giữ226regression cũ:141skilldefinitions cótest thựcthi, combatpipeline/AI/boss/projectile/status; economyatomicity; backup/import/export; v1migration; nhiềuactor/ownership/replay; sessionlifecycle; hành trình core từ nhân vật mới đến3quest/boss. Soak288000ticks tươngđương4giờsimulationtăngtốc,8checkpoints, vẫn đạt. Không phải4giờrender hoặc chứng minhkhôngleakGPU.

## Browser

5viewport1920×1080,1366×768,932×430,844×390,390×844: khôngheader/footerwebsite, canvasfullviewport, HP/túi/equip, khôngtrànngang/hitboxskillkhôngchồng, minimapexpand/save notice. CDPtouch2IDs giữjoystick+dùngchiêu: cómove/tiêuMP vàcancel dừngpath. Settingsquality/joystick/audio/reducedmotion giữreload màkhôngđổiRPGstate.

PC/mobile có hành trình mới không import/grant: đi cổngNgoạiVực → gặpLục tuần sơn → nhậnQuađèoTrúcẢnh → đi vàoarea → vềclaim → lưu → ngắtmạng/reload → quest/goldgiữđúng. Đây là một hành trình, chưa thay full30-stepgameacceptance.

Các ca khác:10phái cast/lootthật quaHUD (fixtures có kiểmsoát); branch/passive/loadout giữsave; craft/enhance/socket/bankPCmobile; joystick; xuất/nhiềunhânvật; IndexedDBv1migrate/archive; importv0.2đồ+kho+nghề; offline reload/portal vàmobilecraft/reload. Regression mới cho điều hướng gần dược sư từ túi/côngxưởng không đóng đè hội thoại.

## Lỗi tìm thấy và sửa

- Closepanel sau sendcommand đóng đè dialogue đồng bộ khi đã gầnNPC: đóngpanel trướcsend ở quest/shop/workshop/storage navigation.
- Đổi nhân vật nhanh tạo2canvas vì Phaser.destroy trì hoãn đến frame tiếp: detachcanvas ngay, teardown Phaser vẫn theo lifecycle; scene cleanup đăngký cảshutdown vàdestroy. Test yêu cầu đúng1canvas, không dùngselector.first đểné.
- Bind chiêu tạo2ôtrùng: đổi chỗ slot hiện có.
- Doubletap enhance tiêu hai lượt ngoài ý muốn: corecooldown10ticks, UI disabled vàsavegiữdeadline.
- Ground lộ màu từngô lớn: materialPNG lặp theo tọađộworld, không tínhdamage/collision bằngpixel.

## Render smoke và nguồn asset

`pnpm profile:world` khi dev5173 đangchạy tái tạo24camera jumps qua8địa danh: max32cachedchunks/27activechunks/40textures/134objects, terraincanvasestimate36.56MiB; JSheap sauGC khoảng9.5MiB; khôngpageerror. Source:artifacts/streaming-browser.json. Chỉ devrenderer, không gồm GPU/native memory hoặc fullgameactor/audio, không chứng minhFPSthiếtbị hayleakdàihạn.

Đã mở xem screenshotPC/mobile/ngang/dọc, vùngmới và material scene. Props/ground tạo mới bằngbuilt-inImageGen,source+prompts ởassets/source/overhaul; runtimeuniformresize/alpha/pivot được kiểmtra. Actor/NPC/UI vàmộtphầnterrain vẫn developmentart; khôngđạtđộchi tiết ảnhthamchiếu.5PNG chưađánhproductionready.

## Còn thiếu

RealdeviceAndroid/iOS, Safari, highDPI/notch/thermal/drawcalls/GPU/memoryrendernhiềugiờ; audio listening/library; productionactor/NPC/armor/weapon/mountedframes; per-mapassetpacks/Tiled/navstreaming/spatialAI; affix/set/refinement/NPCmarket; dungeon/companion/mount/guild/arena/siege vàđủworld/story/progression. Đã giữ toàn bộtrong [full-release](full-release.md) và [IMPLEMENTATION_STATUS](../IMPLEMENTATION_STATUS.md).
