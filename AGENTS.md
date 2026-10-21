# AGENTS.md — quy ước làm việc trong repo này

Áp dụng cho mọi agent/người sửa code trong `vltk_web`. Nguồn phạm vi sản phẩm là [docs/FULL_OFFLINE_RPG.md](docs/FULL_OFFLINE_RPG.md); trạng thái và việc còn lại nằm ở [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md), [docs/ROADMAP.md](docs/ROADMAP.md), [docs/WORK_QUEUE.md](docs/WORK_QUEUE.md).

## 1. Trước khi sửa code

1. Đọc `docs/ROADMAP.md` và `docs/WORK_QUEUE.md` để biết work package và việc đang mở.
2. Đọc `docs/EXECUTION_STATE.md` để biết phiên trước đã làm gì, còn blocker gì.
3. Chỉ đọc phần source liên quan tới việc sắp làm. Không audit lại toàn bộ dự án mỗi nhiệm vụ.
4. Không làm lại tính năng đã hoạt động. Không tự thu hẹp phạm vi hoặc thay yêu cầu bằng mục tiêu MVP.

## 2. Kiến trúc bất biến

- `packages/game-core` là TypeScript thuần, không DOM, không React; chạy được trong Node.
- `packages/game-protocol` giữ contract: `GameCommand`, `GameEvent`, `GameSnapshot`, `GameSession`, version schema.
- Simulation là authority: fixed 20Hz (`TICK_RATE`), seeded RNG, mọi kết quả gameplay (damage, loot, EXP, craft, enhance, quest) do core quyết định. UI/renderer/audio chỉ đọc và gửi command.
- Persistence có version: `SAVE_SCHEMA_VERSION`, migration trong `packages/game-storage/src/migrations`. Không được làm hỏng save cũ; đổi shape phải có migration + fixture.
- Content là data-driven trong `packages/game-content`. Không nhân bản definition chỉ để tăng số lượng, không tạo item/quái/map rỗng.
- `GameWorld.snapshot()` là authority đầy đủ (lưu trữ/kiểm thử). `GameWorld.viewSnapshot()` là view đã lọc theo bản đồ có người chơi, dùng cho vòng publish 20Hz. Không đưa quyết định gameplay vào view.

## 3. Quy trình một nhiệm vụ

1. Xác định nhiệm vụ chưa xong trong `docs/WORK_QUEUE.md`.
2. Triển khai logic trong core, rồi tích hợp session/UI/save nếu cần.
3. Thêm test phù hợp (unit/integration, và E2E khi hành vi hiển thị trong browser).
4. Chạy kiểm tra ở mục 4. Sửa lỗi trước khi chuyển việc.
5. Cập nhật `docs/WORK_QUEUE.md`, `docs/EXECUTION_STATE.md` và tài liệu liên quan với đúng trạng thái đã kiểm chứng.
6. Chuyển ngay sang nhiệm vụ đủ điều kiện tiếp theo; không dừng chỉ để báo cáo.

## 4. Lệnh kiểm tra

```sh
pnpm typecheck     # monorepo + game-core không DOM
pnpm healthcheck   # gom typecheck/lint/test/validate + kiểm tra three ở chunk riêng
pnpm lint
pnpm test          # vitest unit/integration
pnpm validate:content
pnpm build && pnpm test:e2e   # Playwright cần build trước
pnpm profile:core && pnpm profile:footprint
```

## 5. Trung thực bằng chứng

- Chỉ báo "đã kiểm chứng" khi đã chạy thật và ghi lại kết quả. Không tuyên bố FPS/thiết bị thật, production art/audio hay độ hoàn tất của tính năng chưa đo.
- Ghi rõ phần nào là fixture/đo đạc tổng hợp, không tính là hành trình progression hay content phát hành.
- Không dùng việc cập nhật tài liệu thay cho implementation.
- Khi hết giới hạn phiên: dừng ở trạng thái an toàn, ghi file đã sửa, test đã chạy, blocker và bước tiếp theo vào `docs/EXECUTION_STATE.md`.
