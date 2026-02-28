import * as THREE from "three";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// --- 1. ENGINE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. GAME DATA (Standaardwaarden) ---
let geld = 0,
  totaalVerdiend = 0,
  totaalGemaaid = 0,
  totaalUpgrades = 0;
let diamanten = 0,
  shopUpgradeLevel = 0,
  shopUpgradePrijs = 1;
let trofeeen = 0,
  geclaimdeTrofeeen = 0;
const BASE_GRASS_VALUE = 0.003;
const VALUE_UPGRADE_STEP = 0.0002;
const EARN_MULTIPLIER = 0.3;
const SHOP_MULTIPLIER_STEP = 1.1;
const BASE_SPEED = 0.07;
const SPEED_UPGRADE_STEP = 0.022;
const GRASSPASS_DIAMANT_REWARD = 1;
const GRASSPASS_DIAMANT_INTERVAL = 5;
const RAD_BASIS_KOST = 2;
const RADIUS_PRICE_MULTIPLIER = 1.3;
const SPEED_PRICE_MULTIPLIER = 1.3;
const VALUE_PRICE_MULTIPLIER = 1.35;
const SHOP_UPGRADE_VASTE_KOST = 1;
let grasWaarde = BASE_GRASS_VALUE,
  huidigeSnelheid = BASE_SPEED,
  huidigMowerRadius = 1.3;
let prijsRadius = 5,
  prijsSnelheid = 5,
  prijsWaarde = 10;
let countRadius = 0,
  countSnelheid = 0,
  countWaarde = 0;
const MAX_RADIUS = 50,
  MAX_OTHER = 200;
let regrowDelay = 8000,
  gameMode = "classic",
  creativeSpeed = 0.5,
  autoSaveOnd = false;
let fpsMeterOnd = false;
let verdienMultiplier = 1;
let totaalSpeeltijdSec = 0;
let lichtKleur = "default";
let radDraaiCount = 0;
let radIsSpinning = false;
let miniGameKnopZichtbaar = false;
let miniGameVolgendeCheckAt = 0;
let miniGameCooldownTot = 0;
let miniGameTimer = null;
let miniGameActief = false;
let miniGameMarkerPos = 0;
let miniGameMarkerRichting = 1;
const MINIGAME_CHECK_INTERVAL_MS = 15000;
const MINIGAME_KANS = 0.18;
const MINIGAME_COOLDOWN_MS = 45000;
const MINIGAME_REWARD_DIAMANT = 1;
const MINIGAME_KNOP_DUUR_MS = 30000;
const MINIGAME_RONDES = 3;
const MINIGAME_ZONE_BREEDTES = [24, 16, 10];
let miniGameRonde = 1;
let miniGameKnopZichtbaarTot = 0;
let basicStateVoorCreative = null;
let gebruikteRedeemCodes = [];
const CREATIVE_BACKUP_KEY = "grassMasterCreativeBackupV1";
const LOCAL_SAVE_KEY = "grassMasterSaveV2";
const PRELOGIN_BACKUP_KEY = "grassMasterPreLoginSaveV1";
const FIREBASE_SAVE_COLLECTION = "saves";
const firebaseConfig = {
  apiKey: "AIzaSyA0ukZ0I5xK3XWdeRc3cEckLq-M1Eu05RM",
  authDomain: "grasmaaier-accaunts.firebaseapp.com",
  projectId: "grasmaaier-accaunts",
  storageBucket: "grasmaaier-accaunts.firebasestorage.app",
  messagingSenderId: "562259586390",
  appId: "1:562259586390:web:2c89f72aef6b61f281faf7",
  measurementId: "G-8G03B1Y9X1",
};

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let googleProvider = null;
let ingelogdeGebruiker = null;
let localStateVoorLogin = null;

