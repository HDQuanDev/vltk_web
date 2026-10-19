> Baseline v0.2. Thay đổi v0.3 và trạng thái hiện tại: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [rendering](architecture/rendering.md), [world streaming](architecture/world-streaming.md), [full-release](roadmap/full-release.md).

# Thiết kế chiến đấu hiện có

Mỗi môn phái có 2 nhánh, 7 kỹ năng mỗi nhánh; thêm một đánh thường dùng chung. Tổng catalog 141. Cơ chế được chia sẻ ở primitive (melee, projectile, line, cone, dash, AOE, heal, buff, passive), còn tầm, thời gian vận công, hồi chiêu, hệ và effect nằm trong dữ liệu. Xem [CONTENT_CATALOG.md](CONTENT_CATALOG.md).

## Thứ tự xử lý

1. Validate envelope, actor sống, quyền học/nhánh, điều kiện cấp, đã học, mục tiêu, tầm, line of sight, stun/freeze/silence, MP/cooldown.
2. Trừ MP, đặt cooldown theo tick; ghi cast state. Di chuyển hoặc khống chế có thể ngắt vận công; không hoàn lại chi phí đã tiêu.
3. Đến tick resolve: tạo đạn hoặc tính vùng ảnh hưởng. Đạn di chuyển thật, kiểm tra đoạn đường/va chạm/vật cản, lưu target đã trúng để không đánh lặp khi pierce.
4. Damage: attack buff/defense break và passive → accuracy/evasion → seeded crit/khắc hệ/kháng hệ → guard → shield → HP → life steal → death/reward/quest.
5. Apply effects; DOT/HOT dùng ticks và snapshot attack, giới hạn stack, refresh/expiry. Death hủy cast, xóa status; đạn/vùng nguy hiểm của nguồn chết không gây damage tiếp.

Công thức nền: `max(1, round((attack × power − defense × .55) × elementalModifier × (1 − resistance) × critMultiplier))`. Né = clamp(.04 + evasion − accuracy,.01,.35); crit = min(.6,.12 + bonus), crit multiplier 1.65. Khắc hệ 1.2, bị khắc .85; kháng tối đa .65. Tương sinh tăng hiệu quả hỗ trợ đồng minh phù hợp 15%. Damage bị né bằng 0.

Có poison, burn, regen, slow, stun, freeze, silence, shield, armorBreak, haste, attackBuff, defenseBuff, vampirism, invulnerable. DOT/HOT mặc định mỗi 20 ticks. Level chiêu tăng effect magnitude 12% mỗi rank, CC duration tăng 8% mỗi rank. Haste giảm thời gian đánh thường. Passive chỉ cộng khi nhánh đang chọn, không cộng chéo tất cả nhánh.

Không có global cooldown chung; nextAttack, cast và cooldown riêng hạn chế nhịp. Attack/cast có pose trong atlas, nhưng chưa có hệ animation lock riêng theo weapon/cancel windows. Knockback chưa triển khai. Không coi dash là knockback.

## AI và boss

Sơn tặc cận chiến; sói hỗ trợ đàn; cung thủ giữ khoảng cách; thích khách vòng sườn; rắn gây độc. Threat giảm dần theo game clock và có chọn mục tiêu nhiều player; patrol/chase/leash/return dùng cùng navigation. Một boss có telegraph trễ cho phép né, tăng vùng nguy hiểm/triệu hồi 2 thuộc hạ dưới 50% HP. Summon có giới hạn entity và cleanup xác. Chưa đủ 20 boss hoặc đa dạng boss mechanics theo yêu cầu cuối.

## Phản hồi và kiểm chứng

Cast bar, chấm status, vùng telegraph, trail/impact, số damage/crit, hit flash, camera shake có giới hạn và VFX theo hệ. Chế độ effects thấp giảm hạt/thời tiết. Atlas nhân vật có 8 hướng × 8 trạng thái × 6 frames, feet anchor 32,88; art procedural cần polish.

`v02-combat.test.ts` thực thi từng definition và kiểm tra pipeline/né đạn/va chạm/ngắt cast/stack/expiry/boss/multi-actor. `pnpm report:content` chạy bài đo 20 nhánh trong Node, ghi `artifacts/balance-baseline.json`. Kết quả thực thi không chứng minh các chiêu đều cân bằng hoặc đạt cảm giác chiến đấu cuối cùng.
