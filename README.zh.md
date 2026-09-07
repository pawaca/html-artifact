# HTML Artifact for Codex

[English](README.md) | 中文

**把需要解释的事，做成值得阅读的页面。本地打开，按需分享。**

HTML Artifact 是一个 agent skill，用于生成独立的 HTML 报告、方案比较、概念解释、实施计划和案例复盘。它指导 agent 完成内容组织、视觉设计、生成、检查和交付。

轻量不等于视觉简单。页面可以有精心搭配的字体、贴合主题的配色、图解和有用的交互，无需前端框架或构建流程。

## 默认会做什么

1. 理解页面的主题、读者和用途。
2. 选择内容结构、字体、配色和布局。
3. 生成完整的 HTML 文件，内联样式、图形和必要脚本。
4. 检查内容，并在布局或交互需要时查看渲染结果。
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

## 设计与输出

- **一个可携带的文件。** CSS、SVG 和有用的 JavaScript 内联，无必需的外部资源或开发服务器；核心说明离线、关闭脚本也能阅读。
- **设计贴合主题。** 写页面前先确定字体角色、配色和构图。模板是起点，不是所有页面必须遵循的样式。
- **结构帮助理解。** 比较使用共同维度，复盘围绕因果证据，计划展示依赖与数据流。不为填满版面编造事实。
- **有目的的图形与交互。** 图解展示机制，控件帮助探索有意义的变化；交互并非必需。
- **照顾不同阅读环境。** 考虑窄屏、主题对比度、键盘焦点和打印。系统打开命令成功不等于完成视觉验证。

默认输出到 `~/.codex/artifacts/<topic>-<unique-suffix>/index.html`，用户指定位置时优先使用指定位置。新 artifact 使用独立目录，修订保留原路径。

简单问题直接用聊天回答；生产网站和完整应用使用专门的开发工作流。

## 按需在线分享

明确要求上传后，使用 **here.now** 匿名发布。内置脚本仅上传已经检查的 HTML，确认站点就绪，并逐字节核对线上内容与本地快照一致。

| 项目 | 行为 |
| --- | --- |
| 账号 | 无需账号；脚本不读取登录凭证 |
| 有效期 | 按服务方政策为 24 小时；不支持自定义匿名有效期 |
| 访问 | 知道链接的人均可访问；没有访问密码 |
| 大小 | 脚本接受单个 HTML 文件，最大 10 MiB |
| 索引 | 模板和生成要求默认包含 `noindex,nofollow` |
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

快照和恢复记录保存在 `~/.codex/artifacts/.here-now/`，可通过 `HTML_ARTIFACT_STATE_DIR` 修改。记录含认领 token 和签名上传地址，不要公开或提交。

- 失败时保留本地 HTML；保存了有效部署 ID 时，恢复同一次部署。
- 创建结果不明确且未保存 ID 时，先调查再决定是否重试。
- 遇到 HTTP 429 即停止并报告限频，不循环创建站点，也不暗中换服务。
- 签名上传地址一小时后过期。脚本不会自动刷新；过期后需按文档刷新地址，才能继续恢复。

## 仓库与验证

```text
SKILL.md                工作流、生成与交付规则
references/design.md    字体、构图、主题与视觉检查
references/diagrams.md  机制图解与内联 SVG 指导
assets/base.html        可改造的独立页面骨架
scripts/publish.sh      here.now 匿名发布与恢复
tests/test-publish.sh   无网络的发布回归检查
```

```bash
bash -n scripts/publish.sh
bash tests/test-publish.sh
```

测试用替身 curl 模拟接口，不创建线上站点。覆盖匿名发布、无网络预检、到期时间输出、私密恢复记录、失败恢复、内容一致性、快照完整性、地址限制、限频停止和创建结果不明确的情况。不验证生成页面的布局或服务方的数据保留承诺。

中英文 README 描述相同行为，应同步更新。Skill 指令与技术参考使用英文维护。

## 许可

项目采用 [MIT License](LICENSE)。外部参考和许可范围见[第三方参考说明](THIRD_PARTY_NOTICES.md)。生成页面中的用户内容和第三方材料保留其适用权利与许可。

本项目由社区维护，不隶属于 OpenAI、Anthropic 或 here.now，也未获得其背书。
