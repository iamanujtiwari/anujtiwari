import * as THREE from "three";
import { parseGIF, decompressFrames } from "gifuct-js";

export default function initGame() {
if (typeof window === "undefined") return () => {};   // never run on the server (SSR)
const cleanups = [];
const on = (t, e, f, o) => { t.addEventListener(e, f, o); cleanups.push(() => t.removeEventListener(e, f, o)); };
let musicI = 0, raf = 0;

// =====================================================
//  EDIT YOUR PROFILE CONTENT HERE (HTML allowed)
// =====================================================
const bars = list => list.map(([n, p]) =>
    `<div class="bar">${n}<div><i style="width:${p}%"></i></div></div>`).join("");
const items = list => list.map(([t, s, d]) =>
    `<div class="item"><b>${t}</b><small>${s}</small>${d}</div>`).join("");
const carousel = list => `<div class="car"><div class="ring" data-n="${list.length}">${list.map(([t, s, d], i) =>
    `<div class="card3d" style="--i:${i}"><b>${t}</b><small>${s}</small><div>${d}</div></div>`).join("")}</div></div>
    <div class="carnav"><button id="carPrev">◀</button><span id="carIdx"></span><button id="carNext">▶</button></div>`;

// =====================================================
//  PROJECT SHIP: fill in your project name + link here
// =====================================================
const SHIP = {
    name: ""     // <- ship name shown on both sides of the hull (empty = placeholder)
};
// Each project becomes a labelled container on the dock, loaded onto the ships by the crane.
const PROJECTS = [
    { name: "PROJECT ONE",   tech: "Python · Streamlit",    link: "" },
    { name: "PROJECT TWO",   tech: "JavaScript · Three.js", link: "" },
    { name: "PROJECT THREE", tech: "Machine Learning",      link: "" },
    { name: "PROJECT FOUR",  tech: "AI · Data Science",     link: "" },
    { name: "PROJECT FIVE",  tech: "Cybersecurity",         link: "" },
    { name: "PROJECT SIX",   tech: "Web App",               link: "" }
];
const PIER_Y = 0.35;                                   // pier surface height
const harbor = { ship: null, state: "approach", z: -110, rot: Math.PI, t: 0, pi: 0, yard: [], loaded: [], steps: [], si: 0, cz: 6, tx: 0, hy: 9.8, horn: false };
function groundHeight(x, z) {                         // pier + entrance ramp are walkable
    const g = harbor.g; if (!g) return 0;
    const dx = x - g.position.x, dz = z - g.position.z, c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < 2.5) {
        if (lz <= 14 && lz >= -10) return PIER_Y;
        if (lz > 14 && lz < 17) return PIER_Y * (17 - lz) / 3;
    }
    return 0;
}
function inHarborChannel(x, z, pad = 0) {      // sea channel that leaves the harbor (keeps trees / grass out)
    const l = LOCS[2], dx = Math.sin(l.rad), dz = -Math.cos(l.rad);
    const t = x * dx + z * dz, lat = x * Math.cos(l.rad) + z * Math.sin(l.rad);
    return t > R + 8 - pad && lat > -4 - pad && lat < 14 + pad;
}
const shipLoc = { id: "ship", name: "PROJECT DOCK", color: 0xffb347, visited: true, ix: 0, iz: 0 };

const CONTENT = {
    profile: {
        tag: "01 · MY PROFILE", title: "About Me",
        html: `<p>Hi, I'm <b>Anuj Tiwari</b> — [one-line intro: who you are and what you build].</p>
               <p>[2–3 sentences about your background, what drives you and what you are looking for.]</p>
               <div class="chips"><span>AI &amp; Data Science</span><span>Cybersecurity</span><span>Web Development</span></div>
               <h4>FIND ME</h4>
               <a href="#">GitHub</a><a href="#">LinkedIn</a><a href="#">Email</a>`
    },
    skills: {
        tag: "02 · SKILL FOREST", title: "Technical Skills",
        html: bars([["Python", 90], ["JavaScript / Three.js", 75], ["Machine Learning", 80],
                    ["SQL & Data Analysis", 80], ["Linux & Networking", 70]])
            + `<h4>TOOLS</h4><div class="chips"><span>Git</span><span>Pandas</span><span>TensorFlow</span><span>Docker</span></div>`
    },
    projects: {
        tag: "03 · PROJECT HARBOR", title: "My Projects",
        html: carousel([
            ["Project One", "Python · Streamlit", "[What it does and the result you achieved.]"],
            ["Project Two", "JavaScript · Three.js", "[This open-world portfolio game.]"],
            ["Project Three", "Machine Learning", "[Short description + link to GitHub.]"]])
    },
    academy: {
        tag: "04 · LEARNING ACADEMY", title: "Education & Experience",
        html: `<h4>EDUCATION</h4>` + items([
                ["[Degree / Course]", "[University] · [Year – Year]", "[Highlights, CGPA, coursework.]"]])
            + `<h4>EXPERIENCE</h4>` + items([
                ["[Role]", "[Company / Internship] · [Dates]", "[What you did and learned.]"]])
    },
    ai: {
        tag: "05 · AI LABORATORY", title: "AI & Data Science",
        html: `<p>[What you explore in AI and data science.]</p><ul>
               <li>Machine learning &amp; deep learning models</li>
               <li>Data cleaning, analysis and visualisation</li>
               <li>Computer vision / NLP experiments</li></ul>
               <div class="chips"><span>Scikit-learn</span><span>PyTorch</span><span>OpenCV</span><span>Jupyter</span></div>`
    },
    cyber: {
        tag: "06 · CYBER CITY", title: "Cybersecurity",
        html: `<p>[Your interest and experience in security.]</p><ul>
               <li>Network security &amp; ethical hacking basics</li>
               <li>Vulnerability assessment and CTF practice</li>
               <li>Secure coding and threat awareness</li></ul>
               <div class="chips"><span>Kali Linux</span><span>Wireshark</span><span>Nmap</span><span>Burp Suite</span></div>`
    },
    contact: {
        tag: "07 · CONTACT HUB", title: "Contact Me",
        html: `<p>Let's build something together. Send a message or reach me here:</p>
               <div class="chips"><span>you@example.com</span><span>[City, Country]</span></div>
               <a href="mailto:you@example.com">Email</a><a href="#">LinkedIn</a><a href="#">GitHub</a><a href="#">Download Resume</a>
               <h4>QUICK MESSAGE</h4>
               <input id="cName" placeholder="Your name">
               <textarea id="cMsg" rows="4" placeholder="Your message"></textarea>
               <button id="sendBtn">SEND MESSAGE</button>`
    }
};

// =====================================================
//  CONSTANTS & LOCATIONS
// =====================================================
CONTENT.ship = {
    tag: "PROJECT DOCK", title: SHIP.name || "Project Dock",
    html: `<p>Every container on the dock is one of my projects. Watch the crane load them onto the next ship!</p>` +
        carousel(PROJECTS.map(p => [p.name, p.tech, p.link
            ? `<a class="btn" href="${p.link}" target="_blank" rel="noopener">🔗 Open project</a>`
            : `<small>Add the link in PROJECTS (lib/game.js)</small>`]))
};
const R = 64, ISLAND = 125, RING = 50;
const LOCS = [
    { id: "profile",  name: "MY PROFILE",       a: 0,   color: 0x35d9ff },
    { id: "skills",   name: "SKILL FOREST",     a: 60,  color: 0x3dff8a },
    { id: "projects", name: "PROJECT HARBOR",   a: 120, color: 0xffb347 },
    { id: "academy",  name: "LEARNING ACADEMY", a: 180, color: 0xf5d76e },
    { id: "ai",       name: "AI LABORATORY",    a: 240, color: 0xb388ff },
    { id: "cyber",    name: "CYBER CITY",       a: 300, color: 0xff3d7f },
    { id: "contact",  name: "CONTACT HUB",      a: 0,   color: 0xe0f0ff }
];
LOCS.forEach((l, i) => {
    l.a = i * 360 / LOCS.length;
    l.rad = l.a * Math.PI / 180;
    l.x = Math.sin(l.rad) * R;  l.z = -Math.cos(l.rad) * R;
    l.ix = Math.sin(l.rad) * RING; l.iz = -Math.cos(l.rad) * RING;   // interaction point on ring road
    l.visited = false;
});

// =====================================================
//  SCENE / CAMERA / RENDERER / LIGHT
// =====================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0xcfe3f2, 120, 330);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
{ const gc = document.getElementById("game-container"); gc.innerHTML = ""; gc.appendChild(renderer.domElement); }

scene.add(new THREE.HemisphereLight(0xcceeff, 0x426044, 2));
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 250 });
scene.add(sun, sun.target);

// =====================================================
//  HELPERS
// =====================================================
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const colliders = [];
const spinners = [];
const rings = [];
const sprites = [];

function box(p, w, h, d, c, x, y, z, o) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c, o));
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m;
}
function cyl(p, rt, rb, h, c, x, y, z, o) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), M(c, o));
    m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
}
function col(g, lx, lz, r) {
    const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
    colliders.push({ x: g.position.x + lx * c + lz * s, z: g.position.z - lx * s + lz * c, r });
}
const trunkG = new THREE.CylinderGeometry(0.45, 0.8, 4, 8);
const pineG = [new THREE.ConeGeometry(3.2, 4.5, 9), new THREE.ConeGeometry(2.5, 4, 9), new THREE.ConeGeometry(1.7, 3.5, 9)];
const blobG = new THREE.IcosahedronGeometry(1, 1);
const barkM = M(0x5b3d28, { roughness: 1 });
const greens = [0x2e7d32, 0x3a8f3a, 0x1f6a2f, 0x4c9a3c, 0x2a6b3a].map(c => M(c, { flatShading: true, roughness: 1 }));
const leafM = null;
const glowM = M(0x1fd36b, { emissive: 0x0a8a45, emissiveIntensity: 0.9, flatShading: true });
function tree(p, x, z, s, m) {
    const lm = m || greens[(Math.random() * greens.length) | 0];
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    g.rotation.set((Math.random() - 0.5) * 0.06, Math.random() * 6.28, (Math.random() - 0.5) * 0.06);
    const tr = new THREE.Mesh(trunkG, barkM); tr.position.y = 2; tr.castShadow = true; g.add(tr);
    if (Math.random() < 0.5) {
        [3.8, 6, 8.2].forEach((y, i) => { const c = new THREE.Mesh(pineG[i], lm); c.position.y = y; c.castShadow = true; g.add(c); });
    } else {
        for (let i = 0; i < 5; i++) {
            const b = new THREE.Mesh(blobG, lm), r = 2 + Math.random() * 1.3;
            b.scale.set(r, r * 0.85, r); b.position.set((Math.random() - 0.5) * 3, 5.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3);
            b.castShadow = true; g.add(b);
        }
    }
    p.add(g);
}
function label(text, color) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "rgba(5,15,25,.75)"; x.fillRect(0, 20, 512, 88);
    x.strokeStyle = "#" + color.toString(16).padStart(6, "0"); x.lineWidth = 4; x.strokeRect(2, 22, 508, 84);
    x.fillStyle = "#fff"; x.font = "bold 40px Arial"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(text, 256, 66);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
    s.scale.set(22, 5.5, 1); return s;
}

