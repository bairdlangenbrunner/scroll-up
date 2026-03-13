import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";

// ─── Scale & Constants ───────────────────────────────────────────────
const MAX_ALTITUDE_KM = 550;
const MOBILE_TEMP_OVERLAY_WIDTH = 40;
// Ocean height is computed dynamically as 50vh inside the component

const PX_PER_KM = 250;

function altitudeToPixels(km) {
  return Math.max(0, km * PX_PER_KM);
}

function pixelsToAltitude(px) {
  return Math.max(0, px / PX_PER_KM);
}

const ATM_HEIGHT = altitudeToPixels(MAX_ALTITUDE_KM) + 400; // atmosphere portion only

// ─── Atmosphere Data ─────────────────────────────────────────────────
const layers = [
  {
    name: "Troposphere",
    startKm: 0,
    endKm: 12,
    color: "rgba(135, 206, 235, 0.12)",
    description:
      "The TROPOSPHERE is the lowest 10–12 km of the atmosphere, and is where all weather occurs. Temperature drops about 6.5°C (11.7°F) for every kilometer you climb.",
    climateNote:
      "This layer is warming fastest, about 0.2°C (0.36°F) per decade near the surface. More moisture, stronger storms, shifting jet streams.",
  },
  {
    name: "Stratosphere",
    startKm: 12,
    endKm: 50,
    color: "rgba(100, 149, 237, 0.08)",
    description:
      "The STRATOSPHERE is stratified, with calm and stable air. Commercial jets cruise near its lower boundary, since there's not much turbulence. The ozone layer lives here, absorbing ultraviolet light and warming the air.",
    climateNote:
      "Counterintuitively, this layer is cooling as CO₂ radiates more heat to space. The ozone layer is slowly recovering from CFCs.",
  },
  {
    name: "Mesosphere",
    startKm: 50,
    endKm: 85,
    color: "rgba(72, 61, 139, 0.08)",
    description:
      "The MESOSPHERE is the coldest place in Earth's atmosphere, dropping to −90°C (−130°F). Meteors burn up here because of air compression and friction, producing the shooting stars we see in the night sky.",
    climateNote:
      "Cooling and contracting. Noctilucent clouds, composed entirely of ice crystals at 80 km, appear more often, possibly a fingerprint of climate change.",
  },
  {
    name: "Thermosphere",
    startKm: 85,
    endKm: 500,
    color: "rgba(25, 25, 80, 0.06)",
    description:
      "In the THERMOSPHERE, temperatures soar above 1000°C (1832°F), but with so few molecules, you wouldn't actually feel warm. The ISS orbits here, and auroras shimmer through this layer.",
    climateNote:
      "CO₂ increase is causing this layer to cool and contract; satellites experience less drag, which changes their orbital decay rates.",
  },
];

const landmarks = [
  { km: 0, label: "Sea level", detail: "1013 hPa · 15°C (59°F)" },
  { km: 0.8, label: "Burj Khalifa", detail: "The tallest building on Earth (828 m)" },
  { km: 5.895, label: "Mount Kilimanjaro", detail: "Africa's tallest mountain (5.895 km), at roughly 1/2 of sea-level pressure" },
  { km: 5.5, label: "Half the atmosphere by mass", detail: "Half of all air molecules are below this point" },
  { km: 8.8, label: "Mount Everest", detail: "8.849 km; air pressure is 1/3 of sea level" },
  { km: 10, label: "Cruising altitude", detail: "Where commercial jets fly · about −50°C (−58°F) outside" },
  { km: 12, label: "Tropopause", detail: "The boundary where weather ends and the stratosphere begins", isBoundary: true },
  { km: 13.7, label: "80% of the atmosphere by mass", detail: "About 80% of the atmosphere's mass lies below roughly 13.7 km" },
  { km: 16, label: "Lower stratosphere", detail: "The air here is very dry and stable; most water vapor is trapped below the tropopause" },
  { km: 20, label: "Ozone layer begins", detail: "Most ozone by number is concentrated around 20–25 km" },
  { km: 35, label: "Peak ozone fraction", detail: "Ozone makes up its largest share of the air here; it helps block UV-B and UV-C" },
  { km: 39, label: "Felix Baumgartner's jump", detail: "Jumped from 39 km in 2012, broke the sound barrier in freefall" },
  { km: 50, label: "Stratopause", detail: "Temperature peaks here (~0°C / 32°F) before dropping again", isBoundary: true },
  { km: 80, label: "Noctilucent clouds", detail: "Earth's highest clouds, ice crystals glowing after sunset" },
  { km: 85, label: "Mesopause", detail: "The coldest point in the atmosphere: around −90°C (−130°F)", isBoundary: true },
  { km: 100, label: "Kármán line", detail: "The internationally recognized edge of space" },
  { km: 110, label: "Auroras begin", detail: "Northern and southern lights shimmer from ~110–500 km" },
  { km: 125, label: "Turbopause", detail: "Below this line, turbulent winds keep all atmospheric gases uniformly mixed; above it, each gas separates by molecular weight, lighter atoms float up, heavier ones sink" },
  { km: 150, label: "Atomic oxygen zone", detail: "Single oxygen atoms become common here and can slowly erode spacecraft surfaces" },
  { km: 175, label: "Days to reentry", detail: "Without regular boosts, an object this low can drop out of orbit within days" },
  { km: 200, label: "Very low Earth orbit", detail: "This is the threshold of VLEO, a region explored for sharper satellite imagery, lower latency (return orbit), and just enough air for aerodynamics to still work" },
  { km: 225, label: "One-trillionth sea level pressure", detail: "Air density here is roughly one-trillionth of sea level, thinner than the best laboratory vacuums achievable a century ago" },
  { km: 250, label: "Upper thermosphere", detail: "\"Temperature\" only really describes how fast particles are moving here, not how warm it would feel to your body" },
  { km: 275, label: "Atomic oxygen erosion", detail: "Highly reactive atomic oxygen at these altitudes slowly etches spacecraft surfaces, degrading solar panels and thermal coatings over months and years" },
  { km: 300, label: "Auroral peak activity", detail: "Some of the brightest auroral curtains and arcs form in this altitude range" },
  { km: 325, label: "Red aurora crown", detail: "The deep crimson glow at the top of tall auroral rays forms here; oxygen atoms, energized by solar electrons, radiate at 630 nm before slowly cooling" },
  { km: 350, label: "Orbital drag still matters", detail: "Even here, trace atmosphere steadily slows satellites unless they boost their orbit" },
  { km: 375, label: "Still falling", detail: "Gravity here is about 88% of surface gravity; astronauts feel weightless not because gravity is absent, but because they are in continuous free fall around Earth, always falling, never landing" },
  { km: 408, label: "International Space Station", detail: "Orbiting at ~408 km, still technically in the atmosphere" },
  { km: 425, label: "Polar orbit band", detail: "Polar-orbiting satellites here circle Earth from pole to pole every ~93 minutes, scanning the entire planet's surface within 24 hours; most weather and Earth-observation satellites operate in this band" },
  { km: 450, label: "Exosphere starts to dominate", detail: "Molecules can travel long distances without colliding, and some escape Earth altogether" },
  { km: 475, label: "Radiation intensifies", detail: "The inner Van Allen belt begins to encroach here; astronauts accumulate roughly 10× the annual radiation dose of people on the ground, even inside a shielded spacecraft" },
  { km: 500, label: "Thermopause", detail: "Above here is the exosphere, where the atmosphere fades into the vacuum of space", isBoundary: true },
  { km: 525, label: "Molecules in free flight", detail: "Air is so diffuse here that individual molecules can travel hundreds of kilometers before colliding with another; the classical idea of \"air\" is dissolving into interplanetary space" },
  { km: 550, label: "Almost space, still atmosphere", detail: "The air is extraordinarily sparse here, but the Earth's atmosphere still has not cleanly ended; you'd have to go about 20x the distance you just traveled to reach the edge of the exosphere" },
];


// ─── Chapter Breaks ──────────────────────────────────────────────────
// Each boundary has an array of lines that scroll through one at a time.
const CHAPTER_BREAKS = {
  5: {
    lines: [
      "Welcome to the troposphere. This is the lowest layer (the first 10–12 km) of the atmosphere.",
      "As you climb up, temperature decreases, so warmer, less dense air sits under colder, denser air. This leads to convection, like a lava lamp.",
      "This convection means that the troposphere is where almost all weather occurs: clouds, rain, turbulence, storms.",
    ],
  },
  12: {
    lines: [
      "You've reached the tropopause, at about 12 km.",
      "Below this height, it gets colder with altitude. Warm air rises, cold air sinks, and the atmosphere churns.",
      "Above it is the stratosphere. Temperature starts to increase with height, so colder, denser air sits below warmer air above.",
      "This means air is stratified, and doesn't naturally churn or convect.",
      "Planes fly near these altitudes because there's far less turbulence. But it's still incredibly windy up here. ",
    ],
  },
  25: {
    lines: [
      "At these altitudes, ozone is good. It absorbs ultraviolet radiation from the sun, acting like sunscreen for life on Earth.",
      "The 1987 Montreal Protocol phased out ozone-depleting chemicals once common in aerosol cans and refrigeration, and the ozone layer has been gradually recovering.",
      "It remains a rare example of coordinated global action reducing environmental harm before the worst outcomes became permanent.",
    ],
  },
  50: {
    lines: [
      "You've reached the stratopause, at about 50 km.",
      "You just passed through the ozone layer, a thin veil of O₃ that absorbs the sun's ultraviolet radiation.",
      "That absorption is why temperatures rose through the stratosphere.",
      "Above here, without ozone to capture sunlight, temperatures plummet again.",
    ],
  },
  85: {
    lines: [
      "You've reached the mesopause, at about 85 km.",
      "This is the coldest point in the atmosphere.",
      "Like the troposphere, the mesosphere's temperature decreases with height, allowing for mixing.",
      "Shooting stars burn up here, bits of cosmic debris incinerated by friction with the thin remaining air.",
      "Above this line, the rules change. Molecules are so sparse that temperature loses its everyday meaning.",
    ],
  },
  100: {
    lines: [
      "You've crossed the Kármán line, 100 km up.",
      "This is the internationally recognized boundary of space.",
      "Below here, aerodynamics works. Above here, only orbital mechanics matter.",
      "And yet, the atmosphere doesn't truly end. It just fades out exponentially.",
    ],
  },
  250: {
    lines: [
      "This high up, temperature stops meaning what it does on Earth.",
      "Temperature is the measure of the average kinetic energy of gas molecules. The gas here can have a very high temperature because the few molecules that remain are moving extremely fast, since they've absorbed lots of energy from the sun.",
      "But there are so few of them that they wouldn't be able to transfer any meaningful amount of heat to your body or spacesuit by collision. (That's also why there's no sound in space; there's not enough air to carry sound waves.)",
      "If you were out here without protection, you wouldn't feel hot from the surrounding gas the way you would in hot air on Earth. Instead, your body would gain or lose heat mostly through radiation, largely based on how exposed you were to sunlight.",
      "For an astronaut in the vacuum of space, direct sunlight can warm the outside of a spacesuit to about 121°C (250°F), while deep shade can cool it down to about −157°C (−250°F).",
      "That's why spacesuits use reflective outer layers, heavy insulation, and active cooling systems to manage enormous swings between sun and shade.",
    ],
  },
  500: {
    lines: [
      "You've reached the thermopause — the top of the thermosphere, around 500 km up.",
      "Its height shifts depending on solar activity, from about 200 km during quiet sun conditions to about 500 km when the sun is more active.",
      "Like all of these boundaries, it's more of a moving frontier than a fixed shell."
    ],
  },
};

const CHAPTER_BREAK_KMS = Object.keys(CHAPTER_BREAKS).map(Number);
const GRAPH_NODE_KMS = Array.from(
  new Set([...landmarks.map((landmark) => landmark.km), ...CHAPTER_BREAK_KMS])
).sort((a, b) => a - b);

// ─── Physics Helpers ─────────────────────────────────────────────────
function getTemperature(km) {
  if (km <= 12) return 15 - 6.5 * km;
  if (km <= 20) return -56.5;
  if (km <= 50) return -56.5 + ((km - 20) / 30) * 56.5;
  if (km <= 85) return 0 - ((km - 50) / 35) * 90;
  if (km <= 150) return -90 + ((km - 85) / 65) * 590;
  return 500 + ((km - 150) / 350) * 1000;
}

function getPressure(km) {
  return 1013 * Math.exp(-km / 8.5);
}

function cToF(celsius) {
  return (celsius * 9) / 5 + 32;
}

