import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const clients = new Map();

serve(async (req) => {
  const url = new URL(req.url);
  
  if (url.pathname === "/ws") {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      const id = `peer_${Date.now()}`;
      clients.set(id, socket);
      socket.send(JSON.stringify({ type: "id", id }));
      console.log(`Client connected: ${id}`);
    };
    
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`Message from ${data.from} to ${data.to}`);
        
        if (data.to && clients.has(data.to)) {
          clients.get(data.to).send(e.data);
        }
      } catch (err) {
        console.error("Message error:", err);
      }
    };
    
    socket.onclose = () => {
      clients.forEach((client, id) => {
        if (client === socket) {
          clients.delete(id);
          console.log(`Client disconnected: ${id}`);
        }
      });
    };
    
    socket.onerror = (e) => {
      console.error("WebSocket error:", e);
    };
    
    return response;
  }
  
  return new Response("WebRTC Signaling Server");
});