const maanden = [
  "JANUARI",
  "FEBRUARI",
  "MAART",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AUGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const nu = new Date();
const huidigeMaandNaam = maanden[nu.getMonth()];

let gpLevel = 1,
  eventLevel = 1;
let actieveOpdracht = null,
  eventOpdracht = null;
let rewardKlaar = false,
  eventRewardKlaar = false;
let huidigeSkin = "RED",
  ontgrendeldeSkins = ["RED"];

const alleSkinKleuren = {
  RED: 0xff0000,
  BLUE: 0x0000ff,
  JANUARI: 0xffffff,
  FEBRUARI: 0xffc0cb,
  MAART: 0xffd700,
  APRIL: 0x00ff00,
  MEI: 0x8b4513,
  JUNI: 0x000000,
  JULI: 0xffff00,
  AUGUSTUS: 0xffa500,
  SEPTEMBER: 0x800080,
  OKTOBER: 0x006400,
  NOVEMBER: 0x808080,
  DECEMBER: 0x8b0000,
};
const skinVisualOverrides = {
  BLUE: {
    emissive: 0x0f2f8f,
    emissiveIntensity: 0.42,
    specular: 0xd6e4ff,
    shininess: 90,
  },
  JANUARI: {
    emissive: 0x6f6f8a,
    emissiveIntensity: 0.32,
    specular: 0xffffff,
    shininess: 110,
  },
  FEBRUARI: {
    emissive: 0x7a2e52,
    emissiveIntensity: 0.34,
    specular: 0xffdeef,
    shininess: 85,
  },
  MAART: {
    emissive: 0x9a6a00,
    emissiveIntensity: 0.35,
    specular: 0xffefb0,
    shininess: 95,
  },
  APRIL: {
    emissive: 0x0f6b37,
    emissiveIntensity: 0.33,
    specular: 0xd8ffe7,
    shininess: 80,
  },
  MEI: {
    emissive: 0x4a2d11,
    emissiveIntensity: 0.3,
    specular: 0xf0d4b3,
    shininess: 70,
  },
  JUNI: {
    color: 0x121212,
    emissive: 0x1c2b46,
    emissiveIntensity: 0.38,
    specular: 0xd7e7ff,
    shininess: 105,
  },
  JULI: {
    emissive: 0x8a7d00,
    emissiveIntensity: 0.38,
    specular: 0xfff7cc,
    shininess: 95,
  },
  AUGUSTUS: {
    emissive: 0x8f4d08,
    emissiveIntensity: 0.35,
    specular: 0xffdfbf,
    shininess: 88,
  },
  SEPTEMBER: {
    emissive: 0x4b1b6f,
    emissiveIntensity: 0.35,
    specular: 0xe6ccff,
    shininess: 90,
  },
  OKTOBER: {
    emissive: 0x103816,
    emissiveIntensity: 0.3,
    specular: 0xd1ffd7,
    shininess: 80,
  },
  NOVEMBER: {
    emissive: 0x444444,
    emissiveIntensity: 0.28,
    specular: 0xf0f0f0,
    shininess: 72,
  },
  DECEMBER: {
    emissive: 0x580b0b,
    emissiveIntensity: 0.36,
    specular: 0xffd0d0,
    shininess: 88,
  },
};

const keys = {};
let mowerBodyMaterial = null;
let mowerDetailedModel = null;
let mowerRedBlock = null;
let mowerBlueKit = null;
let mowerBlueRotors = [];
let mowerBlueAuraLight = null;
let blueAuraPulse = 0;
const normalizeGameMode = (mode) =>
  mode === "creative" ? "creative" : "classic";
const getSaveDocRef = (uid) =>
  doc(firebaseDb, FIREBASE_SAVE_COLLECTION, String(uid));
const getAccountLabel = () => {
  if (!ingelogdeGebruiker) return "NIET INGELOGD";
  if (ingelogdeGebruiker.displayName) return ingelogdeGebruiker.displayName;
  if (ingelogdeGebruiker.email)
    return ingelogdeGebruiker.email.split("@")[0].toUpperCase();
  return "GOOGLE ACCOUNT";
};

// --- 3. CORE LOGICA ---
window.getStat = (id) => {
  if (id === "p") return totaalSpeeltijdSec;
  if (id === "m") return totaalGemaaid;
  if (id === "u") return totaalUpgrades;
  if (id === "v") return totaalVerdiend;
  return 0;
};

window.genereerMissie = (isEvent = false) => {
  const types = [
    { id: "p", d: 120, t: "SPEEL 120 SECONDEN" },
    { id: "u", d: 5, t: "KOOP 5 UPGRADES" },
    { id: "v", d: 120, t: "VERDIEN $120" },
  ];
  const gekozen = types[Math.floor(Math.random() * types.length)];
  const lvl = isEvent ? eventLevel : gpLevel;
  const factor = 1 + lvl * 0.2;
  const opdracht = {
    id: gekozen.id,
    d: Math.floor(gekozen.d * factor),
    start: window.getStat(gekozen.id),
    t: gekozen.t.replace(/\d+/, Math.floor(gekozen.d * factor)),
  };
  if (isEvent) {
    eventOpdracht = opdracht;
    eventRewardKlaar = false;
  } else {
    actieveOpdracht = opdracht;
    rewardKlaar = false;
  }
};

// --- 4. UI SETUP ---
const ui = document.createElement("div");
ui.style.cssText =
  "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family: Impact, sans-serif; z-index:9999; text-shadow: 2px 2px black;";
document.body.appendChild(ui);

const overlay = document.createElement("div");
overlay.style.cssText =
  "position:fixed; top:0; left:-100%; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:10000; transition:0.3s; display:flex; align-items:center; justify-content:center; pointer-events:none; color:white; font-family:Impact;";
document.body.appendChild(overlay);

ui.innerHTML = `
    <div id="geldDisp" style="position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.8); padding:15px 30px; border-radius:15px; border:4px solid #2ecc71; pointer-events:auto; color:#2ecc71; font-size:45px;">$ 0.00</div>
    <div id="diamantDisp" style="position:absolute; top:145px; right:20px; background:rgba(0,0,0,0.8); padding:10px 24px; border-radius:12px; border:4px solid #5dade2; pointer-events:auto; color:#85c1e9; font-size:30px; text-align:right;">DIAMANTEN: 0</div>
    <div id="trofeeDisp" style="position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.8); padding:10px 25px; border-radius:15px; border:4px solid #f1c40f; pointer-events:auto; text-align:right;"></div>
    <div id="miniGameSlot" style="position:absolute; top:300px; right:20px; pointer-events:auto;"></div>
    <button onclick="window.openSettings()" style="position:absolute; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; border:3px solid white; padding:10px 30px; border-radius:15px; font-size:20px; cursor:pointer; pointer-events:auto; font-family:Impact;">INSTELLINGEN</button>
    <div id="fpsDisp" style="position:absolute; top:72px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.78); border:3px solid #7f8c8d; color:#ecf0f1; padding:7px 14px; border-radius:12px; font-size:20px; pointer-events:none; display:none;">FPS: --</div>
    <button id="shopBtn" onclick="window.openShop()" style="position:absolute; top:220px; right:20px; background:linear-gradient(to bottom, #5dade2, #2e86c1); color:white; border:5px solid white; padding:16px 40px; border-radius:18px; font-size:28px; cursor:pointer; pointer-events:auto; font-family:Impact;">SHOP</button>
    <div id="upgradeMenu" style="position:absolute; top:50%; left:20px; transform:translateY(-50%); display:flex; flex-direction:column; gap:12px; pointer-events:auto;"></div>
    <button id="gpBtn" onclick="window.openGP()" style="position:absolute; bottom:25px; left:25px; background:linear-gradient(to bottom, #f1c40f, #f39c12); color:white; border:5px solid white; padding:25px 50px; border-radius:20px; font-size:32px; cursor:pointer; pointer-events:auto; font-family:Impact;">GRASSPASS</button>
    <div id="rightPanel" style="position:absolute; bottom:25px; right:25px; display:flex; flex-direction:column; gap:10px; align-items:flex-end; pointer-events:auto;">
        <button onclick="window.openCheat()" style="background:#e74c3c; color:white; border:3px solid white; padding:10px 20px; border-radius:10px; cursor:pointer; font-size:18px; font-family:Impact;">REDEEM CODE</button>
        <button id="eventBtn" onclick="window.openEvent()" style="background:#9b59b6; color:white; border:5px solid white; padding:20px 45px; border-radius:20px; font-size:24px; cursor:pointer; font-family:Impact;">EVENT</button>
    </div>
    <div id="saveToast" style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%); color:rgba(255,255,255,0.5); font-size:12px; opacity:0; transition:0.5s;">GAME OPGESLAGEN...</div>
`;

window.sluit = () => {
  window.cleanupMiniGame();
  overlay.style.left = "-100%";
  overlay.style.pointerEvents = "none";
};

window.updateUI = () => {
  const nu = Date.now();
  const isCreative = gameMode === "creative";
  const setDisplay = (id, show, display = "block") => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? display : "none";
  };
  setDisplay("geldDisp", !isCreative);
  setDisplay("diamantDisp", !isCreative);
  setDisplay("trofeeDisp", !isCreative);
  setDisplay("miniGameSlot", !isCreative);
  setDisplay("shopBtn", !isCreative);
  setDisplay("gpBtn", !isCreative);
  setDisplay("rightPanel", !isCreative, "flex");
  setDisplay("fpsDisp", fpsMeterOnd);

  if (isCreative) {
    miniGameKnopZichtbaar = false;
    miniGameKnopZichtbaarTot = 0;
  }
  if (miniGameKnopZichtbaar && nu >= miniGameKnopZichtbaarTot) {
    miniGameKnopZichtbaar = false;
    miniGameKnopZichtbaarTot = 0;
  }
  if (!isCreative && !miniGameKnopZichtbaar && nu >= miniGameVolgendeCheckAt) {
    miniGameVolgendeCheckAt = nu + MINIGAME_CHECK_INTERVAL_MS;
    if (nu >= miniGameCooldownTot && Math.random() < MINIGAME_KANS) {
      miniGameKnopZichtbaar = true;
      miniGameKnopZichtbaarTot = nu + MINIGAME_KNOP_DUUR_MS;
    }
  }
  document.getElementById("geldDisp").innerText =
    `$ ${geld.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById("diamantDisp").innerText =
    `DIAMANTEN: ${diamanten.toLocaleString()}`;
  trofeeen = Math.floor(totaalVerdiend / 100000);
  const miniGameBtnHtml = miniGameKnopZichtbaar
    ? `<button id="miniGameBtn" style="margin-top:8px; background:#16a085; color:white; border:2px solid white; padding:5px 15px; border-radius:8px; cursor:pointer; font-family:Impact; font-size:18px;">MINIGAME</button>`
    : "";
  if (!isCreative) {
    document.getElementById("trofeeDisp").innerHTML =
      `<div style="color:#f1c40f; font-size:45px;">TROFEEEN: ${trofeeen}</div>
          <button id="trofeePadBtn" style="background:#f39c12; color:white; border:2px solid white; padding:5px 15px; border-radius:8px; cursor:pointer; font-family:Impact; font-size:18px;">TROFEEENPAD</button>`;
    document.getElementById("miniGameSlot").innerHTML = miniGameBtnHtml;
    const trofeePadBtn = document.getElementById("trofeePadBtn");
    if (trofeePadBtn) trofeePadBtn.onclick = () => window.openTrofee();
    const miniGameBtn = document.getElementById("miniGameBtn");
    if (miniGameBtn) miniGameBtn.onclick = () => window.openMiniGame();
  } else {
    document.getElementById("upgradeMenu").innerHTML = `
        <div style="padding:14px; background:#1d2835; border:3px solid #3b82f6; border-radius:12px;">
          <div style="font-size:20px; color:#bfdbfe;">RADIUS: <span id="creativeRadiusVal">${huidigMowerRadius.toFixed(1)}</span></div>
          <input type="range" min="1.3" max="16" step="0.1" value="${huidigMowerRadius.toFixed(1)}" oninput="window.setCreativeRadius(this.value)" style="width:280px;">
        </div>
        <div style="padding:14px; background:#1d2835; border:3px solid #3b82f6; border-radius:12px;">
          <div style="font-size:20px; color:#bfdbfe;">SPEED: <span id="creativeSpeedVal">${creativeSpeed.toFixed(2)}</span></div>
          <input type="range" min="0.08" max="2.2" step="0.01" value="${creativeSpeed.toFixed(2)}" oninput="window.setCreativeSpeed(this.value)" style="width:280px;">
        </div>
        <button onclick="window.openSkins()" style="padding:12px; background:#3498db; color:white; border:3px solid white; border-radius:12px; cursor:pointer; font-size:20px; font-family:Impact; margin-top:12px;"> SKINS</button>`;
    return;
  }

  const isMax = (t) =>
    t === "r"
      ? countRadius >= MAX_RADIUS
      : t === "s"
        ? countSnelheid >= MAX_OTHER
        : countWaarde >= MAX_OTHER;
  const btnStyle = (t) =>
    isMax(t)
      ? "background:#555; cursor:default; color:#888; border-color:#444;"
      : "background:#27ae60; cursor:pointer; color:white; border-color:white;";

  document.getElementById("upgradeMenu").innerHTML = `
        <button onclick="window.koop('r')" style="padding:15px; border:3px solid; border-radius:12px; font-size:22px; font-family:Impact; ${btnStyle("r")}">RADIUS: ${isMax("r") ? "MAX" : "$" + prijsRadius.toFixed(0)}</button>
        <button onclick="window.koop('s')" style="padding:15px; border:3px solid; border-radius:12px; font-size:22px; font-family:Impact; ${btnStyle("s")}">SPEED: ${isMax("s") ? "MAX" : "$" + prijsSnelheid.toFixed(0)}</button>
        <button onclick="window.koop('w')" style="padding:15px; border:3px solid; border-radius:12px; font-size:22px; font-family:Impact; ${btnStyle("w")}">VALUE: ${isMax("w") ? "MAX" : "$" + prijsWaarde.toFixed(0)}</button>
        <button onclick="window.openSkins()" style="padding:12px; background:#3498db; color:white; border:3px solid white; border-radius:12px; cursor:pointer; font-size:20px; font-family:Impact; margin-top:20px;"> SKINS</button>`;

  if (
    actieveOpdracht &&
    window.getStat(actieveOpdracht.id) - actieveOpdracht.start >=
      actieveOpdracht.d
  )
    rewardKlaar = true;
  if (
    eventOpdracht &&
    window.getStat(eventOpdracht.id) - eventOpdracht.start >= eventOpdracht.d
  )
    eventRewardKlaar = true;

  document.getElementById("gpBtn").style.border = rewardKlaar
    ? "8px solid #2ecc71"
    : "5px solid white";
  document.getElementById("eventBtn").style.background = "#9b59b6";
  document.getElementById("eventBtn").style.border = eventRewardKlaar
    ? "8px solid #2ecc71"
    : "5px solid white";
};

// --- 5. OVERIGE FUNCTIES ---
window.openInfoPage = () => {
  window.location.href = "info.html";
};

window.setCreativeRadius = (value) => {
  huidigMowerRadius = Number(value);
  const el = document.getElementById("creativeRadiusVal");
  if (el) el.innerText = huidigMowerRadius.toFixed(1);
};

window.setCreativeSpeed = (value) => {
  creativeSpeed = Number(value);
  const el = document.getElementById("creativeSpeedVal");
  if (el) el.innerText = creativeSpeed.toFixed(2);
};

window.applySkinVisual = (skinNaam) => {
  if (!mowerBodyMaterial) return;
  const basisKleur = alleSkinKleuren[skinNaam] ?? 0xff0000;
  const isRed = skinNaam === "RED";
  const isBlue = skinNaam === "BLUE";
  const isOmgekeerd = !isRed && !isBlue;
  const override = skinVisualOverrides[skinNaam] || {};

  const color = override.color ?? basisKleur;
  const emissive = override.emissive ?? (isRed ? 0x220000 : 0x1f1f1f);
  const emissiveIntensity =
    override.emissiveIntensity ?? (isRed ? 0.12 : 0.3);
  const specular = override.specular ?? (isRed ? 0x333333 : 0xcfcfcf);
  const shininess = override.shininess ?? (isRed ? 22 : 70);

  if (mowerRedBlock) {
    mowerRedBlock.visible = isRed;
    mowerRedBlock.material.color.set(0xff0000);
  }
  if (mowerDetailedModel) {
    mowerDetailedModel.visible = !isRed;
    mowerDetailedModel.rotation.y = isOmgekeerd ? Math.PI : 0;
  }
  if (mowerBlueKit) {
    mowerBlueKit.visible = isBlue;
    mowerBlueKit.rotation.y = isBlue ? 0 : Math.PI;
  }
  if (mowerBlueAuraLight) mowerBlueAuraLight.visible = isBlue;

  mowerBodyMaterial.color.set(color);
  mowerBodyMaterial.emissive.set(emissive);
  mowerBodyMaterial.emissiveIntensity = isBlue
    ? emissiveIntensity + 0.12
    : emissiveIntensity;
  mowerBodyMaterial.specular.set(specular);
  mowerBodyMaterial.shininess = isBlue ? shininess + 22 : shininess;
};

window.maakBasicSnapshot = () => ({
  geld,
  totaalVerdiend,
  totaalGemaaid,
  totaalUpgrades,
  diamanten,
  geclaimdeTrofeeen,
  grasWaarde,
  huidigeSnelheid,
  huidigMowerRadius,
  prijsRadius,
  prijsSnelheid,
  prijsWaarde,
  countRadius,
  countSnelheid,
  countWaarde,
  gpLevel,
  eventLevel,
  actieveOpdracht: actieveOpdracht ? { ...actieveOpdracht } : null,
  eventOpdracht: eventOpdracht ? { ...eventOpdracht } : null,
  rewardKlaar,
  eventRewardKlaar,
  huidigeSkin,
  ontgrendeldeSkins: [...ontgrendeldeSkins],
  shopUpgradeLevel,
  shopUpgradePrijs,
  verdienMultiplier,
  radDraaiCount,
  creativeSpeed,
  gebruikteRedeemCodes: [...gebruikteRedeemCodes],
  mowerX: mower.position.x,
  mowerZ: mower.position.z,
});

window.herstelBasicSnapshot = (snapshot) => {
  if (!snapshot) return false;
  geld = snapshot.geld;
  totaalVerdiend = snapshot.totaalVerdiend;
  totaalGemaaid = snapshot.totaalGemaaid;
  totaalUpgrades = snapshot.totaalUpgrades;
  diamanten = snapshot.diamanten;
  geclaimdeTrofeeen = snapshot.geclaimdeTrofeeen;
  grasWaarde = snapshot.grasWaarde;
  huidigeSnelheid = snapshot.huidigeSnelheid;
  huidigMowerRadius = snapshot.huidigMowerRadius;
  prijsRadius = snapshot.prijsRadius;
  prijsSnelheid = snapshot.prijsSnelheid;
  prijsWaarde = snapshot.prijsWaarde;
  countRadius = snapshot.countRadius;
  countSnelheid = snapshot.countSnelheid;
  countWaarde = snapshot.countWaarde;
  gpLevel = snapshot.gpLevel;
  eventLevel = snapshot.eventLevel;
  actieveOpdracht = snapshot.actieveOpdracht ? { ...snapshot.actieveOpdracht } : null;
  eventOpdracht = snapshot.eventOpdracht ? { ...snapshot.eventOpdracht } : null;
  rewardKlaar = snapshot.rewardKlaar;
  eventRewardKlaar = snapshot.eventRewardKlaar;
  huidigeSkin = snapshot.huidigeSkin;
  ontgrendeldeSkins = [...snapshot.ontgrendeldeSkins];
  shopUpgradeLevel = snapshot.shopUpgradeLevel;
  shopUpgradePrijs = SHOP_UPGRADE_VASTE_KOST;
  verdienMultiplier = snapshot.verdienMultiplier;
  radDraaiCount = snapshot.radDraaiCount;
  creativeSpeed = snapshot.creativeSpeed;
  gebruikteRedeemCodes = Array.isArray(snapshot.gebruikteRedeemCodes)
    ? snapshot.gebruikteRedeemCodes
        .map((code) => String(code).trim().toUpperCase())
        .filter(Boolean)
    : [];
  mower.position.x = snapshot.mowerX;
  mower.position.z = snapshot.mowerZ;
  window.applySkinVisual(huidigeSkin);
  return true;
};

window.resetClassicGrassField = () => {
  regrowQueue.length = 0;
  regrowQueueHead = 0;
  let i = 0;
  for (let x = 0; x < grassPerSide; x++) {
    for (let z = 0; z < grassPerSide; z++) {
      const gx =
        -MAP_HALF_SIZE + x * GRASS_SPACING + Math.random() * GRASS_POSITION_JITTER;
      const gz =
        -MAP_HALF_SIZE + z * GRASS_SPACING + Math.random() * GRASS_POSITION_JITTER;
      const g = grassData[i];
      g.x = gx;
      g.z = gz;
      g.cut = false;
      g.cutTime = 0;
      g.regrowAt = 0;
      grassDummy.position.set(gx, GRASS_VISIBLE_Y, gz);
      grassDummy.updateMatrix();
      grassMesh.setMatrixAt(i, grassDummy.matrix);
      i++;
    }
  }
  grassMesh.instanceMatrix.needsUpdate = true;
};

window.toggleGameMode = () => {
  window.cleanupMiniGame();
  miniGameKnopZichtbaar = false;
  miniGameKnopZichtbaarTot = 0;
  const resetInput = () => {
    for (const k in keys) keys[k] = false;
  };
  const herstelRuntimeNaModeSwitch = () => {
    const maxPos = MAP_HALF_SIZE - MAP_BOUNDARY_MARGIN;
    mower.position.x = Math.max(-maxPos, Math.min(maxPos, mower.position.x));
    mower.position.z = Math.max(-maxPos, Math.min(maxPos, mower.position.z));
    previousMowerPos.copy(mower.position);
    mowerVelocity.set(0, 0, 0);
    smoothedMowerVelocity.set(0, 0, 0);
    cameraSwayOffset.set(0, 0, 0);
    cameraSwayTarget.set(0, 0, 0);
    cameraLookAhead.set(0, 0, 0);
    desiredLookTarget.copy(mower.position);
    cameraLookTarget.copy(mower.position);
    desiredCameraPos.copy(mower.position).add(CAMERA_OFFSET);
    camera.position.copy(desiredCameraPos);
    frameAccumulatorMs = 0;
    lastFrameTime = performance.now();
    uiDirty = true;
    resetInput();
  };

  if (gameMode === "classic") {
    basicStateVoorCreative = window.maakBasicSnapshot();
    try {
      localStorage.setItem(
        CREATIVE_BACKUP_KEY,
        JSON.stringify(basicStateVoorCreative),
      );
    } catch {}

    gameMode = "creative";

    // Creative moet direct speelbaar zijn, dus reset gemaaid gras zichtbaar.
    regrowQueue.length = 0;
    regrowQueueHead = 0;
    for (let i = 0; i < totalGrass; i++) {
      const g = grassData[i];
      g.cut = false;
      g.cutTime = 0;
      g.regrowAt = 0;
      grassDummy.position.set(g.x, GRASS_VISIBLE_Y, g.z);
      grassDummy.updateMatrix();
      grassMesh.setMatrixAt(i, grassDummy.matrix);
    }
    grassMesh.instanceMatrix.needsUpdate = true;
  } else {
    gameMode = "classic";
    let teHerstellen = basicStateVoorCreative;
    if (!teHerstellen) {
      const raw = localStorage.getItem(CREATIVE_BACKUP_KEY);
      if (raw) {
        try {
          teHerstellen = JSON.parse(raw);
        } catch {}
      }
    }
    if (!window.herstelBasicSnapshot(teHerstellen)) {
      gameMode = "classic";
      if (!actieveOpdracht) window.genereerMissie(false);
      if (!eventOpdracht) window.genereerMissie(true);
    }
    window.resetClassicGrassField();
    basicStateVoorCreative = null;
    localStorage.removeItem(CREATIVE_BACKUP_KEY);
  }

  herstelRuntimeNaModeSwitch();
  window.updateUI();
  window.openSettings();
};

window.openTrofee = () => {
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  let h = `<div style="background:#111; padding:40px; border:8px solid #f1c40f; border-radius:30px; text-align:center; min-width:500px; max-height:85vh; overflow-y:auto;"><h1 style="color:#f1c40f; font-size:55px;">TROFEEENPAD</h1><p style="margin-bottom:20px;">VERDIEN $100.000 VOOR EEN  TROFEE</p>`;
  for (let i = 1; i <= 10; i++) {
    let geclaimd = i <= geclaimdeTrofeeen,
      kan = i <= trofeeen && !geclaimd;
    let belBedrag = i * 7500,
      bel = i === 10 ? "BLUE SKIN" : `$${belBedrag.toLocaleString()}`;
    h += `<div style="padding:20px; margin:10px; background:#222; border-radius:15px; display:flex; justify-content:space-between; align-items:center; border:3px solid ${geclaimd ? "#2ecc71" : kan ? "#f1c40f" : "#444"};">
            <div style="text-align:left;"><div style="font-size:24px;">TROFEE ${i}</div><div style="color:#aaa;">BELONING: ${bel}</div></div>
            ${geclaimd ? "CLAIMED" : kan ? `<button onclick="window.claimT(${i})" style="background:#2ecc71; color:white; border:none; padding:12px 25px; border-radius:10px; cursor:pointer; font-family:Impact; font-size:18px;">CLAIM</button>` : "LOCKED"}
        </div>`;
  }
  overlay.innerHTML =
    h +
    `<button onclick="window.sluit()" style="margin-top:20px; padding:15px 60px; background:#f1c40f; color:black; border:none; border-radius:15px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button></div>`;
};

