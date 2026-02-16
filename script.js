import * as THREE from 'three';

// 1. SCÈNE & CAMERA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- STATS ---
let geld = 0.00;
let totaalVerdiend = 0.00; 
let trofeeën = 0;
let geclaimdeRewards = 0;
let totaalGemaaid = 0;
let grasWaarde = 0.01;
let huidigMowerRadius = 1.0;
let huidigeSnelheid = 0.12;
let prijsRadius = 5.00, prijsSnelheid = 5.00, prijsWaarde = 10.00;

const MAX_RADIUS = 10.0;
const MAX_WAARDE = 5.01;

// --- GRASSPASS MISSIES (MOEILIJKER & UITDAGEND) ---
let huidigeMissieIndex = 0;
const grassPassMissies = [
    { tekst: "BEGINNER: Maai 500 sprieten", doel: 500, beloning: 2500 },
    { tekst: "GEVORDERDE: Maai 2.500 sprieten", doel: 2500, beloning: 15000 },
    { tekst: "PROFESSIONAL: Maai 10.000 sprieten", doel: 10000, beloning: 75000 },
    { tekst: "MONEY MAKER: Verdien $50.000 totaal", doel: 50000, type: "geld", beloning: 25000 },
    { tekst: "LEGEND: Maai 100.000 sprieten", doel: 100000, beloning: 500000 }
];

// --- DE CREATIEVE GRASSPASS OVERLAY ---
const gpOverlay = document.createElement('div');
gpOverlay.style.cssText = `
    position: fixed; top: 0; left: -100%; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    transition: left 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    font-family: 'Arial Black', sans-serif;
`;
document.body.appendChild(gpOverlay);

const gpContent = document.createElement('div');
gpContent.style.cssText = `
    width: 600px; background: linear-gradient(180deg, #1e1e1e 0%, #000 100%);
    border: 4px solid #f1c40f; border-radius: 30px; padding: 40px;
    color: white; text-align: center; box-shadow: 0 0 50px rgba(241, 196, 15, 0.4);
`;
gpOverlay.appendChild(gpContent);

function toggleGrassPass(show) {
    if (show) {
        updateGPContent();
        gpOverlay.style.left = '0';
    } else {
        gpOverlay.style.left = '-100%';
    }
}

function updateGPContent() {
    let m = grassPassMissies[huidigeMissieIndex];
    if (!m) {
        gpContent.innerHTML = `<h1 style="color:#f1c40f; font-size:40px;">GRASSPASS VOLTOOID!</h1><p>Je bent de koning van het veld.</p>`;
    } else {
        let v = m.type === "geld" ? totaalVerdiend : totaalGemaaid;
        let p = Math.floor(Math.min((v / m.doel) * 100, 100));
        gpContent.innerHTML = `
            <div style="text-align:right;"><button onclick="this.parentElement.parentElement.parentElement.style.left='-100%'" style="background:none; border:none; color:white; font-size:30px; cursor:pointer;">&times;</button></div>
            <h1 style="color:#f1c40f; font-size:35px; margin-top:-20px;">⭐ GRASSPASS</h1>
            <p style="color:#bbb; letter-spacing:2px;">SEIZOEN 1</p>
            <div style="margin: 40px 0; background: #333; height: 40px; border-radius: 20px; position: relative; overflow: hidden; border: 2px solid #555;">
                <div style="width: ${p}%; height: 100%; background: linear-gradient(90deg, #f1c40f, #f39c12); transition: width 1s;"></div>
                <span style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-weight: bold; font-size: 18px;">${p}%</span>
            </div>
            <h2 style="font-size: 24px;">${m.tekst}</h2>
            <p style="font-size: 18px; color: #2ecc71;">BELONING: $${formatteerGeld(m.beloning)}</p>
            <button id="closeGPBtn" style="margin-top: 30px; padding: 15px 40px; background: white; color: black; border: none; border-radius: 50px; font-weight: bold; cursor: pointer; transition: 0.2s;">TERUG NAAR DE GAME</button>
        `;
        document.getElementById('closeGPBtn').onclick = () => toggleGrassPass(false);
    }
}

