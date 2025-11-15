// SatpamCam WebRTC Signaling Server - FIXED
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
        console.log(`📨 ${data.type} from ${data.from}`);
        
        // FIX: Handle missing targetStream
        if (data.type === 'offer') {
          const targetStream = data.targetStream || data.to;
          console.log(`🎯 Looking for stream: ${targetStream}`);
          
          // Find desktop client with matching stream ID
          let targetClient = null;
          for (const [clientId, clientSocket] of clients.entries()) {
            // For now, forward to first available desktop
            // In production, you'd match by stream ID
            if (clientSocket !== socket) { // Don't send to self
              targetClient = clientId;
              break;
            }
          }
          
          if (targetClient) {
            console.log(`✅ Forwarding offer to: ${targetClient}`);
            clients.get(targetClient).send(JSON.stringify({
              ...data,
              targetStream: targetStream,
              from: data.from // Mobile ID
            }));
          } else {
            console.log(`❌ No desktop streamer available`);
            socket.send(JSON.stringify({
              type: 'error',
              message: 'No desktop streamer available'
            }));
          }
        }
        // Forward other messages
        else if (data.to && clients.has(data.to)) {
          clients.get(data.to).send(e.data);
          console.log(`✅ Message forwarded to ${data.to}`);
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
    
    return response;
  }
  
  // HTTP Page
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
        <div>
          <h3>Connected Clients:</h3>
          <ul>
            ${Array.from(clients.keys()).map(id => `<li>${id}</li>`).join('')}
          </ul>
        </div>
      </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });
  }
  
  return new Response("Not Found", { status: 404 });
});
