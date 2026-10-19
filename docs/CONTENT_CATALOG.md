# Catalog nội dung hiện có

Sinh bằng `pnpm report:content` từ source; bản 0.5.0. Các mục tiêu v1.0 giữ ở MASTER_GAME_DESIGN.md và ROADMAP.md.

| Loại | Hiện có |
|---|---:|
| sects | 10 |
| branches | 20 |
| skills | 144 |
| maps | 6 |
| spawnZones | 26 |
| monsters | 16 |
| bosses | 2 |
| items | 45 |
| quests | 28 |
| dungeons | 0 |
| professions | 7 |
| recipes | 11 |
| resources | 22 |
| npcs | 14 |
| maxLevel | 100 |

## Môn phái và nhánh

### Võ Đang

Kiếm khí xuyên tuyến và điều hòa chân khí. Vai trò: Kiếm khí · nội công. Hệ: earth; thuộc tính ưu tiên: energy; vũ khí hình ảnh: Kiếm.

**Kiếm tông** — Phản kích, kiếm trận và cận chiến linh hoạt.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Thiên Địa Vô Cực | line | 1 | 16 | 3.25 | Sát thương trực tiếp |
| Tam Hoàn Sáo Nguyệt | aoe | 1 | 28 | 6.5 | Sát thương trực tiếp |
| Thanh Tâm Quyết | heal | 1 | 22 | 10 | Sát thương trực tiếp |
| Thái Cực Hộ Thể | buff | 2 | 20 | 12 | Sát thương trực tiếp |
| Thất Tinh Kiếm Trận | cone | 4 | 22 | 5.25 | slow |
| Kiếm Tâm | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Thái Cực Nội Kinh | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Khí tông** — Vận khí chậm, xuyên nhiều địch và phong tỏa nội lực.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Lưỡng Nghi Kiếm Khí | projectile | 1 | 13 | 2.25 | Sát thương trực tiếp |
| Chân Võ Phong Ấn | projectile | 1 | 19 | 5 | silence |
| Thái Thanh Cương Khí | buff | 1 | 20 | 10 | shield, defenseBuff |
| Vạn Kiếm Quy Tông | aoe | 8 | 38 | 12 | armorBreak |
| Thái Ất Kiếm Cương | projectile | 4 | 22 | 5.25 | armorBreak |
| Tiên Thiên Công | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Thanh Tĩnh Kinh | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Thiếu Lâm

Dùng khiên và choáng tạo khoảng trống giữa đám đông. Vai trò: Đỡ đòn · phản công. Hệ: metal; thuộc tính ưu tiên: vitality; vũ khí hình ảnh: Côn.

**Côn pháp** — Quét hình quạt, đánh lui và hộ thể.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Hoành Tảo Thiên Quân | cone | 1 | 10 | 1.9 | slow |
| Phục Ma Côn | melee | 1 | 15 | 4.25 | stun |
| Kim Chung Tráo | buff | 1 | 22 | 10.5 | shield, defenseBuff |
| Sư Tử Hống | aoe | 8 | 32 | 12 | stun |
| Liên Hoàn Côn | cone | 4 | 22 | 5.25 | armorBreak |
| Kim Cương Bất Hoại | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| La Hán Tâm Kinh | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Quyền pháp** — Áp sát, hút sinh lực và bộc phá.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Đại Lực Kim Cương Chưởng | melee | 1 | 9 | 1.9 | Sát thương trực tiếp |
| La Hán Phục Hổ | dash | 1 | 17 | 5 | stun |
| Dịch Cân Dưỡng Khí | heal | 1 | 22 | 9 | regen |
| Như Lai Thiên Diệp | cone | 8 | 36 | 12 | Sát thương trực tiếp |
| Kim Cương Phá | melee | 4 | 22 | 5.25 | stun |
| Dịch Cân Kinh | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Thiền Tâm | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Thiên Vương

