export default {
  async fetch(request, env) {
    // This block handles CORS headers to allow your frontend to call this worker.
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // THIS IS THE CRITICAL PART FOR YOUR ERROR.
    // It handles the browser's preflight "OPTIONS" request.
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // The rest of your code handles the actual "POST" request.
    if (request.method !== 'POST') {
      return new Response('Please send a POST request', { status: 405, headers });
    }

    try {
      const { location } = await request.json();
      if (!location) {
        return new Response('Please provide a location', { status: 400, headers });
      }

      const cacheKey = `weather:${location.toLowerCase()}`;
      let weatherData = await env.WEATHER_CACHE.get(cacheKey, { type: 'json' });

      if (!weatherData) {
        const weatherResponse = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
        if (!weatherResponse.ok) return new Response('Could not fetch weather data', { status: 500, headers });
        weatherData = await weatherResponse.json();
        await env.WEATHER_CACHE.put(cacheKey, JSON.stringify(weatherData), { expirationTtl: 3600 });
      }

      const { Ai } = await import('@cloudflare/ai');
      const ai = new Ai(env.AI);
      const messages = [
        { role: 'system', content: 'You are a friendly assistant that suggests 3-5 fun, creative activities based on the weather. Format your response as a simple list.' },
        { role: 'user', content: `The current weather in ${location} is ${weatherData.current_condition[0].weatherDesc[0].value}. What are some fun activities I can do?` }
      ];
      const aiResponse = await ai.run('@cf/meta/llama-3-8b-instruct', { messages });

      const responsePayload = JSON.stringify({ weather: weatherData, activities: aiResponse });
      headers.set('Content-Type', 'application/json');
      return new Response(responsePayload, { headers });

    } catch (e) {
      return new Response(e.message, { status: 500, headers });
    }
  },
};