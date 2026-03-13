import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  CHAPTER_EXIT_EPSILON_KM,
  findChapterCrossing,
} from "./chapterScroll";

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
  { km: 20, label: "Ozone layer begins", detail: "Peak ozone concentration is around 20–25 km" },
  { km: 35, label: "Peak ozone density", detail: "Maximum O₃ concentration; blocks UV-B and UV-C" },
  { km: 39, label: "Felix Baumgartner's jump", detail: "Jumped from 39 km in 2012, broke the sound barrier in freefall" },
  { km: 50, label: "Stratopause", detail: "Temperature peaks here (~0°C / 32°F) before dropping again", isBoundary: true },
  { km: 80, label: "Noctilucent clouds", detail: "Earth's highest clouds, ice crystals glowing after sunset" },
  { km: 85, label: "Mesopause", detail: "The coldest point in the atmosphere: around −90°C (−130°F)", isBoundary: true },
  { km: 100, label: "Kármán line", detail: "The internationally recognized edge of space" },
  { km: 110, label: "Auroras begin", detail: "Northern and southern lights shimmer from ~110–500 km" },
  { km: 150, label: "Atomic oxygen zone", detail: "Single oxygen atoms become common here and can slowly erode spacecraft surfaces" },
  { km: 200, label: "Very low Earth orbit", detail: "Satellites this low lose altitude quickly because the atmosphere still creates measurable drag" },
  { km: 250, label: "Upper thermosphere", detail: "\"Temperature\" only really describes how fast particles are moving here, not how warm it would feel to your body" },
  { km: 300, label: "Auroral peak activity", detail: "Some of the brightest auroral curtains and arcs form in this altitude range" },
  { km: 350, label: "Orbital drag still matters", detail: "Even here, trace atmosphere steadily slows satellites unless they boost their orbit" },
  { km: 408, label: "International Space Station", detail: "Orbiting at ~408 km — still technically in the atmosphere" },
  { km: 450, label: "Exosphere starts to dominate", detail: "Molecules can travel long distances without colliding, and some escape Earth altogether" },
  { km: 500, label: "Thermopause", detail: "Above here is the exosphere, where the atmosphere fades into the vacuum of space.", isBoundary: true },
  { km: 550, label: "Almost space, still atmosphere", detail: "The air here is extraordinarily sparse, but the atmosphere still has not cleanly ended" },
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
      "The Montreal Protocol phased out ozone-depleting chemicals once common in aerosol cans and refrigeration, and the ozone layer has been gradually recovering.",
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
      "And yet, the atmosphere doesn't truly end. It just... fades.",
    ],
  },
  500: {
    lines: [
      "You've reached the thermopause — the top of the thermosphere, around 500 km up.",
      "Above here is the exosphere, where the atmosphere fades into the vacuum of space.",
      "Molecules are so sparse they rarely collide. They simply drift, escape, or fall back toward Earth.",
      "There is no sharp edge where the atmosphere ends. It just thins, and thins, until space begins.",
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

// ─── Chapter Overlay (scroll-driven bottom-to-top text) ──────────────
// Each line scrolls from below the viewport to above it.
// `progress` is a continuous 0→1 value driven by wheel input.
// Each line owns a slice of the progress range.
function ChapterOverlay({ chapter, progress, compact }) {
  if (!chapter) return null;

  const lineCount = chapter.lines.length;
  const mobileChapterLeft = `calc(${MOBILE_TEMP_OVERLAY_WIDTH}px + (100vw - ${MOBILE_TEMP_OVERLAY_WIDTH}px) * 0.05)`;
  const mobileChapterRight = `calc((100vw - ${MOBILE_TEMP_OVERLAY_WIDTH}px) * 0.05)`;
  // Each line gets an equal share of progress, with overlap for smooth transitions
  const sliceSize = 1 / lineCount;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 1,
      }}
    >
      {/* Each line scrolls continuously top → bottom with overlap between lines */}
      {/* First line fades in at center; subsequent lines scroll through */}
      {chapter.lines.map((line, i) => {
        const overlap = 0.3;
        const effectiveSlice = sliceSize + overlap * sliceSize;
        const lineStart = i * sliceSize - overlap * sliceSize * 0.5;

        const t = Math.max(0, Math.min(1, (progress - lineStart) / effectiveSlice));
        const wasPassed = t >= 0.999;

        let yPercent;
        let opacity = 0;

        {
          // All lines use the same continuous scroll top → bottom behavior.
          const eased = t < 0.5
            ? 2 * t * t
            : 1 - Math.pow(-2 * t + 2, 2) / 2;
          yPercent = -15 + eased * 130;

          if (t > 0 && t < 0.15) {
            opacity = t / 0.15;
          } else if (t >= 0.15 && t <= 0.85) {
            opacity = 1;
          } else if (t > 0.85 && t < 1) {
            opacity = (1 - t) / 0.15;
          }
        }

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
              opacity: opacity,
              zIndex: t > 0 && t < 1 ? 2 : wasPassed ? 0 : 1,
              willChange: "transform, opacity",
            }}
          >
            <div
              style={{
                fontFamily: "'Roboto Mono', monospace",
                fontSize: compact ? "16px" : "18px",
                lineHeight: 1.55,
                color: "rgba(255, 255, 255, 0.95)",
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
  const svgWidth = fullHeight ? 32 : compact ? 54 : 72;
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
      }),
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
            overflow: "visible",
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
                x={padding.left + 3}
                y={svgHeight / 2}
                fill="rgba(255,255,255,0.34)"
                fontSize="12"
                fontFamily="'Roboto Mono', monospace"
                letterSpacing="0.8"
                textAnchor="middle"
                transform={`rotate(-90 ${padding.left + 3} ${svgHeight / 2})`}
              >
                COLDER
              </text>
              <text
                x={svgWidth - padding.right - 3}
                y={svgHeight / 2}
                fill="rgba(255,255,255,0.34)"
                fontSize="12"
                fontFamily="'Roboto Mono', monospace"
                letterSpacing="0.8"
                textAnchor="middle"
                transform={`rotate(90 ${svgWidth - padding.right - 3} ${svgHeight / 2})`}
              >
                WARMER
              </text>

              {boundaries.map((km) => (
                <line
                  key={km}
                  x1={padding.left} y1={kmToY(km)} x2={padding.left + plotW} y2={kmToY(km)}
                  stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeDasharray="3,3"
                />
              ))}
            </>
          )}

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
  const rulerWidth = width ?? (compact ? 54 : 72);
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
    const localY = clientY - rect.top;
    const pctFromBottom = 1 - localY / rect.height;
    return Math.max(0, Math.min(MAX_ALTITUDE_KM, pctFromBottom * MAX_ALTITUDE_KM));
  }, []);

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
                {km}
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

