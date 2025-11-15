// SatpamCam WebRTC Signaling Server
const clients = new Map();

console.log("🚀 SatpamCam Server starting...");

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  
  // Handle WebSocket connections
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      const id = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      clients.set(id, socket);
      socket.send(JSON.stringify({ type: "id", id }));
      console.log(`✅ Client connected: ${id}`);
      console.log(`📊 Total clients: ${clients.size}`);
    };
    
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`📨 ${data.type} from ${data.from} to ${data.to}`);
        
        // Forward message ke target client
        if (data.to && clients.has(data.to)) {
          clients.get(data.to).send(e.data);
          console.log(`✅ Message forwarded to ${data.to}`);
        } else if (data.to) {
          console.log(`❌ Target not found: ${data.to}`);
        }
      } catch (err) {
        console.error("❌ Message error:", err);
      }
    };
    
    socket.onclose = () => {
      clients.forEach((client, id) => {
        if (client === socket) {
          clients.delete(id);
          console.log(`🔌 Client disconnected: ${id}`);
          console.log(`📊 Remaining clients: ${clients.size}`);
        }
      });
    };
    
    socket.onerror = (e) => {
      console.error("❌ WebSocket error:", e);
    };
    
    return response;
  }
  
  // HTTP Page - Untuk test
  if (url.pathname === "/") {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SatpamCam Signaling Server</title>
        <style>
          body { font-family: Arial; margin: 40px; background: #1e1e1e; color: white; }
          .status { padding: 20px; background: #2d2d2d; border-radius: 10px; margin: 20px 0; }
          .connected { color: #4CAF50; }
        </style>
      </head>
      <body>
        <h1>🎥 SatpamCam Signaling Server</h1>
        <div class="status">
          <h3>Status: <span class="connected">RUNNING</span></h3>
          <p><strong>Connected Clients:</strong> ${clients.size}</p>
          <p><strong>Server:</strong> Deno Deploy (Free)</p>
          <p><strong>URL:</strong> ${req.url}</p>
        </div>
        <p>Server ready untuk WebRTC signaling antara Desktop dan Mobile.</p>
      </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });
  }
  
  // Health check endpoint
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({
      status: "ok",
      clients: clients.size,
      timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
  }
  
  return new Response("Not Found", { status: 404 });
});
