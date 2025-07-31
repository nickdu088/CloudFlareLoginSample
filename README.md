# 📘 Cloudflare Workers 登录系统

一个使用 **Cloudflare Workers + KV + Tailwind CSS** 实现的纯前端无后端登录注册系统。所有逻辑运行在边缘节点，无需数据库或服务器。

---

## ✨ 功能特性

- ✅ 用户注册（保存至 Cloudflare D1 SQL Database）
- ✅ 等待用户付款
- ✅ 用户过期/付款重定向
- ✅ 用户登录（校验账号密码和用户过期状态）
- ✅ 登录状态通过 Cookie 维持（有效期 9 分钟）
- ✅ 登录后访问主页
- ✅ 登出功能（清除 Cookie）
- ✅ 清理注册24小时内未付款的新用户
- ✅ 所有页面使用 Tailwind CSS 编写

---

## 🛠️ 技术栈

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 SQL Database](https://developers.cloudflare.com/d1/)
- [Tailwind CSS](https://tailwindcss.com/) (CDN 引入)
- 原生 HTML 表单，无框架依赖

---
