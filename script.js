import * as THREE from 'three';

// 1. SCÈNE & CAMERA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// 2. RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 3. DE MAAIER (Rode kubus: 0.75 x 0.75 x 1)
const mowerGeo = new THREE.BoxGeometry(0.75, 0.75, 1);
const mowerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mower = new THREE.Mesh(mowerGeo, mowerMat);
mower.position.y = 0.375;
scene.add(mower);

// 4. HET GRASVELD (Vast veld om te kunnen maaien)
const grassArray = [];
const grassGeo = new THREE.SphereGeometry(0.125, 6, 6); // Diameter 0.25
const grassMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });

const spacing = 0.1; 
const step = 0.25 + spacing; // 0.35m
const fieldSize = 10; // Grootte van het veld (20x20 meter)

for (let x = -fieldSize; x <= fieldSize; x += step) {
    for (let z = -fieldSize; z <= fieldSize; z += step) {
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.position.set(x, 0.125, z);
        scene.add(grass);
        grassArray.push(grass); // Sla op in een lijst om te kunnen controleren
    }
}

// 5. LICHT
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 7);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// 6. INPUT (ZQSD)
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// 7. MAAI LOGICA
const mowerRadius = 1.0; // De straal van 1 gmet
const grassRadius = 0.125; // De straal van de bol zelf

function checkMowing() {
    for (let i = 0; i < grassArray.length; i++) {
        const grass = grassArray[i];
        
        // Alleen controleren als de bol nog zichtbaar is
        if (grass.visible) {
            // Bereken afstand tussen middelpunt maaier en middelpunt grasbol
            const dx = mower.position.x - grass.position.x;
            const dz = mower.position.z - grass.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            // "Alleen als ze er volledig in zitten": 
            // De verste rand van de bol (afstand + straal_bol) moet binnen de maaier-straal vallen
            if (distance + grassRadius <= mowerRadius) {
                grass.visible = false;
            }
        }
    }
}

// 8. ANIMATIE LOOP
const speed = 0.12;

function animate() {
    requestAnimationFrame(animate);

    // Beweging
    if (keys['z']) mower.position.z -= speed;
    if (keys['s']) mower.position.z += speed;
    if (keys['q']) mower.position.x -= speed;
    if (keys['d']) mower.position.x += speed;

    // Maai actie uitvoeren
    checkMowing();

    // Camera volgt
    camera.position.x = mower.position.x;
    camera.position.y = mower.position.y + 4;
    camera.position.z = mower.position.z + 6;
    camera.lookAt(mower.position);

    renderer.render(scene, camera);
}

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
