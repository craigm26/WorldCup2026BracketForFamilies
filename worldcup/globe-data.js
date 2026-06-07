/* Pure globe helpers: sphere projection, WebGL detection, and the 48 nation pins.
   Dual export: window.WCGLOBE (browser) + module.exports (Node tests). */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCGLOBE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  function lonLatToVec3(lon, lat, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return {
      x: -r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta),
    };
  }

  function hasWebGL() {
    try {
      if (typeof document === 'undefined' || !window.WebGLRenderingContext) return false;
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  // code -> { pin:[lon,lat] (hardcoded centroid, reliable), iso: world-atlas numeric id or null }
  const TEAM_GEO = {
    MEX: { pin: [-102, 23], iso: '484' }, RSA: { pin: [25, -29], iso: '710' },
    KOR: { pin: [128, 36], iso: '410' }, CZE: { pin: [15.5, 49.8], iso: '203' },
    CAN: { pin: [-106, 56], iso: '124' }, SUI: { pin: [8.2, 46.8], iso: '756' },
    QAT: { pin: [51.2, 25.3], iso: '634' }, BIH: { pin: [17.8, 44], iso: '070' },
    BRA: { pin: [-51, -10], iso: '076' }, MAR: { pin: [-7, 32], iso: '504' },
    HAI: { pin: [-72.3, 19], iso: '332' }, SCO: { pin: [-4, 56.8], iso: '826' },
    USA: { pin: [-98, 39], iso: '840' }, PAR: { pin: [-58, -23], iso: '600' },
    AUS: { pin: [134, -25], iso: '036' }, TUR: { pin: [35, 39], iso: '792' },
    GER: { pin: [10.4, 51.2], iso: '276' }, CUW: { pin: [-69, 12.2], iso: '531' },
    CIV: { pin: [-5.5, 7.5], iso: '384' }, ECU: { pin: [-78.5, -1.5], iso: '218' },
    NED: { pin: [5.3, 52.2], iso: '528' }, JPN: { pin: [138, 36], iso: '392' },
    SWE: { pin: [15, 62], iso: '752' }, TUN: { pin: [9, 34], iso: '788' },
    BEL: { pin: [4.5, 50.6], iso: '056' }, EGY: { pin: [30, 26], iso: '818' },
    IRN: { pin: [53, 32], iso: '364' }, NZL: { pin: [174, -41], iso: '554' },
    ESP: { pin: [-3.7, 40.3], iso: '724' }, CPV: { pin: [-24, 16], iso: '132' },
    KSA: { pin: [45, 24], iso: '682' }, URU: { pin: [-56, -33], iso: '858' },
    FRA: { pin: [2.5, 46.5], iso: '250' }, SEN: { pin: [-14.5, 14.5], iso: '686' },
    IRQ: { pin: [44, 33], iso: '368' }, NOR: { pin: [9, 61], iso: '578' },
    ARG: { pin: [-64, -38], iso: '032' }, ALG: { pin: [3, 28], iso: '012' },
    AUT: { pin: [14.5, 47.6], iso: '040' }, JOR: { pin: [36.5, 31], iso: '400' },
    POR: { pin: [-8, 39.5], iso: '620' }, COD: { pin: [23, -2.5], iso: '180' },
    UZB: { pin: [64, 41.5], iso: '860' }, COL: { pin: [-73, 4], iso: '170' },
    ENG: { pin: [-1.5, 52.5], iso: '826' }, CRO: { pin: [16, 45.5], iso: '191' },
    GHA: { pin: [-1, 8], iso: '288' }, PAN: { pin: [-80, 8.5], iso: '591' },
  };

  return { lonLatToVec3: lonLatToVec3, hasWebGL: hasWebGL, TEAM_GEO: TEAM_GEO };
});
