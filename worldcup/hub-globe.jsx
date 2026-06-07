/* 🌐 Globe3D — a spinnable three.js globe highlighting all 48 nations.
   Renders `fallback` when WebGL / three.js / topojson is unavailable. */
function Globe3D({ sel, onSelect, fallback }) {
  const G = window.WCGLOBE;
  const ref = React.useRef(null);
  const api = React.useRef({});
  const [ok, setOk] = React.useState(true);
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;
  const selRef = React.useRef(sel);
  selRef.current = sel;

  React.useEffect(() => {
    const THREE = window.THREE;
    if (!G || !G.hasWebGL() || !THREE || !window.topojson || !window.d3) { setOk(false); return; }
    const el = ref.current; if (!el) return;
    let alive = true;
    let W = el.clientWidth || 320, H = el.clientHeight || 320;
    const R = 1;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);
    const dom = renderer.domElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 3.2;
    const globe = new THREE.Group(); scene.add(globe);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshBasicMaterial({ color: 0x16357a }));
    globe.add(sphere);

    const pins = [];
    const disposables = [sphere.geometry, sphere.material];
    const addLine = (coords, color, rr) => {
      const pts = coords.map((c) => { const v = G.lonLatToVec3(c[0], c[1], rr); return new THREE.Vector3(v.x, v.y, v.z); });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: color });
      globe.add(new THREE.Line(geo, mat)); disposables.push(geo, mat);
    };

    fetch(window.NA_TOPO_URL || 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
      .then((r) => r.json()).then((topo) => {
        if (!alive) return;
        const obj = topo.objects.countries;
        window.topojson.mesh(topo, obj).coordinates.forEach((seg) => addLine(seg, 0x3f5aa0, R * 1.001));
        const byId = {}; window.topojson.feature(topo, obj).features.forEach((f) => { byId[String(f.id)] = f; });
        const WC = window.WC;
        Object.keys(WC.T).forEach((code) => {
          const g = G.TEAM_GEO[code]; if (!g) return;
          const f = g.iso && byId[g.iso];
          if (f) {
            const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
            polys.forEach((poly) => poly.forEach((ring) => addLine(ring, 0xf4b740, R * 1.002)));
          }
          const v = G.lonLatToVec3(g.pin[0], g.pin[1], R * 1.02);
          const pgeo = new THREE.SphereGeometry(0.018, 10, 10);
          const pmat = new THREE.MeshBasicMaterial({ color: 0xf4b740 });
          const pin = new THREE.Mesh(pgeo, pmat); pin.position.set(v.x, v.y, v.z);
          pin.userData.team = code; globe.add(pin); pins.push(pin); disposables.push(pgeo, pmat);
        });
        if (api.current.applySel) api.current.applySel(selRef.current);
      }).catch(() => { if (alive) setOk(false); });

    let dragging = false, lx = 0, ly = 0, moved = false;
    const down = (e) => { dragging = true; moved = false; lx = e.clientX; ly = e.clientY; };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x + dy * 0.005));
    };
    const up = (e) => {
      if (dragging && !moved && onSelectRef.current) {
        const rect = dom.getBoundingClientRect();
        const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(pins, false)[0];
        if (hit) onSelectRef.current(hit.object.userData.team);
      }
      dragging = false;
    };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    api.current.applySel = (code) => pins.forEach((pn) => {
      const on = pn.userData.team === code;
      pn.scale.setScalar(on ? 2.4 : 1);
      pn.material.color.set(on ? 0x34c77b : 0xf4b740);
    });

    let raf = null;
    const animate = () => { raf = requestAnimationFrame(animate); if (!dragging) globe.rotation.y += 0.0012; renderer.render(scene, camera); };
    const start = () => { if (!raf) animate(); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };
    start();

    const onVis = () => { if (document.hidden) stop(); else start(); }; // truly pause rAF when hidden
    document.addEventListener('visibilitychange', onVis);
    const onLost = (e) => { e.preventDefault(); setOk(false); };
    dom.addEventListener('webglcontextlost', onLost);
    const ro = new ResizeObserver(() => {
      W = el.clientWidth || W; H = el.clientHeight || H;
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
    });
    ro.observe(el);

    return () => {
      alive = false;
      stop();
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('visibilitychange', onVis);
      dom.removeEventListener('webglcontextlost', onLost);
      ro.disconnect();
      disposables.forEach((d) => { if (d.dispose) d.dispose(); });
      pins.forEach((pn) => { if (pn.geometry.dispose) pn.geometry.dispose(); if (pn.material.dispose) pn.material.dispose(); });
      if (renderer.forceContextLoss) renderer.forceContextLoss(); // release the GL context (dispose() alone doesn't)
      renderer.dispose();
      if (dom.parentNode) dom.parentNode.removeChild(dom);
      api.current = {};
    };
  }, []);

  React.useEffect(() => { if (api.current.applySel) api.current.applySel(sel); }, [sel]);

  if (!ok) return fallback || null;
  return <div ref={ref} style={{ width: "100%", height: "100%", minHeight: 280, cursor: "grab", touchAction: "none" }} />;
}
