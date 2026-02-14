import * as THREE from 'three';

// 1. SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. DE GRASMAAIER (Rode Kubus)
// Afmetingen: Breedte 0.75, Hoogte 0.75, Lengte 1
const geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mower = new THREE.Mesh(geometry, material);

// Zet hem OP het grid (y = helft van de hoogte)
mower.position.y = 0.375; 
scene.add(mower);

// 3. LICHT & GROND
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 7);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 2));

const grid = new THREE.GridHelper(100, 100, 0x00ff00, 0x444444);
scene.add(grid);

// 4. BESTURING LOGICA
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

const moveSpeed = 0.12;
const rotSpeed = 0.04;

// 5. ANIMATIE LOOP
function animate() {
    requestAnimationFrame(animate);

    // Draaien met L en M
    if (keys['l']) mower.rotation.y -= rotSpeed; // Met de klok mee
    if (keys['m']) mower.rotation.y += rotSpeed; // Tegen de klok in

    // Rijden met ZQSD (vooruit/achteruit relatief aan waar hij naartoe kijkt)
    if (keys['z']) {
        mower.position.x -= Math.sin(mower.rotation.y) * moveSpeed;
        mower.position.z -= Math.cos(mower.rotation.y) * moveSpeed;
    }
    if (keys['s']) {
        mower.position.x += Math.sin(mower.rotation.y) * moveSpeed;
        mower.position.z += Math.cos(mower.rotation.y) * moveSpeed;
    }
    if (keys['q']) {
        mower.position.x -= Math.cos(mower.rotation.y) * moveSpeed;
        mower.position.z += Math.sin(mower.rotation.y) * moveSpeed;
    }
    if (keys['d']) {
        mower.position.x += Math.cos(mower.rotation.y) * moveSpeed;
        mower.position.z -= Math.sin(mower.rotation.y) * moveSpeed;
    }

    // CAMERA VOLGT DE GRASMAAIER
    // Plaats de camera op een vaste afstand achter de geroteerde maaier
    const distance = 5;
    const height = 3;
    
    camera.position.x = mower.position.x + Math.sin(mower.rotation.y) * distance;
    camera.position.z = mower.position.z + Math.cos(mower.rotation.y) * distance;
    camera.position.y = mower.position.y + height;
    
    camera.lookAt(mower.position);

    renderer.render(scene, camera);
}

// Window resize support
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
