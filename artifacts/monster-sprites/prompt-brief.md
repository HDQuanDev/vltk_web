# Prompt cho DeepSeek — nối 16 bộ sprite quái vật vào vltk_web

Bạn đang làm việc trong repo `vltk_web` (TypeScript, pnpm monorepo). Tôi cung cấp gói `tat-ca-16-bo-quai-vat.zip` chứa 16 bộ sprite quái vật mới, mỗi bộ 39 sprite PNG 256×256 nền trong suốt. Nhiệm vụ: nối các sprite này vào hệ thống hiển thị quái vật của game, thay cho (hoặc bổ sung vào) cơ chế vẽ thủ tục hiện tại. KHÔNG thay đổi logic gameplay, chỉ chạm vào tầng hiển thị/tài nguyên.

## 1. Cấu trúc gói

Mỗi thư mục con là một quái, đặt tên đúng bằng `id` của monster def trong `packages/game-content/src/index.ts`:

| Thư mục | Tên quái | Ghi chú |
|---|---|---|
| `bandit` | Sơn tặc | melee, kiếm cong |
| `wolf` | Lang vương | sói xám lớn |
| `boss` | Hắc Phong Trại Chủ | **BOSS** — cần scale hiển thị lớn (xem mục 4) |
| `archer` | Sơn tặc cung thủ | cung |
| `assassin` | Ảnh nhẫn trinh sát | dao găm, mặt nạ |
| `viper` | Thanh xà độc | rắn lục |
| `mist-wolf` | Vân Lang | sói trắng sương |
| `stone-ape` | Thạch Viên | vượn đá |
| `cloud-archer` | Vân Tiễn Thủ | cung thủ áo mây |
| `shadow-blade` | Ảnh Đao Khách | đao, lửa bóng tối |
| `venom-moth` | Độc Nga | ngài độc bay |
| `thunder-crane` | Lôi Hạc | hạc sét |
| `bandit-lord` | Sơn tặc thủ lĩnh | giáp phiến, da hổ |
| `jade-serpent` | Bích Xà | xà vương ngọc bích |
| `storm-drummer` | Lôi Cổ Sư | trống chiến đeo lưng |
| `cloud-beast` | Vân Sơn Yêu Vương | **BOSS** — cần scale hiển thị lớn (xem mục 4) |

Trong mỗi thư mục quái:

```
<id>/sprites/down/<state>.png
<id>/sprites/right/<state>.png
<id>/sprites/up/<state>.png
<id>/preview-tong-hop.png   (ảnh xem trước 13×3, chỉ để người kiểm tra — KHÔNG đưa vào runtime)
```

## 2. Quy ước sprite (giống hệt bộ nhân vật đã nối trước đó)

- Mỗi sprite: PNG 256×256, nền trong suốt, nhân vật neo **giữa–đáy** (bottom-center, chân chạm gần đáy khung).
- 13 trạng thái (đúng tên file, không đổi): `stand`, `walk-1`, `walk-2`, `run-1`, `run-2`, `cast`, `attack`, `hit`, `hurt`, `die`, `use`, `loot`, `sit`.
- 3 hướng vẽ sẵn: `down` = hướng xuống/trước (facing 0), `right` = hướng phải (facing 1), `up` = hướng lên/sau (facing 2).
- **Hướng trái (facing 3) KHÔNG có file riêng: lật ngang (mirror) của `right`** — giống cách bộ nhân vật đang làm.
- Ánh xạ trạng thái game → file: idle/đứng → `stand`; di chuyển thường → lặp `walk-1`/`walk-2`; di chuyển nhanh/đuổi theo → lặp `run-1`/`run-2`; tung kỹ năng → `cast`; đánh thường → `attack`; trúng đòn nhẹ → `hit`; trúng đòn nặng/sắp chết → `hurt`; chết → `die` (giữ khung cuối); tương tác/uống → `use`; nhặt đồ → `loot`; nghỉ/ngồi → `sit`.
- Tốc độ gợi ý: walk lặp ở ~6 fps, run lặp ở ~8 fps; `cast`/`attack`/`hit`/`hurt`/`use`/`loot` chạy 1 lần rồi quay về trạng thái trước; `die` chạy 1 lần và đứng yên ở khung cuối.

## 3. Cách nối

1. Giải nén gói vào thư mục tài nguyên tĩnh mà web app đang phục vụ sprite nhân vật (đi theo đúng cơ chế hiện có của bộ nhân vật — kiểm tra code trước khi chép, đừng tự chế đường dẫn mới).
2. Mở rộng hàm chọn hình cho quái: theo `monsterId` → thư mục `<id>`, theo trạng thái → tên file, theo hướng → thư mục con (`down`/`right`/`up`, trái = lật ngang của phải).
3. **Bắt buộc giữ fallback vẽ thủ tục hiện tại**: nếu thiếu file sprite của một quái/trạng thái nào đó, game phải tự rơi về cách vẽ cũ, không được lỗi, không được để ô trống.
4. Sau khi nối xong chạy `pnpm validate:assets` và sửa mọi lỗi nó báo liên quan đến các file mới.

