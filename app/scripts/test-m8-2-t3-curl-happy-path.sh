#!/usr/bin/env bash
# M8.2 T3 · Happy path 完整 HTTP 验证
#
# 前置：dev server 已启动在 http://localhost:3000（或通过 BASE_URL 覆盖）
# 运行：bash scripts/test-m8-2-t3-curl-happy-path.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin123}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "=== M8.2 T3 · curl Happy Path ==="
echo "BASE_URL=$BASE_URL"

# 1. 登录拿 cookie
echo ""
echo "[1/3] admin login"
LOGIN_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
  -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/admin/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS")
echo "  login HTTP $LOGIN_CODE (期望 200/303/302)"
if [ ! -f "$COOKIE_JAR" ] || ! grep -q jt_admin_session "$COOKIE_JAR"; then
  echo "  [FAIL] 未拿到 jt_admin_session cookie"
  cat "$COOKIE_JAR" || true
  exit 1
fi
echo "  ✓ cookie jar 含 jt_admin_session"

# 2. 查一条真实 trial 的 id（通过 /api/... 没有公开端点时改用 sqlite 或 dev db）
echo ""
echo "[2/3] 取一条真实 trial id（从 sqlite dev.db 查）"
TRIAL_ID=$(node -e "
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./src/generated/prisma/client');
const p = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });
(async () => {
  const t = await p.clinicalTrial.findFirst({ where: { isPublic: true }, orderBy: { createdAt: 'asc' } });
  process.stdout.write(t?.id ?? '');
  await p.\$disconnect();
})();
")
echo "  trial.id=$TRIAL_ID"

# 3. POST /api/admin/trials/[id]/generate-form
echo ""
echo "[3/3] POST generate-form（真调 DeepSeek，约 10-15s）"
AD_TEXT=$'一、项目：北京安贞医院难治性高血压合并慢性肾病肾动脉交感神经射频消融术（RDN）临床试验\n\n二、招募条件：\n1. 年龄 18-75 岁，性别不限\n2. 诊室收缩压 ≥ 140 mmHg（服用 3 种及以上不同类降压药，其中包括一种利尿剂）\n3. 已排除继发性高血压\n4. 肾小球滤过率（eGFR）≥ 45 mL/min/1.73m²\n\n三、排除：\n1. 妊娠或哺乳期\n2. 1 年内发生过急性心肌梗死、脑卒中\n\n四、联系：王老师 / 周医生'

BODY=$(node -e "console.log(JSON.stringify({ adText: process.argv[1] }))" "$AD_TEXT")

RESP=$(curl -sS -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/admin/trials/$TRIAL_ID/generate-form" \
  -H "Content-Type: application/json" \
  -d "$BODY")
echo "$RESP" | node -e "
let s = ''; process.stdin.on('data', c => s += c); process.stdin.on('end', () => {
  try {
    const j = JSON.parse(s);
    console.log('  响应:', JSON.stringify(j, null, 2));
    if (j.ok && j.formId && j.itemCount >= 3) {
      console.log('[ok] Happy path PASS · formId=' + j.formId + ' items=' + j.itemCount);
      process.exit(0);
    } else {
      console.error('[FAIL] 响应不符合预期');
      process.exit(1);
    }
  } catch (e) {
    console.error('[FAIL] 响应非 JSON:', s.slice(0, 300));
    process.exit(1);
  }
});
"