window.cleanupMiniGame = () => {
  if (miniGameTimer) {
    clearInterval(miniGameTimer);
    miniGameTimer = null;
  }
  miniGameActief = false;
};

window.openMiniGame = () => {
  if (!miniGameKnopZichtbaar) {
    alert("Minigame is nu niet beschikbaar.");
    return;
  }
  miniGameKnopZichtbaar = false;
  miniGameKnopZichtbaarTot = 0;
  window.cleanupMiniGame();
  miniGameActief = true;
  miniGameRonde = 1;
  miniGameMarkerPos = 0;
  miniGameMarkerRichting = 1;

  window.renderMiniGame();

  miniGameTimer = setInterval(() => {
    const marker = document.getElementById("miniGameMarker");
    if (!marker) {
      window.cleanupMiniGame();
      return;
    }
    miniGameMarkerPos += miniGameMarkerRichting * 1.9;
    if (miniGameMarkerPos >= 100) {
      miniGameMarkerPos = 100;
      miniGameMarkerRichting = -1;
    } else if (miniGameMarkerPos <= 0) {
      miniGameMarkerPos = 0;
      miniGameMarkerRichting = 1;
    }
    marker.style.left = `${miniGameMarkerPos}%`;
  }, 16);
};

window.getMiniGameZone = () => {
  const index = Math.min(miniGameRonde - 1, MINIGAME_ZONE_BREEDTES.length - 1);
  const breedte = MINIGAME_ZONE_BREEDTES[index];
  const start = 50 - breedte / 2;
  const einde = start + breedte;
  return { start, einde, breedte };
};

window.renderMiniGame = (statusTekst = "") => {
  const zone = window.getMiniGameZone();
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  overlay.innerHTML = `<div style="background:#111; padding:50px; border:8px solid #16a085; border-radius:30px; text-align:center; min-width:560px;">
      <h1 style="color:#1abc9c; font-size:56px; margin:0 0 8px 0;">MINIGAME</h1>
      <p style="font-size:24px; margin:0 0 6px 0;">Ronde ${miniGameRonde}/${MINIGAME_RONDES}</p>
      <p style="font-size:22px; margin:0 0 18px 0;">Klik STOP als de marker in de groene zone zit.</p>
      <div style="position:relative; width:480px; height:34px; margin:0 auto; background:#2c3e50; border:3px solid white; border-radius:12px; overflow:hidden;">
        <div style="position:absolute; left:${zone.start}%; width:${zone.breedte}%; height:100%; background:#27ae60; opacity:0.65;"></div>
        <div id="miniGameMarker" style="position:absolute; left:0%; top:0; width:12px; height:100%; background:#ecf0f1;"></div>
      </div>
      <p style="font-size:20px; color:#d0ece7; min-height:24px; margin:12px 0 0 0;">${statusTekst}</p>
      <button onclick="window.stopMiniGame()" style="margin-top:22px; padding:14px 54px; background:#e67e22; color:white; border:none; border-radius:12px; font-family:Impact; font-size:30px; cursor:pointer;">STOP</button>
      <br><button onclick="window.sluit()" style="margin-top:16px; color:gray; background:none; border:none; cursor:pointer; font-size:20px;">SLUITEN</button>
    </div>`;
};

