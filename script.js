import * as THREE from 'three';

// --- 1. ENGINE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. GAME DATA & STATS ---
let geld = 0, totaalVerdiend = 0, totaalGemaaid = 0, totaalUpgrades = 0;
let trofeeën = 0, geclaimdeTrofeeën = 0; 
let grasWaarde = 0.01, huidigeSnelheid = 0.15, huidigMowerRadius = 1.3;
let prijsRadius = 5, prijsSnelheid = 5, prijsWaarde = 10;

const maanden = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
const maandSkins = [0xffffff, 0xffc0cb, 0xffd700, 0x00ff00, 0x8b4513, 0x000000, 0xffff00, 0xffa500, 0x800080, 0x006400, 0x808080, 0x8b0000];
const nu = new Date();
const huidigeMaandNaam = maanden[nu.getMonth()];

let gpLevel = 1; 
let eventLevel = 1;
let eventOpdracht = null, eventRewardKlaar = false;
let actieveOpdracht = null, rewardKlaar = false;
let huidigeSkin = "Red"; 
const keys = {}; // Toetsenbord object

const alleSkinKleuren = { "Red": 0xff0000, "Blue": 0x0000ff };
maanden.forEach((m, i) => { alleSkinKleuren[m] = maandSkins[i]; });

let ontgrendeldeSkins = ["Red"]; 

// --- 3. MISSIE LOGICA ---
function getStat(id) {
    if(id==='m') return totaalGemaaid; 
    if(id==='u') return totaalUpgrades; 
    if(id==='v') return totaalVerdiend; 
    return 0;
}

function genereerMissie(isEvent = false) {
    const types = [
        {id:'m', d:5000, t:"Maai 5000 sprieten"}, 
        {id:'u', d:10, t:"Koop 10 upgrades"}, 
        {id:'v', d:1000, t:"Verdien $1000"}
    ];
    const gekozen = types[Math.floor(Math.random()*types.length)];
    const lvl = isEvent ? eventLevel : gpLevel;
    const factor = 1 + (lvl * 0.15);
    
    const opdracht = {
        ...gekozen, 
        d: Math.floor(gekozen.d * factor), 
        start: getStat(gekozen.id),
        t: gekozen.t.replace(/\d+/, Math.floor(gekozen.d * factor))
    };

    if (isEvent) {
        eventOpdracht = opdracht;
        eventRewardKlaar = false;
    } else {
        const b = Math.random() > 0.5 ? {type:'g', w:Math.floor(lvl * 500 + 500)} : {type:'u', w:0.2};
        actieveOpdracht = { ...opdracht, beloning: b };
        rewardKlaar = false;
    }
}

// --- 4. UI CREATIE ---
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family: sans-serif; z-index:9999;';
document.body.appendChild(ui);

const statsContainer = document.createElement('div');
statsContainer.style.cssText = 'position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.85); padding:15px; border-radius:15px; border:3px solid #2ecc71; min-width:180px; pointer-events:auto;';
ui.appendChild(statsContainer);

const geldBox = document.createElement('div');
geldBox.style.cssText = 'color:#2ecc71; font-size:32px; font-weight:bold; font-family: Impact; text-align:center;';
statsContainer.appendChild(geldBox);

const trofeeStats = document.createElement('div');
trofeeStats.style.cssText = 'position:absolute; top:20px; right:20px; display:flex; flex-direction:column; gap:5px; pointer-events:auto;';
ui.appendChild(trofeeStats);

const leftMenu = document.createElement('div');
leftMenu.style.cssText = 'position:absolute; top:50%; left:20px; transform:translateY(-50%); display:flex; flex-direction:column; gap:15px; pointer-events:auto;';
ui.appendChild(leftMenu);

const rightBottomMenu = document.createElement('div');
rightBottomMenu.style.cssText = 'position:absolute; bottom:20px; right:20px; display:flex; flex-direction:column; gap:10px; pointer-events:auto;';
ui.appendChild(rightBottomMenu);

const eventBtn = document.createElement('button');
eventBtn.style.cssText = 'background:#9b59b6; color:white; border:3px solid white; padding:15px; border-radius:10px; cursor:pointer; font-weight:bold; min-width:180px;';

