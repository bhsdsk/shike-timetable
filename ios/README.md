# 拾课 iPhone 客户端

SwiftUI + WKWebView 原生 iOS 容器，支持 iOS 17 及以上的 iPhone。课表界面和云端账户沿用线上拾课服务；这不是把整套课表界面重写为 SwiftUI。没有第三方原生 SDK。

## 打开与构建

双击 `Shike.xcodeproj`，选择 Shike Scheme。本次未签名构建使用已安装的 iPhoneOS SDK，可不依赖模拟器运行时。真机 Run / Archive 或模拟器测试可能仍需在 Xcode 设置中安装对应 iOS 平台组件。

```sh
bash scripts/build-unsigned.sh
```

`build/Shike-1.0-unsigned.ipa` 是未签名的真机架构编译包，仅供后续签名，不能直接安装到普通 iPhone；不能作为 TestFlight / App Store 发布包。

## 安装到自己的 iPhone

1. 在 Xcode > Settings > Apple Accounts 登录自己的 Apple 账号。
2. 在 Shike target > Signing & Capabilities 选择自己的 Team；按需要设置唯一的 Bundle Identifier。
3. 连接并信任 iPhone，在手机端按 Xcode 提示启用开发者模式。
4. 选择该 iPhone 并点 Run，Xcode 完成开发签名和安装。免费个人团队存在设备、有效期和分发限制。

不要将账号密码、证书私钥、描述文件提交到 GitHub 或发送到聊天中。

本次开发包使用独立 PNG 图标。`Assets.xcassets` 保留 1024 像素图标源，尚未加入资源编译；准备正式上架时，安装完整 iOS 运行时后将资产目录加入 target 并设置 AppIcon，同时移除旧的 PNG 图标配置。

## 给其他人分发

TestFlight / App Store 或注册设备分发需要相应 Apple Developer Program 权限、证书和描述文件。选择 Product > Archive，再在 Organizer 中选择 Distribute App。已在 Xcode 配置好签名后也可以运行：

```sh
SHIKE_TEAM_ID=你的团队ID SHIKE_EXPORT_METHOD=debugging bash scripts/export-signed.sh
```

支持 `debugging`、`release-testing`、`app-store-connect` 三种导出方式。脚本只导出本地文件，不上传 App Store Connect；也不自动创建证书或注册设备。缺少签名资产时，请在 Xcode 中完成配置。

## 功能与边界

- 原生应用入口、图标、导航、网络错误及重试、帮助和分享。
- WebKit 默认持久化网站会话；独立于 Safari，首次使用需要重新登录。
- 保留弹窗和网页确认对话框，避免课程删除确认失效。
- 仅允许 HTTPS 页面，不添加证书信任例外或明文传输例外。
- 个人课表不在安装包内。内容由线上服务提供，需要网络连接。
- 账号服务可能限制嵌入式浏览器登录；提供 Safari 入口，但 Safari 的登录不会自动同步到原生容器。
- 编译成功不等于已通过真机登录、跨设备同步或 App Store 审核。这些需要后续真实账号及设备验收。
- App Store 提交前仍需正式隐私政策、支持链接、截图、完整账号删除流程和原生体验审查。隐私清单需随服务实际采集行为更新。

Apple 安装与分发说明：
https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices
https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases
