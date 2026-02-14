import * as THREE from 'three';

// 1. Scene & Camera opzet
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// 2. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// 3. De Rode Grasmaaier (Kubus)
const geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mower = new THREE.Mesh(geometry, material);
mower.position.y = 0.375; 
scene.add(mower);

// --- GEOPTIMALISEERD GRAS (InstancedMesh) ---
const grassSize = 0.25; 
const spacing = 0.1; // Jouw gevraagde tussenruimte
const range = 10; // Hoe ver het grasveld uitstrekt vanaf het midden (totaal 20m x 20m)

// Aantal bollen berekenen
const countPerSide = Math.floor((range * 2) / (grassSize + spacing));
const totalGrassCount = countPerSide * countPerSide;

const grassGeo = new THREE.SphereGeometry(grassSize / 2, 6, 6); // Low-poly voor snelheid
const grassMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
const instancedGrass = new THREE.THREE.InstancedMesh(grassGeo, grassMat, totalGrassCount);

let i = 0;
const dummy = new THREE.Object3D();

for (let x = -range; x < range; x += grassSize + spacing) {
    for (let z = -range; z < range; z += grassSize + spacing) {
        dummy.position.set(x, grassSize / 2, z);
        dummy.updateMatrix();
        instancedGrass.setMatrixAt(i++, dummy.matrix);
    }
}
scene.add(instancedGrass);
// --------------------------------------------

// 4. Licht
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 20);
pointLight.position.set(5, 10, 5);
scene.add(pointLight);

// 5. GridHelper (voor diepte-indicatie buiten het grasveld)
const gridHelper = new THREE.GridHelper(100, 100, 0x00ff00, 0x444444);
scene.add(gridHelper);

// 6. Besturing Logica
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

const speed = 0.1;

// 7. Animatie Loop
function animate() {
    requestAnimationFrame(animate);

    if (keys['z']) mower.position.z -= speed;
    if (keys['s']) mower.position.z += speed;
    if (keys['q']) mower.position.x -= speed;
    if (keys['d']) mower.position.x += speed;

    // Camera volgt de maaier
    camera.position.x = mower.position.x;
    camera.position.y = mower.position.y + 3; 
    camera.position.z = mower.position.z + 5; 
    camera.lookAt(mower.position);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
