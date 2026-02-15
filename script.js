import * as THREE from 'three';

// 1. SCÈNE & CAMERA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// 2. RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- ECONOMIE & STATS ---
let geld = 0.00;
let grasWaarde = 0.01;
let huidigMowerRadius = 1.0;
let huidigeSnelheid = 0.12;

let prijsRadius = 5.00;
let prijsSnelheid = 5.00;
let prijsWaarde = 10.00;

// UI Container voor knoppen
const menu = document.createElement('div');
menu.style.position = 'absolute';
menu.style.left = '10px';
menu.style.top = '50%';
menu.style.transform = 'translateY(-50%)';
menu.style.display = 'flex';
menu.style.flexDirection = 'column';
menu.style.gap = '10px';
document.body.appendChild(menu);

// Geld Display
const geldDisplay = document.createElement('div');
geldDisplay.style.position = 'absolute';
geldDisplay.style.top = '10px';
geldDisplay.style.left = '10px';
geldDisplay.style.color = 'white';
geldDisplay.style.fontSize = '24px';
geldDisplay.style.fontFamily = 'monospace';
geldDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
geldDisplay.style.padding = '10px';
geldDisplay.style.borderRadius = '5px';
geldDisplay.innerText = '$ ' + geld.toFixed(2);
document.body.appendChild(geldDisplay);

// Functie om knoppen te maken
function maakKnop(tekst, actie) {
    const btn = document.createElement('button');
    btn.style.backgroundColor = '#2ecc71';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.padding = '15px';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '5px';
    btn.style.fontWeight = 'bold';
    btn.innerText = tekst;
    btn.onclick = actie;
    menu.appendChild(btn);
    return btn;
}

const btnRadius = maakKnop('', () => {
    if (geld >= prijsRadius) {
        geld -= prijsRadius;
        huidigMowerRadius += 0.1;
        prijsRadius *= 1.5;
        updateUI();
    }
});

const btnSpeed = maakKnop('', () => {
    if (geld >= prijsSnelheid) {
        geld -= prijsSnelheid;
        huidigeSnelheid += 0.02; // Komt overeen met ongeveer +1 km/u in verhouding
        prijsSnelheid *= 1.5;
        updateUI();
    }
});

const btnWaarde = maakKnop('', () => {
    if (geld >= prijsWaarde) {
        geld -= prijsWaarde;
        grasWaarde += 0.01;
        prijsWaarde *= 1.5;
        updateUI();
    }
});

function updateUI() {
    geldDisplay.innerText = '$ ' + geld.toFixed(2);
    btnRadius.innerText = `Groter Bereik ($${prijsRadius.toFixed(2)})\nStraal: ${huidigMowerRadius.toFixed(1)}m`;
    btnSpeed.innerText = `Sneller ($${prijsSnelheid.toFixed(2)})\nSnelheid: +1 km/u`;
    btnWaarde.innerText = `Meer Waarde ($${prijsWaarde.toFixed(2)})\nPer bol: $${grasWaarde.toFixed(2)}`;
}
updateUI();

// 3. DE MAAIER
const mower = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.75, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
mower.position.y = 0.375;
scene.add(mower);

// 4. HET GRASVELD
const grassArray = [];
const grassGeo = new THREE.SphereGeometry(0.125, 4, 4); // Iets minder detail voor performance
const grassMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });

const step = 0.35; 
const fieldSize = 10; // Iets groter veld zoals gevraagd (15-20m)

for (let x = -fieldSize; x <= fieldSize; x += step) {
    for (let z = -fieldSize; z <= fieldSize; z += step) {
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.position.set(x, 0.125, z);
        grass.userData = { mownTime: null }; 
        scene.add(grass);
        grassArray.push(grass);
    }
}

// 5. LICHT
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 7);
scene.add(light);

// 6. INPUT
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// 7. LOGICA
const grassRadius = 0.125;
const regrowDelay = 1000; 

function processGrass() {
    const currentTime = Date.now();
    for (let i = 0; i < grassArray.length; i++) {
        const grass = grassArray[i];
        if (grass.visible) {
            const dx = mower.position.x - grass.position.x;
            const dz = mower.position.z - grass.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance + grassRadius <= huidigMowerRadius) {
                grass.visible = false;
                grass.userData.mownTime = currentTime;
                geld += grasWaarde;
                updateUI();
            }
        } else if (currentTime - grass.userData.mownTime > regrowDelay) {
            grass.visible = true;
        }
    }
}

// 8. ANIMATIE
function animate() {
    requestAnimationFrame(animate);

    if (keys['z']) mower.position.z -= huidigeSnelheid;
    if (keys['s']) mower.position.z += huidigeSnelheid;
    if (keys['q']) mower.position.x -= huidigeSnelheid;
    if (keys['d']) mower.position.x += huidigeSnelheid;

    processGrass();

    camera.position.set(mower.position.x, mower.position.y + 5, mower.position.z + 7);
    camera.lookAt(mower.position);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