// ─── Stars ───────────────────────────────────────────────────────────
function Stars() {
  const stars = useMemo(
    () => {
      const random = createSeededRandom(101);
      return Array.from({ length: 90 }, (_, index) => ({
        id: index,
        top: random() * 34,
        left: random() * 100,
        size: 1 + random() * 3,
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

  const planes = [
    { id: "lead", left: "28%", bottom: altitudeToPixels(10.6) + oceanHeight + 16, width: 92, height: 40, opacity: 0.72 },
    { id: "main", left: "52%", bottom: altitudeToPixels(10) + oceanHeight + 24, width: 112, height: 48, opacity: 0.92 },
    { id: "trail", left: "74%", bottom: altitudeToPixels(9.4) + oceanHeight + 20, width: 84, height: 36, opacity: 0.64 },
  ];

  return (
    <>
      {planes.map((plane) => (
        <div
          key={plane.id}
          style={{
            position: "absolute",
            left: plane.left,
            bottom: plane.bottom,
            width: plane.width,
            height: plane.height,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            zIndex: plane.id === "main" ? 3 : 2,
            opacity: plane.opacity,
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
              <rect x="18" y="18" width="40" height="8" />
              <rect x="58" y="16" width="18" height="10" />
              <rect x="76" y="18" width="10" height="6" />
              <rect x="10" y="14" width="8" height="4" />
              <rect x="10" y="26" width="8" height="4" />
              <rect x="22" y="10" width="10" height="4" />
              <rect x="18" y="14" width="14" height="4" />
              <rect x="24" y="26" width="10" height="4" />
              <rect x="20" y="22" width="14" height="4" />
              <rect x="34" y="6" width="10" height="4" />
              <rect x="30" y="10" width="16" height="4" />
              <rect x="38" y="30" width="10" height="4" />
              <rect x="34" y="26" width="16" height="4" />
            </g>
            <g fill="#c7d7e3">
              <rect x="18" y="24" width="40" height="2" />
              <rect x="58" y="24" width="16" height="2" />
              <rect x="76" y="22" width="8" height="2" />
            </g>
            <g fill="#29a8df">
              <rect x="46" y="18" width="4" height="4" />
              <rect x="54" y="18" width="4" height="4" />
              <rect x="62" y="18" width="4" height="4" />
              <rect x="70" y="18" width="4" height="4" />
              <rect x="78" y="20" width="4" height="2" />
            </g>
            <g fill="#366fb6">
              <rect x="18" y="12" width="10" height="4" />
              <rect x="14" y="16" width="10" height="4" />
              <rect x="34" y="8" width="8" height="2" />
              <rect x="30" y="10" width="10" height="2" />
              <rect x="20" y="24" width="10" height="4" />
              <rect x="24" y="28" width="10" height="4" />
              <rect x="36" y="30" width="10" height="2" />
            </g>
            <g fill="#edf4f8">
              <rect x="82" y="18" width="6" height="6" />
              <rect x="88" y="20" width="2" height="2" />
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
      return Array.from({ length: 8 }, (_, index) => ({
        id: index,
        km: random() * 11 + 0.4,
        left: 8 + random() * 84,
        scale: 0.8 + random() * 0.8,
        opacity: 0.82 + random() * 0.12,
      }));
    },
    []
  );

  return (
    <>
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          style={{
            position: "absolute",
            left: `${cloud.left}%`,
            bottom: altitudeToPixels(cloud.km) + oceanHeight,
            width: 96 * cloud.scale,
            height: 48 * cloud.scale,
            transform: "translateX(-50%)",
            opacity: cloud.opacity,
            pointerEvents: "none",
            zIndex: 2,
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
      ))}
    </>
  );
}

function OzoneMolecules({ oceanHeight }) {
  return null;
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

function MountainComparison({ compact, phone, oceanHeight }) {
  const svgWidth = phone ? 124 : compact ? 184 : 244;
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
        <g fill="#655f8d">
          <rect x={0} y={svgHeight * 0.84} width={svgWidth} height={svgHeight * 0.16} />
          <rect x={svgWidth * 0.02} y={svgHeight * 0.76} width={svgWidth * 0.9} height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.08} y={svgHeight * 0.66} width={svgWidth * 0.76} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.14} y={svgHeight * 0.56} width={svgWidth * 0.6} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.2} y={svgHeight * 0.46} width={svgWidth * 0.46} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.28} y={svgHeight * 0.34} width={svgWidth * 0.3} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.32} y={svgHeight * 0.22} width={svgWidth * 0.3} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.36} y={svgHeight * 0.12} width={svgWidth * 0.22} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.38} y={0} width={svgWidth * 0.18} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.56} y={svgHeight * 0.12} width={svgWidth * 0.08} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.62} y={svgHeight * 0.28} width={svgWidth * 0.1} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.72} y={svgHeight * 0.42} width={svgWidth * 0.1} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.82} y={svgHeight * 0.58} width={svgWidth * 0.08} height={svgHeight * 0.18} />
        </g>
        <g fill="#8fa2d6">
          <rect x={svgWidth * 0.18} y={svgHeight * 0.56} width={svgWidth * 0.12} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.28} y={svgHeight * 0.44} width={svgWidth * 0.1} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.36} y={svgHeight * 0.32} width={svgWidth * 0.14} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.5} y={svgHeight * 0.22} width={svgWidth * 0.08} height={svgHeight * 0.1} />
        </g>
        <g fill="#eef4ff">
          <rect x={svgWidth * 0.38} y={0} width={svgWidth * 0.18} height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.34} y={svgHeight * 0.08} width={svgWidth * 0.24} height={svgHeight * 0.04} />
          <rect x={svgWidth * 0.32} y={svgHeight * 0.12} width={svgWidth * 0.26} height={svgHeight * 0.04} />
        </g>
      </svg>
    </div>
  );
}

