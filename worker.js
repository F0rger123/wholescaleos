export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    try {
      // Try to get the asset from the environment
      let response = await env.ASSETS.fetch(request.url);
      
      // If we got a response, return it
      if (response) {
        return response;
      }
      
      // Otherwise, try to serve index.html
      response = await env.ASSETS.fetch(new URL('/index.html', request.url));
      return response;
    } catch (error) {
      // If all else fails, return a simple error
      return new Response(`Error: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};