/**
 * dsh-license-guard —— DSH 插件入口
 *
 * 把「开源许可合规检查」注册为 DSH skill。
 * 依赖 ctx.skills（由 @deepseek-ai/dsh-skill 提供）；缺失时静默跳过，不影响 profile 启动。
 */
import { readFileSync, existsSync, chmodSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIR = join(PKG_ROOT, 'skill');
const BIN = join(PKG_ROOT, 'bin', 'cli.mjs');

export const name = 'license-guard';
export const inject = ['skills'];

const SKILL_NAME = 'license-guard';
const PH = '<cli 路径>';

function skillBody() {
  return readFileSync(join(SKILL_DIR, 'license-guard.md'), 'utf-8').split(PH).join(BIN);
}

export function apply(ctx) {
  if (!ctx.skills || typeof ctx.skills.register !== 'function') {
    ctx.logger?.warn?.('[license-guard] 未找到 skills 服务，跳过技能注册');
    return;
  }
  let content;
  try { content = skillBody(); } catch (e) {
    ctx.logger?.error?.(`[license-guard] 读取技能正文失败: ${e}`); return;
  }
  ctx.skills.register({
    name: SKILL_NAME,
    source: 'bundled',
    description: '开源许可合规检查：扫描依赖树，找出 GPL/AGPL 传染、许可未知等风险，输出可定位的报告。',
    whenToUse: '发布前、开源前、被审计或尽调时、引入新依赖后。用户提到「许可」「license」「GPL」「开源合规」「能不能商用」时使用。',
    content,
  });
  ctx.logger?.info?.(`[license-guard] 已注册技能 ${SKILL_NAME}`);
  if (existsSync(BIN)) {
    try { const m = statSync(BIN).mode; if (!(m & 0o111)) chmodSync(BIN, m | 0o755); } catch { /* */ }
  }
}
