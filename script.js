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
let trofeeën = 0, huidigLevel = 1;
let grasWaarde = 0.01, huidigeSnelheid = 0.15, huidigMowerRadius = 1.3;
let prijsRadius = 5, prijsSnelheid = 5, prijsWaarde = 10;
let actieveOpdracht = null;

// --- LOGICA ---
function genereerMissie() {
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

// --- UI ELEMENTEN ---
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family:Impact, sans-serif; z-index:9999;';
document.body.appendChild(ui);

// GELD LINKSBOVEN
const geldBox = document.createElement('div');
geldBox.style.cssText = 'position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.8); padding:15px 25px; border-radius:10px; border:3px solid #2ecc71; color:#2ecc71; font-size:32px; pointer-events:auto;';
ui.appendChild(geldBox);

// TROFEEEN RECHTSBOVEN
const trofeeBox = document.createElement('div');
trofeeBox.style.cssText = 'position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.8); padding:15px 25px; border-radius:10px; border:3px solid #f1c40f; color:#f1c40f; font-size:32px; pointer-events:auto;';
ui.appendChild(trofeeBox);

// UPGRADES (LINKS IN HET MIDDEN)
const upgradeBox = document.createElement('div');
upgradeBox.style.cssText = 'position:absolute; top:50%; left:20px; transform:translateY(-50%); display:flex; flex-direction:column; gap:15px; pointer-events:auto;';
ui.appendChild(upgradeBox);

// CHEAT REDEEM KNOP (RECHTSONDER)
const cheatRedeemBtn = document.createElement('button');
cheatRedeemBtn.innerText = "🔑 REDEEM CODE";
cheatRedeemBtn.style.cssText = 'position:absolute; bottom:20px; right:20px; background:#e74c3c; color:white; border:none; padding:15px; border-radius:10px; cursor:pointer; pointer-events:auto; font-weight:bold;';
cheatRedeemBtn.onclick = () => {
    const code = prompt("Voer geheime cheatcode in:");
    if(code === "OG-kervelsoeps") { geld += 50000; totaalVerdiend += 50000; alert("Code aanvaard! +$50.000"); }
    else if(code === "!wannaBEop") { geld += 100000; totaalVerdiend += 100000; alert("Code aanvaard! +$100.000"); }
    else if(code === "YEAHman") { geld += 250000; totaalVerdiend += 250000; alert("Code aanvaard! +$250.000"); }
    else { alert("Foutieve code!"); }
    updateUI();
};
ui.appendChild(cheatRedeemBtn);

// GRASSPASS KNOP (LINKSONDER)
const gpBtn = document.createElement('button');
gpBtn.innerText = "⭐ GRASSPASS";
gpBtn.style.cssText = 'position:absolute; bottom:20px; left:20px; background: linear-gradient(to bottom, #f1c40f, #f39c12); color:white; border:3px solid white; padding:20px 40px; border-radius:15px; font-size:24px; cursor:pointer; pointer-events:auto; text-shadow: 2px 2px black;';
ui.appendChild(gpBtn);

const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed; top:0; left:-100%; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; transition:0.4s; display:flex; align-items:center; justify-content:center; pointer-events:auto; color:white;';
document.body.appendChild(overlay);

function updateUI() {
    geldBox.innerText = `$ ${geld.toLocaleString()}`;
    trofeeBox.innerText = `🏆 ${trofeeën}`;
    
    upgradeBox.innerHTML = `
        <button onclick="koop('r')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer; font-size:18px;">RADIUS: $${prijsRadius.toFixed(0)}</button>
        <button onclick="koop('s')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer; font-size:18px;">SPEED: $${prijsSnelheid.toFixed(0)}</button>
        <button onclick="koop('w')" style="width:220px; padding:15px; background:#27ae60; color:white; border:3px solid #1e8449; border-radius:8px; font-weight:bold; cursor:pointer; font-size:18px;">VALUE: $${prijsWaarde.toFixed(0)}</button>
    `;

    if (totaalVerdiend >= (trofeeën + 1) * 100000) {
        trofeeën++;
        let bonus = (trofeeën === 1) ? 50000 : (trofeeën === 2) ? 75000 : 15000;
        geld += bonus;
    }

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
        <div style="background: linear-gradient(135deg, #2c3e50, #000); padding:50px; border:5px solid #f1c40f; border-radius:30px; text-align:center; width:500px; box-shadow: 0 0 50px #f1c40f;">
            <h1 style="color:#f1c40f; font-size:52px; margin:0; text-shadow: 3px 3px black;">GRASS PASS</h1>
            <h2 style="color:white; margin:10px 0;">LEVEL ${huidigLevel}</h2>
            <p style="font-size:22px; color:#ddd;">${actieveOpdracht.t}</p>
            <div style="width:100%; height:45px; background:#333; border-radius:25px; margin:25px 0; border:3px solid white; overflow:hidden; position:relative;">
                <div style="width:${p}%; height:100%; background:linear-gradient(90deg, #f1c40f, #f39c12); transition:0.8s ease-out;"></div>
                <div style="position:absolute; width:100%; top:8px; left:0; font-weight:bold; color:white; text-shadow: 1px 1px 2px black;">${p}%</div>
            </div>
            <p style="font-size:24px;">${v.toLocaleString()} / ${actieveOpdracht.d.toLocaleString()}</p>
            <p style="color:#2ecc71; font-size:26px; font-weight:bold;">REWARD: ${actieveOpdracht.beloning.txt}</p>
            <button onclick="this.parentElement.parentElement.style.left='-100%'" style="margin-top:20px; padding:15px 45px; background:white; color:black; border:none; border-radius:12px; font-size:20px; font-weight:bold; cursor:pointer;">CLOSE</button>
        </div>`;
};

// --- 3D WORLD ---
const mower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0xff0000}));
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
