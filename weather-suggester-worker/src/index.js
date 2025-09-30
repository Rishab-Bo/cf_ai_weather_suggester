export default {
  async fetch(request, env) {
    // This block handles CORS headers to allow your frontend to call this worker.
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // Handles the browser's preflight "OPTIONS" request.
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

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

      // THIS IS THE CORRECTED SECTION
      const messages = [
        { role: 'system', content: 'You are a friendly assistant that suggests 3-5 fun, creative activities based on the weather. Format your response as a simple list.' },
        { role: 'user', content: `The current weather in ${location} is ${weatherData.current_condition[0].weatherDesc[0].value}. What are some fun activities I can do?` }
      ];

      // We now call env.AI directly. We do not import anything.
      const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages });
      // END OF CORRECTED SECTION

      const responsePayload = JSON.stringify({ weather: weatherData, activities: aiResponse });
      headers.set('Content-Type', 'application/json');
      return new Response(responsePayload, { headers });

    } catch (e) {
      return new Response(e.message, { status: 500, headers });
    }
  },
};