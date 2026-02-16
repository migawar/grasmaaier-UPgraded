import * as THREE from 'three';

// --- INITIALISATIE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- GAME STATE (DATA UIT PDF) ---
let geld = 0, totaalVerdiend = 0, totaalGemaaid = 0, totaalUpgrades = 0, speedSpending = 0;
let trofeeën = 0, geclaimdeRewards = 0, huidigLevel = 1;
let grasWaarde = 0.01, huidigeSnelheid = 0.15, huidigMowerRadius = 1.3;
let prijsRadius = 5, prijsSnelheid = 5, prijsWaarde = 10;
let actieveOpdracht = null;

// --- GRASSPASS SYSTEEM  ---
function genereerMissie() {
    if (huidigLevel <= 24) {
        const types = [
            { id: 'm', d: 5000, t: "Maai 5000 grassprieten" },
            { id: 'u', d: 5, t: "Koop 5 upgrades" },
            { id: 'v', d: 500, t: "Verdien $500" },
            { id: 's', d: 50, t: "Spendeer $50 aan snelheid" }
        ];
        const m = types[Math.floor(Math.random() * types.length)];
        const b = Math.random() > 0.5 ? { type: 'g', w: 500, txt: "$500" } : { type: 'u', w: 2, txt: "2 upgrades gratis" };
        actieveOpdracht = { ...m, beloning: b, start: getStat(m.id) };
    } else if (huidigLevel === 25) {
        actieveOpdracht = { id: 'm', d: 250000, t: "Maai 250.000 grassprieten", start: totaalGemaaid, beloning: { type: 'g', w: 25000, txt: "$25.000" } };
    } else {
        const types = [
            { id: 'm', d: 25000, t: "Maai 25000 grassprieten" },
            { id: 'u', d: 25, t: "Koop 25 upgrades" },
            { id: 'v', d: 2500, t: "Verdien $2500" },
            { id: 's', d: 250, t: "Spendeer $250 aan snelheid" }
        ];
        const m = types[Math.floor(Math.random() * types.length)];
        const b = Math.random() > 0.5 ? { type: 'g', w: 2500, txt: "$2500" } : { type: 'u', w: 15, txt: "15 upgrades gratis" };
        actieveOpdracht = { ...m, beloning: b, start: getStat(m.id) };
    }
}

function getStat(id) {
    if (id === 'm') return totaalGemaaid;
    if (id === 'u') return totaalUpgrades;
    if (id === 'v') return totaalVerdiend;
    if (id === 's') return speedSpending;
    return 0;
}

// --- UI ELEMENTEN (VASTE POSITIES) ---
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family: sans-serif; z-index:9999;';
document.body.appendChild(ui);

// 1. Stats Rechtsboven
const statsBox = document.createElement('div');
statsBox.style.cssText = 'position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.85); padding:20px; border-radius:12px; border:2px solid #444; color:white; pointer-events:auto; text-align:right; min-width:150px;';
ui.appendChild(statsBox);

// 2. Upgrades Linksboven
const upgradeBox = document.createElement('div');
upgradeBox.style.cssText = 'position:absolute; top:20px; left:20px; display:flex; flex-direction:column; gap:12px; pointer-events:auto;';
ui.appendChild(upgradeBox);

// 3. Grasspass Knop (Linksonder)
const gpBtn = document.createElement('button');
gpBtn.innerText = "⭐ GRASSPASS";
gpBtn.style.cssText = 'position:absolute; bottom:30px; left:30px; background:#f1c40f; color:black; border:none; padding:18px 35px; border-radius:50px; font-weight:bold; cursor:pointer; pointer-events:auto; box-shadow: 0 5px 15px rgba(0,0,0,0.3);';
ui.appendChild(gpBtn);

// 4. Skin Knop (Middenonder - verschijnt bij T10)
const skinBtn = document.createElement('button');
skinBtn.innerText = "👕 KIES SKIN";
skinBtn.style.cssText = 'position:absolute; bottom:30px; left:50%; transform:translateX(-50%); background:#3498db; color:white; border:none; padding:15px 30px; border-radius:50px; font-weight:bold; cursor:pointer; pointer-events:auto; display:none;';
ui.appendChild(skinBtn);

const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed; top:0; left:-100%; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; transition:0.5s; display:flex; align-items:center; justify-content:center; pointer-events:auto; color:white;';
document.body.appendChild(overlay);

