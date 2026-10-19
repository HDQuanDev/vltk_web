# Audit gameplay và thay đổi thực tế

Baseline0.2 đối chiếu source:sharedcore20Hz/seed,commandsruntimevalidation/ownerRPG,10phái/20nhánh/141skill,6monsterbrains/1boss,3maps/8quests,11items/3equipslots,7recipes/7professions,enhance/gem/bank,save2/migrationv1/archive,PWA.226coretests+16browsercases là baseline, không phải fullgame.

Không viết lại các hệ thống đang hoạt động: giữ CombatRuntime/EconomyTransactions/AI/GameWorld/LocalSession. Audit phát hiện giới hạnmap30tiles/fixedtexture/A*sortarray/blockedlinear; headerfooter cheview; toneaudio khôngmixer; artplaceholder; UI questnav cứngtheoelder/village. V0.3 xử lý các điểm này trong nhóm đầu.

V0.3 bổ sung vùng128×128 có8POI/18spawn/5resources/2NPC/7quests; coreareaobjective/maprestriction,heapA*/blockedindex,hotbarswap,antidoubletapnângđồ,migration0.2→0.3. Browserjourney tìm ra race closepanel sau dialogue đồng bộ; đã đổi thứ tựclose trướcsend. Không biếnNPCchỉđường thànhshopgiả.

Chưa có fullitemization/refinement/set/NPCmarket,questbranching/multipleobjectives,companions/mounts/guild/arena/siege/dungeon hoặc đủcontenttargets. Run/mounted productionframes,weapon/armorlayers,recordedaudio vàrealdeviceQA cònthiếu. Toàn bộgiữ trongfullreleasebacklog, không loại scope để gọi MVPxong.
