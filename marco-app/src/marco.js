// Marco app: proyectos guardados (en este dispositivo), modo cliente e instalación.
(function () {
  var api = window.__api;
  if (!api) return;
  var KEY = 'marco_proyectos_v1';
  var DEFECTO = { FW: 8, D: 8, H: 3, bay: 4, doors: 'todas', gap: 12, tube: '20|1.5' };
  var TUBOS = ['20|1.5', '25|1.5', '30|2', '40|2', '50|2'], PUERTAS = ['centro', 'todas', 'izq', 'der', 'ninguna'];
  var $ = function (id) { return document.getElementById(id); };
  var st = null, editId = null, delId = null, delTimer = null;

  function leer() { try { var v = JSON.parse(localStorage.getItem(KEY)); if (v && Array.isArray(v.items) && v.items.length) return v; } catch (e) {} return null; }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function num(v, a, b, d) { v = parseFloat(v); return isNaN(v) ? d : Math.min(b, Math.max(a, v)); }
  function fm(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
  function actual() { return st.items.filter(function (p) { return p.id === st.current; })[0] || st.items[0]; }

  // Valida lo que viene de un archivo: nunca se confía en el contenido
  function limpiarParams(o) {
    o = o || {};
    return {
      FW: num(o.FW, 2, 60, DEFECTO.FW), D: num(o.D, 2, 60, DEFECTO.D), H: num(o.H, 2, 8, DEFECTO.H), bay: num(o.bay, 2, 10, DEFECTO.bay),
      doors: PUERTAS.indexOf(o.doors) >= 0 ? o.doors : DEFECTO.doors, gap: num(o.gap, 5, 40, DEFECTO.gap),
      tube: TUBOS.indexOf(o.tube) >= 0 ? o.tube : DEFECTO.tube
    };
  }
  function limpiarProyecto(o) {
    var t = function (s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, n); };
    return { id: uid(), name: t(o && o.name, 60) || 'Proyecto importado', client: t(o && o.client, 60), params: limpiarParams(o && o.params), summary: null, updated: Date.now() };
  }

  function titulo() { var p = actual(); $('ttl').textContent = 'Marco app · ' + p.name; document.title = 'Marco app'; }
  function resumen(p) { var s = p.summary; return s ? fm(s.w) + ' × ' + fm(s.d) + ' × ' + fm(s.h) + ' m · ' + s.bars + ' barras de tubo · ' + s.tubes + ' tubos verticales' : fm(p.params.FW) + ' × ' + fm(p.params.D) + ' × ' + fm(p.params.H) + ' m'; }
  function fecha(ms) { try { return new Date(ms).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }

  function abrir(id) {
    st.current = id; guardar();
    var p = actual();
    api.setParams(p.params);
    titulo(); lista();
  }

  function btn(txt, fn, cls) { var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; b.addEventListener('click', fn); return b; }

  function lista() {
    var box = $('plist'); box.textContent = '';
    st.items.slice().sort(function (a, b) { return b.updated - a.updated; }).forEach(function (p) {
      var c = document.createElement('div'); c.className = 'pcard' + (p.id === st.current ? ' cur' : '');
      if (editId === p.id) {
        var n = document.createElement('input'); n.className = 'edit'; n.value = p.name; n.setAttribute('aria-label', 'Nombre del proyecto'); n.maxLength = 60;
        var cl = document.createElement('input'); cl.className = 'edit'; cl.value = p.client; cl.placeholder = 'Cliente (opcional)'; cl.setAttribute('aria-label', 'Cliente'); cl.maxLength = 60;
        var a = document.createElement('div'); a.className = 'acts';
        a.appendChild(btn('Guardar', function () { p.name = n.value.trim() || p.name; p.client = cl.value.trim(); p.updated = Date.now(); editId = null; guardar(); titulo(); lista(); }, 'primary'));
        a.appendChild(btn('Cancelar', function () { editId = null; lista(); }));
        c.appendChild(n); c.appendChild(cl); c.appendChild(a);
      } else {
        var top = document.createElement('div'); top.className = 'top';
        var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.name;
        top.appendChild(nm);
        if (p.id === st.current) { var tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = 'Abierto'; top.appendChild(tg); }
        c.appendChild(top);
        if (p.client) { var k = document.createElement('div'); k.className = 'cl'; k.textContent = 'Cliente: ' + p.client; c.appendChild(k); }
        var rs = document.createElement('div'); rs.className = 'rs'; rs.textContent = resumen(p) + ' · ' + fecha(p.updated); c.appendChild(rs);
        var ac = document.createElement('div'); ac.className = 'acts';
        ac.appendChild(btn(p.id === st.current ? 'Ver' : 'Abrir', function () { abrir(p.id); cerrarProyectos(); }, 'primary'));
        ac.appendChild(btn('Nombre', function () { editId = p.id; lista(); }));
        ac.appendChild(btn('Duplicar', function () { var d = { id: uid(), name: p.name + ' (copia)', client: p.client, params: limpiarParams(p.params), summary: p.summary, updated: Date.now() }; st.items.push(d); guardar(); lista(); }));
        ac.appendChild(btn('Exportar', function () { exportar([p], p.name); }));
        if (st.items.length > 1) {
          var conf = delId === p.id;
          ac.appendChild(btn(conf ? 'Confirmar: eliminar' : 'Eliminar', function () {
            if (!conf) { delId = p.id; clearTimeout(delTimer); delTimer = setTimeout(function () { delId = null; lista(); }, 3500); lista(); return; }
            st.items = st.items.filter(function (x) { return x.id !== p.id; }); delId = null;
            if (st.current === p.id) { abrir(st.items[0].id); } else { guardar(); lista(); }
          }, 'danger'));
        }
        c.appendChild(ac);
      }
      box.appendChild(c);
    });
  }

  function exportar(items, nombre) {
    var data = { app: 'Marco app', version: 1, proyectos: items.map(function (p) { return { name: p.name, client: p.client, params: p.params }; }) };
    var arch = 'marco-' + String(nombre || 'proyectos').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) + '.json';
    api.download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), arch);
  }

  function importar(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result), arr = d && Array.isArray(d.proyectos) ? d.proyectos : [];
        if (!arr.length) throw new Error('vacío');
        arr.slice(0, 50).forEach(function (o) { st.items.push(limpiarProyecto(o)); });
        guardar(); lista(); $('pfoot').textContent = 'Se importaron ' + Math.min(arr.length, 50) + ' proyecto(s). Ábrelos para calcular sus materiales.';
      } catch (e) { $('pfoot').textContent = 'No se pudo importar: el archivo no es un proyecto de Marco app.'; }
    };
    r.readAsText(file);
  }

  function nuevo() {
    var n = st.items.length + 1;
    var p = { id: uid(), name: 'Proyecto ' + n, client: '', params: limpiarParams(DEFECTO), summary: null, updated: Date.now() };
    st.items.push(p); abrir(p.id);
  }

  function abrirProyectos() { lista(); $('proj').classList.add('show'); $('proj').scrollTop = 0; }
  function cerrarProyectos() { $('proj').classList.remove('show'); editId = null; delId = null; }

  // Se guarda solo cada vez que se calcula
  api.onCalc(function () {
    var p = actual(); p.params = limpiarParams(api.getParams()); p.summary = api.summary(); p.updated = Date.now(); guardar();
    if ($('proj').classList.contains('show')) lista();
  });

  st = leer();
  if (!st) { var b = { id: uid(), name: 'La Carreta', client: '', params: limpiarParams(DEFECTO), summary: null, updated: Date.now() }; st = { current: b.id, items: [b] }; guardar(); }
  api.setParams(actual().params); titulo();

  $('bProj').addEventListener('click', abrirProyectos);
  $('bProjClose').addEventListener('click', cerrarProyectos);
  $('bNew').addEventListener('click', function () { cerrarProyectos(); nuevo(); $('bBom').click(); });
  $('bImport').addEventListener('click', function () { $('fImport').click(); });
  $('fImport').addEventListener('change', function (e) { if (e.target.files && e.target.files[0]) importar(e.target.files[0]); e.target.value = ''; });
  $('bExportAll').addEventListener('click', function () { exportar(st.items, 'todos'); });

  // Modo cliente: solo el 3D (sin materiales ni proyectos)
  $('bCliente').addEventListener('click', function () { document.body.classList.add('cliente'); $('sheet').classList.remove('show'); cerrarProyectos(); });
  $('salirCli').addEventListener('click', function () { document.body.classList.remove('cliente'); });

  // Instalar (Android/escritorio) o aviso para iPhone
  var diferido = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); diferido = e; $('bInstall').hidden = false; });
  $('bInstall').addEventListener('click', function () { if (diferido) { diferido.prompt(); diferido = null; $('bInstall').hidden = true; } });
  window.addEventListener('appinstalled', function () { $('bInstall').hidden = true; });
  if (/iphone|ipad/i.test(navigator.userAgent) && !window.navigator.standalone && /^https?:/.test(location.protocol)) {
    $('pfoot').textContent += ' Para instalarla en iPhone: botón Compartir de Safari, luego "Añadir a pantalla de inicio".';
  }
  if (navigator.share && /^https?:/.test(location.protocol)) {
    $('bShareApp').hidden = false;
    $('bShareApp').addEventListener('click', function () { navigator.share({ title: 'Marco app', url: location.href.split('#')[0] }).catch(function () {}); });
  }
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && window.__MARCO_PWA) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
