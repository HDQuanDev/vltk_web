> Tài liệu lịch sử v0.1. Trạng thái và thiết kế hiện tại: [IMPLEMENTATION_STATUS](../IMPLEMENTATION_STATUS.md), [SYSTEM_ARCHITECTURE](../SYSTEM_ARCHITECTURE.md), [COMBAT_DESIGN](../COMBAT_DESIGN.md), [ROADMAP](../ROADMAP.md). Các mô tả thiếu tính năng bên dưới phản ánh baseline trước nâng cấp.

# Kế hoạch chuyển online

1. Giữ GameWorld thuần TypeScript và chạy cùng content trên Node. Hiện test core đã làm việc này.
2. Tách per-player RPG state khỏi local session snapshot; bổ sung map instance IDs và entity ownership server.
3. Viết Colyseus Room gọi `world.step()` 20Hz. Validate runtime command bằng schema, giới hạn rate/sequence và kiểm tra ownership trước dispatch.
4. Viết RemoteGameSession theo interface hiện có. Thay composition root, không đưa network vào core hoặc scene.
5. Chọn snapshot/delta schema, interest management theo lưới và gửi state khoảng 10–20Hz. Thêm interpolation trước prediction.
6. Bổ sung auth, reconnect, ack, reliable transactions và test command từ client không tin cậy.
7. Triển khai PostgreSQL cho account/character/item/quest/transaction. Redis chỉ khi đo được nhu cầu nhiều process.
8. Chọn chính sách nhân vật online mới hoặc import offline giới hạn; migration phải chạy phía server và audit, không cho tự gửi HP/tiền/cấp.
9. Load test, đo latency và memory, kiểm thử ngắt mạng và dupe item. Chỉ sau đó mở multiplayer thật.

Bằng chứng hiện có: Node tests không có DOM; replay cùng seed; JSON roundtrip và RNG resume; scene chỉ nhận GameSession; contract test subscription/dispose; nhiều combat entity/player trong cùng map. Đây là bằng chứng tái sử dụng simulation, chưa phải chứng nhận vận hành MMORPG.
