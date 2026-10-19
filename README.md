# DSH Character Replacement（大米计量替换）

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-DSH%20Web%20UI-2b7bc0.svg)
![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)

一个只作用于 **DeepSeek Harness Web UI** 的显示层文本替换插件：把「会话统计」和「用量」区域里的 `token` 显示为「大米」，`tok` 显示为「斤」。

它不改会话记录，不改模型输入，也不碰计费数据——只是让页面上的用量数字看起来更接地气。

## 效果
<img width="426" height="26" alt="image" src="https://github.com/user-attachments/assets/176b8cb1-e675-4599-92e9-a9ea7db72050" />
<img width="291" height="148" alt="image" src="https://github.com/user-attachments/assets/741c383c-11a1-4472-887d-5cde0290055e" />
<img width="289" height="145" alt="image" src="https://github.com/user-attachments/assets/0541bcea-a6c7-492f-9cca-95bbcec137d0" />


## 特性

- **作用域明确**：只处理输入框下方的统计/用量胶囊、对应弹窗，以及每条回复的「本轮用量」。
- **不误伤正文**：聊天内容、推理过程、工具输出、侧栏、设置页等区域保持原样。
- **大小写不敏感**：`Token`、`TOKEN`、`Tok` 都会匹配。
- **最长匹配优先**：先匹配 `token` 再匹配 `tok`，不会把 `token` 截成「斤en」。
- **零依赖、零构建**：纯 JavaScript，安装后刷新页面即可生效。
- **可逆**：不保存原文映射表，刷新页面后恢复原始文案。

## 作用范围

### 会处理

- 输入框下方的「会话统计」「用量」胶囊（`data-composer-stat="activity"` / `"usage"`），包括计数、速度、缓存命中等文字。
- 点击胶囊后打开的统计/用量弹窗，包括弹窗标题和明细行。
- 每条回复里的「本轮用量」触发器及其详情弹窗。

### 不会处理

- 聊天正文、推理过程、工具输出
- 左侧栏、工作区列表、设置页面
- 页面标题、输入框内容、可编辑草稿、代码编辑器
- 插件管理页面、文件预览、终端等
- 轨迹检查器、子代理面板、账户用量页等其它用量展示

在「设置 → 通用设置 → 性能与用量」选择「详细」时，才会出现用量弹窗和每轮用量详情；「简洁」模式通常只显示统计速度和缓存命中。上下文占用环（「上下文已用」）不属于本插件范围，它本身也不包含被替换词。

## 安装

### 环境要求

- 一个带插件管理能力的 DeepSeek Harness 版本（桌面版或 Web UI）。
- 安装和使用不需要 Node.js、npm 或任何构建步骤；克隆下来即可安装。

### 1. 获取代码

```bash
git clone https://github.com/Qiu-liang/DSH-Character-Replacement.git
```

也可以从 GitHub 页面下载 ZIP 后解压。

### 2. 安装到 DSH

**方式 A：Plugin Manager（推荐）**

打开 DSH 的插件管理页面，选择「从本地目录安装」，选中本仓库根目录（即包含 `package.json` 的目录），启用 `rice-swap` bundle，然后刷新 Web UI。

**方式 B：Agent 工具**

在可管理插件的 DSH 会话中调用：

```json
{
  "action": "install_bundle",
  "target": "/absolute/path/to/DSH-Character-Replacement"
}
```

`target` 必须是本仓库根目录的绝对路径。

安装会做两件事：

1. 把 `@local/rice-swap` 以 `link:` 形式加入当前 profile 的依赖；
2. 选择该 bundle，使其 `cordis.patch.yml` 插入 `rice-swap` 插件行。

`@local/` 前缀和 `"private": true` 是刻意保留的：这个包只通过本地目录安装，不发布到 npm。本插件的 `cordis.patch.yml` 只负责插入自己的行，不会改动用户原有的 profile patch。

### 3. 验证

1. 刷新一次 Web UI。
2. 打开一个已有用量数据的会话。
3. 输入框下方应能看到「会话统计」和「用量」胶囊。
4. 若设置中开启了「详细」模式，再打开弹窗检查标题和明细。

### 更新

```bash
git pull
```

- 修改 `client.js`：启用了 `client-hmr` 的 Web 组合会自动轮询并推送链接包；没有自动更新时刷新页面。
- 修改 `locale/*.json`、`package.json` 中的标题/描述或图标：刷新页面；仍显示旧内容时重启 DSH。
- 从早期「全局替换」版本升级：必须刷新一次，清掉旧版本已经改过的当前页面文字。

## 使用

1. 打开一个已有用量数据的会话。
2. 在输入框下方打开「会话统计」或「用量」胶囊。
3. 胶囊和弹窗里的目标词会显示为「大米」/「斤」。
4. 在详细模式下，每轮回复的「本轮用量」同样会被替换。

插件没有额外的 Config 或设置项：bundle 启用即生效，禁用即停止。

## 自定义替换词

默认规则在 `client.js` 顶部：

```js
const REPLACE_RE = /token|tok/gi;
const HAS_RE = /token|tok/i;

const replaceWords = (value) =>
  value.replace(REPLACE_RE, (match) =>
    match.length === 5 ? '大米' : '斤',
  );
```

想换成别的词，修改 `REPLACE_RE` 和 `replaceWords` 即可。注意：

- 正则必须把较长的词放在前面；
- `match.length === 5` 是按 `token` 的长度做的映射，修改正则后要同步调整；
- 改完刷新页面，或在启用 `client-hmr` 时等待热更新。

