# 大米计量替换（Rice Measurement Swap）

一个只作用于 DeepSeek Harness Web UI「会话统计」和「用量」区域的显示层文本替换插件。

它把这两个区域里的：

| 原文 | 显示为 |
| --- | --- |
| `token` | 大米 |
| `tok` | 斤 |

替换大小写不敏感，并且优先匹配较长的 `token`，避免被 `tok` 截断。其他区域保持原样。

> 这是纯前端显示替换：不会修改会话记录、模型输入、计费数据或任何持久化内容。

## 作用范围

只处理以下三处：

- 输入框下方的「会话统计」「用量」胶囊（`data-composer-stat="activity"` / `"usage"`），包括胶囊上的计数、速度、缓存命中等文字。
- 点击胶囊后打开的统计/用量弹窗，包括弹窗标题和明细行。
- 每条回复里的「本轮用量」触发器和它的详情弹窗。

以下区域一律不处理：

- 聊天正文、推理过程、工具输出
- 左侧栏、工作区列表、设置页面
- 页面标题、输入框、可编辑草稿、代码编辑器
- 插件管理页面、文件预览、终端等
- 轨迹检查器、子代理面板、账户用量页等其它用量展示

在「设置 → 通用设置 → 性能与用量」选择「详细」时，才会出现用量弹窗和每轮用量详情；「简洁」模式通常只显示统计速度和缓存命中。上下文占用环（「上下文已用」）不属于本插件范围，它本身也不包含被替换词。

## 效果示例
<img width="347" height="187" alt="image" src="https://github.com/user-attachments/assets/31d5d3f3-2bd7-48d7-9b2b-6f04c318f297" />
<img width="301" height="186" alt="image" src="https://github.com/user-attachments/assets/236224ff-52c5-4002-901b-777b2ddb1976" />


## 安装

### 当前状态

本目录已作为本地链接包安装在当前 `desktop` profile 中：

- 包名：`@local/rice-swap`
- 版本：`1.0.0`
- 英文显示名：`Rice Measurement Swap`
- Bundle 行：`rice-swap`
- 安装方式：`link:` 到本目录
- 无构建步骤、无运行时依赖

如果移动了本目录，需要重新安装，让 profile 中的链接指向新路径。

### 首次安装

1. 打开一个可以管理插件的 DSH 会话。
2. 通过 Plugin Manager 的本地目录安装能力安装本目录；在 Agent 工具中对应：
   ```json
   {
     "action": "install_bundle",
     "target": "<本目录的绝对路径>"
   }
   ```
3. 刷新一次 Web UI。

安装会做两件事：

- 把 `@local/rice-swap` 以 `link:` 形式加入当前 profile 的依赖；
- 选择该 bundle，使其 `cordis.patch.yml` 插入 `rice-swap` 插件行。

本插件的 `cordis.patch.yml` 只负责插入自己的行，不需要修改用户自己的 profile patch。

### 更新后

- 修改 `client.js`：在启用了 `client-hmr` 的 Web 组合中，链接包的客户端文件会被轮询并推送给页面；没有自动更新时刷新页面。
- 修改 `locale/*.json`、`package.json` 中的标题/描述或图标：刷新页面；仍显示旧内容时重启 DSH。
- 从早期「全局替换」版本升级：必须刷新一次，清掉旧版本已经改过的当前页面文字。

## 使用

1. 打开一个已有用量数据的会话。
2. 在输入框下方打开「会话统计」或「用量」胶囊。
3. 弹窗和胶囊里的目标词会显示为「大米」/「斤」。
4. 每轮回复的「本轮用量」在详细模式下出现，同样会被替换。

插件没有额外的 Config 或设置项：bundle 启用即生效，禁用即停止。

## 工作原理

插件完全在浏览器端运行，`index.js` 的 Host 部分为空。客户端第一次加载时会全文档查找作用域标记，但只在匹配到的区域内替换，不做全页文本替换：

```text
MutationObserver(document.documentElement)
  ├─ 新增节点
  │   ├─ [data-composer-stat="activity"|"usage"] → 处理整个胶囊
  │   ├─ 含 data-session-stats-details / data-session-stats-usage /
  │   │   data-turn-usage-details 的弹窗 → 标记 role="dialog" 面板并处理
  │   └─ 本轮用量触发器 → 标记按钮并处理
  ├─ characterData 变化 → 仅当节点位于已标记范围
  └─ attributes 变化 → 仅当元素位于已标记范围
```

