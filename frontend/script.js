// FRONTEND script.js
// - particle background
// - clock
// - Web Speech API auto listening for "msa3d"
// - WebSocket client to backend (adjust URL if needed)

const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth;
let H = canvas.height = innerHeight;
window.addEventListener('resize', ()=>{
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
  initParticles();
});

const PARTICLE_COUNT = Math.min(1000, Math.floor((W*H)/14000));
const particles = [];
const DOT_RADIUS = 1.2;

function rand(min,max){return Math.random()*(max-min)+min}

function initParticles(){
  particles.length = 0;
  for(let i=0;i<PARTICLE_COUNT;i++){
    particles.push({
      x: rand(0,W), y: rand(0,H),
      vx: rand(-0.2,0.2), vy: rand(-0.2,0.2),
      size: DOT_RADIUS,
      target: null
    });
  }
}
initParticles();

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = 'white';
  for(const p of particles){
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
  }
}
function step(){
  for(const p of particles){
    if(p.target){
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      p.vx += dx * 0.01;
      p.vy += dy * 0.01;
      p.vx *= 0.92; p.vy *= 0.92;
    } else {
      p.vx += rand(-0.05,0.05);
      p.vy += rand(-0.05,0.05);
      p.vx *= 0.98; p.vy *= 0.98;
    }
    p.x += p.vx;
    p.y += p.vy;
    if(p.x < 0) p.x = W;
    if(p.x > W) p.x = 0;
    if(p.y < 0) p.y = H;
    if(p.y > H) p.y = 0;
  }
}
function loop(){
  step();
  draw();
  requestAnimationFrame(loop);
}
loop();

// CLOCK
const clockLabel = document.getElementById('clock');
const dateLabel = document.getElementById('date');
function updateClock(){
  const now = new Date();
  clockLabel.textContent = now.toLocaleTimeString();
  dateLabel.textContent = now.toLocaleDateString();
}
setInterval(updateClock,1000);
updateClock();

// WebSocket client
let WS_URL = 'ws://localhost:8000/ws';
let ws = null;
const statusSpan = document.getElementById('status');

function connectWS(){
  ws = new WebSocket(WS_URL);
  ws.onopen = ()=>{statusSpan.textContent = 'WS: connected'}
  ws.onclose = ()=>{statusSpan.textContent = 'WS: disconnected'; setTimeout(connectWS,1500)}
  ws.onerror = ()=>{statusSpan.textContent = 'WS: error'}
  ws.onmessage = (ev)=>{
    try{
      const data = JSON.parse(ev.data);
      if(data.action === 'shape' && data.points){
        applyShapeTargets(data.points);
      }
    }catch(e){console.warn('invalid ws msg', e)}
  }
}
connectWS();

function applyShapeTargets(points){
  const mapped = points.map(p => ({x: p.x * W, y: p.y * H}));
  for(let i=0;i<particles.length;i++){
    particles[i].target = mapped[i % mapped.length];
  }
}

// VOICE: auto start listening
let recognition=null;
if(window.webkitSpeechRecognition || window.SpeechRecognition){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e)=>{
    const text = e.results[0][0].transcript.toLowerCase();
    console.log('heard:', text);

    if (
      text.includes('msa3d') ||
      text.includes('msa 3d') ||
      text.includes('msa three d') ||
      text.includes('m s a 3 d') ||
      text.includes('m s a three d')
    ) {
      statusSpan.textContent = 'Voice: MSA3D detected ✅';
      const shape = document.getElementById('shapeSelect').value;
      if(ws && ws.readyState === WebSocket.OPEN){
        ws.send(JSON.stringify({cmd:'wake', trigger:'msa3d', shape}));
      }
    } else {
      statusSpan.textContent = 'Voice: heard -> ' + text;
    }
  };

  recognition.onerror = (e)=>{console.warn(e); statusSpan.textContent = 'Voice error';}
  recognition.onend = ()=>{ recognition.start(); };
  recognition.start(); // auto start
} else {
  statusSpan.textContent = 'Voice: not supported in this browser';
}
