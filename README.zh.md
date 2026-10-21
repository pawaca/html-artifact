# HTML Artifact for Codex

[English](README.md) | 中文

**给读者一个有用的可视化答案。本地打开，按需分享。**

HTML Artifact 是一个 agent skill，用于生成独立的 HTML 解释、报告、方案比较、交互探索、小型本地工具，以及 OpenPencil 画布中的 UI 设计稿。它从读者需要理解、决定或完成的事情出发，再选择表现形式和界面。

没有默认文档版式或统一的视觉外壳。文字、图解、比较、模拟和控件可以围绕任务组合。简单内容使用浏览器原生能力，复杂内容可以使用模块化源码和打包后的库，最终仍交付一个离线 HTML 文件。

## 默认会做什么

1. 理解页面的主题、读者和用途。
2. 根据任务选择表现形式和视觉方向；重要选择尚不确定时，用小范围的实际渲染验证。
3. 生成完整的 HTML 文件，内联样式、图形和必要脚本。
4. 核验内容、有效交互，以及窄屏布局是否仍准确表达信息关系。
5. 保存文件，调用系统默认应用打开，返回绝对路径链接。

**只有明确要求在线分享时才会上传。** 普通修订直接修改同一个本地文件，提示刷新。说“不要打开”或“只生成文件”可跳过自动打开。打开失败或没有桌面环境时，agent 返回本地文件，不会以上传作为替代。

本 skill 主要服务 Codex 等缺少适用内置 artifact 工作流的环境。在 Claude Code 中，优先使用可用的内置 artifact 能力，除非明确选择本 skill。本项目不复制这两个产品的原生界面。

## 安装

首次安装到用户目录时，先确认目标目录尚不存在：

```bash
git clone https://github.com/pawaca/html-artifact.git ~/.codex/skills/html-artifact
```

如果设置了自定义 `CODEX_HOME`，使用其 `skills/html-artifact` 目录。安装后开启新的 Codex 会话。更新已有安装前，先检查本地修改。

也可以让 Codex 安装：

```text
用 skill-installer 安装 https://github.com/pawaca/html-artifact
```

## 试着这样用

解释机制：

```text
用 html-artifact 向不熟悉项目的人解释这个机制。
画清楚执行流程；如果改变一个变量有助于理解，可以加一个小交互。
```

比较方案：

```text
用 html-artifact 按相同维度比较这三个方案。
推荐一个，并说明什么条件下会选择另一个。
```

复盘具体案例：

```text
用 html-artifact 逐案复盘这些问题。把相关对话与分析放在一起，
然后说明修复方法和可观察的验收标准。
```

之后可以继续修改或分享：

```text
把这个对比改得更适合在手机上阅读。
```

```text
把完成的页面上传到 here.now，给我一个可分享的网址。
```

“生成 artifact”“预览”“打开”和普通修改都保持本地。上传授权针对指定页面和操作；此前上传过不代表后续自动上传，除非明确要求持续同步。agent 不必每次本地交付后追问是否上传，也不重复确认已经获得的授权。

## UI 设计画布

当需要在类似 Figma 的空间里展示多个界面、线框图或桌面/移动端方案时，
skill 会选择 UI 画布模板。它复用 OpenPencil 的场景树、Skia 渲染器和 Yoga
布局。页面只展示画布和简洁的缩放、适应画板控件，不带顶部栏和编辑器侧栏。

```text
用 html-artifact 设计一个阅读应用的桌面端和移动端，
放在 OpenPencil 画布里，方便比较布局和查看图层。
```

编写指南直接说明场景字段。内置产品演示保留为维护测试素材，不是必读上下文或视觉起点。

Agent 编写 `scene.json` 并生成 `index.html`；修改设计时更新同一份 JSON 后重新生成。
读者直接打开 HTML，不需要安装 OpenPencil、启动服务器或联网。页面中的 UI
是设计图层；需要实际工作的网页按钮和表单时，使用普通 HTML。

```bash
python3 -m venv "$HOME/.cache/html-artifact/canvas-venv"
"$HOME/.cache/html-artifact/canvas-venv/bin/python" -m pip install -r scripts/canvas-requirements.txt
"$HOME/.cache/html-artifact/canvas-venv/bin/python" scripts/create-ui-canvas.py assets/ui-canvas/example.json \
  --output /absolute/path/to/preview/index.html
```