Thương dài phá giáp, tích thế lao vào tuyến địch. Vai trò: Tuyến đầu · phá giáp. Hệ: metal; thuộc tính ưu tiên: strength; vũ khí hình ảnh: Thương.

**Thương pháp** — Đâm xuyên và phá giáp theo đường thẳng.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Truy Tinh Thương | projectile | 1 | 9 | 1.8 | Sát thương trực tiếp |
| Phá Giáp Thức | melee | 1 | 14 | 3.5 | armorBreak |
| Bất Động Như Sơn | buff | 1 | 20 | 10 | defenseBuff, shield, slow |
| Bá Vương Xuyên Tâm | dash | 8 | 34 | 11.5 | stun |
| Du Long Thương | cone | 4 | 22 | 5.25 | slow |
| Chiến Ý | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Thiết Tâm | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Chùy pháp** — Cú đánh chậm gây choáng và chấn địa.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Kim Qua Chùy | melee | 1 | 12 | 2.75 | stun |
| Địa Chấn Sơn Hà | aoe | 1 | 22 | 4.75 | slow |
| Thiết Bích Thành | buff | 1 | 24 | 11 | shield, invulnerable |
| Thiên Vương Trấn Nhạc | aoe | 8 | 40 | 13 | stun, armorBreak |
| Địa Liệt Chùy | cone | 4 | 22 | 5.25 | armorBreak |
| Trấn Sơn Công | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Trọng Chùy Tâm Pháp | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Đường Môn

Đạn bay thực, xuyên địch và độc cộng dồn. Vai trò: Tầm xa · độc dược. Hệ: wood; thuộc tính ưu tiên: dexterity; vũ khí hình ảnh: Ám khí.

**Phi tiêu** — Ám khí nhanh, xuyên nhiều mục tiêu.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Truy Tâm Tiêu | projectile | 1 | 7 | 1.2 | poison |
| Tán Hoa Tiêu | cone | 1 | 18 | 3.75 | armorBreak |
| Tĩnh Tâm Định Ý | buff | 1 | 16 | 8.5 | attackBuff, haste |
| Bạo Vũ Lê Hoa | projectile | 8 | 36 | 12 | poison |
| Ảnh Tiêu Tam Liên | projectile | 4 | 22 | 5.25 | poison |
| Bách Bộ Xuyên Dương | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Ám Khí Tâm Kinh | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Cơ quan** — Làm chậm, khóa chân và khu vực sát thương.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Thiên La Địa Võng | projectile | 1 | 15 | 4 | freeze |
| Độc Vụ Tán | aoe | 1 | 22 | 5 | poison, slow |
| Yên Vụ Hộ Thân | buff | 1 | 18 | 9 | shield, haste |
| Thiên Cơ Độc Trận | aoe | 8 | 38 | 12.5 | poison, silence |
| Cơ Quan Tỏa Hồn | cone | 4 | 22 | 5.25 | freeze |
| Thiên Cơ Bí Lục | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Yên Ảnh Bộ | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Ngũ Độc

Độc cộng dồn và hút máu, cần thời gian để phát huy. Vai trò: Độc theo thời gian · suy yếu. Hệ: wood; thuộc tính ưu tiên: energy; vũ khí hình ảnh: Độc trượng.

