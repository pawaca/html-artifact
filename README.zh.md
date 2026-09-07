# HTML Artifact for Codex

[English](README.md) | 中文

**让 Codex 也能生成、展示并分享 artifact，而不止交付一段 Markdown 或一个本地路径。**

这个 Agent Skill 的目标，是给 Codex 补上类似 Claude / Claude Code 中可用 artifact 工作流的体验：把报告、解释、方案对比和案例复盘做成完整的 HTML 页面，再直接交付可打开的临时链接。

它是社区实现，不是 Codex 或 Claude Code 的内置功能，也不复制它们的原生界面。Claude Code 环境中如果已有满足需求的内置 artifact 能力，优先使用内置能力；本 skill 主要服务 Codex 等其他环境。

无需前端构建工具链、Python、Node、托管账号或 Netlify CLI。

## 能做什么

- **单文件 HTML**：CSS、必要的 JavaScript 和 SVG 内联，离线也能打开。
- **面向阅读的设计**：响应式布局、清楚的层级、打印样式；无需 React 或构建工具。
- **具体问题复盘**：原对话与点评并排呈现，区分事实、推断、修复建议和验收标准。
- **默认临时分享**：完成后匿名上传到 Netlify Drop，返回链接、访问密码和保留期限。
- **可恢复发布**：上传或查询失败后，继续同一个部署，避免反复创建项目。

适合报告、技术解释、研究摘要、方案比较和 review 文档。简单回答继续用聊天；正式网站和完整应用使用相应开发工作流。

## 安装到 Codex

确认目标目录不存在，再执行：

```bash
git clone https://github.com/pawaca/html-artifact.git ~/.codex/skills/html-artifact
```

如果设置了自定义 `CODEX_HOME`，安装到它的 `skills/html-artifact` 子目录。已有同名安装时先检查本地修改，不要直接覆盖。安装后开启新的 Codex 会话。

也可以让 Codex 安装：

```text
用 skill-installer 安装 https://github.com/pawaca/html-artifact
```

## 使用

```text
用 html-artifact 把这个方案做成能给非技术同事 review 的可视化文档。
```

```text
把这几个问题逐案复盘：摘录具体对话，旁边点评错在哪、怎么修、如何验收。
```

```text
做成单文件 HTML，只保存在本地，不上传。
```

**默认行为包含上传。** 使用本 skill 的默认工作流，会把完成的 HTML 上传到第三方匿名托管服务；不需要再单独说“发布”。明确要求“仅本地”“不上传”，或已有保密/分享限制时，跳过上传。若 Claude Code 的内置 artifact 工作流已满足需求，则使用内置交付，不额外上传。

## 发布脚本

运行依赖：Bash 3.2+、curl 7.55+、jq，以及 `sha1sum` / `shasum` / `openssl` 中任意一个。macOS、Linux 或具备这些工具的 shell 环境可用；原生 PowerShell 不是此脚本的目标环境。

```bash
# 检查输入，不发送网络请求
bash scripts/publish.sh /absolute/path/to/index.html --dry-run

# 上传一个 HTML 文件
bash scripts/publish.sh /absolute/path/to/index.html

# 从失败记录恢复；不创建新部署
bash scripts/publish.sh --resume /absolute/path/to/receipt.json
```

成功时 stdout 输出 JSON，进度和错误写入 stderr。JSON 包含 `url`、`password`、`retention` 和验证状态。

- 未认领的部署由 Netlify 保留约 **1 小时**，不能自定义有效期；具体行为由服务方决定。
- 访问密码 `My-Drop-Site` 是服务共享默认密码，**不应视为私密访问控制**。不要用它分享不允许公开的内容。
- 只上传指定文件，最大 10 MiB；不会上传相对路径图片、附件、原始数据包或整个目录。
- HTML 快照和含 token 的恢复记录保存在 `~/.codex/artifacts/.netlify-drop/`，只供本地恢复。可用 `HTML_ARTIFACT_STATE_DIR` 指定保存目录。不要公开记录或把它提交到 Git。
- 不需要认领项目或登录。接口失败时保留本地 HTML，不自动改用 Sites、其他托管平台或账户部署。
- 匿名接口根据 Netlify CLI 的实现对接，可能变化；发布成功不代表经过浏览器视觉检查。

## 仓库内容

```text
SKILL.md                触发、生成、验证与默认交付规则
assets/base.html        轻量页面骨架
references/design.md    文档排版指导
references/diagrams.md  图解指导
scripts/publish.sh      curl 发布与恢复
tests/test-publish.sh   无网络的发布回归检查
```

本仓库不包含真实客户对话、生产数据、发布凭证或历史复盘报告。

## 验证

```bash
bash -n scripts/publish.sh
bash tests/test-publish.sh
```

测试用替身 curl 模拟接口，不上传文件、不创建线上项目。覆盖 HTTPS 地址回退、失败恢复、恢复时不重复创建、快照校验、错误阶段和凭证输出保护。

## 文档语言

英文是默认文档语言。README 同时提供中文版本，两份文档顶部均有语言切换链接。修改安装方式、默认行为、依赖或限制时，应同步更新两份 README。Skill 指令、技术参考和许可证说明使用英文维护。

## 许可与来源

项目采用 [MIT License](LICENSE)。发布流程参考 Netlify CLI 的匿名 Drop 协议实现，保留其 MIT 声明；HTML 示例理念与来源边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

使用这个 skill 不会自动获得所输入文章、图片、用户对话或其他第三方材料的再发布权，也不会自动把生成页面中的所有内容变成 MIT。复制第三方代码或模板时，需要保留相应许可和署名。

Codex、Claude、Claude Code 和 Netlify 名称仅用于说明兼容性和参考来源。本项目不隶属于 OpenAI、Anthropic 或 Netlify，也未获得这些公司的背书。
