# Full release — dependency gate

Xem [ROADMAP hiện hành](../ROADMAP.md), [trạng thái phân chiều](../IMPLEMENTATION_STATUS.md) và [FULL_OFFLINE_RPG](../FULL_OFFLINE_RPG.md). Prompt tiếp nối giữ nguyên tại [CONTINUATION_FROM_v0.4](../CONTINUATION_FROM_v0.4.md).

A streaming/map256 → kiểm thử/device/budgets → B world/monster content → C itemization → D economy/enhancement → E art/combat/audio → F full RPG → G nghiệm thu. Content và art có thể được chuẩn bị trong phạm vi dependency đã được chứng minh; không nhân40maps trước kiểm tra hạ tầng.

Phạm vi chưa hoàn thành gồm đủ50map/150quest/500item/10dungeon theo master trước đây, cùng các mốc trung gian40/100/300–500/6 của yêu cầu hiện hành;100–120monster/20bosses,10sectmaps, companionship/party/mount, guildNPC, arena/tournament/siege, events/treasure/achievements, progression100, tutorial vàfullmobile/offline. Chưa có bộ art/audio sản xuất. Không loại bỏ subsystem vì chưa có implementation.

Gate một tính năng: rules shared core + dữ liệu thật + UI/input PC/mobile + save/migration + gameplay integration + tests phù hợp + art/audio review + thiết bị khi cần. Các test primitive/fixture chỉ chứng minh điều chúng thực thi, không thay hành trình hoàn chỉnh.
