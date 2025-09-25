import uvicorn
import math
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# WebSocket connection manager (single client)
class ConnectionManager:
    def __init__(self):
        self.active: WebSocket | None = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active = websocket

    def disconnect(self):
        self.active = None

    async def send(self, message: dict):
        if self.active:
            await self.active.send_text(json.dumps(message))

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "MSA3D WebSocket server is running 🚀. Connect to /ws"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except Exception:
                payload = {"raw": data}

            cmd = payload.get("cmd")

            if cmd == "wake":
                shape = payload.get("shape", "circle")
                points = generate_shape_points(shape, count=200)
                await manager.send({
                    "action": "shape",
                    "shape": shape,
                    "points": points
                })
            else:
                # fallback: echo the received payload
                await manager.send({"action": "echo", "received": payload})

    except WebSocketDisconnect:
        manager.disconnect()


def generate_shape_points(shape: str = "circle", count: int = 200):
    pts = []
    if shape == "circle":
        for i in range(count):
            t = (i / count) * (2 * math.pi)
            x = 0.5 + 0.35 * math.cos(t)
            y = 0.5 + 0.35 * math.sin(t)
            pts.append({"x": x, "y": y})
    elif shape == "square":
        for i in range(count):
            side = i % 4
            t = (i / count) * 4
            if side == 0:
                x, y = 0.2 + 0.6 * t, 0.2
            elif side == 1:
                x, y = 0.8, 0.2 + 0.6 * t
            elif side == 2:
                x, y = 0.8 - 0.6 * t, 0.8
            else:
                x, y = 0.2, 0.8 - 0.6 * t
            pts.append({"x": x, "y": y})
    elif shape == "rectangle":
        w, h = 0.6, 0.35
        cx, cy = 0.5, 0.5
        for i in range(count):
            t = i / count
            if t < 0.25:
                x = cx - w/2 + (t/0.25)*w
                y = cy - h/2
            elif t < 0.5:
                x = cx + w/2
                y = cy - h/2 + ((t-0.25)/0.25)*h
            elif t < 0.75:
                x = cx + w/2 - ((t-0.5)/0.25)*w
                y = cy + h/2
            else:
                x = cx - w/2
                y = cy + h/2 - ((t-0.75)/0.25)*h
            pts.append({"x": x, "y": y})
    else:
        # scatter default
        for i in range(count):
            pts.append({"x": (i % 20) / 20, "y": (i // 20) / 20})
    return pts


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
