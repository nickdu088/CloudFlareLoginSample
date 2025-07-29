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
      const existsRaw = await env.USERS.get(email);
      if (existsRaw) {
        return new Response('<h1>邮箱已注册</h1><a href="/register">返回注册</a>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 409,
        });
      }
      // 新注册用户，状态为 pending
      const user = { email, name, password, status: 'pending' };
      await env.USERS.put(email, JSON.stringify(user));
      // 跳转等待付款页面，带邮箱查询
      return Response.redirect(`${url.origin}/wait-pay?email=${encodeURIComponent(email)}`, 302);
    }

    // 登录处理
    if (url.pathname === '/login' && method === 'POST') {
      const form = await request.formData();
      const email = form.get('email');
      const password = form.get('password');
      const userRaw = await env.USERS.get(email);
      if (!userRaw) {
        return new Response('<h1>用户不存在</h1><a href="/">返回登录</a>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 401,
        });
      }
      const user = JSON.parse(userRaw);
      if (password !== user.password) {
        return new Response('<h1>密码错误</h1><a href="/">返回登录</a>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 401,
        });
      }
      if (user.status === 'pending') {
        // 跳转等待付款页面
        return Response.redirect(`${url.origin}/wait-pay?email=${encodeURIComponent(email)}`, 302);
      }
      if (user.status === 'paid') {
        return new Response(loginSuccessPage(user.name), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Set-Cookie': 'login=1; Path=/; Max-Age=540; HttpOnly; Secure; SameSite=Lax',
          },
        });
      }
      // 其他状态不允许登录，默认拒绝
      return new Response('<h1>账户状态异常</h1><a href="/">返回登录</a>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 403,
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

    // 检查付款状态轮询接口
    if (url.pathname === '/check-payment' && method === 'GET') {
      const email = url.searchParams.get('email');
      if (!email) {
        return new Response(JSON.stringify({ paid: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const userRaw = await env.USERS.get(email);
      if (!userRaw) {
        return new Response(JSON.stringify({ paid: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const user = JSON.parse(userRaw);
      return new Response(JSON.stringify({ paid: user.status === 'paid' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 模拟支付接口（测试用），找到第一个pending用户改为paid
    if (url.pathname === '/simulate-pay' && method === 'POST') {
      // 查询所有用户，找到状态pending的第一个
      const listResponse = await env.USERS.list();
      for (const key of listResponse.keys) {
        const userRaw = await env.USERS.get(key.name);
        if (!userRaw) continue;
        const user = JSON.parse(userRaw);
        if (user.status === 'pending') {
          user.status = 'paid';
          await env.USERS.put(user.email, JSON.stringify(user));
          return new Response('支付成功，用户已激活');
        }
      }
      return new Response('无待支付用户', { status: 404 });
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

const registerPage = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>注册</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-100 flex items-center justify-center min-h-screen"><div class="bg-white p-8 rounded shadow-md w-full max-w-md"><h1 class="text-2xl font-bold text-center mb-6">创建账户</h1><form method="POST" action="/register"><div class="mb-4"><label class="block text-gray-700 mb-2">用户名</label><input name="name" type="text" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="你的昵称"></div><div class="mb-4"><label class="block text-gray-700 mb-2">邮箱</label><input name="email" type="email" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="you@example.com"></div><div class="mb-6"><label class="block text-gray-700 mb-2">密码</label><input name="password" type="password" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="至少 8 位"></div><button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">注册</button><p class="text-center text-sm text-gray-500 mt-4">已有账号？<a href="/" class="text-green-500 hover:underline">登录</a></p></form></div></body></html>`;

const successPage = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>注册成功</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-green-100 flex items-center justify-center min-h-screen"><div class="bg-white p-8 rounded shadow-md w-full max-w-md text-center"><h1 class="text-2xl font-bold text-green-700 mb-4">注册成功！</h1><p class="text-gray-700 mb-6">欢迎加入，请前往登录。</p><a href="/" class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">去登录</a></div></body></html>`;

const loginSuccessPage = (name) => `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>登录成功</title><script src="https://cdn.tailwindcss.com"></script><script>setTimeout(()=>{window.location.href='/home';},1500);</script></head><body class="bg-blue-100 flex items-center justify-center min-h-screen"><div class="bg-white p-8 rounded shadow-md w-full max-w-md text-center"><h1 class="text-2xl font-bold text-blue-700 mb-4">欢迎回来，${name}！</h1><p class="text-gray-700">登录成功，正在跳转主页...</p><p><a href="/logout" class="text-sm text-red-500 hover:underline">或点此登出</a></p></div></body></html>`;

const homePage = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>主页</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white flex flex-col items-center justify-center min-h-screen gap-4"><h1 class="text-3xl font-bold text-green-700">欢迎访问主页！你已登录。</h1><a href="/logout" class="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">登出</a></body></html>`;

const waitPayPage = (email) => `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>等待付款</title><script src="https://cdn.tailwindcss.com"></script><script>
  async function checkPayment() {
    const resp = await fetch('/check-payment?email=${encodeURIComponent(email)}');
    const data = await resp.json();
    if (data.paid) {
      window.location.href = '/success';
    } else {
      setTimeout(checkPayment, 2000);
    }
  }
  window.onload = checkPayment;
</script></head><body class="bg-yellow-100 flex items-center justify-center min-h-screen"><div class="bg-white p-8 rounded shadow-md w-full max-w-md text-center"><h1 class="text-2xl font-bold text-yellow-700 mb-4">等待付款</h1><p class="text-gray-700 mb-6">请完成付款，支付成功后页面将自动跳转。</p></div></body></html>`;
