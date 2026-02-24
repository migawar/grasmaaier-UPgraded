import * as THREE from 'three';

// --- 1. ENGINE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. GAME DATA (Standaardwaarden) ---
let geld = 0, totaalVerdiend = 0, totaalGemaaid = 0, totaalUpgrades = 0;
let trofeeën = 0, geclaimdeTrofeeën = 0; 
let grasWaarde = 0.01, huidigeSnelheid = 0.15, huidigMowerRadius = 1.3;
let prijsRadius = 5, prijsSnelheid = 5, prijsWaarde = 10;
let countRadius = 0, countSnelheid = 0, countWaarde = 0;
const MAX_RADIUS = 50, MAX_OTHER = 200; 
let regrowDelay = 8000, gameMode = "classic", creativeSpeed = 0.5, autoSaveOnd = false;

const maanden = ["JANUARI", "FEBRUARI", "MAART", "APRIL", "MEI", "JUNI", "JULI", "AUGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER"];
const nu = new Date();
const huidigeMaandNaam = maanden[nu.getMonth()];

let gpLevel = 1, eventLevel = 1;
let actieveOpdracht = null, eventOpdracht = null;
let rewardKlaar = false, eventRewardKlaar = false;
let huidigeSkin = "RED", ontgrendeldeSkins = ["RED"]; 

const alleSkinKleuren = { 
    "RED": 0xff0000, "BLUE": 0x0000ff,
    "JANUARI": 0xffffff, "FEBRUARI": 0xffc0cb, "MAART": 0xffd700, "APRIL": 0x00ff00,
    "MEI": 0x8b4513, "JUNI": 0x000000, "JULI": 0xffff00, "AUGUSTUS": 0xffa500,
    "SEPTEMBER": 0x800080, "OKTOBER": 0x006400, "NOVEMBER": 0x808080, "DECEMBER": 0x8b0000
};

const keys = {};

// --- 3. CORE LOGICA ---
window.getStat = (id) => {
    if(id==='m') return totaalGemaaid; 
    if(id==='u') return totaalUpgrades; 
    if(id==='v') return totaalVerdiend; 
    return 0;
};

window.genereerMissie = (isEvent = false) => {
    const types = [{id:'m', d:2000, t:"MAAI 2000 SPRIETEN"}, {id:'u', d:5, t:"KOOP 5 UPGRADES"}, {id:'v', d:500, t:"VERDIEN $500"}];
    const gekozen = types[Math.floor(Math.random()*types.length)];
    const lvl = isEvent ? eventLevel : gpLevel;
    const factor = 1 + (lvl * 0.2);
    const opdracht = { 
        id: gekozen.id, 
        d: Math.floor(gekozen.d * factor), 
        start: window.getStat(gekozen.id), 
        t: gekozen.t.replace(/\d+/, Math.floor(gekozen.d * factor)) 
    };
    if (isEvent) { eventOpdracht = opdracht; eventRewardKlaar = false; }
    else { actieveOpdracht = opdracht; rewardKlaar = false; }
};

// --- 4. UI SETUP ---
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family: Impact, sans-serif; z-index:9999; text-shadow: 2px 2px black;';
document.body.appendChild(ui);

const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed; top:0; left:-100%; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:10000; transition:0.3s; display:flex; align-items:center; justify-content:center; pointer-events:none; color:white; font-family:Impact;';
document.body.appendChild(overlay);

