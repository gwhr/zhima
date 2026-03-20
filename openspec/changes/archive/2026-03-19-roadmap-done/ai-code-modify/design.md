# AI 代码修改 - 技术设计

## 方案概述

AI 对话注入项目上下文（需求、技术栈、已有代码），AI 返回包含文件路径和代码块的修改方案，前端解析后提供"一键应用"按钮，调用后端 API 更新文件。

## API 设计

### POST /api/chat

增强 system prompt，注入项目上下文：
- 工作空间信息（topic, requirements, techStack）
- 已生成代码文件内容（最多 12KB）
- 指导 AI 明确标注修改的文件路径和完整代码

使用 `result.toTextStreamResponse()` 返回纯文本流。

### POST /api/workspace/[id]/apply-code

接收 AI 建议的修改并应用到文件系统。

- 请求体: `{ filePath: string, content: string }`
- 逻辑: 写入 `.storage/` + 数据库 WorkspaceFile upsert（创建或更新）
- 支持两种场景：更新已有文件 / 创建新文件

## 组件设计

### ChatMessage (`components/chat-message.tsx`)

渲染 AI 消息为富文本：
- Markdown 解析（标题、列表、行内代码）
- 代码块高亮（语言标签 + 路径 + 行数 + 复制）
- "应用修改"按钮（匹配到已有文件时）
- "保存为新文件"按钮（未匹配时）

### 文件匹配逻辑 (`lib/parse-ai-code-blocks.ts`)

多级模糊匹配：
1. 精确路径匹配
2. 文件名匹配（basename）
3. 代码内容匹配（提取 Java 类名 / JS 组件名，与已有文件代码内容比对）

### ChatPanel (`components/chat-panel.tsx`)

- 接收 `files` 和 `onFileApplied` props
- 纯文本流解析（去掉 SSE JSON 格式）
- 使用 ChatMessage 组件渲染消息

## 依赖

无新增依赖。
