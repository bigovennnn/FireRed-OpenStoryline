# OpenStoryline 原理动画 · 分镜

1920×1080 · 30fps · 92 秒 = **2760 帧**（上限 2800）。
风格：奶油纸底色 + 描边贴纸卡片 + 可爱的橙色 Claude 小太阳当讲解员。
旁白以字幕气泡出现在左下角（由 `core.js` 的 `drawNarrator` 统一绘制，文本见 `script.json`），
所以每个场景的主要画面放在 **y < 860** 的舞台区。

硬规则：**每一帧只由时间决定**。不能用 `Math.random()`、不能跨帧保存状态；需要随机就用 `rng(seed)`。

| # | 时间 | 场景 | 讲什么（对应源码） |
|---|------|------|------|
| 1 | 0–8s | 开场 | 大号 Claude 蹦出来挥手，标题 “FireRed-OpenStoryline” + 副标题“一句话 → 一支视频”，火花粒子 |
| 2 | 8–22s | 架构 | 用户聊天气泡“帮我把旅行素材剪成温柔的 vlog” → LLM Agent（LangChain `create_agent`，大脑）→ 通过 MCP 调用 MCP Server 上的一排节点工具卡片 → 每个工具产物落入 ArtifactStore（抽屉/档案柜） |
| 3 | 22–38s | 素材 | `load_media` / `search_media`（Pexels）素材飞入 → `split_shots`：TransNetV2 剪刀把长胶片剪成镜头 → `understand_clips`：VLM 眼睛逐个扫描，贴上描述标签 → `filter_clips` + `group_clips`：不合格镜头淡出，其余分成几组 |
| 4 | 38–52s | 文案与声音 | `script_template_rec` + `generate_script`：参考文本的“风格”被复制到新文案（few-shot 风格迁移）→ `generate_voiceover`：文案变成声波 → `select_bgm`：音乐波形上标出鼓点（onset 检测，只保留局部峰值） |
| 5 | 52–64s | 时间线与渲染 | `plan_timeline_pro`：多轨时间线（视频/配音/BGM/字幕），镜头边界吸附到鼓点 → `recommend_transition` + `recommend_text` 加转场和花字 → `render_video` 输出 MP4，成片卡片弹出 |
| 6 | 64–75s | 自动补依赖 | 每个节点声明 `require_prior_kind`。用户直接要求渲染 → 拦截器发现缺前置 → 沿依赖图倒着点亮缺失节点，并以 `mode: default` 自动补跑（例如 split_shots 的 default 是直接透传不切分）→ 全部亮起后顺利渲染 |
| 7 | 75–85s | 对话式修改 + Skill | 聊天气泡“把第二段换掉”“字幕改成黄色” → 时间线里对应块交换/变色 → 整套流程打包成 `cutskill_xxx` 技能卡，换一批素材一键复用 |
| 8 | 85–92s | 结尾 | “星星之火，可以燎原”：一颗火星扩散成一片火花原野，Claude 挥手，标题 + GitHub 仓库名 |

## 音频
`audio.py` 用代码合成：120 BPM 的可爱木琴/八音盒 BGM + 每句字幕打字时的“哔哔”说话音（动物森友会式）+ 转场“啵”一声。

## 流程
1. `node render.js <帧目录>` —— Playwright + 无头 Chromium 并行逐帧渲染 PNG
2. `python3 audio.py <wav>` —— 合成音轨
3. `ffmpeg` 合成 MP4（见 `build.sh`）
