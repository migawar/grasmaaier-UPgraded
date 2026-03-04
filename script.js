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
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  serverTimestamp,
  setDoc,
  where,
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
const hardwareThreads = Number.isFinite(navigator.hardwareConcurrency)
  ? navigator.hardwareConcurrency
  : 4;
const deviceMemoryGb = Number.isFinite(navigator.deviceMemory)
  ? navigator.deviceMemory
  : 4;
const isLowEndDevice = hardwareThreads <= 4 || deviceMemoryGb <= 4;
const MAX_PIXEL_RATIO = isLowEndDevice ? 0.9 : 1;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
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
const VALUE_UPGRADE_STEP = 0.000162;
const EARN_MULTIPLIER = 0.3;
const REBIRT_BONUS_STEP = 1.05;
const REBIRT_KOST_DIAMANT = 1;
const BASE_SPEED = 0.07;
const BASE_TURN_SPEED = 0.045;
const SPEED_UPGRADE_STEP = 0.01782;
const RADIUS_UPGRADE_STEP = 0.243;
const GRASSPASS_DIAMANT_REWARD = 1;
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
let oneindigSpeelveldOnd = false;
let verdienMultiplier = 1;
let rebirtCount = 0;
let totaalSpeeltijdSec = 0;
let totaalVerdiendVoorTrofeeen = 0;
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
const FIREBASE_CHAT_COLLECTION = "global_chat";
const FIREBASE_PRESENCE_COLLECTION = "presence";
const CHAT_MAX_BERICHT_LENGTE = 200;
const CHAT_MAX_BERICHTEN = 40;
const CHAT_BERICHT_MAX_LEEFTIJD_MS = 24 * 60 * 60 * 1000;
const CHAT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CHAT_CLEANUP_BATCH_SIZE = 100;
const ONLINE_SPELER_WINDOW_MS = 45 * 1000;
const ONLINE_SPELER_REFRESH_MS = 20 * 1000;
const PRESENCE_HEARTBEAT_MS = 350;
const PRESENCE_STALE_MS = 12 * 1000;
const MULTIPLAYER_DEFAULT_SERVER = "EU-1";
const CUSTOM_SERVER_PREFIX = "ROOM-";
const CUSTOM_SERVER_REGEX = /^ROOM-[A-Z0-9]{4,12}$/;
const CUSTOM_SERVERS_STORAGE_KEY = "grassMasterCustomServersV1";
const MULTIPLAYER_SERVERS = [
  { id: "EU-1", naam: "EUROPE #1", regio: "Europa", accent: "#60a5fa" },
  { id: "US-1", naam: "AMERICA #1", regio: "Verenigde Staten", accent: "#f59e0b" },
  { id: "ASIA-1", naam: "ASIA #1", regio: "Azie", accent: "#34d399" },
];
const DIAMANT_SKINS_SHOP = [
  { id: "PLATINUM", naam: "PLATINUM", prijs: 120, kleur: "#d1d5db" },
  { id: "OBSIDIAN", naam: "OBSIDIAN", prijs: 260, kleur: "#111827" },
  { id: "NEON", naam: "NEON", prijs: 450, kleur: "#22d3ee" },
  { id: "VOID", naam: "VOID", prijs: 800, kleur: "#7c3aed" },
];
const DIAMANT_SKIN_IDS = DIAMANT_SKINS_SHOP.map((skin) => skin.id);
const TROFEE_DREMPELS = [
  100,
  1000,
  10000,
  100000,
  1000000,
  10000000,
  100000000,
  1000000000,
  10000000000,
  100000000000,
];
const TROFEE_BELONINGEN = [
  50,
  250,
  2000,
  15000,
  120000,
  900000,
  7000000,
  50000000,
  350000000,
  2500000000,
];
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
let chatUnsubscribe = null;
let chatPanel = null;
let chatMessagesEl = null;
let chatInputEl = null;
let chatSendBtnEl = null;
let chatStatusEl = null;
let chatOnlineCountEl = null;
let chatToggleBtnEl = null;
let chatHeeftOngelezen = false;
let chatIsOpen = false;
let chatCleanupIntervalId = null;
let chatOnlinePollIntervalId = null;
let chatCleanupBusy = false;
let chatOnlineBusy = false;
let multiplayerServerId = MULTIPLAYER_DEFAULT_SERVER;
let customServers = [];
let presenceUnsubscribe = null;
let presenceHeartbeatId = null;
let presenceHeartbeatBusy = false;
const remotePlayers = new Map();

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
const getHuidigeMaandNaam = () => maanden[new Date().getMonth()];
const getHuidigeEventMaandKey = () => {
  const nu = new Date();
  const maand = String(nu.getMonth() + 1).padStart(2, "0");
  return `${nu.getFullYear()}-${maand}`;
};
let eventMaandKey = getHuidigeEventMaandKey();
let spelerResetMaandKey = getHuidigeEventMaandKey();

let gpLevel = 1,
  eventLevel = 1;
let actieveOpdracht = null,
  eventOpdracht = null;
let rewardKlaar = false,
  eventRewardKlaar = false;
let huidigeSkin = "STARTER",
  ontgrendeldeSkins = ["STARTER"];

