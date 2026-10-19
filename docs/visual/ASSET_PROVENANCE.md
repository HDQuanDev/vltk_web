# Art & audio provenance — 19/10/2026

Các ảnh dưới đây tạo bằng **built-in ImageGen**, không dùng CLI/API key và không lấy asset game thương mại. Source giữ nguyên trong `assets/source/interface/`. Tất cả art mới có trạng thái **review-required**, chưa gắn nhãn production-ready. Pipeline crop/resize/pad/pack bằng canvas Chromium, không vẽ lại hay giả animation từ concept. Chạy `node scripts/build-interface-art.mjs`; metadata crop ở `atlas-cells.json`, semantic mapping tại `apps/web/src/ui/interface-art.ts`.

| Stable family         | Source                        | Runtime                  | Xử lý                                                                                     |
| --------------------- | ----------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| ui:icons (24 ban đầu) | icons-v1.png, 1254²           | 24 icon 128²             | Review cell boundaries từng hàng; giữ tỷ lệ trong canvas 128, padding 2px                 |
| ui:icons (12 bổ sung) | icons-extra-v1.png, 1448×1086 | 12 icon 128²             | Bổ sung quạt/giáp/nón/quan/tơ/da/quặng/ngọc/bảo kiếm/đan, không dùng kiếm cho nguyên liệu |
| portrait:*            | portraits-v1.png, 1536×1024   | 6 portrait 256²          | Nam/nữ/elder/merchant/smith/teacher; **framed portraits**, không phải sprite alpha cutout |
| ui:lobby              | lobby-v1.png                  | lobby-v1.png, 1920×1080  | Resize/crop cover giữ tỷ lệ; chỉ dùng entry screen, không giả world tương tác             |
| ui:icons atlas        | 36 icon chuẩn hóa             | icons-atlas-v1.png, 768² | 6×6, frame128; dùng cho ground loot WebGL                                                 |

PNG chân dung có nền vẽ. Dù prompt yêu cầu transparent, đầu ra được dùng trong khung/crop, không tuyên bố là asset cắt nền đạt spec. Icon cố ý có nền charcoal tối, không phải cutout. Thế giới vẫn dùng actor procedural; portrait không thay thế bộ animation 8 hướng/11 state.

Prompt set đã dùng (nguyên văn nội dung yêu cầu tạo ảnh):

## icons-v1.png

Use case: stylized-concept. Asset type: original icon atlas for a Chinese wuxia isometric RPG. Create exactly a 6 column by 4 row contact sheet, square 1536x1536, each of the 24 cells equal sized, no gaps. Every cell has its own dark near-black warm charcoal background, no outer border, no text, no numbers. Beautiful hand painted game inventory art, clear silhouette, detailed metal highlights, restrained jade gold and crimson palette, each object centered with 18% padding, readable at 48px. Row1 left to right: elegant straight jian sword; curved dao saber; long spear with red tassel; martial wooden staff; three throwing daggers; blue embroidered silk robe. Row2: steel Chinese helmet; leather martial boots; jade and gold ring; jade necklace pendant; red talisman paper; red healing potion ornate bottle. Row3: blue mana potion ornate bottle; dark iron ore; medicinal green herb sprig; bundled wood logs; violet cut gem; amber protection stone. Row4: glowing sword slash arc; blue lightning bolt; turquoise wind spiral; white pink lotus blossom; golden protective shield; brown leather martial manual scroll. No copyrighted assets, no logos, no characters, no emoji, no modern vector icons. Keep every object fully inside its own cell with no crossing the boundaries. Full bleed uniform atlas layout.

## lobby-v1.png

Use case: stylized-concept. Asset type: original widescreen title screen background illustration for classic Chinese wuxia RPG. Cinematic panoramic landscape, painterly detailed ancient Chinese mountain monastery, a graceful stone terrace in foreground center with carved bronze sword emblem, turquoise misty mountains and river winding into distance, pine branches frame the top, pagoda rooftops lower left, tiny warm lanterns. Muted jade teal shadows, ivory mist and warm aged gold sunlight, restrained rich texture of traditional ink wash mixed with highly polished hand painted fantasy game art. Leave center foreground terrace open for an actual character preview to be placed by game engine. Side thirds dark enough for readable text panels. Beautiful layered depth and majestic quiet mood. Landscape 16:9. No people, no interface, no icons, no text, no lettering, no logos, no watermark. Original assets only, no copied game art.

