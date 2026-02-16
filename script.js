import * as THREE from 'three';

// --- GAME VARIABELEN ---
let geld = 0, totaalVerdiend = 0, totaalGemaaid = 0, totaalUpgrades = 0, speedSpending = 0;
let trofeeën = 0, geclaimdeRewards = 0, huidigLevel = 1;
let grasWaarde = 0.01, huidigeSnelheid = 0.12, huidigMowerRadius = 1.0;
let prijsRadius = 5.0, prijsSnelheid = 5.0, prijsWaarde = 10.0;
let actieveOpdracht = null;

// --- GRASSPASS SYSTEEM ---
function genereerOpdracht() {
    if (huidigLevel <= 24) {
        const opties = [
            { id: 'm', doel: 5000, tekst: "Maai 5000 grassprieten" }, // [cite: 12]
            { id: 'u', doel: 5, tekst: "Koop 5 upgrades" },         // [cite: 13]
            { id: 'v', doel: 500, tekst: "Verdien $500" },          // [cite: 14]
            { id: 's', doel: 50, tekst: "Spendeer $50 aan snelheid" } // [cite: 15]
        ];
        const gekozen = opties[Math.floor(Math.random() * opties.length)];
        const beloning = Math.random() > 0.5 ? { t: 'g', w: 500, txt: "$500" } : { t: 'u', w: 2, txt: "2 gratis upgrades" }; // [cite: 17, 18]
        actieveOpdracht = { ...gekozen, beloning, start: getStat(gekozen.id) };
    } else if (huidigLevel === 25) {
        actieveOpdracht = { id: 'm', doel: 250000, tekst: "Maai 250.000 grassprieten", start: totaalGemaaid, beloning: { t: 'g', w: 25000, txt: "$25.000" } }; // [cite: 20, 21]
    } else {
        const opties = [
            { id: 'm', doel: 25000, tekst: "Maai 25000 grassprieten" }, // [cite: 23]
            { id: 'u', doel: 25, tekst: "Koop 25 upgrades" },          // [cite: 24]
            { id: 'v', doel: 2500, tekst: "Verdien $2500" },            // [cite: 25]
            { id: 's', doel: 250, tekst: "Spendeer $250 aan snelheid" } // [cite: 26]
        ];
        const gekozen = opties[Math.floor(Math.random() * opties.length)];
        const beloning = Math.random() > 0.5 ? { t: 'g', w: 2500, txt: "$2500" } : { t: 'u', w: 15, txt: "15 gratis upgrades" }; // [cite: 28, 29]
        actieveOpdracht = { ...gekozen, beloning, start: getStat(gekozen.id) };
    }
}

function getStat(id) {
    if (id === 'm') return totaalGemaaid;
    if (id === 'u') return totaalUpgrades;
    if (id === 'v') return totaalVerdiend;
    if (id === 's') return speedSpending;
}

// --- UI CREATIE ---
const container = document.createElement('div');
container.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family:sans-serif; color:white;';
document.body.appendChild(container);

const stats = document.createElement('div');
stats.style.cssText = 'position:absolute; top:20px; left:20px; font-size:22px; pointer-events:auto; background:rgba(0,0,0,0.6); padding:10px; border-radius:10px;';
container.appendChild(stats);

const upMenu = document.createElement('div');
upMenu.style.cssText = 'position:absolute; top:120px; left:20px; pointer-events:auto; display:flex; flex-direction:column; gap:10px;';
container.appendChild(upMenu);

const gpBtn = document.createElement('button');
gpBtn.innerText = "⭐ GRASSPASS";
gpBtn.style.cssText = 'position:absolute; bottom:20px; left:20px; pointer-events:auto; background:#f1c40f; padding:15px 30px; border:none; border-radius:50px; font-weight:bold; cursor:pointer;';
container.appendChild(gpBtn);

const skinBtn = document.createElement('button'); // [cite: 8]
skinBtn.innerText = "👕 SKINS";
skinBtn.style.cssText = 'position:absolute; bottom:20px; left:50%; transform:translateX(-50%); pointer-events:auto; background:#3498db; padding:15px 30px; border:none; border-radius:50px; color:white; font-weight:bold; display:none; cursor:pointer;';
container.appendChild(skinBtn);

const gpOverlay = document.createElement('div');
gpOverlay.style.cssText = 'position:fixed; top:0; left:-100%; width:100%; height:100%; background:rgba(0,0,0,0.9); pointer-events:auto; transition:0.5s; display:flex; align-items:center; justify-content:center; z-index:100;';
document.body.appendChild(gpOverlay);