// =====================================================
//  WORLD: WATER, ISLAND, ROADS
// =====================================================
function makeWaterNormal() {
    const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
    const ctx = c.getContext("2d"), img = ctx.createImageData(S, S), T = Math.PI * 2, e = 1 / S;
    const h = (u, v) => Math.sin(u * T * 3 + Math.sin(v * T * 2) * 1.5) * 0.5 + Math.sin((u + v) * T * 5) * 0.3 + Math.sin((2 * u - v) * T * 7) * 0.2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const u = x / S, v = y / S, i = (y * S + x) * 4;
        const dx = (h(u + e, v) - h(u - e, v)) * 5, dy = (h(u, v + e) - h(u, v - e)) * 5, l = Math.hypot(dx, dy, 1);
        img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
        img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 70); return t;
}
const waterNormal = makeWaterNormal();
const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshPhysicalMaterial({
    color: 0x0b7ea3, roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.9,
    normalMap: waterNormal, normalScale: new THREE.Vector2(0.6, 0.6), clearcoat: 1, clearcoatRoughness: 0.1 }));
water.rotation.x = -Math.PI / 2; water.position.y = -0.8; scene.add(water);

// Animated water: put water.gif (or water.webm / water.mp4) in the /public folder
const wv = document.createElement("video");
wv.loop = true; wv.muted = true; wv.playsInline = true;
wv.innerHTML = '<source src="/water.webm" type="video/webm"><source src="/water.mp4" type="video/mp4">';
const harborTexs = [], harborWat = []; let waterMk = null;
const harborMat = () => { const m = water.material.clone(); m.normalMap = null; m.transparent = false; m.opacity = 1; m.side = THREE.DoubleSide; return m; };
const harborWater = (mesh, rx, ry) => harborWat.push({ mesh, rx, ry });
function applyHarborWater() {
    harborWat.forEach(h => {
        const t = waterMk(); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(h.rx, h.ry); t.colorSpace = THREE.SRGBColorSpace;
        h.mesh.material.map = t; h.mesh.material.color.set(0xdff3fb); h.mesh.material.needsUpdate = true; harborTexs.push(t);
    });
}
const useWaterMap = tex => {
    tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping; tex.repeat.set(40, 40); tex.colorSpace = THREE.SRGBColorSpace;
    water.material.map = tex; water.material.color.set(0xdff3fb); water.material.needsUpdate = true;
};
on(wv, "loadeddata", () => { useWaterMap(new THREE.VideoTexture(wv)); waterMk = () => new THREE.VideoTexture(wv); applyHarborWater(); wv.play().catch(() => {}); });
let gifAnim = null;
(async () => {
    try {
        const res = await fetch("/water.gif"); if (!res.ok) throw new Error("no gif");
        const gif = parseGIF(await res.arrayBuffer()), frames = decompressFrames(gif, true);
        const W = gif.lsd.width, H = gif.lsd.height;
        const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        const cx = cv.getContext("2d"), tmp = document.createElement("canvas"), tx = tmp.getContext("2d");
        const tex = new THREE.CanvasTexture(cv); useWaterMap(tex); waterMk = () => new THREE.CanvasTexture(cv);
        const draw = i => {
            const f = frames[i];
            if (i === 0) cx.clearRect(0, 0, W, H);
            else { const pf = frames[i - 1]; if (pf.disposalType === 2) cx.clearRect(pf.dims.left, pf.dims.top, pf.dims.width, pf.dims.height); }
            tmp.width = f.dims.width; tmp.height = f.dims.height;
            tx.putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
            cx.drawImage(tmp, f.dims.left, f.dims.top); tex.needsUpdate = true; harborTexs.forEach(t => { t.needsUpdate = true; });
        };
        draw(0); gifAnim = { frames, draw, i: 0, t: 0 }; applyHarborWater();
    } catch (e) { wv.load(); }
})();

const sand = new THREE.Mesh(new THREE.CylinderGeometry(132, 138, 3, 64), M(0xe3cf8f));
sand.position.y = -1.6; sand.receiveShadow = true; scene.add(sand);

function grassTex() {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const x = c.getContext("2d"); x.fillStyle = "#3f8a3c"; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2500; i++) {
        x.fillStyle = `hsla(${95 + Math.random() * 30},${40 + Math.random() * 20}%,${24 + Math.random() * 18}%,.35)`;
        x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 12, 0, 7); x.fill();
    }
    for (let i = 0; i < 4000; i++) {
        x.strokeStyle = `hsla(${90 + Math.random() * 40},50%,${20 + Math.random() * 30}%,.5)`;
        const a = Math.random() * 512, b = Math.random() * 512;
        x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.random() * 3 - 1.5, b - 4 - Math.random() * 5); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(18, 18);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const island = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND, ISLAND + 3, 3, 64), M(0xffffff, { roughness: 1, map: grassTex() }));
island.position.y = -1.5; island.receiveShadow = true; scene.add(island);

function roadTex() {
    const W = 128, H = 256, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#3a3d42"; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) {                      // asphalt grain
        const v = 40 + Math.random() * 50 | 0;
        x.fillStyle = `rgba(${v},${v},${v + 4},.55)`; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(30, 0, 16, H); x.fillRect(82, 0, 16, H);   // tyre wear
    x.strokeStyle = "rgba(15,15,15,.6)"; x.lineWidth = 1;
    for (let i = 0; i < 6; i++) {                          // cracks
        let px = 15 + Math.random() * (W - 30), py = Math.random() * H; x.beginPath(); x.moveTo(px, py);
        for (let j = 0; j < 6; j++) { px += Math.random() * 14 - 7; py += Math.random() * 14; x.lineTo(px, py); } x.stroke();
    }
    x.fillStyle = "#9a9a96"; x.fillRect(0, 0, 6, H); x.fillRect(W - 6, 0, 6, H);           // curbs
    x.fillStyle = "#e8e8e0"; x.fillRect(10, 0, 3, H); x.fillRect(W - 13, 0, 3, H);          // edge lines
    x.fillStyle = "#f2c230"; x.fillRect(W / 2 - 2, 10, 4, 100); x.fillRect(W / 2 - 2, 138, 4, 100); // centre dashes
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function ringRoad(r0, r1, seg, K) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
        const a = i / seg * Math.PI * 2, sn = Math.sin(a), cs = Math.cos(a);
        pos.push(sn * r0, 0, cs * r0, sn * r1, 0, cs * r1); uv.push(0, i / seg * K, 1, i / seg * K);
    }
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const roadM = M(0xffffff, { roughness: 0.85, map: roadTex() });
roadM.map.repeat.set(1, (R - 6) / 12);
const ring = new THREE.Mesh(ringRoad(RING - 3, RING + 3, 160, 2 * Math.PI * RING / 12),
    M(0xffffff, { roughness: 0.85, map: roadTex(), side: THREE.DoubleSide }));
ring.position.y = 0.04; ring.receiveShadow = true; scene.add(ring);
LOCS.forEach(l => {
    const road = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, R - 6), roadM);
    road.position.set(Math.sin(l.rad) * (R - 6) / 2 + Math.sin(l.rad) * 3, 0.05, -Math.cos(l.rad) * (R - 6) / 2 - Math.cos(l.rad) * 3);
    road.rotation.y = Math.PI - l.rad; road.receiveShadow = true; scene.add(road);
});

// Central hub (spawn)
const hub = cyl(scene, 4.5, 4.5, 0.3, 0x0b2538, 0, 0.15, 0, { emissive: 0x087aab, emissiveIntensity: 0.6 });
cyl(scene, 0.5, 0.5, 18, 0x35d9ff, 0, 9, 0, { emissive: 0x35d9ff, emissiveIntensity: 1.5 });
[[2.4, "x", 1.2], [3.4, "y", -0.9]].forEach(([r, p, s], i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0x35d9ff }));
    t.position.y = 12 + i * 2; if (p === "y") t.rotation.x = Math.PI / 2.5;
    scene.add(t); spinners.push({ m: t, p: p === "x" ? "y" : "z", s });
});
colliders.push({ x: 0, z: 0, r: 1.2 });

// Futuristic energy pylons between locations
for (let k = 0; k < 7; k++) {
    const a = (k + 0.5) * 2 * Math.PI / 7, x = Math.sin(a) * 60, z = -Math.cos(a) * 60;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    cyl(g, 0.5, 1, 20, 0x1d2a3a, 0, 10, 0);
    cyl(g, 0.6, 0.6, 3, 0x35d9ff, 0, 21, 0, { emissive: 0x35d9ff, emissiveIntensity: 2 });
    const t = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.1, 8, 32), new THREE.MeshBasicMaterial({ color: 0x35d9ff }));
    t.position.y = 16; t.rotation.x = Math.PI / 2; g.add(t); spinners.push({ m: t, p: "z", s: 1.5 });
    colliders.push({ x, z, r: 1.4 });
}

// Mountains
for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3, d = 98 + Math.random() * 8;
    const HA = Math.atan2(Math.sin(LOCS[2].rad), -Math.cos(LOCS[2].rad));
    if (Math.abs(Math.atan2(Math.sin(a - HA), Math.cos(a - HA))) < 0.5) continue;
    const s = 14 + Math.random() * 10, x = Math.sin(a) * d, z = Math.cos(a) * d;
    const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.5, 7), M(0x687783, { flatShading: true }));
    m.position.set(x, s * 0.75, z); m.castShadow = true; scene.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(s * 0.3, s * 0.45, 7), M(0xffffff, { flatShading: true }));
    cap.position.set(x, s * 1.5 - s * 0.225, z); scene.add(cap);
    colliders.push({ x, z, r: s * 0.75 });
}

// Scattered trees
for (let i = 0, n = 0; i < 900 && n < 190; i++) {
    const a = Math.random() * Math.PI * 2, d = 12 + Math.random() * 82;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (Math.abs(d - RING) < 7) continue;
    if (LOCS.some(l => Math.hypot(x - l.x, z - l.z) < 24)) continue;
    if (LOCS.some(l => {
        const dx = Math.sin(l.rad), dz = -Math.cos(l.rad), t = x * dx + z * dz;
        return t > 0 && Math.abs(x * dz - z * dx) < 7;
    })) continue;
    if (d < 14) continue;
    if (inHarborChannel(x, z, 3)) continue;
    tree(scene, x, z, 0.7 + Math.random() * 0.6); colliders.push({ x, z, r: 1.1 }); n++;
}