window.stopMiniGame = () => {
  if (!miniGameActief) return;
  const zone = window.getMiniGameZone();
  const gewonnen =
    miniGameMarkerPos >= zone.start && miniGameMarkerPos <= zone.einde;

  if (gewonnen && miniGameRonde < MINIGAME_RONDES) {
    miniGameRonde++;
    miniGameMarkerPos = 0;
    miniGameMarkerRichting = 1;
    window.renderMiniGame("Goed gedaan! Volgende ronde, kleiner veld.");
    return;
  }

  window.cleanupMiniGame();
  miniGameKnopZichtbaar = false;
  miniGameKnopZichtbaarTot = 0;
  miniGameCooldownTot = Date.now() + MINIGAME_COOLDOWN_MS;
  miniGameVolgendeCheckAt = miniGameCooldownTot + MINIGAME_CHECK_INTERVAL_MS;

  if (gewonnen) {
    diamanten += MINIGAME_REWARD_DIAMANT;
    overlay.innerHTML = `<div style="background:#111; padding:50px; border:8px solid #2ecc71; border-radius:30px; text-align:center; min-width:560px;">
      <h1 style="color:#2ecc71; font-size:58px; margin:0;">GESLAAGD!</h1>
      <p style="font-size:28px; margin-top:15px;">Je kreeg ${MINIGAME_REWARD_DIAMANT} diamant.</p>
      <button onclick="window.sluit()" style="margin-top:18px; padding:14px 50px; background:#2ecc71; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
    </div>`;
  } else {
    overlay.innerHTML = `<div style="background:#111; padding:50px; border:8px solid #e74c3c; border-radius:30px; text-align:center; min-width:560px;">
      <h1 style="color:#e74c3c; font-size:58px; margin:0;">MISLUKT</h1>
      <p style="font-size:26px; margin-top:15px;">Probeer het straks opnieuw.</p>
      <button onclick="window.sluit()" style="margin-top:18px; padding:14px 50px; background:#e74c3c; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
    </div>`;
  }
  window.updateUI();
};

window.claimT = (i) => {
  if (i === geclaimdeTrofeeen + 1) {
    geclaimdeTrofeeen++;
    if (i === 10) {
      ontgrendeldeSkins.push("BLUE");
      alert("LEGENDARISCH!");
    } else {
      geld += i * 7500;
    }
    window.openTrofee();
    window.updateUI();
  }
};

window.openShop = () => {
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  if (!Number.isFinite(geld) || geld < 0) geld = 0;
  if (!Number.isFinite(diamanten) || diamanten < 0) diamanten = 0;
  shopUpgradePrijs = SHOP_UPGRADE_VASTE_KOST;
  const volgendeMulti = (verdienMultiplier * SHOP_MULTIPLIER_STEP).toFixed(2);
  const radKost = window.getRadKost();
  overlay.innerHTML = `<div style="background:#111; padding:45px; border:8px solid #5dade2; border-radius:30px; text-align:center; min-width:560px;">
        <h1 style="color:#85c1e9; font-size:60px; margin:0 0 10px 0;">&#128142; SHOP</h1>
        <p style="font-size:24px; margin:8px 0; color:#2ecc71;">Geld: $${geld.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p style="font-size:26px; margin:10px 0 25px 0;">Diamanten: <span style="color:#85c1e9;">${diamanten}</span></p>
        <div style="width:100%; padding:14px; background:#1f2937; color:#93c5fd; border:3px solid #334155; border-radius:14px; font-family:Impact; font-size:22px; margin-bottom:12px;">DIAMANTEN KRIJG JE VIA GRASS PASS</div>
        <button onclick="window.koopShopUpgrade()" style="width:100%; padding:18px; background:${diamanten >= shopUpgradePrijs ? "#27ae60" : "#555"}; color:white; border:3px solid white; border-radius:14px; cursor:${diamanten >= shopUpgradePrijs ? "pointer" : "default"}; font-family:Impact; font-size:25px;">VERDIENSTEN x1.1 (${shopUpgradePrijs}D)</button>
        <p style="font-size:22px; color:#ccc; margin-top:18px;">Huidig: x${verdienMultiplier.toFixed(2)} | Volgend: x${volgendeMulti}</p>
        <div style="margin-top:22px; padding:16px; background:#2d1f3a; border:3px solid #8e44ad; border-radius:14px;">
          <div style="font-size:26px; color:#d2b4de; margin-bottom:8px;"> LUCKY RAD</div>
          <p style="font-size:20px; margin:0 0 12px 0; color:#e8daef;">Beloningen groeien geleidelijk met je progressie.</p>
          <button onclick="window.draaiRad()" style="width:100%; padding:16px; background:${diamanten >= radKost ? "#8e44ad" : "#555"}; color:white; border:3px solid white; border-radius:12px; cursor:${diamanten >= radKost ? "pointer" : "default"}; font-family:Impact; font-size:24px;">DRAAI RAD (${radKost}D)</button>
          <p style="font-size:18px; color:#d7bde2; margin:10px 0 0 0;">Mogelijke rewards: Geld, Diamanten, Radius/Speed/Value upgrade</p>
        </div>
        <button onclick="window.sluit()" style="margin-top:16px; padding:14px 50px; background:#5dade2; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
    </div>`;
};

window.koopDiamant = () => {
  alert("Diamanten kopen staat uit. Verdien diamanten via Grass Pass.");
};

window.koopShopUpgrade = () => {
  const kost = SHOP_UPGRADE_VASTE_KOST;
  if (diamanten < kost) {
    alert(`Je hebt ${kost} diamanten nodig.`);
    return;
  }
  diamanten -= kost;
  shopUpgradeLevel++;
  verdienMultiplier *= SHOP_MULTIPLIER_STEP;
  shopUpgradePrijs = SHOP_UPGRADE_VASTE_KOST;
  window.updateUI();
  window.openShop();
};

window.getRadProgressFactor = () => {
  const verdienProgress = Math.log10(1 + totaalVerdiend / 5000);
  const draaiProgress = radDraaiCount * 0.015;
  return 1 + verdienProgress + draaiProgress;
};

window.getRadKost = () => RAD_BASIS_KOST;

window.geefGratisUpgrade = (type) => {
  if (type === "r" && countRadius < MAX_RADIUS) {
    countRadius++;
    huidigMowerRadius += 0.3;
    totaalUpgrades++;
    return true;
  }
  if (type === "s" && countSnelheid < MAX_OTHER) {
    countSnelheid++;
    huidigeSnelheid += SPEED_UPGRADE_STEP;
    totaalUpgrades++;
    return true;
  }
  if (type === "w" && countWaarde < MAX_OTHER) {
    countWaarde++;
    grasWaarde = BASE_GRASS_VALUE + countWaarde * VALUE_UPGRADE_STEP;
    totaalUpgrades++;
    return true;
  }
  return false;
};

window.kiesRadBeloning = () => {
  const factor = window.getRadProgressFactor();
  const geldKlein = Math.round(120 * factor);
  const geldMidden = Math.round(300 * factor);
  const geldGroot = Math.round(700 * factor);
  const diamantKlein = Math.max(1, Math.floor(1 + factor * 0.35));
  const diamantGroot = Math.max(2, Math.floor(2 + factor * 0.5));
  const pool = [
    {
      weight: 32,
      type: "geld",
      amount: geldKlein,
      text: `$${geldKlein.toLocaleString()} geld`,
    },
    {
      weight: 22,
      type: "geld",
      amount: geldMidden,
      text: `$${geldMidden.toLocaleString()} geld`,
    },
    {
      weight: 9,
      type: "geld",
      amount: geldGroot,
      text: `$${geldGroot.toLocaleString()} geld`,
    },
    {
      weight: 18,
      type: "diamant",
      amount: diamantKlein,
      text: `${diamantKlein} diamant(en)`,
    },
    {
      weight: 8,
      type: "diamant",
      amount: diamantGroot,
      text: `${diamantGroot} diamant(en)`,
    },
    {
      weight: 5,
      type: "upgrade",
      upgradeType: "r",
      text: "Gratis Radius Upgrade",
    },
    {
      weight: 3,
      type: "upgrade",
      upgradeType: "s",
      text: "Gratis Speed Upgrade",
    },
    {
      weight: 3,
      type: "upgrade",
      upgradeType: "w",
      text: "Gratis Value Upgrade",
    },
  ];
  const totaal = pool.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totaal;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[0];
};

window.pasRadBeloningToe = (beloning) => {
  if (beloning.type === "geld") {
    geld += beloning.amount;
    return `Je won ${beloning.text}!`;
  }
  if (beloning.type === "diamant") {
    diamanten += beloning.amount;
    return `Je won ${beloning.text}!`;
  }
  if (beloning.type === "upgrade") {
    const gelukt = window.geefGratisUpgrade(beloning.upgradeType);
    if (gelukt) return `Je won: ${beloning.text}!`;
    const fallback = Math.round(250 * window.getRadProgressFactor());
    geld += fallback;
    return `Upgrade was max, dus je kreeg $${fallback.toLocaleString()} geld!`;
  }
  return "Geen beloning.";
};

window.startRadAnimatie = (beloning) => {
  const opties = [
    "Kleine geldbonus",
    "Middel geldbonus",
    "Grote geldbonus",
    "Diamanten bonus",
    "Gratis Radius Upgrade",
    "Gratis Speed Upgrade",
    "Gratis Value Upgrade",
  ];
  const eindTekst =
    beloning.type === "upgrade" ? beloning.text : `Je won ${beloning.text}`;
  const animatieLijst = [...opties, eindTekst];
  const totaalTicks = 26 + Math.floor(Math.random() * 9);
  let tick = 0;
  let delay = 65;
  let index = 0;

  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  overlay.innerHTML = `<div style="background:#111; padding:55px; border:8px solid #8e44ad; border-radius:30px; text-align:center; min-width:620px;">
      <h1 style="color:#d2b4de; font-size:58px; margin:0 0 10px 0;">LUCKY RAD</h1>
      <p style="font-size:22px; color:#ddd; margin:0 0 20px 0;">Het rad draait...</p>
      <div style="width:100%; background:#2d1f3a; border:4px solid white; border-radius:16px; padding:18px 20px; margin-bottom:20px;">
        <div id="radRollText" style="font-size:34px; color:#f5eef8; min-height:45px;">...</div>
      </div>
      <div id="radResultText" style="font-size:24px; color:#85c1e9; min-height:34px;">Even wachten...</div>
      <button id="radTerugBtn" onclick="window.openShop()" style="margin-top:18px; padding:14px 44px; background:#5dade2; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer; opacity:0.4;" disabled>TERUG NAAR SHOP</button>
    </div>`;

  const rollEl = document.getElementById("radRollText");
  const resultEl = document.getElementById("radResultText");
  const terugBtn = document.getElementById("radTerugBtn");

  const step = () => {
    if (!rollEl || !resultEl || !terugBtn) {
      radIsSpinning = false;
      return;
    }
    tick++;
    index = (index + 1 + Math.floor(Math.random() * 2)) % animatieLijst.length;
    rollEl.innerText = animatieLijst[index];

    if (tick < totaalTicks) {
      delay = Math.min(240, delay + 7);
      setTimeout(step, delay);
      return;
    }

    rollEl.innerText = eindTekst;
    const bericht = window.pasRadBeloningToe(beloning);
    resultEl.innerText = bericht;
    window.updateUI();
    terugBtn.disabled = false;
    terugBtn.style.opacity = "1";
    radIsSpinning = false;
  };

  step();
};

