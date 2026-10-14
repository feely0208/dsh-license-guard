# @deepwhale-cn/dsh-license-guard

[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/feely0208/dsh-license-guard)


**关键词**：开源许可 · 开源协议 · 许可证合规 · 许可风险 · GPL 传染 · AGPL · 开源合规 · 许可证
**Keywords**: open source license · license compliance · GPL · AGPL · copyleft · license risk
**开源许可合规检查** —— 扫依赖树，找出 GPL/AGPL 传染、许可未知等风险。

发布前、开源前、被审计时跑一遍。退出码可挂 CI。

## 不装它会怎样

你的产物里混进了一个 **GPL 依赖**，你没发现，打包发出去了。

半年后客户审计问：「你用了 GPL 代码，为什么没开源？」——
**GPL 的义务从「分发」那一刻就触发了**，而分发在半年前。

这个检查跑一次几秒钟。

## 它查什么

| 级别 | 内容 |
|---|---|
| 🔴 高 | GPL / AGPL —— 强传染 |
| 🟡 中 | 许可未知（没写许可证 ≠ 随便用）· 项目缺 LICENSE |
| 🟢 低 | LGPL / MPL / EPL · package.json 缺 license 字段 |

## 安装

```bash
# DSH 插件（推荐）
dsh plugin --profile web add @deepwhale-cn/dsh-license-guard

# 或纯 CLI（不依赖 DSH）
npx @deepwhale-cn/dsh-license-guard
```

## 用法

```bash
dsh-license-guard                # 扫当前目录
dsh-license-guard --demo         # 用内置样本看效果
dsh-license-guard --html r.html  # 输出 HTML 报告
```

![dsh-license-guard 的检查报告示例](https://raw.githubusercontent.com/feely0208/dsh-license-guard/main/docs/report.png)

## 覆盖范围

**5 条规则**，覆盖依赖树的许可风险 + 项目基础文件。

**不覆盖**：专利条款、商标、出口管制、SSPL/BUSL 等非 SPDX 自定义协议。
依赖声明的许可证值可能不准（维护者写错），本工具**不校验其真实性**。

## 为什么和其他工具不同

它**不只看依赖**，也看**你自己**：项目缺 LICENSE、package.json 缺 license 字段 ——
这两条会让别人（和你自己的下游）无法判断能不能用你的代码。

## 边界

本插件是一个工具。使用者必须遵守所在地区法律法规，**对使用本项目造成的任何后果自行承担责任。**

## 开发

```bash
npm install
bash tests/run.sh     # 双向验证（正例必须报 + 反例必须不报）
```

## License

MIT © 深鲸 DeepWhale