**Độc kinh** — Độc tầm xa, xói giáp và lan diện rộng.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Vạn Độc Xuyên Tâm | projectile | 1 | 9 | 1.5 | poison |
| Hủ Cốt Độc | projectile | 1 | 15 | 3.75 | armorBreak, poison |
| Ngũ Độc Quy Nguyên | heal | 1 | 20 | 8.5 | regen, shield |
| Bách Độc Triều Tông | aoe | 8 | 36 | 12 | poison, slow |
| Thanh Xà Phệ Tâm | projectile | 4 | 22 | 5.25 | poison |
| Vạn Độc Tâm Kinh | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Bách Độc Bất Xâm | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Chú thuật** — Câm lặng, suy yếu và hút sinh lực.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Đoạt Hồn Chú | projectile | 1 | 13 | 3 | silence |
| Hấp Tinh Độc Chưởng | line | 1 | 16 | 3.25 | poison |
| Huyền Cổ Hộ Thân | buff | 1 | 23 | 10 | defenseBuff, vampirism |
| Thiên Ma Thực Cốt | cone | 8 | 38 | 12 | armorBreak, silence |
| Tàn Hồn Chỉ | line | 4 | 22 | 5.25 | armorBreak, silence |
| Thực Hồn Kinh | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Huyền Cổ Nội Công | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Nga Mi

Hồi phục theo thời gian và băng thuật làm chậm giao tranh. Vai trò: Trị liệu · khống chế. Hệ: water; thuộc tính ưu tiên: energy; vũ khí hình ảnh: Kiếm.

**Từ tâm** — Hồi sinh lực, lá chắn và kiếm băng.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Nga Mi Hàn Kiếm | projectile | 1 | 10 | 2 | slow |
| Phật Quang Phổ Chiếu | heal | 1 | 22 | 7.5 | regen |
| Liên Hoa Hộ Thể | buff | 1 | 18 | 9 | shield, regen |
| Cửu Âm Bạch Cốt | aoe | 8 | 34 | 11.5 | freeze |
| Liên Hoa Phi Kiếm | projectile | 4 | 22 | 5.25 | slow |
| Từ Hàng Tâm Kinh | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Thanh Liên Nội Công | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Phật kiếm** — Áp sát, băng phong và phục hồi chủ động.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Tứ Tượng Kiếm | cone | 1 | 11 | 2 | slow |
| Băng Tâm Kiếm Ảnh | projectile | 1 | 18 | 4.25 | freeze |
| Thanh Liên Tâm Pháp | heal | 1 | 24 | 9.25 | defenseBuff |
| Phật Tâm Kiếm Vũ | aoe | 8 | 36 | 12 | slow |
| Bạch Nguyệt Trảm | cone | 4 | 22 | 5.25 | freeze |
| Tuệ Kiếm Tâm | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Phật Tâm Kinh | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Thúy Yên

Băng chậm rồi dịch chuyển tạo vị trí đánh mới. Vai trò: Băng · cơ động. Hệ: water; thuộc tính ưu tiên: dexterity; vũ khí hình ảnh: Song đao.

**Đao vũ** — Lướt qua mục tiêu và đóng băng cận chiến.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Phi Yến Lăng Ba | dash | 1 | 13 | 3.25 | slow |
| Băng Tung Vô Ảnh | melee | 1 | 16 | 3.75 | freeze |
| Thủy Ảnh Hộ Thân | buff | 1 | 18 | 9 | invulnerable, haste |
| Nguyệt Ảnh Liên Hoàn | cone | 8 | 33 | 11.5 | freeze |
| Tuyết Vũ Song Phi | cone | 4 | 22 | 5.25 | slow |
| Lăng Ba Vi Bộ | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Song Nhẫn Tâm Pháp | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Hàn khí** — Băng tuyến xa và vùng bão tuyết.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Hàn Băng Đạn | projectile | 1 | 10 | 2.1 | slow |
| Tuyết Lạc Vô Thanh | cone | 1 | 20 | 4.5 | freeze |
| Băng Liên Kết Giới | buff | 1 | 22 | 9.75 | shield, defenseBuff |
| Thiên Sơn Tuyết Táng | aoe | 8 | 39 | 12.5 | freeze, slow |
| Băng Lăng Xuyên | projectile | 4 | 22 | 5.25 | freeze |
| Hàn Ngọc Tâm Kinh | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Băng Tâm Quyết | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Cái Bang

