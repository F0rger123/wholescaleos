export default {
  async fetch(request, env) {
    try {
      // Just serve index.html for all requests
      const url = new URL('/index.html', request.url);
      return await env.ASSETS.fetch(url);
    } catch (error) {
      return new Response('Application Error: ' + error.message, { status: 500 });
    }
  }
}