// =====================================================
//  LOCATION BUILDINGS
// =====================================================
// =====================================================
//  NATURE: sky, clouds, grass, flowers, rocks, shore foam
// =====================================================
const sky = new THREE.Mesh(new THREE.SphereGeometry(550, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "varying vec3 p;void main(){float h=normalize(p).y;vec3 c=mix(vec3(.81,.89,.95),vec3(.22,.52,.9),pow(max(h,0.),.55));gl_FragColor=vec4(c,1.);}"
}));
sky.renderOrder = -1; scene.add(sky);

const foam = new THREE.Mesh(new THREE.RingGeometry(133, 141, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
foam.rotation.x = -Math.PI / 2; foam.position.y = -0.75; scene.add(foam);

const clouds = [], cloudG = new THREE.IcosahedronGeometry(1, 1);
const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92, flatShading: true });
for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 5; j++) {
        const b = new THREE.Mesh(cloudG, cloudM);
        b.scale.set(6 + Math.random() * 6, 3 + Math.random() * 2, 4 + Math.random() * 3);
        b.position.set((j - 2) * 7 + Math.random() * 3, Math.random() * 2, Math.random() * 3); c.add(b);
    }
    c.position.set(Math.random() * 500 - 250, 75 + Math.random() * 30, Math.random() * 500 - 250);
    scene.add(c); clouds.push(c);
}
function animateNature(dt, t) {
    waterNormal.offset.x += dt * 0.012; waterNormal.offset.y += dt * 0.007;
    foam.material.opacity = 0.3 + Math.sin(t * 1.5) * 0.1;
    clouds.forEach(c => { c.position.x += dt * 2; if (c.position.x > 280) c.position.x = -280; });
    if (gifAnim) {
        gifAnim.t += dt * 1000;
        const d = Math.max(40, gifAnim.frames[gifAnim.i].delay || 80);
        if (gifAnim.t >= d) { gifAnim.t -= d; gifAnim.i = (gifAnim.i + 1) % gifAnim.frames.length; gifAnim.draw(gifAnim.i); }
    }
    updateShips(dt, t);
}
function freeSpot(x, z, r) {
    return !(r < 6 || inHarborChannel(x, z, 2) || Math.abs(r - RING) < 5 || LOCS.some(l => Math.hypot(x - l.x, z - l.z) < 17) ||
        LOCS.some(l => { const dx = Math.sin(l.rad), dz = -Math.cos(l.rad), t = x * dx + z * dz; return t > 0 && Math.abs(x * dz - z * dx) < 4.5; }));
}
(function scatterDetails() {
    const d = new THREE.Object3D(), col = new THREE.Color();
    const bladeG = new THREE.ConeGeometry(0.13, 0.8, 3); bladeG.translate(0, 0.4, 0);
    const blades = new THREE.InstancedMesh(bladeG, M(0xffffff, { roughness: 1 }), 9000);
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 6, 6), M(0xffffff, { roughness: 0.8 }), 400);
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M(0x7d8790, { flatShading: true, roughness: 1 }), 45);
    const pal = [0xffffff, 0xffe066, 0xff8fb8, 0xb48cff];
    let nb = 0, nf = 0, nr = 0;
    for (let i = 0; i < 30000 && (nb < 9000 || nf < 400 || nr < 45); i++) {
        const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (ISLAND - 4), x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (!freeSpot(x, z, r)) continue;
        const k = Math.random();
        if (k < 0.04 && nr < 45) {
            d.position.set(x, 0.2, z); d.rotation.set(Math.random(), Math.random() * 6, Math.random());
            const s = 0.5 + Math.random() * 1.4; d.scale.set(s, s * 0.7, s); d.updateMatrix(); rocks.setMatrixAt(nr++, d.matrix);
        } else if (k < 0.1 && nf < 400) {
            d.position.set(x, 0.35, z); d.rotation.set(0, 0, 0); d.scale.setScalar(0.8 + Math.random() * 0.6); d.updateMatrix();
            fl.setMatrixAt(nf, d.matrix); fl.setColorAt(nf++, col.setHex(pal[(Math.random() * 4) | 0]));
        } else if (nb < 8997) {
            for (let j = 0; j < 3; j++) {
                d.position.set(x + (Math.random() - 0.5) * 0.6, 0, z + (Math.random() - 0.5) * 0.6);
                d.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6.28, (Math.random() - 0.5) * 0.5);
                const s = 0.6 + Math.random() * 1.1; d.scale.set(s, s * (0.7 + Math.random() * 0.9), s); d.updateMatrix();
                blades.setMatrixAt(nb, d.matrix); blades.setColorAt(nb++, col.setHSL(0.24 + Math.random() * 0.08, 0.5 + Math.random() * 0.2, 0.25 + Math.random() * 0.2));
            }
        }
    }
    blades.count = nb; fl.count = nf; rocks.count = nr; rocks.castShadow = true;
    scene.add(blades, fl, rocks);
})();

// =====================================================
//  DIRECTION BOARD (signpost at the hub) + GUIDE ARROW
// =====================================================
(function signpost() {
    const g = new THREE.Group(); g.position.set(6, 0, -4); scene.add(g);
    cyl(g, 0.25, 0.3, 10, 0x5b3d28, 0, 5, 0);
    cyl(g, 0.5, 0.5, 0.6, 0xe0f0ff, 0, 10.3, 0, { emissive: 0x35d9ff, emissiveIntensity: 1.5 });
    LOCS.forEach((l, i) => {
        const c = document.createElement("canvas"); c.width = 256; c.height = 48;
        const x = c.getContext("2d"); x.fillStyle = "#c9a26b"; x.fillRect(0, 0, 256, 48);
        x.fillStyle = "#2b1a0c"; x.font = "bold 22px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(l.name, 128, 26);
        const pivot = new THREE.Group(); pivot.position.y = 9.2 - i * 1.25; pivot.rotation.y = Math.PI / 2 - l.rad; g.add(pivot);
        const plank = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 0.2), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.9 }));
        plank.position.x = 3.6; plank.castShadow = true; pivot.add(plank);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1, 4), M(l.color, { emissive: l.color, emissiveIntensity: 0.6 }));
        tip.rotation.z = -Math.PI / 2; tip.position.x = 7.4; tip.scale.z = 0.3; pivot.add(tip);
    });
    colliders.push({ x: 6, z: -4, r: 0.6 });
})();

