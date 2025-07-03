/**
 * Vercel Edge Function - API 代理
 * 
 * 功能：
 * - 接收来自前端的请求。
 * - 从环境变量中安全地获取 API Key。
 * - 将请求体和头部原样转发到真正的 AI 服务提供商。
 * - 将 AI 服务的响应（包括流式响应）返回给前端。
 * - 隐藏真实的 API Key 和目标 URL，保障安全。
 */
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // 从环境变量中安全地获取配置
  const apiKey = process.env.AI_PROXY_API_KEY;
  const targetBaseUrl = process.env.AI_PROXY_TARGET_BASE_URL;

  if (!apiKey || !targetBaseUrl) {
    return new Response(
      JSON.stringify({ error: 'API proxy is not configured correctly on the server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 获取前端请求的 body
  const requestBody = await request.json();

  // 构造发往目标 AI 服务的请求
  const apiRequest = new Request(`${targetBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      // 可以在这里添加其他需要的头部
    },
    body: JSON.stringify(requestBody),
  });

  try {
    // 发起请求并等待响应
    const apiResponse = await fetch(apiRequest);

    // 直接将目标服务的响应（包括头部和状态码）流式返回给前端
    return new Response(apiResponse.body, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: apiResponse.headers,
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while proxying the request.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
