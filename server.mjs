import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PORT = process.env.PORT || 8787;
const apiKey = process.env.OPENAI_API_KEY;
const root = path.dirname(fileURLToPath(import.meta.url));

const prompt = `You are Vantage, an expert gameplay coach. Review the supplied chronological gameplay frames. Identify the game ONLY if it is visually evident. Give specific, evidence-based coaching about what happens in this clip. Do not invent events, game modes, rounds, abilities, ranks, or moments that cannot be seen. Return valid JSON only in this exact schema:
{
  "game":"string",
  "match_meta":"short factual description",
  "overall_score":number from 0 to 10,
  "rank":"short skill label",
  "rank_detail":"short reason",
  "skills":{
    "aim_mechanics":{"score":number,"comment":"specific evidence-based comment"},
    "game_sense":{"score":number,"comment":"specific evidence-based comment"},
    "decision_making":{"score":number,"comment":"specific evidence-based comment"}
  },
  "improvements":[
    {"title":"specific improvement","detail":"actionable advice tied to evidence"},
    {"title":"specific improvement","detail":"actionable advice tied to evidence"},
    {"title":"specific improvement","detail":"actionable advice tied to evidence"},
    {"title":"strength shown","detail":"a genuine strength seen in the clip"}
  ]
}`;

function reply(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET") {
    const files = { "/": ["index.html", "text/html; charset=utf-8"], "/index.html": ["index.html", "text/html; charset=utf-8"], "/app.js": ["app.js", "text/javascript; charset=utf-8"] };
    const requested = files[url.pathname];
    if (!requested) return reply(res, 404, { error: "Not found" });
    try {
      const asset = await readFile(path.join(root, requested[0]));
      res.writeHead(200, { "Content-Type": requested[1], "Cache-Control": "no-store" });
      return res.end(asset);
    } catch { return reply(res, 500, { error: "Could not load website files." }); }
  }
  if (req.method !== "POST" || url.pathname !== "/analyze") return reply(res, 404, { error: "Not found" });
  if (!apiKey) return reply(res, 503, { error: "OPENAI_API_KEY is not configured on the analysis service." });
  let raw = "";
  req.setEncoding("utf8");
  req.on("data", chunk => { raw += chunk; if (raw.length > 35_000_000) req.destroy(); });
  req.on("end", async () => {
    try {
      const { frames, language = "en" } = JSON.parse(raw);
      if (!Array.isArray(frames) || !frames.length) return reply(res, 400, { error: "No video frames were received." });
      const languagePrompt = `${prompt}\nWrite every user-facing comment and title in ${language === "zh" ? "Traditional Chinese" : language === "ja" ? "Japanese" : language === "es" ? "Spanish" : "English"}.`;
      const input = [{ type: "input_text", text: languagePrompt }, ...frames.map(image_url => ({ type: "input_image", image_url, detail: "high" }))];
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-6-astra", input: [{ role: "user", content: input }], text: { format: { type: "json_object" } } })
      });
      const data = await response.json();
      if (!response.ok) return reply(res, response.status, { error: data.error?.message || "The AI service returned an error." });
      reply(res, 200, JSON.parse(data.output_text));
    } catch (error) {
      reply(res, 500, { error: error.message || "The analysis service could not process this clip." });
    }
  });
});
server.listen(PORT, () => console.log(`Vantage analysis service listening at http://localhost:${PORT}`));
