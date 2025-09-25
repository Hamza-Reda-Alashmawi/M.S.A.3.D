// simple WebSocket server (node)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

function generateShape(shape='circle', count=200){
  const pts=[];
  if(shape==='circle'){
    for(let i=0;i<count;i++){
      const t = (i/count)*(Math.PI*2);
      pts.push({x: 0.5 + 0.35*Math.cos(t), y: 0.5 + 0.35*Math.sin(t)});
    }
  } else if(shape==='square'){
    const n = Math.floor(count/4)||1;
    for(let i=0;i<n;i++) pts.push({x:0.2 + 0.6*(i/n), y:0.2});
    for(let i=0;i<n;i++) pts.push({x:0.8, y:0.2+0.6*(i/n)});
    for(let i=0;i<n;i++) pts.push({x:0.8-0.6*(i/n), y:0.8});
    for(let i=0;i<n;i++) pts.push({x:0.2, y:0.8-0.6*(i/n)});
    while(pts.length<count) pts.push(...pts);
    pts.length = count;
  } else if(shape==='rectangle'){
    const w = 0.6, h = 0.35, cx = 0.5, cy = 0.5;
    const n = Math.floor(count/4)||1;
    for(let i=0;i<n;i++) pts.push({x:cx-w/2 + w*(i/n), y:cy-h/2});
    for(let i=0;i<n;i++) pts.push({x:cx+w/2, y:cy-h/2 + h*(i/n)});
    for(let i=0;i<n;i++) pts.push({x:cx+w/2 - w*(i/n), y:cy+h/2});
    for(let i=0;i<n;i++) pts.push({x:cx-w/2, y:cy+h/2 - h*(i/n)});
    while(pts.length<count) pts.push(...pts);
    pts.length = count;
  } else {
    for(let i=0;i<count;i++) pts.push({x: (i%20)/20, y: ((i/20)|0 % 20)/20});
  }
  return pts;
}
// ...existing code...

wss.on('connection', ws => {
  console.log('client connected');
  ws.on('message', message => {
    try{
      const payload = JSON.parse(message);
      if(payload.cmd === 'wake' || payload.cmd === 'shape'){
        const shape = payload.shape || 'circle';
        const points = generateShape(shape, 200);
        ws.send(JSON.stringify({action:'shape', shape, points}));
      } else {
        ws.send(JSON.stringify({action:'echo', received: payload}));
      }
    }catch(e){
      ws.send(JSON.stringify({action:'error', msg: 'invalid payload'}));
    }
  });
  ws.on('close', ()=>console.log('client disconnected'));
});

console.log('WS server running on ws://localhost:3000');