ui.innerHTML = `
    <div id="geldDisp" style="position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.8); padding:15px 30px; border-radius:15px; border:4px solid #2ecc71; pointer-events:auto; color:#2ecc71; font-size:45px;">$ 0.00</div>
    <div id="trofeeDisp" style="position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.8); padding:10px 25px; border-radius:15px; border:4px solid #f1c40f; pointer-events:auto; text-align:right;"></div>
    <button onclick="window.openSettings()" style="position:absolute; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; border:3px solid white; padding:10px 30px; border-radius:15px; font-size:20px; cursor:pointer; pointer-events:auto; font-family:Impact;">INSTELLINGEN</button>
    <div id="upgradeMenu" style="position:absolute; top:50%; left:20px; transform:translateY(-50%); display:flex; flex-direction:column; gap:12px; pointer-events:auto;"></div>
    <button id="gpBtn" onclick="window.openGP()" style="position:absolute; bottom:25px; left:25px; background:linear-gradient(to bottom, #f1c40f, #f39c12); color:white; border:5px solid white; padding:25px 50px; border-radius:20px; font-size:32px; cursor:pointer; pointer-events:auto; font-family:Impact;">⭐ GRASSPASS</button>
    <div style="position:absolute; bottom:25px; right:25px; display:flex; flex-direction:column; gap:10px; align-items:flex-end; pointer-events:auto;">
        <button onclick="window.openCheat()" style="background:#e74c3c; color:white; border:3px solid white; padding:10px 20px; border-radius:10px; cursor:pointer; font-size:18px; font-family:Impact;">🔑 REDEEM CODE</button>
        <button id="eventBtn" onclick="window.openEvent()" style="background:#9b59b6; color:white; border:5px solid white; padding:20px 45px; border-radius:20px; font-size:24px; cursor:pointer; font-family:Impact;">📅 EVENT</button>
    </div>
    <div id="saveToast" style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%); color:rgba(255,255,255,0.5); font-size:12px; opacity:0; transition:0.5s;">GAME OPGESLAGEN...</div>
`;

window.sluit = () => { overlay.style.left = '-100%'; overlay.style.pointerEvents = 'none'; };

window.updateUI = () => {
    document.getElementById('geldDisp').innerText = `$ ${geld.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    trofeeën = Math.floor(totaalVerdiend / 100000);
    document.getElementById('trofeeDisp').innerHTML = `<div style="color:#f1c40f; font-size:45px;">🏆 ${trofeeën}</div>
        <button onclick="window.openTrofee()" style="background:#f39c12; color:white; border:2px solid white; padding:5px 15px; border-radius:8px; cursor:pointer; font-family:Impact; font-size:18px;">TROFEEËNPAD</button>`;

    const isMax = (t) => (t==='r' ? countRadius >= MAX_RADIUS : (t==='s' ? countSnelheid >= MAX_OTHER : countWaarde >= MAX_OTHER));
    const btnStyle = (t) => isMax(t) ? 'background:#555; cursor:default; color:#888; border-color:#444;' : 'background:#27ae60; cursor:pointer; color:white; border-color:white;';

    document.getElementById('upgradeMenu').innerHTML = `
        <button onclick="window.koop('r')" style="padding:15px; border:3px solid; border-radius:12px; font-size:22px; font-family:Impact; ${btnStyle('r')}">RADIUS: ${isMax('r') ? 'MAX' : '$'+prijsRadius.toFixed(0)}</button>
        <button onclick="window.koop('s')" style="padding:15px; border:3px solid; border-radius:12px; font-size:22px; font-family:Impact; ${btnStyle('s')}">SPEED: ${isMax('s') ? 'MAX' : '$'+prijsSnelheid.toFixed(0)}</button>
        <button onclick="window.koop('w')" style="padding:15px; border:3px solid; border-radius:12px; font-size:22px; font-family:Impact; ${btnStyle('w')}">VALUE: ${isMax('w') ? 'MAX' : '$'+prijsWaarde.toFixed(0)}</button>
        <button onclick="window.openSkins()" style="padding:12px; background:#3498db; color:white; border:3px solid white; border-radius:12px; cursor:pointer; font-size:20px; font-family:Impact; margin-top:20px;">👕 SKINS</button>`;

    if(actieveOpdracht && (window.getStat(actieveOpdracht.id) - actieveOpdracht.start) >= actieveOpdracht.d) rewardKlaar = true;
    if(eventOpdracht && (window.getStat(eventOpdracht.id) - eventOpdracht.start) >= eventOpdracht.d) eventRewardKlaar = true;

    document.getElementById('gpBtn').style.border = rewardKlaar ? '8px solid #2ecc71' : '5px solid white';
    document.getElementById('eventBtn').style.background = eventRewardKlaar ? '#2ecc71' : '#9b59b6';
};

// --- 5. OVERIGE FUNCTIES ---
window.openTrofee = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    let h = `<div style="background:#111; padding:40px; border:8px solid #f1c40f; border-radius:30px; text-align:center; min-width:500px; max-height:85vh; overflow-y:auto;"><h1 style="color:#f1c40f; font-size:55px;">🏆 TROFEEËNPAD</h1><p style="margin-bottom:20px;">VERDIEN $100.000 PER TROFEE</p>`;
    for(let i=1; i<=10; i++) {
        let geclaimd = i <= geclaimdeTrofeeën, kan = i <= trofeeën && !geclaimd;
        let belBedrag = i * 7500, bel = i === 10 ? "BLUE SKIN" : `$${belBedrag.toLocaleString()}`;
        h += `<div style="padding:20px; margin:10px; background:#222; border-radius:15px; display:flex; justify-content:space-between; align-items:center; border:3px solid ${geclaimd?'#2ecc71':(kan?'#f1c40f':'#444')};">
            <div style="text-align:left;"><div style="font-size:24px;">TROFEE ${i}</div><div style="color:#aaa;">BELONING: ${bel}</div></div>
            ${geclaimd ? "✅" : (kan ? `<button onclick="window.claimT(${i})" style="background:#2ecc71; color:white; border:none; padding:12px 25px; border-radius:10px; cursor:pointer; font-family:Impact; font-size:18px;">CLAIM</button>` : "🔒")}
        </div>`;
    }
    overlay.innerHTML = h + `<button onclick="window.sluit()" style="margin-top:20px; padding:15px 60px; background:#f1c40f; color:black; border:none; border-radius:15px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button></div>`;
};

