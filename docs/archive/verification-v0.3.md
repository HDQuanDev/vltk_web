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
