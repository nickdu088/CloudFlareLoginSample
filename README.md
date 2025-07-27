# 📘 Cloudflare Workers 登录系统

一个使用 **Cloudflare Workers + KV + Tailwind CSS** 实现的纯前端无后端登录注册系统。所有逻辑运行在边缘节点，无需数据库或服务器。

---

## ✨ 功能特性

- ✅ 用户注册（保存至 Cloudflare KV）
- ✅ 用户登录（校验账号密码）
- ✅ 登录状态通过 Cookie 维持（有效期 9 分钟）
- ✅ 登录后访问主页
- ✅ 登出功能（清除 Cookie）
- ✅ 所有页面使用 Tailwind CSS 编写

---

## 🛠️ 技术栈

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [KV 存储](https://developers.cloudflare.com/workers/platform/sites/configuration#kv-namespaces)
- [Tailwind CSS](https://tailwindcss.com/) (CDN 引入)
- 原生 HTML 表单，无框架依赖

---

## 🚀 快速部署

### 1. 克隆本项目

```bash
git clone https://github.com/your-username/cloudflare-workers-login.git
cd cloudflare-workers-login