## 工作原理

插件完全在浏览器端运行，`index.js` 的 Host 部分为空。客户端只对白名单区域做 DOM 文本和属性替换，不做全页扫描式改写：

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
| `data-session-stats-details` | DSH UI | 会话统计弹窗明细区；用于定位并标记整个弹窗 |
| `data-session-stats-usage` | DSH UI | 用量弹窗明细区；用于定位并标记整个弹窗 |
| `data-turn-usage-details` | DSH UI | 每轮用量弹窗明细区；用于定位并标记整个弹窗 |
| `data-rice-swap-scope` | 本插件 | 标记已纳入范围的弹窗面板 |
| `data-rice-swap-turn-usage` | 本插件 | 标记每轮用量触发器 |

弹窗面板通过 `role="dialog"` 定位。每轮用量触发器优先按 `aria-haspopup="dialog"` + 文案以「用量」/「Usage」开头 + 含数字识别；CSS Module 类名 `sZXytW_trigger` 仅作为当前构建的兜底。

### 文本属性

范围内会处理这些常见文本属性：

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
├── icon.svg              # 原创饭碗图标
├── README.md
├── LICENSE               # MIT
└── .gitignore
```

## 开发与检查

项目使用纯 JavaScript，没有构建步骤和第三方依赖。修改后运行：

```bash
npm run check
```

该命令会检查两个 JS 文件的语法，并解析所有 JSON。也可以手动执行：

```bash
node --check client.js
node --check index.js
node -e 'for (const f of ["package.json", "locale/en.json", "locale/zh.json"]) JSON.parse(require("node:fs").readFileSync(f, "utf8")); console.log("JSON OK")'
xmllint --noout icon.svg   # 如果系统安装了 xmllint
```

手工验证时，打开一个有用量数据的会话，分别检查：

- 输入框下方的统计/用量胶囊
- 统计/用量弹窗的标题与明细
- 每轮回复的「本轮用量」触发器与弹窗
- 聊天正文、设置、侧栏等区域没有被改动

## 兼容性与已知限制

- 作用域选择器编写时对应 `@deepseek-ai/dsh-client-ui-chat@0.2.1-rc.2`。DSH 或该 UI 包升级后，`data-*` 属性、文案或 DOM 结构可能变化，需要同步更新 `client.js`。
- `sZXytW_trigger` 是 CSS Module 生成的类名，只作为兜底；主要识别仍基于语义属性与文案。
- 替换是字面子串替换：`tokens` 会显示为 `大米s`，`tokenizer` 会显示为 `大米izer`。需要保留复数/词形时请自行调整正则。
- 不处理 canvas 绘制文本、CSS `content` 伪元素、Shadow DOM 和 iframe。
- 插件固定输出中文「大米」/「斤」，因此英文界面下也会显示这两个词。
- 只改当前页面文本；从页面复制文本会得到替换后的结果，但底层会话数据和模型上下文不变。
- 不是输入转换器：输入框和可编辑草稿始终保留原样。
- 插件不保存原文映射表，禁用后需要刷新页面才能恢复原始文案。

## 隐私

插件不联网、不读取凭据、不写入存储；Host 半部分为空，客户端只对当前页面白名单区域做 DOM 文本和属性修改。

## 卸载与恢复

通过 Plugin Manager 禁用 `rice-swap` bundle，或移除 `@local/rice-swap`，然后刷新页面。卸载不会删除本目录；需要彻底清理时，再手动删除本目录。

如果只禁用而不刷新，已经替换过的 DOM 文字会保留到下次页面加载，因为插件不保存原文映射表。刷新即可恢复原始文案。

## 常见问题

**会影响计费或模型输入吗？**

不会。插件只修改浏览器里已经渲染出来的文本节点和少量展示属性，不接触会话数据、请求体或模型上下文。

**为什么英文界面也显示「大米」「斤」？**

替换目标是固定的中文词，不随界面语言变化。想改成英文或其他词，见「自定义替换词」。

**开启「简洁」模式后看不到用量弹窗？**

这是 DSH 的显示逻辑：用量弹窗和每轮用量详情只在「详细」模式下出现。统计胶囊和缓存命中等文字仍会被替换。

**升级 DSH 后突然不生效了？**

先刷新页面；仍然无效时，多半是 DSH UI 的 `data-*` 标记或弹窗结构变了。请提 Issue，并附上 DSH 版本和失效区域。

## 参与贡献

欢迎通过 [Issue](https://github.com/Qiu-liang/DSH-Character-Replacement/issues) 反馈问题或提交 Pull Request。修改后请先运行 `npm run check`。

## English

**DSH Character Replacement** is a display-only plugin for the DeepSeek Harness Web UI. Inside the composer's session-statistics and usage widgets, it renders `token` as 大米 and `tok` as 斤. Chat content, model input, usage records, and billing data are never modified.

- **Requirements:** a DSH build with plugin management; no build step or runtime dependencies.
- **Install:** clone this repository, add its root directory through Plugin Manager (or call `install_bundle` with the directory as `target`), then refresh the Web UI.
- **Scope:** the session-statistics/usage pills, their dialogs, and the per-turn usage trigger/dialog only.
- **License:** MIT.

See the Chinese sections above for detailed scope, customization, limitations, and uninstall instructions.

## 许可

本项目采用 [MIT License](LICENSE)，Copyright (c) 2026 Qiu-liang。

DeepSeek Harness 及相关名称为其权利人所有。本项目为社区插件，与 DeepSeek 官方无隶属关系。