生成使用 Python 3.9+ 和 fontTools/Brotli，首次安装后复用环境。脚本默认按当前
内容裁剪字体；后续加字时从原始字库重新生成，避免缺字。只剩 HTML 时也可通过
`--extract-scene` 恢复可编辑的 JSON。运行时和字体已内嵌，上传只需一个 HTML。
示例文件从约 8.75 MB 降至 **4.74 MB（4.52 MiB）**，加入图片后
需留意匿名发布的 10 MiB 上限。画布需要新版浏览器的 JavaScript、WebAssembly
和 WebGL；关闭脚本或打印时提供内容大纲。

当前模板是供 Agent 绘制、读者查看的设计画布，未接入完整应用、手动绘图编辑器、
协作或 `.fig` 文件导入导出。格式与使用方式见 [UI 画布指南](references/ui-canvas.md)，
组件分析及维护方式见 [OpenPencil 集成说明](references/open-pencil-integration.md)。

## 设计与输出

- **一个可携带的文件。** 必需资源与运行时代码内嵌，无必需的外部资源或开发服务器。阅读型页面在关闭脚本后保留核心说明；交互工具提供有意义的静态示例，或说明脚本要求。
- **设计贴合任务。** 先决定读者应该查看或操作什么，再给它合适的位置与空间。没有默认样式骨架、必需的大标题区或固定章节顺序。
- **有依据的视觉选择。** 将构图、字体、表面和色彩一起考虑。重要选择尚不确定时，用小范围的实际渲染验证；有必要才比较方案，并保持核心任务与内容可比。没有配色目录、主题轮换、固定草稿数量或过程报告要求。明确的需求和普通修改可以直接推进。尊重指定品牌，修改时保留有用的设计。
- **结构帮助理解。** 比较使用共同维度，复盘围绕因果证据，计划展示依赖与数据流。不为填满版面编造事实。
- **有目的的图形与交互。** 图解展示机制，控件帮助探索有意义的变化，无需用户先提出加按钮。静态文字适合任务时同样有效。
- **可靠地修改。** 计算、标签、图示、示例与静态/打印内容一起更新。保留有用的设计选择，也允许新需求改变页面结构。
- **照顾不同阅读环境。** 检查关键状态、键盘操作和支持的主题。页面即使没有溢出，图示换行后仍可能误导方向；检查信息关系，而不只看边界。

用户指定位置时优先使用指定位置。否则，agent 根据当前会话、相关环境变量和宿主配置判断自己的数据目录，保存到 `<agent 数据目录>/artifacts/<topic>-<unique-suffix>/index.html`。例如 Codex 使用配置的 `CODEX_HOME` 或 `~/.codex`，WorkBuddy 使用自己的数据目录，如 `~/.workbuddy`。不能仅凭另一个 agent 的目录存在就选用它；无法可靠识别宿主时，使用当前工作区的 `artifacts/`。新 artifact 使用独立目录，修订保留原路径。

简单问题直接用聊天回答；生产网站和完整应用使用专门的开发工作流。

## 按需在线分享

明确要求上传后，使用 **here.now** 匿名发布。内置脚本仅上传已经检查的 HTML，确认站点就绪，并逐字节核对线上内容与本地快照一致。

| 项目 | 行为 |
| --- | --- |
| 账号 | 无需账号；脚本不读取登录凭证 |
| 有效期 | 按服务方政策为 24 小时；不支持自定义匿名有效期 |
| 访问 | 知道链接的人均可访问；没有访问密码 |
| 大小 | 脚本接受单个 HTML 文件，最大 10 MiB |
| 索引 | 生成要求和画布输出默认包含 `noindex,nofollow` |
| 加密 | 本工作流不加密 HTML |

`noindex` 是对爬虫的指令，不是访问控制。服务端密码需要注册并认领站点，不属于内置匿名发布流程。页面过期不能证明每份备份都已删除。

