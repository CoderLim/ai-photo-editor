# GetAIPhotoEditor：匿名试用与注册奖励积分技术设计

> 状态：待实施 · 2026-11-06
> 基线：CoderLim/ai-photo-editor 的 main（MVP PR #1 已合并）
> 本次仅提交技术文档，不修改业务代码。

## 1. 目标与业务规则

使用「匿名试用 10 积分 → 首次注册再获 10 积分 → 积分不足引导付费」降低首次生成门槛。标准 1K AI 编辑一次耗费 **10 积分**，仍以服务端定价为准。

| 状态 | 积分行为 | 生成时的交互 |
| --- | --- | --- |
| 新访客，没有 Session | 首次生成时创建匿名账号并发 10 积分 | 直接生成一次，不要求注册 |
| 匿名用户余额 ≥10 | 消费 10 | 提交编辑任务 |
| 匿名用户余额 <10 | 不再赠送 | 登录／注册弹窗：Get 10 More Free Credits |
| 新注册正式账号 | 额外获 10（一次性） | 可继续生成 |
| 正式账号余额 ≥10 | 消费 10 | 提交编辑任务 |
| 正式账号余额 <10 | 不再赠送 | 购买积分弹窗 |
| 已注册老用户重新登录 | 不额外赠送 | 按实际余额判断 |
| IP 风控拒绝匿名奖励 | 不赠送、不调模型 | 提示注册 |

未消费匿名额度就注册：安全合并后的余额为 **20**；先完成一次匿名编辑再注册：余额为 **10**。注册奖励是**新正式账号一次性的奖励**，绝不是每次 Sign in 都加 10。直接注册的新用户只得注册奖励 10，不追溯生成一个未使用过的匿名试用额度。

## 2. 现有代码审计与影响面

- `src/core/auth/index.ts`：Better Auth；已有 `databaseHooks.user.create.after` 调用 `grantForNewUser`。必须避免匿名新用户误领“正式注册”积分。
- `src/core/auth/client.ts`：增加 `anonymousClient()`，匿名登录按需触发。
- `src/config/db/schema.{sqlite,postgres,mysql}.ts`：`user` 增 `isAnonymous`；现有 `credit.userId` / `ai_task.userId` 均存在删除用户时的级联风险。
- `src/modules/credits/service.ts`：复用 `grant`、`planConsume`、`getBalance`、`revoke`、原子扣款和 FIFO；补充一次性赠送原子保障。
- `src/modules/ai-tasks/service.ts`：继续原子创建任务和消费账本；处理登录升级期间的并发归属。
- `src/routes/api/photo-editor/edits.ts` 与 `$id.ts`：允许匿名 Session 上传/生成/轮询，但身份、上传授权、任务归属仍由服务端校验；使用结构化错误码。
- `src/routes/api/storage/upload-image.ts` / `src/modules/photo-editor/upload-token.ts`：允许匿名用户上传；上传凭证 HMAC 绑定 userId，账户升级后需安全地重新授权。
- `src/routes/api/credits.ts`：查询匿名和正式账号余额，增加账户类型、每次生成费用。
- `src/components/photo-editor/workspace.tsx`：去掉“未登录立即跳登录页”的行为，采用匿名授权与两个 Modal，保持左右工作区。
- `src/lib/rate-limit.ts`：当前使用进程内 Map；不能用于 Cloudflare 多实例下可靠的每日防刷计数。
- Waffo：保留现有价格表、付款验证、积分到账和退款；匿名账号不能直接完成需要正式用户身份的购买。

## 3. 总体架构

**选择 Better Auth Anonymous 插件 + 现有统一用户/积分/任务系统**，不另建 guest_balance 表，也不以 localStorage 的额度为准。

```text
访客填入图片、指令 → 点击 Generate
  ↓
有正式 Session？── 是 → 检查余额 → 提交任务／支付弹窗
  │否
有匿名 Session？── 是 → 检查实际余额
  │否
Better Auth signIn.anonymous() 创建匿名身份
  ↓
POST /api/guest/trial：IP 风控 + 幂等领取 10 积分
  ├─ 被拒绝 → 引导注册，不调用 AI
  └─ 成功 → 上传图片 → 校验上传 HMAC
              ↓
    原子创建 ai_task + 消费 10 credit
              ↓
    Replicate / Fal（沿用现有配置）
              ↓
    成功保存结果；确定失败幂等退积分
```

