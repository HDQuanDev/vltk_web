# Item/economy trong đợt overhaul

Giữ EconomyTransactions và pipeline cường hóa/ngọc/craft/kho đang hoạt động. Cường hóa tới+5 luôn thành công; +6..+14 dùng tỉ lệ giảm dần (0.9→0.25) và thất bại mất1cấp từ+8, 2cấp từ+13; trần+15. Đá Hộ Mệnh mua ở thợ rèn tiêu hao mỗi lần đập có bật bảo vệ và giữ cấp khi thất bại (phụ phí120bạc). Giá50+level×35bạc,1+levelquặng, statnền+15% mỗi cấp. Roll dùng RNG authority đã seed nên replay/save-load xác định; 20dòng gần nhất lưu trong `enhanceLog`. Socket1ô,ôthứhai ở+3; khảm40bạc,tháo100bạc trả ngọc. Vẫn không phá hủy đồ; chỉ mất cấp.

V0.3 thêm cửa sổ phản hồi10ticks sau nâng thành công: doubletap với sequencekhác không tiêu tài nguyên lần hai; cooldown được lưu, reload không lách được. Button tạm disabled cùng deadlinecore. Thao tác hợp lệ sau deadline vẫn nâng tiếp; lệnh bị từ chối (thiếu bạc/quặng/đá, sai NPC, đã đạt trần) không đặt cooldown và không commit tài nguyên. Lần đập hợp lệ nhưng roll thất bại vẫn trừ phí và áp hậu quả mất cấp như trên.

Craft7recipes/7nghề và kho64 giữ metadata, nguyên liệu khóa/capacity/owner được kiểm tra. UI NPC mới không giả làm shop/côngxưởng khi NPC chỉ dẫn đường. Quest thu thập vùng có maprestriction thật. Các chức năng shopquantity/buyback/NPCmarket/refinement/affix/set/phụ kiện và6rarity vẫn chưa đủ; không gán tên overhaul cho phần chỉ có UI.

Các thay đổi item mới sau này phải thêm definitions/schema, atomic draft/commit, idempotency, migration/archive và UIpreview; serverauthority dùng cùngrules. Offlineimport không được tin làm dữ liệu economy online.
