export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    try {
      // Try to serve the requested asset first
      let response = await env.ASSETS.fetch(request);
      
      // If the asset exists, return it
      if (response.status !== 404) {
        return response;
      }
      
      // Otherwise, serve index.html for SPA routing
      response = await env.ASSETS.fetch(new URL('/index.html', request.url));
      return new Response(response.body, {
        ...response,
        headers: {
          ...response.headers,
          'Content-Type': 'text/html',
        },
      });
    } catch (error) {
      // If everything fails, try to serve index.html directly
      try {
        const indexResponse = await env.ASSETS.fetch(new URL('/index.html', request.url));
        return new Response(indexResponse.body, {
          ...indexResponse,
          headers: {
            ...indexResponse.headers,
            'Content-Type': 'text/html',
          },
        });
      } catch (e) {
        return new Response('Application Error', { status: 500 });
      }
    }
  }
};