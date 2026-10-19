# Audio bible và mixer

Baseline chỉ3eventtones vàloop8notes. V0.3 thêm AudioManager ngoài simulation, buses Master/Music/Ambient/Combat/UI, gain/fade/compressor, unlock gesture, volume/mute, noise-buffer reuse, voicepriority/attenuation/variation, voicebudget16 và tối đa2musicbus khi crossfade. Pause hạ master; dispose dừng timer/sources/disconnect và đóng context khi đổi session.

Nhạc hiện có phrase cho village/forest/camp/highlands/riverlands/boss bằng oscillator dây gảy/flute-like và noise percussion. Ambient là filterednoise. Combat phân slash/impact/fire/ice/poison/heal/buff/level/loot/craft/equipment/death/telegraph, bước chân và previewUI. Đây là **nguồn tổng hợp gốc**, chưa phải nhạc cụ thu âm hoặc sound library sản xuất. Chưa có voice, ambience theo biome chi tiết, footstep đủ material hoặc mỗi141chiêu có clip riêng.

Settings giữ volumes client riêng: master/music/ambient/combat/UI; bật/tắt music/SFX của nhân vật vẫn qua GameSettings. Tùy chọn client không chuyển sang character economy online. Synthesis variation không dùng RNGcore, không làm đổi replay/combat.

QA:3unit lifecycle tests với fakeAudioContext kiểm unlock/dispose/voicecap/mute/pause/crossfade; browser test xác nhận AudioContextrunning và volume preference reload. Chưa có listening review, waveform clipping measurement hoặc Safari/iOS/realdevice. Cần bổ sung acoustic library hợp pháp và kiểm music transitions trong encounter dài trước production.

19/10/2026: thêm 5 WAV development original bằng physical-model synthesis (forge success/failure, craft, coin, equip), pipeline `scripts/build-presentation-audio.mjs`, metadata/provenance tại `docs/visual/ASSET_PROVENANCE.md`. Preload/decode sau unlock, cùng mixer/cap16/teardown, chọn kết quả cường hóa theo `GameEvent.success`; cache offline bao gồm WAV. Đây chưa phải production recordings, chưa nghiệm thu nghe trên điện thoại thật. Unit test kiểm tra loaded samples/outcome/dispose; browser regression kiểm tra gameplay/offline.
