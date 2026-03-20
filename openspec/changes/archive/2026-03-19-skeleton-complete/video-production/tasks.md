# video-production: 任务清单

- [x] T1: 创建 lib/video/recorder.ts（Puppeteer 自动操作产品页面+录屏）
- [x] T2: 创建 lib/video/script-generator.ts（AI 生成视频解说词）
- [x] T3: 创建 lib/video/tts.ts（Edge TTS 配音）
- [x] T4: 创建 lib/video/composer.ts（FFmpeg 合成视频：录屏+配音）
- [x] T5: 实现 POST /api/admin/video/generate（触发视频生成）
- [x] T6: Worker 中添加 video-produce 任务处理器

## 验收标准
能自动生成一个完整的产品演示短视频（录屏+配音）

注：此模块为后期功能，当前为 API 骨架/占位实现。