function normalizeWheelDelta(event) {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function formatTempWithF(celsius, digits = 0) {
  const fahrenheit = cToF(celsius);
  return `${celsius.toFixed(digits)}°C (${fahrenheit.toFixed(digits)}°F)`;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Color Helpers ───────────────────────────────────────────────────
function lerpColor(a, b, t) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function getBackgroundColor(km) {
  if (km < 5) return lerpColor([166, 210, 240], [120, 180, 230], km / 5);
  if (km < 12) return lerpColor([120, 180, 230], [70, 120, 200], (km - 5) / 7);
  if (km < 30) return lerpColor([70, 120, 200], [30, 50, 140], (km - 12) / 18);
  if (km < 60) return lerpColor([30, 50, 140], [15, 20, 80], (km - 30) / 30);
  if (km < 100) return lerpColor([15, 20, 80], [5, 5, 30], (km - 60) / 40);
  return "rgb(3, 3, 15)";
}

function getTextColor(km) {
  if (km < 20) return "rgba(30, 40, 80, 0.9)";
  if (km < 50) return "rgba(200, 210, 240, 0.9)";
  return "rgba(220, 225, 245, 0.9)";
}

function getSubtextColor(km) {
  if (km < 20) return "rgba(80, 90, 120, 0.75)";
  if (km < 50) return "rgba(160, 170, 200, 0.7)";
  return "rgba(180, 185, 210, 0.65)";
}

function getTemperatureTrendColor(km) {
  if (km < 12) return "rgba(150, 210, 255, 0.95)";
  if (km < 50) return "rgba(255, 170, 120, 0.95)";
  if (km < 85) return "rgba(150, 210, 255, 0.95)";
  return "rgba(255, 170, 120, 0.95)";
}

function getLayerLabelOffset(layerName, compact, phone) {
  if (phone) {
    if (layerName === "Troposphere") return -18;
    if (layerName === "Stratosphere") return -6;
    if (layerName === "Mesosphere") return 8;
    if (layerName === "Thermosphere") return 26;
    return 0;
  }

  if (compact) {
    if (layerName === "Troposphere") return -10;
    if (layerName === "Stratosphere") return -2;
    if (layerName === "Mesosphere") return 10;
    if (layerName === "Thermosphere") return 22;
  }

  return 0;
}

function getLandmarkOffset(km, compact, phone) {
  if (phone) {
    if (km <= 12) return 0;
    if (km < 60) return 4;
    if (km < 100) return 8;
    return 14;
  }

  if (compact) {
    if (km <= 12) return 0;
    if (km < 60) return 8;
    if (km < 100) return 16;
    return 28;
  }

  if (km >= 100) return 32;
  if (km >= 80) return 18;
  return 0;
}

// ─── Chapter Overlay (scroll-driven, no pause) ───────────────────────
// Progress 0→1 is derived directly from currentKm so the background
// never stops; lines scroll bottom-to-top as you pass through.
function ChapterOverlay({ chapter, progress, compact }) {
  if (!chapter) return null;

  const lineCount = chapter.lines.length;
  const mobileChapterLeft = `calc(${MOBILE_TEMP_OVERLAY_WIDTH}px + (100vw - ${MOBILE_TEMP_OVERLAY_WIDTH}px) * 0.05)`;
  const mobileChapterRight = `calc((100vw - ${MOBILE_TEMP_OVERLAY_WIDTH}px) * 0.05)`;
  const sliceSize = 1 / lineCount;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, overflow: "hidden", pointerEvents: "none" }}>
      {chapter.lines.map((line, i) => {
        const overlap = 0.3;
        const effectiveSlice = sliceSize + overlap * sliceSize;
        const lineStart = i * sliceSize - overlap * sliceSize * 0.5;
        const t = Math.max(0, Math.min(1, (progress - lineStart) / effectiveSlice));
        const wasPassed = t >= 0.999;

        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const yPercent = -15 + eased * 130;
        let opacity = 0;
        if (t > 0 && t < 0.15) opacity = t / 0.15;
        else if (t >= 0.15 && t <= 0.85) opacity = 1;
        else if (t > 0.85 && t < 1) opacity = (1 - t) / 0.15;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: compact ? mobileChapterLeft : 0,
              right: compact ? mobileChapterRight : 0,
              top: yPercent + "%",
              transform: "translateY(-50%)",
              textAlign: compact ? "left" : "center",
              padding: compact ? 0 : "0 40px",
              opacity,
              zIndex: t > 0 && t < 1 ? 2 : wasPassed ? 0 : 1,
              willChange: "transform, opacity",
            }}
          >
            <div
              style={{
                fontFamily: "'Roboto Mono', monospace",
                fontSize: compact ? "16px" : "18px",
                lineHeight: 1.55,
                color: "rgba(255,225,160,1)",
                maxWidth: compact ? "none" : 400,
                margin: compact ? 0 : "0 auto",
                textAlign: "left",
                background: "rgba(0, 0, 0, 0.35)",
                padding: compact ? "10px 12px" : "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Temperature Profile SVG (draggable) ─────────────────────────────
function TempProfile({ currentKm, showClimate, onDragAltitude, onDragStateChange, compact, fullHeight, topOffset, availableHeight }) {
  const minimalMobileRail = fullHeight;
  const svgWidth = fullHeight ? 32 : compact ? 54 : 86;
  const svgHeight = Math.max(availableHeight, fullHeight ? 320 : compact ? 280 : 420);
  const headerBand = fullHeight ? 0 : 8;
  const padding = fullHeight
    ? { top: 18, bottom: 18, left: 7, right: 7 }
    : { top: 46, bottom: 24, left: 10, right: 10 };
  const plotW = svgWidth - padding.left - padding.right;
  const plotH = svgHeight - padding.top - padding.bottom;
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const samples = useMemo(() => {
    const pts = [];
    const altitudes = [
      0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60,
      65, 70, 75, 80, 85, 90, 100, 120, 150, 200, 300, 400, 500, 550,
    ];
    for (const km of altitudes) {
      pts.push({ km, temp: getTemperature(km) });
    }
    return pts;
  }, []);

  const minTemp = -100;
  const maxTemp = 1500;

  const tempToX = (t) =>
    padding.left + ((t - minTemp) / (maxTemp - minTemp)) * plotW;
  const kmToY = (km) =>
    padding.top + plotH - (km / MAX_ALTITUDE_KM) * plotH;
  const yToKm = (y) =>
    Math.max(0, Math.min(MAX_ALTITUDE_KM, ((padding.top + plotH - y) / plotH) * MAX_ALTITUDE_KM));

  const eventToAltitude = useCallback(
    (e) => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const svgY = clientY - rect.top;
      return Math.max(
        0,
        Math.min(MAX_ALTITUDE_KM, ((padding.top + plotH - svgY) / plotH) * MAX_ALTITUDE_KM)
      );
    },
    [padding.top, plotH]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      e.preventDefault();
      const km = eventToAltitude(e);
      if (km !== null) onDragAltitude(km);
    };

    const handleEnd = () => setIsDragging(false);
    const handleVisibilityChange = () => {
      if (document.hidden) setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);
    window.addEventListener("blur", handleEnd);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
      window.removeEventListener("blur", handleEnd);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDragging, eventToAltitude, onDragAltitude]);

  useEffect(() => {
    onDragStateChange?.(isDragging);
    return () => onDragStateChange?.(false);
  }, [isDragging, onDragStateChange]);

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const km = eventToAltitude(e);
    if (km !== null) onDragAltitude(km);
  };

  const pathD = samples
    .map((p, i) => {
      const x = tempToX(Math.min(Math.max(p.temp, minTemp), maxTemp));
      const y = kmToY(p.km);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const curTemp = getTemperature(currentKm);
  const curX = tempToX(Math.min(Math.max(curTemp, minTemp), maxTemp));
  const curY = kmToY(Math.min(currentKm, MAX_ALTITUDE_KM));
  const graphNodes = useMemo(
    () =>
      GRAPH_NODE_KMS.map((km) => {
        const temp = getTemperature(km);
        return {
          km,
          x: tempToX(Math.min(Math.max(temp, minTemp), maxTemp)),
          y: kmToY(km),
          isChapter: CHAPTER_BREAK_KMS.includes(km),
        };
      }).filter((node) => ![10, 20, 85].includes(node.km)),
    [kmToY]
  );

  const boundaries = [12, 50, 85, 500];

  return (
    <div
      style={{
        position: "fixed",
        left: fullHeight ? 0 : compact ? 6 : 8,
        top: fullHeight ? topOffset : topOffset,
        bottom: fullHeight ? 8 : "auto",
        width: fullHeight ? 40 : "auto",
        transform: "none",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: fullHeight ? "flex-start" : "center",
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            display: "block",
            overflow: "hidden",
            background: minimalMobileRail ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.35)",
            borderRadius: minimalMobileRail ? 10 : 10,
            border: minimalMobileRail
              ? "1px solid rgba(255,255,255,0.1)"
              : isDragging
                ? "1px solid rgba(255,200,100,0.45)"
                : "1px solid rgba(255,255,255,0.12)",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            pointerEvents: "auto",
          }}
        >
          {!minimalMobileRail && (
            <>
              {CHAPTER_BREAK_KMS.map((km) => (
                <line
                  key={`temp-chapter-${km}`}
                  x1={0}
                  y1={kmToY(km)}
                  x2={svgWidth}
                  y2={kmToY(km)}
                  stroke="rgba(255,225,160,0.42)"
                  strokeWidth="1.2"
                />
              ))}

              <text
                x={svgWidth / 2}
                y={headerBand}
                fill="rgba(255,255,255,0.52)"
                fontSize="12"
                fontFamily="'Roboto Mono', monospace"
                letterSpacing="1.2"
                textAnchor="middle"
                dominantBaseline="hanging"
              >
                TEMP
              </text>
              <text
                x={padding.left + 7}
                y={svgHeight / 2}
                fill="rgba(255,255,255,0.34)"
                fontSize="12"
                fontFamily="'Roboto Mono', monospace"
                letterSpacing="0.8"
                textAnchor="middle"
                transform={`rotate(-90 ${padding.left + 7} ${svgHeight / 2})`}
              >
                COLDER
              </text>
              <text
                x={svgWidth - padding.right - 7}
                y={svgHeight / 2}
                fill="rgba(255,255,255,0.34)"
                fontSize="12"
                fontFamily="'Roboto Mono', monospace"
                letterSpacing="0.8"
                textAnchor="middle"
                transform={`rotate(90 ${svgWidth - padding.right - 7} ${svgHeight / 2})`}
              >
                WARMER
              </text>

            </>
          )}

          {/* fill: bottom of SVG → current altitude, like a graduated cylinder */}
          <rect
            x={0}
            y={curY}
            width={svgWidth}
            height={svgHeight - curY}
            fill="rgba(90, 160, 210, 0.26)"
          />

          {minimalMobileRail &&
            CHAPTER_BREAK_KMS.map((km) => {
              const y = kmToY(km);
              return (
                <line
                  key={`mobile-chapter-${km}`}
                  x1={0}
                  y1={y}
                  x2={svgWidth}
                  y2={y}
                  stroke="rgba(255,225,160,0.85)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              );
            })}

          <path d={pathD} fill="none" stroke="rgba(255,180,100,0.78)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

          {graphNodes.map((node) => (
            <circle
              key={`temp-node-${node.km}`}
              cx={node.x}
              cy={node.y}
              r={minimalMobileRail ? 2.1 : 2.8}
              fill={node.isChapter ? "rgba(255,225,160,0.95)" : "rgba(255,255,255,0.78)"}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.9}
              opacity={minimalMobileRail && !node.isChapter ? 0.75 : 1}
              pointerEvents="none"
            />
          ))}

          {showClimate && !minimalMobileRail && (
            <path
              d={samples
                .map((p, i) => {
                  let shiftedTemp = p.temp;
                  if (p.km <= 12) shiftedTemp += 2.5 - p.km * 0.08;
                  else if (p.km <= 50) shiftedTemp -= 1.5;
                  else if (p.km <= 85) shiftedTemp -= 2;
                  else shiftedTemp -= 4;
                  const x = tempToX(Math.min(Math.max(shiftedTemp, minTemp), maxTemp));
                  const y = kmToY(p.km);
                  return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none" stroke="rgba(255,90,50,0.55)" strokeWidth="2.8" strokeDasharray="3,2" strokeLinecap="round"
            />
          )}

          {isDragging && !minimalMobileRail && (
            <circle cx={curX} cy={curY} r="12" fill="rgba(255,200,100,0.15)" />
          )}
          <circle
            cx={curX} cy={curY} r={isDragging ? 6 : 4.5}
            fill={isDragging ? "rgba(255,220,130,1)" : "rgba(255,200,100,0.9)"}
            stroke="rgba(255,255,255,0.6)" strokeWidth={isDragging ? 1.5 : 1}
          />

          {!minimalMobileRail && (
            <>
              {showClimate && (
                <>
                  <line x1={padding.left + 6} y1={svgHeight - 34} x2={padding.left + 20} y2={svgHeight - 34} stroke="rgba(255,180,100,0.7)" strokeWidth="2" />
                  <text x={padding.left + 24} y={svgHeight - 31} fill="rgba(255,255,255,0.5)" fontSize={compact ? "11" : "12"} fontFamily="'Roboto Mono', monospace">Now</text>
                  <line x1={padding.left + 6} y1={svgHeight - 18} x2={padding.left + 20} y2={svgHeight - 18} stroke="rgba(255,90,50,0.55)" strokeWidth="2" strokeDasharray="3,2" />
                  <text x={padding.left + 24} y={svgHeight - 15} fill="rgba(255,90,50,0.58)" fontSize={compact ? "11" : "12"} fontFamily="'Roboto Mono', monospace">+CO₂</text>
                </>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function AltitudeRuler({ currentKm, onDragAltitude, onDragStateChange, compact, topOffset, availableHeight, width }) {
  const rulerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const rulerTicks = [0, 10, 20, 50, 85, 100, 200, 300, 400, 500];
  const rulerHeight = Math.max(availableHeight, 420); // same floor as TempProfile
  const rulerWidth = width ?? (compact ? 68 : 90);
  const rulerInset = compact ? 14 : 16;  // bottom inset + tick left anchor
  const trackTopY = 46;                  // matches TempProfile padding.top exactly
  const trackH = rulerHeight - trackTopY - rulerInset; // active track span
  const graphNodes = useMemo(
    () =>
      GRAPH_NODE_KMS.map((km) => ({
        km,
        bottomOffset: (km / MAX_ALTITUDE_KM) * trackH + rulerInset,
        isChapter: CHAPTER_BREAK_KMS.includes(km),
      })),
    [trackH, rulerInset]
  );

  const eventToAltitude = useCallback((e) => {
    if (!rulerRef.current) return null;
    const rect = rulerRef.current.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const localTrackY = clientY - rect.top - trackTopY;
    const clampedTrackY = Math.max(0, Math.min(trackH, localTrackY));
    const pctFromBottom = 1 - clampedTrackY / trackH;
    return Math.max(0, Math.min(MAX_ALTITUDE_KM, pctFromBottom * MAX_ALTITUDE_KM));
  }, [trackH, trackTopY]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      e.preventDefault();
      const km = eventToAltitude(e);
      if (km !== null) onDragAltitude(km);
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, eventToAltitude, onDragAltitude]);

  useEffect(() => {
    onDragStateChange?.(isDragging);
    return () => onDragStateChange?.(false);
  }, [isDragging, onDragStateChange]);

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const km = eventToAltitude(e);
    if (km !== null) onDragAltitude(km);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        top: topOffset + availableHeight / 2,
        transform: "translateY(-50%)",
        height: rulerHeight,
        width: rulerWidth,
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      <div
        ref={rulerRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.28)",
          border: isDragging
            ? "1px solid rgba(120,190,255,0.45)"
            : "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          pointerEvents: "auto",
        }}
      >
        {/* fill: bottom of ruler → current altitude, like a graduated cylinder */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: (currentKm / MAX_ALTITUDE_KM) * trackH + rulerInset,
            background: "rgba(90, 160, 210, 0.26)",
            borderRadius: "0 0 12px 12px",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: compact ? 13 : 16,
            top: trackTopY,
            bottom: rulerInset,
            width: 2,
            background: "rgba(255,255,255,0.18)",
          }}
        />

        {CHAPTER_BREAK_KMS.map((km) => {
          const bottomOffset = (km / MAX_ALTITUDE_KM) * trackH + rulerInset;
          return (
            <div
              key={`ruler-chapter-${km}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: bottomOffset,
                height: 0,
                borderTop: "1.2px solid rgba(255,225,160,0.42)",
                pointerEvents: "none",
              }}
            />
          );
        })}

        {graphNodes.map((node) => (
          <div
            key={`ruler-node-${node.km}`}
            style={{
              position: "absolute",
              bottom: node.bottomOffset,
              left: compact ? 14 : 17,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: node.isChapter ? "rgba(170,220,255,0.96)" : "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.55)",
              transform: "translate(-50%, 50%)",
              pointerEvents: "none",
              boxShadow: node.isChapter ? "0 0 0 2px rgba(70,120,180,0.2)" : "none",
            }}
          />
        ))}

        {rulerTicks.map((km) => {
          const bottomOffset = (km / MAX_ALTITUDE_KM) * trackH + rulerInset;
          const isMajor = km === 0 || km === 100 || km === 200 || km === 400;
          return (
            <div key={km} style={{ position: "absolute", bottom: bottomOffset, left: compact ? 13 : 16, transform: "translateY(50%)" }}>
              <div
                style={{
                  width: isMajor ? 12 : 8,
                  height: 2,
                  background: isMajor ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.22)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: isMajor ? 16 : 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: isMajor ? (compact ? "12px" : "13px") : (compact ? "12px" : "13px"),
                  lineHeight: 1,
                  fontFamily: "'Roboto Mono', monospace",
                  color: isMajor ? "rgba(255,255,255,0.56)" : "rgba(255,255,255,0.38)",
                  whiteSpace: "nowrap",
                }}
              >
                {km} km
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            bottom: Math.min(1, currentKm / MAX_ALTITUDE_KM) * trackH + rulerInset,
            left: compact ? 14 : 17,
            transform: "translate(-50%, 50%)",
            width: 0,
            height: 0,
          }}
        >
          {isDragging && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "rgba(120,190,255,0.18)",
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: isDragging ? 10 : 8,
              height: isDragging ? 10 : 8,
              borderRadius: "50%",
              background: currentKm < 20
                ? "rgba(135, 206, 235, 0.9)"
                : currentKm < 60
                ? "rgba(100, 140, 220, 0.9)"
                : "rgba(150, 130, 255, 0.82)",
              border: "1px solid rgba(255,255,255,0.72)",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: 8,   // matches TEMP label y=8 in TempProfile
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: "12px",
            fontFamily: "'Roboto Mono', monospace",
            color: "rgba(255,255,255,0.52)",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          HEIGHT
        </div>
      </div>
    </div>
  );
}

// ─── UFO ─────────────────────────────────────────────────────────────
function PixelUFO({ oceanHeight, isPhone, hudHeight }) {
  // Midpoint of the 400px buffer zone above the 550km line.
  // On mobile, shift down by the HUD height so it isn't hidden behind it.
  const bottom = altitudeToPixels(MAX_ALTITUDE_KM) + oceanHeight + 200 - (isPhone ? hudHeight : 0);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 3,
        animation: "ufo-bob 4s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes ufo-bob {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50%       { transform: translateX(-50%) translateY(-18px); }
        }
      `}</style>
      <svg width="56" height="28" viewBox="0 0 56 28" shapeRendering="crispEdges" aria-hidden="true">
        {/* Dome — blue glass */}
        <g fill="#50b4e0">
          <rect x="20" y="0"  width="16" height="4" />
          <rect x="18" y="4"  width="20" height="4" />
          <rect x="16" y="8"  width="24" height="3" />
        </g>
        {/* Dome highlight */}
        <g fill="#90d8f8">
          <rect x="22" y="1"  width="6"  height="2" />
          <rect x="20" y="5"  width="5"  height="2" />
        </g>
        {/* Hull — metallic grey */}
        <g fill="#b8c8d8">
          <rect x="12" y="10" width="32" height="4" />
          <rect x="2"  y="14" width="52" height="6" />
        </g>
        {/* Hull shading — darker underside */}
        <g fill="#8aa0b2">
          <rect x="8"  y="20" width="40" height="3" />
          <rect x="16" y="22" width="24" height="2" />
          <rect x="20" y="24" width="16" height="2" />
        </g>
        {/* Hull highlight strip */}
        <g fill="#d8e8f4">
          <rect x="4"  y="14" width="48" height="2" />
        </g>
        {/* Lights */}
        <rect x="10" y="20" width="4" height="3" fill="#f8d040" />
        <rect x="26" y="20" width="4" height="3" fill="#60e880" />
        <rect x="42" y="20" width="4" height="3" fill="#f07030" />
      </svg>
    </div>
  );
}

// ─── Pixel Octopus ───────────────────────────────────────────────────
function PixelJellyfish({ oceanHeight, left = "68%", bottomFraction = 0.62, width = 38, height = 52, delay = "0s" }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom: Math.round(oceanHeight * bottomFraction),
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 2,
        animation: `jellyfish-bob 3.5s ease-in-out ${delay} infinite`,
      }}
    >
      <style>{`
        @keyframes jellyfish-bob {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50%       { transform: translateX(-50%) translateY(-12px); }
        }
      `}</style>
      <svg width={width} height={height} viewBox="0 0 48 66" shapeRendering="crispEdges" aria-hidden="true">
        {/* Bell — outer body */}
        <g fill="#7838a8">
          <rect x="16" y="0"  width="16" height="4" />
          <rect x="10" y="4"  width="28" height="4" />
          <rect x="6"  y="8"  width="36" height="4" />
          <rect x="4"  y="12" width="40" height="4" />
          <rect x="2"  y="16" width="44" height="4" />
          <rect x="2"  y="20" width="44" height="4" />
          <rect x="2"  y="24" width="44" height="4" />
          <rect x="4"  y="28" width="40" height="4" />
        </g>
        {/* Bell — inner bioluminescent glow */}
        <g fill="#c060e0">
          <rect x="18" y="4"  width="12" height="4" />
          <rect x="14" y="8"  width="20" height="4" />
          <rect x="12" y="12" width="24" height="4" />
          <rect x="12" y="16" width="24" height="4" />
          <rect x="14" y="20" width="20" height="4" />
          <rect x="16" y="24" width="16" height="4" />
        </g>
        {/* Bell — bright core */}
        <g fill="#e880f8">
          <rect x="20" y="8"  width="8"  height="4" />
          <rect x="18" y="12" width="12" height="4" />
          <rect x="18" y="16" width="12" height="4" />
          <rect x="20" y="20" width="8"  height="4" />
        </g>
        {/* Bell — top highlight */}
        <g fill="#d0a0f0">
          <rect x="18" y="1"  width="8"  height="2" />
          <rect x="12" y="5"  width="6"  height="2" />
        </g>
        {/* Bell — frilly bottom edge */}
        <g fill="#9848c8">
          <rect x="4"  y="32" width="6"  height="4" />
          <rect x="14" y="32" width="6"  height="6" />
          <rect x="24" y="32" width="6"  height="4" />
          <rect x="34" y="32" width="6"  height="6" />
          <rect x="40" y="32" width="4"  height="4" />
        </g>
        {/* Tentacles — thin (2px), long, wavy */}
        <g fill="#a050c8">
          {/* T1 */}
          <rect x="7"  y="38" width="2" height="4" /><rect x="5"  y="42" width="2" height="4" /><rect x="7"  y="46" width="2" height="4" /><rect x="5"  y="50" width="2" height="4" /><rect x="7"  y="54" width="2" height="4" /><rect x="5"  y="58" width="2" height="4" />
          {/* T2 */}
          <rect x="14" y="36" width="2" height="4" /><rect x="16" y="40" width="2" height="4" /><rect x="14" y="44" width="2" height="4" /><rect x="16" y="48" width="2" height="4" /><rect x="14" y="52" width="2" height="4" /><rect x="16" y="56" width="2" height="4" />
          {/* T3 */}
          <rect x="21" y="38" width="2" height="4" /><rect x="19" y="42" width="2" height="4" /><rect x="21" y="46" width="2" height="4" /><rect x="19" y="50" width="2" height="4" /><rect x="21" y="54" width="2" height="4" /><rect x="19" y="58" width="2" height="4" />
          {/* T4 — center */}
          <rect x="27" y="36" width="2" height="4" /><rect x="25" y="40" width="2" height="4" /><rect x="27" y="44" width="2" height="4" /><rect x="25" y="48" width="2" height="4" /><rect x="27" y="52" width="2" height="4" /><rect x="25" y="56" width="2" height="4" />
          {/* T5 */}
          <rect x="33" y="38" width="2" height="4" /><rect x="35" y="42" width="2" height="4" /><rect x="33" y="46" width="2" height="4" /><rect x="35" y="50" width="2" height="4" /><rect x="33" y="54" width="2" height="4" /><rect x="35" y="58" width="2" height="4" />
          {/* T6 */}
          <rect x="40" y="36" width="2" height="4" /><rect x="38" y="40" width="2" height="4" /><rect x="40" y="44" width="2" height="4" /><rect x="38" y="48" width="2" height="4" /><rect x="40" y="52" width="2" height="4" /><rect x="38" y="56" width="2" height="4" />
        </g>
        {/* Tentacle bioluminescent nodes */}
        <g fill="#e090ff">
          <rect x="6"  y="44" width="2" height="2" />
          <rect x="15" y="42" width="2" height="2" />
          <rect x="20" y="48" width="2" height="2" />
          <rect x="26" y="44" width="2" height="2" />
          <rect x="34" y="50" width="2" height="2" />
          <rect x="39" y="44" width="2" height="2" />
        </g>
      </svg>
    </div>
  );
}

// ─── Pixel ISS (408 km) ──────────────────────────────────────────────
function PixelISS({ oceanHeight }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "54%",
        bottom: altitudeToPixels(408) + oceanHeight + 20,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 3,
        opacity: 0.92,
        animation: "iss-float 6s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes iss-float {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50%       { transform: translateX(-50%) translateY(-14px); }
        }
      `}</style>
      <svg width="165" height="75" viewBox="0 0 110 50" shapeRendering="crispEdges" aria-hidden="true">
        {/* ── Main truss (horizontal backbone) ── */}
        <rect x="0"  y="20" width="110" height="6"  fill="#9aa4b2" />
        <rect x="0"  y="24" width="110" height="2"  fill="#7a848f" />

        {/* ── Far-left solar array (top + bottom) ── */}
        <rect x="2"  y="2"  width="20" height="16" fill="#1a3060" />
        <rect x="2"  y="28" width="20" height="16" fill="#1a3060" />
        {/* cell lines */}
        <g fill="#243878">
          <rect x="8"  y="2"  width="2" height="16" />
          <rect x="14" y="2"  width="2" height="16" />
          <rect x="8"  y="28" width="2" height="16" />
          <rect x="14" y="28" width="2" height="16" />
        </g>
        <rect x="2"  y="2"  width="20" height="2"  fill="#2a4888" />
        <rect x="2"  y="28" width="20" height="2"  fill="#2a4888" />

        {/* ── Near-left solar array ── */}
        <rect x="26" y="6"  width="14" height="12" fill="#1a3060" />
        <rect x="26" y="28" width="14" height="12" fill="#1a3060" />
        <g fill="#243878">
          <rect x="31" y="6"  width="2" height="12" />
          <rect x="31" y="28" width="2" height="12" />
        </g>
        <rect x="26" y="6"  width="14" height="2"  fill="#2a4888" />
        <rect x="26" y="28" width="14" height="2"  fill="#2a4888" />

        {/* ── Central module cluster ── */}
        <rect x="42" y="8"  width="26" height="8"  fill="#cdd7e2" /> {/* upper stack */}
        <rect x="40" y="16" width="30" height="12" fill="#c2ccd8" /> {/* main lab */}
        <rect x="42" y="28" width="26" height="8"  fill="#cdd7e2" /> {/* lower stack */}
        {/* highlights */}
        <rect x="42" y="8"  width="26" height="2"  fill="#e2ecf8" />
        <rect x="42" y="28" width="26" height="2"  fill="#e2ecf8" />
        {/* module shadows */}
        <rect x="40" y="26" width="30" height="2"  fill="#a8b2be" />
        {/* Cupola / windows */}
        <g fill="#7ab0d0">
          <rect x="49" y="18" width="4" height="4" />
          <rect x="55" y="18" width="4" height="4" />
        </g>
        <g fill="#c0e0f8">
          <rect x="50" y="19" width="2" height="2" />
          <rect x="56" y="19" width="2" height="2" />
        </g>
        {/* thermal radiator panels beside modules */}
        <g fill="#dce8f2">
          <rect x="36" y="13" width="4" height="8" />
          <rect x="70" y="13" width="4" height="8" />
        </g>
        <g fill="#b8ccd8">
          <rect x="36" y="19" width="4" height="2" />
          <rect x="70" y="19" width="4" height="2" />
        </g>

        {/* ── Near-right solar array ── */}
        <rect x="70" y="6"  width="14" height="12" fill="#1a3060" />
        <rect x="70" y="28" width="14" height="12" fill="#1a3060" />
        <g fill="#243878">
          <rect x="77" y="6"  width="2" height="12" />
          <rect x="77" y="28" width="2" height="12" />
        </g>
        <rect x="70" y="6"  width="14" height="2"  fill="#2a4888" />
        <rect x="70" y="28" width="14" height="2"  fill="#2a4888" />

        {/* ── Far-right solar array ── */}
        <rect x="88" y="2"  width="20" height="16" fill="#1a3060" />
        <rect x="88" y="28" width="20" height="16" fill="#1a3060" />
        <g fill="#243878">
          <rect x="94" y="2"  width="2" height="16" />
          <rect x="100" y="2" width="2" height="16" />
          <rect x="94" y="28" width="2" height="16" />
          <rect x="100" y="28" width="2" height="16" />
        </g>
        <rect x="88" y="2"  width="20" height="2"  fill="#2a4888" />
        <rect x="88" y="28" width="20" height="2"  fill="#2a4888" />
      </svg>
    </div>
  );
}

function PixelSatellite({
  oceanHeight,
  km,
  left,
  scale = 1,
  opacity = 0.92,
  delay = "0s",
  duration = "18s",
}) {
  const width = 68 * scale;
  const height = 36 * scale;

  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom: altitudeToPixels(km) + oceanHeight,
        width,
        height,
        transform: "translateX(-50%)",
        transformOrigin: "center",
        pointerEvents: "none",
        zIndex: 4,
        opacity,
        animation: `satellite-orbit ${duration} linear infinite`,
        animationDelay: delay,
      }}
    >
      <style>{`
        @keyframes satellite-orbit {
          0% { transform: translateX(-50%) translateX(-12vw); }
          100% { transform: translateX(-50%) translateX(12vw); }
        }
      `}</style>
      <svg
        width={width}
        height={height}
        viewBox="0 0 68 36"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="0" y="8" width="18" height="8" fill="#183766" />
        <rect x="50" y="20" width="18" height="8" fill="#183766" />
        <g fill="#2c5a96">
          <rect x="4" y="8" width="2" height="8" />
          <rect x="9" y="8" width="2" height="8" />
          <rect x="14" y="8" width="2" height="8" />
          <rect x="54" y="20" width="2" height="8" />
          <rect x="59" y="20" width="2" height="8" />
          <rect x="64" y="20" width="2" height="8" />
        </g>
        <rect x="18" y="11" width="11" height="2" fill="#8d98a5" />
        <rect x="39" y="23" width="11" height="2" fill="#8d98a5" />
        <rect x="26" y="9" width="16" height="16" fill="#cfd7e3" />
        <rect x="28" y="11" width="12" height="4" fill="#e8f0fb" />
        <rect x="28" y="15" width="12" height="8" fill="#aab6c5" />
        <rect x="22" y="14" width="4" height="6" fill="#dbe4ee" />
        <rect x="42" y="14" width="4" height="6" fill="#dbe4ee" />
        <rect x="31" y="6" width="4" height="3" fill="#e3c56c" />
        <rect x="32" y="4" width="2" height="2" fill="#f6dea0" />
        <rect x="33" y="25" width="2" height="5" fill="#909aa8" />
        <rect x="30" y="30" width="8" height="2" fill="#7a848f" />
      </svg>
    </div>
  );
}

function PolarOrbitSatellites({ oceanHeight }) {
  const satellites = [
    { id: "primary", km: 425.5, left: "50%", scale: 1, opacity: 0.95, duration: "19s", delay: "0s" },
    { id: "trail-1", km: 423.5, left: "62%", scale: 0.82, opacity: 0.82, duration: "16s", delay: "-5.2s" },
    { id: "trail-2", km: 429, left: "38%", scale: 0.68, opacity: 0.74, duration: "21s", delay: "-9.1s" },
  ];

  return (
    <>
      {satellites.map((satellite) => (
        <PixelSatellite
          key={satellite.id}
          oceanHeight={oceanHeight}
          km={satellite.km}
          left={satellite.left}
          scale={satellite.scale}
          opacity={satellite.opacity}
          duration={satellite.duration}
          delay={satellite.delay}
        />
      ))}
    </>
  );
}

function PixelRadiationSign({ oceanHeight }) {
  const gridSize = 46;
  const pixel = 1.9;
  const center = gridSize / 2;
  const scale = gridSize / 25;
  const outerRadius = 11.9 * scale;
  const innerRadius = 10.0 * scale;
  const coreRadius = 2.85 * scale;
  const bladeInnerRadius = 4.45 * scale;
  const bladeOuterRadius = 8.95 * scale;
  const bladeAngles = [-90, 30, 150];

  const angleDiff = (a, b) => {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  };

  const pixels = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distance = Math.hypot(dx, dy);

      let fill = null;

      if (distance <= outerRadius) {
        fill = "#ffef1f";
      }

      if (distance <= outerRadius && distance > innerRadius) {
        fill = "#11151b";
      }

      if (distance <= bladeOuterRadius && distance >= bladeInnerRadius) {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const inBlade = bladeAngles.some((bladeAngle) => angleDiff(angle, bladeAngle) <= 24);
        if (inBlade) fill = "#11151b";
      }

      if (distance <= coreRadius) {
        fill = "#11151b";
      }

      if (!fill) continue;

      pixels.push(
        <rect
          key={`${x}-${y}`}
          x={x * pixel}
          y={y * pixel}
          width={pixel}
          height={pixel}
          fill={fill}
        />
      );
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: "69%",
        bottom: altitudeToPixels(475.5) + oceanHeight,
        width: gridSize * pixel,
        height: gridSize * pixel,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 4,
        opacity: 0.92,
      }}
    >
      <svg
        width={gridSize * pixel}
        height={gridSize * pixel}
        viewBox={`0 0 ${gridSize * pixel} ${gridSize * pixel}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {pixels}
      </svg>
    </div>
  );
}

// ─── Stars ───────────────────────────────────────────────────────────
function Stars() {
  const stars = useMemo(
    () => {
      const random = createSeededRandom(101);
      return Array.from({ length: 90 }, (_, index) => ({
        id: index,
        top: random() * 34,
        left: random() * 100,
        size: 2 + random() * 5,
        opacity: 0.22 + random() * 0.6,
      }));
    },
    []
  );

  return (
    <>
      {stars.map((star) => (
        <div
          key={star.id}
          style={{
            position: "absolute",
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            background: "rgba(255,255,255,0.95)",
            opacity: star.opacity,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function CruisingPlanes({ currentKm, topVisibleKm, oceanHeight }) {
  const isVisible = topVisibleKm >= 10 && currentKm <= 14;
  if (!isVisible) return null;

  const PLANE_DURATION = 32; // seconds — faster than clouds
  const planes = [
    { id: "lead",  leftPct: 28, bottom: altitudeToPixels(10.6) + oceanHeight + 16, width: 92,  height: 40, opacity: 0.72 },
    { id: "main",  leftPct: 52, bottom: altitudeToPixels(10)   + oceanHeight + 24, width: 112, height: 48, opacity: 0.92 },
    { id: "trail", leftPct: 74, bottom: altitudeToPixels(9.4)  + oceanHeight + 20, width: 84,  height: 36, opacity: 0.64 },
  ];

  return (
    <>
      {planes.map((plane) => (
        <div
          key={plane.id}
          style={{
            position: "absolute",
            left: -150,
            bottom: plane.bottom,
            width: plane.width,
            height: plane.height,
            pointerEvents: "none",
            zIndex: plane.id === "main" ? 3 : 2,
            opacity: plane.opacity,
            animation: `driftRight ${PLANE_DURATION}s linear infinite`,
            animationDelay: `${(-(plane.leftPct / 100) * PLANE_DURATION).toFixed(1)}s`,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 96 40"
            shapeRendering="crispEdges"
            aria-hidden="true"
            style={{ display: "block" }}
          >
            <g fill="#dce9f2">
              {/* Fuselage */}
              <rect x="10" y="15" width="68" height="12" />
              {/* Nose taper (right) */}
              <rect x="78" y="16" width="8" height="10" />
              <rect x="84" y="17" width="6" height="8" />
              <rect x="88" y="19" width="4" height="4" />
              {/* Tail body (left) */}
              <rect x="4" y="15" width="8" height="12" />
              {/* Vertical tail fin */}
              <rect x="4" y="5" width="8" height="11" />
              <rect x="6" y="1" width="6" height="6" />
              {/* Horizontal stabilizer */}
              <rect x="0" y="20" width="6" height="4" />
              {/* Wing — swept back, extends down-left from mid-fuselage */}
              <rect x="32" y="27" width="30" height="4" />
              <rect x="22" y="31" width="26" height="4" />
              <rect x="14" y="35" width="18" height="3" />
              <rect x="8" y="37" width="10" height="2" />
            </g>
            <g fill="#c7d7e3">
              {/* Fuselage underside shadow */}
              <rect x="10" y="25" width="68" height="2" />
              {/* Wing shadow line */}
              <rect x="32" y="29" width="30" height="2" />
            </g>
            <g fill="#29a8df">
              {/* Cockpit windows near nose */}
              <rect x="60" y="15" width="6" height="6" />
              <rect x="66" y="15" width="6" height="6" />
              <rect x="72" y="16" width="5" height="5" />
            </g>
            <g fill="#edf4f8">
              {/* Nose highlight */}
              <rect x="88" y="19" width="4" height="4" />
              <rect x="90" y="20" width="2" height="2" />
            </g>
          </svg>
        </div>
      ))}
    </>
  );
}

function TroposphereClouds({ oceanHeight }) {
  const clouds = useMemo(
    () => {
      const random = createSeededRandom(202);
      return Array.from({ length: 8 }, (_, index) => {
        const km = random() * 11 + 0.4;
        const left = 8 + random() * 84;
        const scale = 0.8 + random() * 0.8;
        const opacity = 0.82 + random() * 0.12;
        const speed = 0.65 + random() * 0.7; // 0.65–1.35× base speed
        return { id: index, km, left, scale, opacity, speed };
      });
    },
    []
  );

  return (
    <>
      {clouds.map((cloud) => {
        const duration = Math.round(160 / cloud.speed);
        const delay = -((cloud.left / 100) * duration);
        return (
        <div
          key={cloud.id}
          style={{
            position: "absolute",
            left: -200,
            bottom: altitudeToPixels(cloud.km) + oceanHeight,
            width: 96 * cloud.scale,
            height: 48 * cloud.scale,
            opacity: cloud.opacity,
            pointerEvents: "none",
            zIndex: 2,
            animation: `driftRight ${duration}s linear infinite`,
            animationDelay: `${delay.toFixed(1)}s`,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 96 48"
            shapeRendering="crispEdges"
            aria-hidden="true"
            style={{ display: "block", overflow: "visible" }}
          >
            <g fill="rgba(255,255,255,0.98)">
              <rect x="20" y="32" width="56" height="8" />
              <rect x="16" y="28" width="64" height="8" />
              <rect x="12" y="24" width="72" height="8" />
              <rect x="20" y="16" width="16" height="8" />
              <rect x="16" y="20" width="24" height="4" />
              <rect x="36" y="12" width="24" height="12" />
              <rect x="32" y="16" width="32" height="4" />
              <rect x="60" y="16" width="16" height="8" />
              <rect x="56" y="20" width="24" height="4" />
            </g>
            <g fill="rgba(214,234,255,0.95)">
              <rect x="20" y="40" width="56" height="4" />
              <rect x="76" y="28" width="4" height="8" />
              <rect x="16" y="36" width="4" height="4" />
            </g>
            <g fill="rgba(255,255,255,0.68)">
              <rect x="24" y="20" width="8" height="4" />
              <rect x="42" y="16" width="12" height="4" />
              <rect x="64" y="20" width="8" height="4" />
            </g>
          </svg>
        </div>
        );
      })}
    </>
  );
}

// ─── Noctilucent Clouds (76–84 km) ───────────────────────────────────
function NoctilucentClouds({ oceanHeight, isPhone, desktopLabelInset, contentRight }) {
  const left = isPhone ? "15vw" : `${desktopLabelInset}px`;
  const right = isPhone ? "5vw" : `${contentRight + 20}px`;
  return (
    <>
      {/* Formation A — 83 km, brightest */}
      <div style={{ position: "absolute", left, right, bottom: altitudeToPixels(83) + oceanHeight, height: 20, opacity: 0.86, pointerEvents: "none", zIndex: 2 }}>
        <svg width="100%" height="100%" viewBox="0 0 480 20" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0"   y="14" width="480" height="6"  fill="#2e8cb4" />
          <rect x="0"   y="10" width="480" height="4"  fill="#4eb0d0" />
          <rect x="12"  y="8"  width="56"  height="4"  fill="#4eb0d0" />
          <rect x="108" y="6"  width="72"  height="6"  fill="#4eb0d0" />
          <rect x="208" y="8"  width="60"  height="4"  fill="#4eb0d0" />
          <rect x="308" y="6"  width="72"  height="6"  fill="#4eb0d0" />
          <rect x="408" y="8"  width="52"  height="4"  fill="#4eb0d0" />
          <rect x="16"  y="6"  width="46"  height="4"  fill="#80cce8" />
          <rect x="114" y="4"  width="60"  height="4"  fill="#80cce8" />
          <rect x="214" y="6"  width="48"  height="4"  fill="#80cce8" />
          <rect x="314" y="4"  width="60"  height="4"  fill="#80cce8" />
          <rect x="412" y="6"  width="42"  height="4"  fill="#80cce8" />
          <rect x="22"  y="4"  width="30"  height="4"  fill="#b8e6f8" />
          <rect x="122" y="2"  width="44"  height="4"  fill="#b8e6f8" />
          <rect x="220" y="4"  width="34"  height="4"  fill="#b8e6f8" />
          <rect x="322" y="2"  width="44"  height="4"  fill="#b8e6f8" />
          <rect x="418" y="4"  width="28"  height="4"  fill="#b8e6f8" />
          <rect x="130" y="0"  width="28"  height="4"  fill="#d8f2ff" />
          <rect x="330" y="0"  width="28"  height="4"  fill="#d8f2ff" />
        </svg>
      </div>

      {/* Formation B — 80 km, medium opacity */}
      <div style={{ position: "absolute", left, right, bottom: altitudeToPixels(80) + oceanHeight, height: 18, opacity: 0.72, pointerEvents: "none", zIndex: 2 }}>
        <svg width="100%" height="100%" viewBox="0 0 420 18" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0"   y="12" width="420" height="6"  fill="#2e8cb4" />
          <rect x="0"   y="8"  width="420" height="4"  fill="#4eb0d0" />
          <rect x="10"  y="6"  width="64"  height="4"  fill="#4eb0d0" />
          <rect x="112" y="4"  width="76"  height="6"  fill="#4eb0d0" />
          <rect x="228" y="6"  width="64"  height="4"  fill="#4eb0d0" />
          <rect x="332" y="4"  width="76"  height="6"  fill="#4eb0d0" />
          <rect x="14"  y="4"  width="54"  height="4"  fill="#80cce8" />
          <rect x="118" y="2"  width="62"  height="4"  fill="#80cce8" />
          <rect x="234" y="4"  width="52"  height="4"  fill="#80cce8" />
          <rect x="338" y="2"  width="62"  height="4"  fill="#80cce8" />
          <rect x="124" y="0"  width="46"  height="4"  fill="#b8e6f8" />
          <rect x="344" y="0"  width="46"  height="4"  fill="#b8e6f8" />
        </svg>
      </div>

      {/* Formation C — 77 km, dimmest */}
      <div style={{ position: "absolute", left, right, bottom: altitudeToPixels(77) + oceanHeight, height: 16, opacity: 0.58, pointerEvents: "none", zIndex: 2 }}>
        <svg width="100%" height="100%" viewBox="0 0 500 16" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0"   y="10" width="500" height="6"  fill="#2e8cb4" />
          <rect x="0"   y="6"  width="500" height="4"  fill="#4eb0d0" />
          <rect x="0"   y="4"  width="100" height="4"  fill="#4eb0d0" />
          <rect x="158" y="2"  width="122" height="6"  fill="#4eb0d0" />
          <rect x="338" y="4"  width="102" height="4"  fill="#4eb0d0" />
          <rect x="456" y="2"  width="44"  height="6"  fill="#4eb0d0" />
          <rect x="4"   y="2"  width="86"  height="4"  fill="#80cce8" />
          <rect x="164" y="0"  width="108" height="4"  fill="#80cce8" />
          <rect x="344" y="2"  width="88"  height="4"  fill="#80cce8" />
          <rect x="460" y="0"  width="36"  height="4"  fill="#80cce8" />
        </svg>
      </div>
    </>
  );
}

// ─── Aurora Background Gradient ────────────────────────────────────────
// One viewport tall, centered on 300 km (auroral peak). Fades to
// transparent at both edges so it blends into the black scene.
// Color bands follow real aurora altitude physics:
//   bottom half: green (O at lower altitudes)
//   transition:  yellow-green → red
//   center:      deep crimson / rose (~300 km)
//   upper half:  magenta → violet → purple-indigo
function AuroraBackground({ oceanHeight, viewportHeight }) {
  const centerPx = altitudeToPixels(300) + oceanHeight;
  const half = viewportHeight / 2;
  const auroraStartPx = centerPx - half;
  const crownHeight = viewportHeight * 3.1;
  const crownPeakPx = altitudeToPixels(325) + oceanHeight;
  const crownPeakPct = 0.74;
  const crownBottomPx = crownPeakPx - crownHeight * crownPeakPct;
  const auroraHeight = Math.max(viewportHeight * 2, crownBottomPx - auroraStartPx + crownHeight);
  return (
    <>
      <style>{`
        @keyframes aurora-wave {
          0% { transform: translateX(-6%) skewX(-3deg) scaleY(0.98); }
          50% { transform: translateX(6%) skewX(3deg) scaleY(1.02); }
          100% { transform: translateX(-6%) skewX(-3deg) scaleY(0.98); }
        }

        @keyframes aurora-shimmer {
          0% { opacity: 0.2; filter: brightness(0.95) saturate(1); }
          50% { opacity: 0.42; filter: brightness(1.15) saturate(1.18); }
          100% { opacity: 0.2; filter: brightness(0.95) saturate(1); }
        }

        @keyframes aurora-scroll {
          0% { background-position: center 0px; }
          100% { background-position: center ${viewportHeight}px; }
        }

        @keyframes aurora-swirl {
          0% { transform: translateX(-4%) translateY(0%) rotate(-2deg) scale(1, 0.98); }
          50% { transform: translateX(5%) translateY(-2%) rotate(2deg) scale(1.04, 1.02); }
          100% { transform: translateX(-4%) translateY(0%) rotate(-2deg) scale(1, 0.98); }
        }

        @keyframes aurora-undulate {
          0% { transform: translateX(-2%) translateY(1%) rotate(-1deg) scale(1.01, 0.99); }
          25% { transform: translateX(1.5%) translateY(-1.5%) rotate(0.8deg) scale(1, 1.02); }
          50% { transform: translateX(3.5%) translateY(0%) rotate(1.4deg) scale(1.03, 0.98); }
          75% { transform: translateX(-1%) translateY(1.5%) rotate(-0.6deg) scale(1.01, 1.02); }
          100% { transform: translateX(-2%) translateY(1%) rotate(-1deg) scale(1.01, 0.99); }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: auroraStartPx,
          height: auroraHeight,
          overflow: "hidden",
          background: `radial-gradient(120% 58% at 18% 84%,
            rgba(80, 255, 120, 0.22) 0%,
            rgba(36, 120, 54, 0.16) 28%,
            rgba(8, 22, 12, 0) 62%
          ),
          radial-gradient(92% 44% at 72% 78%,
            rgba(150, 255, 160, 0.18) 0%,
            rgba(40, 118, 70, 0.14) 30%,
            rgba(10, 24, 16, 0) 64%
          ),
          radial-gradient(110% 54% at 34% 50%,
            rgba(212, 126, 255, 0.22) 0%,
            rgba(88, 42, 144, 0.16) 26%,
            rgba(20, 8, 34, 0) 62%
          ),
          radial-gradient(96% 34% at 52% 38%,
            rgba(172, 42, 64, 0.12) 0%,
            rgba(98, 18, 34, 0.08) 24%,
            rgba(24, 6, 14, 0) 54%
          ),
          radial-gradient(96% 42% at 78% 42%,
            rgba(124, 232, 255, 0.14) 0%,
            rgba(32, 92, 110, 0.1) 24%,
            rgba(10, 18, 28, 0) 56%
          ),
          radial-gradient(108% 48% at 56% 18%,
            rgba(172, 120, 255, 0.2) 0%,
            rgba(62, 28, 118, 0.15) 28%,
            rgba(18, 8, 32, 0) 60%
          ),
          linear-gradient(to top,
            rgba(3, 20, 8, 0) 0%,
            rgba(6, 22, 10, 0.52) 12%,
            rgba(10, 18, 14, 0.7) 28%,
            rgba(18, 12, 24, 0.78) 46%,
            rgba(28, 10, 36, 0.82) 66%,
            rgba(14, 6, 24, 0.56) 86%,
            rgba(8, 2, 20, 0) 100%
          )`,
          maskImage: "linear-gradient(to top, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 12%, black 88%, transparent 100%)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-4% -12%",
            background: `radial-gradient(88% 34% at 18% 16%,
              rgba(140, 255, 150, 0.18) 0%,
              rgba(80, 180, 90, 0.1) 30%,
              rgba(140, 255, 150, 0) 56%
            ),
            radial-gradient(72% 28% at 68% 22%,
              rgba(210, 140, 255, 0.16) 0%,
              rgba(100, 70, 180, 0.12) 34%,
              rgba(210, 140, 255, 0) 60%
            ),
            radial-gradient(94% 30% at 42% 54%,
              rgba(120, 255, 110, 0.18) 0%,
              rgba(50, 120, 60, 0.1) 32%,
              rgba(120, 255, 110, 0) 58%
            ),
            radial-gradient(104% 34% at 22% 86%,
              rgba(120, 255, 110, 0.12) 0%,
              rgba(120, 255, 110, 0.05) 26%,
              rgba(120, 255, 110, 0) 54%
            ),
            radial-gradient(84% 24% at 58% 48%,
              rgba(186, 52, 82, 0.1) 0%,
              rgba(186, 52, 82, 0.04) 22%,
              rgba(186, 52, 82, 0) 48%
            ),
            radial-gradient(88% 28% at 82% 68%,
              rgba(230, 120, 255, 0.16) 0%,
              rgba(230, 120, 255, 0.06) 24%,
              rgba(230, 120, 255, 0) 52%
            )`,
            mixBlendMode: "screen",
            opacity: 0.34,
            animation: "aurora-swirl 18s ease-in-out infinite, aurora-shimmer 5.2s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "-10% -18%",
            background: `radial-gradient(120% 20% at 18% 24%,
              rgba(120, 255, 140, 0.12) 0%,
              rgba(120, 255, 140, 0.05) 22%,
              rgba(120, 255, 140, 0) 46%
            ),
            radial-gradient(110% 18% at 72% 34%,
              rgba(210, 120, 255, 0.12) 0%,
              rgba(210, 120, 255, 0.05) 24%,
              rgba(210, 120, 255, 0) 48%
            ),
            radial-gradient(130% 22% at 42% 68%,
              rgba(120, 255, 190, 0.1) 0%,
              rgba(120, 255, 190, 0.04) 24%,
              rgba(120, 255, 190, 0) 50%
            )`,
            mixBlendMode: "screen",
            opacity: 0.16,
            filter: "blur(16px)",
            animation: "aurora-undulate 26s ease-in-out infinite, aurora-shimmer 7.8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "-3% -10%",
            background: `radial-gradient(66% 22% at 30% 34%,
              rgba(255, 255, 255, 0.12) 0%,
              rgba(255, 255, 255, 0.04) 24%,
              rgba(255, 255, 255, 0) 50%
            ),
            radial-gradient(58% 18% at 76% 48%,
              rgba(180, 120, 255, 0.16) 0%,
              rgba(180, 120, 255, 0.06) 28%,
              rgba(180, 120, 255, 0) 54%
            ),
            radial-gradient(74% 20% at 44% 78%,
              rgba(120, 255, 190, 0.12) 0%,
              rgba(120, 255, 190, 0.04) 26%,
              rgba(120, 255, 190, 0) 52%
            )`,
            mixBlendMode: "screen",
            opacity: 0.22,
            animation: "aurora-swirl 24s ease-in-out infinite reverse, aurora-shimmer 6.4s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "-8% -16%",
            background: `radial-gradient(84% 20% at 16% 62%,
              rgba(70, 220, 120, 0.12) 0%,
              rgba(70, 220, 120, 0.04) 24%,
              rgba(70, 220, 120, 0) 48%
            ),
            radial-gradient(76% 18% at 62% 70%,
              rgba(220, 130, 255, 0.12) 0%,
              rgba(220, 130, 255, 0.04) 24%,
              rgba(220, 130, 255, 0) 48%
            ),
            radial-gradient(68% 16% at 84% 26%,
              rgba(255, 255, 255, 0.08) 0%,
              rgba(255, 255, 255, 0.03) 22%,
              rgba(255, 255, 255, 0) 46%
            )`,
            mixBlendMode: "screen",
            opacity: 0.18,
            animation: "aurora-swirl 28s ease-in-out infinite, aurora-shimmer 8.2s ease-in-out infinite",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: crownBottomPx,
          height: crownHeight,
          overflow: "hidden",
          background: `linear-gradient(to top,
            rgba(80, 4, 12, 0) 0%,
            rgba(88, 5, 14, 0.08) 16%,
            rgba(100, 6, 16, 0.22) 28%,
            rgba(130, 8, 22, 0.46) 42%,
            rgba(155, 10, 28, 0.72) 56%,
            rgba(164, 14, 34, 0.9) 66%,
            rgba(166, 16, 38, 0.94) 74%,
            rgba(154, 14, 42, 0.9) 80%,
            rgba(132, 12, 46, 0.76) 87%,
            rgba(102, 9, 44, 0.5) 93%,
            rgba(40, 2, 20, 0) 100%
          )`,
          maskImage: "linear-gradient(to top, transparent 0%, black 12%, black 72%, rgba(0,0,0,0.6) 86%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 12%, black 72%, rgba(0,0,0,0.6) 86%, transparent 100%)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-4% -12%",
            background: `radial-gradient(90% 42% at 14% 24%,
                rgba(255, 165, 210, 0.24) 0%,
                rgba(170, 55, 95, 0.14) 32%,
                rgba(255, 120, 140, 0) 58%
              ),
              radial-gradient(72% 34% at 64% 18%,
                rgba(255, 150, 190, 0.18) 0%,
                rgba(130, 40, 70, 0.14) 38%,
                rgba(255, 120, 140, 0) 64%
              ),
              radial-gradient(84% 30% at 38% 58%,
                rgba(255, 170, 220, 0.24) 0%,
                rgba(145, 48, 84, 0.16) 36%,
                rgba(255, 120, 140, 0) 60%
              ),
              radial-gradient(68% 26% at 78% 72%,
                rgba(255, 135, 175, 0.18) 0%,
                rgba(120, 38, 66, 0.14) 40%,
                rgba(255, 120, 140, 0) 66%
              ),
              repeating-linear-gradient(
                108deg,
                rgba(255, 120, 140, 0) 0%,
                rgba(255, 120, 140, 0.08) 5%,
                rgba(255, 165, 210, 0.18) 11%,
                rgba(130, 40, 70, 0.12) 17%,
                rgba(255, 120, 140, 0) 25%
              )`,
            mixBlendMode: "screen",
            opacity: 0.32,
            animation: "aurora-swirl 17s ease-in-out infinite, aurora-shimmer 5.6s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "42%",
            background: `linear-gradient(to top,
              rgba(170, 32, 54, 0) 0%,
              rgba(170, 32, 54, 0.08) 28%,
              rgba(196, 48, 74, 0.14) 52%,
              rgba(210, 64, 96, 0.18) 74%,
              rgba(210, 64, 96, 0) 100%
            )`,
            mixBlendMode: "screen",
            opacity: 0.72,
            filter: "blur(18px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "-8% -16%",
            background: `radial-gradient(62% 18% at 24% 34%,
                rgba(255, 200, 235, 0.18) 0%,
                rgba(255, 200, 235, 0.08) 24%,
                rgba(255, 200, 235, 0) 52%
              ),
              radial-gradient(58% 20% at 72% 46%,
                rgba(255, 175, 220, 0.16) 0%,
                rgba(255, 175, 220, 0.06) 28%,
                rgba(255, 175, 220, 0) 56%
              ),
              radial-gradient(64% 16% at 46% 78%,
                rgba(255, 145, 190, 0.14) 0%,
                rgba(255, 145, 190, 0.05) 24%,
                rgba(255, 145, 190, 0) 54%
              )`,
            mixBlendMode: "screen",
            opacity: 0.24,
            animation: "aurora-swirl 22s ease-in-out infinite reverse, aurora-shimmer 7.4s ease-in-out infinite",
          }}
        />
      </div>
    </>
  );
}

function OzoneMolecules({ oceanHeight }) {
  const molecules = useMemo(() => {
    const random = createSeededRandom(777);
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      km: 14 + random() * 28,        // 14–42 km, concentrated in ozone layer
      left: 5 + random() * 90,        // % across scene
      opacity: 0.28 + random() * 0.32,
      scale: 0.7 + random() * 0.6,
    }));
  }, []);

  return (
    <>
      {molecules.map((m) => {
        const pixel = Math.max(1, Math.round(2 * m.scale));
        const w = 18 * pixel;
        const h = 13 * pixel;
        return (
          <div
            key={m.id}
            style={{
              position: "absolute",
              left: `${m.left}%`,
              bottom: altitudeToPixels(m.km) + oceanHeight,
              width: w,
              height: h,
              transform: "translateX(-50%)",
              opacity: m.opacity,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
              <g fill="#4c86b5">
                {/* O */}
                <rect x={0} y={2 * pixel} width={1 * pixel} height={6 * pixel} />
                <rect x={1 * pixel} y={1 * pixel} width={5 * pixel} height={1 * pixel} />
                <rect x={1 * pixel} y={8 * pixel} width={5 * pixel} height={1 * pixel} />
                <rect x={6 * pixel} y={2 * pixel} width={1 * pixel} height={6 * pixel} />

                {/* 3 as subscript */}
                <rect x={10 * pixel} y={6 * pixel} width={3 * pixel} height={1 * pixel} />
                <rect x={12 * pixel} y={7 * pixel} width={1 * pixel} height={2 * pixel} />
                <rect x={10 * pixel} y={9 * pixel} width={2 * pixel} height={1 * pixel} />
                <rect x={12 * pixel} y={10 * pixel} width={1 * pixel} height={2 * pixel} />
                <rect x={10 * pixel} y={12 * pixel} width={3 * pixel} height={1 * pixel} />
              </g>

              <g fill="#bfe5ff">
                <rect x={2 * pixel} y={2 * pixel} width={1 * pixel} height={1 * pixel} />
                <rect x={10 * pixel} y={7 * pixel} width={1 * pixel} height={1 * pixel} />
              </g>
            </svg>
          </div>
        );
      })}
    </>
  );
}

function BurjComparison({ compact, phone, oceanHeight }) {
  const svgWidth = phone ? 36 : compact ? 42 : 48;
  const svgHeight = altitudeToPixels(0.828);

  return (
    <div
      style={{
        position: "absolute",
        left: "33.333%",
        bottom: oceanHeight,
        width: svgWidth,
        height: svgHeight,
        zIndex: 1,
        opacity: 0.7,
        pointerEvents: "none",
        transform: "translateX(-50%)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        aria-hidden="true"
        style={{ display: "block" }}
        shapeRendering="crispEdges"
      >
        <g fill="#6f7782">
          <rect x={0} y={svgHeight - svgHeight * 0.14} width={svgWidth} height={svgHeight * 0.14} />
          <rect x={svgWidth * 0.18} y={svgHeight - svgHeight * 0.34} width={svgWidth * 0.64} height={svgHeight * 0.2} />
          <rect x={svgWidth * 0.28} y={svgHeight - svgHeight * 0.56} width={svgWidth * 0.44} height={svgHeight * 0.22} />
          <rect x={svgWidth * 0.38} y={svgHeight - svgHeight * 0.76} width={svgWidth * 0.24} height={svgHeight * 0.2} />
          <rect x={svgWidth * 0.44} y={svgHeight - svgHeight * 0.92} width={svgWidth * 0.12} height={svgHeight * 0.16} />
          <rect x={svgWidth * 0.47} y={0} width={svgWidth * 0.06} height={svgHeight * 0.08} />
        </g>
        <g fill="rgba(255,255,255,0.18)">
          <rect x={svgWidth * 0.24} y={svgHeight - svgHeight * 0.5} width={svgWidth * 0.06} height={svgHeight * 0.34} />
          <rect x={svgWidth * 0.42} y={svgHeight - svgHeight * 0.7} width={svgWidth * 0.04} height={svgHeight * 0.46} />
        </g>
      </svg>
    </div>
  );
}

function EverestComparison({ compact, phone, oceanHeight }) {
  const svgWidth = phone ? 150 : compact ? 220 : 300;
  const svgHeight = altitudeToPixels(8.849);

  return (
    <div
      style={{
        position: "absolute",
        left: "66.667%",
        bottom: oceanHeight,
        width: svgWidth,
        height: svgHeight,
        zIndex: 1,
        opacity: 0.7,
        pointerEvents: "none",
        transform: "translateX(-50%)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        aria-hidden="true"
        style={{ display: "block" }}
        shapeRendering="crispEdges"
      >
        {/* Everest — gradual left slope, near-vertical right cliff. Varying layer heights break the uniform-floor look. */}
        {/* Left edge: 0→43% (gradual). Right edge: 100→85→77→73→70→68→67→67→67→67 (cliff from layer 3 up). */}
        <g fill="#655f8d">
          <rect x={0}                  y={svgHeight * 0.88} width={svgWidth}            height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.04}    y={svgHeight * 0.78} width={svgWidth * 0.81}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.08}    y={svgHeight * 0.68} width={svgWidth * 0.69}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.12}    y={svgHeight * 0.58} width={svgWidth * 0.61}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.17}    y={svgHeight * 0.48} width={svgWidth * 0.53}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.22}    y={svgHeight * 0.39} width={svgWidth * 0.46}     height={svgHeight * 0.09} />
          <rect x={svgWidth * 0.28}    y={svgHeight * 0.30} width={svgWidth * 0.39}     height={svgHeight * 0.09} />
          <rect x={svgWidth * 0.33}    y={svgHeight * 0.22} width={svgWidth * 0.34}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.38}    y={svgHeight * 0.14} width={svgWidth * 0.29}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.43}    y={0}                width={svgWidth * 0.24}     height={svgHeight * 0.14} />
        </g>
        {/* Left-face highlight (illuminated gradual slope) */}
        <g fill="#8fa2d6">
          <rect x={svgWidth * 0.04}    y={svgHeight * 0.78} width={svgWidth * 0.06}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.08}    y={svgHeight * 0.68} width={svgWidth * 0.06}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.12}    y={svgHeight * 0.58} width={svgWidth * 0.06}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.17}    y={svgHeight * 0.48} width={svgWidth * 0.06}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.22}    y={svgHeight * 0.39} width={svgWidth * 0.05}     height={svgHeight * 0.09} />
        </g>
        {/* Snow cap (white) */}
        <g fill="#eef4ff">
          <rect x={svgWidth * 0.43}    y={0}                width={svgWidth * 0.24}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.41}    y={svgHeight * 0.08} width={svgWidth * 0.26}     height={svgHeight * 0.04} />
          <rect x={svgWidth * 0.39}    y={svgHeight * 0.12} width={svgWidth * 0.26}     height={svgHeight * 0.02} />
        </g>
        {/* Snow shadow (right cliff face) */}
        <g fill="#b8c4d6">
          <rect x={svgWidth * 0.57}    y={0}                width={svgWidth * 0.10}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.56}    y={svgHeight * 0.08} width={svgWidth * 0.11}     height={svgHeight * 0.04} />
        </g>
      </svg>
    </div>
  );
}

function KilimanjaroComparison({ compact, phone, oceanHeight }) {
  const svgWidth = phone ? 126 : compact ? 180 : 240;
  const svgHeight = altitudeToPixels(5.895);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: oceanHeight,
        width: svgWidth,
        height: svgHeight,
        zIndex: 1,
        opacity: 0.7,
        pointerEvents: "none",
        transform: "translateX(-50%)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        aria-hidden="true"
        style={{ display: "block" }}
        shapeRendering="crispEdges"
      >
        {/* Kilimanjaro — near-vertical left cliff, gradual right slope. Opposite asymmetry to Everest. */}
        {/* Left edge: 0→8→16→22→27→31→31→31→31→32 (cliff from layer 4 up). Right: 100→93→87→81→75→68→60→53→51→51 (gradual). */}
        <g fill="#5f5a88">
          <rect x={0}                  y={svgHeight * 0.88} width={svgWidth}            height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.08}    y={svgHeight * 0.78} width={svgWidth * 0.85}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.16}    y={svgHeight * 0.68} width={svgWidth * 0.71}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.22}    y={svgHeight * 0.59} width={svgWidth * 0.59}     height={svgHeight * 0.09} />
          <rect x={svgWidth * 0.27}    y={svgHeight * 0.50} width={svgWidth * 0.48}     height={svgHeight * 0.09} />
          <rect x={svgWidth * 0.31}    y={svgHeight * 0.41} width={svgWidth * 0.37}     height={svgHeight * 0.09} />
          <rect x={svgWidth * 0.31}    y={svgHeight * 0.33} width={svgWidth * 0.29}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.31}    y={svgHeight * 0.25} width={svgWidth * 0.22}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.31}    y={svgHeight * 0.14} width={svgWidth * 0.20}     height={svgHeight * 0.11} />
          <rect x={svgWidth * 0.32}    y={0}                width={svgWidth * 0.19}     height={svgHeight * 0.14} />
        </g>
        {/* Right-face highlight (illuminated gradual slope faces right) */}
        <g fill="#8ea2da">
          <rect x={svgWidth * 0.56}    y={svgHeight * 0.78} width={svgWidth * 0.05}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.55}    y={svgHeight * 0.68} width={svgWidth * 0.05}     height={svgHeight * 0.10} />
          <rect x={svgWidth * 0.53}    y={svgHeight * 0.59} width={svgWidth * 0.05}     height={svgHeight * 0.09} />
          <rect x={svgWidth * 0.51}    y={svgHeight * 0.50} width={svgWidth * 0.05}     height={svgHeight * 0.09} />
          <rect x={svgWidth * 0.50}    y={svgHeight * 0.41} width={svgWidth * 0.04}     height={svgHeight * 0.09} />
        </g>
        {/* Snow cap (white) */}
        <g fill="#eef5ff">
          <rect x={svgWidth * 0.32}    y={0}                width={svgWidth * 0.19}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.31}    y={svgHeight * 0.08} width={svgWidth * 0.20}     height={svgHeight * 0.04} />
          <rect x={svgWidth * 0.31}    y={svgHeight * 0.12} width={svgWidth * 0.19}     height={svgHeight * 0.02} />
        </g>
        {/* Snow shadow (right face of snow) */}
        <g fill="#b8c4d6">
          <rect x={svgWidth * 0.41}    y={0}                width={svgWidth * 0.10}     height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.40}    y={svgHeight * 0.08} width={svgWidth * 0.11}     height={svgHeight * 0.04} />
        </g>
      </svg>
    </div>
  );
}

const StaticAtmosphereScene = memo(function StaticAtmosphereScene({
  oceanHeight,
  totalHeight,
  isPhone,
  isCompact,
  contentRight,
  desktopLabelInset,
  hudHeight,
  viewportHeight,
}) {
  return (
    <>
      {/* ─── Ocean ─── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: oceanHeight,
          background: "#0e4d6b",
        }}
      />

      {/* ─── Intro text (below ocean) ─── */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: isPhone ? "15vw" : 0,
          right: 0,
          textAlign: isPhone ? "left" : "center",
          padding: isPhone ? "0 20px 0 0" : "0 20px",
        }}
      >
        <div style={{ marginBottom: 10, fontSize: isPhone ? "44px" : "52px", lineHeight: 1, color: "rgba(140, 190, 210, 0.42)" }}>
          ↑
        </div>
        <div style={{ fontSize: isPhone ? "16px" : "18px", color: "rgba(160, 210, 228, 0.76)", maxWidth: isPhone ? 260 : 460, margin: isPhone ? 0 : "0 auto", lineHeight: 1.65, fontFamily: "'Roboto Mono', monospace" }}>
          You&apos;re at sea level. The atmosphere stretches above you for hundreds of kilometers. Scroll up through it.
        </div>
      </div>

      {/* ─── Layer Backgrounds ─── */}
      {layers.map((layer) => {
        const bottom = altitudeToPixels(layer.startKm) + oceanHeight;
        const height = altitudeToPixels(layer.endKm) - altitudeToPixels(layer.startKm);
        return (
          <div
            key={layer.name}
            style={{
              position: "absolute",
              bottom: bottom,
              height: height,
              left: 0,
              right: 0,
              background: layer.color,
              borderTop: "none",
            }}
          />
        );
      })}

      {/* ─── Layer Labels (right side) ─── */}
      {layers.map((layer) => {
        const bottomPx = altitudeToPixels(layer.startKm) + oceanHeight;
        const midKm = (layer.startKm + layer.endKm) / 2;
        const subColor = getSubtextColor(midKm);
        const layerOffset = getLayerLabelOffset(layer.name, isCompact, isPhone);
        const labelBottom = bottomPx + 30 + layerOffset;
        const descriptionBottom = labelBottom + (isPhone ? 52 : isCompact ? 76 : 94);
        const textAnchorStyle = isPhone
          ? { left: "15vw", right: "auto", textAlign: "left", maxWidth: 220 }
          : { left: "auto", right: contentRight + 20, textAlign: "right", maxWidth: isCompact ? 190 : 240 };
        return (
          <div key={layer.name + "-label"}>
            <div
              style={{
                position: "absolute",
                bottom: labelBottom,
                left: isPhone ? "15vw" : desktopLabelInset,
                right: isPhone ? "auto" : contentRight + 20,
                zIndex: layer.name === "Troposphere" ? 3 : 1,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontSize: isPhone ? "34px" : isCompact ? "54px" : "72px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: subColor,
                  opacity: isPhone ? 0.34 : 0.32,
                  fontWeight: 800,
                  lineHeight: 0.95,
                  textAlign: isPhone ? "left" : "right",
                  whiteSpace: "nowrap",
                  transform: "none",
                  transformOrigin: "right bottom",
                  textShadow: "0 0 18px rgba(0,0,0,0.18)",
                }}
              >
                {layer.name}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                bottom: descriptionBottom,
                zIndex: 9,
                ...textAnchorStyle,
              }}
            />
          </div>
        );
      })}

      {/* ─── Landmark dashed lines ─── */}
      {landmarks.map((lm) => {
        if (lm.km === 0) return null;
        const bottomPx = altitudeToPixels(lm.km) + oceanHeight;
        const isMajorBoundary = Boolean(lm.isBoundary);
        return (
          <div
            key={lm.label + "-line"}
            style={{
              position: "absolute",
              bottom: bottomPx,
              left: 0,
              right: 0,
              height: isMajorBoundary ? 5 : 0,
              ...(isMajorBoundary
                ? {
                    backgroundImage: "repeating-linear-gradient(to right, rgba(255,255,255,0.88) 0px, rgba(255,255,255,0.88) 32px, transparent 32px, transparent 52px)",
                  }
                : {
                    borderTop: "3px dashed rgba(255,255,255,0.28)",
                  }),
              pointerEvents: "none",
              zIndex: isMajorBoundary ? 5 : "auto",
            }}
          />
        );
      })}

      {/* ─── Landmarks (left side) ─── */}
      {landmarks.map((lm) => {
        const bottomPx = altitudeToPixels(lm.km) + oceanHeight;
        const lmTextColor = lm.km === 0 ? "rgba(235, 243, 248, 0.96)" : getTextColor(lm.km);
        const lmSubColor = lm.km === 0 ? "rgba(214, 229, 238, 0.88)" : getSubtextColor(lm.km);
        const landmarkOffset = getLandmarkOffset(lm.km, isCompact, isPhone);
        const landmarkGap = isPhone ? 7 : 9;
        const landmarkTop = totalHeight - bottomPx + landmarkGap;
        return (
          <div
            key={lm.label}
            style={{
              position: "absolute",
              top: landmarkTop,
              left: isPhone ? `calc(15vw + ${landmarkOffset}px)` : `${desktopLabelInset + landmarkOffset}px`,
              maxWidth: isPhone ? "58vw" : isCompact ? "42%" : "36%",
              zIndex: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: lm.isBoundary ? (isPhone ? "11px" : "13px") : isPhone ? "15px" : "18px",
                  fontWeight: lm.isBoundary ? 400 : 600,
                  color: lm.isBoundary ? lmSubColor : lmTextColor,
                  letterSpacing: lm.isBoundary ? "0.1em" : "0",
                  textTransform: lm.isBoundary ? "uppercase" : "none",
                  lineHeight: isPhone ? 1.3 : 1.2,
                }}
              >
                {lm.label}
                <span style={{ display: "inline-block", fontSize: isPhone ? "11px" : "13px", color: lmSubColor, marginLeft: 8, fontWeight: 400 }}>
                  {lm.km < 1 ? (lm.km * 1000).toFixed(0) + " m" : lm.km + " km"}
                </span>
              </div>
              <div style={{ fontSize: isPhone ? "12px" : isCompact ? "14px" : "16px", color: lmSubColor, marginTop: 3, lineHeight: isPhone ? 1.45 : 1.6, fontFamily: "'Roboto Mono', monospace" }}>
                {lm.detail}
              </div>
            </div>
          </div>
        );
      })}

      <AuroraBackground oceanHeight={oceanHeight} viewportHeight={viewportHeight} />
      <TroposphereClouds oceanHeight={oceanHeight} />
      <OzoneMolecules oceanHeight={oceanHeight} />
      <NoctilucentClouds oceanHeight={oceanHeight} isPhone={isPhone} desktopLabelInset={desktopLabelInset} contentRight={contentRight} />
      <KilimanjaroComparison compact={isCompact} phone={isPhone} oceanHeight={oceanHeight} />
      <EverestComparison compact={isCompact} phone={isPhone} oceanHeight={oceanHeight} />
      <BurjComparison compact={isCompact} phone={isPhone} oceanHeight={oceanHeight} />
      <PixelJellyfish oceanHeight={oceanHeight} left="44%" bottomFraction={0.55} width={30} height={41} delay="-1.2s" />
      <PixelJellyfish oceanHeight={oceanHeight} left="68%" bottomFraction={0.62} width={38} height={52} delay="0s" />
      <PixelJellyfish oceanHeight={oceanHeight} left="82%" bottomFraction={0.48} width={24} height={33} delay="-2.6s" />
      <PixelISS oceanHeight={oceanHeight} />
      <PolarOrbitSatellites oceanHeight={oceanHeight} />
      <PixelRadiationSign oceanHeight={oceanHeight} />
      <Stars />
      <PixelUFO oceanHeight={oceanHeight} isPhone={isPhone} hudHeight={hudHeight} />

    </>
  );
});

// ─── Main Component ──────────────────────────────────────────────────
export default function AtmosphereScrolly() {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === "undefined") {
      return { width: 1280, height: 800 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  });
  const [hudHeight, setHudHeight] = useState(88);
  const [currentKm, setCurrentKm] = useState(0);
  const [, setIsTempDragging] = useState(false);
  const [, setIsRulerDragging] = useState(false);
  const hudRef = useRef(null);
  const touchYRef = useRef(null);
  const touchVelRef = useRef(0);    // px/ms at last move event
  const touchTsRef = useRef(0);     // timestamp of last move event
  const momentumRafRef = useRef(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!document.getElementById("gfonts-atm")) {
      const link = document.createElement("link");
      link.id = "gfonts-atm";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500;600&display=swap";
      document.head.appendChild(link);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!hudRef.current) return undefined;

    const updateHudHeight = () => {
      if (hudRef.current) {
        setHudHeight(hudRef.current.getBoundingClientRect().height);
      }
    };

    updateHudHeight();

    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(updateHudHeight);
    observer.observe(hudRef.current);
    return () => observer.disconnect();
  }, [viewport.width]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevTouchAction = body.style.touchAction;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.touchAction = prevTouchAction;
    };
  }, []);

  const setAltitude = useCallback((nextKm) => {
    setCurrentKm(Math.max(0, Math.min(MAX_ALTITUDE_KM, nextKm)));
  }, []);

  const applyScrollDelta = useCallback((deltaPx) => {
    if (deltaPx === 0) return;
    setCurrentKm((prev) =>
      Math.max(0, Math.min(MAX_ALTITUDE_KM, prev - deltaPx / PX_PER_KM))
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      const deltaPx = normalizeWheelDelta(event);
      applyScrollDelta(deltaPx);
    };

    const handleKeyDown = (event) => {
      let deltaPx = 0;
      if (event.key === "ArrowUp") deltaPx = -120;
      if (event.key === "ArrowDown") deltaPx = 120;
      if (event.key === "PageUp") deltaPx = -viewport.height * 0.75;
      if (event.key === "PageDown" || event.key === " ") deltaPx = viewport.height * 0.75;
      if (event.key === "Home") {
        event.preventDefault();
        setAltitude(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setAltitude(MAX_ALTITUDE_KM);
        return;
      }
      if (deltaPx === 0) return;
      event.preventDefault();
      applyScrollDelta(deltaPx);
    };

    const handleTouchStart = (event) => {
      // Cancel any in-flight momentum
      if (momentumRafRef.current != null) {
        cancelAnimationFrame(momentumRafRef.current);
        momentumRafRef.current = null;
      }
      touchYRef.current = event.touches[0]?.clientY ?? null;
      touchVelRef.current = 0;
      touchTsRef.current = event.timeStamp;
    };

    const handleTouchMove = (event) => {
      const nextY = event.touches[0]?.clientY;
      if (touchYRef.current == null || nextY == null) return;
      event.preventDefault();
      const deltaPx = touchYRef.current - nextY;
      const dt = event.timeStamp - touchTsRef.current;
      // Track instantaneous velocity (px/ms) for momentum on lift
      if (dt > 0) touchVelRef.current = deltaPx / dt;
      touchYRef.current = nextY;
      touchTsRef.current = event.timeStamp;
      applyScrollDelta(deltaPx);
    };

    const handleTouchEnd = () => {
      touchYRef.current = null;
      const vel = touchVelRef.current; // px/ms
      if (Math.abs(vel) < 0.05) return;

      // Convert to px/frame at ~60 fps, then decay each frame
      let v = vel * 16;
      const FRICTION = 0.93;
      const STOP = 0.8; // px/frame

      const tick = () => {
        v *= FRICTION;
        if (Math.abs(v) < STOP) { momentumRafRef.current = null; return; }
        applyScrollDelta(v);
        momentumRafRef.current = requestAnimationFrame(tick);
      };
      momentumRafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      if (momentumRafRef.current != null) {
        cancelAnimationFrame(momentumRafRef.current);
        momentumRafRef.current = null;
      }
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [applyScrollDelta, setAltitude, viewport.height]);

  const isPhone = viewport.width < 680;
  const isCompact = viewport.width < 900;
  const showRuler = !isPhone;
  const overlayWidth = isPhone ? 0 : 90;
  const overlayGap = isPhone ? 0 : 20;
  const contentLeft = isPhone ? 0 : overlayWidth + overlayGap;
  const contentRight = showRuler ? overlayWidth + overlayGap : 0;
  const desktopLabelInset = contentLeft + 20;
  const visibleSceneHeight = Math.max(viewport.height, 320);
  const oceanHeight = Math.round(visibleSceneHeight / 2);
  const totalHeight = ATM_HEIGHT + oceanHeight;
  const sceneOffsetPx = Math.max(
    0,
    totalHeight - visibleSceneHeight / 2 - oceanHeight - altitudeToPixels(currentKm)
  );
  const desktopOverlayViewport = Math.max(viewport.height - hudHeight - 24, 420);
  const desktopOverlayHeight = Math.max(Math.round(desktopOverlayViewport * 0.9), 420);
  const desktopOverlayTop = hudHeight + Math.max((desktopOverlayViewport - desktopOverlayHeight) / 2 + 8, 8);
  const profileTopOffset = isPhone ? hudHeight + 8 : desktopOverlayTop;
  const profileAvailableHeight = isPhone ? Math.max(viewport.height - hudHeight - 16, 320) : desktopOverlayHeight;

  const scrollToAltitude = useCallback((km) => {
    setAltitude(km);
  }, [setAltitude]);

  const handleReset = useCallback(() => {
    scrollToAltitude(0);
  }, [scrollToAltitude]);

  const bgColor = getBackgroundColor(currentKm);
  const temp = getTemperature(currentKm).toFixed(0);
  const pressure = getPressure(currentKm);
  const pressureStr =
    pressure >= 1
      ? pressure.toFixed(0) + " hPa"
      : pressure.toExponential(1) + " hPa";
  const tempTrendColor = getTemperatureTrendColor(currentKm);
  const currentLayer = layers.find(
    (layer) => currentKm >= layer.startKm && currentKm < layer.endKm
  );
  const topVisibleKm = Math.min(
    MAX_ALTITUDE_KM,
    currentKm + pixelsToAltitude(visibleSceneHeight / 2)
  );
  const behindChapterStyle = {};

  // Derive active chapter and progress purely from scroll position — no pause.
  // Each chapter occupies (lines.length * 300 px) worth of scroll above its altitude.
  let activeChapter = null;
  let chapterProgress = 0;
  for (const [kmStr, chapter] of Object.entries(CHAPTER_BREAKS)) {
    const km = Number(kmStr);
    const rangeKm = chapter.lines.length * 300 / PX_PER_KM;
    if (currentKm >= km && currentKm < km + rangeKm) {
      activeChapter = chapter;
      chapterProgress = (currentKm - km) / rangeKm;
      break;
    }
  }

  return (
    <>
      {activeChapter && (
        <ChapterOverlay chapter={activeChapter} progress={chapterProgress} compact={isPhone} />
      )}
      <div
        ref={hudRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: "rgba(0,0,0,0.7)",
          width: "100%",
          padding: isPhone ? "10px 12px 10px 4px" : "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: isPhone ? "flex-start" : "center",
          flexWrap: "wrap",
          gap: isPhone ? 10 : 16,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          pointerEvents: "none",
          ...behindChapterStyle,
        }}
      >
        <div>
          <div style={{ fontSize: isPhone ? "12px" : "13px", color: "rgba(255,255,255,0.48)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
            Altitude
          </div>
          <div style={{ fontSize: isPhone ? "22px" : "28px", color: "#fff", fontWeight: 600, fontFamily: "'Roboto Mono', monospace", lineHeight: 1.1 }}>
            {currentKm < 1 ? `${(currentKm * 1000).toFixed(0)} m` : `${currentKm.toFixed(1)} km`}
            <span style={{ fontSize: isPhone ? "16px" : "18px", fontWeight: 400, color: "rgba(255,255,255,0.45)", marginLeft: 7 }}>
              {currentKm < 1 ? `(${(currentKm * 3280.84).toFixed(0)} ft)` : `(${(currentKm * 0.621371).toFixed(1)} mi)`}
            </span>
          </div>
        </div>
        <div style={{ textAlign: isPhone ? "left" : "center", flex: isPhone ? "1 1 100%" : "0 1 auto", order: isPhone ? 3 : "initial", alignSelf: isPhone ? "flex-start" : "auto" }}>
          <div style={{ fontSize: isPhone ? "12px" : "13px", color: "rgba(255,255,255,0.48)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
            {currentLayer?.name || "Exosphere"}
          </div>
          <div style={{ fontSize: isPhone ? "16px" : "18px", color: "rgba(255,255,255,0.8)", fontFamily: "'Roboto Mono', monospace", lineHeight: 1.4 }}>
            <span style={{ color: tempTrendColor }}>{formatTempWithF(Number(temp))}</span>
            {" · "}
            <span>{pressureStr}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: isPhone ? "auto" : 0 }}>
          <button
            onClick={handleReset}
            className="reset-button"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.6)",
              padding: isPhone ? "6px 10px" : "6px 14px",
              borderRadius: "20px",
              fontSize: isPhone ? "12px" : "13px",
              cursor: "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              pointerEvents: "auto",
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <TempProfile
        currentKm={currentKm}
        showClimate={false}
        onDragAltitude={scrollToAltitude}
        onDragStateChange={setIsTempDragging}
        compact={isPhone}
        fullHeight={isPhone}
        topOffset={profileTopOffset}
        availableHeight={profileAvailableHeight}
      />
      {showRuler && (
        <AltitudeRuler
          currentKm={currentKm}
          onDragAltitude={scrollToAltitude}
          onDragStateChange={setIsRulerDragging}
          compact={isCompact}
          topOffset={profileTopOffset}
          availableHeight={profileAvailableHeight}
          width={overlayWidth}
        />
      )}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            height: `${visibleSceneHeight}px`,
            overflow: "hidden",
            background: bgColor,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              ...behindChapterStyle,
            }}
          >
            <div
              style={{
                height: totalHeight,
                position: "relative",
                overflowX: "hidden",
                transform: `translateY(-${sceneOffsetPx}px)`,
                willChange: "transform",
              }}
            >
              <StaticAtmosphereScene
                oceanHeight={oceanHeight}
                totalHeight={totalHeight}
                isPhone={isPhone}
                isCompact={isCompact}
                contentRight={contentRight}
                desktopLabelInset={desktopLabelInset}
                hudHeight={hudHeight}
                viewportHeight={visibleSceneHeight}
              />
              <CruisingPlanes currentKm={currentKm} topVisibleKm={topVisibleKm} oceanHeight={oceanHeight} />
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes driftRight {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(100vw + 300px)); }
        }
        .reset-button:active {
          background: rgba(255,255,255,0.18) !important;
          border-color: rgba(255,255,255,0.32) !important;
          color: rgba(255,255,255,0.82) !important;
        }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