const alleSkinKleuren = {
  STARTER: 0x3f8f2f,
  RED: 0xff0000,
  BLUE: 0x0000ff,
  PLATINUM: 0xd1d5db,
  OBSIDIAN: 0x111827,
  NEON: 0x22d3ee,
  VOID: 0x7c3aed,
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
  PLATINUM: {
    emissive: 0x3d4653,
    emissiveIntensity: 0.26,
    specular: 0xffffff,
    shininess: 140,
  },
  OBSIDIAN: {
    emissive: 0x04070f,
    emissiveIntensity: 0.48,
    specular: 0x98a2b3,
    shininess: 120,
  },
  NEON: {
    emissive: 0x0f5f66,
    emissiveIntensity: 0.55,
    specular: 0xd9fbff,
    shininess: 115,
  },
  VOID: {
    emissive: 0x220f53,
    emissiveIntensity: 0.62,
    specular: 0xe3d3ff,
    shininess: 135,
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
const getPresenceDocRef = (uid) =>
  doc(firebaseDb, FIREBASE_PRESENCE_COLLECTION, String(uid));
const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const formatDisplayNameFromEmail = (email) => {
  if (typeof email !== "string" || !email.includes("@")) return "ONBEKEND";
  const lokaleNaam = email.split("@")[0].trim();
  if (!lokaleNaam) return "ONBEKEND";
  return lokaleNaam.slice(0, 24).toUpperCase();
};
const getLeaderboardDisplayName = (data, fallbackId = "") => {
  if (typeof data?.accountDisplayName === "string" && data.accountDisplayName.trim()) {
    return data.accountDisplayName.trim().slice(0, 24);
  }
  if (typeof data?.accountEmail === "string" && data.accountEmail.trim()) {
    return formatDisplayNameFromEmail(data.accountEmail.trim());
  }
  return fallbackId ? `SPELER ${String(fallbackId).slice(0, 8)}` : "ONBEKEND";
};
const createCustomServerDescriptor = (serverId) => {
  const id = String(serverId || "").toUpperCase();
  const code = id.startsWith(CUSTOM_SERVER_PREFIX)
    ? id.slice(CUSTOM_SERVER_PREFIX.length)
    : id;
  return {
    id,
    naam: `ROOM ${code}`,
    regio: "Prive server",
    accent: "#ec4899",
    isCustom: true,
  };
};
const sanitizeCustomServers = (value) => {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seen = new Set();
  for (const item of value) {
    const id = String(item?.id || "").trim().toUpperCase();
    if (!CUSTOM_SERVER_REGEX.test(id) || seen.has(id)) continue;
    const naam =
      typeof item?.naam === "string" && item.naam.trim()
        ? item.naam.trim().slice(0, 36)
        : createCustomServerDescriptor(id).naam;
    const regio =
      typeof item?.regio === "string" && item.regio.trim()
        ? item.regio.trim().slice(0, 32)
        : "Prive server";
    const accent =
      typeof item?.accent === "string" && item.accent.trim()
        ? item.accent.trim()
        : "#ec4899";
    result.push({ id, naam, regio, accent, isCustom: true });
    seen.add(id);
  }
  return result;
};
const saveCustomServersLocal = () => {
  try {
    localStorage.setItem(CUSTOM_SERVERS_STORAGE_KEY, JSON.stringify(customServers));
  } catch {}
};
const loadCustomServersLocal = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_SERVERS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeCustomServers(JSON.parse(raw));
  } catch {
    return [];
  }
};
const getAlleServers = () => [...MULTIPLAYER_SERVERS, ...customServers];
const registerCustomServer = (serverId, opties = {}) => {
  const id = String(serverId || "").trim().toUpperCase();
  if (!CUSTOM_SERVER_REGEX.test(id)) return null;
  const bestaand = customServers.find((server) => server.id === id);
  if (bestaand) return bestaand;
  const basis = createCustomServerDescriptor(id);
  const server = {
    ...basis,
    ...(typeof opties?.naam === "string" && opties.naam.trim()
      ? { naam: opties.naam.trim().slice(0, 36) }
      : {}),
    ...(typeof opties?.regio === "string" && opties.regio.trim()
      ? { regio: opties.regio.trim().slice(0, 32) }
      : {}),
    ...(typeof opties?.accent === "string" && opties.accent.trim()
      ? { accent: opties.accent.trim() }
      : {}),
    isCustom: true,
  };
  customServers.push(server);
  if (opties.persist !== false) saveCustomServersLocal();
  return server;
};
customServers = loadCustomServersLocal();
const normalizeServerId = (rawId) => {
  const id = String(rawId ?? "").trim().toUpperCase();
  if (MULTIPLAYER_SERVERS.some((server) => server.id === id)) return id;
  if (CUSTOM_SERVER_REGEX.test(id)) return id;
  return MULTIPLAYER_DEFAULT_SERVER;
};
const getServerById = (serverId) => {
  const normalized = normalizeServerId(serverId);
  const bestaande = getAlleServers().find((server) => server.id === normalized);
  if (bestaande) return bestaande;
  if (CUSTOM_SERVER_REGEX.test(normalized)) {
    return registerCustomServer(normalized, { persist: false }) || createCustomServerDescriptor(normalized);
  }
  return MULTIPLAYER_SERVERS[0];
};
const formatPlaytime = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const uren = Math.floor(s / 3600);
  const minuten = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(uren)}:${pad(minuten)}:${pad(sec)}`;
};
const stopPresenceSubscription = () => {
  if (!presenceUnsubscribe) return;
  presenceUnsubscribe();
  presenceUnsubscribe = null;
};
const stopPresenceHeartbeat = () => {
  if (!presenceHeartbeatId) return;
  clearInterval(presenceHeartbeatId);
  presenceHeartbeatId = null;
  presenceHeartbeatBusy = false;
};
const disposeRemotePlayer = (remote) => {
  if (!remote?.group) return;
  remote.group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((mat) => mat?.dispose?.());
      return;
    }
    child.material?.dispose?.();
  });
  scene.remove(remote.group);
};
const clearRemotePlayers = () => {
  remotePlayers.forEach((remote) => disposeRemotePlayer(remote));
  remotePlayers.clear();
};
const makeRemotePlayerMesh = () => {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0x3f8f2f,
    emissive: 0x1f1f1f,
    emissiveIntensity: 0.25,
    specular: 0xb7bcc6,
    shininess: 65,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.34, 1.16), bodyMaterial);
  body.position.set(0, 0.42, 0.12);
  group.add(body);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.2), bodyMaterial);
  deck.position.set(0, 0.2, 0.72);
  group.add(deck);
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.34, 16),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc }),
  );
  marker.position.set(0, 1.15, 0);
  marker.rotation.x = Math.PI;
  group.add(marker);
  return { group, bodyMaterial };
};
const setRemotePlayerSkin = (remote, skinNaam) => {
  if (!remote?.bodyMaterial) return;
  const basisKleur = alleSkinKleuren[skinNaam] ?? alleSkinKleuren.STARTER ?? 0x3f8f2f;
  remote.bodyMaterial.color.set(basisKleur);
  remote.bodyMaterial.emissive.set(skinNaam === "BLUE" ? 0x12366f : 0x1a1a1a);
  remote.bodyMaterial.shininess = skinNaam === "BLUE" ? 95 : 65;
};
const upsertRemotePlayer = (uid, data) => {
  let remote = remotePlayers.get(uid);
  if (!remote) {
    const mesh = makeRemotePlayerMesh();
    scene.add(mesh.group);
    remote = {
      ...mesh,
      targetPos: new THREE.Vector3(),
      targetRotY: 0,
      lastSeenMs: 0,
    };
    remotePlayers.set(uid, remote);
  }
  const x = Number.isFinite(Number(data?.x)) ? Number(data.x) : 0;
  const z = Number.isFinite(Number(data?.z)) ? Number(data.z) : 0;
  const rotY = Number.isFinite(Number(data?.rotationY)) ? Number(data.rotationY) : 0;
  remote.targetPos.set(x, 0, z);
  remote.targetRotY = rotY;
  remote.lastSeenMs = Date.now();
  setRemotePlayerSkin(remote, String(data?.skin || "STARTER").toUpperCase());
};
const trimStaleRemotePlayers = () => {
  const now = Date.now();
  for (const [uid, remote] of remotePlayers) {
    if (now - remote.lastSeenMs <= PRESENCE_STALE_MS) continue;
    disposeRemotePlayer(remote);
    remotePlayers.delete(uid);
  }
};
const lerpAngle = (from, to, t) => {
  const TWO_PI = Math.PI * 2;
  let delta = ((to - from + Math.PI) % TWO_PI) - Math.PI;
  if (delta < -Math.PI) delta += TWO_PI;
  return from + delta * t;
};
const updateRemotePlayersVisual = (deltaSec) => {
  if (!remotePlayers.size) return;
  const t = Math.min(1, deltaSec * 10);
  for (const remote of remotePlayers.values()) {
    remote.group.position.lerp(remote.targetPos, t);
    remote.group.rotation.y = lerpAngle(remote.group.rotation.y, remote.targetRotY, t);
  }
};
const subscribePresence = () => {
  stopPresenceSubscription();
  if (!firebaseDb || !ingelogdeGebruiker) {
    clearRemotePlayers();
    return;
  }
  const actieveServerId = normalizeServerId(multiplayerServerId);
  const presenceQuery = query(
    collection(firebaseDb, FIREBASE_SAVE_COLLECTION),
    where("multiplayerServerId", "==", actieveServerId),
    limit(250),
  );
  presenceUnsubscribe = onSnapshot(
    presenceQuery,
    (snapshot) => {
      const selfUid = String(ingelogdeGebruiker?.uid || "");
      const gevonden = new Set();
      snapshot.forEach((docSnap) => {
        const uid = String(docSnap.id);
        if (!uid || uid === selfUid) return;
        const data = docSnap.data() || {};
        if (!data.presenceUpdatedAt || typeof data.presenceUpdatedAt.toDate !== "function")
          return;
        if (Date.now() - data.presenceUpdatedAt.toDate().getTime() > PRESENCE_STALE_MS)
          return;
        gevonden.add(uid);
        upsertRemotePlayer(uid, {
          x: data.presenceX,
          z: data.presenceZ,
          rotationY: data.presenceRotationY,
          skin: data.presenceSkin,
        });
      });
      for (const [uid, remote] of remotePlayers) {
        if (gevonden.has(uid)) continue;
        disposeRemotePlayer(remote);
        remotePlayers.delete(uid);
      }
    },
    (err) => {
      console.error("Presence stream fout:", err);
      clearRemotePlayers();
    },
  );
};
const publishPresence = async () => {
  if (!firebaseDb || !ingelogdeGebruiker || presenceHeartbeatBusy) return;
  presenceHeartbeatBusy = true;
  try {
    await setDoc(
      getSaveDocRef(ingelogdeGebruiker.uid),
      {
        multiplayerServerId: normalizeServerId(multiplayerServerId),
        presenceX: mower.position.x,
        presenceZ: mower.position.z,
        presenceRotationY: mower.rotation.y,
        presenceSkin: huidigeSkin,
        presenceUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("Presence publish mislukt:", err);
  } finally {
    presenceHeartbeatBusy = false;
  }
};
const startPresenceHeartbeat = () => {
  stopPresenceHeartbeat();
  if (!firebaseDb || !ingelogdeGebruiker) return;
  publishPresence();
  presenceHeartbeatId = setInterval(publishPresence, PRESENCE_HEARTBEAT_MS);
};
const refreshPresenceSync = () => {
  startPresenceHeartbeat();
  subscribePresence();
};
const getAccountLabel = () => {
  if (!ingelogdeGebruiker) return "NIET INGELOGD";
  if (ingelogdeGebruiker.displayName) return ingelogdeGebruiker.displayName;
  if (ingelogdeGebruiker.email)
    return ingelogdeGebruiker.email.split("@")[0].toUpperCase();
  return "GOOGLE ACCOUNT";
};
const getTrofeeProgressVerdiend = () =>
  Math.max(0, totaalVerdiendVoorTrofeeen + totaalVerdiend);
const getVrijgespeeldeTrofeeen = () => {
  const totaal = getTrofeeProgressVerdiend();
  let unlocked = 0;
  for (const drempel of TROFEE_DREMPELS) {
    if (totaal >= drempel) unlocked++;
  }
  return unlocked;
};
const getTrofeeBeloning = (trofeeLevel) =>
  TROFEE_BELONINGEN[Math.max(0, Math.min(TROFEE_BELONINGEN.length - 1, trofeeLevel - 1))];
const isOneindigSpeelveldActief = () =>
  gameMode === "creative" || oneindigSpeelveldOnd;
const getChatDisplayName = () => {
  if (ingelogdeGebruiker?.displayName?.trim()) {
    return ingelogdeGebruiker.displayName.trim().slice(0, 24);
  }
  if (ingelogdeGebruiker?.email?.trim()) {
    return formatDisplayNameFromEmail(ingelogdeGebruiker.email.trim());
  }
  return "GAST";
};
const formatChatTijd = (createdAt) => {
  if (!createdAt || typeof createdAt.toDate !== "function") return "--:--";
  const d = createdAt.toDate();
  return d.toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
const setChatStatus = (tekst = "", kleur = "#9ca3af") => {
  if (!chatStatusEl) return;
  chatStatusEl.textContent = tekst;
  chatStatusEl.style.color = kleur;
};
const setChatOnlineCount = (count) => {
  if (!chatOnlineCountEl) return;
  const value = Number.isFinite(count) && count >= 0 ? Math.max(0, Math.floor(count)) : 0;
  chatOnlineCountEl.textContent = `Online: ${value}`;
  if (chatToggleBtnEl) {
    chatToggleBtnEl.textContent = `LIVE CHAT (${value} online)`;
  }
};
const setChatInputState = (enabled) => {
  if (!chatInputEl || !chatSendBtnEl) return;
  chatInputEl.disabled = !enabled;
  chatSendBtnEl.disabled = !enabled;
  chatInputEl.placeholder = enabled
    ? "Typ je bericht..."
    : "Log in met Google om te chatten";
};
const renderChatBerichten = (berichten) => {
  if (!chatMessagesEl) return;
  if (!berichten.length) {
    chatMessagesEl.innerHTML =
      '<div class="chat-empty">Nog geen berichten. Wees de eerste.</div>';
    return;
  }
  chatMessagesEl.innerHTML = berichten
    .map((item) => {
      const naam = escapeHtml(item.displayName || "ONBEKEND");
      const tekst = escapeHtml(item.text || "");
      const tijd = escapeHtml(formatChatTijd(item.createdAt));
      return `<div class="chat-message"><div class="chat-meta"><span class="chat-author">${naam}</span><span class="chat-time">${tijd}</span></div><div class="chat-text">${tekst}</div></div>`;
    })
    .join("");
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
};
const setChatOpenState = (open) => {
  if (!chatPanel) return;
  chatIsOpen = open;
  chatPanel.classList.toggle("is-open", open);
  chatPanel.classList.toggle("has-unread", chatHeeftOngelezen && !open);
  if (open) chatHeeftOngelezen = false;
};
const stopChatSubscription = () => {
  if (!chatUnsubscribe) return;
  chatUnsubscribe();
  chatUnsubscribe = null;
};
const stopChatCleanup = () => {
  if (!chatCleanupIntervalId) return;
  clearInterval(chatCleanupIntervalId);
  chatCleanupIntervalId = null;
};
const stopOnlinePoll = () => {
  if (!chatOnlinePollIntervalId) return;
  clearInterval(chatOnlinePollIntervalId);
  chatOnlinePollIntervalId = null;
};
const cleanupOudeChatBerichten = async () => {
  if (!firebaseDb || chatCleanupBusy) return;
  chatCleanupBusy = true;
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - CHAT_BERICHT_MAX_LEEFTIJD_MS);
    const oudeBerichtenQuery = query(
      collection(firebaseDb, FIREBASE_CHAT_COLLECTION),
      where("createdAt", "<=", cutoff),
      limit(CHAT_CLEANUP_BATCH_SIZE),
    );
    const oudeSnap = await getDocs(oudeBerichtenQuery);
    if (oudeSnap.empty) return;
    await Promise.all(oudeSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("Chat cleanup mislukt:", err);
    }
  } finally {
    chatCleanupBusy = false;
  }
};
const refreshOnlineSpelers = async () => {
  if (!firebaseDb || chatOnlineBusy) return;
  chatOnlineBusy = true;
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - ONLINE_SPELER_WINDOW_MS);
    const actieveServerId = normalizeServerId(multiplayerServerId);
    const onlineQuery = query(
      collection(firebaseDb, FIREBASE_SAVE_COLLECTION),
      where("updatedAt", ">=", cutoff),
      limit(2000),
    );
    const onlineSnap = await getDocs(onlineQuery);
    let onlineInServer = 0;
    onlineSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      if (normalizeServerId(data.multiplayerServerId) === actieveServerId) {
        onlineInServer++;
      }
    });
    setChatOnlineCount(onlineInServer);
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("Online spelers ophalen mislukt:", err);
    }
    setChatOnlineCount(0);
  } finally {
    chatOnlineBusy = false;
  }
};
const startChatMaintenance = () => {
  stopChatCleanup();
  stopOnlinePoll();
  if (!firebaseDb) {
    setChatOnlineCount(0);
    return;
  }
  cleanupOudeChatBerichten();
  refreshOnlineSpelers();
  chatCleanupIntervalId = setInterval(cleanupOudeChatBerichten, CHAT_CLEANUP_INTERVAL_MS);
  chatOnlinePollIntervalId = setInterval(refreshOnlineSpelers, ONLINE_SPELER_REFRESH_MS);
};
const subscribeChat = () => {
  if (!firebaseDb) return;
  stopChatSubscription();
  if (!ingelogdeGebruiker) {
    setChatStatus("Log in met Google", "#f59e0b");
    return;
  }
  setChatStatus("Verbinden...", "#9ca3af");
  const chatServerId = normalizeServerId(multiplayerServerId);
  const chatQuery = query(
    collection(firebaseDb, FIREBASE_CHAT_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(CHAT_MAX_BERICHTEN),
  );
  chatUnsubscribe = onSnapshot(
    chatQuery,
    async (snapshot) => {
      const cutoffMs = Date.now() - CHAT_BERICHT_MAX_LEEFTIJD_MS;
      const teVerwijderen = [];
      const berichten = snapshot.docs
        .filter((d) => {
          const data = d.data();
          if (!data?.createdAt || typeof data.createdAt.toDate !== "function") return false;
          const berichtServerId = normalizeServerId(data.serverId);
          if (berichtServerId !== chatServerId) return false;
          const isNieuwGenoeg = data.createdAt.toDate().getTime() >= cutoffMs;
          if (!isNieuwGenoeg) teVerwijderen.push(d.ref);
          return isNieuwGenoeg;
        })
        .map((d) => d.data())
        .reverse();
      if (teVerwijderen.length) {
        try {
          await Promise.all(teVerwijderen.map((ref) => deleteDoc(ref)));
        } catch (err) {
          if (err?.code !== "permission-denied") {
            console.error("Oude chatberichten verwijderen mislukt:", err);
          }
        }
      }
      renderChatBerichten(berichten);
      if (!chatIsOpen && snapshot.docChanges().some((c) => c.type === "added")) {
        chatHeeftOngelezen = true;
      }
      chatPanel?.classList.toggle("has-unread", chatHeeftOngelezen && !chatIsOpen);
      setChatStatus(`Live op ${chatServerId}`, "#22c55e");
    },
    (err) => {
      console.error("Chat stream fout:", err);
      if (err?.code === "permission-denied") {
        setChatStatus("Geen toegang tot chat", "#f87171");
      } else if (err?.code === "unavailable") {
        setChatStatus("Chat server offline", "#f87171");
      } else {
        setChatStatus("Geen verbinding", "#f87171");
      }
    },
  );
};
window.sendChatMessage = async () => {
  if (!firebaseDb) {
    setChatStatus("Firebase niet klaar", "#f87171");
    return;
  }
  if (!ingelogdeGebruiker) {
    setChatStatus("Log in om te chatten", "#f59e0b");
    return;
  }
  const raw = chatInputEl?.value ?? "";
  const text = raw.trim();
  if (!text) return;
  const safeText = text.slice(0, CHAT_MAX_BERICHT_LENGTE);
  try {
    await addDoc(collection(firebaseDb, FIREBASE_CHAT_COLLECTION), {
      text: safeText,
      displayName: getChatDisplayName(),
      uid: String(ingelogdeGebruiker.uid || ""),
      serverId: normalizeServerId(multiplayerServerId),
      createdAt: serverTimestamp(),
    });
    chatInputEl.value = "";
    setChatStatus("Verzonden", "#22c55e");
  } catch (err) {
    console.error("Bericht verzenden mislukt:", err);
    if (err?.code === "permission-denied") {
      setChatStatus("Geen toegang om te verzenden", "#f87171");
    } else if (err?.code === "unavailable") {
      setChatStatus("Chat server offline", "#f87171");
    } else {
      setChatStatus(`Verzenden mislukt (${err?.code || "onbekend"})`, "#f87171");
    }
  }
};
const buildChatUi = () => {
  if (chatPanel) return;
  chatPanel = document.createElement("section");
  chatPanel.id = "liveChatPanel";
  chatPanel.className = "is-open";
  chatPanel.innerHTML = `
    <button id="chatToggleBtn" class="chat-toggle" type="button">LIVE CHAT</button>
    <div class="chat-body">
      <div class="chat-header">
        <span>Live Chat</span>
        <span id="chatOnlineCount" class="chat-online-count">Online: 0</span>
        <span id="chatStatus" class="chat-status">...</span>
      </div>
      <div id="chatMessages" class="chat-messages">
        <div class="chat-empty">Berichten laden...</div>
      </div>
      <div class="chat-input-row">
        <input id="chatInput" maxlength="${CHAT_MAX_BERICHT_LENGTE}" type="text" autocomplete="off" placeholder="Typ je bericht..." />
        <button id="chatSendBtn" type="button">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(chatPanel);

  chatMessagesEl = document.getElementById("chatMessages");
  chatInputEl = document.getElementById("chatInput");
  chatSendBtnEl = document.getElementById("chatSendBtn");
  chatOnlineCountEl = document.getElementById("chatOnlineCount");
  chatStatusEl = document.getElementById("chatStatus");
  chatToggleBtnEl = document.getElementById("chatToggleBtn");

  chatToggleBtnEl?.addEventListener("click", () => setChatOpenState(!chatIsOpen));
  chatSendBtnEl?.addEventListener("click", () => window.sendChatMessage());
  chatInputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      window.sendChatMessage();
    }
  });
  chatInputEl?.addEventListener("focus", () => clearMovementKeys());
  setChatInputState(Boolean(ingelogdeGebruiker));
  setChatOnlineCount(0);
  setChatStatus("Starten...", "#9ca3af");
  setChatOpenState(true);
};
const refreshChatForAuthState = () => {
  setChatInputState(Boolean(ingelogdeGebruiker));
  if (!ingelogdeGebruiker) {
    stopChatSubscription();
    stopChatCleanup();
    stopOnlinePoll();
    stopPresenceHeartbeat();
    stopPresenceSubscription();
    clearRemotePlayers();
    setChatOnlineCount(0);
    setChatStatus("Log in met Google", "#f59e0b");
  }
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
window.syncEventMetMaand = () => {
  const actueleKey = getHuidigeEventMaandKey();
  if (eventMaandKey === actueleKey) return false;
  // Maandelijkse reset uitgeschakeld: enkel de key bijwerken.
  eventMaandKey = actueleKey;
  return true;
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

// Vergroot de klikzone van alle knoppen zonder visuele layout-wijziging.
const globalButtonHitboxStyle = document.createElement("style");
globalButtonHitboxStyle.textContent = `
  button {
    position: relative;
  }
  button::after {
    content: "";
    position: absolute;
    inset: -8px;
  }
`;
document.head.appendChild(globalButtonHitboxStyle);

// Fallback: activeer elke knop, ook wanneer inline onclick niet automatisch bindt.
document.addEventListener(
  "click",
  (event) => {
    const btn = event.target instanceof Element ? event.target.closest("button") : null;
    if (!btn || btn.disabled) return;
    if (typeof btn.onclick === "function") return;
    const inlineAction = btn.getAttribute("onclick");
    if (!inlineAction) return;
    event.preventDefault();
    try {
      new Function(inlineAction)();
    } catch (err) {
      console.error("Knop activatie mislukt:", err);
    }
  },
  true,
);

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
  window.syncEventMetMaand();
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
  trofeeen = getVrijgespeeldeTrofeeen();
  const miniGameBtnHtml = miniGameKnopZichtbaar
    ? `<button id="miniGameBtn" style="margin-top:8px; background:#16a085; color:white; border:2px solid white; padding:5px 15px; border-radius:8px; cursor:pointer; font-family:Impact; font-size:18px;">MINIGAME</button>`
    : "";
  if (!isCreative) {
    document.getElementById("trofeeDisp").innerHTML =
      `<div style="color:#f1c40f; font-size:45px;">TROFEEEN: ${trofeeen}</div>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
            <button id="trofeePadBtn" style="background:#f39c12; color:white; border:2px solid white; padding:5px 15px; border-radius:8px; cursor:pointer; font-family:Impact; font-size:18px;">TROFEEENPAD</button>
            <button id="leaderboardBtn" style="background:#2980b9; color:white; border:2px solid white; padding:5px 15px; border-radius:8px; cursor:pointer; font-family:Impact; font-size:18px;">LEADERBOARD</button>
            <button id="serversBtn" style="background:#8b5cf6; color:white; border:2px solid white; padding:5px 15px; border-radius:8px; cursor:pointer; font-family:Impact; font-size:18px;">SERVERS</button>
          </div>`;
    document.getElementById("miniGameSlot").innerHTML = miniGameBtnHtml;
    const trofeePadBtn = document.getElementById("trofeePadBtn");
    if (trofeePadBtn) trofeePadBtn.onclick = () => window.openTrofee();
    const leaderboardBtn = document.getElementById("leaderboardBtn");
    if (leaderboardBtn) leaderboardBtn.onclick = () => window.openLeaderboard();
    const serversBtn = document.getElementById("serversBtn");
    if (serversBtn) serversBtn.onclick = () => window.openMultiplayerServers();
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
  const isStarter = skinNaam === "STARTER";
  const isRed = skinNaam === "RED";
  const isBlue = skinNaam === "BLUE";
  const isOmgekeerd = !isStarter && !isRed && !isBlue;
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
  totaalVerdiendVoorTrofeeen,
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
  eventMaandKey,
  spelerResetMaandKey,
  actieveOpdracht: actieveOpdracht ? { ...actieveOpdracht } : null,
  eventOpdracht: eventOpdracht ? { ...eventOpdracht } : null,
  rewardKlaar,
  eventRewardKlaar,
  huidigeSkin,
  ontgrendeldeSkins: [...ontgrendeldeSkins],
  shopUpgradeLevel,
  shopUpgradePrijs,
  multiplayerServerId,
  customServers: [...customServers],
  rebirtCount,
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
  totaalVerdiendVoorTrofeeen = Number.isFinite(snapshot.totaalVerdiendVoorTrofeeen)
    ? snapshot.totaalVerdiendVoorTrofeeen
    : 0;
  totaalGemaaid = snapshot.totaalGemaaid;
  totaalUpgrades = snapshot.totaalUpgrades;
  diamanten = snapshot.diamanten;
  geclaimdeTrofeeen = Number.isFinite(snapshot.geclaimdeTrofeeen)
    ? snapshot.geclaimdeTrofeeen
    : 0;
  geclaimdeTrofeeen = Math.max(0, Math.min(TROFEE_DREMPELS.length, geclaimdeTrofeeen));
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
  eventMaandKey = snapshot.eventMaandKey || getHuidigeEventMaandKey();
  spelerResetMaandKey =
    snapshot.spelerResetMaandKey || getHuidigeEventMaandKey();
  actieveOpdracht = snapshot.actieveOpdracht ? { ...snapshot.actieveOpdracht } : null;
  eventOpdracht = snapshot.eventOpdracht ? { ...snapshot.eventOpdracht } : null;
  rewardKlaar = snapshot.rewardKlaar;
  eventRewardKlaar = snapshot.eventRewardKlaar;
  huidigeSkin = snapshot.huidigeSkin;
  ontgrendeldeSkins = [...snapshot.ontgrendeldeSkins];
  shopUpgradeLevel = snapshot.shopUpgradeLevel;
  shopUpgradePrijs = SHOP_UPGRADE_VASTE_KOST;
  if (Array.isArray(snapshot.customServers)) {
    customServers = sanitizeCustomServers(snapshot.customServers);
    saveCustomServersLocal();
  }
  multiplayerServerId = normalizeServerId(snapshot.multiplayerServerId);
  if (CUSTOM_SERVER_REGEX.test(multiplayerServerId)) registerCustomServer(multiplayerServerId);
  rebirtCount = Number.isFinite(snapshot.rebirtCount) ? snapshot.rebirtCount : 0;
  shopUpgradeLevel = 0;
  verdienMultiplier = Math.pow(REBIRT_BONUS_STEP, rebirtCount);
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
    setWorldVectorFromLocalXZ(cameraOffsetWorld, CAMERA_OFFSET, stuurYaw);
    desiredCameraPos.copy(mower.position).add(cameraOffsetWorld);
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
  trofeeen = getVrijgespeeldeTrofeeen();
  const progress = getTrofeeProgressVerdiend();
  let h = `<div style="background:#111; padding:40px; border:8px solid #f1c40f; border-radius:30px; text-align:center; min-width:500px; max-height:85vh; overflow-y:auto;"><h1 style="color:#f1c40f; font-size:55px;">TROFEEENPAD</h1><p style="margin-bottom:10px;">Progressie op basis van totaal verdiend</p><p style="margin-bottom:20px; color:#95a5a6;">TOTAAL: $${progress.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>`;
  for (let i = 1; i <= TROFEE_DREMPELS.length; i++) {
    let geclaimd = i <= geclaimdeTrofeeen,
      kan = i <= trofeeen && !geclaimd;
    const drempel = TROFEE_DREMPELS[i - 1];
    const vorigeDrempel = i === 1 ? 0 : TROFEE_DREMPELS[i - 2];
    const stapDoel = Math.max(1, drempel - vorigeDrempel);
    const stapVoortgang = Math.max(0, Math.min(stapDoel, progress - vorigeDrempel));
    const stapPct = geclaimd ? 100 : Math.max(0, Math.min(100, (stapVoortgang / stapDoel) * 100));
    const belBedrag = getTrofeeBeloning(i);
    const bel = i === 10
      ? `$${belBedrag.toLocaleString()} + BLUE SKIN`
      : `$${belBedrag.toLocaleString()}`;
    h += `<div style="padding:20px; margin:10px; background:#222; border-radius:15px; display:flex; justify-content:space-between; align-items:center; border:3px solid ${geclaimd ? "#2ecc71" : kan ? "#f1c40f" : "#444"};">
            <div style="text-align:left; min-width:320px;">
              <div style="font-size:24px;">TROFEE ${i}</div>
              <div style="color:#aaa;">VEREIST: $${drempel.toLocaleString()}</div>
              <div style="color:#aaa;">BELONING: ${bel}</div>
              <div style="width:100%; height:16px; background:#111827; border:2px solid #555; border-radius:10px; margin-top:8px; overflow:hidden;">
                <div style="width:${stapPct}%; height:100%; background:${geclaimd || kan ? "#2ecc71" : "#f1c40f"};"></div>
              </div>
              <div style="color:#95a5a6; font-size:14px; margin-top:4px;">${Math.floor(stapPct)}% (${Math.floor(stapVoortgang).toLocaleString()}/${Math.floor(stapDoel).toLocaleString()})</div>
            </div>
            ${geclaimd ? "CLAIMED" : kan ? `<button onclick="window.claimT(${i})" style="background:#2ecc71; color:white; border:none; padding:12px 25px; border-radius:10px; cursor:pointer; font-family:Impact; font-size:18px;">CLAIM</button>` : "LOCKED"}
        </div>`;
  }
  overlay.innerHTML =
    h +
    `<button onclick="window.sluit()" style="margin-top:20px; padding:15px 60px; background:#f1c40f; color:black; border:none; border-radius:15px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button></div>`;
};

window.openLeaderboard = async () => {
  if (!firebaseDb) {
    alert("Leaderboard is nu niet beschikbaar.");
    return;
  }
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  overlay.innerHTML = `<div style="background:#111; padding:40px; border:8px solid #2980b9; border-radius:30px; text-align:center; min-width:640px; max-width:900px; max-height:85vh; overflow-y:auto;">
      <h1 style="color:#5dade2; font-size:55px; margin-bottom:10px;">LEADERBOARD</h1>
      <p style="margin-bottom:16px; color:#d6eaf8;">Top 10 spelers op basis van totaal verdiend</p>
      <div style="font-size:24px; color:#bdc3c7;">LADEN...</div>
    </div>`;
  try {
    const leaderboardQuery = query(
      collection(firebaseDb, FIREBASE_SAVE_COLLECTION),
      orderBy("updatedAt", "desc"),
      limit(1000),
    );
    const snap = await getDocs(leaderboardQuery);
    const spelers = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const email =
        typeof data.accountEmail === "string" ? data.accountEmail.trim() : "";
      if (!email || !email.includes("@")) return;
      const verdiend = Number(data.totaalVerdiend);
      const speeltijd = Number(data.totaalSpeeltijdSec);
      const safeVerdiend = Number.isFinite(verdiend) ? Math.max(0, verdiend) : 0;
      const safeSpeeltijd = Number.isFinite(speeltijd) ? Math.max(0, speeltijd) : 0;
      if (safeVerdiend <= 0 && safeSpeeltijd <= 0) return;
      spelers.push({
        uid: docSnap.id,
        naam: getLeaderboardDisplayName(data, docSnap.id),
        totaalVerdiend: safeVerdiend,
        totaalSpeeltijdSec: safeSpeeltijd,
      });
    });
    const mijnUid = ingelogdeGebruiker?.uid ? String(ingelogdeGebruiker.uid) : "";
    let leaderboardMode = "money";
    const renderLeaderboard = () => {
      const opSpeelwijze =
        leaderboardMode === "time"
          ? (a, b) => b.totaalSpeeltijdSec - a.totaalSpeeltijdSec
          : (a, b) => b.totaalVerdiend - a.totaalVerdiend;
      const gesorteerd = [...spelers].sort(opSpeelwijze);
      const topTien = gesorteerd.slice(0, 10);
      const mijnIndex = mijnUid
        ? gesorteerd.findIndex((speler) => speler.uid === mijnUid)
        : -1;
      const mijnPositie = mijnIndex >= 0 ? gesorteerd[mijnIndex] : null;
      const toonMijnPositie = Boolean(mijnPositie && mijnIndex + 1 > 10);
      const titelWaarde =
        leaderboardMode === "time" ? "SPEELTIJD" : "TOTAAL VERDIEND";
      const waardeHtml = (speler) =>
        leaderboardMode === "time"
          ? formatPlaytime(speler.totaalSpeeltijdSec)
          : `$${speler.totaalVerdiend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      const waardeKleur = leaderboardMode === "time" ? "#fbbf24" : "#2ecc71";
      const lijstHtml = topTien.length
        ? topTien
            .map(
              (speler, index) => `<div style="display:grid; grid-template-columns:110px 1fr 240px; gap:10px; align-items:center; text-align:left; padding:14px; margin:8px 0; border-radius:12px; background:${index < 3 ? "#1b2631" : "#1f2937"}; border:2px solid ${index < 3 ? "#f1c40f" : "#334155"};">
                <div style="font-size:24px; color:${index < 3 ? "#f1c40f" : "#93c5fd"};">#${index + 1}</div>
                <div style="font-size:22px; color:white; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(speler.naam)}</div>
                <div style="font-size:22px; color:${waardeKleur}; text-align:right;">${waardeHtml(speler)}</div>
              </div>`,
            )
            .join("")
        : `<div style="font-size:24px; color:#bdc3c7; margin:20px 0;">Nog geen spelers met leaderboard-data gevonden.</div>`;
      const mijnPositieHtml = toonMijnPositie
        ? `<div style="margin-top:14px; padding-top:14px; border-top:2px dashed #3b4b63;">
            <div style="font-size:20px; color:#95a5a6; margin-bottom:8px; text-align:left;">JOUW POSITIE</div>
            <div style="display:grid; grid-template-columns:110px 1fr 240px; gap:10px; align-items:center; text-align:left; padding:14px; margin:8px 0; border-radius:12px; background:#102a43; border:2px solid #4fc3f7;">
              <div style="font-size:24px; color:#4fc3f7;">#${mijnIndex + 1}</div>
              <div style="font-size:22px; color:white; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(mijnPositie.naam)}</div>
              <div style="font-size:22px; color:${waardeKleur}; text-align:right;">${waardeHtml(mijnPositie)}</div>
            </div>
          </div>`
        : "";
      overlay.innerHTML = `<div style="background:#111; padding:40px; border:8px solid #2980b9; border-radius:30px; text-align:center; min-width:640px; max-width:900px; max-height:85vh; overflow-y:auto;">
          <h1 style="color:#5dade2; font-size:55px; margin-bottom:8px;">LEADERBOARD</h1>
          <p style="margin-bottom:14px; color:#d6eaf8;">Top 10 spelers (Google login)</p>
          <div style="display:flex; gap:10px; justify-content:center; margin-bottom:14px;">
            <button id="lbMoneyBtn" style="padding:10px 20px; border:none; border-radius:10px; font-family:Impact; font-size:20px; cursor:pointer; background:${leaderboardMode === "money" ? "#2ecc71" : "#374151"}; color:white;">TOTAAL VERDIEND</button>
            <button id="lbTimeBtn" style="padding:10px 20px; border:none; border-radius:10px; font-family:Impact; font-size:20px; cursor:pointer; background:${leaderboardMode === "time" ? "#f59e0b" : "#374151"}; color:white;">SPEELTIJD</button>
          </div>
          <div style="display:grid; grid-template-columns:110px 1fr 240px; gap:10px; font-size:20px; color:#95a5a6; border-bottom:2px solid #34495e; padding-bottom:8px; margin-bottom:10px;">
            <div>PLAATS</div>
            <div>NAAM</div>
            <div style="text-align:right;">${titelWaarde}</div>
          </div>
          ${lijstHtml}
          ${mijnPositieHtml}
          <button onclick="window.sluit()" style="margin-top:18px; padding:14px 56px; background:#2980b9; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
        </div>`;
      const lbMoneyBtn = document.getElementById("lbMoneyBtn");
      const lbTimeBtn = document.getElementById("lbTimeBtn");
      if (lbMoneyBtn)
        lbMoneyBtn.onclick = () => {
          leaderboardMode = "money";
          renderLeaderboard();
        };
      if (lbTimeBtn)
        lbTimeBtn.onclick = () => {
          leaderboardMode = "time";
          renderLeaderboard();
        };
    };
    renderLeaderboard();
  } catch (err) {
    console.error("Leaderboard laden mislukt:", err);
    overlay.innerHTML = `<div style="background:#111; padding:40px; border:8px solid #e74c3c; border-radius:30px; text-align:center; min-width:560px;">
        <h1 style="color:#e74c3c; font-size:52px; margin-bottom:14px;">FOUT</h1>
        <p style="font-size:24px; color:#ecf0f1;">Kon leaderboard niet laden. Probeer opnieuw.</p>
        <button onclick="window.sluit()" style="margin-top:18px; padding:14px 56px; background:#e74c3c; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
      </div>`;
  }
};

window.selectMultiplayerServer = async (serverId) => {
  multiplayerServerId = normalizeServerId(serverId);
  if (CUSTOM_SERVER_REGEX.test(multiplayerServerId)) {
    registerCustomServer(multiplayerServerId);
  }
  await window.save(true);
  subscribeChat();
  refreshOnlineSpelers();
  refreshPresenceSync();
  await window.openMultiplayerServers();
};

window.createCustomServer = async () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const id = `${CUSTOM_SERVER_PREFIX}${code}`;
  registerCustomServer(id);
  await window.selectMultiplayerServer(id);
  alert(`Prive server gemaakt: ${id}\nDeel deze code met je vriend(en).`);
};

window.joinCustomServerViaCode = async () => {
  const raw = (prompt("Voer servercode in (bijv. ROOM-ABC123 of ABC123):") || "")
    .trim()
    .toUpperCase();
  if (!raw) return;
  const normalizedInput = raw.startsWith(CUSTOM_SERVER_PREFIX)
    ? raw
    : `${CUSTOM_SERVER_PREFIX}${raw}`;
  if (!CUSTOM_SERVER_REGEX.test(normalizedInput)) {
    alert("Ongeldige servercode.");
    return;
  }
  registerCustomServer(normalizedInput);
  await window.selectMultiplayerServer(normalizedInput);
};

window.openMultiplayerServers = async () => {
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  const actieveServer = getServerById(multiplayerServerId);
  overlay.innerHTML = `<div style="background:#111; padding:40px; border:8px solid #8b5cf6; border-radius:30px; text-align:center; min-width:680px; max-width:900px; max-height:85vh; overflow-y:auto;">
      <h1 style="color:#c4b5fd; font-size:52px; margin-bottom:8px;">MULTIPLAYER SERVERS</h1>
      <p style="margin-bottom:12px; color:#ddd6fe;">Kies een server voor live chat + online spelers.</p>
      <div style="font-size:20px; color:${actieveServer.accent}; margin-bottom:18px;">Actief: ${escapeHtml(actieveServer.naam)} (${escapeHtml(actieveServer.regio)})</div>
      <div style="font-size:22px; color:#bdc3c7;">SERVERS LADEN...</div>
    </div>`;

  if (!firebaseDb) {
    overlay.innerHTML = `<div style="background:#111; padding:40px; border:8px solid #8b5cf6; border-radius:30px; text-align:center; min-width:680px;">
      <h1 style="color:#c4b5fd; font-size:52px; margin-bottom:8px;">MULTIPLAYER SERVERS</h1>
      <p style="font-size:22px; color:#ecf0f1;">Firebase is niet beschikbaar.</p>
      <p style="font-size:18px; color:#95a5a6;">Zonder online backend kun je geen live servers gebruiken.</p>
      <button onclick="window.sluit()" style="margin-top:18px; padding:14px 56px; background:#8b5cf6; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
    </div>`;
    return;
  }

  try {
    const cutoff = Timestamp.fromMillis(Date.now() - ONLINE_SPELER_WINDOW_MS);
    const onlineQuery = query(
      collection(firebaseDb, FIREBASE_SAVE_COLLECTION),
      where("updatedAt", ">=", cutoff),
      limit(2000),
    );
    const snap = await getDocs(onlineQuery);
    const spelersPerServer = new Map();
    const serverLijst = [...getAlleServers()];
    for (const server of serverLijst) spelersPerServer.set(server.id, []);
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const serverId = normalizeServerId(data.multiplayerServerId);
      if (CUSTOM_SERVER_REGEX.test(serverId) && !spelersPerServer.has(serverId)) {
        registerCustomServer(serverId, { persist: false });
        serverLijst.push(getServerById(serverId));
        spelersPerServer.set(serverId, []);
      }
      const naam = getLeaderboardDisplayName(data, docSnap.id);
      const lijst = spelersPerServer.get(serverId) || [];
      lijst.push(naam);
      spelersPerServer.set(serverId, lijst);
    });

    const serversHtml = serverLijst.map((server) => {
      const spelers = spelersPerServer.get(server.id) || [];
      const isActief = normalizeServerId(multiplayerServerId) === server.id;
      const maxPreview = 6;
      const preview = spelers.slice(0, maxPreview);
      const resterend = Math.max(0, spelers.length - preview.length);
      const previewHtml = preview.length
        ? preview
            .map(
              (naam) =>
                `<span style="display:inline-block; padding:5px 10px; margin:4px; background:#1f2937; border:1px solid #4b5563; border-radius:999px; color:#e5e7eb; font-size:14px;">${escapeHtml(naam)}</span>`,
            )
            .join("")
        : `<span style="color:#6b7280;">Geen online spelers</span>`;
      const resterendHtml =
        resterend > 0
          ? `<div style="color:#9ca3af; font-size:14px; margin-top:4px;">+${resterend} extra online</div>`
          : "";
      return `<div style="text-align:left; background:#161b22; border:3px solid ${isActief ? server.accent : "#374151"}; border-radius:14px; padding:14px; margin:10px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:14px;">
            <div>
              <div style="font-size:24px; color:${server.accent};">${escapeHtml(server.naam)}</div>
              <div style="color:#9ca3af;">Regio: ${escapeHtml(server.regio)} | Online: ${spelers.length}</div>
            </div>
            <button data-server-select="${server.id}" style="padding:12px 22px; border:none; border-radius:10px; font-family:Impact; font-size:20px; cursor:pointer; background:${isActief ? "#22c55e" : server.accent}; color:white;">${isActief ? "VERBONDEN" : "JOIN"}</button>
          </div>
          <div style="margin-top:10px;">${previewHtml}${resterendHtml}</div>
        </div>`;
    }).join("");

    overlay.innerHTML = `<div style="background:#111; padding:40px; border:8px solid #8b5cf6; border-radius:30px; text-align:center; min-width:680px; max-width:900px; max-height:85vh; overflow-y:auto;">
      <h1 style="color:#c4b5fd; font-size:52px; margin-bottom:8px;">MULTIPLAYER SERVERS</h1>
      <p style="margin-bottom:12px; color:#ddd6fe;">Server kiezen bepaalt je online lobby, chat en zichtbare spelers.</p>
      <div style="display:flex; gap:10px; justify-content:center; margin-bottom:14px;">
        <button onclick="window.createCustomServer()" style="padding:12px 22px; background:#ec4899; color:white; border:2px solid white; border-radius:10px; font-family:Impact; font-size:20px; cursor:pointer;">CREATE PRIVE SERVER</button>
        <button onclick="window.joinCustomServerViaCode()" style="padding:12px 22px; background:#0ea5e9; color:white; border:2px solid white; border-radius:10px; font-family:Impact; font-size:20px; cursor:pointer;">JOIN VIA CODE</button>
      </div>
      ${serversHtml}
      <button onclick="window.sluit()" style="margin-top:18px; padding:14px 56px; background:#8b5cf6; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
    </div>`;
    overlay.querySelectorAll("[data-server-select]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gekozen = btn.getAttribute("data-server-select");
        if (!gekozen) return;
        window.selectMultiplayerServer(gekozen);
      });
    });
  } catch (err) {
    console.error("Servers laden mislukt:", err);
    overlay.innerHTML = `<div style="background:#111; padding:40px; border:8px solid #ef4444; border-radius:30px; text-align:center; min-width:680px;">
      <h1 style="color:#ef4444; font-size:52px; margin-bottom:8px;">SERVER FOUT</h1>
      <p style="font-size:22px; color:#ecf0f1;">Kon multiplayer servers niet laden.</p>
      <button onclick="window.sluit()" style="margin-top:18px; padding:14px 56px; background:#ef4444; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
    </div>`;
  }
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
    geld += getTrofeeBeloning(i); // Trofee-beloningen verhogen alleen geld, niet totaalVerdiend.
    if (i === 10) {
      if (!ontgrendeldeSkins.includes("BLUE")) ontgrendeldeSkins.push("BLUE");
      alert("LEGENDARISCH! BLUE SKIN VRIJGESPEELD");
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
  const volgendeRebirtMulti = (verdienMultiplier * REBIRT_BONUS_STEP).toFixed(2);
  const radKost = window.getRadKost();
  const skinShopHtml = DIAMANT_SKINS_SHOP.map((skin) => {
    const gekocht = ontgrendeldeSkins.includes(skin.id);
    const kanKopen = diamanten >= skin.prijs;
    const knopTekst = gekocht ? "GEKOCHT" : `KOOP (${skin.prijs}D)`;
    const knopKleur = gekocht ? "#16a34a" : kanKopen ? "#7c3aed" : "#555";
    const cursor = gekocht || kanKopen ? "pointer" : "default";
    return `<div style="padding:12px; background:#111827; border:2px solid #374151; border-radius:12px;">
      <div style="font-size:22px; color:${skin.kleur};">${skin.naam}</div>
      <div style="font-size:16px; color:#cbd5e1; margin:4px 0 10px 0;">Premium skin</div>
      <button onclick="window.koopSkinMetDiamanten('${skin.id}')" ${gekocht ? "disabled" : ""} style="width:100%; padding:10px; background:${knopKleur}; color:white; border:2px solid white; border-radius:10px; font-family:Impact; font-size:18px; cursor:${cursor};">${knopTekst}</button>
    </div>`;
  }).join("");
  overlay.innerHTML = `<div style="background:#111; padding:45px; border:8px solid #5dade2; border-radius:30px; text-align:center; min-width:560px;">
        <h1 style="color:#85c1e9; font-size:60px; margin:0 0 10px 0;">&#128142; SHOP</h1>
        <p style="font-size:24px; margin:8px 0; color:#2ecc71;">Geld: $${geld.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p style="font-size:26px; margin:10px 0 25px 0;">Diamanten: <span style="color:#85c1e9;">${diamanten}</span></p>
        <div style="width:100%; padding:14px; background:#1f2937; color:#93c5fd; border:3px solid #334155; border-radius:14px; font-family:Impact; font-size:22px; margin-bottom:12px;">DIAMANTEN KRIJG JE VIA GRASS PASS</div>
        <div style="margin-top:16px; padding:14px; background:#1f2d1f; border:3px solid #2ecc71; border-radius:14px;">
          <button onclick="window.koopRebirt()" style="width:100%; padding:16px; background:${diamanten >= REBIRT_KOST_DIAMANT ? "#2ecc71" : "#555"}; color:white; border:3px solid white; border-radius:12px; cursor:${diamanten >= REBIRT_KOST_DIAMANT ? "pointer" : "default"}; font-family:Impact; font-size:24px;">REBIRT (+5% | ${REBIRT_KOST_DIAMANT}D)</button>
          <p style="font-size:18px; color:#c8f7c5; margin:10px 0 0 0;">Reset enkel upgrades. Huidig: x${verdienMultiplier.toFixed(2)} | Na rebirt: x${volgendeRebirtMulti}</p>
        </div>
        <div style="margin-top:22px; padding:16px; background:#2d1f3a; border:3px solid #8e44ad; border-radius:14px;">
          <div style="font-size:26px; color:#d2b4de; margin-bottom:8px;"> LUCKY RAD</div>
          <p style="font-size:20px; margin:0 0 12px 0; color:#e8daef;">Beloningen groeien geleidelijk met je progressie.</p>
          <button onclick="window.draaiRad()" style="width:100%; padding:16px; background:${diamanten >= radKost ? "#8e44ad" : "#555"}; color:white; border:3px solid white; border-radius:12px; cursor:${diamanten >= radKost ? "pointer" : "default"}; font-family:Impact; font-size:24px;">DRAAI RAD (${radKost}D)</button>
          <p style="font-size:18px; color:#d7bde2; margin:10px 0 0 0;">Mogelijke rewards: Geld, Diamanten, Radius/Speed/Value upgrade</p>
        </div>
        <div style="margin-top:22px; padding:16px; background:#1f1236; border:3px solid #7c3aed; border-radius:14px;">
          <div style="font-size:26px; color:#c4b5fd; margin-bottom:10px;"> DIAMANT SKINS</div>
          <p style="font-size:18px; margin:0 0 12px 0; color:#ddd6fe;">Dure skins die je alleen met edelstenen kunt kopen.</p>
          <div style="display:grid; grid-template-columns:repeat(2, minmax(200px, 1fr)); gap:10px;">
            ${skinShopHtml}
          </div>
        </div>
        <button onclick="window.sluit()" style="margin-top:16px; padding:14px 50px; background:#5dade2; color:white; border:none; border-radius:12px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button>
    </div>`;
};

window.koopDiamant = () => {
  alert("Diamanten kopen staat uit. Verdien diamanten via Grass Pass.");
};

window.koopSkinMetDiamanten = (skinId) => {
  const id = String(skinId || "").toUpperCase();
  const skinDef = DIAMANT_SKINS_SHOP.find((skin) => skin.id === id);
  if (!skinDef) {
    alert("Deze skin bestaat niet.");
    return;
  }
  if (ontgrendeldeSkins.includes(id)) {
    alert(`${skinDef.naam} is al gekocht.`);
    return;
  }
  if (diamanten < skinDef.prijs) {
    alert(`Je hebt ${skinDef.prijs} diamanten nodig voor ${skinDef.naam}.`);
    return;
  }
  diamanten -= skinDef.prijs;
  ontgrendeldeSkins.push(id);
  huidigeSkin = id;
  window.applySkinVisual(huidigeSkin);
  window.updateUI();
  window.save(true);
  alert(`${skinDef.naam} gekocht en geactiveerd!`);
  window.openShop();
};

window.koopRebirt = () => {
  if (gameMode === "creative") return;
  if (diamanten < REBIRT_KOST_DIAMANT) {
    alert(`Je hebt ${REBIRT_KOST_DIAMANT} diamant nodig.`);
    return;
  }
  diamanten -= REBIRT_KOST_DIAMANT;
  countRadius = 0;
  countSnelheid = 0;
  countWaarde = 0;
  huidigMowerRadius = 1.3;
  huidigeSnelheid = BASE_SPEED;
  grasWaarde = BASE_GRASS_VALUE;
  prijsRadius = 5;
  prijsSnelheid = 5;
  prijsWaarde = 10;
  rebirtCount++;
  verdienMultiplier = Math.pow(REBIRT_BONUS_STEP, rebirtCount);
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
    huidigMowerRadius += RADIUS_UPGRADE_STEP;
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
  ["STARTER", "RED", "BLUE", ...DIAMANT_SKIN_IDS, ...maanden].forEach((s) => {
    const ok = gameMode === "creative" || ontgrendeldeSkins.includes(s),
      cur = huidigeSkin === s;
    h += `<button class="skinSelectBtn" data-skin="${s}" data-unlocked="${ok ? "1" : "0"}" style="padding:20px; background:${ok ? (cur ? "#2ecc71" : "#333") : "#111"}; color:${ok ? "white" : "#555"}; font-family:Impact; border:${cur ? "4px solid white" : "2px solid #444"}; border-radius:15px; cursor:${ok ? "pointer" : "default"}; font-size:18px;" ${ok ? "" : "disabled"}>${ok ? s : "LOCKED"}</button>`;
  });
  overlay.innerHTML =
    h +
    `</div><button onclick="window.sluit()" style="margin-top:30px; padding:15px 60px; background:#3498db; color:white; border:none; border-radius:15px; font-family:Impact; font-size:24px; cursor:pointer;">SLUITEN</button></div>`;
  overlay.querySelectorAll(".skinSelectBtn").forEach((btn) => {
    if (btn.getAttribute("data-unlocked") !== "1") return;
    btn.addEventListener("click", () => {
      const gekozenSkin = btn.getAttribute("data-skin");
      if (!gekozenSkin) return;
      window.setSkin(gekozenSkin);
    });
  });
};
window.setSkin = (s) => {
  huidigeSkin = s;
  window.applySkinVisual(s);
  window.openSkins();
};

window.openGP = () => {
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  const v = Math.min(
    window.getStat(actieveOpdracht.id) - actieveOpdracht.start,
    actieveOpdracht.d,
  );
  overlay.innerHTML = `<div style="background:#111; padding:60px; border:10px solid #f1c40f; border-radius:40px; text-align:center;">
        <h1 style="color:#f1c40f; font-size:70px; margin-bottom:5px;"> GRASS PASS</h1>
        <h2 style="color:white; font-size:30px; margin-top:0; opacity:0.8;">LEVEL ${gpLevel}</h2>
        <p style="font-size:30px; margin-top:20px;">${actieveOpdracht.t}</p>
        <div style="width:500px; height:40px; background:#333; border:4px solid white; margin:30px auto; border-radius:20px; overflow:hidden;"><div style="width:${(v / actieveOpdracht.d) * 100}%; height:100%; background:#f1c40f;"></div></div>
        <button onclick="window.claimGP()" style="padding:25px 70px; background:${rewardKlaar ? "#2ecc71" : "#444"}; font-family:Impact; font-size:32px; color:white; cursor:pointer; border:none; border-radius:20px;">${rewardKlaar ? `CLAIM ${GRASSPASS_DIAMANT_REWARD} DIAMANT` : "LOCKED"}</button>
        <br><button onclick="window.sluit()" style="margin-top:30px; color:gray; background:none; border:none; cursor:pointer; font-size:20px;">SLUITEN</button></div>`;
};
window.claimGP = () => {
  if (rewardKlaar) {
    diamanten += GRASSPASS_DIAMANT_REWARD;
    gpLevel++;
    window.genereerMissie(false);
    window.sluit();
    window.updateUI();
  }
};

window.openEvent = () => {
  window.syncEventMetMaand();
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  const huidigeMaandNaam = getHuidigeMaandNaam();
  const skinClaimKlaar =
    eventLevel === 100 && !ontgrendeldeSkins.includes(huidigeMaandNaam);
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
  window.syncEventMetMaand();
  if (eventRewardKlaar) {
    const huidigeMaandNaam = getHuidigeMaandNaam();
    if (eventLevel !== 100) {
      geld += 1;
      totaalVerdiend += 1;
    }
    if (eventLevel === 100 && !ontgrendeldeSkins.includes(huidigeMaandNaam))
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
window.toggleOneindigSpeelveld = () => {
  oneindigSpeelveldOnd = !oneindigSpeelveldOnd;
  if (gameMode === "classic") {
    previousMowerPos.copy(mower.position);
    mowerVelocity.set(0, 0, 0);
    smoothedMowerVelocity.set(0, 0, 0);
    cameraSwayOffset.set(0, 0, 0);
    cameraSwayTarget.set(0, 0, 0);
  }
  window.openSettings();
};

window.getSaveData = () => ({
  geld,
  totaalVerdiend,
  totaalVerdiendVoorTrofeeen,
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
  eventMaandKey,
  spelerResetMaandKey,
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
  multiplayerServerId,
  customServers: [...customServers],
  rebirtCount,
  verdienMultiplier,
  totaalSpeeltijdSec,
  lichtKleur,
  radDraaiCount,
  creativeSpeed,
  fpsMeterOnd,
  oneindigSpeelveldOnd,
  gebruikteRedeemCodes: [...gebruikteRedeemCodes],
});

window.applySaveData = (d) => {
  if (!d || typeof d !== "object") return false;

  geld = Number.isFinite(d.geld) ? d.geld : 0;
  totaalVerdiend = Number.isFinite(d.totaalVerdiend) ? d.totaalVerdiend : 0;
  totaalVerdiendVoorTrofeeen = Number.isFinite(d.totaalVerdiendVoorTrofeeen)
    ? d.totaalVerdiendVoorTrofeeen
    : 0;
  totaalGemaaid = Number.isFinite(d.totaalGemaaid) ? d.totaalGemaaid : 0;
  totaalUpgrades = Number.isFinite(d.totaalUpgrades) ? d.totaalUpgrades : 0;
  geclaimdeTrofeeen =
    d.geclaimdeTrofeeen ?? d.geclaimdeTrofeeën ?? d["geclaimdeTrofeeÃ«n"] ?? 0;
  if (!Number.isFinite(geclaimdeTrofeeen) || geclaimdeTrofeeen < 0)
    geclaimdeTrofeeen = 0;
  geclaimdeTrofeeen = Math.min(TROFEE_DREMPELS.length, geclaimdeTrofeeen);
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
  huidigeSkin = d.huidigeSkin || "STARTER";
  if (huidigeSkin === "RED") huidigeSkin = "STARTER";
  ontgrendeldeSkins = Array.isArray(d.ontgrendeldeSkins)
    ? [...new Set(d.ontgrendeldeSkins.map((skin) => String(skin).toUpperCase()))]
    : ["STARTER"];
  if (ontgrendeldeSkins.includes("RED") && !ontgrendeldeSkins.includes("STARTER"))
    ontgrendeldeSkins.unshift("STARTER");
  if (!ontgrendeldeSkins.includes("STARTER")) ontgrendeldeSkins.unshift("STARTER");
  if (!ontgrendeldeSkins.includes(huidigeSkin)) huidigeSkin = "STARTER";
  eventMaandKey =
    typeof d.eventMaandKey === "string" && /^\d{4}-\d{2}$/.test(d.eventMaandKey)
      ? d.eventMaandKey
      : getHuidigeEventMaandKey();
  spelerResetMaandKey =
    typeof d.spelerResetMaandKey === "string" &&
    /^\d{4}-\d{2}$/.test(d.spelerResetMaandKey)
      ? d.spelerResetMaandKey
      : getHuidigeEventMaandKey();
  autoSaveOnd = Boolean(d.autoSaveOnd);
  gameMode = normalizeGameMode(d.gameMode);
  actieveOpdracht = d.actieveOpdracht || null;
  eventOpdracht = d.eventOpdracht || null;
  rewardKlaar = Boolean(d.rewardKlaar);
  eventRewardKlaar = Boolean(d.eventRewardKlaar);
  diamanten = Number.isFinite(d.diamanten) ? d.diamanten : 0;
  shopUpgradeLevel = 0;
  shopUpgradePrijs = SHOP_UPGRADE_VASTE_KOST;
  if (Array.isArray(d.customServers)) {
    customServers = sanitizeCustomServers(d.customServers);
    saveCustomServersLocal();
  }
  multiplayerServerId = normalizeServerId(d.multiplayerServerId);
  if (CUSTOM_SERVER_REGEX.test(multiplayerServerId)) registerCustomServer(multiplayerServerId);
  rebirtCount = Number.isFinite(d.rebirtCount) ? d.rebirtCount : 0;
  verdienMultiplier = Math.pow(REBIRT_BONUS_STEP, rebirtCount);
  totaalSpeeltijdSec = Number.isFinite(d.totaalSpeeltijdSec)
    ? d.totaalSpeeltijdSec
    : 0;
  lichtKleur =
    d.lichtKleur === "blue" ? "hemelsblauw" : (d.lichtKleur ?? "default");
  radDraaiCount = Number.isFinite(d.radDraaiCount) ? d.radDraaiCount : 0;
  creativeSpeed = Number.isFinite(d.creativeSpeed) ? d.creativeSpeed : 0.5;
  fpsMeterOnd = Boolean(d.fpsMeterOnd);
  oneindigSpeelveldOnd = Boolean(d.oneindigSpeelveldOnd);
  gebruikteRedeemCodes = Array.isArray(d.gebruikteRedeemCodes)
    ? d.gebruikteRedeemCodes
        .map((code) => String(code).trim().toUpperCase())
        .filter(Boolean)
    : [];
  window.syncEventMetMaand();
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
      refreshChatForAuthState();
      subscribeChat();
      startChatMaintenance();
      refreshPresenceSync();
    });
  } catch (err) {
    console.error("Firebase init mislukt:", err);
    setChatStatus("Firebase fout", "#f87171");
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
          accountDisplayName: ingelogdeGebruiker.displayName ?? null,
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
  localStorage.removeItem(CUSTOM_SERVERS_STORAGE_KEY);
  customServers = [];
  if (firebaseDb && ingelogdeGebruiker) {
    try {
      await deleteDoc(getSaveDocRef(ingelogdeGebruiker.uid));
      await deleteDoc(getPresenceDocRef(ingelogdeGebruiker.uid));
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
  const actieveServer = getServerById(multiplayerServerId);
  overlay.style.left = "0";
  overlay.style.pointerEvents = "auto";
  overlay.innerHTML = `<div id="settingsPanel" style="background:#111; padding:60px; border:8px solid white; border-radius:30px; text-align:center;">
        <h1 style="font-size:60px; margin-bottom:30px;">INSTELLINGEN</h1>
        <button onclick="window.toggleAutoSave()" style="width:400px; padding:20px; background:${autoSaveOnd ? "#2ecc71" : "#e74c3c"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">AUTO-SAVE: ${autoSaveOnd ? "AAN" : "UIT"}</button><br>
        <button onclick="window.toggleGameMode()" style="width:400px; padding:20px; background:${gameMode === "creative" ? "#f1c40f" : "#333"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">MODE: ${gameMode.toUpperCase()}</button><br>
        <button onclick="window.toggleOneindigSpeelveld()" style="width:400px; padding:20px; background:${oneindigSpeelveldOnd ? "#2ecc71" : "#444"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">ONEINDIG SPEELVELD: ${oneindigSpeelveldOnd ? "AAN" : "UIT"}</button><br>
        <button onclick="window.toggleLichtKleur()" style="width:400px; padding:20px; background:${lichtKleur === "hemelsblauw" ? "#87ceeb" : "#333"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">ACHTERGROND: ${lichtKleur === "hemelsblauw" ? "HEMELSBLAUW" : "STANDAARD"}</button><br>
        <button onclick="window.toggleFpsMeter()" style="width:400px; padding:20px; background:${fpsMeterOnd ? "#2ecc71" : "#444"}; color:white; font-family:Impact; font-size:25px; cursor:pointer; border:none; border-radius:15px; margin-bottom:10px;">FPS METER: ${fpsMeterOnd ? "AAN" : "UIT"}</button><br>
        <button onclick="window.openMultiplayerServers()" style="width:400px; padding:18px; background:#8b5cf6; color:white; font-family:Impact; font-size:24px; cursor:pointer; border:3px solid white; border-radius:15px; margin-bottom:10px;">SERVERS: ${actieveServer.id}</button><br>
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
    geld += 1000;
    gelukt = true;
  }
  if (c === "MINIGAME123") {
    miniGameKnopZichtbaar = true;
    miniGameKnopZichtbaarTot = Date.now() + MINIGAME_KNOP_DUUR_MS;
    miniGameCooldownTot = 0;
    miniGameVolgendeCheckAt = Date.now() + MINIGAME_CHECK_INTERVAL_MS;
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
    huidigMowerRadius += RADIUS_UPGRADE_STEP;
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
const GRASS_DENSITY = isLowEndDevice ? 4.25 : 5;
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
let stuurYaw = 0;
const desiredCameraPos = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const previousMowerPos = new THREE.Vector3();
const mowerVelocity = new THREE.Vector3();
const smoothedMowerVelocity = new THREE.Vector3();
const cameraSwayOffset = new THREE.Vector3();
const cameraSwayTarget = new THREE.Vector3();
const cameraLookAhead = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
const cameraOffsetWorld = new THREE.Vector3();
const cameraSwayWorld = new THREE.Vector3();
const setWorldVectorFromLocalXZ = (out, localVec, yaw) => {
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);
  const backX = -Math.sin(yaw);
  const backZ = Math.cos(yaw);
  out.set(
    rightX * localVec.x + backX * localVec.z,
    localVec.y,
    rightZ * localVec.x + backZ * localVec.z,
  );
  return out;
};
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
const grassDetailSegments = isLowEndDevice ? 5 : 6;
const grassGeometry = new THREE.SphereGeometry(
  0.1,
  grassDetailSegments,
  grassDetailSegments,
);
const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x008000 });
const grassMesh = new THREE.InstancedMesh(
  grassGeometry,
  grassMaterial,
  totalGrass,
);
grassMesh.frustumCulled = false;
grassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(grassMesh);

const grassDummy = new THREE.Object3D();
const grassData = new Array(totalGrass);
const regrowQueue = [];
let regrowQueueHead = 0;
const UI_UPDATE_INTERVAL_MS = 100;
const TARGET_FPS = isLowEndDevice ? 28 : 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const CREATIVE_UPDATE_SKIP_FRAMES = isLowEndDevice ? 1 : 0;
let creativeUpdateSkipCounter = 0;
let uiDirty = false;
let lastUiUpdate = 0;
let lastFrameTime = performance.now();
let frameAccumulatorMs = 0;
let fpsMeterFrames = 0;
let fpsMeterLastSampleAt = performance.now();
let fpsMeterEl = null;
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

const CHAT_BLOKKEER_MOVE_KEYS = [
  "w",
  "a",
  "s",
  "d",
  "q",
  "z",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
];
const isChatInputGefocust = () => document.activeElement === chatInputEl;
const clearMovementKeys = () => {
  for (const key of CHAT_BLOKKEER_MOVE_KEYS) {
    keys[key] = false;
  }
};
window.onkeydown = (e) => {
  const key = e.key.toLowerCase();
  if (isChatInputGefocust() && CHAT_BLOKKEER_MOVE_KEYS.includes(key)) {
    keys[key] = false;
    return;
  }
  keys[key] = true;
};
window.onkeyup = (e) => {
  const key = e.key.toLowerCase();
  if (isChatInputGefocust() && CHAT_BLOKKEER_MOVE_KEYS.includes(key)) {
    keys[key] = false;
    return;
  }
  keys[key] = false;
};
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
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
  if (isOneindigSpeelveldActief()) {
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

  if (isChatInputGefocust()) {
    clearMovementKeys();
  }

  if (frameAccumulatorMs < FRAME_INTERVAL_MS) return;
  frameAccumulatorMs %= FRAME_INTERVAL_MS;

  const deltaSec = FRAME_INTERVAL_MS / 1000;
  const frameFactor = Math.min(3, deltaSec * 60);
  let s = (gameMode === "creative" ? creativeSpeed : huidigeSnelheid) * frameFactor;
  const turnSpeed = BASE_TURN_SPEED * frameFactor;
  const now = Date.now();
  totaalSpeeltijdSec += deltaSec;
  if (
    (actieveOpdracht && actieveOpdracht.id === "p") ||
    (eventOpdracht && eventOpdracht.id === "p")
  )
    uiDirty = true;
  const draaitLinks = Boolean(keys["a"] || keys["q"] || keys["arrowleft"]);
  const draaitRechts = Boolean(keys["d"] || keys["arrowright"]);
  if (draaitLinks) stuurYaw -= turnSpeed;
  if (draaitRechts) stuurYaw += turnSpeed;
  mower.rotation.y = -stuurYaw;

  const rijdtVooruit = Boolean(keys["w"] || keys["z"] || keys["arrowup"]);
  const rijdtAchteruit = Boolean(keys["s"] || keys["arrowdown"]);
  const moveDir = (rijdtVooruit ? 1 : 0) + (rijdtAchteruit ? -1 : 0);
  if (moveDir !== 0) {
    const yaw = stuurYaw;
    mower.position.x += Math.sin(yaw) * s * moveDir;
    mower.position.z += -Math.cos(yaw) * s * moveDir;
  }
  if (gameMode === "classic" && !oneindigSpeelveldOnd) {
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
  let matrixUpdateNodig = false;
  if (isOneindigSpeelveldActief()) {
    if (CREATIVE_UPDATE_SKIP_FRAMES <= 0) {
      matrixUpdateNodig = updateCreativeGrass(now, maaierRadiusSq);
    } else if (creativeUpdateSkipCounter >= CREATIVE_UPDATE_SKIP_FRAMES) {
      creativeUpdateSkipCounter = 0;
      matrixUpdateNodig = updateCreativeGrass(now, maaierRadiusSq);
    } else {
      creativeUpdateSkipCounter++;
    }
  } else {
    creativeUpdateSkipCounter = 0;
    matrixUpdateNodig = cutGrassNearMowerClassic(now, maaierRadiusSq);
  }

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
  const yaw = stuurYaw;
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);
  const forwardX = Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const localSideVel =
    smoothedMowerVelocity.x * rightX + smoothedMowerVelocity.z * rightZ;
  const localForwardVel =
    smoothedMowerVelocity.x * forwardX + smoothedMowerVelocity.z * forwardZ;
  cameraSwayTarget.set(
    -localSideVel * CAMERA_SWAY_SIDE_FACTOR,
    0,
    Math.abs(localForwardVel) * CAMERA_SWAY_BACK_FACTOR,
  );
  cameraSwayOffset.lerp(cameraSwayTarget, swayLerp);
  setWorldVectorFromLocalXZ(cameraOffsetWorld, CAMERA_OFFSET, yaw);
  setWorldVectorFromLocalXZ(cameraSwayWorld, cameraSwayOffset, yaw);
  desiredCameraPos.copy(mower.position).add(cameraOffsetWorld).add(cameraSwayWorld);
  const camPosLerp = 1 - Math.exp(-CAMERA_POSITION_SMOOTHNESS * deltaSec);
  camera.position.lerp(desiredCameraPos, camPosLerp);
  cameraLookAhead
    .set(forwardX, 0, forwardZ)
    .multiplyScalar(localForwardVel * CAMERA_LOOK_AHEAD_FACTOR);
  cameraLookAhead.y = 0;
  desiredLookTarget.copy(mower.position).add(cameraLookAhead);
  const lookLerp = 1 - Math.exp(-CAMERA_LOOK_SMOOTHNESS * deltaSec);
  cameraLookTarget.lerp(desiredLookTarget, lookLerp);
  camera.lookAt(cameraLookTarget);
  trimStaleRemotePlayers();
  updateRemotePlayersVisual(deltaSec);
  renderer.render(scene, camera);
}

// --- 8. STARTUP ---
buildChatUi();
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