// =====================================================
//  SHIPS sailing around the island
// =====================================================
function hullGeo(L, W, H) {
    const sh = new THREE.Shape();
    sh.moveTo(-W, -L * 0.38); sh.lineTo(W, -L * 0.38); sh.lineTo(W * 1.1, L * 0.2);
    sh.quadraticCurveTo(W * 0.9, L * 0.45, 0, L * 0.62);
    sh.quadraticCurveTo(-W * 0.9, L * 0.45, -W * 1.1, L * 0.2); sh.lineTo(-W, -L * 0.38);
    const g = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g;
}
function makeProjectBox(p, ci) {
    const cols = [0xc0392b, 0x2980b9, 0xe67e22, 0x27ae60, 0xf1c40f, 0x8e44ad], col = cols[ci % cols.length];
    const cv = document.createElement("canvas"); cv.width = 640; cv.height = 280;
    const x = cv.getContext("2d");
    x.fillStyle = "#" + col.toString(16).padStart(6, "0"); x.fillRect(0, 0, 640, 280);
    x.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 640; i += 40) x.fillRect(i, 0, 14, 280);
    x.fillStyle = "rgba(255,255,255,.92)"; x.fillRect(40, 70, 560, 140);
    let fs = 56; x.font = `bold ${fs}px Arial`;
    while (x.measureText(p.name).width > 520 && fs > 24) { fs -= 2; x.font = `bold ${fs}px Arial`; }
    x.fillStyle = "#0b1c2c"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(p.name, 320, 118);
    x.font = "26px Arial"; x.fillStyle = "#44525e"; x.fillText(p.tech || "", 320, 168);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.2 }), plain = M(col, { roughness: 0.6, metalness: 0.2 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 5), [side, side, plain, plain, plain, plain]);
    m.castShadow = true; return m;
}
function disposeBox(c) {
    if (c.parent) c.parent.remove(c);
    c.geometry.dispose(); c.material[0].map.dispose(); c.material[0].dispose(); c.material[2].dispose();
}
function refillYard() {
    const h = harbor; h.yard = [];
    for (let k = 0; k < 4; k++) {
        const p = PROJECTS[h.pi % PROJECTS.length], c = makeProjectBox(p, h.pi); h.pi++;
        c.position.set(0, PIER_Y + 1.1 + (1 - (k & 1)) * 2.3, [10.4, 5.2][k >> 1]);   // top containers are picked first
        h.g.add(c); h.yard.push(c);
    }
}
const SLOTS = [[5.6, -1.55], [8.4, -1.55], [5.6, -6.6], [8.4, -6.6]];   // free deck spots, harbor coordinates
function planLoad() {
    const st = [], hi = 9.8, shipTop = -0.54 + 3.625 + 1.1;
    for (let k = 0; k < 4; k++) {
        const c = harbor.yard[k], yz = c.position.z, yx = c.position.x, pick = c.position.y + 1.23;
        const sx = SLOTS[k][0], sz = SLOTS[k][1], drop = shipTop + 1.23;
        st.push({ t: [yz, yx, hi] }, { t: [yz, yx, pick] }, { act: "attach", k }, { t: [yz, yx, hi] },
                { t: [sz, sx, hi] }, { t: [sz, sx, drop] }, { act: "detach", k }, { t: [sz, sx, hi] });
    }
    st.push({ t: [6, 0, hi] });
    return st;
}
const stepTo = (cur, tgt, sp, dt) => { const d = tgt - cur; return Math.abs(d) <= sp * dt ? tgt : cur + Math.sign(d) * sp * dt; };
function harborHorn() {
    const wp = harbor.ship.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(wp.x - player.position.x, wp.z - player.position.z) < 160) { tone(98, 1.4, "sawtooth", 0.07); tone(124, 1.4, "sawtooth", 0.05); }
}
function updateHarbor(dt, t) {
    const h = harbor, ship = h.ship;
    if (!ship) return;
    h.t += dt;
    const wl = z => { const a = -z; return a <= 64 ? 0.06 : a >= 76 ? -0.8 : 0.06 - 0.86 * (a - 64) / 12; };
    let calm = false;
    switch (h.state) {
        case "approach": {
            if (!h.horn && h.z > -170) { h.horn = true; harborHorn(); }
            h.z += Math.min(9, Math.max(1.2, (-5 - h.z) * 0.22)) * dt;
            if (h.z >= -5) { h.z = -5; h.state = "load"; h.steps = planLoad(); h.si = 0; }
            break;
        }
        case "load": {
            calm = true;
            const s = h.steps[h.si];
            if (!s) { h.state = "wait"; h.t = 0; break; }
            if (s.act) {
                const c = h.yard[s.k];
                if (s.act === "attach") { h.hook.add(c); c.position.set(0, -1.23, 0); }
                else { ship.add(c); c.position.set(7 - SLOTS[s.k][0], 3.625 + 1.1, -5 - SLOTS[s.k][1]); h.loaded.push(c); }
                tone(160, 0.12, "square", 0.05); h.si++;
            } else {
                h.cz = stepTo(h.cz, s.t[0], 5, dt); h.tx = stepTo(h.tx, s.t[1], 6, dt); h.hy = stepTo(h.hy, s.t[2], 4.5, dt);
                if (h.cz === s.t[0] && h.tx === s.t[1] && h.hy === s.t[2]) h.si++;
            }
            break;
        }
        case "wait": calm = true; if (h.t > 2) { h.state = "depart"; h.t = 0; harborHorn(); } break;
        case "depart": h.z -= Math.min(4.5, 0.8 + 0.6 * h.t) * dt; if (h.z < -95) { h.state = "turn"; h.t = 0; } break;
        case "turn": {
            const k = Math.min(1, h.t / 6); h.rot = Math.PI * (1 - k * k * (3 - 2 * k)); h.z -= 1.2 * dt;
            if (k >= 1) { h.state = "leave"; h.t = 0; }
            break;
        }
        case "leave":
            h.z -= Math.min(9, 1.5 + h.t) * dt;
            if (h.z < -250) { h.state = "gone"; h.t = 0; h.loaded.forEach(disposeBox); h.loaded = []; ship.visible = false; }
            break;
        case "gone":
            if (h.t > 5) {
                const hulls = [0x16324f, 0x1b4332, 0x5a1a1a, 0x3a2a5a, 0x2a4a6a], funs = [0xc0392b, 0xe67e22, 0x2980b9];
                h.hullM.color.setHex(hulls[(Math.random() * hulls.length) | 0]); h.funnelM.color.setHex(funs[(Math.random() * funs.length) | 0]);
                refillYard(); h.z = -236; h.rot = Math.PI; h.horn = false; ship.visible = true; h.state = "approach"; h.t = 0;
            }
            break;
    }
    ship.position.set(7, wl(h.z) - 0.6 + (calm ? Math.sin(t * 1.5) * 0.015 : Math.sin(t * 1.2) * 0.1), h.z);
    ship.rotation.set(calm ? 0 : Math.sin(t * 1.1) * 0.015, h.rot, calm ? 0 : Math.sin(t * 0.9) * 0.03);
    // crane
    h.crane.position.z = h.cz; h.trolley.position.x = h.tx;
    const hl = h.hy - PIER_Y, len = Math.max(0.2, 10.9 - hl);
    h.hook.position.set(h.tx, hl, 0); h.cable.scale.y = len; h.cable.position.set(h.tx, hl + len / 2, 0);
}
function buildHarborShip(g, c) {
    const W = 3, L = 20, H = 3.4;
    // ---- channel to the open sea ----
    const ch = new THREE.Mesh(new THREE.PlaneGeometry(16, 50), harborMat()); harborWater(ch, 0.53, 1.67);
    ch.rotation.x = -Math.PI / 2; ch.position.set(5, 0.07, -39); g.add(ch);
    const piv = new THREE.Group(); piv.position.set(5, -0.365, -70); piv.rotation.x = -0.0724; g.add(piv);
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(16, 12.1), harborMat()); harborWater(sl, 0.53, 0.4); sl.rotation.x = -Math.PI / 2; piv.add(sl);
    [-3.2, 13.2].forEach(x => box(g, 0.6, 0.4, 50, 0x8d949b, x, 0.2, -39));
    // ---- ship (arrives empty, leaves loaded) ----
    const ship = new THREE.Group(); g.add(ship);
    const hullM = M(0x16324f, { roughness: 0.5, metalness: 0.2 }), funnelM = M(0xc0392b);
    const hull = new THREE.Mesh(hullGeo(L, W, H), hullM); hull.castShadow = true; ship.add(hull);
    ship.add(new THREE.Mesh(hullGeo(L, W * 1.012, 0.7), M(0xb02a2a)));
    const trim = new THREE.Mesh(hullGeo(L, W * 1.012, 0.25), M(0xeeeeee)); trim.position.y = H - 0.25; ship.add(trim);
    box(ship, 5.6, 0.25, 13.4, 0x8d949b, 0, H + 0.1, 0.7);
    box(ship, 5.2, 5, 2.6, 0xf2f2f2, 0, H + 2.6, 5.7);
    box(ship, 5.3, 0.9, 2.7, 0x1b2a38, 0, H + 4.1, 5.7);
    box(ship, 5.5, 0.2, 2.9, 0xcfd4d9, 0, H + 5.2, 5.7);
    const fun = cyl(ship, 0.8, 1, 3, 0xc0392b, 0, H + 6.8, 6.4); fun.material = funnelM;
    cyl(ship, 0.85, 1.05, 0.5, 0xffffff, 0, H + 7.1, 6.4);
    cyl(ship, 0.1, 0.1, 3, 0x777777, 0, H + 6.8, 5.2);
    const radar = box(ship, 2, 0.15, 0.4, 0x777777, 0, H + 8.4, 5.2); spinners.push({ m: radar, p: "y", s: 3 });
    [-1, 1].forEach(sd => box(ship, 0.8, 0.8, 2.4, 0xe67e22, sd * 2.9, H + 2, 5.7));
    cyl(ship, 0.08, 0.08, 2.5, 0x777777, 0, H + 1.4, -9); box(ship, 0.05, 0.6, 1, 0xc0392b, 0, H + 2.4, -9.5);
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 96;
    const x = cv.getContext("2d");
    x.fillStyle = "#0b1c2c"; x.fillRect(0, 0, 512, 96); x.strokeStyle = "#f0d58a"; x.lineWidth = 5; x.strokeRect(4, 4, 504, 88);
    x.fillStyle = SHIP.name ? "#ffffff" : "#8fb3c9"; x.font = "bold 46px Arial"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText((SHIP.name || "[ SHIP NAME ]").toUpperCase(), 256, 50);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    [-1, 1].forEach(sd => {
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ map: tex }));
        pl.position.set(sd * (W * 1.1 + 0.03), 1.9, 0); pl.rotation.y = sd * Math.PI / 2; ship.add(pl);
    });
    // ---- gantry crane on the pier ----
    const crane = new THREE.Group(); crane.position.set(0, PIER_Y, 6); g.add(crane);
    [-2.3, 2.3].forEach(cx => box(crane, 0.5, 11, 2.4, 0xe8b923, cx, 5.5, 0));
    box(crane, 12.8, 0.9, 1.4, 0xe8b923, 4.1, 11.5, 0);
    box(crane, 1.6, 1.4, 1.6, 0xf2f2f2, 0.6, 10.1, 1.2);
    const trolley = box(crane, 1.2, 0.5, 1, 0x333333, 0, 10.9, 0);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), M(0x222222)); crane.add(cable);
    const hook = new THREE.Group(); crane.add(hook); box(hook, 2.2, 0.25, 0.9, 0x333333, 0, 0, 0);
    Object.assign(harbor, { g, ship, crane, trolley, cable, hook, hullM, funnelM });
    refillYard();
    // ---- entrance sign + interaction ring on the pier ----
    cyl(g, 0.12, 0.12, 3.2, 0x5b3d28, -1.6, 1.95, 13.4);
    const sc = document.createElement("canvas"); sc.width = 384; sc.height = 160; const sx = sc.getContext("2d");
    sx.fillStyle = "#0b1c2c"; sx.fillRect(0, 0, 384, 160); sx.strokeStyle = "#ffb347"; sx.lineWidth = 6; sx.strokeRect(4, 4, 376, 152);
    sx.textAlign = "center"; sx.fillStyle = "#ffb347"; sx.font = "bold 40px Arial"; sx.fillText("PROJECT DOCK", 192, 62);
    sx.fillStyle = "#fff"; sx.font = "26px Arial"; sx.fillText("Press E - view my projects", 192, 112);
    const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.5), new THREE.MeshBasicMaterial({ map: stex, side: THREE.DoubleSide }));
    sign.position.set(-1.6, 3.9, 13.4); g.add(sign);
    const cs = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y);
    shipLoc.ix = g.position.x + 0 * cs + -5 * sn; shipLoc.iz = g.position.z - 0 * sn + -5 * cs;
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.15, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
    rg.rotation.x = Math.PI / 2; rg.position.set(0, PIER_Y + 0.1, -5); g.add(rg); rings.push(rg);
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 14, 12), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.3, depthWrite: false }));
    bm.position.set(0, 7.5, -5); g.add(bm);
}
function buildCargo() {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(hullGeo(24, 3.5, 3.2), M(0x8b2e2e, { roughness: 0.6 })); hull.castShadow = true; g.add(hull);
    box(g, 6.4, 0.25, 12.5, 0x9aa0a6, 0, 3.3, 2.25);
    const cc = [0xc0392b, 0x2980b9, 0xe67e22, 0x27ae60, 0xf1c40f];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) for (let l = 0; l < 1 + ((Math.random() * 2) | 0); l++)
        box(g, 3, 2.3, 2.8, cc[(Math.random() * 5) | 0], c ? 1.6 : -1.6, 4.6 + l * 2.3, -2 + r * 3.2);
    box(g, 5.6, 4.5, 2.4, 0xf2f2f2, 0, 5.6, 7.4);
    box(g, 5.7, 0.9, 2.5, 0x1b2a38, 0, 6.6, 7.4);
    cyl(g, 0.9, 1.1, 3, 0xc0392b, 0, 9.3, 7.4);
    return g;
}
function buildSail() {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(hullGeo(18, 2.6, 3), M(0x6b4a2b, { roughness: 0.9 })); hull.castShadow = true; g.add(hull);
    box(g, 4.8, 0.25, 11, 0xb68a55, 0, 3.1, 1.5);
    box(g, 4, 2.4, 3, 0x8a6236, 0, 4.4, 5.4);
    const sailM = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 1, side: THREE.DoubleSide });
    [-3, 2.5].forEach(z => {
        cyl(g, 0.2, 0.25, 15, 0x4a3320, 0, 10.5, z);
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(5, 8), sailM);
        sail.rotation.y = Math.PI / 2; sail.position.set(0.2, 9.5, z + 0.3); sail.castShadow = true; g.add(sail);
    });
    box(g, 0.1, 1, 1.6, 0xc0392b, 0, 18.3, -3);
    return g;
}
const ships = [
    { m: buildCargo(), R: 178, speed: 3.2, a: 0.6, dir: 1 },
    { m: buildSail(), R: 156, speed: 2.4, a: 3.8, dir: -1 }
];
ships.forEach(sh => {
    sh.outer = new THREE.Group(); sh.inner = new THREE.Group();
    sh.inner.add(sh.m); sh.outer.add(sh.inner); scene.add(sh.outer);
});
let lastHorn = -99;
const HARBOR_PSI = Math.atan2(-Math.cos(LOCS[2].rad), Math.sin(LOCS[2].rad));
const harborBusy = () => ["approach", "depart", "turn", "leave"].includes(harbor.state);
function updateShips(dt, t) {
    updateHarbor(dt, t);
    ships.forEach((sh, i) => {
        const da = Math.atan2(Math.sin(sh.a - HARBOR_PSI), Math.cos(sh.a - HARBOR_PSI));
        if (!(harborBusy() && Math.abs(da) < 0.3 && da * sh.dir < 0)) sh.a += sh.dir * dt * sh.speed / sh.R;   // give way to harbor ships
        sh.outer.position.set(Math.cos(sh.a) * sh.R, 0, Math.sin(sh.a) * sh.R);
        const tx = -Math.sin(sh.a) * sh.dir, tz = Math.cos(sh.a) * sh.dir;
        sh.outer.rotation.y = Math.atan2(-tx, -tz);
        sh.inner.position.y = -1.4 + Math.sin(t * 1.2 + i * 2) * 0.18;
        sh.inner.rotation.z = Math.sin(t * 0.9 + i) * 0.035; sh.inner.rotation.x = Math.sin(t * 1.1 + i * 3) * 0.02;
    });
    const p = player.position;
    if (t - lastHorn > 30 && ships.some(sh => Math.hypot(sh.outer.position.x - p.x, sh.outer.position.z - p.z) < 60)) {
        lastHorn = t; tone(98, 1.4, "sawtooth", 0.07); tone(124, 1.4, "sawtooth", 0.05);
    }
}