// --- LOGICA FUNCTIES ---
function updateUI() {
    statsBox.innerHTML = `
        <div style="font-size:26px; color:#2ecc71; font-weight:bold;">$ ${geld.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        <div style="font-size:18px; color:#f1c40f; margin-top:5px;">🏆 Trofeeën: ${trofeeën}</div>
    `;

    upgradeBox.innerHTML = `
        <button onclick="koop('r')" style="width:220px; padding:15px; background:#2ecc71; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; text-align:left;">Radius: $${prijsRadius.toFixed(0)}</button>
        <button onclick="koop('s')" style="width:220px; padding:15px; background:#2ecc71; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; text-align:left;">Snelheid: $${prijsSnelheid.toFixed(0)}</button>
        <button onclick="koop('w')" style="width:220px; padding:15px; background:#2ecc71; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; text-align:left;">Graswaarde: $${prijsWaarde.toFixed(0)}</button>
    `;

    // Trofee Checks
    if (totaalVerdiend >= (trofeeën + 1) * 100000) {
        trofeeën++;
        let p = (trofeeën === 1) ? 50000 : (trofeeën === 2) ? 75000 : Math.floor(Math.random() * 90001) + 10000;
        if (trofeeën === 10) skinBtn.style.display = 'block';
        geld += p;
    }

    // Grasspass Check
    const v = getStat(actieveOpdracht.id) - actieveOpdracht.start;
    if (v >= actieveOpdracht.d) {
        if (actieveOpdracht.beloning.type === 'g') geld += actieveOpdracht.beloning.w;
        huidigLevel++; genereerMissie();
    }
}

window.koop = (t) => {
    if (t === 'r' && geld >= prijsRadius) { geld -= prijsRadius; huidigMowerRadius += 0.3; prijsRadius *= 1.6; totaalUpgrades++; }
    if (t === 's' && geld >= prijsSnelheid) { geld -= prijsSnelheid; speedSpending += prijsSnelheid; huidigeSnelheid += 0.02; prijsSnelheid *= 1.6; totaalUpgrades++; }
    if (t === 'w' && geld >= prijsWaarde) { geld -= prijsWaarde; grasWaarde += 0.01; prijsWaarde *= 1.7; totaalUpgrades++; }
    updateUI();
};

gpBtn.onclick = () => {
    overlay.style.left = '0';
    const v = getStat(actieveOpdracht.id) - actieveOpdracht.start;
    const p = Math.min(Math.floor((v / actieveOpdracht.d) * 100), 100);
    overlay.innerHTML = `
        <div style="background:#1a1a1a; padding:50px; border:3px solid #f1c40f; border-radius:30px; text-align:center; width:450px;">
            <h1 style="color:#f1c40f; margin:0;">LEVEL ${huidigLevel}</h1>
            <h2 style="margin:20px 0;">${actieveOpdracht.t}</h2>
            <div style="width:100%; height:25px; background:#333; border-radius:15px; overflow:hidden; border:1px solid #555;">
                <div style="width:${p}%; height:100%; background:#f1c40f;"></div>
            </div>
            <p style="margin-top:10px;">${v.toLocaleString()} / ${actieveOpdracht.d.toLocaleString()} (${p}%)</p>
            <p style="color:#2ecc71; font-weight:bold; font-size:1.2em;">BELONING: ${actieveOpdracht.beloning.txt}</p>
            <button onclick="this.parentElement.parentElement.style.left='-100%'" style="margin-top:20px; padding:12px 40px; border-radius:10px; border:none; font-weight:bold; cursor:pointer;">SLUITEN</button>
        </div>`;
};

skinBtn.onclick = () => {
    const s = prompt("Kies een skin: 'blauw' of 'rood'");
    if(s === 'blauw') mower.material.color.set(0x0000ff);
    else mower.material.color.set(0xff0000);
};

// --- 3D WERELD & GRAS ---
const mower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0xff0000}));
scene.add(mower);
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 15, 5); scene.add(sun);
camera.position.set(0, 15, 15);

const grassArr = [];
for(let x=-20; x<20; x+=0.8) {
    for(let z=-20; z<20; z+=0.8) {
        const g = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({color: 0x2ecc71}));
        g.position.set(x, 0, z);
        g.userData = { cutTime: 0 };
        scene.add(g); grassArr.push(g);
    }
}

const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function animate() {
    requestAnimationFrame(animate);
    const nu = Date.now();

    if(keys['w'] || keys['z']) mower.position.z -= huidigeSnelheid;
    if(keys['s']) mower.position.z += huidigeSnelheid;
    if(keys['a'] || keys['q']) mower.position.x -= huidigeSnelheid;
    if(keys['d']) mower.position.x += huidigeSnelheid;

    grassArr.forEach(g => {
        if(g.visible && mower.position.distanceTo(g.position) < huidigMowerRadius) {
            g.visible = false; g.userData.cutTime = nu;
            geld += grasWaarde; totaalVerdiend += grasWaarde; totaalGemaaid++; updateUI();
        }
        if(!g.visible && nu - g.userData.cutTime > 8000) g.visible = true; // Teruggroei
    });

    camera.position.set(mower.position.x, 15, mower.position.z + 15);
    camera.lookAt(mower.position);
    renderer.render(scene, camera);
}

genereerMissie();
updateUI();
animate();
