export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Serve static assets from the assets directory
    if (url.pathname.startsWith('/assets/')) {
      return env.ASSETS.fetch(request);
    }
    
    // For all other routes, serve index.html (SPA routing)
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }
}