window.claimT = (i) => { 
    if(i === geclaimdeTrofeeën+1) { 
        geclaimdeTrofeeën++; 
        if(i === 10) { ontgrendeldeSkins.push("BLUE"); alert("LEGENDARISCH!"); } 
        else { geld += i * 7500; } 
        window.openTrofee(); window.updateUI(); 
    } 
};

window.openSkins = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    let h = `<div style="background:#111; padding:40px; border:8px solid #3498db; border-radius:30px; text-align:center; max-width:80%; max-height:80vh; overflow-y:auto;"><h1 style="color:#3498db; font-size:50px; margin-bottom:20px;">👕 SKINS</h1><div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px;">`;
    ["RED", "BLUE", ...maanden].forEach(s => {
        const ok = ontgrendeldeSkins.includes(s), cur = huidigeSkin === s;
        h += `<button onclick="${ok ? `window.setSkin('${s}')` : ''}" style="padding:20px; background:${ok ? (cur?'#2ecc71':'#333') : '#111'}; color:${ok?'white':'#555'}; font-family:Impact; border:${cur?'4px solid white':'2px solid #444'}; border-radius:15px; cursor:${ok?'pointer':'default'}; font-size:18px;">${ok ? s : '🔒'}</button>`;
    });
    overlay.innerHTML = h + `</div><button onclick="window.sluit()" style="margin-top:30px; padding:15px 60px; background:#3498db; color:white; border:none; border-radius:15px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button></div>`;
};
window.setSkin = (s) => { huidigeSkin = s; mower.material.color.set(alleSkinKleuren[s]); window.openSkins(); };

