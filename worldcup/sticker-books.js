/* Sticker-book registry: pure logic for "multiple books per person".
   A registry is { list:[{id,label}], active }. The DEFAULT book's id === the playerId,
   so the existing wc26stickers:<playerId> collection IS that book — migration moves no data.
   Dual export: window.WCSTKBOOKS (browser) + module.exports (Node tests). */
(function (root, factory) {
  var api = factory();
  if (typeof window !== 'undefined') window.WCSTKBOOKS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  var DEFAULT_LABEL = 'My album';
  var MAXLABEL = 20;

  function normalizeLabel(label, n) {
    var s = (label == null ? '' : String(label)).trim().slice(0, MAXLABEL);
    return s || ('Book ' + (n || 1));
  }
  function defaultBook(playerId) { return { id: playerId, label: DEFAULT_LABEL }; }
  function defaultRegistry(playerId) { return { list: [defaultBook(playerId)], active: playerId }; }

  function migrateRegistry(existing, playerId) {
    if (existing && existing.list && existing.list.length) {
      var list = existing.list.map(function (b, i) { return { id: b.id, label: normalizeLabel(b.label, i + 1) }; });
      var active = list.some(function (b) { return b.id === existing.active; }) ? existing.active : list[0].id;
      return { list: list, active: active };
    }
    return defaultRegistry(playerId);
  }

  function addBook(reg, label, id) {
    var list = (reg && reg.list) ? reg.list.slice() : [];
    list.push({ id: id, label: normalizeLabel(label, list.length + 1) });
    return { list: list, active: id };
  }
  function renameBook(reg, bookId, label) {
    var list = ((reg && reg.list) || []).map(function (b, i) {
      return b.id === bookId ? { id: b.id, label: normalizeLabel(label, i + 1) } : b;
    });
    return { list: list, active: reg.active };
  }
  function removeBook(reg, bookId) {
    var list = (reg && reg.list) || [];
    if (list.length <= 1) return { reg: reg, removed: false };
    var nl = list.filter(function (b) { return b.id !== bookId; });
    if (nl.length === list.length) return { reg: reg, removed: false };
    var active = reg.active === bookId ? nl[0].id : reg.active;
    return { reg: { list: nl, active: active }, removed: true };
  }
  function activeBookId(reg) { return reg && reg.active; }
  function labelOf(reg, bookId) {
    var b = ((reg && reg.list) || []).find(function (x) { return x.id === bookId; });
    return b ? b.label : '';
  }

  return { DEFAULT_LABEL: DEFAULT_LABEL, normalizeLabel: normalizeLabel, defaultBook: defaultBook,
    defaultRegistry: defaultRegistry, migrateRegistry: migrateRegistry, addBook: addBook,
    renameBook: renameBook, removeBook: removeBook, activeBookId: activeBookId, labelOf: labelOf };
});
