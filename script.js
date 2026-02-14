import * as THREE from 'three';

// 1. SCÈNE & CAMERA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// 2. RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- NIEUW: GELD UI ---
let geld = 0.00;
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
// ----------------------

// 3. DE MAAIER (Rode kubus: 0.75 x 0.75 x 1)
const mowerGeo = new THREE.BoxGeometry(0.75, 0.75, 1);
const mowerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mower = new THREE.Mesh(mowerGeo, mowerMat);
mower.position.y = 0.375;
scene.add(mower);

// 4. HET GRASVELD (15x15 meter)
const grassArray = [];
const grassGeo = new THREE.SphereGeometry(0.125, 6, 6);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });

const step = 0.35; // 0.25m bol + 0.1m marge
const fieldSize = 7.5; 

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

// 7. MAAI, GROEI & GELD LOGICA
const mowerRadius = 1.0; 
const grassRadius = 0.125;
const regrowDelay = 3000; 

function processGrass() {
    const currentTime = Date.now();

    for (let i = 0; i < grassArray.length; i++) {
        const grass = grassArray[i];

        if (grass.visible) {
            const dx = mower.position.x - grass.position.x;
            const dz = mower.position.z - grass.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance + grassRadius <= mowerRadius) {
                grass.visible = false;
                grass.userData.mownTime = currentTime;
                
                // GELD VERDIENEN
                geld += 0.01;
                geldDisplay.innerText = '$ ' + geld.toFixed(2);
            }
        } else {
            if (currentTime - grass.userData.mownTime > regrowDelay) {
                grass.visible = true;
                grass.userData.mownTime = null;
            }
        }
    }
}

// 8. ANIMATIE LOOP
const speed = 0.12;

function animate() {
    requestAnimationFrame(animate);

    if (keys['z']) mower.position.z -= speed;
    if (keys['s']) mower.position.z += speed;
    if (keys['q']) mower.position.x -= speed;
    if (keys['d']) mower.position.x += speed;

    processGrass();

    camera.position.x = mower.position.x;
    camera.position.y = mower.position.y + 4;
    camera.position.z = mower.position.z + 6;
    camera.lookAt(mower.position);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