## 4. Lưu ý riêng cho 2 BOSS

- `boss` (Hắc Phong Trại Chủ) và `cloud-beast` (Vân Sơn Yêu Vương) là boss: hiển thị **scale khoảng 1.4–1.6×** so với quái thường để đúng tầm vóc. Một số tư thế cầm thương dài/vuốt rộng của boss bị giới hạn bề ngang khung 256px nên trông nhỏ hơn thực tế — scale hiển thị là cách bù đúng, đừng phóng to file gốc.
- Quái bay `venom-moth` (Độc Nga): các khung `walk`/`run` là nhịp đập cánh bay, `sit` là đậu gấp cánh — cứ dùng theo đúng ánh xạ ở mục 2, không cần xử lý riêng.

## 5. Kiểm chứng bắt buộc sau khi nối

- Mở game, spawn thử ít nhất: 1 quái thường (ví dụ `bandit`), 1 quái thú (`wolf`), 1 quái bay (`venom-moth`), 2 boss (`boss`, `cloud-beast`).
- Kiểm tra đủ: đứng yên, đi 4 hướng (hướng trái phải là hình lật của hướng phải), chạy, đánh, tung kỹ năng, trúng đòn, chết.
- Chụp ảnh màn hình từng trường hợp để người dùng đối chiếu với `preview-tong-hop.png` của từng quái.

## 6. Khuyết điểm đã biết của từng bộ (đừng "sửa" bằng cách vẽ lại — chỉ ghi nhận)

- `bandit`: 3 ô lưng (walk-2, run-1, run-2) là hình nghiêng thay vì lưng thuần; ô use lưng là hình uống nước hướng trước.
- `wolf`: run-2 hướng phải là bản sao của run-1; loot hướng trước/phải dùng chung hình use; các ô chạy hướng phải trông nhỏ hơn vì thân sói dài bị giới hạn bề ngang khung.
- `boss`: vài tư thế thương dài trông nhỏ do giới hạn bề ngang (đã xử lý bằng scale ở mục 4).
- `archer`: ô use sau lưng hơi thấy một phần mặt (góc 3/4).
- `viper`: run-2 hướng phải là bản sao run-1; run-1/run-2 hướng trước là bản sao của walk-2/walk-1; tư thế attack đọc như phun độc.
- `mist-wolf`: bộ yếu nhất — run-1 hướng phải còn đọc như hai nửa hình; die/loot hướng trước còn dính mảnh nhỏ của hình kề bên; cast hướng trước chủ yếu là vòng sương với bóng sói bên trong.
- `stone-ape`: run-2 sau lưng là hình walk-2 lật ngược; attack sau lưng dùng chung hình cast; loot sau lưng dùng chung hình use.
- `cloud-archer`: attack sau lưng là hình nghiêng; run-2 sau lưng là run-1 lật ngược; vài ô đi/chạy hướng phải còn dính mảnh áo của hình kề bên; cast hướng trước có một mảnh áo lạc ở mép phải.
- `shadow-blade`: ô hurt sau lưng có một đốm lửa tím nhỏ phía trên đầu.
- `venom-moth`: attack sau lưng dùng chung hình cast; mép cánh còn vệt bụi độc nhạt (cố ý giữ — đúng tính chất quái).
- `thunder-crane`: loot hướng trước/phải dùng chung hình use; hurt sau lưng là hình hit lật ngược; cast hướng trước trông nhỏ vì tia sét kéo cao khung hình.
- `bandit-lord`: walk-2 hướng phải là hình walk-1 lật ngược.
- `jade-serpent`: sit sau lưng dùng chung hình cuộn nghỉ của die; run-2 sau lưng là run-1 lật ngược; attack hướng phải dùng hình bổ nhào hướng trước.
- `storm-drummer`: ô run-2 hướng phải còn dính một phần mép vòng sét của ô cast kề bên.
- `cloud-beast`: các ô chạy hướng phải là dáng thú bốn chân (khác dáng đứng hai chân của phần còn lại) và trông nhỏ hơn; hit/hurt hướng phải dùng hình hướng trước; attack sau lưng còn viền mây chữ nhật của khung bão; cast sau lưng dính một mảnh nhỏ của hình kề bên ở mép trái.

## 7. Nguyên tắc

- Không đổi tên file, không đổi cấu trúc thư mục trong gói.
- Không sửa logic gameplay, chỉ tầng hiển thị + đăng ký tài nguyên.
- Nếu cơ chế nối sprite nhân vật hiện tại khác với mô tả ở mục 2–3, đi theo cơ chế hiện tại và báo lại điểm khác biệt cho người dùng.