window.openGP = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    const v = Math.min(window.getStat(actieveOpdracht.id)-actieveOpdracht.start, actieveOpdracht.d);
    overlay.innerHTML = `<div style="background:#111; padding:60px; border:10px solid #f1c40f; border-radius:40px; text-align:center;">
        <h1 style="color:#f1c40f; font-size:70px; margin-bottom:5px;">⭐ GRASS PASS</h1>
        <h2 style="color:white; font-size:30px; margin-top:0; opacity:0.8;">LEVEL ${gpLevel}</h2>
        <p style="font-size:30px; margin-top:20px;">${actieveOpdracht.t}</p>
        <div style="width:500px; height:40px; background:#333; border:4px solid white; margin:30px auto; border-radius:20px; overflow:hidden;"><div style="width:${(v/actieveOpdracht.d*100)}%; height:100%; background:#f1c40f;"></div></div>
        <button onclick="window.claimGP()" style="padding:25px 70px; background:${rewardKlaar?'#2ecc71':'#444'}; font-family:Impact; font-size:32px; color:white; cursor:pointer; border:none; border-radius:20px;">${rewardKlaar?'CLAIM $5.000':'LOCKED'}</button>
        <br><button onclick="window.sluit()" style="margin-top:30px; color:gray; background:none; border:none; cursor:pointer; font-size:20px;">SLUITEN</button></div>`;
};
window.claimGP = () => { if(rewardKlaar) { geld += 5000; gpLevel++; window.genereerMissie(false); window.sluit(); window.updateUI(); } };

window.openEvent = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    const v = Math.min(window.getStat(eventOpdracht.id)-eventOpdracht.start, eventOpdracht.d);
    overlay.innerHTML = `<div style="background:#111; padding:60px; border:10px solid #9b59b6; border-radius:40px; text-align:center;">
        <h1 style="color:#9b59b6; font-size:70px; margin-bottom:5px;">📅 ${huidigeMaandNaam}</h1>
        <h2 style="color:white; font-size:30px; margin-top:0; opacity:0.8;">EVENT LEVEL ${eventLevel}</h2>
        <p style="font-size:30px; margin-top:20px;">${eventOpdracht.t}</p>
        <div style="width:500px; height:40px; background:#333; border:4px solid white; margin:30px auto; border-radius:20px; overflow:hidden;"><div style="width:${(v/eventOpdracht.d*100)}%; height:100%; background:#9b59b6;"></div></div>
        <button onclick="window.claimEvent()" style="padding:25px 70px; background:${eventRewardKlaar?'#2ecc71':'#444'}; font-family:Impact; font-size:32px; color:white; cursor:pointer; border:none; border-radius:20px;">${eventRewardKlaar?`CLAIM SKIN`:'VERGRENDELD'}</button>
        <br><button onclick="window.sluit()" style="margin-top:30px; color:gray; background:none; border:none; cursor:pointer; font-size:20px;">SLUITEN</button></div>`;
};
window.claimEvent = () => { if(eventRewardKlaar) { if(!ontgrendeldeSkins.includes(huidigeMaandNaam)) ontgrendeldeSkins.push(huidigeMaandNaam); eventLevel++; window.genereerMissie(true); window.sluit(); window.updateUI(); } };

// --- 6. SETTINGS & SAVE/LOAD LOGICA ---
window.toggleAutoSave = () => { 
    autoSaveOnd = !autoSaveOnd; 
    if(autoSaveOnd) window.save(true); 
    window.openSettings(); 
};

window.save = (silent = false) => { 
    if(!autoSaveOnd && !silent) return;
    const data = { 
        geld, totaalVerdiend, totaalGemaaid, totaalUpgrades, geclaimdeTrofeeën, 
        grasWaarde, huidigeSnelheid, huidigMowerRadius, prijsRadius, prijsSnelheid, 
        prijsWaarde, countRadius, countSnelheid, countWaarde, gpLevel, eventLevel, 
        huidigeSkin, ontgrendeldeSkins, autoSaveOnd, gameMode,
        actieveOpdracht, eventOpdracht, rewardKlaar, eventRewardKlaar
    };
    localStorage.setItem('grassMasterSaveV2', JSON.stringify(data));
    
    if(autoSaveOnd) {
        const t = document.getElementById('saveToast');
        t.style.opacity = 1; setTimeout(() => t.style.opacity = 0, 1500);
    }
};