**懒创建**：首次访问首页不创建匿名账户；只在用户填写完有效表单并点击 Generate 时创建，避免爬虫和页面曝光产生大量空用户。首屏可显示“10 free credits”，但未实际发放时不能在正式账本余额中谎报 10。

Better Auth 服务端使用 `anonymous()`，客户端使用 `anonymousClient()`。官方文档说明：`onLinkAccount({ anonymousUser, newUser })` 可迁移业务数据，默认会删除旧匿名账号。因此必须先安全迁移数据，再允许删除旧账号。参考 https://better-auth.com/docs/plugins/anonymous 。

## 4. 数据模型、幂等与发奖

1. `user.isAnonymous`：老用户回填 false，新匿名用户设 true。所有三类 Schema 均需迁移。
2. 沿用 `credit` 账本的 grant / consume / revoke，不创建第二套消费系统。
3. 新增 `free_credit_claim` 表（字段按实际迁移调整）：
   - `id`、`userId`、`kind`（guest_trial / signup_bonus / guest_merge）、`sourceGuestId`（可空）、`grantCreditId`（可空）、`createdAt`。
   - 唯一约束 `(userId, kind)`：每个账号同种权益只能领取一次。`guest_merge` 使正式账号**终身最多合并一份匿名免费剩余额度**。
   - `sourceGuestId` 唯一：同一匿名身份不能重复迁移到不同正式账号；旧用户删除前保留防重证据。
4. 新增持久化风险事件或窗口计数：`ipKey`（经 HMAC 处理的来源公网 IP）、领取时间、guestUserId、结果；必须支持滚动 24h 统计、原子配额占用和过期删除。
5. 新增 `claimFreeCredits(userId, kind, amount, ctx)`，将唯一 claim、发放 credit GRANT、必要的 IP 配额占用组合为事务/原子操作。唯一约束冲突时返回 already_claimed，不得靠“先查询再 grant()”的非原子方案防并发。
6. `databaseHooks.user.create.after`：匿名账户**不调用**旧的注册赠送钩子；新正式账户只发一次 signup_bonus=10；老账号重新登录不发。把原有 20 积分改成 10，防止新旧钩子叠加。推荐邮箱验证成功或 OAuth 验证完成后才发注册奖励；若邮箱验证关闭，需加强注册风控。

对 D1 / SQLite / PostgreSQL / MySQL 使用实际部署的事务与原子设施验证，并发失败必须回滚账本和风控占用。不能依赖前端重复请求检测代替数据库唯一约束。

## 5. 匿名账户升级与数据迁移（高风险）

```text
匿名 Session（guestUserId）
   ↓ 注册邮箱 / Google OAuth / 已有账号登录
Better Auth onLinkAccount(anonymousUser, newUser)
   ↓
业务迁移：
  1. 标记账户正在关联，禁止匿名账户新发奖/新扣费
  2. 校验 sourceGuestId 尚未迁移
  3. 根据“注册新用户”或“登录老账号”确定余额合并策略
  4. 迁移 credit 的赠送、剩余余额、消费流水及撤销所需引用
  5. 迁移 ai_task 所有权、正在生成的任务及结果
  6. 迁移或归档 free_credit_claim，登记目标账号的 guest_merge
  7. 给新注册正式账号一次性发 10；旧账号不发
   ↓
确认事务提交 → 切换正式 Session → 刷新余额和历史
   ↓
安全清理旧匿名用户（不能提前触发级联删除）
```