window.draaiRad = () => {
  if (radIsSpinning) return;
  const kost = window.getRadKost();
  if (diamanten < kost) {
    alert(`Je hebt ${kost} diamanten nodig om te draaien.`);
    return;
  }
  radIsSpinning = true;
  diamanten -= kost;
  radDraaiCount++;
  const beloning = window.kiesRadBeloning();
  window.startRadAnimatie(beloning);
};

window.openSkins = () => {
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  let h = `<div style="background:#111; padding:40px; border:8px solid #3498db; border-radius:30px; text-align:center; max-width:80%; max-height:80vh; overflow-y:auto;"><h1 style="color:#3498db; font-size:50px; margin-bottom:20px;"> SKINS</h1><div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px;">`;
  ["RED", "BLUE", ...maanden].forEach((s) => {
    const ok = gameMode === "creative" || ontgrendeldeSkins.includes(s),
      cur = huidigeSkin === s;
    h += `<button onclick="${ok ? `window.setSkin('${s}')` : ""}" style="padding:20px; background:${ok ? (cur ? "#2ecc71" : "#333") : "#111"}; color:${ok ? "white" : "#555"}; font-family:Impact; border:${cur ? "4px solid white" : "2px solid #444"}; border-radius:15px; cursor:${ok ? "pointer" : "default"}; font-size:18px;">${ok ? s : "LOCKED"}</button>`;
  });
  overlay.innerHTML =
    h +
    `</div><button onclick="window.sluit()" style="margin-top:30px; padding:15px 60px; background:#3498db; color:white; border:none; border-radius:15px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button></div>`;
};
window.setSkin = (s) => {
  huidigeSkin = s;
  window.applySkinVisual(s);
  window.openSkins();
};

window.openGP = () => {
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  const diamantClaimBeschikbaar = gpLevel % GRASSPASS_DIAMANT_INTERVAL === 0;
  const v = Math.min(
    window.getStat(actieveOpdracht.id) - actieveOpdracht.start,
    actieveOpdracht.d,
  );
  overlay.innerHTML = `<div style="background:#111; padding:60px; border:10px solid #f1c40f; border-radius:40px; text-align:center;">
        <h1 style="color:#f1c40f; font-size:70px; margin-bottom:5px;"> GRASS PASS</h1>
        <h2 style="color:white; font-size:30px; margin-top:0; opacity:0.8;">LEVEL ${gpLevel}</h2>
        <p style="font-size:30px; margin-top:20px;">${actieveOpdracht.t}</p>
        <div style="width:500px; height:40px; background:#333; border:4px solid white; margin:30px auto; border-radius:20px; overflow:hidden;"><div style="width:${(v / actieveOpdracht.d) * 100}%; height:100%; background:#f1c40f;"></div></div>
        <button onclick="window.claimGP()" style="padding:25px 70px; background:${rewardKlaar ? "#2ecc71" : "#444"}; font-family:Impact; font-size:32px; color:white; cursor:pointer; border:none; border-radius:20px;">${rewardKlaar ? (diamantClaimBeschikbaar ? `CLAIM ${GRASSPASS_DIAMANT_REWARD} DIAMANT` : "CLAIM LEVEL") : "LOCKED"}</button>
        <br><button onclick="window.sluit()" style="margin-top:30px; color:gray; background:none; border:none; cursor:pointer; font-size:20px;">SLUITEN</button></div>`;
};
window.claimGP = () => {
  if (rewardKlaar) {
    if (gpLevel % GRASSPASS_DIAMANT_INTERVAL === 0) {
      diamanten += GRASSPASS_DIAMANT_REWARD;
    }
    gpLevel++;
    window.genereerMissie(false);
    window.sluit();
    window.updateUI();
  }
};

window.openEvent = () => {
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  const skinClaimKlaar =
    eventLevel >= 100 && !ontgrendeldeSkins.includes(huidigeMaandNaam);
  const v = Math.min(
    window.getStat(eventOpdracht.id) - eventOpdracht.start,
    eventOpdracht.d,
  );
  overlay.innerHTML = `<div style="background:#111; padding:60px; border:10px solid #9b59b6; border-radius:40px; text-align:center;">
        <h1 style="color:#9b59b6; font-size:70px; margin-bottom:5px;"> ${huidigeMaandNaam}</h1>
        <h2 style="color:white; font-size:30px; margin-top:0; opacity:0.8;">EVENT LEVEL ${eventLevel}</h2>
        <p style="font-size:30px; margin-top:20px;">${eventOpdracht.t}</p>
        <p style="font-size:22px; color:#ddd; margin-top:6px;">SKIN WORDT ONTGRENDELD OP LEVEL 100</p>
        <div style="width:500px; height:40px; background:#333; border:4px solid white; margin:30px auto; border-radius:20px; overflow:hidden;"><div style="width:${(v / eventOpdracht.d) * 100}%; height:100%; background:#9b59b6;"></div></div>
        <button onclick="window.claimEvent()" style="padding:25px 70px; background:${eventRewardKlaar ? "#2ecc71" : "#444"}; font-family:Impact; font-size:32px; color:white; cursor:pointer; border:none; border-radius:20px;">${eventRewardKlaar ? (skinClaimKlaar ? "CLAIM SKIN" : "CLAIM LEVEL") : "VERGRENDELD"}</button>
        <br><button onclick="window.sluit()" style="margin-top:30px; color:gray; background:none; border:none; cursor:pointer; font-size:20px;">SLUITEN</button></div>`;
};
window.claimEvent = () => {
  if (eventRewardKlaar) {
    if (eventLevel >= 100 && !ontgrendeldeSkins.includes(huidigeMaandNaam))
      ontgrendeldeSkins.push(huidigeMaandNaam);
    eventLevel++;
    window.genereerMissie(true);
    window.sluit();
    window.updateUI();
  }
};

// --- 6. SETTINGS & SAVE/LOAD LOGICA ---
window.toggleAutoSave = () => {
  autoSaveOnd = !autoSaveOnd;
  if (autoSaveOnd) window.save(true);
  window.openSettings();
};

window.toggleLichtKleur = () => {
  lichtKleur = lichtKleur === "hemelsblauw" ? "default" : "hemelsblauw";
  scene.background = new THREE.Color(
    lichtKleur === "hemelsblauw" ? 0x87ceeb : 0x222222,
  );
  window.openSettings();
};

window.toggleFpsMeter = () => {
  fpsMeterOnd = !fpsMeterOnd;
  fpsMeterFrames = 0;
  fpsMeterLastSampleAt = performance.now();
  const fpsEl = document.getElementById("fpsDisp");
  if (fpsEl) fpsEl.innerText = "FPS: --";
  window.updateUI();
  window.openSettings();
};

window.getSaveData = () => ({
  geld,
  totaalVerdiend,
  totaalGemaaid,
  totaalUpgrades,
  geclaimdeTrofeeen,
  grasWaarde,
  huidigeSnelheid,
  huidigMowerRadius,
  prijsRadius,
  prijsSnelheid,
  prijsWaarde,
  countRadius,
  countSnelheid,
  countWaarde,
  gpLevel,
  eventLevel,
  huidigeSkin,
  ontgrendeldeSkins,
  autoSaveOnd,
  gameMode,
  actieveOpdracht,
  eventOpdracht,
  rewardKlaar,
  eventRewardKlaar,
  diamanten,
  shopUpgradeLevel,
  shopUpgradePrijs,
  verdienMultiplier,
  totaalSpeeltijdSec,
  lichtKleur,
  radDraaiCount,
  creativeSpeed,
  fpsMeterOnd,
  gebruikteRedeemCodes: [...gebruikteRedeemCodes],
});

window.applySaveData = (d) => {
  if (!d || typeof d !== "object") return false;

  geld = Number.isFinite(d.geld) ? d.geld : 0;
  totaalVerdiend = Number.isFinite(d.totaalVerdiend) ? d.totaalVerdiend : 0;
  totaalGemaaid = Number.isFinite(d.totaalGemaaid) ? d.totaalGemaaid : 0;
  totaalUpgrades = Number.isFinite(d.totaalUpgrades) ? d.totaalUpgrades : 0;
  geclaimdeTrofeeen =
    d.geclaimdeTrofeeen ?? d.geclaimdeTrofeeën ?? d["geclaimdeTrofeeÃ«n"] ?? 0;
  if (!Number.isFinite(geclaimdeTrofeeen) || geclaimdeTrofeeen < 0)
    geclaimdeTrofeeen = 0;
  grasWaarde = Number.isFinite(d.grasWaarde) ? d.grasWaarde : BASE_GRASS_VALUE;
  huidigeSnelheid = Number.isFinite(d.huidigeSnelheid)
    ? d.huidigeSnelheid
    : BASE_SPEED;
  huidigMowerRadius = Number.isFinite(d.huidigMowerRadius)
    ? d.huidigMowerRadius
    : 1.3;
  prijsRadius = Number.isFinite(d.prijsRadius) ? d.prijsRadius : 5;
  prijsSnelheid = Number.isFinite(d.prijsSnelheid) ? d.prijsSnelheid : 5;
  prijsWaarde = Number.isFinite(d.prijsWaarde) ? d.prijsWaarde : 10;
  countRadius = Number.isFinite(d.countRadius) ? d.countRadius : 0;
  countSnelheid = Number.isFinite(d.countSnelheid) ? d.countSnelheid : 0;
  countWaarde = Number.isFinite(d.countWaarde) ? d.countWaarde : 0;
  grasWaarde = BASE_GRASS_VALUE + countWaarde * VALUE_UPGRADE_STEP;
  gpLevel = Number.isFinite(d.gpLevel) ? d.gpLevel : 1;
  eventLevel = Number.isFinite(d.eventLevel) ? d.eventLevel : 1;
  huidigeSkin = d.huidigeSkin || "RED";
  ontgrendeldeSkins =
    Array.isArray(d.ontgrendeldeSkins) && d.ontgrendeldeSkins.length
      ? d.ontgrendeldeSkins
      : ["RED"];
  autoSaveOnd = Boolean(d.autoSaveOnd);
  gameMode = normalizeGameMode(d.gameMode);
  actieveOpdracht = d.actieveOpdracht || null;
  eventOpdracht = d.eventOpdracht || null;
  rewardKlaar = Boolean(d.rewardKlaar);
  eventRewardKlaar = Boolean(d.eventRewardKlaar);
  diamanten = Number.isFinite(d.diamanten) ? d.diamanten : 0;
  shopUpgradeLevel = Number.isFinite(d.shopUpgradeLevel) ? d.shopUpgradeLevel : 0;
  shopUpgradePrijs = SHOP_UPGRADE_VASTE_KOST;
  verdienMultiplier = Number.isFinite(d.verdienMultiplier)
    ? d.verdienMultiplier
    : Math.pow(SHOP_MULTIPLIER_STEP, shopUpgradeLevel);
  totaalSpeeltijdSec = Number.isFinite(d.totaalSpeeltijdSec)
    ? d.totaalSpeeltijdSec
    : 0;
  lichtKleur =
    d.lichtKleur === "blue" ? "hemelsblauw" : (d.lichtKleur ?? "default");
  radDraaiCount = Number.isFinite(d.radDraaiCount) ? d.radDraaiCount : 0;
  creativeSpeed = Number.isFinite(d.creativeSpeed) ? d.creativeSpeed : 0.5;
  fpsMeterOnd = Boolean(d.fpsMeterOnd);
  gebruikteRedeemCodes = Array.isArray(d.gebruikteRedeemCodes)
    ? d.gebruikteRedeemCodes
        .map((code) => String(code).trim().toUpperCase())
        .filter(Boolean)
    : [];
  return true;
};