window.load = () => { 
    const saved = localStorage.getItem('grassMasterSaveV2');
    if(!saved) return false;
    const d = JSON.parse(saved);
    
    // Hard overschrijven van alle variabelen
    geld = d.geld; totaalVerdiend = d.totaalVerdiend; totaalGemaaid = d.totaalGemaaid;
    totaalUpgrades = d.totaalUpgrades; geclaimdeTrofeeën = d.geclaimdeTrofeeën;
    grasWaarde = d.grasWaarde; huidigeSnelheid = d.huidigeSnelheid; huidigMowerRadius = d.huidigMowerRadius;
    prijsRadius = d.prijsRadius; prijsSnelheid = d.prijsSnelheid; prijsWaarde = d.prijsWaarde;
    countRadius = d.countRadius; countSnelheid = d.countSnelheid; countWaarde = d.countWaarde;
    gpLevel = d.gpLevel; eventLevel = d.eventLevel; huidigeSkin = d.huidigeSkin;
    ontgrendeldeSkins = d.ontgrendeldeSkins; autoSaveOnd = d.autoSaveOnd; gameMode = d.gameMode;
    actieveOpdracht = d.actieveOpdracht; eventOpdracht = d.eventOpdracht;
    rewardKlaar = d.rewardKlaar; eventRewardKlaar = d.eventRewardKlaar;
    
    return true;
};

window.finalReset = () => { localStorage.removeItem('grassMasterSaveV2'); location.reload(); };

window.openResetConfirm = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    overlay.innerHTML = `<div style="background:#7f1d1d; padding:60px; border:10px solid white; border-radius:40px; text-align:center;">
        <h1 style="font-size:80px; color:white; margin-bottom:10px;">🛑 STOP!</h1>
        <p style="font-size:30px; color:white; margin-bottom:40px;">Weet je het heel zeker? <br><b>Al je voortgang wordt gewist.</b></p>
        <button onclick="window.finalReset()" style="width:450px; padding:25px; background:white; color:#7f1d1d; font-family:Impact; font-size:32px; cursor:pointer; border:none; border-radius:20px; margin-bottom:15px;">JA, WIS ALLES!</button>
        <button onclick="window.openSettings()" style="width:450px; padding:20px; background:rgba(0,0,0,0.3); color:white; font-family:Impact; font-size:24px; cursor:pointer; border:2px solid white; border-radius:20px;">NEE, TERUG</button></div>`;
};

window.openSettings = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    overlay.innerHTML = `<div style="background:#111; padding:60px; border:8px solid white; border-radius:30px; text-align:center;">
        <h1 style="font-size:60px; margin-bottom:30px;">INSTELLINGEN</h1>
        <button onclick="window.toggleAutoSave()" style="width:400px; padding:20px; background:${autoSaveOnd?'#2ecc71':'#e74c3c'}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">AUTO-SAVE: ${autoSaveOnd?'AAN':'UIT'}</button><br>
        <button onclick="gameMode=(gameMode==='classic'?'creative':'classic'); window.openSettings();" style="width:400px; padding:20px; background:${gameMode==='creative'?'#f1c40f':'#333'}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">MODE: ${gameMode.toUpperCase()}</button><br>
        <button onclick="window.openResetConfirm()" style="width:400px; padding:15px; background:#c0392b; color:white; font-family:Impact; font-size:22px; cursor:pointer; border:4px solid white; border-radius:15px;">⚠️ RESET GAME ⚠️</button><br>
        <button onclick="window.sluit()" style="padding:15px 80px; background:#2ecc71; color:white; font-family:Impact; font-size:30px; border:none; border-radius:15px; cursor:pointer; margin-top:20px;">SLUITEN</button></div>`;
};

window.openCheat = () => {
    let c = (prompt("CODE:") || "").toUpperCase();
    if(c === "YEAHMAN") { geld += 500000; totaalVerdiend += 500000; window.updateUI(); }
    if(c === "MAXIMUM MIRACLE") {
        countRadius = MAX_RADIUS; countSnelheid = MAX_OTHER; countWaarde = MAX_OTHER;
        huidigMowerRadius = 1.3 + (MAX_RADIUS * 0.3); huidigeSnelheid = 0.15 + (MAX_OTHER * 0.02); grasWaarde = 0.01 + (MAX_OTHER * 0.01);
        if(actieveOpdracht && actieveOpdracht.id === 'u') rewardKlaar = true;
        if(eventOpdracht && eventOpdracht.id === 'u') eventRewardKlaar = true;
        window.updateUI();
    }
};