// --- ANDERE UI ---
const gpBtn = document.createElement('button');
gpBtn.style.cssText = 'position:absolute; bottom:20px; left:20px; z-index:10; background:#f1c40f; color:black; border:none; padding:15px 30px; cursor:pointer; border-radius:50px; font-weight:bold; box-shadow: 0 5px 15px rgba(0,0,0,0.5);';
gpBtn.innerText = "⭐ GRASSPASS";
gpBtn.onclick = () => toggleGrassPass(true);
document.body.appendChild(gpBtn);

// XP Balk (Altijd in beeld bovenaan)
const xpContainer = document.createElement('div');
xpContainer.style.cssText = 'position:absolute; top:20px; left:50%; transform:translateX(-50%); width:400px; height:10px; background:rgba(0,0,0,0.5); border-radius:10px; border: 1px solid rgba(255,255,255,0.3); overflow:hidden; z-index:10;';
document.body.appendChild(xpContainer);
const xpBalk = document.createElement('div');
xpBalk.style.cssText = 'width:0%; height:100%; background:#f1c40f; transition:0.3s;';
xpContainer.appendChild(xpBalk);

const geldDisplay = document.createElement('div');
geldDisplay.style.cssText = 'position:absolute; top:15px; left:15px; color:white; font-size:24px; font-family:monospace; z-index:10;';
document.body.appendChild(geldDisplay);

const trofeeDisplay = document.createElement('div');
trofeeDisplay.style.cssText = 'position:absolute; top:15px; right:15px; color:#f1c40f; font-size:24px; font-family:monospace; border:2px solid #f1c40f; padding:5px 15px; border-radius:10px; z-index:10;';
document.body.appendChild(trofeeDisplay);

const rewardBtn = document.createElement('button');
rewardBtn.style.cssText = 'position:absolute; right:20px; top:50%; transform:translateY(-50%); background:#32CD32; color:white; border:none; padding:20px; cursor:pointer; border-radius:15px; font-weight:bold; display:none; z-index:10;';
rewardBtn.onclick = claimReward;
document.body.appendChild(rewardBtn);

const skinBtn = document.createElement('button');
skinBtn.style.cssText = 'position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:#3498db; color:white; border:none; padding:15px 30px; cursor:pointer; border-radius:10px; font-weight:bold; display:none; z-index:10;';
skinBtn.innerText = "SKINS";
skinBtn.onclick = () => {
    let k = prompt("Skin kiezen: 'blauw' of 'rood'");
    mower.material.color.set(k?.toLowerCase() === 'blauw' ? 0x0000ff : 0xff0000);
};
document.body.appendChild(skinBtn);

function formatteerGeld(b) {
    if (b >= 1000000) return (b / 1000000).toFixed(2) + " mil";
    return b.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function claimReward() {
    if (trofeeën > geclaimdeRewards) {
        let nr = geclaimdeRewards + 1;
        let bonus = 0;
        if (nr === 1) bonus = 50000;
        else if (nr === 2) bonus = 75000;
        else if (nr >= 3 && nr <= 9) bonus = Math.floor(Math.random() * 90001) + 10000;
        else if (nr === 10) { skinBtn.style.display = 'block'; }
        geld += bonus; geclaimdeRewards++; updateUI();
    }
}

function updateUI() {
    geldDisplay.innerText = '$ ' + formatteerGeld(geld);
    trofeeDisplay.innerText = '🏆 ' + trofeeën;
    rewardBtn.style.display = (trofeeën > geclaimdeRewards) ? 'block' : 'none';
    rewardBtn.innerHTML = `BELONING!<br><small>${trofeeën - geclaimdeRewards} klaar</small>`;
    
    let m = grassPassMissies[huidigeMissieIndex];
    if (m) {
        let v = m.type === "geld" ? totaalVerdiend : totaalGemaaid;
        let p = (v / m.doel) * 100;
        xpBalk.style.width = Math.min(p, 100) + "%";
        if (v >= m.doel) {
            geld += m.beloning; huidigeMissieIndex++; updateUI();
        }
    }

    btnRadius.innerText = huidigMowerRadius >= MAX_RADIUS ? "MAX" : `RADIUS ($${formatteerGeld(prijsRadius)})`;
    btnSpeed.innerText = `SNELLER ($${formatteerGeld(prijsSnelheid)})`;
    btnWaarde.innerText = grasWaarde >= MAX_WAARDE ? "MAX" : `WAARDE ($${formatteerGeld(prijsWaarde)})`;
}

// --- GAME WORLD ---
const mower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
mower.position.y = 0.3;
scene.add(mower);

const grassArray = [];
for (let x = -25; x < 25; x += 0.7) {
    for (let z = -25; z < 25; z += 0.7) {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), new THREE.MeshStandardMaterial({ color: 0x2ecc71 }));
        g.position.set(x, 0, z);
        scene.add(g);
        grassArray.push(g);
    }
}

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

