import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

const clients = new Map<string, WebSocket>();

serve((req) => {
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => console.log("Client connected");

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);

      if (data.type === "register") {
        clients.set(data.id, socket);
        console.log("Registered:", data.id);
      }

      if (data.type === "signal") {
        const target = clients.get(data.target);
        if (target) target.send(JSON.stringify(data));
      }
    } catch (err) {
      console.log("Error:", err);
    }
  };

  socket.onclose = () => {
    for (const [id, ws] of clients.entries()) {
      if (ws === socket) clients.delete(id);
    }
  };

  return response;
});