const cheatBtn = document.createElement('button');
cheatBtn.innerText = "🔑 REDEEM";
cheatBtn.style.cssText = 'background:#e74c3c; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;';
cheatBtn.onclick = () => window.useCheat();

rightBottomMenu.appendChild(cheatBtn);
rightBottomMenu.appendChild(eventBtn);

const gpBtn = document.createElement('button');
gpBtn.style.cssText = 'position:absolute; bottom:20px; left:20px; background: linear-gradient(to bottom, #f1c40f, #f39c12); color:white; border:3px solid white; padding:20px 40px; border-radius:15px; font-size:24px; cursor:pointer; pointer-events:auto; text-shadow: 2px 2px black; font-weight:bold;';
ui.appendChild(gpBtn);

const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed; top:0; left:-100%; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:10000; transition:0.4s; display:flex; align-items:center; justify-content:center; pointer-events:none; color:white; font-family: sans-serif;';
document.body.appendChild(overlay);

window.sluitMenu = () => { overlay.style.left = '-100%'; overlay.style.pointerEvents = 'none'; };

// --- 5. GAME ACTIONS ---
function updateUI() {
    geldBox.innerText = `$ ${geld.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    trofeeën = Math.floor(totaalVerdiend / 100000);
    trofeeStats.innerHTML = `
        <div style="background:rgba(0,0,0,0.8); padding:10px 20px; border-radius:10px; border:3px solid #f1c40f; color:#f1c40f; font-size:32px; text-align:right; font-weight:bold;">🏆 ${trofeeën}</div>
        <button onclick="openTrofeePad()" style="background:#f39c12; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold;">TROFEEËNPAD</button>
    `;
    
    leftMenu.innerHTML = `
        <button onclick="koop('r')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer;">RADIUS: $${prijsRadius.toFixed(0)}</button>
        <button onclick="koop('s')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer;">SPEED: $${prijsSnelheid.toFixed(0)}</button>
        <button onclick="koop('w')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer;">VALUE: $${prijsWaarde.toFixed(0)}</button>
        <button onclick="openSkinMenu()" style="width:220px; padding:10px; background:#3498db; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; margin-top:20px;">👕 SKINS</button>
    `;

    if (actieveOpdracht && (getStat(actieveOpdracht.id) - actieveOpdracht.start) >= actieveOpdracht.d) rewardKlaar = true;
    if (eventOpdracht && (getStat(eventOpdracht.id) - eventOpdracht.start) >= eventOpdracht.d) eventRewardKlaar = true;

    gpBtn.innerText = `⭐ GRASSPASS (LVL ${gpLevel})`;
    gpBtn.style.border = rewardKlaar ? '5px solid #2ecc71' : '3px solid white';

    eventBtn.innerText = `📅 ${huidigeMaandNaam.toUpperCase()} (${eventLevel})`;
    eventBtn.style.background = eventRewardKlaar ? '#2ecc71' : '#9b59b6';
}

window.useCheat = () => {
    // FIX: Zet alle bewegingen op stop voordat de prompt opent
    Object.keys(keys).forEach(k => keys[k] = false);

    const rawCode = prompt("Voer je code in:");
    if (!rawCode) return;
    const code = rawCode.trim().toLowerCase();

    if (code === "yeahman") { geld += 250000; totaalVerdiend += 250000; alert("✅ $250.000 erbij!"); } 
    else if (code === "!wannabeop") { geld += 100000; totaalVerdiend += 100000; alert("✅ $100.000 erbij!"); }
    else if (code === "og-kervelsoeps") { geld += 50000; totaalVerdiend += 50000; alert("✅ $50.000 erbij!"); }
    else if (code === "event-express") { eventLevel = 99; genereerMissie(true); alert("✅ Event Level 99!"); }
    else { alert("❌ Foute code!"); }
    updateUI(); 
};

window.koop = (t) => {
    if (t === 'r' && geld >= prijsRadius) { geld -= prijsRadius; huidigMowerRadius += 0.3; prijsRadius *= 1.6; totaalUpgrades++; }
    if (t === 's' && geld >= prijsSnelheid) { geld -= prijsSnelheid; huidigeSnelheid += 0.02; prijsSnelheid *= 1.6; totaalUpgrades++; }
    if (t === 'w' && geld >= prijsWaarde) { geld -= prijsWaarde; grasWaarde += 0.01; prijsWaarde *= 1.7; totaalUpgrades++; }
    updateUI();
};

window.claimGP = () => { 
    if(rewardKlaar) { 
        if(actieveOpdracht.beloning.type==='g') geld += actieveOpdracht.beloning.w; 
        else huidigMowerRadius += actieveOpdracht.beloning.w; 
        gpLevel++;
        genereerMissie(false); 
        updateUI(); 
        sluitMenu(); 
    } 
};

window.claimEvent = () => { 
    if(eventRewardKlaar) { 
        geld += (eventLevel < 100) ? 5000 : 1000;
        if (eventLevel === 99) {
            if (!ontgrendeldeSkins.includes(huidigeMaandNaam)) {
                ontgrendeldeSkins.push(huidigeMaandNaam);
                alert("🎉 NIEUWE SKIN ONTGRENDELD: De " + huidigeMaandNaam + " skin is van jou!");
            }
        }
        eventLevel++; 
        genereerMissie(true); 
        updateUI(); 
        sluitMenu(); 
    } 
};

gpBtn.onclick = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    const v = Math.min(getStat(actieveOpdracht.id) - actieveOpdracht.start, actieveOpdracht.d);
    const p = ((v / actieveOpdracht.d) * 100).toFixed(1);
    overlay.innerHTML = `<div style="background:#222; padding:40px; border-radius:25px; border:5px solid #f1c40f; text-align:center;">
        <h1 style="color:#f1c40f;">GRASS PASS - LEVEL ${gpLevel}</h1><p>${actieveOpdracht.t}</p>
        <div style="width:300px; height:25px; background:#444; border-radius:15px; margin:20px auto; overflow:hidden;"><div style="width:${p}%; height:100%; background:#f1c40f;"></div></div>
        <button onclick="claimGP()" style="color:white; border:none; padding:15px; border-radius:10px; cursor:pointer; font-weight:bold; background:${rewardKlaar ? '#2ecc71' : '#444'};">${rewardKlaar ? 'CLAIM' : 'LOCKED ('+p+'%)'}</button>
        <p onclick="sluitMenu()" style="cursor:pointer; margin-top:20px; opacity:0.5;">Sluiten</p></div>`;
};

eventBtn.onclick = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    const v = Math.min(getStat(eventOpdracht.id) - eventOpdracht.start, eventOpdracht.d);
    const p = ((v / eventOpdracht.d) * 100).toFixed(1);
    overlay.innerHTML = `<div style="background:#222; padding:40px; border-radius:25px; border:5px solid #9b59b6; text-align:center;">
        <h1 style="color:#9b59b6;">EVENT - LEVEL ${eventLevel}</h1><p>${eventOpdracht.t}</p>
        <div style="width:300px; height:25px; background:#444; border-radius:15px; margin:20px auto; overflow:hidden;"><div style="width:${p}%; height:100%; background:#9b59b6;"></div></div>
        <button onclick="claimEvent()" style="color:white; border:none; padding:15px; border-radius:10px; cursor:pointer; font-weight:bold; background:${eventRewardKlaar ? '#2ecc71' : '#444'};">${eventRewardKlaar ? 'CLAIM' : 'LOCKED ('+p+'%)'}</button>
        <p onclick="sluitMenu()" style="cursor:pointer; margin-top:20px; opacity:0.5;">Sluiten</p></div>`;
};

window.openTrofeePad = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    let padHTML = `<div style="background:#111; padding:40px; border:5px solid #f1c40f; border-radius:30px; width:600px; max-height:80vh; overflow-y:auto; position:relative;"><button onclick="sluitMenu()" style="position:absolute; top:15px; right:15px; background:#e74c3c; color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer;">X</button><h1 style="color:#f1c40f; font-family: Impact;">TROFEEËNPAD</h1>`;
    for (let i = 1; i <= 12; i++) {
        let canClaim = i <= trofeeën && i > geclaimdeTrofeeën;
        padHTML += `<div style="background:#222; margin:10px 0; padding:15px; border-radius:15px; display:flex; justify-content:space-between; align-items:center;"><span>🏆 Trofee ${i}</span><span>${i <= geclaimdeTrofeeën ? "✅" : (canClaim ? "<button onclick='window.claimTrofee("+i+")' style='background:#2ecc71; color:white; border:none; padding:5px 10px; border-radius:5px;'>CLAIM</button>" : "🔒")}</span></div>`;
    }
    overlay.innerHTML = padHTML + `</div>`;
};

window.claimTrofee = (nr) => { 
    geclaimdeTrofeeën++; 
    geld += 15000; 
    if(nr === 10 && !ontgrendeldeSkins.includes("Blue")) {
        ontgrendeldeSkins.push("Blue");
        alert("💙 BLAUWE SKIN ONTGRENDELD!");
    }
    updateUI(); 
    window.openTrofeePad(); 
};

window.openSkinMenu = () => {
    overlay.style.left = '0'; overlay.style.pointerEvents = 'auto';
    let h = `<div style="background:#111; padding:40px; border:4px solid #3498db; border-radius:30px; text-align:center;"><h1 style="color:#3498db; font-family: Impact;">SKINS</h1><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">`;
    const toonSkins = ["Red", "Blue", ...maanden];
    toonSkins.forEach(s => {
        const isUnlocked = ontgrendeldeSkins.includes(s);
        if (!isUnlocked) {
            h += `<button style="padding:15px; background:#222; color:#555; border:none; border-radius:10px; cursor:not-allowed;">${s}</button>`;
        } else {
            h += `<button onclick="setSkin('${s}')" style="padding:15px; background:${huidigeSkin === s ? '#2ecc71' : '#333'}; color:white; border:none; border-radius:10px; cursor:pointer;">${s}${huidigeSkin === s ? " [AAN]" : ""}</button>`;
        }
    });
    overlay.innerHTML = h + `</div><button onclick="sluitMenu()" style="margin-top:20px; padding:10px; cursor:pointer; background:#444; color:white; border:none; border-radius:5px;">SLUIT</button></div>`;
};

