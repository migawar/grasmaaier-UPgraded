import * as THREE from 'three';

// 1. Scene & Camera opzet
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Donkergrijze achtergrond

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// 2. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// 3. De Rode Grasmaaier (Kubus)
// Breedte: 0.75, Hoogte: 0.75, Lengte: 1
const geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mower = new THREE.Mesh(geometry, material);

// Zet hem exact OP het grid
mower.position.y = 0.375; 
scene.add(mower);

// 4. Licht (Essentieel om de kleur te zien!)
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 10);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// 5. Grid (Groene lijnen voor gras-gevoel)
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

    // Beweging
    if (keys['z']) mower.position.z -= speed;
    if (keys['s']) mower.position.z += speed;
    if (keys['q']) mower.position.x -= speed;
    if (keys['d']) mower.position.x += speed;

    // CAMERA VOLGT DE MAAIER
    // We plaatsen de camera handmatig elke frame achter de kubus
    camera.position.x = mower.position.x;
    camera.position.y = mower.position.y + 3; // 3 meter omhoog
    camera.position.z = mower.position.z + 5; // 5 meter erachter
    
    // Zorg dat de camera naar de kubus kijkt
    camera.lookAt(mower.position);

    renderer.render(scene, camera);
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
