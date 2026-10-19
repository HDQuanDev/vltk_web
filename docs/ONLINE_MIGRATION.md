# Chuyển quyền xử lý sang online

Đã có: core Node không DOM, fixed tick/seed, command/event/snapshot typed và runtime envelope validation, nhiều player với RPG data có owner, common combat/AI/economy rules, replay serialize/resume, server mode không cho local pause. Tests chạy hai actor và xác minh reward/trang bị không ghi vào nhân vật chính sai chủ sở hữu.

Chưa có RemoteGameSession, transport/Colyseus, server deploy, account/auth, authoritative persistence, reconnect hoặc anti-cheat đầy đủ. Không gọi các phần này hoàn tất từ việc core chạy trong Node.

## Lộ trình triển khai

1. Tách projection world authority và local player view khỏi root snapshot. Thêm instanceId cùng mapId, world routing và character ownership registry; không nhân đôi combat/economy. **(v0.5: `viewSnapshot`/`worldTotals` đã tách view một viewer khỏi authority; instanceId/routing/ownership registry chưa có.)**
2. Gateway xác thực account, gắn socket với actorId do server cấp. Client không tự chọn actor khác dù envelope schema hợp lệ. Sequence được quản lý trong phiên authority, rate limit/queue và lệnh trễ kiểm tra tại server.
3. RemoteGameSession thực hiện cùng interface; truyền command lên authority. Server tick GameWorld với allowPause:false và server-owned seed/content. Gửi delta theo interest map/radius, snapshot ban đầu và ACK sequence. **(v0.5: mới có snapshot ban đầu đã lọc theo interest map; delta/radius/ACK qua mạng chưa có.)**
4. Client interpolate entity, prediction movement khi cần rồi reconcile với ACK. Damage/loot/craft hoàn toàn server-side. Tái kết nối cấp snapshot/version/session mới và xử lý command idempotency.
5. Persist character/instance bằng transaction ở server; inventory/gold changes có audit/idempotency key. Không nhập gold, đồ hoặc EXP từ save offline vào economy online trusted. Có thể tiếp tục offline profile riêng.
6. Party/guild/chat/PvP và cross-map handoff do authority điều phối. Chỉ thêm horizontal sharding khi đã đo quy mô instance, không dùng một browser world cho toàn MMO.

Content migration phải có version mapping/fixture/archive trên server; restart không tự tin vào sequence counter nằm trong browser. Network protocol v1 hiện cho local development; schema save v2 là hợp đồng khác. Zod chỉ kiểm cấu trúc, không thay authentication và authorization.

## V0.5: vùng mô phỏng dùng chung

Navigationcomponents/gateway, spatialAI và weighted spawnzones đều ở core khôngDOM; RNG/tick/state của spawnregions và lootreserve được snapshot/replay. Nhiều player cùngmap kích hoạt hợp vùng, cap4spawn/tick là globalworldbudget, không nhân cap theo sốcamera. Client diagnostics là thông tin quan sát, không cấp quyền sửa state. Từ v0.5, `GameWorld.viewSnapshot()` tách view client khỏi authority: publish20Hz chỉ gửi bản đồ đang có player kèm `worldTotals`, còn `getSnapshot()` giữ authority đầy đủ cho lưu trữ. Đây là projection một chiều tại chỗ, chưa phải networkinterest: chưa có delta publish, rate-limit, instance, paging hay authoritative persistence. Server vẫn cần các phần đó trước mở hàng nghìn actor. Không nhận save offline vào economy trusted.
