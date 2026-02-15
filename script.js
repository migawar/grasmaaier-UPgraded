import * as THREE from 'three';

// 1. SCÈNE & CAMERA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- STATS & ECONOMIE ---
let geld = 0.00;
let totaalVerdiend = 0.00; 
let trofeeën = 0;
let geclaimdeRewards = 0;
let totaalGemaaid = 0;
let grasWaarde = 0.01;
let huidigMowerRadius = 1.0;
let huidigeSnelheid = 0.12;

let prijsRadius = 5.00;
let prijsSnelheid = 5.00;
let prijsWaarde = 10.00;

const MAX_RADIUS = 10.0;
const MAX_WAARDE = 5.01;

// --- GRASSPASS & XP ---
let huidigeMissieIndex = 0;
const grassPassMissies = [
    { tekst: "Maai 100 grassprieten", doel: 100, beloning: 500 },
    { tekst: "Maai 500 grassprieten", doel: 500, beloning: 2500 },
    { tekst: "Maai 2.500 grassprieten", doel: 2500, beloning: 15000 },
    { tekst: "Verdien je eerste $1.000", doel: 1000, type: "geld", beloning: 5000 }
];

// --- UI BOUWEN ---
const uiCSS = 'position:absolute; font-family:sans-serif; z-index:10;';

// XP Balk (Bovenaan)
const xpContainer = document.createElement('div');
xpContainer.style.cssText = uiCSS + 'top:20px; left:50%; transform:translateX(-50%); width:300px; height:15px; background:rgba(0,0,0,0.5); border:2px solid white; border-radius:10px; overflow:hidden;';
document.body.appendChild(xpContainer);

const xpBalk = document.createElement('div');
xpBalk.style.cssText = 'width:0%; height:100%; background:#00f2fe; transition:0.2s;';
xpContainer.appendChild(xpBalk);

const xpTekst = document.createElement('div');
xpTekst.style.cssText = uiCSS + 'top:40px; left:50%; transform:translateX(-50%); color:white; font-size:12px; font-weight:bold;';
document.body.appendChild(xpTekst);

// Geld (Links)
const geldDisplay = document.createElement('div');
geldDisplay.style.cssText = uiCSS + 'top:10px; left:10px; color:white; font-size:20px; background:rgba(0,0,0,0.5); padding:10px; border-radius:5px;';
document.body.appendChild(geldDisplay);

// Trofeeën (Rechts)
const trofeeDisplay = document.createElement('div');
trofeeDisplay.style.cssText = uiCSS + 'top:10px; right:10px; color:#f1c40f; font-size:20px; background:rgba(0,0,0,0.5); padding:10px; border-radius:5px; border:2px solid #f1c40f;';
document.body.appendChild(trofeeDisplay);

// Reward Knop (Rechts Midden)
const rewardBtn = document.createElement('button');
rewardBtn.style.cssText = uiCSS + 'right:10px; top:50%; background:#32CD32; color:white; border:none; padding:15px; cursor:pointer; border-radius:10px; font-weight:bold; display:none;';
rewardBtn.onclick = claimReward;
document.body.appendChild(rewardBtn);

// Skin Knop (Onder Midden) - Volgens Trofee 10 [cite: 7, 8]
const skinBtn = document.createElement('button');
skinBtn.style.cssText = uiCSS + 'bottom:20px; left:50%; transform:translateX(-50%); background:#3498db; color:white; border:none; padding:15px 30px; cursor:pointer; border-radius:5px; font-weight:bold; display:none;';
skinBtn.innerText = "SKINS";
skinBtn.onclick = () => {
    let keuze = prompt("Kies je skin: 'blauw' of 'rood'");
    if(keuze?.toLowerCase() === 'blauw') mower.material.color.set(0x0000ff); // [cite: 10]
    else mower.material.color.set(0xff0000);
};
document.body.appendChild(skinBtn);

// Grasspass Knop (Links Onder)
const gpBtn = document.createElement('button');
gpBtn.style.cssText = uiCSS + 'bottom:20px; left:20px; background:orange; color:white; border:none; padding:10px; cursor:pointer; border-radius:5px; font-weight:bold;';
gpBtn.innerText = "GRASSPASS";
gpBtn.onclick = () => {
    let m = grassPassMissies[huidigeMissieIndex];
    alert(m ? `Missie: ${m.tekst}` : "Pass voltooid!");
};
document.body.appendChild(gpBtn);

