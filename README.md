# AI-Powered Weather and Activity Suggester

This project is an AI-powered application built entirely on the Cloudflare serverless platform. It provides real-time weather information for a user-specified location and leverages a Large Language Model (LLM) to generate creative activity suggestions based on the current weather conditions.

This project was built to meet the requirements of the Cloudflare AI-powered application assignment.

---

## Deployed Application

**The easiest way to try out the application is via the deployed link:**

**https://cf-ai-weather-suggester.pages.dev/**

Simply visit the URL, type in a city name (e.g., "Tokyo" or "New York"), and click "Get Suggestions".

---

## Project Documentation

### Core Components

The application is built using the following Cloudflare components as specified in the assignment:

*   **LLM:** The application uses **Llama 3.3 (8B Instruct Model)**, which is accessed via the **Cloudflare Workers AI** binding (`env.AI`). This model is responsible for generating context-aware activity suggestions.

*   **Workflow / Coordination:** A **Cloudflare Worker** (`weather-suggester-worker`) serves as the backend API. It handles incoming POST requests, fetches data from an external weather API, caches the response, and then queries the Workers AI model with a dynamically generated prompt.

*   **User Input via Chat:** The user interface is a static HTML page hosted on **Cloudflare Pages**. It provides a simple input field for the user to enter a location. Communication with the backend happens via a `fetch` API call.

*   **Memory or State:** To improve performance and avoid redundant API calls, the application uses **Cloudflare KV** for state management. Weather data for a specific location is cached for one hour. Subsequent requests for the same location within that hour will read from the cache instead of fetching new data.

### Project Architecture

1.  A user enters a location on the Cloudflare Pages frontend and clicks the "Get Suggestions" button.
2.  The frontend sends a `POST` request containing the location to the deployed Cloudflare Worker URL.
3.  The Worker first checks its Cloudflare KV namespace for a cached weather report for that location.
4.  If a valid cache entry is not found, the Worker fetches real-time weather data from a free external API (`wttr.in`).
5.  The new weather data is stored in the KV namespace with a 1-hour time-to-live (TTL).
6.  The Worker constructs a prompt using the location and weather description (e.g., "The weather in London is Overcast. What are some fun activities?").
7.  This prompt is sent to the Llama 3.3 model via the Workers AI binding.
8.  The Worker combines the weather data and the AI's response into a single JSON object.
9.  This JSON object is returned to the frontend, which then parses it and displays the formatted results to the user.

---

## Running Instructions (Local Setup)

If you wish to run the components locally, you will need `node.js`, `npm`, and the `wrangler` CLI installed.

### 1. Run the Backend Worker Locally

The Worker script handles the core logic.

```powershell
# 1. Navigate to the worker's directory
cd weather-suggester-worker

# 2. Start the local development server for the worker
wrangler dev
```

This will start a local server, typically on `http://localhost:8787`. Keep this terminal window open.

### 2. Run the Frontend Locally

The frontend is a simple HTML file. You can serve it with any local web server. A common method is using `npx serve`.

```powershell
# 1. Open a NEW, separate terminal window.

# 2. Navigate to the frontend's directory
cd weather-suggester-frontend

# 3. Use npx to serve the folder's contents
npx serve
```

This will start a second server, typically on `http://localhost:3000`.

### 3. Connect Local Frontend to Local Backend

1.  Open the `index.html` file located in the `weather-suggester-frontend` folder.
2.  Find the `fetch` command in the `<script>` tag.
3.  Temporarily change the URL to your local worker's URL:
    ```javascript
    const response = await fetch('http://localhost:8787', {
    ```
4.  Save the file.
5.  Now, open `http://localhost:3000` in your web browser. The local frontend will now be able to communicate with the local backend worker, and the application will be fully functional on your machine.