const guide = new THREE.Group();
{
    const gm = new THREE.MeshBasicMaterial({ color: 0x35d9ff });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 8), gm); shaft.rotation.x = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 8), gm); head.rotation.x = Math.PI / 2; head.position.z = 1.3;
    guide.add(shaft, head); guide.visible = false; scene.add(guide);
}
let mode = "free";
function setMode(m) {
    mode = m; guide.visible = false; if (m === "tour") resetNpc(); else window.speechSynthesis?.cancel(); sfx.click();
    document.querySelector(".mission span").textContent = m === "tour" ? "GUIDED TOUR" : "FREE PLAY";
    toast(m === "tour" ? "🧭 GUIDED TOUR — follow your guide" : "🎮 FREE PLAY — explore anywhere");
}

const builders = {
    profile(g, c) {
        box(g, 14, 8, 11, 0x1677a8, 0, 4, 0);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), M(0x182c42));
        roof.position.y = 10.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
        box(g, 2.4, 4, 0.3, c, 0, 2, 5.6, { emissive: c, emissiveIntensity: 1 });
        [-4.5, 4.5].forEach(x => box(g, 2, 2, 0.3, 0xaee9ff, x, 4.5, 5.6, { emissive: 0x35d9ff, emissiveIntensity: 1 }));
        col(g, 0, 0, 9);
    },
    skills(g) {
        cyl(g, 2.5, 3, 1.2, 0x3b4a3b, 0, 0.6, 0);
        cyl(g, 0.8, 0.8, 5, 0x3dff8a, 0, 3.7, 0, { emissive: 0x3dff8a, emissiveIntensity: 1.5 });
        col(g, 0, 0, 3.2);
        for (let i = 0; i < 40; i++) {
            const a = Math.random() * 6.283, d = 5 + Math.random() * 14;
            const x = Math.sin(a) * d, z = Math.cos(a) * d;
            if (z > 6 && Math.abs(x) < 8) continue;
            tree(g, x, z, 0.9 + Math.random() * 0.8, i % 3 ? leafM : glowM);
            col(g, x, z, 1.2);
        }
    },
    projects(g, c) {
        const pond = new THREE.Mesh(new THREE.CircleGeometry(16, 32), harborMat()); harborWater(pond, 1.07, 1.07);
        pond.rotation.x = -Math.PI / 2; pond.position.set(0, 0.06, -4); g.add(pond);
        box(g, 5, 0.3, 24, 0x8a5a33, 0, 0.2, 2);
        const ramp = box(g, 5, 0.12, 3.05, 0x8a5a33, 0, 0.18, 15.5); ramp.rotation.x = 0.116;
        buildHarborShip(g, c);
        [[-4, 13], [4, 13], [-4.5, 15.5]].forEach(([x, z]) => { box(g, 2.4, 2.4, 2.4, 0x9c6b3a, x, 1.2, z); col(g, x, z, 1.8); });
    },
    academy(g, c) {
        box(g, 18, 1, 12, 0xdddddd, 0, 0.5, 0);
        box(g, 16, 8, 9, 0xf5e9c8, 0, 5, -1.5);
        for (let x = -7; x <= 7; x += 2.8) cyl(g, 0.6, 0.6, 8, 0xffffff, x, 5, 4.5);
        box(g, 17, 1, 3.4, 0xdddddd, 0, 9.5, 4);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(c, { metalness: 0.5 }));
        dome.position.set(0, 9, -1.5); dome.castShadow = true; g.add(dome);
        box(g, 2.4, 4, 0.3, 0x6b4a1f, 0, 3, 3);
        col(g, 0, 0, 9.5);
    },
    ai(g, c) {
        cyl(g, 8.4, 8.4, 1.2, 0x222a3a, 0, 0.6, 0);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            M(0xe8f0ff, { transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.3 }));
        dome.position.y = 1.2; g.add(dome);
        const core = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 24), M(c, { emissive: c, emissiveIntensity: 2 }));
        core.position.y = 5; g.add(core);
        [[5, "x", 0], [4, "y", Math.PI / 2], [6, "z", 0.8]].forEach(([r, p, ry], i) => {
            const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.15, 8, 48), new THREE.MeshBasicMaterial({ color: c }));
            t.position.y = 5; t.rotation.y = ry; g.add(t); spinners.push({ m: t, p, s: 1 + i * 0.5 });
        });
        box(g, 2.6, 4, 0.3, c, 0, 2.2, 8, { emissive: c, emissiveIntensity: 1 });
        col(g, 0, 0, 9);
    },
    contact(g, c) {
        box(g, 12, 6, 9, 0x1b2f44, 0, 3, 0);
        box(g, 2.4, 3.5, 0.3, c, 0, 1.8, 4.6, { emissive: c, emissiveIntensity: 1 });
        cyl(g, 0.4, 0.9, 24, 0x2a3a4d, -4, 12, -1);
        cyl(g, 0.5, 0.5, 1.5, c, -4, 25, -1, { emissive: c, emissiveIntensity: 2 });
        cyl(g, 0.4, 0.4, 4, 0x555555, 4, 8, -1);
        const dish = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
            M(0xdddddd, { side: THREE.DoubleSide }));
        dish.position.set(4, 10, -1); dish.rotation.x = 1; dish.castShadow = true; g.add(dish);
        const t = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.1, 8, 40), new THREE.MeshBasicMaterial({ color: c }));
        t.position.set(-4, 18, -1); t.rotation.x = Math.PI / 2; g.add(t); spinners.push({ m: t, p: "z", s: 1.5 });
        col(g, 0, 0, 7.5); col(g, -4, -1, 1.5);
    },
    cyber(g, c) {
        [[-9, -6, 6, 26], [0, -9, 7, 34], [9, -5, 6, 22], [-7, 3, 5, 16], [7, 4, 5, 18]].forEach(([x, z, w, h]) => {
            box(g, w, h, w, 0x14182b, x, h / 2, z, { roughness: 0.3, metalness: 0.5 });
            for (let y = 4; y < h; y += 5) box(g, w + 0.2, 0.4, w + 0.2, c, x, y, z, { emissive: c, emissiveIntensity: 1.6 });
            col(g, x, z, w * 0.75);
        });
    }
};

LOCS.forEach(l => {
    const g = new THREE.Group();
    g.position.set(l.x, 0, l.z); g.rotation.y = -l.rad; scene.add(g);
    builders[l.id](g, l.color);

    // Beacon at interaction point
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 12),
        new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: 0.25, depthWrite: false }));
    beam.position.set(l.ix, 30, l.iz); scene.add(beam); l.beam = beam;
    const rg = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 8, 40), new THREE.MeshBasicMaterial({ color: l.color }));
    rg.rotation.x = Math.PI / 2; rg.position.set(l.ix, 0.3, l.iz); scene.add(rg); rings.push(rg);
    const s = label(l.name, l.color); s.position.set(l.x, 40, l.z); scene.add(s); sprites.push(s);
});

// =====================================================
//  PLAYER CHARACTER (procedural, animated)
// =====================================================
// =====================================================
//  REVEAL: 3D hologram + effects when you press E
// =====================================================
const fx = [], holos = [];
const HOLO = {
    profile:  () => new THREE.IcosahedronGeometry(1),
    skills:   () => new THREE.BoxGeometry(1.4, 1.4, 1.4),
    projects: () => new THREE.BoxGeometry(2.4, 1.5, 0.15),
    academy:  () => new THREE.OctahedronGeometry(1),
    ai:       () => new THREE.SphereGeometry(0.8, 16, 16),
    cyber:    () => new THREE.DodecahedronGeometry(1),
    contact:  () => new THREE.TetrahedronGeometry(1.1),
    ship:     () => new THREE.ConeGeometry(1, 2, 4)
};
const addFx = tick => fx.push({ age: 0, tick });