Cận chiến diện rộng và hỏa chưởng thiêu đốt. Vai trò: Thiêu đốt · cận chiến. Hệ: fire; thuộc tính ưu tiên: strength; vũ khí hình ảnh: Bổng.

**Đả cẩu bổng** — Quét bổng, trói chân và hồi sức.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Bổng Đả Song Khuyển | cone | 1 | 9 | 1.75 | Sát thương trực tiếp |
| Thiên Hạ Vô Cẩu | melee | 1 | 14 | 3.5 | freeze |
| Túy Tiên Tửu | heal | 1 | 18 | 9 | haste |
| Bổng Định Càn Khôn | aoe | 8 | 34 | 11.5 | armorBreak |
| Đả Cẩu Quải | melee | 4 | 22 | 5.25 | slow |
| Tiêu Dao Tâm Pháp | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Bổng Ý | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Giáng long chưởng** — Hỏa chưởng xuyên tuyến, đốt và hút máu.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Kháng Long Hữu Hối | projectile | 1 | 12 | 2.25 | burn |
| Phi Long Tại Thiên | cone | 1 | 20 | 4.25 | burn, slow |
| Long Tức Dưỡng Sinh | buff | 1 | 20 | 9.5 | regen, attackBuff |
| Giáng Long Thập Bát | projectile | 8 | 40 | 12.5 | burn |
| Thần Long Bãi Vĩ | cone | 4 | 22 | 5.25 | burn |
| Long Hỏa Tâm Kinh | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Giáng Long Nội Công | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Thiên Nhẫn

Lao vào, câm lặng và hồi phục bằng sát thương. Vai trò: Ám sát · hút sinh lực. Hệ: fire; thuộc tính ưu tiên: dexterity; vũ khí hình ảnh: Đao.

**Ma nhẫn** — Áp sát và bộc phá mục tiêu bị khống chế.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Ảnh Sát Đột Kích | dash | 1 | 12 | 3.5 | Sát thương trực tiếp |
| Đoạn Mạch Nhẫn | melee | 1 | 14 | 3.5 | silence |
| Ma Ảnh Độn | buff | 1 | 22 | 10 | invulnerable, haste |
| Thiên Ma Giải Thể | melee | 8 | 36 | 12 | Sát thương trực tiếp |
| Huyết Ảnh Đao | melee | 4 | 22 | 5.25 | armorBreak |
| Sát Tâm | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Ma Ảnh Tâm Pháp | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Hỏa liên** — Đốt theo thời gian và khóa vùng.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Hỏa Liên Đạn | projectile | 1 | 10 | 2 | burn |
| Nghiệp Hỏa Phần Tâm | aoe | 1 | 19 | 4.5 | burn, silence |
| Huyết Ma Tâm Pháp | buff | 1 | 20 | 9.5 | vampirism, attackBuff |
| Thiên Địa Phần Diệt | aoe | 8 | 40 | 12.5 | burn |
| Hồng Liên Xuyên Tâm | projectile | 4 | 22 | 5.25 | burn |
| Huyết Tâm Kinh | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Nghiệp Hỏa Nội Công | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

### Côn Lôn

Thi triển có thời gian, gây choáng và chấn động. Vai trò: Lôi thuật · khống chế. Hệ: earth; thuộc tính ưu tiên: energy; vũ khí hình ảnh: Đao.

**Lôi pháp** — Lôi đạn và phong tỏa thi triển.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Ngũ Lôi Chính Pháp | projectile | 1 | 12 | 2.25 | stun |
| Thiên Lôi Phong Ấn | line | 1 | 20 | 4.5 | silence |
| Vân Khí Hộ Thể | buff | 1 | 20 | 9.25 | haste, shield |
| Lôi Động Cửu Thiên | aoe | 8 | 42 | 13 | stun |
| Liên Hoàn Lôi | cone | 4 | 22 | 5.25 | stun |
| Ngự Lôi Tâm Pháp | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Côn Lôn Nội Kinh | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

