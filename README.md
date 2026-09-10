# 拾课

应用地址：https://shike-timetable.lh153698742.chatgpt.site

源代码：https://github.com/bhsdsk/shike-timetable

适合不同学校、不同作息的个人课表应用。支持手机按天查看、整周课表、分类、课程增删改、任意教学周、自定义学期和作息。

## 手机使用

这是可安装到主屏幕的 PWA。iPhone 使用 Safari 的“分享 → 添加到主屏幕”；安卓使用浏览器菜单的“安装应用”或“添加到主屏幕”。它不是已经上架 App Store 的原生应用，也不包含已签名的 APK/IPA。

公开访问页面不要求登录；查看和修改个人课表需要 ChatGPT 登录。不同账号的数据由服务端隔离，支持云端保存、重新打开同步、前台每 30 秒刷新和保存冲突检查。查看/编辑需要联网，离线时显示网络提示，不缓存个人课表或登录响应。

## 隐私

新账号从空课表开始。仓库不应包含真实姓名、学号、学校、教师、个人课程、用户附件、数据库、凭证或私人项目的历史。公开代码不等于公开课表。示例和测试数据均为虚构数据。

## 本地运行

需要 Node.js 22.13+ 和 pnpm。

```sh
pnpm install
pnpm dev
```

开发登录入口为 `/signin-with-chatgpt?return_to=/`。本地模拟账号只用于开发，生产版本没有该模拟登录。

数据库结构由 `db/schema.ts` 管理；生成迁移使用 `pnpm db:generate`。首次本地运行需将 `drizzle/0000_loving_stick.sql` 应用到开发 D1；生产由 Sites 应用迁移。

```sh
pnpm build
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_loving_stick.sql
```

如果 Wrangler 将相对路径按配置目录解释，请改用项目 `.wrangler/state` 的绝对路径。

## 验证

```sh
pnpm exec tsc --noEmit
node scripts/test-schedule.mjs
node scripts/test-api.mjs # 需要本地开发服务及数据库；测试后恢复账号原始内容
pnpm build
```

## GitHub 与部署

GitHub 保存源代码。GitHub Pages 只能托管静态资源，无法独立运行本项目的登录及 D1 API；将源码上传 GitHub 不代表已获得云端同步服务。

实际部署需要 Cloudflare Worker 兼容的服务端、D1 数据库和可信身份注入。本项目使用 Sites 提供这些能力，`.openai/hosting.json` 中的 `project_id` 应由部署者自行创建并保存在私有部署副本；公开源码中不应提交私人项目标识。

首次面向所有人发布前，应确认站点访问策略允许公开访问，并验证不同账号相互隔离。API 不接受请求正文指定用户身份，未登录请求会被拒绝；写入还检查来源和数据版本。

WebMCP 在支持的浏览器中提供教学周切换。未在实际 WebMCP 浏览器环境验证时，不应声称完成该能力验收。
