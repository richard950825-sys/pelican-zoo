# 鹈鹕动物园

一个部署在 GitHub Pages 的动态 HTML 作品墙。每件作品由 Supabase Storage 托管，并以沙箱 iframe 运行；不需要也不会暴露自建服务器 IP。

## 上线

1. 在 Supabase 新建一个项目，打开 **Authentication -> Providers -> Anonymous**，启用匿名登录。
2. 在项目的 SQL Editor 运行 [`supabase/schema.sql`](supabase/schema.sql)。
3. 把 Project URL 和 **anon public** key 填入 [`config.js`](config.js)。`anon` key 会被公开给浏览器，这是 Supabase 的设计；不要填写 `service_role` key。
4. 推送 `main` 分支。GitHub Actions 会发布 GitHub Pages。

上传内容会存到 Supabase 的 `works` bucket，作品信息存到 `works` 表。RLS 将上传文件限制为匿名用户自己的目录；主站通过没有 `allow-same-origin` 的 sandbox iframe 展示作品，上传的脚本无法读取或修改主站页面。

本仓库不包含服务器配置、服务器地址或服务器 IP。