function KilimanjaroComparison({ compact, phone, oceanHeight }) {
  const svgWidth = phone ? 104 : compact ? 148 : 196;
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
        <g fill="#5f5a88">
          <rect x={0} y={svgHeight * 0.86} width={svgWidth} height={svgHeight * 0.14} />
          <rect x={svgWidth * 0.04} y={svgHeight * 0.78} width={svgWidth * 0.84} height={svgHeight * 0.08} />
          <rect x={svgWidth * 0.1} y={svgHeight * 0.68} width={svgWidth * 0.68} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.18} y={svgHeight * 0.56} width={svgWidth * 0.5} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.28} y={svgHeight * 0.42} width={svgWidth * 0.32} height={svgHeight * 0.14} />
          <rect x={svgWidth * 0.34} y={svgHeight * 0.28} width={svgWidth * 0.28} height={svgHeight * 0.14} />
          <rect x={svgWidth * 0.38} y={svgHeight * 0.16} width={svgWidth * 0.22} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.4} y={0} width={svgWidth * 0.18} height={svgHeight * 0.16} />
          <rect x={svgWidth * 0.56} y={svgHeight * 0.16} width={svgWidth * 0.08} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.64} y={svgHeight * 0.34} width={svgWidth * 0.08} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.72} y={svgHeight * 0.5} width={svgWidth * 0.08} height={svgHeight * 0.18} />
        </g>
        <g fill="#8ea2da">
          <rect x={svgWidth * 0.22} y={svgHeight * 0.56} width={svgWidth * 0.1} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.34} y={svgHeight * 0.42} width={svgWidth * 0.08} height={svgHeight * 0.12} />
          <rect x={svgWidth * 0.42} y={svgHeight * 0.28} width={svgWidth * 0.12} height={svgHeight * 0.12} />
        </g>
        <g fill="#eef5ff">
          <rect x={svgWidth * 0.4} y={0} width={svgWidth * 0.18} height={svgHeight * 0.1} />
          <rect x={svgWidth * 0.36} y={svgHeight * 0.1} width={svgWidth * 0.22} height={svgHeight * 0.06} />
          <rect x={svgWidth * 0.34} y={svgHeight * 0.16} width={svgWidth * 0.22} height={svgHeight * 0.04} />
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
        <div style={{ fontSize: isPhone ? "16px" : "18px", color: "rgba(160, 210, 228, 0.76)", maxWidth: isPhone ? 260 : 460, margin: isPhone ? 0 : "0 auto", lineHeight: 1.65, fontFamily: "'Domine', Georgia, serif" }}>
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
              <div style={{ fontSize: isPhone ? "12px" : isCompact ? "14px" : "16px", color: lmSubColor, marginTop: 3, lineHeight: isPhone ? 1.45 : 1.6, fontFamily: "'Domine', Georgia, serif" }}>
                {lm.detail}
              </div>
            </div>
          </div>
        );
      })}

      <TroposphereClouds oceanHeight={oceanHeight} />
      <OzoneMolecules oceanHeight={oceanHeight} />
      <KilimanjaroComparison compact={isCompact} phone={isPhone} oceanHeight={oceanHeight} />
      <MountainComparison compact={isCompact} phone={isPhone} oceanHeight={oceanHeight} />
      <BurjComparison compact={isCompact} phone={isPhone} oceanHeight={oceanHeight} />
      <Stars />

      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.38)",
          fontSize: isPhone ? "12px" : "13px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          padding: isPhone ? "0 56px" : "0 20px",
        }}
      >
        ~550 km, the boundary blurs into space
      </div>
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
  const [chapterPause, setChapterPause] = useState(null);
  const [, setIsTempDragging] = useState(false);
  const [, setIsRulerDragging] = useState(false);
  const hudRef = useRef(null);
  const touchYRef = useRef(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!document.getElementById("gfonts-atm")) {
      const link = document.createElement("link");
      link.id = "gfonts-atm";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Domine:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Roboto+Mono:wght@300;400;500;600&display=swap";
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

  const releaseChapterPause = useCallback((chapterKm, direction, resumeDirection) => {
    setChapterPause(null);
    if (resumeDirection === "forward") {
      setAltitude(
        direction === "up"
          ? chapterKm + CHAPTER_EXIT_EPSILON_KM
          : chapterKm - CHAPTER_EXIT_EPSILON_KM
      );
      return;
    }

    setAltitude(
      direction === "up"
        ? chapterKm - CHAPTER_EXIT_EPSILON_KM
        : chapterKm + CHAPTER_EXIT_EPSILON_KM
    );
  }, [setAltitude]);

  const applyScrollDelta = useCallback((deltaPx) => {
    if (deltaPx === 0) return;

    if (chapterPause) {
      const totalPausePx = chapterPause.chapter.lines.length * 300;
      const forwardPx = chapterPause.direction === "up" ? -deltaPx : deltaPx;
      const progressDelta = forwardPx / totalPausePx;
      const nextProgress = chapterPause.progress + progressDelta;

      if (nextProgress >= 1) {
        releaseChapterPause(chapterPause.chapterKm, chapterPause.direction, "forward");
        return;
      }

      if (nextProgress <= 0) {
        releaseChapterPause(chapterPause.chapterKm, chapterPause.direction, "backward");
        return;
      }

      setChapterPause((prev) =>
        prev
          ? {
              ...prev,
              progress: Math.max(0, Math.min(1, nextProgress)),
            }
          : prev
      );
      return;
    }

    setCurrentKm((prev) => {
      const next = Math.max(0, Math.min(MAX_ALTITUDE_KM, prev - deltaPx / PX_PER_KM));
      const crossing = findChapterCrossing(CHAPTER_BREAKS, prev, next);

      if (crossing) {
        setChapterPause({
          chapterKm: crossing.chapterKm,
          chapter: crossing.chapter,
          direction: crossing.direction,
          progress: crossing.direction === "up" ? 0 : 1,
        });
        return crossing.chapterKm;
      }

      return next;
    });
  }, [chapterPause, releaseChapterPause]);

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
        setChapterPause(null);
        setAltitude(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setChapterPause(null);
        setAltitude(MAX_ALTITUDE_KM);
        return;
      }
      if (deltaPx === 0) return;
      event.preventDefault();
      applyScrollDelta(deltaPx);
    };

    const handleTouchStart = (event) => {
      touchYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event) => {
      const nextY = event.touches[0]?.clientY;
      if (touchYRef.current == null || nextY == null) return;
      event.preventDefault();
      const deltaPx = touchYRef.current - nextY;
      touchYRef.current = nextY;
      applyScrollDelta(-deltaPx);
    };

    const handleTouchEnd = () => {
      touchYRef.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
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
  const overlayWidth = isPhone ? 0 : 72;
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
    setChapterPause(null);
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
  const activeChapter = chapterPause?.chapter ?? null;
  const chapterProgress = chapterPause?.progress ?? 0;
  const behindChapterStyle = {};

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 45,
          background: "rgba(0,0,0,0.5)",
          opacity: activeChapter ? 1 : 0,
          pointerEvents: "none",
        }}
      />
      {activeChapter && (
        <ChapterOverlay
          chapter={activeChapter}
          progress={chapterProgress}
          compact={isPhone}
        />
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
              />
              <CruisingPlanes currentKm={currentKm} topVisibleKm={topVisibleKm} oceanHeight={oceanHeight} />
            </div>
          </div>
        </div>
      </div>
      <style>{`
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