here.now 披露了使用内容片段生成 AI 元数据，以及渲染缩略图的处理。脚本显式提供通用展示标题和描述，但这不等于关闭服务方的全部内容处理。已有保密和分享范围限制仍然有效。详见服务方的[隐私政策](https://here.now/privacy)和 [API 文档](https://here.now/docs)。

### 直接运行发布脚本

上传依赖 **Bash 3.2+、curl 7.55+、jq**，以及 **sha256sum、shasum、openssl** 中任意一个。发布脚本不需要 Python、Node 或服务商 CLI。本地生成不需要这套上传工具；agent 可使用已有浏览器工具检查页面。这个 Bash 脚本不能直接以原生 PowerShell 运行。

在 skill 目录中执行以下命令，或使用脚本的绝对路径：

```bash
# 检查文件输入，不发送网络请求；不检查布局或 noindex
bash scripts/publish.sh /absolute/path/to/index.html --dry-run

# 从一个 HTML 文件创建新的匿名站点
bash scripts/publish.sh /absolute/path/to/index.html

# 使用已保存且未改变的快照，继续失败的部署
bash scripts/publish.sh --resume /absolute/path/to/receipt.json
```

成功时 stdout 输出 JSON，包括 `url`、`expires_at`、`retention`、`receipt_path` 和验证状态。进度与错误写入 stderr。

**失败恢复不等于发布修订。** 传入 HTML 文件会创建新站点。`--resume` 使用原始快照继续同一次部署，不会上传最新修改。内置脚本尚无更新原网址的选项；更新该网址需要在明确授权后，另外调用服务方的更新 API。

### 失败与私密状态

快照和恢复记录默认保存在输入 HTML 旁的 `.here-now/`，跟随产物位置，可通过 `HTML_ARTIFACT_STATE_DIR` 修改；`--resume` 使用指定恢复记录所在的目录。记录含认领 token 和签名上传地址，不要公开或提交。

- 失败时保留本地 HTML；保存了有效部署 ID 时，恢复同一次部署。
- 创建结果不明确且未保存 ID 时，先调查再决定是否重试。
- 遇到 HTTP 429 即停止并报告限频，不循环创建站点，也不暗中换服务。
- 签名上传地址一小时后过期。脚本不会自动刷新；过期后需按文档刷新地址，才能继续恢复。

## 仓库与验证

```text
SKILL.md                从任务出发的生成、修改与本地交付
references/composition.md  表现形式的选择与组合
references/design.md    视觉方向、字体与响应式语义
references/html.md      独立 HTML 实现与验证
references/publishing.md  按需匿名发布流程
assets/ui-canvas/       UI 画布模板、示例、运行时和字体
references/ui-canvas.md UI 画布场景格式与生成指南
scripts/create-ui-canvas.py  单文件 UI 画布生成器
scripts/publish.sh      here.now 匿名发布与恢复
tests/test-publish.sh   无网络的发布回归检查
```

```bash
bash -n scripts/publish.sh
bash tests/test-publish.sh
```

测试用替身 curl 模拟接口，不创建线上站点。覆盖匿名发布、无网络预检、到期时间输出、私密恢复记录、失败恢复、内容一致性、快照完整性、地址限制、限频停止和创建结果不明确的情况。不验证生成页面的布局或服务方的数据保留承诺。

评测 Skill 行为时，给全新 agent 真实任务，
不透露怀疑的问题或预期设计；检查实际产物，再匿名比较版本。
分别评估任务完成质量与视觉方向。调整审美指令时，重复开放题目并跨主题比较，
检查是否反复使用习惯性风格；同时验证明确的设计要求和修改一致性。
仅换颜色不能证明表达丰富，单个好看的样例也不能证明稳定改善。

画布维护者可运行 `npm ci && npm run build:canvas`，然后执行
`CANVAS_PYTHON="$HOME/.cache/html-artifact/canvas-venv/bin/python" npm run test:canvas`。
这套构建工具只用于更新运行时；普通生成无需 npm。画布测试使用本机 Google Chrome
（也可设置 `CHROME_PATH`），验证真实离线渲染、中文像素、布局、选择与缩放。

中英文 README 描述相同行为，应同步更新。Skill 指令与技术参考使用英文维护。

## 许可

项目采用 [MIT License](LICENSE)。外部参考和许可范围见[第三方参考说明](THIRD_PARTY_NOTICES.md)。生成页面中的用户内容和第三方材料保留其适用权利与许可。

本项目由社区维护，不隶属于 OpenAI、Anthropic 或 here.now，也未获得其背书。