window.loadCloudSave = async () => {
  if (!firebaseDb || !ingelogdeGebruiker) return false;
  try {
    const snap = await getDoc(getSaveDocRef(ingelogdeGebruiker.uid));
    if (!snap.exists()) return false;
    const geladen = window.applySaveData(snap.data());
    if (!geladen) return false;
    scene.background = new THREE.Color(
      lichtKleur === "hemelsblauw" ? 0x87ceeb : 0x222222,
    );
    if (!actieveOpdracht) window.genereerMissie(false);
    if (!eventOpdracht) window.genereerMissie(true);
    window.applySkinVisual(huidigeSkin);
    window.updateUI();
    return true;
  } catch (err) {
    console.error("Cloud load mislukt:", err);
    return false;
  }
};

window.initFirebase = () => {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    googleProvider = new GoogleAuthProvider();

    onAuthStateChanged(firebaseAuth, async (user) => {
      const vorigeGebruiker = ingelogdeGebruiker;
      ingelogdeGebruiker = user || null;
      if (ingelogdeGebruiker) {
        const cloudGeladen = await window.loadCloudSave();
        if (!cloudGeladen) await window.save(true);
      } else if (vorigeGebruiker) {
        let backup = localStateVoorLogin;
        if (!backup) {
          const raw = localStorage.getItem(PRELOGIN_BACKUP_KEY);
          if (raw) {
            try {
              backup = JSON.parse(raw);
            } catch {}
          }
        }
        if (backup) {
          window.applySaveData(backup);
          scene.background = new THREE.Color(
            lichtKleur === "hemelsblauw" ? 0x87ceeb : 0x222222,
          );
          if (!actieveOpdracht) window.genereerMissie(false);
          if (!eventOpdracht) window.genereerMissie(true);
          window.applySkinVisual(huidigeSkin);
          window.updateUI();
        }
        localStateVoorLogin = null;
        localStorage.removeItem(PRELOGIN_BACKUP_KEY);
      }
      if (document.getElementById("settingsPanel")) window.openSettings();
    });
  } catch (err) {
    console.error("Firebase init mislukt:", err);
  }
};

window.toggleGoogleLogin = async () => {
  if (!firebaseAuth || !googleProvider) {
    alert("Google login is nu niet beschikbaar.");
    return;
  }
  try {
    if (ingelogdeGebruiker) {
      await window.save(true);
      await signOut(firebaseAuth);
      return;
    }
    localStateVoorLogin = window.getSaveData();
    localStorage.setItem(PRELOGIN_BACKUP_KEY, JSON.stringify(localStateVoorLogin));
    await signInWithPopup(firebaseAuth, googleProvider);
  } catch (err) {
    console.error("Google login fout:", err);
    alert("Google login mislukt. Probeer opnieuw.");
  }
};

window.save = async (silent = false) => {
  const moetLokaalOpslaan = autoSaveOnd || silent;
  const moetCloudOpslaan = Boolean(ingelogdeGebruiker && firebaseDb);
  if (!moetLokaalOpslaan && !moetCloudOpslaan) return;

  const data = window.getSaveData();
  localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(data));

  if (moetCloudOpslaan) {
    try {
      await setDoc(
        getSaveDocRef(ingelogdeGebruiker.uid),
        {
          ...data,
          accountEmail: ingelogdeGebruiker.email ?? null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error("Cloud save mislukt:", err);
    }
  }

  if (autoSaveOnd) {
    const t = document.getElementById("saveToast");
    if (t) {
      t.style.opacity = 1;
      setTimeout(() => (t.style.opacity = 0), 1500);
    }
  }
};

window.load = () => {
  const saved = localStorage.getItem(LOCAL_SAVE_KEY);
  if (!saved) return false;
  try {
    return window.applySaveData(JSON.parse(saved));
  } catch {
    return false;
  }
};

window.finalReset = async () => {
  localStorage.removeItem(LOCAL_SAVE_KEY);
  localStorage.removeItem(CREATIVE_BACKUP_KEY);
  if (firebaseDb && ingelogdeGebruiker) {
    try {
      await deleteDoc(getSaveDocRef(ingelogdeGebruiker.uid));
    } catch (err) {
      console.error("Cloud reset mislukt:", err);
    }
  }
  location.reload();
};

window.openResetConfirm = () => {
  const accountResetMelding = ingelogdeGebruiker
    ? "<br>Je cloud-account save wordt ook gewist."
    : "";
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  overlay.innerHTML = `<div style="background:#7f1d1d; padding:60px; border:10px solid white; border-radius:40px; text-align:center;">
        <h1 style="font-size:80px; color:white; margin-bottom:10px;"> STOP!</h1>
        <p style="font-size:30px; color:white; margin-bottom:40px;">Weet je het heel zeker? <br><b>Al je voortgang wordt gewist.</b>${accountResetMelding}</p>
        <button onclick="window.finalReset()" style="width:450px; padding:25px; background:white; color:#7f1d1d; font-family:Impact; font-size:32px; cursor:pointer; border:none; border-radius:20px; margin-bottom:15px;">JA, WIS ALLES!</button>
        <button onclick="window.openSettings()" style="width:450px; padding:20px; background:rgba(0,0,0,0.3); color:white; font-family:Impact; font-size:24px; cursor:pointer; border:2px solid white; border-radius:20px;">NEE, TERUG</button></div>`;
};

window.openSettings = () => {
  const accountNaam = getAccountLabel();
  const accountKnopTekst = ingelogdeGebruiker ? "UITLOGGEN" : "INLOGGEN MET GOOGLE";
  const accountKnopKleur = ingelogdeGebruiker ? "#e67e22" : "#4285f4";
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  overlay.innerHTML = `<div id="settingsPanel" style="background:#111; padding:60px; border:8px solid white; border-radius:30px; text-align:center;">
        <h1 style="font-size:60px; margin-bottom:30px;">INSTELLINGEN</h1>
        <button onclick="window.toggleAutoSave()" style="width:400px; padding:20px; background:${autoSaveOnd ? "#2ecc71" : "#e74c3c"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">AUTO-SAVE: ${autoSaveOnd ? "AAN" : "UIT"}</button><br>
        <button onclick="window.toggleGameMode()" style="width:400px; padding:20px; background:${gameMode === "creative" ? "#f1c40f" : "#333"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">MODE: ${gameMode.toUpperCase()}</button><br>
        <button onclick="window.toggleLichtKleur()" style="width:400px; padding:20px; background:${lichtKleur === "hemelsblauw" ? "#87ceeb" : "#333"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">ACHTERGROND: ${lichtKleur === "hemelsblauw" ? "HEMELSBLAUW" : "STANDAARD"}</button><br>
        <button onclick="window.toggleFpsMeter()" style="width:400px; padding:20px; background:${fpsMeterOnd ? "#2ecc71" : "#444"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">FPS METER: ${fpsMeterOnd ? "AAN" : "UIT"}</button><br>
        <div style="width:400px; padding:12px 16px; margin:0 auto 10px; background:#222; border:2px solid #555; border-radius:15px; color:#ddd; font-family:Impact; font-size:20px;">ACCOUNT: ${accountNaam}</div>
        <button onclick="window.toggleGoogleLogin()" style="width:400px; padding:18px; background:${accountKnopKleur}; color:white; font-family:Impact; font-size:24px; cursor:pointer; border:3px solid white; border-radius:15px; margin-bottom:10px;">${accountKnopTekst}</button><br>
        <button onclick="window.openInfoPage()" style="width:400px; padding:16px; background:#1f2937; color:#93c5fd; font-family:Impact; font-size:24px; cursor:pointer; border:3px solid white; border-radius:15px; margin-bottom:10px;">INFO PAGINA</button><br>
        <button onclick="window.openResetConfirm()" style="width:400px; padding:15px; background:#c0392b; color:white; font-family:Impact; font-size:22px; cursor:pointer; border:4px solid white; border-radius:15px;"> RESET GAME </button><br>
        <button onclick="window.sluit()" style="padding:15px 80px; background:#2ecc71; color:white; font-family:Impact; font-size:30px; border:none; border-radius:15px; cursor:pointer; margin-top:20px;">SLUITEN</button></div>`;
};
window.openCheat = () => {
  const c = (prompt("CODE:") || "").trim().toUpperCase();
  if (!c) return;
  if (gebruikteRedeemCodes.includes(c)) {
    alert("Deze redeem code is al gebruikt.");
    return;
  }

  let gelukt = false;
  if (c === "YEAHMAN") {
    geld += 500000;
    totaalVerdiend += 500000;
    gelukt = true;
  }
  if (c === "MINIGAME123") {
    miniGameKnopZichtbaar = true;
    miniGameKnopZichtbaarTot = Date.now() + MINIGAME_KNOP_DUUR_MS;
    miniGameCooldownTot = 0;
    miniGameVolgendeCheckAt = Date.now() + MINIGAME_CHECK_INTERVAL_MS;
    gelukt = true;
  }
  if (c === "MAXIMUM MIRACLE") {
    countRadius = MAX_RADIUS;
    countSnelheid = MAX_OTHER;
    countWaarde = MAX_OTHER;
    huidigMowerRadius = 1.3 + MAX_RADIUS * 0.3;
    huidigeSnelheid = BASE_SPEED + MAX_OTHER * SPEED_UPGRADE_STEP;
    grasWaarde = BASE_GRASS_VALUE + MAX_OTHER * VALUE_UPGRADE_STEP;
    if (actieveOpdracht && actieveOpdracht.id === "u") rewardKlaar = true;
    if (eventOpdracht && eventOpdracht.id === "u") eventRewardKlaar = true;
    gelukt = true;
  }

  if (!gelukt) {
    alert("Ongeldige code.");
    return;
  }

  gebruikteRedeemCodes.push(c);
  window.updateUI();
  window.save(true);
};

window.koop = (t) => {
  if (gameMode === "creative") return;
  if (t === "r" && countRadius < MAX_RADIUS && geld >= prijsRadius) {
    geld -= prijsRadius;
    huidigMowerRadius += 0.3;
    prijsRadius *= RADIUS_PRICE_MULTIPLIER;
    countRadius++;
    totaalUpgrades++;
  }
  if (t === "s" && countSnelheid < MAX_OTHER && geld >= prijsSnelheid) {
    geld -= prijsSnelheid;
    huidigeSnelheid += SPEED_UPGRADE_STEP;
    prijsSnelheid *= SPEED_PRICE_MULTIPLIER;
    countSnelheid++;
    totaalUpgrades++;
  }
  if (t === "w" && countWaarde < MAX_OTHER && geld >= prijsWaarde) {
    geld -= prijsWaarde;
    grasWaarde += VALUE_UPGRADE_STEP;
    prijsWaarde *= VALUE_PRICE_MULTIPLIER;
    countWaarde++;
    totaalUpgrades++;
  }
  window.updateUI();
};

// --- 7. ENGINE LOOP ---
const mower = new THREE.Group();
mowerRedBlock = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.5, 1.2),
  new THREE.MeshLambertMaterial({ color: 0xff0000 }),
);
mowerRedBlock.position.set(0, 0.3, 0);
mower.add(mowerRedBlock);

