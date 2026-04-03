const { createCanvas } = require("canvas");
const { getBiome } = require("./biome");
const { getCrop } = require("./crops");
// ================= TIME =================
function getTimeData() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const t = hours / 24;

    return {
        t,
        isNight: t < 0.25 || t > 0.75
    };
}

function gerarSeed(str) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return hash;
}

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// ================= SUN LIGHT =================
function getSunLight(time) {
    const angle = time.t * Math.PI * 2;

    return {
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        intensity: time.isNight ? 0.25 : 1
    };
}

// ================= WIND =================
function getWind(clima) {
    if (clima === "rain") return 1.2;
    if (clima === "cloudy") return 0.6;
    return 0.3;
}

// ================= SKY =================
function drawSky(ctx, w, h, biome, time) {

    let top, bottom;

    if (time.isNight) {
        top = "#020924";
        bottom = "#0b1d3a";
    } else {
        top = biome.skyTop;
        bottom = biome.skyBottom;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// ================= SUN / MOON =================
function drawSunMoon(ctx, w, h, time) {

    const angle = time.t * Math.PI * 2;

    const x = w / 2 + Math.cos(angle) * 400;
    const y = h / 2 + Math.sin(angle) * 250;

    if (time.isNight) {
        ctx.fillStyle = "#ddd";
    } else {
        const grad = ctx.createRadialGradient(x, y, 10, x, y, 100);
        grad.addColorStop(0, "#fff176");
        grad.addColorStop(1, "rgba(255,255,150,0)");
        ctx.fillStyle = grad;
    }

    ctx.beginPath();
    ctx.arc(x, y, 45, 0, Math.PI * 2);
    ctx.fill();
}

// ================= STARS =================
function drawStars(ctx, w, h, time, seed) {
    if (!time.isNight) return;

    for (let i = 0; i < 120; i++) {

        const randX = seededRandom(seed + i * 928371);
        const randY = seededRandom(seed + i * 123123);

        ctx.fillRect(randX * w, randY * h * 0.5, 2, 2);
    }
}

// ================= MOUNTAINS =================
function drawMountains(ctx, w, h, seed) {

    const layers = [
        { color: "#2e4a2e", height: 0.42, rough: 0.6, alpha: 1 },     // perto
        { color: "#4f6f4f", height: 0.48, rough: 0.4, alpha: 0.7 },   // médio
        { color: "#8fa98f", height: 0.54, rough: 0.2, alpha: 0.4 }    // longe
    ];

    layers.forEach((layer, i) => {

        ctx.globalAlpha = layer.alpha;

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 20) {

            // 🔥 compressão (quanto mais longe, mais "reta")
            const compression = 1 - (i * 0.35);

            const y =
                h * layer.height +
                Math.sin(x * 0.01 + seed + i * 200) * 40 * layer.rough * compression +
                Math.sin(x * 0.02 + seed * 0.5 + i * 100) * 15 * layer.rough * compression;

            ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        ctx.fillStyle = layer.color;
        ctx.fill();
    });

    ctx.globalAlpha = 1;

    // 🌫️ ATMOSFERA (isso aqui é o segredo que você não tinha)
    const fog = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.65);
    fog.addColorStop(0, "rgba(255,255,255,0.35)");
    fog.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, w, h);
}

// ================= NEBLINA ===============
function drawAtmosphere(ctx, w, h) {

    const grad = ctx.createLinearGradient(0, 0, 0, h);

    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,0.25)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}
// ================= HILLS =================
function drawHills(ctx, w, h) {

    ctx.fillStyle = "#7aa35a";

    ctx.beginPath();
    ctx.moveTo(0, h * 0.6);
    ctx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.6);
    ctx.quadraticCurveTo(w * 0.85, h * 0.65, w, h * 0.58);

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
}

