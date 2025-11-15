// Simple WebSocket server untuk WebRTC signaling
const clients = new Map();

Deno.serve((req: Request) => {
  // Handle WebSocket connections
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      const id = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      clients.set(id, socket);
      socket.send(JSON.stringify({ type: "id", id }));
      console.log(`✅ Client connected: ${id}`);
    };
    
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`📨 Message from ${data.from} to ${data.to}`);
        
        // Forward message ke target client
        if (data.to && clients.has(data.to)) {
          clients.get(data.to).send(e.data);
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
        }
      });
    };
    
    return response;
  }
  
  // Return simple response untuk HTTP requests
  return new Response(`
    <html>
      <body>
        <h1>WebRTC Signaling Server</h1>
        <p>Clients connected: ${clients.size}</p>
        <p>Gunakan WebSocket connection untuk signaling.</p>
      </body>
    </html>
  `, { headers: { "Content-Type": "text/html" } });
});
