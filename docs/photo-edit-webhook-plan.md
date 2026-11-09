# Photo-edit Webhook 接入方案

> 状态：已在分支 `feat/photo-edit-webhook-20261109` 实现（含 Review 修复）；`pnpm test:photo-edit` 验证。
> 解决「供应商已成功、浏览器未轮询 → 结果被清理 → Admin 显示 Failed」的问题。

## 问题

供应商（Replicate / Fal）约 11 秒即可完成编辑，但结果目前主要靠浏览器轮询落库。用户关页或轮询中断后，等到对账时 Replicate 侧常已 `data_removed`，本库被标成 `failed` 并退积分，图无法找回。

两边 provider 的 `generate` **已支持** `callbackUrl`，只是提交路由没传。另外现有 reconcile / 退款路径还有若干 Webhook 场景下的缺口（见下方 P0/P1）。

## 目标

- Webhook 主动接收完成事件并持久化结果到 R2。
- 前端轮询只负责实时 UI，并保留兜底结算能力。
- Cron 继续处理遗漏 / 僵死任务。
- 不丢图、不重复扣费、不错退积分。
- 最小改动：不引入 Redis / 队列；优先不改 schema。

## 方案总览

```mermaid
sequenceDiagram
  participant Client
  participant API as edits_POST
  participant Provider as Replicate_or_Fal
  participant Hook as webhook_route
  participant Rec as reconcilePhotoEditTask

  Client->>API: create edit
  API->>API: createTask edit_id
  API->>Provider: generate + callbackUrl job+sig
  Provider-->>API: providerTaskId
  Note over Provider,Hook: Webhook may arrive before task_id write
  Provider->>Hook: completed webhook
  Hook->>Hook: verify provider signature
  Hook->>Hook: verify job HMAC + provider match
  Hook->>Hook: claim task_id if still null
  Hook->>Rec: settle throwOnError payload preferred
  Rec->>Rec: persist R2 + atomic updateTask
  API->>API: write task_id if still null
  Client->>API: poll GET
  API-->>Client: success + imageUrl
```

## P0 / P1 决策

### P0：Webhook 异常不能被吞掉

`reconcilePhotoEditTask` 增加 `throwOnError?: boolean`（默认 `false`，不破坏轮询 / list / cron）：

| 场景                            | 轮询 (`throwOnError=false`) | Webhook (`throwOnError=true`) |
| ------------------------------- | --------------------------- | ----------------------------- |
| 供应商查询临时失败              | 返回 pending，继续轮询      | **抛错 → 5xx**，供应商重试    |
| R2 持久化失败                   | 返回 pending（未过期）      | **抛错 → 5xx**                |
| 供应商 FAILED / 成功无图 / 过期 | `markFailed` + 退款 → 终态  | 同左，**返回 200**（勿重试）  |
| 已终态                          | 原样返回                    | **200 幂等**                  |

### P0：生产必须落到 R2

`persistPhotoOutput`：无 Storage 时，仅非 production 允许回退供应商 URL；production（含 Workers）**抛错**，禁止把临时 URL 写成 success。

R2 object key 改为确定性 `photo-editor/{taskId}.png`，并发结算覆盖同一 key，减少孤儿文件。

### P1：Webhook 早于 `task_id` 落库

不改 schema。callbackUrl 带本库任务 id：

```text
{app_url}/api/photo-editor/webhook/{provider}?job={edit_id}&sig={hmac}
```

- `sig = HMAC-SHA256(AUTH_SECRET, "{provider}:{job}")`（与 upload-token 同风格）。
- 任务在 `generate` **之前**已 `createTask`，故按 `job` 总能查到行。
- 提交与 Webhook 共用 `attachPhotoEditProviderTaskId`：只写 `task_id`，**绝不**把已 success/failed 改回 pending；已有不同 id → mismatch。
- 认领不 `catch` 全部 DB 异常；认领后仍无匹配 `task_id` → `attach_failed` → Webhook **503**。
- 终态 provider 事件若 reconcile 后仍为 pending/processing → **503**（禁止误 ack 200）。
- HMAC 无效 → 401；任务不存在 → 503。

### P0：提交写回不得覆盖 Webhook 终态

`edits.ts` 在 `generate` 成功后只调用 `attachPhotoEditProviderTaskId`，不再 `UPDATE … SET status=pending`。响应以重读后的真实状态为准。

### P1：提交结果不确定时不立即退款

- `isDefiniteProviderReject`：明确 4xx（除 408/429）或未配置 → `failed` + 退款。
- 超时 / 5xx / 网络等不确定 → **保持 pending**（文案不说已退款），等 Webhook / poll / cron；不自动重试 `generate()`。

### P1：缺少 `task_id` 的等待窗口