**策略**：
- 新注册：保留未消费匿名积分与历史，然后额外赠送 10。
- 登录已存在的老账号：历史可以合并，免费匿名剩余额度仅在其**首次**匿名合并时允许继承；以后再次从新无痕 Session 登录同一老账号，不得重复导入免费额度。
- 同一匿名 Session 不可重复迁移；多标签页、OAuth 回调重放都不能多发积分。
- 存在 `pending/processing` 任务时，必须保留外部 `taskId` 和扣款流水关联；禁止删除仍被引用的 guestUserId，禁止因为身份切换自动重复发供应商任务。应采用受保护的迁移状态、事务与延期清理。
- 上传 token 绑定 guestUserId，账户升级后旧 token 不可直接复用；可依据迁移后的任务所有权安全重新签发，或让浏览器保留 File 重新上传。
- `disableDeleteAnonymousUser` 的行为和默认删除顺序需要按锁定 Better Auth 版本做集成测试；不能假设回调失败一定阻止删除。

## 6. 公网 IP 防刷

使用可信 Cloudflare 入口提供的 **CF-Connecting-IP 公网来源 IP**，**不是**用户本机 192.168.x.x 局域网地址。用户关闭无痕窗口再打开，会创建新匿名账号，而不是重置旧账号余额；同一公网 IP 可以被限额控制，但无法识别唯一真人。

| 风控维度 | MVP 推荐值 |
| --- | --- |
| 单个匿名账户 | 只发一次 10 积分 |
| 同一公网 IP | **滚动 24 小时最多领取 2 次匿名试用** |
| `/sign-in/anonymous` | 请求限速，防止只拦领取接口却大量创建用户 |
| 免费生成请求 | 服务端用户/IP 维度频率和并发限制 |
| 高风险请求 | Cloudflare Turnstile，服务端验证 token |
| 每日模型免费预算 | 达到预算阈值暂停新试用，保护付费用户 |
| IP 存储 | 推荐 HMAC key + 短期留存，不长期保留明文 IP |

仅在真实可信的 Cloudflare 代理链路下信任 `CF-Connecting-IP`。不要使用客户端可控的 `X-Forwarded-For` 决定积分资格；生产缺乏可信 IP 时采取保守的拒领/额外验证策略。本地调试用模拟地址。窗口名额须通过数据库条件写入等**跨实例原子**机制占用，不能只靠当前全局 Map。

风险及误伤：同一 Wi-Fi/公司网络可能共享公网 IP；切换 5G/Wi-Fi、VPN 会更换出口 IP；IPv6 地址可能轮换。IP 限制只提高批量刷积分的成本，不代表“一人唯一”。应监控拒绝率与共享 IP 误伤，再调阈值。参考 https://developers.cloudflare.com/fundamentals/reference/http-headers/ 。

## 7. API 与错误码约定

新增：
- `POST /api/guest/trial`：需要合法匿名 Session，完成挑战校验、IP 风控和幂等 claim；返回 `{ balance, granted, accountType: 'guest' }`。
- `GET /api/credits`：返回真实余额、身份（guest/registered）、每次编辑成本 10；无 Session 返回“尚未领取”而非假余额。

修改：
- `POST /api/photo-editor/edits`：允许匿名用户，授权仍校验 Session、图片 token、任务 owner、余额、请求幂等 ID；只用服务端决定模型和价格。
- 积分余额不足改为结构化响应，不再通过匹配英文错误字符串判断弹窗。

| 错误码 | HTTP 建议 | UI |
| --- | --- | --- |
| AUTH_REQUIRED | 401 | 根据情况创建匿名 Session 或提示登录 |
| GUEST_TRIAL_RATE_LIMITED | 429 | 匿名权益不可领取，提示注册 |
| GUEST_CREDITS_EXHAUSTED | 403 | 登录弹窗 |
| CREDITS_INSUFFICIENT | 402 | 购买积分弹窗 |
| ACCOUNT_LINK_IN_PROGRESS | 409 | 禁止重复提交并刷新状态 |
| RATE_LIMITED | 429 | 按 Retry-After 处理 |

