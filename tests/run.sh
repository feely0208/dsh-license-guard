#!/bin/bash
# dsh-license-guard —— 双向验证测试
#
# 核心方法：**正例必须报，反例必须不报**。
# 误报是安全工具的头号杀手，所以「合规样本 0 命中」和「违规样本全部命中」一样重要。
#
# 输出五个指标：漏报 / 误报 / 规则覆盖率 / 溯源完整性 / 确定性

set -uo pipefail
export PATH="/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo ""
echo "  dsh-license-guard · 双向验证"
echo "  ────────────────────────────────────────────────"

# ── ① 违规样本：必须报出，且分类正确 ──────────────────────────
echo ""
echo "  【正例】违规样本（必须报）"
OUT=$(node bin/cli.mjs --root tests/fixtures/fail/demo-project --quiet 2>&1)
CODE=$?
n=$(echo "$OUT" | grep -oE '^[0-9]+' | head -1)
[ "${n:-0}" -ge 5 ] && ok "命中 ${n} 条（≥5）" || bad "命中数不足：${n:-0}"

JSON=$(node bin/cli.mjs --root tests/fixtures/fail/demo-project --json 2>&1)
check_find() {  # $1=规则, $2=证据关键词, $3=期望severity
  echo "$JSON" | python3 -c "
import json,sys
d=json.load(sys.stdin)
hit=[f for f in d['findings'] if f['ruleId']=='$1' and '$2' in f.get('evidence','')]
if not hit: print('MISS'); sys.exit()
sev=hit[0]['severity']
print('OK' if sev=='$3' else 'SEV:'+sev)
" 2>/dev/null
}
for spec in "LIC-GPL|some-gpl-lib|high" "LIC-GPL|agpl-tool|high" \
            "LIC-UNKNOWN|mystery-lib|medium" "LIC-SELF-FILE|LICENSE|medium" \
            "LIC-WEAK-COPYLEFT|lgpl-helper|low" "LIC-SELF-FIELD|license|low"; do
  IFS='|' read -r rid ev sev <<< "$spec"
  r=$(check_find "$rid" "$ev" "$sev")
  [ "$r" = "OK" ] && ok "$rid 报出 ${ev}（${sev}）" || bad "$rid × $ev → $r"
done

# ── ② 合规样本：必须一条都不报（误报测试）─────────────────────
echo ""
echo "  【反例】合规样本（必须 0 命中 —— 误报是头号杀手）"
CNT=$(node bin/cli.mjs --root tests/fixtures/pass/clean-project --quiet 2>&1 | grep -oE '^[0-9]+' | head -1)
[ "${CNT:-1}" = "0" ] && ok "0 命中" || bad "误报 ${CNT} 条"

# ── ③ LGPL 不得被误判成 GPL（真实踩过的坑）────────────────────
echo ""
echo "  【回归】LGPL 不得被当成 GPL（2026-10-12 真实误报）"
LG=$(echo "$JSON" | python3 -c "
import json,sys
d=json.load(sys.stdin)
gpl=[f for f in d['findings'] if f['ruleId']=='LIC-GPL' and 'lgpl' in f.get('evidence','').lower()]
print(len(gpl))
" 2>/dev/null)
[ "$LG" = "0" ] && ok "LGPL 未出现在 GPL 规则里" || bad "LGPL 被误判成 GPL（${LG} 条）"

# ── ④ 确定性：同输入两次运行结果一致 ──────────────────────────
echo ""
echo "  【确定性】同输入两次运行结果一致"
A=$(node bin/cli.mjs --root tests/fixtures/fail/demo-project --json 2>&1 | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(sorted((f['ruleId'],f['evidence']) for f in d['findings']))" 2>/dev/null)
B=$(node bin/cli.mjs --root tests/fixtures/fail/demo-project --json 2>&1 | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(sorted((f['ruleId'],f['evidence']) for f in d['findings']))" 2>/dev/null)
[ "$A" = "$B" ] && [ -n "$A" ] && ok "两次一致" || bad "两次结果不一致"

# ── ⑤ 溯源完整性：每条规则必须有 source ───────────────────────
echo ""
echo "  【溯源】每条规则必须带 source（防编造判据）"
python3 - <<'PY' && ok "全部规则均有 source" || bad "有规则缺 source"
import json,glob,sys
bad=[]
for f in glob.glob('rules/*.json'):
    r=json.load(open(f,encoding='utf-8'))
    if not r.get('source'): bad.append(r.get('id'))
if bad: print('缺 source:',bad,file=sys.stderr); sys.exit(1)
PY

# ── ⑥ 退出码：有 high 命中必须为 1 ────────────────────────────
echo ""
echo "  【退出码】有 high 命中 → 1（可挂 CI）"
node bin/cli.mjs --root tests/fixtures/fail/demo-project --quiet >/dev/null 2>&1
[ $? -eq 1 ] && ok "违规样本退出码 1" || bad "退出码不为 1"
node bin/cli.mjs --root tests/fixtures/pass/clean-project --quiet >/dev/null 2>&1
[ $? -eq 0 ] && ok "合规样本退出码 0" || bad "合规样本退出码不为 0"

echo ""
echo "  ────────────────────────────────────────────────"
echo "  通过 $PASS · 失败 $FAIL"
echo ""
[ "$FAIL" -eq 0 ] || exit 1
