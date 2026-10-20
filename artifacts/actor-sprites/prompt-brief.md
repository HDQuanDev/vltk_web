# Prompt cho DeepSeek — Nối 20 bộ sprite nhân vật 10 phái × 2 giới tính vào vltk_web

Bạn là lập trình viên của dự án vltk_web (repo này). Tôi có 20 bộ sprite nhân vật mới (cộng 1 bộ mẫu trung lập) do AI vẽ, mỗi bộ 39 sprite PNG nền trong suốt, kích thước 256×256, neo (anchor) tại điểm giữa–đáy khung hình (chân nhân vật chạm y=246). Nhiệm vụ: tích hợp các sprite này vào hệ thống render nhân vật của game. KHÔNG thay đổi logic gameplay, chỉ thay/điểm thêm lớp hiển thị sprite, và LUÔN giữ fallback vẽ procedural cũ khi thiếu file.

## 1. Dữ liệu đầu vào

Giải nén gói tổng vào một thư mục tạm, cấu trúc:

```
<sect>-<gender>/sprites/{down,right,up}/<state>.png
<sect>-<gender>/preview-tong-hop.png
```

Ánh xạ thư mục → phái trong code (`packages/game-content/src/sects.ts`):

| Thư mục | Phái (id) | Giới tính |
|---|---|---|
| vodang-nam / vodang-nu | wudang | male / female |
| thieulam-nam / thieulam-nu | shaolin | male / female |
| thienvuong-nam / thienvuong-nu | tianwang | male / female |
| duongmon-nam / duongmon-nu | tangmen | male / female |
| ngudoc-nam / ngudoc-nu | wudu | male / female |
| ngami-nam / ngami-nu | emei | male / female |
| cuiyan-nam / cuiyan-nu | cuiyan | male / female |
| caibang-nam / caibang-nu | beggar | male / female |
| thiennhan-nam / thiennhan-nu | tianren | male / female |
| conlon-nam / conlon-nu | kunlun | male / female |
| trung-lap-nam | (mẫu trung lập, không thuộc phái) | male |

## 2. Đặt file

Copy sprite vào: `apps/web/public/assets/actors/<sect-id>/<nam|nu>/` — đổi tên thư mục `nam`→ giữ nguyên quy ước của dự án nếu đã có (kiểm tra trước khi copy; nếu dự án dùng `male/female` thì dùng `male/female`). Giữ nguyên cấu trúc 3 thư mục con `down/`, `right/`, `up/` và tên file trạng thái.

## 3. Ánh xạ hướng (facing)

Game có 4 hướng 0..3. Sprite chỉ vẽ 3 hướng:

- facing 0 (xuống / mặt trước) → thư mục `down/`
- facing 1 (phải) → thư mục `right/`
- facing 2 (lên / lưng) → thư mục `up/`
- facing 3 (trái) → dùng thư mục `right/` nhưng lật ngang (flip X / scaleX = -1)

## 4. Trạng thái (states) — khớp CANONICAL_FRAMES hiện có

13 file mỗi hướng: `stand, walk-1, walk-2, run-1, run-2, cast, attack, hit, hurt, die, use, loot, sit`.

- Nhịp animation nếu dự án chưa có sẵn: walk 6 fps, run 8 fps, lặp xen kẽ frame 1–2; các trạng thái còn lại 1 frame tĩnh.
- Khi nhân vật có cả phái + giới tính: chọn bộ theo (sect, gender). Nếu thiếu bộ của một phái/giới tính nào đó, fallback: bộ trung lập → vẽ procedural cũ. Nếu thiếu từng file sprite lẻ: fallback procedural cho riêng trạng thái đó, không để ô trống/lỗi ảnh.

## 5. Yêu cầu kỹ thuật

1. Trước khi sửa, đọc code render nhân vật hiện tại (actor/visuals) và hệ thống `CANONICAL_FRAMES` để bám đúng interface sẵn có; không tự chế interface mới nếu đã có.
2. Nạp ảnh qua đường dẫn tĩnh `/assets/actors/...` như các asset interface hiện tại; preload theo phái đang dùng để tránh nháy hình.
3. Vẽ sprite với anchor giữa–đáy: điểm neo của actor trên map = tâm đáy khung 256×256 (chân ở y=246/256).
4. Sau khi nối: chạy build + `pnpm validate:assets` (nếu có) và kiểm tra trực quan ít nhất 2 nhân vật khác phái/giới trong game thật; báo lại kết quả kèm ảnh chụp nếu được.
5. Ghi chú chất lượng đã biết (không cần sửa, chỉ để nắm): một vài sprite hàng `up` là hình nghiêng/mặt trước do sheet gốc vẽ trượt (đã ghi rõ trong báo cáo bàn giao); khung `up/run-2` của thiennhan-nu dùng lại khung run-1; phong cách 2 bộ ngami-nu và caibang-nu hơi trẻ hơn các bộ còn lại. Mọi bộ đều đủ 39/39 file.

## 6. Không làm

- Không đổi tên state/facing trong code game cho khớp file — file đã đặt theo CANONICAL_FRAMES.
- Không xóa hệ thống vẽ procedural; nó là fallback bắt buộc.
- Không commit/push khi chưa được chủ repo duyệt.