**Phong đao** — Đao khí hình quạt và tăng tốc áp sát.

| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |
|---|---|---:|---:|---:|---|
| Phong Đao Trảm | cone | 1 | 9 | 1.8 | armorBreak |
| Liệt Không Đao | projectile | 1 | 16 | 3.75 | slow |
| Tiêu Dao Phong Hành | buff | 1 | 18 | 9 | haste, attackBuff |
| Cuồng Phong Trảm Nguyệt | aoe | 8 | 36 | 11.5 | armorBreak, silence |
| Phong Nha Đao | dash | 4 | 22 | 5.25 | silence |
| Phong Vân Tâm Pháp | passive | 2 | 0 | 0 | Cộng chỉ số theo cấp nội công |
| Đao Cương Kinh | passive | 6 | 0 | 0 | Cộng chỉ số theo cấp nội công |

## Thế giới

| Map | Kích thước | Cổng | Static placements | Spawn zones | Max zone slots |
|---|---|---|---:|---:|---:|
| Tân Thủ Thôn | 30×30 | Thanh Trúc Lâm, Thanh Sơn Ngoại Vực | 5 | 0 | 0 |
| Thanh Trúc Lâm | 30×30 | Tân Thủ Thôn, Hắc Phong Trại | 7 | 0 | 0 |
| Hắc Phong Trại | 30×30 | Thanh Trúc Lâm | 6 | 0 | 0 |
| Thanh Sơn Ngoại Vực | 128×128 | Tân Thủ Thôn, Vân Khê Sơn Dã · Cấp 4–9 | 18 | 0 | 0 |
| Vân Khê Sơn Dã | 256×256 | Thanh Sơn Ngoại Vực, Thanh Vân Sơn · Cấp 9–16 | 0 | 10 | 91 |
| Thanh Vân Sơn | 320×320 | Vân Khê Sơn Dã | 0 | 16 | 180 |

## Quái và boss

| Tên | Cấp | AI | Cơ chế boss |
|---|---:|---|---|
| Sơn tặc | 1 | melee | — |
| Lang vương | 3 | pack | — |
| Hắc Phong Trại Chủ | 5 | boss | quake |
| Sơn tặc cung thủ | 3 | ranged | — |
| Ảnh nhẫn trinh sát | 4 | assassin | — |
| Thanh xà độc | 3 | poison | — |
| Vân Lang | 9 | pack | — |
| Thạch Viên | 10 | melee | — |
| Vân Tiễn Thủ | 10 | ranged | — |
| Ảnh Đao Khách | 11 | assassin | — |
| Độc Nga | 11 | poison | — |
| Lôi Hạc | 12 | ranged | — |
| Sơn tặc thủ lĩnh | 12 | pack | — |
| Bích Xà | 13 | poison | — |
| Lôi Cổ Sư | 14 | pack | — |
| Vân Sơn Yêu Vương | 16 | boss | storm |

## Nhiệm vụ

