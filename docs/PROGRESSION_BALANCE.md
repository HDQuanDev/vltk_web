> Baseline v0.2. Thay đổi v0.3 và trạng thái hiện tại: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [rendering](architecture/rendering.md), [world streaming](architecture/world-streaming.md), [full-release](roadmap/full-release.md).

# Tiến trình và cân bằng

Giới hạn kỹ thuật đã nâng lên cấp 100. EXP cần cho cấp kế tiếp = round(90 × level^1.45). Mỗi lần lên cấp +5 điểm thuộc tính, +1 điểm kỹ năng và hồi HP/MP. Danh mục thế giới hiện chỉ phục vụ phần đầu hành trình; chưa có nội dung cân bằng để chơi đến cấp 100.

HP = 180 + vitality×12 + level×18. MP = 80 + energy×8 + level×10. Công = 12 + level×3 + trang bị/nội công + (strength×2 nếu ưu tiên strength, hoặc strength + thuộc tính ưu tiên). Phòng ngự = 3 + dexterity×.7 + level + trang bị/nội công. UI phân điểm gửi command và core tính lại; reset trả điểm đã phân, giá 200 + level×20 bạc.

Kỹ năng có cấp tối đa 5; mốc mở hiện 1/2/4/6/8. Đổi nhánh giữ điểm đã học, chỉ nội công nhánh hiện tại có tác dụng; các chiêu ngoại nhánh không thể dùng. Chưa có respec skill tree, nhập môn qua quest, unlock hoạt động theo mốc, hoặc preset nhiều bộ chiêu.

## Bài đo tái lập

`tools/balance/scenario.json` cấu hình cấp 8, cùng 35 điểm thuộc tính, 7 điểm chiêu, seed 71227, 30 giây, mục tiêu Kim đứng yên phòng ngự 10. Script chạy combat core thực; gồm đánh thường, cooldown, vận công, DOT, buff, MP regen. Báo cáo có build/rank, DPS, HP/MP, MP tiêu, số cast và damage/MP. Không tối ưu rotation riêng từng phái; đây là baseline so sánh cùng kịch bản.

Bản hiện tại có chênh lệch DPS đáng kể giữa nhánh và mức cạn MP khác nhau; chưa khóa cân bằng. Một bài đo mục tiêu Kim không đại diện AOE, healer, tank, PvP, kháng hệ hoặc boss. Không tự chỉnh tất cả phái về một DPS từ bài đo này.

## Backlog bắt buộc

Thêm ma trận 5 hệ × cấp 1/8/20/50/100, mục tiêu di chuyển/nhóm và boss, nhiều seed, thời gian sống sót/TTK/sustain, chi phí thuốc, hiệu suất resource/craft và khảo sát trải nghiệm. Xây 50 map/150 quest theo dải cấp rồi đo EXP/giờ và thời gian mở từng hoạt động. Chỉ nghiệm thu cân bằng khi có dữ liệu cả simulation và người chơi; chưa hứa số giờ chơi dài hạn từ đường cong EXP.

## Farm Vân Khê v0.5

`artifacts/farm-30min.json` ghi hành trình command-only sau3queststarter:375kills/30phút simulation, cấp4→12, bạc1654→8926,47entity vàsnapshot31–34KB. Vòng chơi dùng kiếm kiếm được/điểm thuộc tính kiếm được, heal trả MP/cooldown, auto range12 vàautopickup; không grant. Elite tăngHP/công/thủ vàEXP, level zone tăngstat theo chênh12%/cấp, elite×1.6. Gold/loot vẫn catalog cũ; chưa affix/maploot riêng. Kết quả này chỉ một build/seed/bãi, không suy ra balance100cấp hoặc nội dung dài hạn. Cần nhiều phái, độ khó và thiết bị trước nghiệm thu progression.