### 作用域标记

| 标记 | 来源 | 用途 |
| --- | --- | --- |
| `data-composer-stat="activity"` | DSH UI | 会话统计胶囊 |
| `data-composer-stat="usage"` | DSH UI | 用量胶囊 |
| `data-session-stats-details` | DSH UI | 会话统计弹窗的明细区；用于找到并标记整个弹窗 |
| `data-session-stats-usage` | DSH UI | 用量弹窗的明细区；用于找到并标记整个弹窗 |
| `data-turn-usage-details` | DSH UI | 每轮用量弹窗明细区；用于找到并标记整个弹窗 |
| `data-rice-swap-scope` | 本插件 | 标记已纳入范围的弹窗面板 |
| `data-rice-swap-turn-usage` | 本插件 | 标记每轮用量触发器 |

弹窗面板通过 `role="dialog"` 定位。每轮用量触发器优先按 `aria-haspopup="dialog"` + 文案以「用量」/「Usage」开头 + 含数字识别；CSS Module 类名 `sZXytW_trigger` 仅作为当前构建的兜底。

### 文本属性

在范围内会处理这些常见文本属性：

`placeholder`、`title`、`alt`、`aria-label`、`aria-description`、`aria-valuetext`、`data-placeholder`、`data-tooltip`。

`script`、`style`、`textarea`、`input` 和可编辑区域内部的文本不会被改写；这些元素上的 `placeholder`/`title` 等属性仍按上面的列表处理。

## 文件结构

```text
.
├── package.json          # 包清单、bundle 与 client 声明
├── cordis.patch.yml      # 插入 rice-swap 插件行
├── index.js              # Host 半部分，空实现
├── client.js             # 客户端：作用域 DOM 文本替换
├── locale/
│   ├── en.json           # 英文标题/描述
│   └── zh.json           # 中文标题/描述
└── icon.svg              # 原创饭碗图标
```

## 开发与检查

项目使用纯 JavaScript，没有构建步骤和第三方依赖。修改后可以运行：

```bash
node --check client.js
node --check index.js
node -e 'for (const f of ["package.json", "locale/en.json", "locale/zh.json"]) JSON.parse(require("node:fs").readFileSync(f, "utf8")); console.log("JSON OK")'
xmllint --noout icon.svg   # 如果系统安装了 xmllint
```

手工验证时，打开一个有用量数据的会话，分别检查：

- 输入框下方的统计/用量胶囊
- 两个弹窗的标题与明细
- 每轮回复的「本轮用量」触发器与弹窗
- 聊天正文、设置、侧栏等区域没有被改动

## 卸载与恢复

通过 Plugin Manager 禁用 `rice-swap` bundle，或移除 `@local/rice-swap`，然后刷新页面。卸载不会删除本目录；需要彻底清理时，再手动删除本目录。

如果只禁用而不刷新，已经替换过的 DOM 文字会保留到下次页面加载，因为插件不保存原文映射表。刷新即可恢复原始文案。

## 已知限制

- 依赖当前 DSH UI 的 DOM 标记。作用域选择器编写时对应 `@deepseek-ai/dsh-client-ui-chat@0.2.1-rc.2`；该包或整体 UI 升级后，`data-*` 属性或结构可能变化，需要同步更新 `client.js` 中的选择器。
- `sZXytW_trigger` 是 CSS Module 生成的类名，只作为兜底；主要识别仍基于语义属性与文案。
- 不处理 canvas 绘制文本、CSS `content` 伪元素、Shadow DOM 和 iframe。
- 替换是字面子串替换：`tokens` 会显示为 `大米s`，`tokenizer` 会显示为 `大米izer`；需要保留复数/词形时可自行调整正则。
- 只改当前页面文本；从页面复制文本会得到替换后的结果，但底层会话数据和模型上下文不变。
- 不是输入转换器：输入框和可编辑草稿始终保留原样。

## 隐私

插件不联网、不读取凭据、不写入存储；Host 半部分为空，客户端只对当前页面白名单区域做 DOM 文本和属性修改。

## 许可

本项目使用MIT许可证。