function reveal(l) {
    const px = l.ix, pz = l.iz; sfx.reveal();
    // expanding shockwave ring
    const sw = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 8, 64), new THREE.MeshBasicMaterial({ color: l.color, transparent: true }));
    sw.rotation.x = Math.PI / 2; sw.position.set(px, 0.4, pz); scene.add(sw);
    addFx((dt, age) => {
        sw.scale.setScalar(1 + age * 14); sw.material.opacity = Math.max(0, 1 - age / 1.2);
        if (age > 1.2) { scene.remove(sw); return true; }
    });
    // particle burst
    const N = 150, arr = new Float32Array(N * 3), v = [], pg = new THREE.BufferGeometry();
    for (let i = 0; i < N; i++) {
        arr.set([px, 1, pz], i * 3);
        v.push(new THREE.Vector3((Math.random() - 0.5) * 14, 6 + Math.random() * 12, (Math.random() - 0.5) * 14));
    }
    pg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: l.color, size: 0.7, transparent: true, depthWrite: false }));
    pts.frustumCulled = false; scene.add(pts);
    addFx((dt, age) => {
        for (let i = 0; i < N; i++) {
            v[i].y -= 18 * dt;
            arr[i * 3] += v[i].x * dt; arr[i * 3 + 1] = Math.max(0.1, arr[i * 3 + 1] + v[i].y * dt); arr[i * 3 + 2] += v[i].z * dt;
        }
        pg.attributes.position.needsUpdate = true; pts.material.opacity = Math.max(0, 1 - age / 2);
        if (age > 2) { scene.remove(pts); return true; }
    });
    // floating hologram (stays as a trophy once revealed)
    if (!l.holo) {
        const g = new THREE.Group(); g.position.set(px, 11, pz); scene.add(g);
        const mat = new THREE.MeshStandardMaterial({ color: l.color, emissive: l.color, emissiveIntensity: 1.2, roughness: 0.3 });
        const core = new THREE.Mesh(HOLO[l.id](), mat); core.scale.setScalar(2.2); g.add(core);
        const wire = new THREE.Mesh(HOLO[l.id](), new THREE.MeshBasicMaterial({ color: l.color, wireframe: true }));
        wire.scale.setScalar(3.4); g.add(wire);
        const orbit = new THREE.Group(); g.add(orbit);
        for (let i = 0; i < 6; i++) {
            const m = new THREE.Mesh(HOLO[l.id](), mat), a = i / 6 * Math.PI * 2;
            m.scale.setScalar(0.5); m.position.set(Math.cos(a) * 5.5, Math.sin(i * 2) * 1.2, Math.sin(a) * 5.5); orbit.add(m);
        }
        l.holo = { g, core, wire, orbit, age: 0 }; holos.push(l.holo);
    }
    l.holo.age = 0;
}
function triggerLoc(l) {
    busy = true; reveal(l);
    setTimeout(() => openPanel(l), 1200);
}
function updateFX(dt, t) {
    for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i]; f.age += dt;
        if (f.tick(dt, f.age)) fx.splice(i, 1);
    }
    holos.forEach((h, i) => {
        h.age += dt;
        const k = Math.min(1, h.age / 1.2), s = 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
        h.g.scale.setScalar(Math.max(0.001, s)); h.g.position.y = 11 + Math.sin(t * 2 + i) * 0.5;
        h.core.rotation.y += dt; h.core.rotation.x += dt * 0.5; h.wire.rotation.y -= dt * 0.6;
        h.orbit.rotation.y += dt * 0.8; h.orbit.children.forEach(c => { c.rotation.x += dt; c.rotation.y += dt * 1.3; });
    });
}

const player = new THREE.Group();
scene.add(player);
player.rotation.y = Math.PI;
const P = {};
(function buildPlayer() {
    const skin = M(0xf1c27d), shirt = M(0x1677a8), pants = M(0x22304a), shoe = M(0x111111), hair = M(0x15110f);
    const add = (parent, geo, mat, x, y, z) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
    };
    const model = new THREE.Group(); model.scale.setScalar(0.9); player.add(model);
    P.body = new THREE.Group(); P.body.position.y = 1; model.add(P.body);
    add(P.body, new THREE.BoxGeometry(0.8, 0.85, 0.42), shirt, 0, 0.45, 0);
    add(P.body, new THREE.BoxGeometry(0.55, 0.6, 0.25), M(0x35d9ff, { emissive: 0x087aab, emissiveIntensity: 0.6 }), 0, 0.45, -0.33);
    P.head = new THREE.Group(); P.head.position.y = 1.15; P.body.add(P.head);
    add(P.head, new THREE.SphereGeometry(0.27, 20, 16), skin, 0, 0, 0);
    add(P.head, new THREE.SphereGeometry(0.29, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 0.03, -0.01);
    [-0.1, 0.1].forEach(x => add(P.head, new THREE.BoxGeometry(0.06, 0.06, 0.04), shoe, x, 0.02, 0.25));
    const limb = (parent, x, y, w, h, mat, shoeMat) => {
        const piv = new THREE.Group(); piv.position.set(x, y, 0); parent.add(piv);
        add(piv, new THREE.BoxGeometry(w, h, w), mat, 0, -h / 2, 0);
        if (shoeMat) add(piv, new THREE.BoxGeometry(0.34, 0.18, 0.5), shoeMat, 0, -h, 0.08);
        return piv;
    };
    P.armL = limb(P.body, 0.55, 0.82, 0.24, 0.85, skin);
    P.armR = limb(P.body, -0.55, 0.82, 0.24, 0.85, skin);
    P.legL = limb(model, 0.2, 1, 0.3, 0.95, pants, shoe);
    P.legR = limb(model, -0.2, 1, 0.3, 0.95, pants, shoe);
})();

// =====================================================
//  INPUT
// =====================================================
// =====================================================
//  GUIDE CHARACTER (a person who leads the tour)
// =====================================================
function makeChar(shirtC, pantsC, hairC, skinC) {
    const skin = M(skinC), shirt = M(shirtC), pants = M(pantsC), shoe = M(0x111111), hair = M(hairC);
    const add = (par, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
    const root = new THREE.Group(), model = new THREE.Group(); model.scale.setScalar(0.9); root.add(model);
    const q = { body: new THREE.Group() }; q.body.position.y = 1; model.add(q.body);
    add(q.body, new THREE.BoxGeometry(0.8, 0.85, 0.42), shirt, 0, 0.45, 0);
    const head = new THREE.Group(); head.position.y = 1.15; q.body.add(head);
    add(head, new THREE.SphereGeometry(0.27, 20, 16), skin, 0, 0, 0);
    add(head, new THREE.SphereGeometry(0.29, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 0.03, -0.01);
    add(head, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), shirt, 0, 0.2, 0);
    add(head, new THREE.BoxGeometry(0.36, 0.04, 0.3), shirt, 0, 0.17, 0.3);
    [-0.1, 0.1].forEach(x => add(head, new THREE.BoxGeometry(0.06, 0.06, 0.04), shoe, x, 0.02, 0.25));
    const limb = (par, x, y, w, h, mat, sh) => {
        const piv = new THREE.Group(); piv.position.set(x, y, 0); par.add(piv);
        add(piv, new THREE.BoxGeometry(w, h, w), mat, 0, -h / 2, 0);
        if (sh) add(piv, new THREE.BoxGeometry(0.34, 0.18, 0.5), sh, 0, -h, 0.08);
        return piv;
    };
    q.armL = limb(q.body, 0.55, 0.82, 0.24, 0.85, skin); q.armR = limb(q.body, -0.55, 0.82, 0.24, 0.85, skin);
    q.legL = limb(model, 0.2, 1, 0.3, 0.95, pants, shoe); q.legR = limb(model, -0.2, 1, 0.3, 0.95, pants, shoe);
    const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0xff8a3d }));
    mark.position.y = 3.2; root.add(mark);
    return { root, q, mark };
}
const npc = makeChar(0xff8a3d, 0x2a2a3a, 0x3a2410, 0xd9a066);
npc.root.visible = false; scene.add(npc.root);
const npcS = { stop: null, path: [], arrived: false, waiting: false, hello: 4, auto: 0 };
let npcPhase = 0;
const SAY = {
    profile:  "Welcome to MY PROFILE! This is where Anuj tells his story. Step on the glowing ring and I'll open it!",
    skills:   "This is the SKILL FOREST. Every glowing tree is a technical skill. Step on the ring to see them!",
    projects: "PROJECT HARBOR! Anuj's projects are docked here. Step on the ring to explore them.",
    academy:  "The LEARNING ACADEMY holds his education and experience. Stand on the ring!",
    ai:       "Welcome to the AI LABORATORY, where AI and Data Science happen. Step on the ring!",
    cyber:    "This is CYBER CITY, Anuj's cybersecurity world. Step on the glowing ring!",
    contact:  "Last stop: the CONTACT HUB. Step on the ring to get in touch with Anuj!"
};
function resetNpc() {
    npc.root.position.set(player.position.x + 3, 0, player.position.z - 5);
    npcS.stop = null; npcS.hello = 4; npcS.waiting = false;
}
function npcRoute(px, pz, l) {
    if (Math.hypot(px, pz) < 44) return [{ x: l.ix, z: l.iz }];
    const a0 = Math.atan2(px, -pz), d = Math.atan2(Math.sin(l.rad - a0), Math.cos(l.rad - a0));
    const n = Math.max(1, Math.ceil(Math.abs(d) / 0.2)), pts = [];
    for (let i = 1; i <= n; i++) { const a = a0 + d * i / n; pts.push({ x: Math.sin(a) * RING, z: -Math.cos(a) * RING }); }
    return pts;
}
const bubV = new THREE.Vector3();
function updateNpc(dt, t) {
    const bub = document.getElementById("guideSay"), on = mode === "tour" && started;
    npc.root.visible = on;
    if (!on) { bub.style.display = "none"; return; }
    const p = player.position, g = npc.root.position, dp = Math.hypot(p.x - g.x, p.z - g.z);
    const target = LOCS.find(l => !l.visited);
    let speed = 0, say = "", face = null, wave = false, move = null;
    if (npcS.hello > 0) {
        npcS.hello -= dt; say = "Hi! I'm your guide. I'll show you everything on this island. Follow me!"; face = p; wave = true;
    } else if (!target) {
        say = "That's the whole tour! Press T for Free Play and explore as you like."; face = p; wave = true;
    } else {
        if (npcS.stop !== target) { npcS.stop = target; npcS.path = npcRoute(g.x, g.z, target); npcS.arrived = false; npcS.auto = 0; }
        if (!npcS.arrived) {
            if (dp > 14) npcS.waiting = true; else if (dp < 9) npcS.waiting = false;
            if (npcS.waiting) { say = "Over here! Follow me, I'll wait for you."; face = p; }
            else {
                const w = npcS.path[0]; say = `Follow me to ${target.name}!`; move = w;
                if (Math.hypot(w.x - g.x, w.z - g.z) < 0.8) { npcS.path.shift(); if (!npcS.path.length) npcS.arrived = true; }
            }
        } else {
            face = { x: target.x, z: target.z }; wave = true;
            const near = Math.hypot(p.x - target.ix, p.z - target.iz) < 6.5;
            say = near ? "Let me show you…" : SAY[target.id];
            if (near && !panelOpen && !busy) { npcS.auto += dt; if (npcS.auto > 1) { npcS.auto = 0; triggerLoc(target); } } else npcS.auto = 0;
        }
    }
    if (move) {
        const dx = move.x - g.x, dz = move.z - g.z, d = Math.hypot(dx, dz) || 1;
        speed = 5; g.x += dx / d * speed * dt; g.z += dz / d * speed * dt; face = { x: g.x + dx, z: g.z + dz };
    }
    if (face) {
        let diff = Math.atan2(face.x - g.x, face.z - g.z) - npc.root.rotation.y;
        npc.root.rotation.y += Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1, dt * 10);
    }
    npcStepT -= dt;
    if (speed > 0.5 && npcStepT <= 0) { sfx.step(onRoad(g.x, g.z), 0.8 / (1 + dp / 5)); npcStepT = 0.4; }
    // animation
    const q = npc.q, k = Math.min(1, dt * 12), amp = Math.min(0.7, speed / 6 * 0.65);
    npcPhase += dt * speed * 1.4;
    const sw = Math.sin(npcPhase) * amp, s = (o, pp, v) => o.rotation[pp] += (v - o.rotation[pp]) * k;
    s(q.legL, "x", sw); s(q.legR, "x", -sw); s(q.armL, "x", -sw * 0.9);
    s(q.armR, "x", wave ? -2.5 + Math.sin(t * 6) * 0.3 : sw * 0.9); s(q.armL, "z", 0.08); s(q.armR, "z", wave ? -0.35 : -0.08);
    q.body.position.y = 1 + (speed > 0.5 ? Math.abs(Math.cos(npcPhase)) * 0.06 : Math.sin(t * 2) * 0.012);
    npc.mark.rotation.y += dt * 2; npc.mark.position.y = 3.2 + Math.sin(t * 3) * 0.15;
    if (say !== lastSay) { lastSay = say; onGuideSay(say); }
    // speech bubble
    bubV.set(g.x, 4.3, g.z).project(camera);
    if (panelOpen || bubV.z > 1) bub.style.display = "none";
    else {
        if (bub.textContent !== say) bub.textContent = say;
        bub.style.display = "block";
        bub.style.left = (bubV.x * 0.5 + 0.5) * innerWidth + "px"; bub.style.top = (-bubV.y * 0.5 + 0.5) * innerHeight + "px";
    }
}

