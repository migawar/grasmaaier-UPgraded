import * as THREE from 'three';

// --- ENGINE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- GAME DATA ---
let geld = 0, totaalVerdiend = 0, totaalGemaaid = 0, totaalUpgrades = 0, speedSpending = 0;
let trofeeën = 0, geclaimdeTrofeeën = 0, huidigLevel = 1;
let grasWaarde = 0.01, huidigeSnelheid = 0.15, huidigMowerRadius = 1.3;
let prijsRadius = 5, prijsSnelheid = 5, prijsWaarde = 10;
let actieveOpdracht = null, rewardKlaar = false;

// SKIN DATA
let skinsUnlocked = ["Red"];
let huidigeSkin = "Red";
const skinKleuren = { "Red": 0xff0000, "Blue": 0x0000ff };

// --- MISSILOGICA ---
function genereerMissie() {
    rewardKlaar = false;
    if (huidigLevel <= 24) {
        const types = [{id:'m',d:5000,t:"Maai 5000 grassprieten"}, {id:'u',d:5,t:"Koop 5 upgrades"}, {id:'v',d:500,t:"Verdien $500"}, {id:'s',d:50,t:"Spendeer $50 aan snelheid"}];
        const m = types[Math.floor(Math.random()*types.length)];
        const b = Math.random() > 0.5 ? {type:'g',w:500,txt:"$500"} : {type:'u',w:2,txt:"2 gratis upgrades"};
        actieveOpdracht = {...m, beloning: b, start: getStat(m.id)};
    } else if (huidigLevel === 25) {
        actieveOpdracht = {id:'m',d:250000,t:"Maai 250.000 grassprieten", start:totaalGemaaid, beloning:{type:'g',w:25000,txt:"$25.000"}};
    } else {
        const types = [{id:'m',d:25000,t:"Maai 25000 sprieten"}, {id:'u',d:25,t:"Koop 25 upgrades"}, {id:'v',d:2500,t:"Verdien $2500"}, {id:'s',d:250,t:"Spendeer $250 aan snelheid"}];
        const m = types[Math.floor(Math.random()*types.length)];
        const b = Math.random() > 0.5 ? {type:'g',w:2500,txt:"$2500"} : {type:'u',w:15,txt:"15 gratis upgrades"};
        actieveOpdracht = {...m, beloning: b, start: getStat(m.id)};
    }
}

function getStat(id) {
    if(id==='m') return totaalGemaaid; if(id==='u') return totaalUpgrades; if(id==='v') return totaalVerdiend; if(id==='s') return speedSpending; return 0;
}

// --- UI GENERATIE ---
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family:Impact, sans-serif; z-index:9999;';
document.body.appendChild(ui);

const geldBox = document.createElement('div');
geldBox.style.cssText = 'position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.8); padding:15px 25px; border-radius:10px; border:3px solid #2ecc71; color:#2ecc71; font-size:32px; pointer-events:auto;';
ui.appendChild(geldBox);

const trofeeStats = document.createElement('div');
trofeeStats.style.cssText = 'position:absolute; top:20px; right:20px; display:flex; flex-direction:column; gap:5px; pointer-events:auto;';
ui.appendChild(trofeeStats);

const leftMenu = document.createElement('div');
leftMenu.style.cssText = 'position:absolute; top:50%; left:20px; transform:translateY(-50%); display:flex; flex-direction:column; gap:15px; pointer-events:auto;';
ui.appendChild(leftMenu);

const cheatBtn = document.createElement('button');
cheatBtn.innerText = "🔑 REDEEM CODE";
cheatBtn.style.cssText = 'position:absolute; bottom:20px; right:20px; background:#e74c3c; color:white; border:none; padding:15px; border-radius:10px; cursor:pointer; pointer-events:auto; font-weight:bold;';
ui.appendChild(cheatBtn);

const gpBtn = document.createElement('button');
gpBtn.innerText = "⭐ GRASSPASS";
gpBtn.style.cssText = 'position:absolute; bottom:20px; left:20px; background: linear-gradient(to bottom, #f1c40f, #f39c12); color:white; border:3px solid white; padding:20px 40px; border-radius:15px; font-size:24px; cursor:pointer; pointer-events:auto; text-shadow: 2px 2px black;';
ui.appendChild(gpBtn);

const overlay = document.createElement('div');
overlay.id = "main-overlay";
overlay.style.cssText = 'position:fixed; top:0; left:-100%; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:10000; transition:0.4s; display:flex; align-items:center; justify-content:center; pointer-events:none; color:white;';
document.body.appendChild(overlay);

// --- UI FUNCTIES ---
window.sluitMenu = () => { overlay.style.left = '-100%'; overlay.style.pointerEvents = 'none'; };