并发时服务端账本是最终权威。跨账户关联前后需防止同一个业务请求由于 `edit_`md5(userId:requestId)` 依赖 userId 而误创建第二个供应商任务；应为关联中的任务维护原始请求关联或延迟重复提交。

## 8. 前端交互

保留已有首页**左侧生成表单 + 右侧结果区**，不重新设计布局。

- 访客选择图和输入 prompt 时不跳转登录；点击 Generate 后按需匿名登录、领取积分、上传、生成。
- 匿名积分不足：Modal 标题 **Get 10 More Free Credits**；按钮 **Sign Up for Free**；次级按钮 **Already have an account? Sign in**。
- 正式账号余额不足：Modal 标题 **You're Out of Credits**；显示现有 Waffo Starter 套餐的真实价格和积分；按钮 **Get More Credits**。
- 登录/OAuth 回跳后尽量保留选中的图片、prompt 和工具；更新服务端余额。不要在登录后未经用户确认就自动发起可能重复收费的任务。
- 图片不在 localStorage 中持久保存完整敏感 base64；上传后的访问仍要做所有权鉴权。

## 9. 实施步骤

1. 数据库迁移、Better Auth 服务端匿名插件与客户端插件；验证旧用户登录兼容性。
2. 一次性赠送记录、IP/账号限额、原子账本、匿名登录入口限速、Turnstile 风控。
3. 修改上传、编辑和结果轮询接口以接受匿名 Session；保持供应商任务幂等和失败退款。
4. 匿名转正式账号事务迁移，处理历史、未完成任务、上传授权、老账号反复关联。
5. 接入登录和购买 Modal；沿用现有 Waffo 支付，不改价格来源与付款核验。
6. 测试、灰度发布、每日费用监测。配置 `ANONYMOUS_TRIAL_ENABLED` 默认关闭，验收后开启，紧急时可以关闭新匿名领取。

## 10. 验收测试

- [ ] 新访客免登录真实生成 1 次，扣 10 积分，第二次显示登录弹窗。
- [ ] 匿名余额 10 → 首次注册：总余额 20；匿名余额 0 → 首次注册：总余额 10。
- [ ] 已注册老账号再次登录不发注册奖励；匿名账户多次关联或同个 OAuth 回调重放不能重复迁移/赠送。
- [ ] 老账号退出 → 新匿名 Session → 再登录，不能无限导入新免费余额；历史归属正确。
- [ ] 匿名/正式账号多标签页同时提交：余额不会负数，任务只扣一次；确定失败只能退一次。
- [ ] 匿名升级时的 pending/processing 任务继续轮询，账本、历史及结果不会因 guest 用户删除而丢失。
- [ ] 上传 HMAC token 在用户切换后不可被冒用，旧任务可以安全地重新授权。
- [ ] 同一 IP 新无痕会话滚动 24h 前两次允许、第 3 次拒绝；共享 IP、IPv6、VPN、切网和伪造 XFF 有测试。
- [ ] Cloudflare 多实例下窗口配额/积分发放保持原子一致。
- [ ] 正式用户积分耗尽显示 Waffo 购买弹窗；付款、到账、退款、重复回调仍遵循现有逻辑。
- [ ] 功能开关关闭时停止新增免费试用，不影响已付款用户。
- [ ] 数据与用户上传图片的保留、删除规则已与隐私政策一致。

## 11. 发布前待确认的细节

1. **发注册奖励的时机**：建议邮箱验证成功或 OAuth 身份确认后；当前产品若允许未验证邮箱注册需补注册滥用防护。
2. **匿名余额合并给老账号**：建议只允许首次合并，之后只迁历史。
3. **匿名积分有效期**：建议先设 7 天（待产品确认）；购买积分遵守现有价格表和到期配置。
4. **IP 阈值**：默认 2 次/滚动 24h 是初始风控参数，需用真实成本/误伤数据复核。
5. **清理策略**：定期清理无效匿名账号与风险事件；R2 上传照片的公开访问和保留期限另行评估。

## 参考

- Better Auth Anonymous：https://better-auth.com/docs/plugins/anonymous
- Cloudflare 请求头：https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Turnstile 服务端验证：https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- 现有 MVP 规格：`docs/getaiphotoeditor-mvp.md`
- 已合并 PR：https://github.com/CoderLim/ai-photo-editor/pull/1