const $ = id => document.getElementById(id);
const keys = {};
let carNav = null;
let yaw = 0, pitch = 0.35, dist = 12;
let locked = false, dragging = false, started = false, panelOpen = false, nearLoc = null, busy = false;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

on(window, "keydown", e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) { if (e.code === "Escape") closePanel(); return; }
    keys[e.code] = true;
    if (panelOpen && carNav && (e.code === "ArrowLeft" || e.code === "ArrowRight")) carNav(e.code === "ArrowLeft" ? -1 : 1);
    if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    if (e.code === "KeyT" && started && !panelOpen && !busy) setMode(mode === "tour" ? "free" : "tour");
    if (e.code === "KeyM") toggleMute();
    if (e.code === "KeyV") toggleVoice();
    if (e.code === "KeyE" && !panelOpen && nearLoc && started && !busy) triggerLoc(nearLoc);
    else if ((e.code === "Escape" || e.code === "KeyE") && panelOpen) closePanel();
});
on(window, "keyup", e => keys[e.code] = false);
on(window, "blur", () => Object.keys(keys).forEach(k => keys[k] = false));
on(window, "mousemove", e => {
    if (!started || panelOpen || !(locked || dragging)) return;
    yaw -= e.movementX * 0.0025;
    pitch = clamp(pitch + e.movementY * 0.0025, -0.15, 1.2);
});
on(window, "wheel", e => { dist = clamp(dist + e.deltaY * 0.01, 6, 24); });
on(renderer.domElement, "mousedown", () => dragging = true);
on(window, "mouseup", () => dragging = false);
on(renderer.domElement, "click", () => {
    if (started && !panelOpen && !locked) renderer.domElement.requestPointerLock?.();
});
on(document, "pointerlockchange", () => locked = document.pointerLockElement === renderer.domElement);

function startGame(m) {
    initAudio(); started = true; setMode(m); $("start").classList.add("hide"); wv.play().catch(() => {});
    renderer.domElement.requestPointerLock?.();
}
$("tourBtn").onclick = () => startGame("tour");
$("freeBtn").onclick = () => startGame("free");
$("closeBtn").onclick = closePanel;

// =====================================================
//  PANEL / MISSIONS
// =====================================================
const list = $("missionList"); list.innerHTML = "";
LOCS.forEach(l => { const li = document.createElement("li"); li.id = "m-" + l.id; li.textContent = l.name; list.appendChild(li); });

function openPanel(l) {
    const c = CONTENT[l.id];
    $("pTag").textContent = c.tag; $("pTitle").textContent = c.title; $("pBody").innerHTML = c.html;
    $("panel").classList.add("open"); panelOpen = true; busy = false; sfx.open();
    carNav = null;
    const ring = $("pBody").querySelector(".ring");
    if (ring) {
        const n = +ring.dataset.n, step = 360 / n, rad = Math.max(210, Math.round(120 / Math.tan(Math.PI / n)));
        ring.style.setProperty("--step", step + "deg"); ring.style.setProperty("--rad", rad + "px");
        let idx = 0;
        const show = () => {
            ring.style.transform = `translateZ(${-rad}px) rotateY(${-idx * step}deg)`;
            const cur = ((idx % n) + n) % n;
            [...ring.children].forEach((c, i) => c.classList.toggle("on", i === cur));
            $("carIdx").textContent = `${cur + 1} / ${n}`;
        };
        $("carPrev").onclick = () => { idx--; show(); }; $("carNext").onclick = () => { idx++; show(); };
        carNav = d => { idx += d; show(); }; show();
    }
    [...$("pBody").children].forEach((el, i) => el.style.animationDelay = i * 90 + "ms");
    $("pBody").querySelectorAll(".item,.bar").forEach(el => {
        el.onmousemove = e => {
            const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
            el.style.transform = `perspective(600px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(14px)`;
        };
        el.onmouseleave = () => el.style.transform = "";
    });
    const sb = $("sendBtn");
    if (sb) sb.onclick = () => {
        const n = encodeURIComponent($("cName").value), m = encodeURIComponent($("cMsg").value);
        location.href = `mailto:you@example.com?subject=Portfolio%20message%20from%20${n}&body=${m}`;
    };
    document.exitPointerLock?.();
    if (!l.visited) {
        l.visited = true; $("m-" + l.id).classList.add("done"); sfx.discover();
        const left = LOCS.filter(x => !x.visited).length;
        toast(left ? `✔ ${l.name} DISCOVERED — ${left} LEFT` : "★ ALL LOCATIONS DISCOVERED!");
    }
}
function closePanel() {
    $("panel").classList.remove("open"); panelOpen = false; sfx.close();
    renderer.domElement.requestPointerLock?.();
}
let toastT;
function toast(t) {
    const el = $("toast"); el.textContent = t; el.style.opacity = 1;
    clearTimeout(toastT); toastT = setTimeout(() => el.style.opacity = 0, 3000);
}

// =====================================================
//  PLAYER UPDATE + ANIMATION
// =====================================================
const vel = new THREE.Vector3();
let grounded = true, phase = 0, lookY = 1.8;

function animateChar(dt, t, speed) {
    const k = Math.min(1, dt * 14), air = !grounded, moving = speed > 0.5;
    phase += dt * speed * 1.4;
    const amp = speed <= 6 ? 0.65 * speed / 6 : 0.65 + 0.45 * Math.min(1, (speed - 6) / 5);
    const sw = Math.sin(phase) * amp;
    let lL = sw, lR = -sw, aL = -sw * 0.9, aR = sw * 0.9;
    let lean = Math.max(0, (speed - 6) / 5) * 0.3, bob = moving ? Math.abs(Math.cos(phase)) * 0.08 * amp : 0, aZ = 0.08;
    if (air) { lL = 0.7; lR = -0.3; aL = aR = -2.6; lean = 0.1; bob = 0; }
    else if (!moving) { lL = lR = 0; aL = aR = Math.sin(t * 2) * 0.04; aZ = 0.1 + Math.sin(t * 2) * 0.03; bob = Math.sin(t * 2) * 0.012; }
    const s = (o, p, v) => o.rotation[p] += (v - o.rotation[p]) * k;
    s(P.legL, "x", lL); s(P.legR, "x", lR); s(P.armL, "x", aL); s(P.armR, "x", aR);
    s(P.armL, "z", aZ); s(P.armR, "z", -aZ); s(P.body, "x", lean);
    P.body.position.y = 1 + bob;
}

