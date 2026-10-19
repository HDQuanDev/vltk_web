# Server tương lai

Chưa có server ở phiên bản offline. Bắt đầu từ tài liệu `docs/online-migration/architecture.md` và `migration-plan.md`. Dùng GameWorld trong Node, Colyseus Room làm authoritative simulation host, RemoteGameSession làm client transport adapter. Không thêm Redis/PostgreSQL/WebSocket vào đường chạy offline.
