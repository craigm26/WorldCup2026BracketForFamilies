/* Sticker-book exporter — turn a collection into a text list / .csv / .html for any
   combination of have / need / duplicates / all. Pure + side-effect-free so it can be
   unit-tested in Node. Reads window.WCSTK (the album checklist) at call time.
   Dual export: window.WCSTKEXPORT (browser) + module.exports (Node tests). */
(function (root, factory) {
  var api = factory();
  if (typeof window !== 'undefined') window.WCSTKEXPORT = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  function album() { return (typeof window !== 'undefined' && window.WCSTK) ? window.WCSTK : (typeof WCSTK !== 'undefined' ? WCSTK : null); }
  function statusOf(c) { c = c || 0; return c >= 2 ? 'duplicate' : c >= 1 ? 'have' : 'need'; }
  function groupLabel(pg) { return pg.group ? ('Group ' + pg.group) : 'Specials'; }

  // Flatten the album into rows for the chosen buckets (OR'd together). Album order.
  //   opts = { have, need, duplicates }  (booleans)
  //   have       -> count >= 1   need -> count === 0   duplicates -> count >= 2
  function rows(map, opts) {
    map = map || {}; opts = opts || {};
    var A = album(); if (!A || !A.pages) return [];
    var out = [];
    A.pages.forEach(function (pg) {
      (pg.slots || []).forEach(function (s) {
        var c = map[s.n] || 0;
        var take = (opts.have && c >= 1) || (opts.need && c === 0) || (opts.duplicates && c >= 2);
        if (!take) return;
        out.push({ code: s.n, name: s.name, team: pg.title || (pg.group ? ('Group ' + pg.group) : 'Specials'),
          group: groupLabel(pg), section: pg.section, type: s.type || 'player', foil: !!s.foil,
          count: c, status: statusOf(c), spares: c >= 2 ? c - 1 : 0 });
      });
    });
    return out;
  }

  function summarize(rs) {
    var s = { count: rs.length, have: 0, need: 0, duplicates: 0, spares: 0 };
    rs.forEach(function (r) {
      if (r.status === 'need') s.need++;
      else { s.have++; if (r.status === 'duplicate') { s.duplicates++; s.spares += r.spares; } }
    });
    return s;
  }

  function statusText(r) {
    if (r.status === 'need') return 'need';
    if (r.status === 'duplicate') return 'have x' + r.count + ' (' + r.spares + ' spare' + (r.spares === 1 ? '' : 's') + ')';
    return 'have';
  }
  function pad(str, n) { str = String(str); while (str.length < n) str += ' '; return str; }

  function header(info, rs) {
    info = info || {};
    var cats = (info.categories && info.categories.length) ? info.categories.join(' + ') : 'All';
    return { title: 'World Cup 2026 Stickers — ' + (info.bookName || 'My album'),
      sub: cats + ' · ' + rs.length + ' sticker' + (rs.length === 1 ? '' : 's') + (info.date ? (' · made ' + info.date) : '') };
  }

  function toText(rs, info) {
    var h = header(info, rs), lines = [h.title, h.sub], curKey = null;
    rs.forEach(function (r) {
      var key = r.group + ' · ' + r.team;
      if (key !== curKey) { lines.push(''); lines.push(key.toUpperCase()); curKey = key; }
      lines.push('  ' + pad('#' + r.code, 8) + pad(r.name + (r.foil ? ' (foil)' : ''), 30) + statusText(r));
    });
    if (!rs.length) lines.push('', '(nothing to export for this selection)');
    return lines.join('\n');
  }

  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV(rs, info) {
    var lines = [['Code', 'Name', 'Team', 'Group', 'Type', 'Foil', 'Status', 'Count', 'Spares'].join(',')];
    rs.forEach(function (r) {
      lines.push([r.code, r.name, r.team, r.group, r.type, (r.foil ? 'Yes' : 'No'), r.status, r.count, r.spares].map(csvCell).join(','));
    });
    return lines.join('\r\n');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toHTML(rs, info) {
    var h = header(info, rs), sum = summarize(rs);
    var COL = { need: '#c0392b', have: '#1e8449', duplicate: '#b8860b' };
    var badge = function (st, count) {
      var lab = st === 'duplicate' ? ('duplicate ×' + count) : st;
      return '<span class="b" style="background:' + COL[st] + '">' + esc(lab) + '</span>';
    };
    var byKey = {}, secs = [];
    rs.forEach(function (r) { var k = r.group + ' · ' + r.team; if (!byKey[k]) { byKey[k] = { title: k, rows: [] }; secs.push(byKey[k]); } byKey[k].rows.push(r); });
    var body = secs.map(function (sec) {
      return '<h2>' + esc(sec.title) + ' <small>' + sec.rows.length + '</small></h2>\n<table>' + sec.rows.map(function (r) {
        return '<tr><td class="c">#' + esc(r.code) + '</td><td>' + esc(r.name) + (r.foil ? ' <span class="f">✨</span>' : '') + '</td><td class="s">' + badge(r.status, r.count) + '</td></tr>';
      }).join('') + '</table>';
    }).join('\n');
    if (!rs.length) body = '<p class="empty">Nothing to export for this selection.</p>';
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(h.title) + '</title>\n<style>\n'
      + 'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f4f6fb;color:#16235a}\n'
      + '.wrap{max-width:820px;margin:0 auto;padding:24px}\n'
      + 'header{background:#16235a;color:#fff;border-radius:14px;padding:18px 22px;margin-bottom:18px}\n'
      + 'header h1{margin:0 0 4px;font-size:21px}header .sub{color:#bcd;font-size:14px}\n'
      + '.chips{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}\n'
      + '.chip{background:rgba(255,255,255,.14);border-radius:20px;padding:5px 12px;font-size:13px;font-weight:600}\n'
      + 'h2{font-size:15px;margin:18px 0 6px;color:#2a3f7a;border-bottom:2px solid #e3e8f4;padding-bottom:4px}\n'
      + 'h2 small{color:#8a97bd;font-weight:600}\n'
      + 'table{width:100%;border-collapse:collapse;margin-bottom:6px}\n'
      + 'td{padding:5px 8px;border-bottom:1px solid #eceff6;font-size:14px}\n'
      + 'td.c{font-variant-numeric:tabular-nums;color:#5b6aa0;width:72px;font-weight:700}\n'
      + 'td.s{width:130px;text-align:right}.f{color:#d4a017}\n'
      + '.b{color:#fff;border-radius:12px;padding:2px 9px;font-size:12px;font-weight:700}\n'
      + '.empty{padding:30px;text-align:center;color:#8a97bd}\n'
      + 'footer{margin-top:20px;color:#8a97bd;font-size:12px;text-align:center}\n'
      + '@media print{body{background:#fff}.wrap{max-width:none}header{background:#fff;color:#16235a;border:1px solid #ccd}header .sub{color:#5b6aa0}.chip{background:#eef}}\n'
      + '</style></head><body><div class="wrap">\n'
      + '<header><h1>' + esc(h.title) + '</h1><div class="sub">' + esc(h.sub) + '</div>\n'
      + '<div class="chips"><span class="chip">✅ ' + sum.have + ' have</span><span class="chip">🔶 ' + sum.duplicates + ' duplicate (' + sum.spares + ' spare' + (sum.spares === 1 ? '' : 's') + ')</span><span class="chip">⬜ ' + sum.need + ' need</span></div>\n'
      + '</header>\n' + body + '\n<footer>Made with the World Cup 2026 Family Hub</footer>\n</div></body></html>';
  }

  function generate(format, rs, info) {
    if (format === 'csv') return toCSV(rs, info);
    if (format === 'html') return toHTML(rs, info);
    return toText(rs, info);
  }
  function mime(format) { return format === 'csv' ? 'text/csv' : format === 'html' ? 'text/html' : 'text/plain'; }
  function ext(format) { return format === 'csv' ? 'csv' : format === 'html' ? 'html' : 'txt'; }
  function filename(info, format) {
    info = info || {};
    var clean = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
    var cat = clean((info.categories || ['list']).join('-')) || 'list';
    var book = clean(info.bookName) || 'book';
    return 'wc2026-stickers-' + book + '-' + cat + '.' + ext(format);
  }

  return { statusOf: statusOf, rows: rows, summarize: summarize, toText: toText, toCSV: toCSV, toHTML: toHTML,
    generate: generate, mime: mime, ext: ext, filename: filename };
});
