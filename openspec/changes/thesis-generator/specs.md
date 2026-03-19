# thesis-generator: 需求规格

## 论文章节结构
- 摘要（中文）
- Abstract（英文）
- 绪论
- 需求分析
- 系统设计
- 系统实现
- 系统测试
- 结论
- 参考文献
- 致谢

## 技术选型
- 使用 docx npm 库生成 Word 文档
- 内置 3-5 套标准模板（预设格式：字体、行距、页边距）
- 图表由 chart-renderer 模块生成后插入

## 接口设计
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/workspace/[id]/thesis/generate | 触发生成 |
| GET | /api/workspace/[id]/thesis | 获取论文文件（下载链接） |

## 生成流程
1. 用户触发生成
2. 按章节顺序调用 DeepSeek，传入项目上下文（需求清单、代码结构）
3. 图表占位符由 chart-renderer 生成后替换插入
4. 输出完整 .docx 文件
