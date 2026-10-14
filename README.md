# Vantage: public gameplay analysis website

This folder is now a deployable website, not just a local HTML file. The server hosts the webpage and handles the AI analysis endpoint, so players only need to visit your public link and upload a clip.

## Test it on your computer

```powershell
cd C:\Users\tobyt\Documents\Codex\2026-10-01\so-x20\outputs
$env:OPENAI_API_KEY = "your_api_key_here"
npm start
```

Open `http://localhost:8787` in a browser. Do not open `index.html` directly anymore.

## Put it online for other players

Deploy this folder to any Node.js host that supports environment variables and a start command (for example, Render, Railway, Fly.io, or a VPS). Configure these values in the host dashboard:

| Setting | Value |
| --- | --- |
| Build command | none |
| Start command | `npm start` |
| Environment variable | `OPENAI_API_KEY` = your OpenAI API key |

The host provides `PORT` automatically. After deployment, share the public URL; visitors do not need Node.js, an API key, or a local service.

Never put your API key in `index.html` or `app.js`. The browser sends sampled video frames—not the full video—to your hosted server, which securely calls the AI service. The analysis uses image inputs because the OpenAI Responses API accepts image URLs or Base64 image data. See the official [Images and vision guide](https://developers.openai.com/api/docs/guides/images-vision).
