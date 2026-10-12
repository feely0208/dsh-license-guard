#!/usr/bin/env node
/**
 * dsh-license-guard —— 开源许可合规检查
 *
 * 扫项目的依赖树，找出许可不合规的包。
 *
 * 用法：
 *   dsh-license-guard                 扫当前目录
 *   dsh-license-guard --root <dir>    指定目录
 *   dsh-license-guard --demo          用内置样本演示（看效果）
 *   dsh-license-guard --html out.html 输出 HTML 报告
 *   dsh-license-guard --json          输出 JSON（给 CI）
 *
 * 退出码：有 high/critical 命中 → 1；否则 0（可直接挂 CI）
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '@deepwhale-cn/dsh-guard-core';
import { textReport, htmlReport, jsonReport, exitCode } from '@deepwhale-cn/dsh-guard-core/report';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, '..');
const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf-8'));

const META = {
  name: '深鲸守护 · 开源许可合规',
  version: pkg.version,
  desc: '扫描依赖树，找出 GPL/AGPL 传染、许可未知等风险。',
  rulesVersion: '2026-10-12',
};

// ── 参数 ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = { root: process.cwd(), demo: false, html: null, json: false, quiet: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--root') opt.root = argv[++i];
  else if (a === '--demo') opt.demo = true;
  else if (a === '--html') opt.html = argv[++i];
  else if (a === '--json') opt.json = true;
  else if (a === '--quiet') opt.quiet = true;
  else if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
}

function printHelp() {
  console.log(`
  ${META.name} v${pkg.version}

  用法：
    dsh-license-guard [选项]

  选项：
    --root <dir>    扫描目录（默认当前目录）
    --demo          用内置样本跑一遍，看检出效果
    --html <file>   额外输出 HTML 报告
    --json          输出 JSON（给 CI 二次处理）
    --quiet         只输出结论行
    -h, --help      显示帮助

  退出码：
    0  没有 high/critical 命中
    1  有 high/critical 命中（可挂 CI 卡口）
`);
}

// ── 加载规则 ──────────────────────────────────────────────────────
function loadRules() {
  const dir = join(PKG_ROOT, 'rules');
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')));
}

// ── demo：用内置样本演示 ──────────────────────────────────────────
function demoRoot() {
  // tests/fixtures/fail 里放了一个「故意有 GPL 依赖 + 缺 LICENSE」的样本项目
  const p = join(PKG_ROOT, 'tests', 'fixtures', 'fail', 'demo-project');
  if (!existsSync(p)) {
    console.error(`  ❌ 演示样本缺失：${p}`);
    process.exit(2);
  }
  return p;
}

// ── 跑 ────────────────────────────────────────────────────────────
const root = opt.demo ? demoRoot() : opt.root;
const rules = loadRules();
const { findings, stats } = scan({ root, rules });

if (opt.json) {
  console.log(jsonReport({ findings, stats, meta: META }));
} else if (opt.quiet) {
  console.log(`${stats.findings} 条命中 · 扫描 ${stats.scannedFiles} 文件 · ${stats.rulesRun} 规则`);
} else {
  if (opt.demo) {
    console.log('\n  【演示模式】使用内置样本项目，不是你的真实项目。\n');
  }
  console.log(textReport({ findings, stats, meta: META }));
}

if (opt.html) {
  writeFileSync(opt.html, htmlReport({ findings, stats, meta: META }), 'utf-8');
  if (!opt.quiet && !opt.json) console.log(`  HTML 报告已写入：${opt.html}\n`);
}

process.exit(exitCode(findings));
