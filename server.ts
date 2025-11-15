// 📁 server.ts - Deno Deploy Version
import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

// CORS middleware
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  await next();
});

// Simple WebSocket signaling (PeerJS replacement)
const connections = new Map<string, WebSocket>();

router.get("/ws", (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501);
  }
  
  const ws = ctx.upgrade();
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  connections.set(clientId, ws);
  
  ws.onopen = () => {
    console.log(`🔗 Client connected: ${clientId}`);
    ws.send(JSON.stringify({ type: "welcome", clientId }));
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Relay messages to other clients
      if (data.targetId && connections.has(data.targetId)) {
        connections.get(data.targetId)!.send(JSON.stringify({
          ...data,
          senderId: clientId
        }));
      }
    } catch (error) {
      console.error("Message error:", error);
    }
  };
  
  ws.onclose = () => {
    console.log(`🔌 Client disconnected: ${clientId}`);
    connections.delete(clientId);
  };
  
  ws.onerror = (error) => {
    console.error(`❌ WebSocket error: ${error}`);
  };
});

// Health check
router.get("/", (ctx) => {
  ctx.response.body = {
    status: "SatpamCam Signaling Server",
    clients: connections.size,
    timestamp: new Date().toISOString()
  };
});

// License validation endpoint
router.post("/api/validate", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { licenseKey } = body;
    
    // Simple validation - bisa extend dengan database
    const isValid = licenseKey && licenseKey.startsWith("DIVIACODE-");
    
    ctx.response.body = {
      valid: isValid,
      streamId: isValid ? `satpam-${licenseKey}` : null,
      message: isValid ? "License valid" : "License invalid"
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = Deno.env.get("PORT") || "8000";
console.log(`🚀 SatpamCam Server running on port ${PORT}`);

await app.listen({ port: parseInt(PORT) });
