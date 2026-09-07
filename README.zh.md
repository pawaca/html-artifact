# HTML Artifact for Codex

[English](README.md) | 中文

**让 Codex 生成可视化 HTML 文档，默认本地打开，按需在线分享。**

这个 Agent Skill 的目标，是给 Codex 补上类似 Claude / Claude Code 中可用 artifact 工作流的体验：把报告、解释、方案对比和案例复盘做成完整的 HTML 页面，默认保存并在本地打开；用户明确要求后才上传并交付临时链接。

它是社区实现，不是 Codex 或 Claude Code 的内置功能，也不复制它们的原生界面。Claude Code 环境中如果已有满足需求的内置 artifact 能力，优先使用内置能力；本 skill 主要服务 Codex 等其他环境。

无需前端构建工具链、Python、Node、托管账号或服务商 CLI。

## 能做什么

- **单文件 HTML**：CSS、必要的 JavaScript 和 SVG 内联，离线也能打开。
- **面向阅读的设计**：响应式布局、清楚的层级、打印样式；无需 React 或构建工具。
- **具体问题复盘**：原对话与点评并排呈现，区分事实、推断、修复建议和验收标准。
- **默认本地交付**：保存 HTML，并调用系统默认应用打开文件。
- **按需临时分享**：明确要求后才匿名上传到 here.now，返回链接、到期时间和保留期限。
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

**默认只在本地处理。** 生成并检查页面后，skill 调用系统默认应用打开文件，并返回绝对路径链接。说“不要打开”或“只生成文件”可跳过自动打开。修改已有页面时保留原路径，提示刷新，避免反复新增标签页。打开失败或没有桌面环境时仍交付本地文件，不会自动上传。

只有明确说“上传到 here.now”“给我一个可分享的网址”或“更新线上版本”等才会上传。“生成 artifact”“预览”“打开”和普通修改都保持本地。此前上传过不代表后续操作也获得授权，除非明确要求持续同步线上。不在每次交付后追问是否上传，也不对已授权上传重复确认。保密和分享范围限制仍然有效。Claude Code 内置 artifact 工作流使用自己的交付方式。

```text
把这个已经完成的 HTML 上传到 here.now，给我一个可分享的网址。
```

## 发布脚本

仅在明确要求上传时使用。运行依赖：Bash 3.2+、curl 7.55+、jq，以及 `sha256sum` / `shasum` / `openssl` 中任意一个。macOS、Linux 或具备这些工具的 shell 环境可用；原生 PowerShell 不是此脚本的目标环境。

```bash
# 检查输入，不发送网络请求
bash scripts/publish.sh /absolute/path/to/index.html --dry-run

# 上传一个 HTML 文件
bash scripts/publish.sh /absolute/path/to/index.html

# 从失败记录恢复；不创建新部署
bash scripts/publish.sh --resume /absolute/path/to/receipt.json
```

成功时 stdout 输出 JSON，进度和错误写入 stderr。JSON 包含 `url`、`expires_at`、`retention` 和验证状态。

- here.now 匿名站点按服务方政策在 **24 小时**后过期，不支持自定义匿名有效期；不能据此保证备份同步删除。
- 默认**没有访问密码**，知道链接的人均可访问。模板和 skill 默认使用 `noindex,nofollow`，用于阻止遵守规则的搜索引擎索引，不是访问控制。服务端密码需要注册并认领站点。
- 仅上传指定 HTML 文件，最大 10 MiB；不上传相对资源、原始数据或目录。
- HTML 快照和私密恢复记录保存在 `~/.codex/artifacts/.here-now/`，可用 `HTML_ARTIFACT_STATE_DIR` 修改。记录含认领 token 和签名上传地址，不要公开或提交。旧 Netlify 恢复记录不兼容。
- 不读取登录配置。失败时保留文件，尽可能恢复同一次部署；遇到 429 即停止，不自动换服务或重复创建站点。签名上传地址一小时后过期，需要按文档刷新，不能改为重新创建。
- 脚本显式提供通用展示标题和描述。here.now 披露了 AI 元数据处理和缩略图生成功能；手动元数据不等于关闭全部内容处理。HTML 未加密，详见[隐私政策](https://here.now/privacy)。
- 脚本检查 API 就绪状态和 HTTP 内容逐字节一致性，不代表浏览器视觉检查。[API 文档](https://here.now/docs)。

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

项目采用 [MIT License](LICENSE)。发布流程使用 here.now 的公开匿名 API；保留原 Netlify 集成的 MIT 来源声明。HTML 示例理念与来源边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

使用这个 skill 不会自动获得所输入文章、图片、用户对话或其他第三方材料的再发布权，也不会自动把生成页面中的所有内容变成 MIT。复制第三方代码或模板时，需要保留相应许可和署名。

Codex、Claude、Claude Code 和 here.now 名称仅用于说明兼容性和参考来源。本项目不隶属于 OpenAI、Anthropic 或 here.now，也未获得这些公司的背书。