| Tên | Objective | Điều kiện | Lặp (ticks) |
|---|---|---|---:|
| Bình yên thôn nhỏ | kill: bandit ×5 | — | 0 |
| Dấu chân trong rừng | kill: wolf ×4 | bandits | 0 |
| Một kiếm định giang hồ | kill: boss ×1 | wolves | 0 |
| Một nắm thuốc lành | collect: herb ×4 | — | 0 |
| Lửa lò đầu tiên | craft: brew-hp ×1 | herbalist | 0 |
| Tuần tra ven thôn | kill: bandit ×8 | bandits | 24000 |
| Bước chân qua rừng trúc | explore: forest ×1 | — | 0 |
| Tay nghề người thợ | craft: forge-sword ×1 | — | 0 |
| Qua đèo Trúc Ảnh | explore: bamboo-pass ×1 | — | 0 |
| Dấu chân ở mỏ đá | explore: old-quarry ×1 | highland-route | 0 |
| Tin tới lều thợ săn | explore: hunter-rest ×1 | highland-route | 0 |
| Bầy sói dưới mai già | kill: wolf ×4 | — | 0 |
| Linh thảo bên đầm độc | collect: herb ×6 | — | 0 |
| Bia đá phế miếu | explore: ruined-shrine ×1 | plum-wolves | 0 |
| Chặn đường Hắc Phong | kill: boss ×1 | shrine-route | 0 |
| Dò đường Cầu Mây | explore: river-crossing ×1 | — | 0 |
| Dẹp đàn sói Khe Lang | kill: wolf ×12 | river-bridge | 3600 |
| Thuốc cho người qua khe | collect: herb ×12 | river-bridge | 3600 |
| Phá Cổ Trại Vân Khê | kill: boss ×1 | river-wolves | 0 |
| Dấu chân trong sương | kill: mist-wolf ×6 | — | 0 |
| Đèo Tùng Phong | kill: stone-ape ×5 | tv-scout | 0 |
| Yêu vương Vân Đỉnh | kill: cloud-beast ×1 | tv-pass | 0 |
| Cầu Đá Vân | explore: stone-bridge ×1 | — | 0 |
| Lễ ở Vân Hồ Từ | explore: sky-shrine ×1 | tv-bridge | 0 |
| Rắn trong mỏ ngọc | kill: jade-serpent ×6 | — | 0 |
| Ngọc thô trong đá | collect: jade-ore ×4 | tv-serpent | 0 |
| Lò rèn tiền tiêu | craft: forge-pine-blade ×1 | tv-mine | 0 |
| Mặc giáp lên núi | equip: pine-blade ×1 | tv-craft | 0 |

## Chế tạo

- Luyện Tiểu Hoàn Đan: 3 Linh Thảo + 10 bạc → 3 Tiểu Hoàn Đan.
- Luyện Tụ Khí Đan: 2 Linh Thảo + 1 Thanh Tùng Mộc + 10 bạc → 3 Tụ Khí Đan.
- Rèn Thanh Phong Kiếm: 3 Huyền Thiết + 2 Thanh Tùng Mộc + 60 bạc → 1 Thanh Phong Kiếm.
- May Đạo Bào Thanh Vân: 4 Linh Thảo + 2 Thanh Tùng Mộc + 50 bạc → 1 Đạo Bào Thanh Vân.
- Chế Lưu Vân Ngoa: 2 Huyền Thiết + 4 Thanh Tùng Mộc + 80 bạc → 1 Lưu Vân Ngoa.
- Mài Bích Ngọc: 4 Huyền Thiết + 2 Linh Thảo + 75 bạc → 1 Bích Ngọc.
- Mài Hổ Phách: 5 Huyền Thiết + 2 Thanh Tùng Mộc + 90 bạc → 1 Hổ Phách.
- Rèn Tùng Phong Kiếm: 4 Huyền Thiết + 2 Ngọc Thạch + 3 Linh Mộc + 260 bạc → 1 Tùng Phong Kiếm.
- Chế Ngọc Lân Giáp: 3 Lôi Thiết + 4 Yêu Thú Bì + 4 Vân Ti + 420 bạc → 1 Ngọc Lân Giáp.
- Luyện Vân Tâm Đan: 3 Nguyệt Thảo + 1 Vân Ti + 90 bạc → 2 Vân Tâm Đan.
- Mài Bích Hải Ngọc: 3 Ngọc Thạch + 1 Đá Cường Hóa + 160 bạc → 1 Bích Hải Ngọc.

Chưa có dungeon, đồng hành, bang hội, đấu trường, công thành, NPC market hoặc nội dung thế giới cấp cao. 141 definitions có test thực thi; nhiều chiêu chia sẻ primitive và cần thêm balance/art/âm thanh riêng. Không đánh dấu v1.0 hoàn tất chỉ từ số lượng này.