`PHOTO_EDIT_MISSING_PROVIDER_ID_MS` 与 `PHOTO_EDIT_STALE_MS` **同为 15 分钟**。未确认提交留下的 null `task_id` 可在此窗口内被 Webhook 认领；超时后 poll / list / cron 统一 `failed` + 退款。公开 Webhook 入口另限 body ≤ `PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES`（1 MiB），超限 413。

### P1：失败退款可靠

`updateTask(FAILED)` 把状态更新与 `revoke` 步骤放进**同一次** `atomic()`（抽取 `planRevoke`）。失败则整笔回滚，Webhook 可 5xx 重试。

补偿：`ensurePhotoEditRefund(task)` — 对已 `failed`/`canceled` 但 consume 仍 `active` 的行再调幂等 `revoke`（覆盖历史中断 / 旧代码路径）。reconcile / webhook / cron 结算后调用。

### P1：并发结算

复用 `updateTask` 的 pending/processing guard：终态只写一次；迟到的 failed 无法覆盖 success；退款 claim guard 保证只退一次。确定性 R2 key 避免双写两份对象。

### Webhook payload 优先

验签后若 payload 已含可解析图片 URL，构造 `AITaskResult` 传给 reconcile 的 `remote` 覆盖，**少打一次**供应商 query；缺结果时再 query。

## 实现清单

| 文件                                               | 改动                                          |
| -------------------------------------------------- | --------------------------------------------- |
| `src/routes/api/photo-editor/edits.ts`             | `callbackUrl` 带 job+sig                      |
| `src/core/ai/fal.ts`                               | `encodeURIComponent(callbackUrl)`             |
| `src/modules/photo-editor/service.ts`              | 生产强制 R2；确定性 key                       |
| `src/modules/photo-editor/reconcile.ts`            | `throwOnError`、`remote`、结算后 ensureRefund |
| `src/modules/photo-editor/webhook.ts`              | 验签、认领 task_id、settle                    |
| `src/modules/photo-editor/webhook-sign.ts`         | job HMAC 签发/校验                            |
| `src/routes/api/photo-editor/webhook/$provider.ts` | POST 入口                                     |
| `src/modules/credits/service.ts`                   | `planRevoke`                                  |
| `src/modules/ai-tasks/service.ts`                  | FAILED 与 revoke 同 atomic；ensureRefund      |
| `tests/photo-edit-webhook.test.ts`                 | 见下                                          |
| `docs/photo-edit-webhook-plan.md` / `UPGRADING.md` | 本文 + 升级说明                               |
| `package.json`                                     | `test:photo-edit` 纳入 webhook 测试           |

## 验签细节

- **Replicate**：Standard Webhooks；`GET /v1/webhooks/default/secret`（用现有 `replicate_api_token`）内存缓存；校验 `webhook-id` / `webhook-timestamp` / `webhook-signature`；±5 分钟。
- **Fal**：`X-Fal-Webhook-*` ED25519；JWKS `https://rest.fal.ai/.well-known/jwks.json` 缓存 ≤24h；±5 分钟。
- localhost / 非 http(s) 的 `app_url`：不传 callback（与现 provider 过滤一致），仍靠轮询 + cron。

## 测试矩阵

- 非法签名 → 401
- 合法回调 → success + R2（mock persist）
- 重复 Webhook → 幂等 200
- R2 失败 → 5xx，任务仍 pending，可重试成功
- Webhook 早于 `task_id` 落库 → 认领并结算
- Webhook 与轮询并发 → 仅一次 success / 一次扣费
- 供应商失败 → failed + 退款
- 退款中断恢复 → `ensurePhotoEditRefund` 补退
- 已成功 + 迟到 failed → 保持 success
- 成功但无图 → failed + 退款 + 200
- Cron 仍能结算遗漏任务（现有 reconcile 测试保留）

脚本：`pnpm test:photo-edit`（含 reconcile / credits / webhook）。无顶层 `pnpm test`。

## Cron 现状

Workers `triggers.crons`（建议 `*/5 * * * *`）经 Nitro `cloudflare:scheduled` 钩子直接跑 `reconcileStalePhotoEdits`（`server/plugins/photo-edit-cron.ts`）。HTTP 兜底仍可用：`/api/cron/reconcile-photo-edits` + `Authorization: Bearer <CRON_SECRET>`。Webhook 是主路径，cron 只兜 stale / missing-taskId。

## 不改

- 积分价格、前端 UI、供应商选择策略
- schema / 新基础设施
- 管理后台 Failed 明细展示（另议）

## 验收

1. 生产提交后立刻关页，约数十秒内任务 `success` 且结果在自有 R2 域名。
2. 伪造签名 → 401。
3. 同 `task_id` 重复投递不二次扣/退。
4. `pnpm test:photo-edit` 通过。
