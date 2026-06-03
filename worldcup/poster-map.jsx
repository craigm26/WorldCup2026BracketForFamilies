/* Accurate North America host map.
   Uses d3-geo (window.d3) + topojson (window.topojson) to draw real US/Canada/
   Mexico geometry and place the 16 host cities at their true lon/lat.
   Pin color = country. Pass onCityClick to make pins open a city portal (Hub). */
const NA_TOPO_URL = (typeof window !== "undefined" && window.NA_TOPO_URL) || "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const NA_IDS = { "840": "US", "124": "CA", "484": "MX" };
const NA_FILL = { US: "#cfdefb", CA: "#f7d3ce", MX: "#cfeedb" };
const NA_LINE = { US: "#2f6fe0", CA: "#e2473b", MX: "#1f9d57" };
const NA_PIN  = { US: "#2f6fe0", CA: "#e2473b", MX: "#1f9d57" };

window.__naGeo = window.__naGeo || null;

function StadiumMap({ onCityClick }) {
  const WC = window.WC;
  const W = 1000, H = 680;
  const [geo, setGeo] = React.useState(window.__naGeo);

  React.useEffect(() => {
    if (geo || !window.d3 || !window.topojson) return;
    let alive = true;
    fetch(NA_TOPO_URL).then((r) => r.json()).then((topo) => {
      const all = window.topojson.feature(topo, topo.objects.countries).features;
      const feats = all.filter((f) => NA_IDS[String(f.id)]).map((f) => ({ nat: NA_IDS[String(f.id)], f }));
      const proj = window.d3.geoMercator().fitExtent(
        [[52, 64], [W - 52, H - 36]],
        { type: "MultiPoint", coordinates: WC.CITIES.map((c) => [c.lon, c.lat]) }
      );
      const path = window.d3.geoPath(proj);
      const shapes = feats.map((x) => ({ nat: x.nat, d: path(x.f) }));
      const pins = WC.CITIES.map((c) => { const p = proj([c.lon, c.lat]); return { ...c, px: p[0], py: p[1] }; });
      const labelAt = (lon, lat) => proj([lon, lat]);
      const labels = [
        { t: "CANADA", c: "#a8311f", p: labelAt(-114, 52) },
        { t: "UNITED STATES", c: "#1d4ba8", p: labelAt(-99, 40.5) },
        { t: "MÉXICO", c: "#157a41", p: labelAt(-104, 23.8) },
      ];
      const data = { shapes, pins, labels };
      window.__naGeo = data;
      if (alive) setGeo(data);
    }).catch(() => {});
    return () => { alive = false; };
  }, [geo]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block", background: "#dcefff", borderRadius: 10 }}>
        {/* graticule-ish dotted grid */}
        {[0.2,0.4,0.6,0.8].map((g) => <line key={"v"+g} x1={g*W} y1="0" x2={g*W} y2={H} stroke="#c5e2fb" strokeWidth="1.2" strokeDasharray="3 7" />)}
        {[0.25,0.5,0.75].map((g) => <line key={"h"+g} x1="0" y1={g*H} x2={W} y2={g*H} stroke="#c5e2fb" strokeWidth="1.2" strokeDasharray="3 7" />)}

        {!geo && <text x={W/2} y={H/2} textAnchor="middle" fontFamily="'Fredoka',sans-serif" fontSize="22" fill="#7fa8d8">Loading map…</text>}

        {geo && geo.shapes.map((s, i) => (
          <path key={i} d={s.d} fill={NA_FILL[s.nat]} stroke={NA_LINE[s.nat]} strokeWidth="1.5" strokeLinejoin="round" />
        ))}

        {geo && geo.labels.map((l, i) => (
          <text key={i} x={l.p[0]} y={l.p[1]} textAnchor="middle" fontFamily="'Fredoka',sans-serif" fontWeight="700" fontSize="22" fill={l.c} opacity="0.7" style={{ pointerEvents: "none" }}>{l.t}</text>
        ))}

        {geo && geo.pins.map((c) => (
          <g key={c.pin} transform={`translate(${c.px},${c.py})`} style={{ cursor: onCityClick ? "pointer" : "default" }}
             onClick={onCityClick ? () => onCityClick(c) : undefined}>
            <title>{c.pin}. {c.city} — {c.stadium}</title>
            <path d="M0,0 C-9,-9 -9,-21 0,-27 C9,-21 9,-9 0,0 Z" fill={NA_PIN[c.nat]} stroke="#fff" strokeWidth="2" />
            <circle cx="0" cy="-17" r="9" fill="#fff" />
            <text x="0" y="-13" textAnchor="middle" fontFamily="'Fredoka',sans-serif" fontWeight="700" fontSize="12" fill={NA_PIN[c.nat]}>{c.pin}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
window.StadiumMap = StadiumMap;