// --- TROFEE BELONINGEN ---
function checkTrofee() {
    if (totaalVerdiend >= (trofeeën + 1) * 100000) {
        trofeeën++;
        let prijs = 0;
        if (trofeeën === 1) prijs = 50000; // [cite: 2]
        else if (trofeeën === 2) prijs = 75000; // [cite: 4]
        else if (trofeeën >= 3 && trofeeën <= 9) prijs = Math.floor(Math.random() * 90001) + 10000; // [cite: 6]
        else if (trofeeën === 10) skinBtn.style.display = 'block'; // [cite: 7, 8]
        geld += prijs;
    }
}

// --- UPGRADE ACTIES ---
function koop(type) {
    if (type === 'r' && geld >= prijsRadius) { geld -= prijsRadius; huidigMowerRadius += 0.2; prijsRadius *= 1.5; totaalUpgrades++; }
    if (type === 's' && geld >= prijsSnelheid) { geld -= prijsSnelheid; speedSpending += prijsSnelheid; huidigeSnelheid += 0.02; prijsSnelheid *= 1.5; totaalUpgrades++; }
    if (type === 'w' && geld >= prijsWaarde) { geld -= prijsWaarde; grasWaarde += 0.01; prijsWaarde *= 1.5; totaalUpgrades++; }
    updateUI();
}

function updateUI() {
    stats.innerHTML = `Geld: $${geld.toFixed(2)}<br>Trofeeën: ${trofeeën}`;
    upMenu.innerHTML = `
        <button onclick="window.koop('r')" style="padding:10px; background:#2ecc71; border:none; color:white; cursor:pointer;">Radius ($${prijsRadius.toFixed(0)})</button>
        <button onclick="window.koop('s')" style="padding:10px; background:#2ecc71; border:none; color:white; cursor:pointer;">Snelheid ($${prijsSnelheid.toFixed(0)})</button>
        <button onclick="window.koop('w')" style="padding:10px; background:#2ecc71; border:none; color:white; cursor:pointer;">Waarde ($${prijsWaarde.toFixed(0)})</button>
    `;
    const v = getStat(actieveOpdracht.id) - actieveOpdracht.start;
    if (v >= actieveOpdracht.doel) {
        if (actieveOpdracht.beloning.t === 'g') geld += actieveOpdracht.beloning.w;
        huidigLevel++; genereerOpdracht();
    }
}
window.koop = koop;

gpBtn.onclick = () => {
    gpOverlay.style.left = '0';
    const v = getStat(actieveOpdracht.id) - actieveOpdracht.start;
    gpOverlay.innerHTML = `<div style="text-align:center; color:white; background:#222; padding:40px; border:2px solid #f1c40f; border-radius:20px;">
        <h1>LEVEL ${huidigLevel}</h1><p>${actieveOpdracht.tekst}</p>
        <p>Voortgang: ${v} / ${actieveOpdracht.doel}</p>
        <p style="color:#2ecc71">Beloning: ${actieveOpdracht.beloning.txt}</p>
        <button onclick="document.body.lastChild.style.left='-100%'" style="padding:10px 20px; cursor:pointer;">SLUITEN</button>
    </div>`;
};

skinBtn.onclick = () => { // [cite: 9]
    const s = prompt("Kies skin: 'blauw' of 'rood'");
    if(s === 'blauw') mower.material.color.set(0x0000ff); // [cite: 10]
    else mower.material.color.set(0xff0000);
};

// --- THREE.JS ENGINE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const mower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0xff0000}));
scene.add(mower);
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 5); scene.add(sun);
camera.position.set(0, 10, 10); camera.lookAt(0,0,0);

const grass = [];
for(let x=-15; x<15; x+=0.6) {
    for(let z=-15; z<15; z+=0.6) {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({color: 0x2ecc71}));
        g.position.set(x, 0, z); scene.add(g); grass.push(g);
    }
}

const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function animate() {
    requestAnimationFrame(animate);
    if(keys['z'] || keys['w']) mower.position.z -= huidigeSnelheid;
    if(keys['s']) mower.position.z += huidigeSnelheid;
    if(keys['q'] || keys['a']) mower.position.x -= huidigeSnelheid;
    if(keys['d']) mower.position.x += huidigeSnelheid;

    grass.forEach(g => {
        if(g.visible && mower.position.distanceTo(g.position) < huidigMowerRadius) {
            g.visible = false; geld += grasWaarde; totaalVerdiend += grasWaarde; totaalGemaaid++;
            checkTrofee(); updateUI();
        }
    });
    camera.position.set(mower.position.x, 10, mower.position.z + 10);
    camera.lookAt(mower.position);
    renderer.render(scene, camera);
}

genereerOpdracht();
updateUI();
animate();
