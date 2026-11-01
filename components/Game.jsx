"use client";
import { useEffect } from "react";

export default function Game() {
  useEffect(() => {
    let stop, cancelled = false;
    import("../lib/game").then((m) => { if (!cancelled) stop = m.default(); });
    return () => { cancelled = true; if (stop) stop(); };
  }, []);

  return (
    <>
      <div id="game-container"></div>

      <div className="hud">
        <div className="player-info">
          <h2>ANUJ TIWARI</h2>
          <p>OPEN WORLD PORTFOLIO</p>
        </div>
        <div className="location">
          <span>LOCATION</span>
          <h3 id="locName">PORTFOLIO ISLAND</h3>
        </div>
        <div className="mission">
          <span>YOUR MISSION</span>
          <p id="missionText">Explore the island and discover my world.</p>
          <ul id="missionList"></ul>
        </div>
      </div>

      <div className="crosshair">+</div>
      <canvas id="minimap" width={170} height={170}></canvas>
      <div id="prompt"></div>
      <div id="toast"></div>
      <div id="guideSay"></div>
      <button id="soundBtn" title="Sound (M)">🔊</button>

      <div className="controls">
        <p>WASD — Move &nbsp; Shift — Run &nbsp; Space — Jump</p>
        <p>Mouse or ← → ↑ ↓ — Camera &nbsp; Wheel — Zoom</p>
        <p>E — Interact &nbsp; Esc — Close &nbsp; T — Tour / Free Play</p>
        <p>M — Sound on/off &nbsp; V — Guide voice</p>
      </div>

      <div id="panel">
        <div className="inner">
          <button id="closeBtn">✕</button>
          <span id="pTag"></span>
          <h2 id="pTitle"></h2>
          <div id="pBody"></div>
        </div>
      </div>

      <div id="start">
        <div className="card">
          <h1>ANUJ TIWARI</h1>
          <p>OPEN WORLD PORTFOLIO</p>
          <button id="tourBtn">🧭 GUIDED TOUR</button>
          <button id="freeBtn">🎮 FREE PLAY</button>
          <small>
            <b>Guided Tour</b> — a guide character walks ahead, waits for you and shows you every place.<br />
            <b>Free Play</b> — explore anywhere and follow the direction board at the plaza.<br />
            Press E at a beacon to open it. Press T anytime to switch.
          </small>
        </div>
      </div>
    </>
  );
}