function updateUI() {
    geldBox.innerText = `$ ${geld.toLocaleString()}`;
    trofeeStats.innerHTML = `
        <div style="background:rgba(0,0,0,0.8); padding:10px 20px; border-radius:10px; border:3px solid #f1c40f; color:#f1c40f; font-size:32px; text-align:right;">🏆 ${trofeeën}</div>
        <button onclick="openTrofeePad()" style="background:#f39c12; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; font-family:Impact;">TROFEEËNPAD</button>
    `;
    
    leftMenu.innerHTML = `
        <button onclick="koop('r')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer; font-size:18px;">RADIUS: $${prijsRadius.toFixed(0)}</button>
        <button onclick="koop('s')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer; font-size:18px;">SPEED: $${prijsSnelheid.toFixed(0)}</button>
        <button onclick="koop('w')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer; font-size:18px;">VALUE: $${prijsWaarde.toFixed(0)}</button>
        <button onclick="openSkinMenu()" style="width:220px; padding:10px; background:#3498db; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; margin-top:20px;">👕 SKINS</button>
    `;

    if (totaalVerdiend >= (trofeeën + 1) * 100000) { trofeeën++; }
    const v = getStat(actieveOpdracht.id) - actieveOpdracht.start;
    if (v >= actieveOpdracht.d) rewardKlaar = true;
}

// --- SKIN MENU ---
window.openSkinMenu = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    let html = `<div style="background:#222; padding:40px; border:5px solid #3498db; border-radius:30px; text-align:center; min-width:300px;">
        <h1 style="color:#3498db;">SKIN SELECTOR</h1>
        <div style="display:flex; flex-direction:column; gap:10px; margin:20px 0;">`;
    
    ["Red", "Blue"].forEach(s => {
        const unlocked = skinsUnlocked.includes(s);
        html += `<button onclick="${unlocked ? `setSkin('${s}')` : ''}" style="padding:15px; background:${unlocked ? (huidigeSkin === s ? '#2ecc71' : '#444') : '#111'}; color:${unlocked ? 'white' : '#555'}; border:none; border-radius:10px; cursor:${unlocked ? 'pointer' : 'default'}; font-weight:bold;">
            ${s} ${unlocked ? (huidigeSkin === s ? '(SELECTED)' : '') : '🔒 (TROPHY 10)'}
        </button>`;
    });

    html += `</div><button onclick="sluitMenu()" style="padding:10px 30px; cursor:pointer;">CLOSE</button></div>`;
    overlay.innerHTML = html;
};

window.setSkin = (s) => { huidigeSkin = s; mower.material.color.set(skinKleuren[s]); sluitMenu(); };

// --- CHEAT ENGINE (MET BEVESTIGING) ---
cheatBtn.onclick = () => {
    const code = prompt("Voer code in:");
    if (!code) return; // Gebruiker annuleert

    if(code === "OG-kervelsoeps") { 
        geld += 50000; totaalVerdiend += 50000; 
        alert("✅ Code geactiveerd! Je hebt $50.000 ontvangen.");
    }
    else if(code === "!wannaBEop") { 
        geld += 100000; totaalVerdiend += 100000; 
        alert("✅ Code geactiveerd! Je hebt $100.000 ontvangen.");
    }
    else if(code === "YEAHman") { 
        geld += 250000; totaalVerdiend += 250000; 
        alert("✅ Code geactiveerd! Je hebt $250.000 ontvangen.");
    }
    else {
        alert("❌ Ongeldige code!");
    }
    updateUI();
};

// --- TROFEEËNPAD ---
window.openTrofeePad = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    let padHTML = `<div style="background:#111; padding:40px; border:5px solid #f1c40f; border-radius:30px; width:600px; max-height:80vh; display:flex; flex-direction:column; position:relative;">
        <button onclick="sluitMenu()" style="position:absolute; top:15px; right:15px; background:#e74c3c; color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer;">X</button>
        <h1 style="color:#f1c40f; font-size:40px;">HET TROFEEËNPAD</h1>
        <div style="flex-grow:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">`;
    for (let i = 1; i <= Math.max(trofeeën + 2, 10); i++) {
        let status = (i <= geclaimdeTrofeeën) ? "✅" : (i <= trofeeën) ? `<button onclick="claimTrofee(${i})">CLAIM</button>` : "🔒";
        padHTML += `<div style="background:#222; padding:15px; border-radius:15px; display:flex; justify-content:space-between; border:1px solid #444;"><span>🏆 Trofee ${i}</span><span>${status}</span></div>`;
    }
    padHTML += `</div></div>`; overlay.innerHTML = padHTML;
};

