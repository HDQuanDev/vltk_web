# UI/UX gameplay

Canvas vẫn phủ100dvh; khác biệt v0.3 là bỏ hai thanh website đặc khỏi gameplay. Top-right có menu/settings/save/minimap-toggle nhỏ; HP/MP/avatar compact top-left, quest thu gọn phía trái, minimap góc phải, PC hotbar nổi dưới giữa, touch controls hai góc dưới. Currency trong menu; save notice tựẩn sau2.2giây, manualsave luôn có icon.

Safearea dùngenv, dynamicviewport, không giả loại bỏ thanhđịachỉOS. Mobile có4chiêu với vòng cooldown và lockedstate, joystickfixed/floating, ownershippointer, cancel/lostcapture. Skill/attack nhận pointerdown để ngón thứhai dùng được khi giữ joystick; keyboardclick vẫn hỗ trợ. TestCDP dùng2touchIDs và xác nhận MP/di chuyển/path dừng.

Menu cuộn mở được nhân vật/túi/skills/quest/map/côngxưởng/kho/nghề/settings. Modal focus/input không kích phím di chuyển của scene. Quest navigation theo nội dung, không cứng mộtNPC; đóng panel trước khi gửi command tránh hội thoại synchronous bị đóng đè. Bindskill đổi chỗ nếuchiêuđãởôkhác.

Còn thiếu contextual interact, mobilezoom/reset/focustarget buttons, rebind/customcontrol layout/presets/expandskillbar và mount controls cólogic. Chưa đánh dấu toàn bộUI production-ready; icon/art còn cần polish và realdevice touch sizing/notch/accessibility review.

## Visual overhaul 19/10/2026

Theme dùng token ink/wood/bronze/jade/rarity trong `visual-system.css`. `GameUI` dùng chung modal focus trap/restore, ItemSlot, tooltip bounded theo viewport, so sánh chỉ số từ itemBonuses, resource bars, portrait và status strip. Inventory 8 cột với row size rõ ràng, scroll riêng grid/detail, utility/currency không trôi ra ngoài phone landscape. Equipment chỉ có 5 slot thật quanh preview.

Entry có backdrop và portrait gốc, nút chuyển sang preview procedural 8 hướng; không coi portrait là sprite. Shop có buy/sell, filter và wallet; giao dịch gửi command thật. Kho nhìn đồng thời túi/kho; crafting có nguyên liệu đủ/thiếu và output icon; gem có stat preview. Forge nhận enhanceLog mới sau click, chỉ gửi enhance một lần; close/reload không replay, skip chỉ bỏ animation; reduced motion theo client preference và OS. Stock/restock/buyback/quantity/gem upgrade/refinement chưa được core hỗ trợ đầy đủ nên không tạo điều khiển giả.

HUD có target health, localized buff/debuff + thời gian, cảnh báo MP, EXP mobile và thu gọn thông tin phụ; nút utility/potion chính trên mobile44px. Safe areas vẫn dùng env. Desktop/mobile screenshot và test ghi tại `docs/visual/AFTER_REVIEW.md`; real-device và accessibility sâu còn mở.
