function maskId(id) {
  if (!id) return null;
  const s = String(id);
  if (s.length <= 8) return s;
  return s.slice(0, 4) + "…" + s.slice(-4);
}

async function GET() {
  const projectId = process.env.PROJECT_ID || null;
  const location = process.env.VERTEX_LOCATION || null;
  const endpointId = process.env.VERTEX_ENDPOINT_ID || null;
  const vertexModel = (process.env.VERTEX_MODEL || "").trim() || null;
  const geminiModel = (process.env.GEMINI_MODEL || "").trim() || null;

  let kind = "unknown";
  let label = "Vertex AI";
  if (endpointId) {
    kind = "endpoint";
    label = "Endpoint • " + maskId(endpointId);
  } else if (vertexModel) {
    kind = "model";
    label = "Model • " + maskId(vertexModel.split("/").pop());
  } else if (geminiModel) {
    kind = "publisher";
    label = geminiModel;
  }

  return Response.json({
    kind,
    label,
    projectId,
    location,
  });
}

module.exports = { GET };
