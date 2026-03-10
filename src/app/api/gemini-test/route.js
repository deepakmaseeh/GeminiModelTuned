const { GoogleAuth } = require("google-auth-library");

// Reuse access token across requests (same serverless instance). Refresh 5 min before expiry.
var tokenCache = null;
var AUTH_CACHE_BUFFER_MS = 5 * 60 * 1000;

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  var authOptions = { scopes: ["https://www.googleapis.com/auth/cloud-platform"] };
  var keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (keyJson && typeof keyJson === "string") {
    try {
      authOptions.credentials = JSON.parse(keyJson);
    } catch (e) {
      throw new Error("Invalid GCP_SERVICE_ACCOUNT_KEY JSON.");
    }
  }
  const auth = new GoogleAuth(authOptions);
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token || (tokenResponse.res && tokenResponse.res.data && tokenResponse.res.data.access_token);
  if (token) {
    tokenCache = { token, expiresAt: Date.now() + (60 * 60 * 1000) - AUTH_CACHE_BUFFER_MS };
  }
  return token || null;
}

function getGenerateContentUrl() {
  var projectId = process.env.PROJECT_ID;
  var location = process.env.VERTEX_LOCATION;
  var endpointId = process.env.VERTEX_ENDPOINT_ID;
  var vertexModel = (process.env.VERTEX_MODEL || "").trim();

  if (endpointId && projectId && location) {
    return "https://" + location + "-aiplatform.googleapis.com/v1/projects/" + projectId + "/locations/" + location + "/endpoints/" + endpointId + ":generateContent";
  }

  if (vertexModel) {
    var m = vertexModel.match(/^projects\/([^/]+)\/locations\/([^/]+)\/models\/(.+)$/);
    if (m) {
      projectId = m[1];
      location = m[2];
      var modelId = m[3];
      return "https://" + location + "-aiplatform.googleapis.com/v1/projects/" + projectId + "/locations/" + location + "/models/" + modelId + ":generateContent";
    }
  }

  var modelId = process.env.GEMINI_MODEL;
  if (projectId && location && modelId) {
    return "https://" + location + "-aiplatform.googleapis.com/v1/projects/" + projectId + "/locations/" + location + "/publishers/google/models/" + modelId + ":generateContent";
  }
  return null;
}

async function POST(request) {
  var generateContentUrl = getGenerateContentUrl();
  if (!generateContentUrl) {
    return Response.json(
      { error: "Missing model config: set VERTEX_MODEL (full resource name) or PROJECT_ID, VERTEX_LOCATION, and GEMINI_MODEL" },
      { status: 500 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const imageFile = formData.get("image");
  const text = formData.get("text");
  const userPrompt = typeof text === "string" ? text.trim() : "";
  const hasImage = imageFile && typeof imageFile.arrayBuffer === "function";

  if (!hasImage && !userPrompt) {
    return Response.json(
      { error: "Send an image and/or a message (text required for chat-only)." },
      { status: 400 }
    );
  }

  let body;
  if (hasImage) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const auctionPrompt = userPrompt || [
    "You are an auction specialist. Analyze this image in detail.",
    "",
    "If the image shows MULTIPLE distinct items (e.g. a group of trading cards, several lots):",
    "1. First give a GROUP SUMMARY in the same format below — **Item name:** e.g. 'Group of 5 Pokémon cards (4 base, 1 rare)'; **Condition:** overall; **Details:** what the group contains; **Market notes:** which item is the standout/rare; **Price:** combined or N/A.",
    "2. Then write exactly: Per-item breakdown:",
    "3. Then for EACH item use the full format below, separated by exactly: --- Next item ---",
    "",
    "If there is only ONE item, use the format once (no group summary).",
    "",
    "Use ONLY this format (include every bold label; write N/A if not visible):",
    "",
    "**Item name:** (One clear line. For groups: describe the group. For single items: add '— Rare' or '— Standout' if top in a group.)",
    "**Condition:** (Overall condition: wear, scratches, completeness, authenticity.)",
    "**Materials:** (e.g. cardstock, paper, wood, ceramic.)",
    "**Dimensions:** (Size if visible.)",
    "**Age/Period:** (Era, set year, or period.)",
    "**Maker/Origin:** (Set name, manufacturer, artist, region.)",
    "**Rarity:** (For trading cards: Common, Uncommon, Rare, Holo, etc. N/A otherwise.)",
    "**Details:** (Full description: style, design, markings, notable features.)",
    "**Damage/Flaws:** (Damage, restoration, missing parts.)",
    "**Market notes:** (Why it might sell, comparables, demand.)",
    "**Price:** (Clear estimate or range in currency. Use N/A only if not estimable.)",
    "",
    "Price is mandatory. Be thorough but concise.",
  ].join("\n");

    body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: auctionPrompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    };
  } else {
    body = {
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    };
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return Response.json(
        { error: "Could not get Google access token. Check GCP_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS." },
        { status: 500 }
      );
    }

    const res = await fetch(generateContentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });

    var data;
    try {
      data = await res.json();
    } catch (e) {
      return Response.json(
        { error: "Vertex AI returned non-JSON. Status: " + res.status },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    if (!res.ok) {
      if (res.status === 429) {
        return Response.json(
          { error: "Service busy. Please try again in a moment." },
          { status: 503 }
        );
      }
      var msg = (data.error && data.error.message) || (data.error && data.error.status) || "Vertex AI request failed";
      if (data.error && data.error.details) msg += " " + JSON.stringify(data.error.details);
      if (process.env.NODE_ENV === "development") console.error("[gemini-test] Vertex error:", res.status, data);
      return Response.json(
        { error: msg, status: res.status },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    let output = "";
    const candidates = data.candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      output = candidates[0].content.parts.map(function (p) { return p.text || ""; }).join("");
    }

    return Response.json({ text: output });
  } catch (err) {
    return Response.json(
      { error: err.message || "Generate failed" },
      { status: 500 }
    );
  }
}

module.exports = { POST };
