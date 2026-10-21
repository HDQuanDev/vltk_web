# Bộ hiển thị 3D (Three.js) — kiến trúc và quyết định

Bộ hiển thị 3D chạy **song song** với bộ Phaser 2D hiện tại, dùng **cùng một
`GameSession`** và cùng dữ liệu game. Bản 2D vẫn là dự phòng chính thức.

- Cấu hình: `ClientPreferences.renderMode` (`"2d"` | `"3d"`, mặc định `"2d"`).
- **Đổi `renderMode` chỉ có hiệu lực ở lần `bootGame` kế tiếp** — không chuyển
  nóng giữa phiên, vì cả hai bộ đều giữ chính canvas và vòng lặp riêng.
- Khi 3D lỗi (WebGL không khả dụng, nạp `three` thất bại), `bootstrap.ts` hạ pref
  về `"2d"`, khởi động Phaser và **gọi `callbacks.onError`** với thông điệp rõ
  ràng. `App.tsx` (ngoài phạm vi sửa) hiển thị màn hình lỗi khi `onError` được
  gọi — xem "Giới hạn" ở cuối.

## Bản đồ file

| File | Vai trò |
| --- | --- |
| `apps/web/src/game/three/ThreeWorld.ts` | Khung bộ hiển thị: WebGLRenderer, camera, vòng lặp rAF, nội suy vị trí, diagnostics, `destroy`. |
| `apps/web/src/game/three/coords.ts` | Hệ toạ độ dùng chung: `worldTo3D`, `pxToUnits`, `spriteAnchorHeight`, `PX_PER_UNIT`. **Không import three** (test chạy được trong Node). |
| `apps/web/src/game/three/camera-constants.ts` | Tham số camera (`CAMERA_DIAGONAL`, `CAMERA_HEIGHT`, `CAMERA_TILT_DEGREES`). |
| `apps/web/src/game/three/input-constants.ts` | Bán kính bắt chọn, nhịp 140 ms, bước 2 đơn vị. |
| `apps/web/src/game/three/element-colors.ts` | **Bản sao** bảng màu nguyên tố từ `animations/atlas.ts` (file gốc import Phaser). |
| `apps/web/src/game/three/Terrain3D.ts` | Địa hình chia chunk; texture lấy từ `terrainCanvas` (dùng chung với bản 2D). |
| `apps/web/src/game/three/Props3D.ts` | Vật thể môi trường: `InstancedMesh` cho mỗi loại prop, billboard trụ. |
| `apps/web/src/game/three/Actors3D.ts` | Nhân vật + quái: atlas 3×13 ô trong `InstancedMesh`, bóng giả, vòng mục tiêu, nhãn DOM. |
| `apps/web/src/game/three/atlas-cache.ts` | Dựng atlas 768×3328 từ 39 file PNG mỗi bộ; có số thế hệ chống rò texture khi đổi map. |
| `apps/web/src/game/three/instanced-material.ts` | Vật liệu instanced có thuộc tính `aCell` / `aFlip` / `aTint` / `aAlpha`. |
| `apps/web/src/game/three/WorldObjects3D.ts` | NPC, cổng dịch chuyển, nút tài nguyên, đồ rơi, telegraph, đạn bay. |
| `apps/web/src/game/three/Effects3D.ts` | Burst theo nguyên tố, chữ bay, marker điểm đến. |
| `apps/web/src/game/three/Weather3D.ts` | Mưa (`THREE.Points`) và sương (mật độ fog + màn mờ). |
| `apps/web/src/game/three/daynight.ts` | Chu kỳ ngày–đêm (dùng lại `world/daynight.ts`), áp ánh sáng + nền + fog. |
| `apps/web/src/game/three/Input3D.ts` | Raycast chuột/chạm, bàn phím, thứ tự ưu tiên bắt chọn. |
| `apps/web/src/game/three/dom-overlay.ts` | Lớp DOM phủ cho nhãn/thanh máu/chữ bay. |

## Hệ toạ độ và camera

- Trục **X của three = x thế giới**, trục **Z = y thế giới**, trục **Y = cao**.
- `PX_PER_UNIT = 64`: 1 đơn vị thế giới = 64 px màn hình (dùng làm đơn vị quy
  đổi thống nhất cho mọi kích thước px của bản 2D).
