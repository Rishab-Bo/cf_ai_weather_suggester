export default {
  async fetch(request, env) {
    // This block handles CORS headers to allow your frontend to call this worker.
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*', // Allow requests from any origin
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // Handle preflight requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (request.method !== 'POST') {
      return new Response('Please send a POST request', { status: 405, headers });
    }

    try {
      // Get the location from the incoming request
      const { location } = await request.json();
      if (!location) {
        return new Response('Please provide a location', { status: 400, headers });
      }

      // Use Cloudflare KV to cache weather data
      const cacheKey = `weather:${location.toLowerCase()}`;
      let weatherData = await env.WEATHER_CACHE.get(cacheKey, { type: 'json' });

      // If data is NOT in the cache, fetch it from the weather API
      if (!weatherData) {
        console.log(`Cache miss for ${location}. Fetching new data.`);
        const weatherResponse = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
        if (!weatherResponse.ok) {
          return new Response('Could not fetch weather data', { status: 500, headers });
        }
        weatherData = await weatherResponse.json();
        // Store the new data in the cache for 1 hour (3600 seconds)
        await env.WEATHER_CACHE.put(cacheKey, JSON.stringify(weatherData), { expirationTtl: 3600 });
      }

      // Use Cloudflare Workers AI
      const { Ai } = await import('@cloudflare/ai');
      const ai = new Ai(env.AI);

      // Create the prompts for the AI model
      const messages = [
        { role: 'system', content: 'You are a friendly assistant that suggests 3-5 fun, creative activities based on the weather. Format your response as a simple list.' },
        { role: 'user', content: `The current weather in ${location} is ${weatherData.current_condition[0].weatherDesc[0].value}. What are some fun activities I can do?` }
      ];

      // Run the AI model
      const aiResponse = await ai.run('@cf/meta/llama-3-8b-instruct', { messages });

      // Combine the weather and AI data into a single response
      const responsePayload = JSON.stringify({ weather: weatherData, activities: aiResponse });
      headers.set('Content-Type', 'application/json');
      return new Response(responsePayload, { headers });

    } catch (e) {
      return new Response(e.message, { status: 500, headers });
    }
  },
};