mowerDetailedModel = new THREE.Group();
mowerBodyMaterial = new THREE.MeshPhongMaterial({
  color: 0xff0000,
  emissive: 0x220000,
  emissiveIntensity: 0.12,
  specular: 0x333333,
  shininess: 22,
});

const mowerBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.3, 0.45, 1.8),
  mowerBodyMaterial,
);
mowerBody.position.set(0, 0.42, 0.1);
mowerDetailedModel.add(mowerBody);

const mowerDeck = new THREE.Mesh(
  new THREE.BoxGeometry(1.45, 0.16, 1.05),
  mowerBodyMaterial,
);
mowerDeck.position.set(0, 0.21, 0.8);
mowerDetailedModel.add(mowerDeck);

const mowerTop = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 0.18, 0.7),
  mowerBodyMaterial,
);
mowerTop.position.set(0, 0.72, -0.15);
mowerDetailedModel.add(mowerTop);

const wheelMaterial = new THREE.MeshPhongMaterial({
  color: 0x111111,
  specular: 0x777777,
  shininess: 40,
});
const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.13, 18);
const wheelOffsets = [
  [-0.68, 0.2, -0.55],
  [0.68, 0.2, -0.55],
  [-0.68, 0.2, 0.62],
  [0.68, 0.2, 0.62],
];
for (const [x, y, z] of wheelOffsets) {
  const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, y, z);
  mowerDetailedModel.add(wheel);
}

mowerBlueKit = new THREE.Group();
const bluePaintMaterial = new THREE.MeshPhongMaterial({
  color: 0x2f86ff,
  emissive: 0x102f78,
  emissiveIntensity: 0.45,
  specular: 0xe6f0ff,
  shininess: 130,
});
const blueDarkMetal = new THREE.MeshPhongMaterial({
  color: 0x1d2c45,
  specular: 0xc7d8ff,
  shininess: 100,
});
const blueNeonMaterial = new THREE.MeshBasicMaterial({
  color: 0x76c8ff,
});

const blueFrontNose = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.12, 0.25),
  bluePaintMaterial,
);
blueFrontNose.position.set(0, 0.32, 1.36);
mowerBlueKit.add(blueFrontNose);

const blueLeftWing = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.24, 1.25),
  bluePaintMaterial,
);
blueLeftWing.position.set(-0.66, 0.34, 0.26);
mowerBlueKit.add(blueLeftWing);

const blueRightWing = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.24, 1.25),
  bluePaintMaterial,
);
blueRightWing.position.set(0.66, 0.34, 0.26);
mowerBlueKit.add(blueRightWing);

const blueTopFin = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.42, 0.6),
  bluePaintMaterial,
);
blueTopFin.position.set(0, 0.95, -0.06);
mowerBlueKit.add(blueTopFin);

const blueTurbine = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.16, 0.4, 20),
  blueDarkMetal,
);
blueTurbine.position.set(0, 0.73, 0.98);
blueTurbine.rotation.z = Math.PI / 2;
mowerBlueKit.add(blueTurbine);

const blueCore = new THREE.Mesh(
  new THREE.CylinderGeometry(0.07, 0.07, 0.42, 16),
  bluePaintMaterial,
);
blueCore.position.set(0, 0.73, 0.98);
blueCore.rotation.z = Math.PI / 2;
mowerBlueKit.add(blueCore);

const blueCanopy = new THREE.Mesh(
  new THREE.BoxGeometry(0.72, 0.2, 0.5),
  new THREE.MeshPhongMaterial({
    color: 0x8ec5ff,
    emissive: 0x2d4f89,
    emissiveIntensity: 0.25,
    specular: 0xffffff,
    shininess: 160,
  }),
);
blueCanopy.position.set(0, 0.83, -0.25);
mowerBlueKit.add(blueCanopy);

const blueRearSpoiler = new THREE.Mesh(
  new THREE.BoxGeometry(1.08, 0.08, 0.22),
  blueDarkMetal,
);
blueRearSpoiler.position.set(0, 0.93, -0.82);
mowerBlueKit.add(blueRearSpoiler);

const blueSpoilerSupportL = new THREE.Mesh(
  new THREE.BoxGeometry(0.08, 0.2, 0.08),
  bluePaintMaterial,
);
blueSpoilerSupportL.position.set(-0.42, 0.83, -0.77);
mowerBlueKit.add(blueSpoilerSupportL);

const blueSpoilerSupportR = new THREE.Mesh(
  new THREE.BoxGeometry(0.08, 0.2, 0.08),
  bluePaintMaterial,
);
blueSpoilerSupportR.position.set(0.42, 0.83, -0.77);
mowerBlueKit.add(blueSpoilerSupportR);

const blueFrontLightL = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.08, 0.03),
  blueNeonMaterial,
);
blueFrontLightL.position.set(-0.34, 0.39, 1.48);
mowerBlueKit.add(blueFrontLightL);

const blueFrontLightR = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.08, 0.03),
  blueNeonMaterial,
);
blueFrontLightR.position.set(0.34, 0.39, 1.48);
mowerBlueKit.add(blueFrontLightR);

const blueSidePodL = new THREE.Mesh(
  new THREE.CylinderGeometry(0.11, 0.11, 0.55, 14),
  blueDarkMetal,
);
blueSidePodL.rotation.x = Math.PI / 2;
blueSidePodL.position.set(-0.82, 0.52, 0.58);
mowerBlueKit.add(blueSidePodL);

const blueSidePodR = new THREE.Mesh(
  new THREE.CylinderGeometry(0.11, 0.11, 0.55, 14),
  blueDarkMetal,
);
blueSidePodR.rotation.x = Math.PI / 2;
blueSidePodR.position.set(0.82, 0.52, 0.58);
mowerBlueKit.add(blueSidePodR);

const blueRotorL = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 0.04, 18),
  bluePaintMaterial,
);
blueRotorL.position.set(-0.82, 0.52, 0.88);
blueRotorL.rotation.x = Math.PI / 2;
mowerBlueKit.add(blueRotorL);

const blueRotorR = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 0.04, 18),
  bluePaintMaterial,
);
blueRotorR.position.set(0.82, 0.52, 0.88);
blueRotorR.rotation.x = Math.PI / 2;
mowerBlueKit.add(blueRotorR);

mowerBlueRotors = [blueRotorL, blueRotorR];
mowerBlueKit.rotation.y = Math.PI;

mowerBlueKit.visible = false;
mowerDetailedModel.add(mowerBlueKit);

mower.add(mowerDetailedModel);

mowerBlueAuraLight = new THREE.PointLight(0x4aa3ff, 1.1, 8.5, 2);
mowerBlueAuraLight.position.set(0, 0.8, 0.2);
mowerBlueAuraLight.visible = false;
mower.add(mowerBlueAuraLight);

mower.position.set(0, 0, 0);
scene.add(mower, new THREE.AmbientLight(0x404040));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(20, 50, 20);
scene.add(light);
camera.position.set(0, 5, 7);
const MAP_HALF_SIZE = 70;
const MAP_SIZE = MAP_HALF_SIZE * 2;
const MAP_BOUNDARY_MARGIN = 0.8;
const GRASS_DENSITY = 5;
const GRASS_SPACING = 1 / GRASS_DENSITY;
const GRASS_POSITION_JITTER = 0;
const GRASS_VISIBLE_Y = 0.1;
const GRASS_HIDDEN_Y = -10;
const CAMERA_OFFSET = new THREE.Vector3(0, 5, 7);
const CAMERA_POSITION_SMOOTHNESS = 8;
const CAMERA_LOOK_SMOOTHNESS = 10;
const CAMERA_SWAY_SMOOTHNESS = 9;
const CAMERA_SWAY_SIDE_FACTOR = 0.16;
const CAMERA_SWAY_BACK_FACTOR = 0.08;
const CAMERA_LOOK_AHEAD_FACTOR = 0.14;
const desiredCameraPos = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const previousMowerPos = new THREE.Vector3();
const mowerVelocity = new THREE.Vector3();
const smoothedMowerVelocity = new THREE.Vector3();
const cameraSwayOffset = new THREE.Vector3();
const cameraSwayTarget = new THREE.Vector3();
const cameraLookAhead = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
cameraLookTarget.copy(mower.position);
previousMowerPos.copy(mower.position);
const GROUND_COLOR = 0x2f8a2f;
const GROUND_TILE_SIZE = MAP_SIZE;
const GRID_ORIGIN = -MAP_HALF_SIZE;
const INV_GRASS_SPACING = 1 / GRASS_SPACING;

// Grond gelijk aan het actieve grasveld.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GROUND_TILE_SIZE, GROUND_TILE_SIZE),
  new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, 0);
scene.add(ground);

const grassPerSide = Math.floor(MAP_SIZE / GRASS_SPACING);
const totalGrass = grassPerSide * grassPerSide;
const grassGeometry = new THREE.SphereGeometry(0.1, 6, 6);
const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x008000 });
const grassMesh = new THREE.InstancedMesh(
  grassGeometry,
  grassMaterial,
  totalGrass,
);
grassMesh.frustumCulled = false;
scene.add(grassMesh);