// ================= FOG =================
function drawFog(ctx, w, h, clima, time) {

    let intensity = 0;

    if (clima === "cloudy") intensity = 0.2;
    if (clima === "rain") intensity = 0.3;
    if (!time.isNight && time.t < 0.3) intensity += 0.2;

    if (intensity <= 0) return;

    const grad = ctx.createLinearGradient(0, h * 0.4, 0, h);

    grad.addColorStop(0, `rgba(255,255,255,0)`);
    grad.addColorStop(1, `rgba(220,230,255,${intensity})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// ================= CLOUDS =================
function drawClouds(ctx, w, h, clima, seed, time) {

    if (clima === "clear") return;

    for (let i = 0; i < 6; i++) {

        const base = seededRandom(seed + i * 9999);

        // ⏳ movimento no tempo
        const drift = (Date.now() / 10000) % w;

        const x = (base * w + drift) % w;
        const y = 40 + i * 30;

        ctx.fillStyle = clima === "rain"
            ? "rgba(120,120,120,0.9)"
            : "rgba(200,200,200,0.8)";

        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.arc(x + 30, y + 10, 25, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ================= RAIN =================
function drawRain(ctx, w, h, clima) {

    if (clima !== "rain") return;

    ctx.strokeStyle = "rgba(180,200,255,0.6)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 300; i++) {

        const x = Math.random() * w;
        const y = Math.random() * h;

        const len = 10 + Math.random() * 10;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3, y + len);
        ctx.stroke();
    }
}

// ================= GROUND =================
function drawFieldArea(ctx, w, h) {

    const top = h * 0.65;

    // 🌾 gradiente principal (menos artificial)
    const grad = ctx.createLinearGradient(0, top, 0, h);
    grad.addColorStop(0, "#6fae3a");
    grad.addColorStop(1, "#2f5f1a");

    ctx.fillStyle = grad;
    ctx.fillRect(0, top, w, h);

    // 🌱 variação de textura (quebra padrão reto)
    for (let i = 0; i < 300; i++) {
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        ctx.fillRect(
            Math.random() * w,
            top + Math.random() * (h - top),
            2,
            2
        );
    }

    // 🌿 borda superior suave (integra com o terreno)
    ctx.beginPath();
    ctx.moveTo(0, top);

    for (let x = 0; x <= w; x += 20) {
        const y = top + Math.sin(x * 0.01) * 3;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(w, top);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalAlpha = 1;
}

// ================= ROAD =================
function drawRoad(ctx, w, h) {

    const horizon = h * 0.62;

    const baseWidth = 120;
    const midWidth = 60;
    const topWidth = 12;

    const centerX = w / 2;

    // leve deslocamento no horizonte (simula continuação)
    const horizonOffset = 40;

    ctx.beginPath();

    // BASE (reta)
    ctx.moveTo(centerX - baseWidth / 2, h);

    // sobe reto até metade
    ctx.lineTo(centerX - midWidth / 2, h * 0.75);

    // CURVA SUAVE SÓ NO FINAL
    ctx.quadraticCurveTo(
        centerX - horizonOffset,
        h * 0.68,
        centerX - topWidth / 2 + horizonOffset,
        horizon
    );

    // topo
    ctx.lineTo(centerX + topWidth / 2 + horizonOffset, horizon);

    // volta pela direita (espelhado)
    ctx.quadraticCurveTo(
        centerX + horizonOffset,
        h * 0.68,
        centerX + midWidth / 2,
        h * 0.75
    );

    // desce reto
    ctx.lineTo(centerX + baseWidth / 2, h);

    ctx.closePath();

    // 🎨 gradiente
    const grad = ctx.createLinearGradient(0, horizon, 0, h);
    grad.addColorStop(0, "#a07a4a");
    grad.addColorStop(1, "#5b3f1f");

    ctx.fillStyle = grad;
    ctx.fill();

    // 🌑 sombra lateral (leve)
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#000";

    ctx.beginPath();
    ctx.moveTo(centerX - baseWidth / 2 - 8, h);
    ctx.lineTo(centerX - midWidth / 2 - 6, h * 0.75);

    ctx.quadraticCurveTo(
        centerX - horizonOffset - 5,
        h * 0.68,
        centerX - topWidth / 2 + horizonOffset,
        horizon
    );

    ctx.lineTo(centerX - topWidth / 2 + horizonOffset, horizon);

    ctx.quadraticCurveTo(
        centerX - horizonOffset,
        h * 0.68,
        centerX - midWidth / 2,
        h * 0.75
    );

    ctx.lineTo(centerX - baseWidth / 2, h);

    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;

    // textura
    for (let i = 0; i < 120; i++) {
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(
            centerX - baseWidth / 2 + Math.random() * baseWidth,
            horizon + Math.random() * (h - horizon),
            2, 2
        );
    }

    // fade no horizonte
    const fade = ctx.createLinearGradient(0, horizon, 0, horizon + 80);
    fade.addColorStop(0, "rgba(255,255,255,0.25)");
    fade.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = fade;
    ctx.fillRect(0, horizon, w, 80);
}

// ================= BUILDINGS =================
function drawBuildings(ctx, w, h, nivel, light) {

    const baseY = h * 0.62;

    function shadow(x, y, width) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(
            x + light.dx * 20,
            y + light.dy * 10,
            width,
            width / 2,
            0, 0, Math.PI * 2
        );
        ctx.fill();
    }

    if (nivel >= 1) {
        const x = 150;
        shadow(x, baseY, 40);

        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(x, baseY - 40, 60, 40);

        ctx.fillStyle = "#5a3a1a";
        ctx.beginPath();
        ctx.moveTo(x - 5, baseY - 40);
        ctx.lineTo(x + 30, baseY - 65);
        ctx.lineTo(x + 65, baseY - 40);
        ctx.fill();
    }

    if (nivel >= 2) {
        const x = 250;
        shadow(x, baseY, 50);

        ctx.fillStyle = "#c97b3b";
        ctx.fillRect(x, baseY - 50, 80, 50);

        ctx.fillStyle = "#8b0000";
        ctx.beginPath();
        ctx.moveTo(x - 5, baseY - 50);
        ctx.lineTo(x + 40, baseY - 80);
        ctx.lineTo(x + 85, baseY - 50);
        ctx.fill();
    }

    if (nivel >= 3) {
        const x = 380;
        shadow(x, baseY, 45);

        ctx.fillStyle = "#b22222";
        ctx.fillRect(x, baseY - 50, 70, 50);
    }

    if (nivel >= 4) {
        const x = 500;
        shadow(x, baseY, 35);

        ctx.fillStyle = "#ccc";
        ctx.fillRect(x, baseY - 60, 30, 60);
    }
}

// ================= TREE =================
function drawTree(ctx, x, y, scale, light) {

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x + light.dx * 15, y + light.dy * 8, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5c3b1e";
    ctx.fillRect(x - 3 * scale, y - 15 * scale, 6 * scale, 15 * scale);

    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.arc(x, y - 20 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
}

// ================= FOREGROUND TREES =================
function drawForegroundTrees(ctx, w, h, light) {

    const y = h * 0.65;

    [80, 900, 750, 200].forEach(x => {
        drawTree(ctx, x, y - 10, 1.2, light);
    });
}

// ================= PLANT =================
function drawPlant(ctx, x, y, scale, crop, progress, wind, light) {

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(
        x + light.dx * 10,
        y + light.dy * 5,
        6 * scale,
        3 * scale,
        0, 0, Math.PI * 2
    );
    ctx.fill();
    const variation = 0.8 + Math.random() * 0.4;
    const height = progress * 40 * scale * variation;
    const sway =
        Math.sin((x * 0.05) + (Date.now() / 400)) *
        (3 + Math.random() * 2) *
        wind;



    ctx.strokeStyle = `rgba(0,0,0,0.3)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + light.dx * 20, y + light.dy * 10);
    ctx.stroke();

    ctx.strokeStyle = crop.stem;
    ctx.lineWidth = 3 * scale;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sway, y - height);
    ctx.stroke();

    if (progress > 0.7) {
        ctx.fillStyle = crop.fruit;
        ctx.beginPath();
        ctx.arc(x + sway, y - height, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
}

function getRoadCenterX(depth, w) {
    const centerX = w / 2;
    const curveStrength = 100;

    return centerX + Math.sin(depth * Math.PI * 0.9) * curveStrength;
}


// ================= FIELD =================
function drawField(ctx, crop, progress, w, h, wind, light, seed) {

    const rows = 9;
    const padding = 140;

    for (let r = 0; r < rows; r++) {

        const depth = r / rows;
        const y = h * 0.68 + depth * 150;

        ctx.globalAlpha = 0.5 + (1 - depth) * 0.5;

        for (let c = 0; c < 18; c++) {

            const t = c / 18;

            // 🌾 posição corrigida (sem cortar lateral)
            const spread = (t - 0.5) * 20; // 👈 isso aqui

            const x = padding + t * (w - padding * 2) + depth * 20 + spread;

            // 🛣️ bloqueio da estrada (reta)
            const roadWidth = (1 - depth) * 100 + 10;

            if (Math.abs(x - w / 2) < roadWidth / 2) continue;

            // 🌱 escala com profundidade
            const scale = 0.5 + depth * 1.3;

            // 🌿 variação leve pra não ficar robótico
            const variation = 0.8 + seededRandom(seed + r * 100 + c) * 0.4;

            drawPlant(
                ctx,
                x,
                y,
                scale * variation,
                crop,
                progress,
                wind,
                light
            );
        }
    }

    // reset alpha
    ctx.globalAlpha = 1;

    // 🌱 linha de divisão do campo (detalhe visual forte)
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding, h * 0.68);
    ctx.lineTo(w - padding, h * 0.68);
    ctx.stroke();
}