- **Camera đặt tại `(d, h, d)`** so với chân người chơi, với
  `d = 12` và `h = d·√(2/3) ≈ 9.798`. Camera nằm trên **đường phân giác** của
  mặt phẳng xz nên phép chiếu phối cảnh của three khớp **đúng** phép chiếu iso
  2D: `worldX → (+0.7071, +0.3536)`, `worldZ → (−0.7071, +0.3536)`, tỉ lệ
  dọc/ngang = 0.5 đúng bằng `worldToScreen` 48:24. Góc nghiêng 30° so với mặt
  phẳng ngang (60° so với đường chân trời).
  - **Vì sao không dùng offset `(0, 19, 13.5)` như thiết kế:** camera đó không nằm
    trên đường phân giác → phép chiếu ra tỉ lệ dọc/ngang ≠ 0.5 → texture đất vẽ
    sẵn theo iso **bị méo** (quảng trường thành hình vuông, đường đi lệch).
    Với camera trên đường phân giác, mọi ô đất/đường/nước khớp **tuyệt đối** với
    bản 2D (đã kiểm chứng bằng ảnh `artifacts/renderer-3d/3d/02-village-atlas.png`).
  - Kích thước nhân vật trên màn hình: 1.75 đơn vị / 14.26 đơn vị chiều cao nhìn
    thấy ≈ 12.3% chiều cao màn hình → ~94px (bản 2D: 112px, tức ~84%).
- Nhờ vậy: texture đất vẽ sẵn theo iso **không bị méo** khi đặt lên mặt phẳng
  3D, và hướng nhìn khớp bản 2D — phải màn hình = thế giới `(+x, −y)`, nên
  `Direction8 = 0` (phải) đi sang phải màn hình, `Direction8 = 2` (xuống) đi xuống
  dưới màn hình.

### Công thức neo chân sprite

Origin của Phaser tính từ **trên** khung xuống: `originY = feetY/frameHeight`
(246/256 ≈ 0.9609). Với plane cao `H` (đơn vị 3D) và tâm ở local `y = 0`:

```
điểm ảnh ở pixel y_p  →  local = H/2 − (y_p/frameHeight)·H
muốn đường chân (y_p = feetY) nằm trên mặt đất (world y = 0):
    center = H · (originY − 0.5)
```

Với `H = pxToUnits(112) = 1.75` và `originY = 246/256`:
`center = 0.8066` (≈ 0.4609·H). Kiểm chứng: đỉnh plane ở `0.9609·H` (đúng tỉ lệ
khung), đáy ở `−0.0391·H`, đường chân nằm đúng `y = 0`.
Công thức nằm ở `coords.ts::spriteAnchorHeight`, có test đơn vị.

### Lật texture đất

Canvas chunk của bản 2D được vẽ theo phép chiếu iso 2D (screen Y đi xuống),
trong khi V của three đi lên → gán `v = 1 − (sy − bounds.y)/bounds.height`.
Ánh xạ world → pixel là **hàm affine** (`sx = (x−y)·48`, `sy = (x+y)·24`), nên
gán UV ở 4 đỉnh là chính xác cả trong tam giác (nội suy barycentric tái tạo đúng
hàm affine trên mỗi tam giác).

**Khác biệt với bản 2D (ghi rõ để người duyệt không tưởng là lỗi):** bản 3D dùng
vùng vẽ chính xác 768×384 của chunk (`Terrain3D.drawnBounds`), còn bản 2D dùng
`chunkBounds` rộng 772×388 có 2px viền. Vì vậy màu đất **khớp tuyệt đối** nhưng
 mép chunk 3D không có đường viền đen. `terrainCanvas` nhận thêm tham số `bounds`
tuỳ chọn (mặc định `null` = dùng `chunkBounds`) để bản 2D **không đổi hành vi**.

## Vật thể, actor và nhãn