window.claimTrofee = (nr) => {
    if (nr === geclaimdeTrofeeën + 1) {
        geclaimdeTrofeeën++;
        let beloning = 0;
        if (nr === 1) beloning = 50000;
        else if (nr === 2) beloning = 75000;
        else if (nr >= 3 && nr <= 9) beloning = Math.floor(Math.random() * 85001) + 10000;
        else if (nr === 10) { alert("BLUE SKIN UNLOCKED!"); skinsUnlocked.push("Blue"); }
        
        geld += beloning; totaalVerdiend += beloning; updateUI(); openTrofeePad();
    }
};

// --- GRASSPASS ---
gpBtn.onclick = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    const v = getStat(actieveOpdracht.id) - actieveOpdracht.start;
    const p = Math.min(Math.floor((v / actieveOpdracht.d) * 100), 100);
    overlay.innerHTML = `<div style="background: linear-gradient(135deg, #2c3e50, #000); padding:50px; border:5px solid #f1c40f; border-radius:30px; text-align:center; width:500px; position:relative;">
        <button onclick="sluitMenu()" style="position:absolute; top:15px; right:15px; background:#e74c3c; color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer;">X</button>
        <button onclick="claimReward()" style="background:${rewardKlaar ? '#2ecc71' : '#555'}; color:white; border:3px solid white; padding:10px 30px; border-radius:10px; cursor:pointer; margin-bottom:20px;">${rewardKlaar ? '🎁 CLAIM' : 'LOCK'}</button>
        <h1 style="color:#f1c40f; font-size:52px; margin:0;">GRASS PASS</h1>
        <div style="width:100%; height:45px; background:#333; border-radius:25px; margin:25px 0; border:3px solid white; overflow:hidden;"><div style="width:${p}%; height:100%; background:#f1c40f;"></div></div>
        <p>${v.toLocaleString()} / ${actieveOpdracht.d.toLocaleString()}</p>
    </div>`;
};

window.claimReward = () => {
    if (rewardKlaar) {
        if (actieveOpdracht.beloning.type === 'g') { geld += actieveOpdracht.beloning.w; totaalVerdiend += actieveOpdracht.beloning.w; }
        else { for(let i=0; i<actieveOpdracht.beloning.w; i++) { huidigMowerRadius += 0.1; huidigeSnelheid += 0.01; } }
        huidigLevel++; genereerMissie(); updateUI(); sluitMenu();
    }
};

window.koop = (t) => {
    if (t === 'r' && geld >= prijsRadius) { geld -= prijsRadius; huidigMowerRadius += 0.3; prijsRadius *= 1.6; totaalUpgrades++; }
    if (t === 's' && geld >= prijsSnelheid) { geld -= prijsSnelheid; speedSpending += prijsSnelheid; huidigeSnelheid += 0.02; prijsSnelheid *= 1.6; totaalUpgrades++; }
    if (t === 'w' && geld >= prijsWaarde) { geld -= prijsWaarde; grasWaarde += 0.01; prijsWaarde *= 1.7; totaalUpgrades++; }
    updateUI();
};

// --- 3D WORLD ---
const mower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshStandardMaterial({color: skinKleuren[huidigeSkin]}));
scene.add(mower);
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 15, 5); scene.add(light);
camera.position.set(0, 15, 15);

const grassArr = [];
for(let x=-20; x<20; x+=0.8) {
    for(let z=-20; z<20; z+=0.8) {
        const g = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), new THREE.MeshStandardMaterial({color: 0x2ecc71}));
        g.position.set(x,0,z); g.userData = {cut: 0}; scene.add(g); grassArr.push(g);
    }
}

const keys = {};
window.onkeydown=(e)=>keys[e.key.toLowerCase()]=true;
window.onkeyup=(e)=>keys[e.key.toLowerCase()]=false;

function animate() {
    requestAnimationFrame(animate);
    const nu = Date.now();
    if(keys['w']||keys['z']) mower.position.z -= huidigeSnelheid;
    if(keys['s']) mower.position.z += huidigeSnelheid;
    if(keys['a']||keys['q']) mower.position.x -= huidigeSnelheid;
    if(keys['d']) mower.position.x += huidigeSnelheid;
    grassArr.forEach(g => {
        if(g.visible && mower.position.distanceTo(g.position) < huidigMowerRadius) {
            g.visible = false; g.userData.cut = nu;
            geld += grasWaarde; totaalVerdiend += grasWaarde; totaalGemaaid++; updateUI();
        }
        if(!g.visible && nu - g.userData.cut > 8000) g.visible = true;
    });
    camera.position.set(mower.position.x, 15, mower.position.z + 15);
    camera.lookAt(mower.position);
    renderer.render(scene, camera);
}

genereerMissie(); updateUI(); animate();