// ================= HUD =================
function drawHUD(ctx, fazenda, progress) {

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(20, 20, 420, 110);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(`🌱 Fazenda de ${fazenda.tipo_producao}`, 30, 55);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#ccc";
    ctx.fillText(`📍 ${fazenda.provincia}`, 30, 80);

    ctx.fillStyle = "#222";
    ctx.fillRect(30, 95, 300, 12);

    ctx.fillStyle = "#4caf50";
    ctx.fillRect(30, 95, 300 * progress, 12);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`${Math.floor(progress * 100)}%`, 340, 105);
}

// ================= MAIN =================
async function renderFazenda(fazenda, progress) {

    const seedBase = gerarSeed(
        fazenda.provincia + "_" + fazenda.tipo_producao
    );
    const w = 1000;
    const h = 550;

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");

    const biome = getBiome(fazenda.provincia);
    if (!biome) {
        console.warn(`⚠️ Bioma não encontrado para provincia "${fazenda.provincia}", usando fallback`);
    }
    
    const crop = getCrop(fazenda.tipo_producao);
    if (!crop) {
        console.warn(`⚠️ Crop não encontrado para tipo_producao "${fazenda.tipo_producao}", usando fallback`);
    }
    
    const biomeData = biome || {
        tipo: "desconhecido",
        producoes: [],
        skyTop: "#87ceeb",
        skyBottom: "#e0f6ff"
    };
    
    const cropData = crop || {
        tipo: "plantacao",
        semente: "semente_desconhecida",
        produto: "desconhecido",
        nome: "Desconhecido",
        id: "desconhecido",
        stem: "#8b7355",
        fruit: "#8b4513"
    };
    
    const time = getTimeData();

    const light = getSunLight(time);
    const wind = getWind(fazenda.clima || "cloudy");

    const nivel = fazenda.nivel || 1;

    drawSky(ctx, w, h, biomeData, time);
    drawSunMoon(ctx, w, h, time);
    drawStars(ctx, w, h, time, seedBase);

    drawMountains(ctx, w, h, seedBase);
    drawHills(ctx, w, h);
    drawAtmosphere(ctx, w, h);
    drawClouds(ctx, w, h, fazenda.clima, seedBase);
    drawRain(ctx, w, h, fazenda.clima);

    drawFieldArea(ctx, w, h, seedBase);                 // 🌱 base do terreno

    drawField(ctx, cropData, progress, w, h, wind, light, seedBase); // 🌾 plantação

    drawRoad(ctx, w, h);                      // 🛣️ estrada por cima

    drawBuildings(ctx, w, h, nivel, light);   // 🏠 construções por cima de tudo

    drawForegroundTrees(ctx, w, h, light);

    drawFog(ctx, w, h, fazenda.clima, time);

    drawHUD(ctx, fazenda, progress);

    return canvas.toBuffer("image/png");
}

module.exports = { renderFazenda };