function update(dt, t) {
    if (started && !panelOpen && !busy) {
        yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.2 * dt;
        pitch = clamp(pitch + ((keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0)) * 1.2 * dt, -0.15, 1.2);
    }
    let ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    if (panelOpen || busy || !started) ix = iz = 0;
    let dx = -Math.sin(yaw) * iz + Math.cos(yaw) * ix, dz = -Math.cos(yaw) * iz - Math.sin(yaw) * ix;
    const len = Math.hypot(dx, dz);
    const target = len ? ((keys.ShiftLeft || keys.ShiftRight) ? 11 : 6) : 0;
    if (len) {
        dx /= len; dz /= len;
        let diff = Math.atan2(dx, dz) - player.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        player.rotation.y += diff * Math.min(1, dt * 12);
    }
    const k = Math.min(1, dt * (grounded ? 12 : 3));
    vel.x += (dx * target - vel.x) * k; vel.z += (dz * target - vel.z) * k;
    if (keys.Space && grounded && started && !panelOpen) { vel.y = 11; grounded = false; sfx.jump(); }
    vel.y -= 28 * dt;
    player.position.addScaledVector(vel, dt);
    const gy = groundHeight(player.position.x, player.position.z);
    if (grounded && player.position.y > gy + 0.02) grounded = false;          // stepped off the pier -> fall
    if (player.position.y <= gy && vel.y <= 0) {
        if (!grounded) sfx.land();
        player.position.y = grounded ? player.position.y + (gy - player.position.y) * Math.min(1, dt * 20) : gy;
        vel.y = 0; grounded = true;
    }

    const p = player.position, r = Math.hypot(p.x, p.z);
    if (r > ISLAND + 4) { p.x *= (ISLAND + 4) / r; p.z *= (ISLAND + 4) / r; }
    for (const c of colliders) {
        const ox = p.x - c.x, oz = p.z - c.z, d = Math.hypot(ox, oz), min = c.r + 0.6;
        if (d < min && d > 0.001) { p.x = c.x + ox / d * min; p.z = c.z + oz / d * min; }
    }
    animateChar(dt, t, Math.hypot(vel.x, vel.z));
    stepT -= dt;
    const spd = Math.hypot(vel.x, vel.z);
    if (grounded && spd > 1.5 && stepT <= 0) { sfx.step(onRoad(p.x, p.z)); stepT = spd > 8 ? 0.27 : 0.42; }

    // Camera
    const cy = p.y + 2 + Math.sin(pitch) * dist;
    camera.position.set(p.x + Math.sin(yaw) * Math.cos(pitch) * dist, Math.max(cy, 0.8),
                        p.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    lookY += ((busy || panelOpen ? 8 : 1.8) - lookY) * Math.min(1, dt * 3);
    camera.lookAt(p.x, p.y + lookY, p.z);
    sun.position.set(p.x - 40, 70, p.z + 30); sun.target.position.copy(p);
}

// =====================================================
//  HUD + MINIMAP
// =====================================================
const mm = $("minimap").getContext("2d"), MS = 85 / 135;
function updateHUD() {
    const p = player.position;
    let nearest = null, nd = 1e9, area = null, ad = 26;
    nearLoc = null;
    LOCS.forEach(l => {
        const di = Math.hypot(p.x - l.ix, p.z - l.iz), dc = Math.hypot(p.x - l.x, p.z - l.z);
        if (di < 6) nearLoc = l;
        if (dc < ad) { ad = dc; area = l; }
        if (!l.visited && di < nd) { nd = di; nearest = l; }
    });
    if (!nearLoc && Math.hypot(p.x - shipLoc.ix, p.z - shipLoc.iz) < 6) nearLoc = shipLoc;
    $("locName").textContent = area ? area.name : "PORTFOLIO ISLAND";
    const target = mode === "tour" ? LOCS.find(l => !l.visited) : nearest;
    const td = target ? Math.hypot(p.x - target.ix, p.z - target.iz) : 0;
    $("missionText").textContent = target
        ? (mode === "tour" ? `Stop ${LOCS.indexOf(target) + 1}/${LOCS.length}: ${target.name} — ${Math.round(td)}m`
                           : `Go to ${target.name} — ${Math.round(td)}m`)
        : "★ You discovered everything. Thanks for visiting!";
    LOCS.forEach(l => l.beam.material.opacity = mode === "tour" ? (l === target ? 0.6 : 0.07) : 0.25);
    guide.visible = false;
    if (target) {
        guide.position.set(p.x, p.y + 5 + Math.sin(performance.now() / 300) * 0.3, p.z);
        guide.rotation.y = Math.atan2(target.ix - p.x, target.iz - p.z);
        guide.children.forEach(c => c.material.color.setHex(target.color));
    }
    const pr = $("prompt");
    if (nearLoc && !panelOpen && started) { pr.innerHTML = `<b>E</b> OPEN ${nearLoc.name}`; pr.style.display = "block"; }
    else pr.style.display = "none";

    // minimap
    mm.clearRect(0, 0, 170, 170);
    mm.save(); mm.translate(85, 85);
    mm.fillStyle = "#2f6b3a"; mm.beginPath(); mm.arc(0, 0, ISLAND * MS, 0, 7); mm.fill();
    mm.strokeStyle = "#555"; mm.lineWidth = 3; mm.beginPath(); mm.arc(0, 0, RING * MS, 0, 7); mm.stroke();
    LOCS.forEach(l => {
        mm.strokeStyle = "#555"; mm.beginPath(); mm.moveTo(0, 0); mm.lineTo(l.x * MS, l.z * MS); mm.stroke();
        mm.fillStyle = l.visited ? "#3dff8a" : "#" + l.color.toString(16).padStart(6, "0");
        mm.beginPath(); mm.arc(l.ix * MS, l.iz * MS, l === target ? 6 + Math.sin(performance.now() / 200) * 1.5 : 4.5, 0, 7); mm.fill();
    });
    if (mode === "tour") { mm.fillStyle = "#ff8a3d"; mm.beginPath(); mm.arc(npc.root.position.x * MS, npc.root.position.z * MS, 4, 0, 7); mm.fill(); }
    mm.translate(p.x * MS, p.z * MS); mm.rotate(-player.rotation.y);
    mm.fillStyle = "#fff"; mm.beginPath(); mm.moveTo(0, 7); mm.lineTo(-5, -5); mm.lineTo(5, -5); mm.closePath(); mm.fill();
    mm.restore();
}

// =====================================================
//  LOOP
// =====================================================
// =====================================================
//  AUDIO (all sounds are synthesised - no files needed)
// =====================================================
let AC = null, master, NB, windG, waveG, muted = false, voiceOn = true;
let stepT = 0, npcStepT = 0, lastSay = "", lastSpeak = 0, chirpT = null;
const soundBtn = document.getElementById("soundBtn");

function initAudio() {
    if (AC) { AC.resume(); return; }
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(AC.destination);
    NB = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const loop = freq => {
        const src = AC.createBufferSource(); src.buffer = NB; src.loop = true;
        const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
        const g = AC.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(master); src.start(); return g;
    };
    windG = loop(500); waveG = loop(1100);
    playChord(); musicI = setInterval(playChord, 4000); chirp();
}
function tone(f, dur, type = "sine", vol = 0.15, delay = 0, f2) {
    if (!AC) return;
    const t0 = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function puff(dur, freq, q, vol, type = "bandpass") {
    if (!AC) return;
    const src = AC.createBufferSource(); src.buffer = NB; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = AC.createGain(), t0 = AC.currentTime;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
}
const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]];
let chordI = 0;
function playChord() {
    if (!AC) return;
    const t0 = AC.currentTime, notes = CHORDS[chordI++ % 4];
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200; lp.connect(master);
    notes.forEach(f => {
        const o = AC.createOscillator(), g = AC.createGain(); o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.035, t0 + 1.2); g.gain.linearRampToValueAtTime(0.0001, t0 + 4.4);
        o.connect(g); g.connect(lp); o.start(t0); o.stop(t0 + 4.5);
    });
    tone([523, 659, 784, 880][(Math.random() * 4) | 0], 1.8, "sine", 0.02, 1 + Math.random() * 2);
}
function chirp() {
    chirpT = setTimeout(chirp, 2500 + Math.random() * 3500);
    if (!AC || muted || panelOpen || Math.hypot(player.position.x, player.position.z) > 105) return;
    const n = 2 + ((Math.random() * 3) | 0), base = 2800 + Math.random() * 1200;
    for (let i = 0; i < n; i++) tone(base, 0.09, "sine", 0.025, i * 0.12, base * 1.3);
}
const sfx = {
    step: (road, v = 1) => road ? (puff(0.07, 2200, 1.2, 0.12 * v), tone(120, 0.05, "square", 0.03 * v)) : puff(0.1, 900, 0.6, 0.14 * v, "lowpass"),
    jump: () => tone(280, 0.18, "sine", 0.12, 0, 620),
    land: () => puff(0.14, 300, 0.5, 0.25, "lowpass"),
    click: () => tone(700, 0.08, "triangle", 0.1),
    open: () => [523, 659, 784].forEach((f, i) => tone(f, 0.35, "sine", 0.12, i * 0.08)),
    close: () => tone(520, 0.15, "triangle", 0.1, 0, 330),
    discover: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, "triangle", 0.14, i * 0.1)),
    reveal: () => { puff(0.9, 600, 0.8, 0.25); tone(180, 0.9, "sawtooth", 0.06, 0, 720); [880, 1175, 1568].forEach((f, i) => tone(f, 0.5, "sine", 0.1, 0.35 + i * 0.12)); }
};
function onRoad(x, z) {
    const r = Math.hypot(x, z);
    if (r < 5 || Math.abs(r - RING) < 3.2) return true;
    return LOCS.some(l => { const dx = Math.sin(l.rad), dz = -Math.cos(l.rad), t = x * dx + z * dz; return t > 0 && t < R && Math.abs(x * dz - z * dx) < 3.2; });
}
function updateAudio(dt, t) {
    if (!AC) return;
    const r = Math.hypot(player.position.x, player.position.z);
    windG.gain.value = 0.05 + 0.03 * Math.sin(t * 0.4);
    waveG.gain.value = 0.03 + 0.09 * Math.min(1, Math.max(0, (r - 70) / 55)) * (0.7 + 0.3 * Math.sin(t * 0.9));
}
function onGuideSay(say) {
    const now = performance.now(), key = Object.values(SAY).includes(say) || say.startsWith("Hi!") || say.startsWith("That's");
    if (now - lastSpeak < 4000 && !key) return;
    lastSpeak = now; tone(880, 0.12, "sine", 0.06); tone(1175, 0.12, "sine", 0.05, 0.1);
    if (!voiceOn || muted || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(say.replace(/…/g, "...")); u.rate = 1; u.pitch = 1.05; speechSynthesis.speak(u);
}
function toggleMute() {
    muted = !muted; if (master) master.gain.value = muted ? 0 : 0.8;
    if (muted) window.speechSynthesis?.cancel();
    soundBtn.textContent = muted ? "🔇" : "🔊"; toast(muted ? "🔇 SOUND OFF" : "🔊 SOUND ON");
}
function toggleVoice() {
    voiceOn = !voiceOn; if (!voiceOn) window.speechSynthesis?.cancel();
    toast(voiceOn ? "🗣 GUIDE VOICE ON" : "🗣 GUIDE VOICE OFF");
}
soundBtn.onclick = toggleMute;

// ---------- loop ----------
const clock = new THREE.Clock();
function animate() {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    update(dt, t);
    spinners.forEach(s => s.m.rotation[s.p] += dt * s.s);
    rings.forEach((r, i) => r.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.1));
    updateFX(dt, t); animateNature(dt, t); updateNpc(dt, t); updateAudio(dt, t);
    sprites.forEach((s, i) => s.position.y = 40 + Math.sin(t * 2 + i) * 0.7);
    updateHUD();
    renderer.render(scene, camera);
}
animate();

on(window, "resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

return () => {
    cancelAnimationFrame(raf); cleanups.forEach(f => f());
    clearInterval(musicI); clearTimeout(chirpT); clearTimeout(toastT);
    window.speechSynthesis?.cancel(); if (AC) AC.close();
    wv.pause(); document.exitPointerLock?.();
    renderer.dispose(); renderer.domElement.remove();
};
}