window.koop = (t) => {
    if (gameMode === "creative") return;
    if (t==='r' && countRadius < MAX_RADIUS && geld >= prijsRadius) { geld -= prijsRadius; huidigMowerRadius += 0.3; prijsRadius *= 1.6; countRadius++; totaalUpgrades++; }
    if (t==='s' && countSnelheid < MAX_OTHER && geld >= prijsSnelheid) { geld -= prijsSnelheid; huidigeSnelheid += 0.02; prijsSnelheid *= 1.6; countSnelheid++; totaalUpgrades++; }
    if (t==='w' && countWaarde < MAX_OTHER && geld >= prijsWaarde) { geld -= prijsWaarde; grasWaarde += 0.01; prijsWaarde *= 1.7; countWaarde++; totaalUpgrades++; }
    window.updateUI();
};

// --- 7. ENGINE LOOP ---
const mower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0xff0000}));
scene.add(mower, new THREE.AmbientLight(0xffffff, 0.9));
const light = new THREE.DirectionalLight(0xffffff, 1); light.position.set(5, 15, 5); scene.add(light);
camera.position.set(0, 15, 15);

// Grondvlak om een zwarte leegte te voorkomen
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: 0x1a2a1a }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.251; // Net onder de maaier om visuele glitches te voorkomen
scene.add(ground);

const grassArr = [];
for(let x=-25; x<25; x+=0.8) { 
    for(let z=-25; z<25; z+=0.8) { 
        const g = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), new THREE.MeshStandardMaterial({color: 0x2ecc71})); 
        g.position.set(x,0,z); g.userData = {cut: 0}; scene.add(g); grassArr.push(g); 
    } 
}

window.onkeydown=(e)=>keys[e.key.toLowerCase()]=true; 
window.onkeyup=(e)=>keys[e.key.toLowerCase()]=false;

function animate() {
    requestAnimationFrame(animate);
    let s = gameMode === "creative" ? creativeSpeed : huidigeSnelheid;
    if(keys['w']||keys['z']) mower.position.z -= s; if(keys['s']) mower.position.z += s;
    if(keys['a']||keys['q']) mower.position.x -= s; if(keys['d']) mower.position.x += s;
    grassArr.forEach(g => { 
        if(gameMode === "creative") {
            if(g.position.x < mower.position.x - 25) { g.position.x += 50; g.visible = true; }
            if(g.position.x > mower.position.x + 25) { g.position.x -= 50; g.visible = true; }
            if(g.position.z < mower.position.z - 25) { g.position.z += 50; g.visible = true; }
            if(g.position.z > mower.position.z + 25) { g.position.z -= 50; g.visible = true; }
        }

        if(g.visible && mower.position.distanceTo(g.position) < huidigMowerRadius) { 
            g.visible = false; g.userData.cut = Date.now(); 
            if(gameMode === "classic") { 
                geld += grasWaarde; totaalVerdiend += grasWaarde; 
                totaalGemaaid++; window.updateUI(); 
            }
        } 
        if(!g.visible && Date.now() - g.userData.cut > regrowDelay) g.visible = true; 
    });
    camera.position.set(mower.position.x, 15, mower.position.z + 15); 
    camera.lookAt(mower.position); renderer.render(scene, camera);
}

// --- 8. STARTUP ---
const isGeladen = window.load();
if(!isGeladen || !actieveOpdracht) window.genereerMissie(false); 
if(!isGeladen || !eventOpdracht) window.genereerMissie(true); 

setInterval(() => window.save(), 5000);
window.updateUI();
mower.material.color.set(alleSkinKleuren[huidigeSkin] || 0xff0000);
animate();