## portraits-v1.png

Use case: stylized-concept. Asset type: original 6-portrait sprite atlas for a Chinese wuxia RPG. Exactly 3 columns by 2 rows of equal-sized cells, 1536x1024 landscape. Each cell contains one head-and-shoulders bust, front three-quarter view, shoulders fully visible, neutral poised expression. Transparent background in every cell, no frames, absolutely no text. Consistent beautiful hand-painted semi-realistic classic martial arts fantasy game art, jewel-like small-scale readability, muted jade silk, warm bronze trim, graceful face details. Row1 left to right: young male swordsman with long dark hair half tied in high topknot wearing blue jade embroidered robes; young female swordswoman with distinctive long black hair, gold hairpins and pale jade robes; elderly village elder with silver hair, long white beard and dark teal scholar robes. Row2 left to right: friendly female herbalist with tied hair, subtle red hair ornament and sage green clothing; strong middle-aged blacksmith with short beard, dark hair in bun, brown leather apron; wise silver-haired female mountain teacher in ivory blue robes. Keep each bust isolated and centered in its cell with generous 12% empty transparent margins. All heads at consistent scale. No weapons or hands crossing boundaries. No copyrighted characters, no watermarks, no letters, no UI.

## icons-extra-v1.png

Use case: stylized-concept. Asset type: supplemental inventory icon atlas for a Chinese wuxia RPG. Exactly 4 columns by 3 rows, 1536x1152 landscape, evenly spaced equal square cells, no gaps, each object isolated and fully contained with 15% margin. Warm near-black charcoal backgrounds uniform in all cells, no frames, no text. Beautiful detailed hand-painted fantasy game item illustrations, bronze gold and jade palette, strong highlights and silhouettes readable at 48px, consistent art. Row1 left to right: open jade folding martial fan; layered steel scale armor cuirass with cloth; green bamboo woven traveling hat; delicate gold jade scholar crown. Row2 left to right: pale turquoise skein of silk thread; rolled brown wolf hide leather; raw uncut jade ore rock with crystals; dark storm iron ore with faint blue veins. Row3 left to right: bright emerald cut jade gem; golden amber cut gemstone; dark elegant dragon sword with blue silver blade and cloud ornament; red crimson healing elixir in a narrow jade bottle. No characters, no letters, no numbers, no copyrighted game assets, no watermark. Perfect 4x3 contact sheet of 12 independent items.

## Audio

`node scripts/build-presentation-audio.mjs` tạo 5 WAV PCM mono22.05kHz: forge-success1.2s, forge-failure1.1s, craft0.65s, coin0.45s, equip0.35s. Original physical-model synthesis: inharmonic metal partials, transient noise, decay and chord/tail. Manifest lưu ở `assets/source/interface/audio-manifest.json`. Các mẫu này là **development audio**, không phải thu âm/sound design production, chưa có nghe nghiệm thu trên thiết bị thật.

AudioManager preload sau gesture, decode không phát muộn event cũ, cùng voice cap16/mixer/dispose; success/failure chọn từ event authority `success`. WAV có PWA precache; offline regression vẫn chạy qua luồng thật. Nhạc vùng/ambient/voice/weapon samples production vẫn thiếu.

## Gate art attempt — không có output

Sau lượt QA chốt, thử tạo một cổng paifang isometric gốc với built-in ImageGen; công cụ trả `HTTP403 Forbidden` trước khi tạo ảnh. Không có asset cổng mới, không tích hợp hay tính thêm production-ready. Cổng procedural cũ vẫn là development art. CLI fallback có thể dùng `OPENAI_API_KEY`, nhưng chưa được yêu cầu sử dụng. Theo [imagegen SKILL.md](/Users/huaducquan/.codex/skills/.system/imagegen/SKILL.md): “Proceed only if the user explicitly asks for that fallback.”

Spec để tiếp tục: single1024² transparent prop, orthographic2:1, weathered pale-stone pillars + dark-wood beams + gray-jade tiled roof,2redlanterns, OPEN passage/no door/no wall/no lettering/no ground plane,10%padding, feet contact at bottom; giữ collider/đường đi hiện có, kiểm tra alpha thật/pivot/depth/occlusion trước tích hợp.
