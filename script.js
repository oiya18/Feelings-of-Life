/* Refined admin control and recovery helpers added.
   All original functionality preserved; added:
   - runtime error handlers to surface exceptions
   - defensive checks before using canvas/getContext
   - a few console.log calls to help trace execution
*/

(function(){
  // Global error reporting to surface issues during debugging
  window.addEventListener('error', function(e){
    console.error('Window error:', e.message, e.error);
    // keep UI non-intrusive but notify user once
    // alert('JS error: ' + e.message);
  });
  window.addEventListener('unhandledrejection', function(e){
    console.error('Unhandled promise rejection:', e.reason);
    // alert('Unhandled promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
})();

let currentUser = null;
let currentBoard = null;
let currentMood = null;

const emotions = {
  highPositive:["Joyful","Confident","Inspired","Grateful","Loved","Hopeful","Excited","Proud"],
  lowPositive:["Calm","Content","Relieved","Peaceful","Comforted","Safe","Optimistic","Balanced"],
  highNegative:["Angry","Anxious","Overwhelmed","Jealous","Panicked","Hopeless","Frustrated","Hurt"],
  lowNegative:["Sad","Lonely","Tired","Numb","Unmotivated","Insecure","Drained","Disconnected"]
};

const DEFAULT_BOARDS = {
  proud: "Proud of u",
  happy: "A piece of happiness",
  sad: "Overwhelming sadness",
  pain: "Pain that I can't show"
};

function goTo(id){
  console.log('goTo', id);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const page = document.getElementById(id);
  if(page) page.classList.add('active');

  // Trigger page-specific build/draw
  if(id === 'history') drawCharts();
  if(id === 'calendar') buildCalendar();
  if(id === 'boards') renderBoardsGrid();
  if(id === 'manageBoards') renderBoardList();
}

function showInfo(){
  alert(`Hey cool person! Welcome to Feelings of Life. Here you can track your emotions and journal. Honestly this is a good way to remember memories, vent, and keep track of life.

Now here's how it works:
1. Your login username & password MUST be remembered. This is the only way to keep track. Don't worry, no personal info is asked. All safe unless you share your password.
2. Unlock admin mode to access extra functions. Original password: admin123. Feel free to change it.
3. Data only saves per device; this is not online, so sharing is limited. (I haven't tested this part yet)
4. In the boards, you can write about anything you want. I suggest using the board as a prompt for inspiration. For example, if the board is "proud", write about your achievements.
5. When you delete a board, there is no going back. Be careful of what you delete!

That's it! Have fun & share with your friends!

Purpose of Feelings of Life: release stress and to keep the your mind healthy. remember to always check on yourself and take a break. Use this to help you. This might not help you solve your problems, but writing it down helps the mind be at ease :D`);
}

// Toggle password visibility for inputs by id. Button element passed to update label if desired.
function togglePassword(inputId, btn){
  const el = document.getElementById(inputId);
  if(!el) return;
  if(el.type === 'password'){
    el.type = 'text';
    if(btn) btn.textContent = '🙈';
  } else {
    el.type = 'password';
    if(btn) btn.textContent = '👁️';
  }
}

function login(){
  const u=document.getElementById('username').value;
  const p=document.getElementById('password').value;
  if(!u||!p) return alert("Username & password required");
  let data=JSON.parse(localStorage.getItem(u));
  if(!data){
    // create default user structure with default boards & titles
    data={password:p,emotions:[],boards:{},boardTitles:{},locks:{},adminPass:"admin123"};
    // initialize board keys & empty arrays and titles
    Object.keys(DEFAULT_BOARDS).forEach(k=>{
      data.boards[k]=[];
      data.boardTitles[k]=DEFAULT_BOARDS[k];
    });
    localStorage.setItem(u,JSON.stringify(data));
  }else if(data.password!==p){ return alert("Wrong password"); }
  currentUser=u;

  // ensure boardTitles and default boards exist
  let dataNow = JSON.parse(localStorage.getItem(currentUser));
  if(!dataNow) dataNow = {};
  if(!dataNow.boardTitles){
    dataNow.boardTitles = {};
    Object.keys(DEFAULT_BOARDS).forEach(k=>dataNow.boardTitles[k]=DEFAULT_BOARDS[k]);
  }
  if(!dataNow.boards) dataNow.boards = {};
  Object.keys(DEFAULT_BOARDS).forEach(k=>{
    if(!dataNow.boards[k]) dataNow.boards[k]=[];
    if(!dataNow.boardTitles[k]) dataNow.boardTitles[k]=DEFAULT_BOARDS[k];
  });
  // ensure adminPass default exists
  if(!dataNow.adminPass) dataNow.adminPass = "admin123";

  localStorage.setItem(currentUser, JSON.stringify(dataNow));

  goTo('survey');
}

// SURVEY / EMOTIONS
function selectMood(m){
  currentMood=m;
  const grid=document.getElementById('emotionGrid');
  if(!grid) return console.warn('emotionGrid not found');
  grid.innerHTML="";
  (emotions[m]||[]).forEach(e=>{
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
  if(!d) return alert("Please log in first");
  d.emotions = d.emotions || [];
  d.emotions.push({emotion:e,mood:currentMood,date:new Date().toISOString()});
  localStorage.setItem(currentUser,JSON.stringify(d));
  goTo('boards');
}

// BOARDS MANAGEMENT

// Render the grid of boards (the main boards page)
function renderBoardsGrid(){
  console.log('renderBoardsGrid currentUser=', currentUser);
  const grid = document.getElementById('boardsGrid');
  if(!grid) return console.warn('boardsGrid not present');
  if(!currentUser) {
    // if not logged in, show the original static four buttons to preserve UX
    grid.innerHTML = "";
    Object.keys(DEFAULT_BOARDS).forEach(k=>{
      const btn = document.createElement('button');
      btn.textContent = DEFAULT_BOARDS[k];
      btn.onclick = ()=> alert("Please log in to open boards.");
      grid.appendChild(btn);
    });
    return;
  }

  let d=JSON.parse(localStorage.getItem(currentUser));
  if(!d) d = {boards:{}, boardTitles:{}};
  if(!d.boardTitles) d.boardTitles = {};
  if(!d.boards) d.boards = {};

  // ensure defaults exist
  Object.keys(DEFAULT_BOARDS).forEach(k=>{
    if(!d.boards[k]) d.boards[k]=[];
    if(!d.boardTitles[k]) d.boardTitles[k]=DEFAULT_BOARDS[k];
  });
  localStorage.setItem(currentUser, JSON.stringify(d));

  grid.innerHTML = "";
  const keys = Object.keys(d.boardTitles);

  if(keys.length === 0){
    grid.innerHTML = "<p>No boards yet. Add one in Manage Boards.</p>";
    return;
  }

  keys.forEach(k=>{
    const btn = document.createElement('button');
    btn.textContent = d.boardTitles[k];
    btn.onclick = ()=> openBoard(k);
    grid.appendChild(btn);
  });
}

// Render board manage list (Manage Boards page)
function renderBoardList(){
  const list = document.getElementById('boardList');
  if(!list) return console.warn('boardList not present');
  if(!currentUser) {
    list.innerHTML = "<p>Please log in first to manage boards.</p>";
    return;
  }

  let d=JSON.parse(localStorage.getItem(currentUser));
  if(!d) d = {boards:{}, boardTitles:{}};
  if(!d.boardTitles) d.boardTitles = {};
  if(!d.boards) d.boards = {};

  // ensure defaults exist
  Object.keys(DEFAULT_BOARDS).forEach(k=>{
    if(!d.boards[k]) d.boards[k]=[];
    if(!d.boardTitles[k]) d.boardTitles[k]=DEFAULT_BOARDS[k];
  });
  localStorage.setItem(currentUser, JSON.stringify(d));

  list.innerHTML = "";
  const keys = Object.keys(d.boardTitles);

  if(keys.length === 0){
    list.innerHTML = "<p>No boards yet. Add one above.</p>";
    return;
  }

  keys.forEach(key=>{
    const item = document.createElement('div');
    item.className = "board-item";
    const left = document.createElement('div');
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "8px";

    const title = document.createElement('div');
    title.className = "title";
    title.textContent = d.boardTitles[key];

    left.appendChild(title);

    const actions = document.createElement('div');

    const openBtn = document.createElement('button');
    openBtn.className = 'small-btn';
    openBtn.textContent = 'Open';
    openBtn.onclick = ()=> openBoard(key);

    const renameBtn = document.createElement('button');
    renameBtn.className = 'small-btn';
    renameBtn.textContent = 'Rename';
    renameBtn.onclick = ()=> {
      const newT = prompt("New board title:", d.boardTitles[key]);
      if(newT && newT.trim()){
        renameBoard(key, newT.trim());
      }
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'small-btn';
    delBtn.textContent = 'Delete';
    delBtn.onclick = ()=> {
      if(confirm(`Delete board "${d.boardTitles[key]}"? This will remove its posts.`)){
        deleteBoard(key);
      }
    };

    actions.appendChild(openBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);

    item.appendChild(left);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

// when adding a board, create a unique key slug
function addBoard(){
  if(!currentUser) return alert("Please login first");
  const title = document.getElementById('newBoardTitle').value;
  if(!title || !title.trim()) return alert("Provide a board title");
  const d = JSON.parse(localStorage.getItem(currentUser)) || {};
  // create slug key from title
  let keyBase = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  let key = keyBase || ('board-' + Date.now());
  // ensure unique
  let idx = 1;
  while(d.boardTitles && d.boardTitles[key]){
    key = `${keyBase}-${idx++}`;
  }
  if(!d.boards) d.boards = {};
  if(!d.boardTitles) d.boardTitles = {};
  d.boards[key] = [];
  d.boardTitles[key] = title.trim();
  localStorage.setItem(currentUser, JSON.stringify(d));
  const el = document.getElementById('newBoardTitle');
  if(el) el.value = "";
  // update both pages
  renderBoardList();
  renderBoardsGrid();
}

// rename a board key's title
function renameBoard(key, newTitle){
  const d = JSON.parse(localStorage.getItem(currentUser));
  if(!d || !d.boardTitles[key]) return;
  d.boardTitles[key] = newTitle;
  localStorage.setItem(currentUser, JSON.stringify(d));
  // if the currentBoard is this, update the boardTitle DOM
  if(currentBoard === key){
    const bt = document.getElementById('boardTitle');
    if(bt) bt.textContent = newTitle;
  }
  renderBoardList();
  renderBoardsGrid();
}

// delete board and its posts; update active board automatically
function deleteBoard(key){
  const d = JSON.parse(localStorage.getItem(currentUser));
  if(!d) return;
  delete d.boardTitles[key];
  delete d.boards[key];
  if(d.locks) delete d.locks[key];
  localStorage.setItem(currentUser, JSON.stringify(d));

  // If the deleted board was currently open, switch to another board (first available) or go to boards
  if(currentBoard === key){
    const remaining = Object.keys(d.boardTitles || {});
    if(remaining.length > 0){
      openBoard(remaining[0]);
    } else {
      currentBoard = null;
      goTo('boards');
    }
  } else {
    // else simply refresh both views
    renderBoardList();
    renderBoardsGrid();
  }
}

function openBoard(b){
  currentBoard=b;
  const d = JSON.parse(localStorage.getItem(currentUser)) || {};
  const title = (d.boardTitles && d.boardTitles[b]) ? d.boardTitles[b] : b;
  const bt = document.getElementById('boardTitle');
  if(bt) bt.textContent = title;
  applyLock();
  loadPosts();
  goTo('boardPage');
}

function applyLock(){
  const d=JSON.parse(localStorage.getItem(currentUser)) || {};
  const locked=d && d.locks ? d.locks[currentBoard] : null;
  const input = document.getElementById('boardInput');
  const posts = document.getElementById('posts');
  if(input) input.style.display=locked?"none":"block";
  if(posts) posts.innerHTML=locked?"<p>🔒 This board is locked.</p>":"";
}

function toggleLock(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  if(!d) return;
  if(!d.locks) d.locks = {};
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
  const input = document.getElementById('boardInput');
  if(!input) return;
  const t=input.value;
  if(!t) return;
  const d=JSON.parse(localStorage.getItem(currentUser));
  if(!d.boards) d.boards = {};
  if(!d.boards[currentBoard]) d.boards[currentBoard]=[];
  d.boards[currentBoard].push({text:t,time:new Date().toLocaleString()});
  localStorage.setItem(currentUser,JSON.stringify(d));
  input.value="";
  loadPosts();
}

function loadPosts(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  const div=document.getElementById('posts');
  if(!d || !div) return;
  if(d.locks && d.locks[currentBoard]) return;
  div.innerHTML="";
  (d.boards[currentBoard]||[]).forEach(p=>{
    div.innerHTML+=`<div class="post">${escapeHtml(p.text)}<br><small>${p.time}</small></div>`;
  });
}

// simple escape to avoid accidental HTML injection in posts display
function escapeHtml(str){
  return String(str).replace(/[&<>"'`=\/]/g, function(s) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '=': '&#x3D;',
      '`': '&#x60;'
    })[s];
  });
}

// CHARTS & HISTORY

function drawCharts(){
  if(!currentUser) return console.warn('drawCharts: no currentUser');
  const d=JSON.parse(localStorage.getItem(currentUser));
  if(!d) return console.warn('drawCharts: no data for user');

  // emotionChart (pie)
  const emotionCanvas = document.getElementById("emotionChart");
  if(emotionCanvas && emotionCanvas.getContext){
    const ctx = emotionCanvas.getContext("2d");
    if(ctx){
      const counts={highPositive:0,lowPositive:0,highNegative:0,lowNegative:0};
      (d.emotions||[]).forEach(e=>counts[e.mood]++);
      let total=Object.values(counts).reduce((a,b)=>a+b,0);
      ctx.clearRect(0,0,emotionCanvas.width,emotionCanvas.height);
      if(total === 0){
        ctx.fillStyle = "#fff";
        ctx.font = "14px Arial";
        ctx.fillText("No emotions logged", emotionCanvas.width/2 - 50, emotionCanvas.height/2);
      } else {
        let start= -Math.PI/2;
        const colors={highPositive:"#eee993",lowPositive:"#a0d39a",highNegative:"#a45c5c",lowNegative:"#85acd1"};
        Object.keys(counts).forEach(k=>{
          const slice=(counts[k]/total)*Math.PI*2;
          ctx.beginPath();
          ctx.moveTo(emotionCanvas.width/2,emotionCanvas.height/2);
          ctx.arc(emotionCanvas.width/2,emotionCanvas.height/2, Math.min(emotionCanvas.width, emotionCanvas.height)/2 - 30, start, start+slice);
          ctx.fillStyle=colors[k];
          ctx.fill();
          start+=slice;
        });
      }
    }
  } else {
    console.warn('drawCharts: emotionChart canvas not found');
  }

  // weeklyChart (weekday stacked-ish)
  const weeklyCanvas = document.getElementById("weeklyChart");
  if(weeklyCanvas && weeklyCanvas.getContext){
    const wCtx = weeklyCanvas.getContext("2d");
    if(wCtx){
      const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const weekly={highPositive:[],lowPositive:[],highNegative:[],lowNegative:[]};
      days.forEach(()=>{weekly.highPositive.push(0);weekly.lowPositive.push(0);weekly.highNegative.push(0);weekly.lowNegative.push(0);});
      (d.emotions||[]).forEach(e=>{
        const day=new Date(e.date).getDay();
        if(weekly[e.mood]) weekly[e.mood][day]++;
      });
      wCtx.clearRect(0,0,weeklyCanvas.width,weeklyCanvas.height);
      const colors={highPositive:"#eee993",lowPositive:"#a0d39a",highNegative:"#a45c5c",lowNegative:"#85acd1"};
      const barGroupWidth = 28;
      days.forEach((day,i)=>{
        let x = i * (barGroupWidth + 10) + 10;
        let yOffset = weeklyCanvas.height - 20;
        Object.keys(weekly).forEach(k=>{
          const h = weekly[k][i] * 6; // scale factor
          wCtx.fillStyle = colors[k];
          wCtx.fillRect(x, yOffset - h, barGroupWidth, h);
          yOffset -= h;
        });
        wCtx.fillStyle = "#fff";
        wCtx.font = "10px Arial";
        wCtx.fillText(day, x+2, weeklyCanvas.height - 5);
      });
    }
  } else {
    console.warn('drawCharts: weeklyChart canvas not found');
  }

  // monthlyChart: grouped comparison This Month vs Previous Month per mood (4 mood groups)
  const monthlyCanvas = document.getElementById("monthlyChart");
  if(monthlyCanvas && monthlyCanvas.getContext){
    const mCtx = monthlyCanvas.getContext("2d");
    if(mCtx){
      mCtx.clearRect(0,0,monthlyCanvas.width,monthlyCanvas.height);
      // compute date boundaries
      const now = new Date();
      const endThis = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1); // exclusive
      const startThis = new Date(endThis);
      startThis.setDate(endThis.getDate() - 30);
      const startPrev = new Date(startThis);
      startPrev.setDate(startThis.getDate() - 30);
      const endPrev = new Date(startThis);

      const moods = ["highPositive","lowPositive","highNegative","lowNegative"];
      const countsThis = {highPositive:0,lowPositive:0,highNegative:0,lowNegative:0};
      const countsPrev = {highPositive:0,lowPositive:0,highNegative:0,lowNegative:0};

      (d.emotions || []).forEach(e=>{
        const dt = new Date(e.date);
        if(dt >= startThis && dt < endThis){
          countsThis[e.mood] = (countsThis[e.mood] || 0) + 1;
        } else if(dt >= startPrev && dt < endPrev){
          countsPrev[e.mood] = (countsPrev[e.mood] || 0) + 1;
        }
      });

      // draw axes & labels
      const chartLeft = 50;
      const chartTop = 20;
      const chartWidth = monthlyCanvas.width - chartLeft - 20;
      const chartHeight = monthlyCanvas.height - chartTop - 60;

      // determine max value for scaling
      const maxCount = Math.max(...Object.values(countsThis), ...Object.values(countsPrev), 1);

      // y axis lines
      mCtx.strokeStyle = "#3a3a3a";
      mCtx.fillStyle = "#fff";
      mCtx.font = "12px Arial";
      for(let i=0;i<=5;i++){
        const y = chartTop + i * (chartHeight/5);
        mCtx.beginPath();
        mCtx.moveTo(chartLeft, y);
        mCtx.lineTo(chartLeft + chartWidth, y);
        mCtx.stroke();
        // label
        const labelVal = Math.round(maxCount * (1 - i/5));
        mCtx.fillText(labelVal, 10, y+4);
      }

      // draw grouped bars: for each mood, draw two bars (prev, this)
      const groupCount = moods.length;
      const groupSpacing = chartWidth / groupCount;
      const barWidth = Math.min(40, groupSpacing * 0.28);
      moods.forEach((mood, idx) => {
        const groupX = chartLeft + idx * groupSpacing + groupSpacing/4;
        // previous month bar (left)
        const valPrev = countsPrev[mood] || 0;
        const hPrev = (valPrev / maxCount) * chartHeight;
        mCtx.fillStyle = "#888888";
        mCtx.fillRect(groupX, chartTop + (chartHeight - hPrev), barWidth, hPrev);
        // this month bar (right)
        const valThis = countsThis[mood] || 0;
        const hThis = (valThis / maxCount) * chartHeight;
        mCtx.fillStyle = (mood === "highPositive")?"#eee993":(mood==="lowPositive")?"#a0d39a":(mood==="highNegative")?"#a45c5c":"#85acd1";
        mCtx.fillRect(groupX + barWidth + 6, chartTop + (chartHeight - hThis), barWidth, hThis);

        // labels under group
        mCtx.fillStyle = "#fff";
        mCtx.font = "12px Arial";
        mCtx.fillText(prettyMood(mood), groupX, chartTop + chartHeight + 18);
      });

      // legend
      mCtx.fillStyle = "#fff";
      mCtx.font = "12px Arial";
      mCtx.fillText("Previous 30d", chartLeft + chartWidth - 120, chartTop + 12);
      mCtx.fillStyle = "#888888";
      mCtx.fillRect(chartLeft + chartWidth - 150, chartTop + 5, 12, 12);
      mCtx.fillStyle = "#fff";
      mCtx.fillText("This 30d", chartLeft + chartWidth - 60, chartTop + 12);
      mCtx.fillStyle = "#eee993";
      mCtx.fillRect(chartLeft + chartWidth - 70, chartTop + 5, 12, 12);
    }
  } else {
    console.warn('drawCharts: monthlyChart canvas not found');
  }
}

function prettyMood(m){
  return m === "highPositive" ? "High +" :
         m === "lowPositive" ? "Low +" :
         m === "highNegative" ? "High -" :
         "Low -";
}

function buildCalendar(){
  const d=JSON.parse(localStorage.getItem(currentUser));
  const grid=document.getElementById("calendarGrid");
  if(!grid) return;
  grid.innerHTML="";
  if(!d || !d.emotions || d.emotions.length === 0){
    grid.innerHTML = "<p>No emotion entries yet.</p>";
    return;
  }
  d.emotions.forEach(e=>{
    const b=document.createElement("button");
    b.textContent=new Date(e.date).toDateString()+" – "+e.emotion;
    b.className=e.mood==="highPositive"?"hp":e.mood==="lowPositive"?"lp":e.mood==="highNegative"?"hn":"ln";
    grid.appendChild(b);
  });
}

// ADMIN

// Recover admin password: if missing, set to default "admin123" and inform user.
// If present, show the stored admin password. Requires user to be logged in.
function recoverAdminPass(){
  if(!currentUser) return alert("Please log in first to recover admin password.");
  const d = JSON.parse(localStorage.getItem(currentUser)) || {};
  if(!d.adminPass){
    d.adminPass = "admin123";
    localStorage.setItem(currentUser, JSON.stringify(d));
    alert('Admin password was missing; it has been reset to "admin123".');
    return;
  }
  // Show stored admin password
  alert(`Stored admin password for user "${currentUser}": "${d.adminPass}"`);
}

// Show the stored admin password from inside the admin panel (only available after unlock)
function showStoredAdminPass(){
  if(!currentUser) return alert("Please log in first.");
  const d = JSON.parse(localStorage.getItem(currentUser)) || {};
  const pass = d.adminPass || "admin123";
  alert(`Admin password: "${pass}"`);
}

function adminLogin(){
  const p=document.getElementById("adminPass").value;
  if(!currentUser) return alert("Please log in first to access admin.");

  const d=JSON.parse(localStorage.getItem(currentUser)) || {};
  // Ensure we have a saved adminPass; if not, default to admin123 and persist it.
  if(!d.adminPass){
    d.adminPass = "admin123";
    localStorage.setItem(currentUser, JSON.stringify(d));
  }
  const saved = d.adminPass;

  if(p===saved){
    const panel = document.getElementById("adminPanel");
    if(panel) panel.classList.remove("hidden");
    alert("Admin unlocked.");
  } else {
    alert("Wrong admin password");
  }
}

function changeAdminPass(){
  const p=prompt("New admin password:");
  if(p){
    const d=JSON.parse(localStorage.getItem(currentUser));
    if(!d) return;
    d.adminPass=p;
    localStorage.setItem(currentUser,JSON.stringify(d));
    alert("Admin password updated.");
  }
}

function resetData(){
  if(confirm("Delete ALL data?")) {
    localStorage.clear();
    alert("All local data cleared.");
    // hide admin panel if shown
    const panel = document.getElementById("adminPanel");
    if(panel) panel.classList.add("hidden");
    // reset in-memory pointers
    currentUser = null;
    currentBoard = null;
    currentMood = null;
    renderBoardsGrid();
  }
}

// Attach simple initializers to make sure pages update after load if needed
document.addEventListener('DOMContentLoaded', ()=>{
  console.log('DOM loaded');
  // Render boards grid only if element present (safe)
  try {
    renderBoardsGrid();
  } catch (err) {
    console.error('Error while rendering boards grid on load:', err);
  }
});
