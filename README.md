# 鹈鹕动物园

一个部署在 GitHub Pages 的动态 HTML 作品墙。上传文件通过 GitHub Issue 附件进入仓库，再由 GitHub Actions 发布；不需要也不会暴露自建服务器 IP。

## 上线

1. 打开网站右上角的 `+`，使用 GitHub 的 Issue 表单附加一个不超过 5 MB 的 `.html` 文件，并选择生成模型。
2. GitHub Actions 下载附件，校验名称和大小，把它写进 `works/`，更新 `works.json`，然后重新发布 GitHub Pages。

作品依上传时间倒序显示。每个 HTML 文件在没有 `allow-same-origin` 的 sandbox iframe 中运行，无法读取或修改主站页面。提交人需要一个 GitHub 账号，因为附件由 GitHub Issue 接收。

本仓库不包含服务器配置、服务器地址、服务器 IP 或第三方服务密钥。
