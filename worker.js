export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // 首页，需登录cookie验证
    if (url.pathname === '/home' && method === 'GET') {
      const cookie = request.headers.get('Cookie') || '';
      if (!cookie.includes('login=1')) {
        return Response.redirect(`${url.origin}/`, 302);
      }
      return new Response(homePage, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 登录页
    if (url.pathname === '/' && method === 'GET') {
      return new Response(loginPage, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 注册页
    if (url.pathname === '/register' && method === 'GET') {
      return new Response(registerPage, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 注册处理
    if (url.pathname === '/register' && method === 'POST') {
      const form = await request.formData();
      const name = form.get('name');
      const email = form.get('email');
      const password = form.get('password');

      if (!name || !email || !password) {
        return new Response('缺少字段', { status: 400 });
      }

      const exists = await env.USERS.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(email).first();

      if (exists) {
        return new Response('<h1>邮箱已注册</h1><a href="/register">返回注册</a>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 409,
        });
      }

      await env.USERS.prepare(
        `INSERT INTO users (email, name, password, expire, status)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(email, name, password, '2000-01-01T00:00:00.000Z', 0).run();

      return Response.redirect(`${url.origin}/wait-pay?email=${encodeURIComponent(email)}`, 302);
    }

    // 登录处理
    if (url.pathname === '/login' && method === 'POST') {
      const form = await request.formData();
      const email = form.get('email');
      const password = form.get('password');

      const user = await env.USERS.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(email).first();

      if (!user) {
        return new Response('<h1>用户不存在</h1><a href="/">返回登录</a>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 401,
        });
      }

      if (password !== user.password) {
        return new Response('<h1>密码错误</h1><a href="/">返回登录</a>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 401,
        });
      }

      const now = new Date();
      const expireDate = new Date(user.expire);
      if (now >= expireDate) {
        await env.USERS.prepare(
          'UPDATE users SET expire = ? WHERE email = ?'
        ).bind('2000-01-01T00:00:00.000Z', email).run();

        return Response.redirect(`${url.origin}/wait-pay?email=${encodeURIComponent(email)}`, 302);
      }

      return new Response(loginSuccessPage(user.name), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': 'login=1; Path=/; Max-Age=540; HttpOnly; Secure; SameSite=Lax',
        },
      });
    }

    // 登出处理
    if (url.pathname === '/logout' && method === 'GET') {
      return new Response('', {
        status: 302,
        headers: {
          'Set-Cookie': 'login=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
          Location: '/',
        },
      });
    }

    // 等待付款页面
    if (url.pathname === '/wait-pay' && method === 'GET') {
      const email = url.searchParams.get('email');
      if (!email) {
        return new Response('缺少邮箱参数', { status: 400 });
      }
      return new Response(waitPayPage(email), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 检查是否过期
    if (url.pathname === '/check-expired' && method === 'GET') {
      const email = url.searchParams.get('email');
      const result = await env.USERS.prepare(
        'SELECT expire FROM users WHERE email = ?'
      ).bind(email).first();

      const expired = !result || new Date() >= new Date(result.expire);
      return new Response(JSON.stringify({ expired }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 模拟支付
    if (url.pathname === '/simulate-pay' && method === 'POST') {
      const data = await request.json();
      const expire = data.expire;
      if (!expire) {
        return new Response('缺少 expire 字段', { status: 400 });
      }

      const user = await env.USERS.prepare(
        "SELECT * FROM users WHERE expire = '2000-01-01T00:00:00.000Z' LIMIT 1"
      ).first();

      if (!user) {
        return new Response('无待支付用户', { status: 404 });
      }

      await env.USERS.prepare(
        'UPDATE users SET expire = ? WHERE email = ?'
      ).bind(expire, user.email).run();

      return new Response('支付成功，用户已激活');
    }

    // 注册成功页面访问路径
    if (url.pathname === '/success' && method === 'GET') {
      return new Response(successPage, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

// 页面 HTML 模板

const loginPage = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>登录</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-100 flex items-center justify-center min-h-screen"><div class="bg-white p-8 rounded shadow-md w-full max-w-md"><h1 class="text-2xl font-bold text-center mb-6">登录账户</h1><form method="POST" action="/login"><div class="mb-4"><label class="block text-gray-700 mb-2">邮箱</label><input name="email" type="email" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="you@example.com"></div><div class="mb-6"><label class="block text-gray-700 mb-2">密码</label><input name="password" type="password" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="••••••••"></div><button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">登录</button></form><p class="text-center text-sm text-gray-500 mt-4">还没有账号？<a href="/register" class="text-blue-500 hover:underline">注册</a></p></div></body></html>`;

const registerPage = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>注册</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-100 flex items-center justify-center min-h-screen"><div class="bg-white p-8 rounded shadow-md w-full max-w-md"><h1 class="text-2xl font-bold text-center mb-6">创建账户</h1><form method="POST" action="/register"><div class="mb-4"><label class="block text-gray-700 mb-2">用户名</label><input name="name" type="text" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="你的昵称"></div><div class="mb-4"><label class="block text-gray-700 mb-2">邮箱</label><input name="email" type="email" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="you@example.com"></div><div class="mb-6"><label class="block text-gray-700 mb-2">密码</label><input name="password" type="password" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="••••••••"></div><button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">注册</button></form><p class="text-center text-sm text-gray-500 mt-4">已有账号？<a href="/" class="text-green-500 hover:underline">登录</a></p></div></body></html>`;

const waitPayPage = (email) => `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>等待付款</title><script src="https://cdn.tailwindcss.com"></script><script>
async function checkExpired() {
  const resp = await fetch('/check-expired?email=${encodeURIComponent(email)}');
  const data = await resp.json();
  if (!data.expired) {
    window.location.href = '/success';
  } else {
    setTimeout(checkExpired, 3000);
  }
}
window.onload = checkExpired;
</script></head><body class="bg-yellow-100 flex flex-col items-center justify-center min-h-screen gap-4"><h1 class="text-2xl font-bold text-yellow-800">您的账户尚未付款或者已经过期</h1><p>请完成支付。</p><p>支付后页面将自动跳转。</p></body></html>`;

const loginSuccessPage = (name) => `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>登录成功</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-green-100 flex flex-col items-center justify-center min-h-screen gap-4"><h1 class="text-3xl font-bold text-green-800">欢迎，${name}！</h1><p>您已成功登录。</p><a href="/logout" class="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">退出登录</a></body></html>`;

const successPage = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>激活成功</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-green-200 flex flex-col items-center justify-center min-h-screen gap-4"><h1 class="text-3xl font-bold text-green-900">激活成功！</h1><p>您现在可以登录使用服务。</p><a href="/" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">返回登录</a></body></html>`;