const grassDummy = new THREE.Object3D();
const grassData = new Array(totalGrass);
const regrowQueue = [];
let regrowQueueHead = 0;
const UI_UPDATE_INTERVAL_MS = 100;
const TARGET_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
let uiDirty = false;
let lastUiUpdate = 0;
let lastFrameTime = performance.now();
let frameAccumulatorMs = 0;
let fpsMeterFrames = 0;
let fpsMeterLastSampleAt = performance.now();
let grassIndex = 0;
for (let x = 0; x < grassPerSide; x++) {
  for (let z = 0; z < grassPerSide; z++) {
    const gx =
      -MAP_HALF_SIZE + x * GRASS_SPACING + Math.random() * GRASS_POSITION_JITTER;
    const gz =
      -MAP_HALF_SIZE + z * GRASS_SPACING + Math.random() * GRASS_POSITION_JITTER;
    grassData[grassIndex] = {
      x: gx,
      z: gz,
      cut: false,
      cutTime: 0,
      regrowAt: 0,
    };
    grassDummy.position.set(gx, GRASS_VISIBLE_Y, gz);
    grassDummy.updateMatrix();
    grassMesh.setMatrixAt(grassIndex, grassDummy.matrix);
    grassIndex++;
  }
}
grassMesh.instanceMatrix.needsUpdate = true;

window.onkeydown = (e) => (keys[e.key.toLowerCase()] = true);
window.onkeyup = (e) => (keys[e.key.toLowerCase()] = false);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function cutGrassAtIndex(i, now) {
  const g = grassData[i];
  if (g.cut) return false;
  g.cut = true;
  g.cutTime = now;
  g.regrowAt = now + regrowDelay;
  regrowQueue.push(i);
  grassDummy.position.set(g.x, GRASS_HIDDEN_Y, g.z);
  grassDummy.updateMatrix();
  grassMesh.setMatrixAt(i, grassDummy.matrix);
  if (gameMode === "classic") {
    const opbrengst = grasWaarde * EARN_MULTIPLIER * verdienMultiplier;
    geld += opbrengst;
    totaalVerdiend += opbrengst;
    totaalGemaaid++;
    uiDirty = true;
  }
  return true;
}

function updateGroundTiles() {
  if (gameMode === "creative") {
    ground.position.x = mower.position.x;
    ground.position.z = mower.position.z;
  } else {
    ground.position.x = 0;
    ground.position.z = 0;
  }
}

function cutGrassNearMowerClassic(now, maaierRadiusSq) {
  const radius = huidigMowerRadius;
  const minX = Math.max(
    0,
    Math.floor((mower.position.x - radius - GRID_ORIGIN) * INV_GRASS_SPACING),
  );
  const maxX = Math.min(
    grassPerSide - 1,
    Math.ceil((mower.position.x + radius - GRID_ORIGIN) * INV_GRASS_SPACING),
  );
  const minZ = Math.max(
    0,
    Math.floor((mower.position.z - radius - GRID_ORIGIN) * INV_GRASS_SPACING),
  );
  const maxZ = Math.min(
    grassPerSide - 1,
    Math.ceil((mower.position.z + radius - GRID_ORIGIN) * INV_GRASS_SPACING),
  );
  let matrixUpdateNodig = false;
  for (let x = minX; x <= maxX; x++) {
    const rowStart = x * grassPerSide;
    for (let z = minZ; z <= maxZ; z++) {
      const i = rowStart + z;
      const g = grassData[i];
      const dx = g.x - mower.position.x;
      const dz = g.z - mower.position.z;
      if (dx * dx + dz * dz < maaierRadiusSq && cutGrassAtIndex(i, now)) {
        matrixUpdateNodig = true;
      }
    }
  }
  return matrixUpdateNodig;
}

function updateCreativeGrass(now, maaierRadiusSq) {
  let matrixUpdateNodig = false;
  for (let i = 0; i < totalGrass; i++) {
    const g = grassData[i];
    let wrapped = false;
    if (g.x < mower.position.x - MAP_HALF_SIZE) {
      g.x += MAP_SIZE;
      wrapped = true;
    }
    if (g.x > mower.position.x + MAP_HALF_SIZE) {
      g.x -= MAP_SIZE;
      wrapped = true;
    }
    if (g.z < mower.position.z - MAP_HALF_SIZE) {
      g.z += MAP_SIZE;
      wrapped = true;
    }
    if (g.z > mower.position.z + MAP_HALF_SIZE) {
      g.z -= MAP_SIZE;
      wrapped = true;
    }
    if (wrapped) {
      g.cut = false;
      g.cutTime = 0;
      g.regrowAt = 0;
      grassDummy.position.set(g.x, GRASS_VISIBLE_Y, g.z);
      grassDummy.updateMatrix();
      grassMesh.setMatrixAt(i, grassDummy.matrix);
      matrixUpdateNodig = true;
    }
    const dx = g.x - mower.position.x;
    const dz = g.z - mower.position.z;
    if (dx * dx + dz * dz < maaierRadiusSq && cutGrassAtIndex(i, now)) {
      matrixUpdateNodig = true;
    }
  }
  return matrixUpdateNodig;
}

function updateFpsMeter() {
  if (!fpsMeterOnd) return;
  fpsMeterFrames++;
  const nowPerf = performance.now();
  const elapsed = nowPerf - fpsMeterLastSampleAt;
  if (elapsed < 500) return;
  const fps = Math.round((fpsMeterFrames * 1000) / elapsed);
  fpsMeterFrames = 0;
  fpsMeterLastSampleAt = nowPerf;
  const fpsEl = document.getElementById("fpsDisp");
  if (fpsEl) fpsEl.innerText = `FPS: ${fps}`;
}

function animate(nowPerf = performance.now()) {
  requestAnimationFrame(animate);
  const frameDeltaMs = Math.max(0, Math.min(250, nowPerf - lastFrameTime));
  lastFrameTime = nowPerf;
  frameAccumulatorMs += frameDeltaMs;

  if (frameAccumulatorMs < FRAME_INTERVAL_MS) return;
  frameAccumulatorMs %= FRAME_INTERVAL_MS;

  const deltaSec = FRAME_INTERVAL_MS / 1000;
  const frameFactor = Math.min(3, deltaSec * 60);
  let s = (gameMode === "creative" ? creativeSpeed : huidigeSnelheid) * frameFactor;
  const now = Date.now();
  totaalSpeeltijdSec += deltaSec;
  if (
    (actieveOpdracht && actieveOpdracht.id === "p") ||
    (eventOpdracht && eventOpdracht.id === "p")
  )
    uiDirty = true;
  if (keys["w"] || keys["z"] || keys["arrowup"]) mower.position.z -= s;
  if (keys["s"] || keys["arrowdown"]) mower.position.z += s;
  if (keys["a"] || keys["q"] || keys["arrowleft"]) mower.position.x -= s;
  if (keys["d"] || keys["arrowright"]) mower.position.x += s;
  if (gameMode === "classic") {
    const maxPos = MAP_HALF_SIZE - MAP_BOUNDARY_MARGIN;
    mower.position.x = Math.max(-maxPos, Math.min(maxPos, mower.position.x));
    mower.position.z = Math.max(-maxPos, Math.min(maxPos, mower.position.z));
  }
  if (mowerBlueKit && mowerBlueKit.visible && mowerBlueRotors.length) {
    for (const rotor of mowerBlueRotors) rotor.rotation.z += 0.25 * frameFactor;
  }
  if (mowerBlueAuraLight && mowerBlueAuraLight.visible) {
    blueAuraPulse += deltaSec * 4.6;
    mowerBlueAuraLight.intensity = 1.05 + Math.sin(blueAuraPulse) * 0.2;
  }
  updateFpsMeter();
  updateGroundTiles();
  const maaierRadiusSq = huidigMowerRadius * huidigMowerRadius;
  let matrixUpdateNodig =
    gameMode === "creative"
      ? updateCreativeGrass(now, maaierRadiusSq)
      : cutGrassNearMowerClassic(now, maaierRadiusSq);

  while (regrowQueueHead < regrowQueue.length) {
    const i = regrowQueue[regrowQueueHead];
    const g = grassData[i];
    if (!g.cut) {
      regrowQueueHead++;
      continue;
    }
    if (g.regrowAt > now) break;
    g.cut = false;
    g.cutTime = 0;
    g.regrowAt = 0;
    grassDummy.position.set(g.x, GRASS_VISIBLE_Y, g.z);
    grassDummy.updateMatrix();
    grassMesh.setMatrixAt(i, grassDummy.matrix);
    matrixUpdateNodig = true;
    regrowQueueHead++;
  }
  if (regrowQueueHead > 5000 && regrowQueueHead > regrowQueue.length >> 1) {
    regrowQueue.splice(0, regrowQueueHead);
    regrowQueueHead = 0;
  }

  if (uiDirty && now - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
    window.updateUI();
    lastUiUpdate = now;
    uiDirty = false;
  }
  if (matrixUpdateNodig) grassMesh.instanceMatrix.needsUpdate = true;

  mowerVelocity.copy(mower.position).sub(previousMowerPos);
  if (deltaSec > 0) mowerVelocity.multiplyScalar(1 / deltaSec);
  previousMowerPos.copy(mower.position);
  const swayLerp = 1 - Math.exp(-CAMERA_SWAY_SMOOTHNESS * deltaSec);
  smoothedMowerVelocity.lerp(mowerVelocity, swayLerp);
  cameraSwayTarget.set(
    -smoothedMowerVelocity.x * CAMERA_SWAY_SIDE_FACTOR,
    0,
    Math.abs(smoothedMowerVelocity.z) * CAMERA_SWAY_BACK_FACTOR,
  );
  cameraSwayOffset.lerp(cameraSwayTarget, swayLerp);

  desiredCameraPos.copy(mower.position).add(CAMERA_OFFSET).add(cameraSwayOffset);
  const camPosLerp = 1 - Math.exp(-CAMERA_POSITION_SMOOTHNESS * deltaSec);
  camera.position.lerp(desiredCameraPos, camPosLerp);
  cameraLookAhead
    .copy(smoothedMowerVelocity)
    .multiplyScalar(CAMERA_LOOK_AHEAD_FACTOR);
  cameraLookAhead.y = 0;
  desiredLookTarget.copy(mower.position).add(cameraLookAhead);
  const lookLerp = 1 - Math.exp(-CAMERA_LOOK_SMOOTHNESS * deltaSec);
  cameraLookTarget.lerp(desiredLookTarget, lookLerp);
  camera.lookAt(cameraLookTarget);
  renderer.render(scene, camera);
}

// --- 8. STARTUP ---
const isGeladen = window.load();
if (!isGeladen || !actieveOpdracht) window.genereerMissie(false);
if (!isGeladen || !eventOpdracht) window.genereerMissie(true);
window.initFirebase();

setInterval(() => window.save(), 5000);
window.updateUI();
window.applySkinVisual(huidigeSkin);
scene.background = new THREE.Color(
  lichtKleur === "hemelsblauw" ? 0x87ceeb : 0x222222,
);
animate();