function formatteerGeld(bedrag) {
    if (bedrag >= 1000000000) return (bedrag / 1000000000).toFixed(2) + " mld";
    if (bedrag >= 1000000) return (bedrag / 1000000).toFixed(2) + " mil";
    return bedrag.toFixed(2);
}

// --- BELONINGEN VOLGENS TROFEEËNPAD ---
function claimReward() {
    if (trofeeën > geclaimdeRewards) {
        let nr = geclaimdeRewards + 1;
        let bonus = 0;

        if (nr === 1) bonus = 50000; // Trofee 1: $50.000 [cite: 1, 2]
        else if (nr === 2) bonus = 75000; // Trofee 2: $75.000 [cite: 3, 4]
        else if (nr >= 3 && nr <= 9) bonus = Math.floor(Math.random() * 90001) + 10000; // [cite: 5, 6]
        else if (nr === 10) { skinBtn.style.display = 'block'; alert("Skin menu ontgrendeld!"); } // [cite: 7, 8]

        geld += bonus;
        geclaimdeRewards++;
        updateUI();
    }
}

function updateUI() {
    geldDisplay.innerText = '$ ' + formatteerGeld(geld);
    trofeeDisplay.innerText = '🏆 ' + trofeeën;
    rewardBtn.style.display = (trofeeën > geclaimdeRewards) ? 'block' : 'none';
    rewardBtn.innerText = `CLAIM (${trofeeën - geclaimdeRewards})`;
    
    let m = grassPassMissies[huidigeMissieIndex];
    if (m) {
        let v = m.type === "geld" ? totaalVerdiend : totaalGemaaid;
        let p = Math.min((v / m.doel) * 100, 100);
        xpBalk.style.width = p + "%";
        xpTekst.innerText = m.tekst;
        if (v >= m.doel) {
            geld += m.beloning;
            huidigeMissieIndex++;
            alert("Grasspass level UP!");
        }
    }
}

// 3. OBJECTEN
const mower = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
scene.add(mower);

const grassGeo = new THREE.SphereGeometry(0.1, 4, 4);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x22bb22 });
const grassArray = [];
for (let x = -20; x < 20; x += 0.5) {
    for (let z = -20; z < 20; z += 0.5) {
        const g = new THREE.Mesh(grassGeo, grassMat);
        g.position.set(x, 0, z);
        scene.add(g);
        grassArray.push(g);
    }
}

scene.add(new THREE.AmbientLight(0xffffff, 1));
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

// 4. INPUT & LOOP
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function animate() {
    requestAnimationFrame(animate);
    if (keys['z'] || keys['w']) mower.position.z -= huidigeSnelheid;
    if (keys['s']) mower.position.z += huidigeSnelheid;
    if (keys['q'] || keys['a']) mower.position.x -= huidigeSnelheid;
    if (keys['d']) mower.position.x += huidigeSnelheid;

    for (let g of grassArray) {
        if (g.visible && mower.position.distanceTo(g.position) < huidigMowerRadius) {
            g.visible = false;
            g.userData.time = Date.now();
            geld += grasWaarde;
            totaalVerdiend += grasWaarde;
            totaalGemaaid++;
            if (totaalVerdiend >= (trofeeën + 1) * 100000) trofeeën++;
            updateUI();
        } else if (!g.visible && Date.now() - g.userData.time > 4000) {
            g.visible = true;
        }
    }
    camera.position.set(mower.position.x, 10, mower.position.z + 10);
    camera.lookAt(mower.position);
    renderer.render(scene, camera);
}

// Cheat Knop (Boven Midden)
const cheatBtn = document.createElement('button');
cheatBtn.style.cssText = uiCSS + 'top:10px; left:50%; transform:translateX(-50%); background:darkgreen; color:white; border:none; padding:10px; cursor:pointer; border-radius:5px;';
cheatBtn.innerText = "CHEAT";
cheatBtn.onclick = () => {
    if(prompt("Code:") === "OG-kervelsoeps") {
        geld += 100000; totaalVerdiend += 100000; 
        huidigMowerRadius = 10; updateUI();
    }
};
document.body.appendChild(cheatBtn);

updateUI();
animate();