window.setSkin = (s) => { huidigeSkin = s; mower.material.color.set(alleSkinKleuren[s]); window.openSkinMenu(); };

// --- 6. 3D WERELD & ANIMATIE ---
const mower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0xff0000}));
scene.add(mower);
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const light = new THREE.DirectionalLight(0xffffff, 1); light.position.set(5, 15, 5); scene.add(light);
camera.position.set(0, 15, 15);

const grassArr = [];
for(let x=-20; x<20; x+=0.8) {
    for(let z=-20; z<20; z+=0.8) {
        const g = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), new THREE.MeshStandardMaterial({color: 0x2ecc71}));
        g.position.set(x,0,z); g.userData = {cut: 0}; scene.add(g); grassArr.push(g);
    }
}

window.onkeydown=(e)=>keys[e.key.toLowerCase()]=true;
window.onkeyup=(e)=>keys[e.key.toLowerCase()]=false;

function animate() {
    requestAnimationFrame(animate);
    if(keys['w']||keys['z']) mower.position.z -= huidigeSnelheid;
    if(keys['s']) mower.position.z += huidigeSnelheid;
    if(keys['a']||keys['q']) mower.position.x -= huidigeSnelheid;
    if(keys['d']) mower.position.x += huidigeSnelheid;
    grassArr.forEach(g => {
        if(g.visible && mower.position.distanceTo(g.position) < huidigMowerRadius) {
            g.visible = false; g.userData.cut = Date.now();
            geld += grasWaarde; totaalVerdiend += grasWaarde; totaalGemaaid++; 
            updateUI();
        }
        if(!g.visible && Date.now() - g.userData.cut > 8000) g.visible = true;
    });
    camera.position.set(mower.position.x, 15, mower.position.z + 15);
    camera.lookAt(mower.position);
    renderer.render(scene, camera);
}

genereerMissie(false); genereerMissie(true); updateUI(); animate();
