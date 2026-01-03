let currentUser = null;
let currentBoard = null;
let currentMood = null;

const emotions = {
  highPositive:["Joyful","Confident","Inspired","Grateful","Loved","Hopeful","Excited","Proud"],
  lowPositive:["Calm","Content","Relieved","Peaceful","Comforted","Safe","Optimistic","Balanced"],
  highNegative:["Angry","Anxious","Overwhelmed","Jealous","Panicked","Hopeless","Frustrated","Hurt"],
  lowNegative:["Sad","Lonely","Tired","Numb","Unmotivated","Insecure","Drained","Disconnected"]
};

function goTo(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showInfo(){
  alert(`Hey cool person! Welcome to Feelings of Life. Here you can track your emotions and journal. Honestly this is a good way to remember memories, vent, and keep track of life.

Now here's how it works:
1. Your login username & password MUST be remembered. This is the only way to keep track. Don't worry, no personal info is asked. All safe unless you share your password.
2. Unlock admin mode to access extra functions. Original password: admin123. Feel free to change it.
3. Data only saves per device; this is not online, so sharing is limited.

Have fun & share with your friends!`);
}

function login(){
  const u=document.getElementById('username').value;
  const p=document.getElementById('password').value;
  if(!u||!p) return alert("Username & password required");
  let data=JSON.parse(localStorage.getItem(u));
  if(!data){
    data={password:p,emotions:[],boards:{},locks:{},adminPass:"admin123"};
    localStorage.setItem(u,JSON.stringify(data));
  }else if(data.password!==p){ return alert("Wrong password"); }
  currentUser=u;
  goTo('survey');
}

function selectMood(m){
  currentMood=m;
  const grid=document.getElementById('emotionGrid');
  grid.innerHTML="";
  emotions[m].forEach(e=>{
    const b=document.createElement("button");
    b.textContent=e;
    b.className=m==="highPositive"?"hp":m==="lowPositive"?"lp":m==="highNegative"?"hn":"ln";
    b.onclick=()=>saveEmotion(e);
    grid.appendChild(b);
  });
  goTo('emotions');
}

function saveEmotion(e){
  const d=JSON.parse(localStorage.getItem(currentUser));
  d.emotions.push({emotion:e,mood:currentMood,date:new Date().toISOString()});
  localStorage.setItem(currentUser,JSON.stringify(d));
  goTo('boards');
}

function openBoard(b){
  currentBoard=b;
  document.getElementById('boardTitle').textContent=b;
  applyLock();
  loadPosts();
  goTo('boardPage');
}

function applyLock(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  const locked=d.locks[currentBoard];
  document.getElementById('boardInput').style.display=locked?"none":"block";
  document.getElementById('posts').innerHTML=locked?"<p>🔒 This board is locked.</p>":"";
}

function toggleLock(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  if(!d.locks[currentBoard]){
    const p=prompt("Set board password:");
    if(!p) return;
    d.locks[currentBoard]=p;
  }else{
    const p=prompt("Enter board password:");
    if(p===d.locks[currentBoard]) delete d.locks[currentBoard];
    else return alert("Wrong password");
  }
  localStorage.setItem(currentUser,JSON.stringify(d));
  applyLock();
}

function savePost(){
  const t=document.getElementById('boardInput').value;
  if(!t) return;
  const d=JSON.parse(localStorage.getItem(currentUser));
  if(!d.boards[currentBoard]) d.boards[currentBoard]=[];
  d.boards[currentBoard].push({text:t,time:new Date().toLocaleString()});
  localStorage.setItem(currentUser,JSON.stringify(d));
  document.getElementById('boardInput').value="";
  loadPosts();
}

function loadPosts(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  const div=document.getElementById('posts');
  if(d.locks[currentBoard]) return;
  div.innerHTML="";
  (d.boards[currentBoard]||[]).forEach(p=>{
    div.innerHTML+=`<div class="post">${p.text}<br><small>${p.time}</small></div>`;
  });
}

function drawCharts(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  const ctx=document.getElementById("emotionChart").getContext("2d");
  const counts={highPositive:0,lowPositive:0,highNegative:0,lowNegative:0};
  d.emotions.forEach(e=>counts[e.mood]++);
  let total=Object.values(counts).reduce((a,b)=>a+b,0);
  let start=0;
  const colors={highPositive:"#eee993",lowPositive:"#a0d39a",highNegative:"#a45c5c",lowNegative:"#85acd1"};
  ctx.clearRect(0,0,300,300);
  Object.keys(counts).forEach(k=>{
    const slice=(counts[k]/total)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(150,150);
    ctx.arc(150,150,120,start,start+slice);
    ctx.fillStyle=colors[k];
    ctx.fill();
    start+=slice;
  });
  const wCtx=document.getElementById("weeklyChart").getContext("2d");
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const weekly={highPositive:[],lowPositive:[],highNegative:[],lowNegative:[]};
  days.forEach(()=>{weekly.highPositive.push(0);weekly.lowPositive.push(0);weekly.highNegative.push(0);weekly.lowNegative.push(0);});
  d.emotions.forEach(e=>{
    const day=new Date(e.date).getDay();
    weekly[e.mood][day]++;
  });
  wCtx.clearRect(0,0,300,200);
  const barWidth=35;
  days.forEach((day,i)=>{
    let x=i*barWidth+15;
    Object.keys(weekly).forEach((k,j)=>{
      wCtx.fillStyle=colors[k];
      wCtx.fillRect(x,j*8,barWidth/2,weekly[k][i]*8);
    });
  });
}

function buildCalendar(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  const grid=document.getElementById("calendarGrid");
  grid.innerHTML="";
  d.emotions.forEach(e=>{
    const b=document.createElement("button");
    b.textContent=new Date(e.date).toDateString()+" – "+e.emotion;
    b.className=e.mood==="highPositive"?"hp":e.mood==="lowPositive"?"lp":e.mood==="highNegative"?"hn":"ln";
    grid.appendChild(b);
  });
}

function adminLogin(){
  const p=document.getElementById("adminPass").value;
  const d=JSON.parse(localStorage.getItem(currentUser));
  const saved=d.adminPass || "admin123";
  if(p===saved) document.getElementById("adminPanel").classList.remove("hidden");
  else alert("Wrong admin password");
}

function changeAdminPass(){
  const p=prompt("New admin password:");
  if(p){
    const d=JSON.parse(localStorage.getItem(currentUser));
    d.adminPass=p;
    localStorage.setItem(currentUser,JSON.stringify(d));
  }
}

function resetData(){
  if(confirm("Delete ALL data?")) localStorage.clear();
}

document.getElementById("history")?.addEventListener("click",drawCharts);
document.getElementById("calendar")?.addEventListener("click",buildCalendar);