- **Prop**: mỗi loại là một `InstancedMesh` (plane hai mặc, `alphaTest 0.5`), xoay
  quanh trục Y của chính nó để luôn hướng về camera. Bề rộng =
  `displayWidth/64`, chiều cao = bề rộng × `height/width` (đúng tỉ lệ asset),
  độ lệch dọc = `(1 − pivot.y)·chiều cao` để cạnh dưới chạm đất tại điểm neo.
  Bản 3D dùng z-buffer thật nên **không** có hiệu ứng occlusion fade 0.38 của
  bản 2D — prop che nhân vật là hành vi đúng của 3D.
- **Actor**: khung hình chọn bằng **đúng** `actorSpriteFrame` / `monsterSpriteFrame`
  (không viết lại bảng ánh xạ). Mỗi owner (bộ nhân vật `<phái>/<giới>` hoặc id
  quái) là một `InstancedMesh` với atlas 3 cột × 13 hàng; shader chọn ô theo
  `aCell` và lật ngang theo `aFlip`. `lowHp` dùng đúng `hurtHpRatio`
  (`actorSpriteManifest.hurtHpRatio` = 0.34). Entity chết → alpha 0.55. Nháy sáng
  khi trúng đòn: nhân màu `0xf6e8c9` trong 70 ms (khớp `setTintFill` của bản 2D).
- **Dự phòng**: khi atlas chưa nạp xong hoặc owner không có bộ ảnh, vẽ quad màu
  đặc (player theo màu phái `getSect(...).color`, quái `0x8a8f7a`). Bản 2D có
  atlas thủ tục dự phòng; bản 3D v1 dùng quad màu đặc.
- **Nhãn/thanh máu**: lớp DOM phủ (`pointer-events: none`), tối đa 64 bộ được
  tái sử dụng. Màu và kích thước chép nguyên bản 2D: tên player `#d4e9bc`, quái
  elite `#f2cf77`, quái thường `#ead6ba`, viền `#233229` dày 3, cỡ 12px; thanh máu
  46×4px nền `rgba(21,35,28,.9)`, máu player `#9fae6f` / quái `#b75642`; thanh
  niệm chú nền `rgba(18,41,35,.9)` tiến độ `#c4d4b1` cao 3px; chấm trạng thái tối
  đa 6 (poison `#a6c16c`, burn `#d79564`, shield `#dac58b`, còn lại `#9ac5cf`).
  Viền chữ dùng `text-shadow` 4 hướng thay cho `strokeThickness` (chuẩn web
  không hỗ trợ `text-stroke`).

## Tương tác (giữ nguyên thứ tự ưu tiên và payload của bản 2D)

1. Loot của chính người chơi → `{ type: "pickup", lootId }`
2. Nút tài nguyên → `{ type: "gather", nodeId }`
3. Quái còn sống → chuột trái `{ type: "attack", targetId }`, chuột phải
   `{ type: "skill", skillId: hotbar[0], targetId }`
4. NPC → `{ type: "interact", targetId: npc.id }`
5. Portal → `{ type: "interact", targetId: "portal:" + portal.id }`
6. Mặt đất trống → `{ type: "move", destination }` (chỉ khi **không phải chạm** và
   `innerWidth > 1000`), kèm marker vòng tròn 700 ms.

Bán kính bắt chọn quy đổi từ px 2D sang đơn vị thế giới (chia 68 ≈ px trên 1
đơn vị), làm tròn lên: loot 0.37, node 0.33, quái 0.48, NPC 0.52, portal 0.67.

Bàn phím: W/A/S/D + mũi tên, chu kỳ 140 ms, đích = người chơi + hướng chuẩn hóa
× 2 đơn vị. Hướng phím quy về thế giới theo phép chiếu iso: lên = `(−1,−1)`,
phải = `(+1,−1)`, xuống = `(+1,+1)`, trái = `(−1,+1)`. SPACE: tấn công quái gần
nhất (`distance` của `@kiem-hiep/game-core`), bỏ qua khi người chơi chết, đang
gõ chữ trong input/textarea/select, hoặc `isBlocked()`.

## Ngày/đêm, thời tiết, bóng đổ

- Ngày/đêm: `DirectionalLight` 1.1 → 1.1 − night·0.65; `HemisphereLight` 0.9 →
  0.9 − night·0.45; nền lerp `#364c35` → `#101c2c`; fog màu khớp nền,
  near 30 → 24, far 75 → 45 theo độ tối. Công thức `night` dùng chung
  `world/daynight.ts` với bản 2D.