// --- INPUT LOGIC (ZONDER BUG) ---
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function animate() {
    requestAnimationFrame(animate);
    
    // Alleen bewegen als de Grasspass overlay NIET open is
    if (gpOverlay.style.left !== '0px') {
        if (keys['z'] || keys['w']) mower.position.z -= huidigeSnelheid;
        if (keys['s']) mower.position.z += huidigeSnelheid;
        if (keys['q'] || keys['a']) mower.position.x -= huidigeSnelheid;
        if (keys['d']) mower.position.x += huidigeSnelheid;
    }

    const now = Date.now();
    for (let g of grassArray) {
        if (g.visible && mower.position.distanceTo(g.position) < huidigMowerRadius) {
            g.visible = false; g.userData.t = now;
            geld += grasWaarde; totaalVerdiend += grasWaarde; totaalGemaaid++;
            if (totaalVerdiend >= (trofeeën + 1) * 100000) trofeeën++;
            updateUI();
        } else if (!g.visible && now - g.userData.t > 4000) { g.visible = true; }
    }
    camera.position.set(mower.position.x, 15, mower.position.z + 12);
    camera.lookAt(mower.position);
    renderer.render(scene, camera);
}

// Upgrade Menu
const menu = document.createElement('div');
menu.style.cssText = 'position:absolute; left:10px; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:8px; z-index:10;';
document.body.appendChild(menu);

const btnRadius = document.createElement('button');
const btnSpeed = document.createElement('button');
const btnWaarde = document.createElement('button');
[btnRadius, btnSpeed, btnWaarde].forEach((b, i) => {
    b.style.cssText = 'background:#2ecc71; color:white; border:none; padding:12px; cursor:pointer; border-radius:5px; font-weight:bold; width:180px; text-align:left;';
    b.onclick = () => {
        if (i === 0 && geld >= prijsRadius && huidigMowerRadius < MAX_RADIUS) { geld -= prijsRadius; huidigMowerRadius += 0.4; prijsRadius *= 1.8; }
        if (i === 1 && geld >= prijsSnelheid) { geld -= prijsSnelheid; huidigeSnelheid += 0.02; prijsSnelheid *= 1.6; }
        if (i === 2 && geld >= prijsWaarde && grasWaarde < MAX_WAARDE) { geld -= prijsWaarde; grasWaarde += 0.05; prijsWaarde *= 1.8; }
        updateUI();
    };
    menu.appendChild(b);
});

// Cheat
const cheatBtn = document.createElement('button');
cheatBtn.style.cssText = 'position:absolute; top:10px; left:50%; transform:translateX(-50%); background:none; border:none; color:rgba(255,255,255,0.2); font-size:10px; cursor:pointer; z-index:10;';
cheatBtn.innerText = "CODE";
cheatBtn.onclick = () => { if(prompt("Code:") === "OG-kervelsoeps") { geld += 500000; updateUI(); } };
document.body.appendChild(cheatBtn);

updateUI();
animate();
