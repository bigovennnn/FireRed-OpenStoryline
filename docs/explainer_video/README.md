# OpenStoryline 原理动画（Claude 讲解版）

`openstoryline_explainer.mp4` —— 1920×1080 · 30fps · 92 秒（2760 帧），可爱风的 Claude 小太阳讲解 FireRed-OpenStoryline 的工作原理。

画面不是视频模型生成的，而是**代码逐帧画出来的**：
- `STORYBOARD.md` 分镜，`script.json` 场景时间轴 + 旁白字幕
- `core.js` 绘图工具包（Claude 角色、贴纸卡片、气泡、箭头、图标、圆形转场），`scenes/*.js` 每个场景一个文件
- `render.js` 用 Playwright 驱动无头 Chromium 并行逐帧截图（每帧只由时间决定，可乱序并行）
- `audio.py` 用 numpy 合成 BGM（120 BPM 八音盒/木琴）、打字“说话音”和转场音效
- `build.sh`（Linux/macOS）/ `build.ps1`（Windows）一键：渲染帧 → 合成音轨 → ffmpeg 输出 MP4

预览：用本地静态服务器打开 `index.html?play`（或 `?f=帧号` 看单帧）。
重建：`./build.sh`（需要 node + playwright、python3 + numpy、ffmpeg 或 `pip install imageio-ffmpeg`）。

Windows（PowerShell，在本目录下）：
```powershell
npm install playwright
npx playwright install chromium
pip install numpy imageio-ffmpeg
powershell -ExecutionPolicy Bypass -File .\build.ps1
```
Windows 上中文会用“微软雅黑”、emoji 用 Segoe UI Emoji 代替文泉驿 / Noto，字形宽度略有不同，建议先渲染几帧检查有没有文字溢出：
`node render.js build\check --frames 210,1400,2180,2740`