- Thời tiết: mưa = `THREE.Points`, số hạt theo `qualityBudget().weather`
  (20/45/90) nếu `settings.effects === "high"`, ngược lại 15 (khớp bản 2D);
  `reducedMotion` → tắt mưa. Sương = fog `far` co còn 45 + tối đa 5 màn mờ trôi.
- Bóng thật: pref `shadows3d` (mặc định **false**). Bật thì
  `DirectionalLight.castShadow`, map 1024, camera bóng ortho 30×30 đơn vị bám
  theo người chơi.

## Chẩn đoán

`onDiagnostics` mỗi 1 giây, cùng hình dạng dữ liệu với bản 2D:

| Trường | Ý nghĩa bản 3D |
| --- | --- |
| `fps` | Đo từ khoảng cách giữa hai frame rAF (không phải thời gian vẽ). |
| `renderMs` | Thời gian cập nhật scene + `renderer.render`. |
| `objects` | Số phần tử DOM nhãn + số actor đang hiển thị. |
| `textures` | `renderer.info.memory.textures`. |
| `activeChunks` / `cachedChunks` | Chunk đang dùng / chunk đã cache. |
| `terrainBytes` | Tổng `w·h·4` của canvas chunk. |
| `renderer` | `"ThreeJS"`. |
| `activeEffects` | Số burst đang chạy trong `Effects3D`. |

## Rút gọn so với thiết kế

| Mục | Thực tế v1 | Lý do |
| --- | --- | --- |
| Dự phòng atlas | Quad màu đặc, không có atlas thủ tục | Bản 2D dùng atlas thủ tục 8 hướng; dựng lại cho 3D tốn công, v1 ưu tiên đường chân/khung hình đúng. |
| Vệt đuôi đạn bay | Chỉ đầu đạn (sphere theo nguyên tố) | `EnvironmentRenderer` vẽ vệt bằng `Graphics`; bản 3D v1 bỏ vệt để giữ draw call thấp. |
| Vòng đất lan của boss (quake/storm) | Chưa có | `bossMechanicEvent` chỉ rung camera ở bản 2D; bản 3D v1 chưa vẽ vòng đất. |
| Đốm sáng đèn lồng ban đêm | Chưa có | Bản 2D dùng texture glow + blend ADD; bản 3D v1 dùng bóng giả cho actor, chưa có đốm sáng prop. |
| Tiền cảnh parallax | Chưa có | Chỉ có ở bản 2D (`ForegroundRenderer`). |
| Camera nhìn trước / zoom chuột | Chưa có | Camera cố định góc trong v1. |
| Cao độ địa hình | Phẳng (mọi chunk y = 0) | Như thiết kế: cao độ trang trí để bước sau. |
| Nút tài nguyên | Marker hình học đơn giản (hình cầu / hình nón / trụ) | Như thiết kế: "mức tối thiểu chấp nhận được". |

## Giới hạn

- `onError` khi 3D lỗi khiến `App.tsx` hiển thị màn hình lỗi (có nút "Thử lại"),
  dù bản 2D đã khởi động được. `App.tsx` nằm ngoài phạm vi sửa của phiên này;
  cần một thay đổi nhỏ ở `App.tsx` (giữ `error` ở mức cảnh báo thay vì chặn game)
  mới cho phép chơi liên tục. Pref `renderMode` **đã** tự hạ về `"2d"` nên lần
  tải lại sẽ vào thẳng bản 2D.
- **Loot rơi đất chưa kiểm chứng được bằng ảnh trong bản 3D**: script thử nghiệm
  đặt loot thủ công vào save rồi import — `snapshot.groundLoot` bị mất **ngay ở
  đường import của `App.tsx`**. Đã kiểm tra: chế độ **2D cũng không thấy** loot đó
  (nên không phải lỗi 3D); `validateSave` → `GameWorld` → `projectView` → session
  đều giữ loot (có test Node). Bản 3D đọc `snapshot.groundLoot` y hệt bản 2D.
- Số đo hiệu năng chạy trên headless Chromium + SwiftShader (phần mềm), **không
  phải GPU thật**; xem `artifacts/renderer-3d/*/report.json`.
- Chưa đo trên thiết bị thật.
