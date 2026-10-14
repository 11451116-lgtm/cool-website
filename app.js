/* Connects Vantage's upload screen to the local AI analysis service. */
// A relative URL works locally and after this site is deployed to a public host.
const analyzeUrl = "/analyze";

function setReport(result) {
  const game = result.game || "Unknown game";
  const overall = Number(result.overall_score || 0).toFixed(1);
  const skillCards = document.querySelectorAll(".skill");
  const skills = result.skills || {};
  const values = [skills.aim_mechanics, skills.game_sense, skills.decision_making];

  document.querySelector(".game-card h2").textContent = game.toUpperCase();
  document.querySelector(".overall .score").innerHTML = `${overall}<small>/10</small>`;
  document.querySelector(".score-label").innerHTML = `${result.rank || "Developing"}<br><span>${result.rank_detail || "Based on this clip"}</span>`;
  document.querySelector(".game-card p").textContent = result.match_meta || "Gameplay clip analyzed";

  values.forEach((value, index) => {
    const score = Math.max(0, Math.min(10, Number(value?.score || 0)));
    const card = skillCards[index];
    card.querySelector(".number").textContent = score.toFixed(1);
    card.querySelector(".track i").style.width = `${score * 10}%`;
    card.querySelector("p").textContent = value?.comment || "No reliable observation available from this clip.";
  });

  const tips = result.improvements || [];
  document.querySelectorAll(".tip").forEach((tip, index) => {
    const item = tips[index];
    if (!item) return;
    tip.querySelector("h3").textContent = item.title;
    tip.querySelector("p").textContent = item.detail;
  });
}

async function sampleFrames(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () => reject(new Error("This video could not be read."));
  });

  const canvas = document.createElement("canvas");
  const longest = 1280;
  const ratio = Math.min(1, longest / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * ratio);
  canvas.height = Math.round(video.videoHeight * ratio);
  const context = canvas.getContext("2d");
  const count = 12;
  const frames = [];
  for (let i = 0; i < count; i++) {
    const time = Math.min(video.duration - 0.05, Math.max(0, (video.duration * (i + 0.5)) / count));
    video.currentTime = time;
    await new Promise((resolve, reject) => {
      video.onseeked = resolve;
      video.onerror = () => reject(new Error("Unable to sample this video."));
    });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL("image/jpeg", 0.78));
  }
  URL.revokeObjectURL(url);
  return frames;
}

async function startAnalysis(file) {
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    alert("Please choose a video file.");
    return;
  }
  document.getElementById("fileName").textContent = file.name;
  box.classList.add("hidden");
  analyzing.classList.remove("hidden");
  try {
    const frames = await sampleFrames(file);
    const response = await fetch(analyzeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frames, language: document.getElementById("language").value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Analysis failed.");
    setReport(result);
    saveHistory(file.name, result.game, result.overall_score);
    go("report");
  } catch (error) {
    const mock = createMockReport(file.name);
    setReport(mock);
    saveHistory(file.name, `${mock.game} — MOCK`, mock.overall_score);
    go("report");
  } finally {
    analyzing.classList.add("hidden");
    box.classList.remove("hidden");
    input.value = "";
  }
}

function createMockReport(fileName) {
  const normalized = fileName.toLowerCase();
  const game = normalized.includes("brawl") ? "Brawl Stars — mock result" : "Gameplay — mock result";
  const seed = [...fileName].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const score = value => Math.min(9.4, Math.max(4.8, +((5 + ((seed * value) % 42) / 10).toFixed(1))));
  return {
    game,
    match_meta: "Practice report · This clip was not analyzed by AI",
    overall_score: score(7),
    rank: "Mock coaching example",
    rank_detail: "Connect AI analysis for a real result",
    skills: {
      aim_mechanics: { score: score(3), comment: "Mock feedback: use this area to preview how an aim and mechanics observation will appear." },
      game_sense: { score: score(5), comment: "Mock feedback: a real analysis would use the match flow to review positioning and awareness." },
      decision_making: { score: score(9), comment: "Mock feedback: a real analysis would review your choices at important moments." }
    },
    improvements: [
      { title: "Mock focus: review your positioning", detail: "This sample shows the type of specific positioning advice the AI will create once the service is connected." },
      { title: "Mock focus: time your engagement", detail: "Use this example to preview an actionable timing recommendation for a future match." },
      { title: "Mock focus: protect your resources", detail: "The real service will tailor this advice to the abilities, ammunition, or utility visible in the clip." },
      { title: "Mock report only", detail: "These scores and comments are placeholders. They are not based on your video." }
    ]
  };
}

function saveHistory(name, game = "Unknown game", score = "—") {
  const item = document.createElement("article");
  item.className = "card history-item";
  item.innerHTML = `<div class="thumb">V</div><div class="history-info"><h3>${name.replace(/</g, "&lt;")}</h3><p>${game.toUpperCase()} · TODAY · ${Number(score).toFixed(1)}/10</p></div><div class="history-score">${Number(score).toFixed(1)}</div>`;
  document.getElementById("emptyHistory").style.display = "none";
  document.getElementById("historyList").prepend(item);
}

// Never present the old demonstration values as if they were real analysis.
document.querySelector(".game-card h2").textContent = "AWAITING CLIP";
document.querySelector(".game-card p").textContent = "Upload a clip for real game detection";
document.querySelector(".overall .score").innerHTML = "—<small>/10</small>";
