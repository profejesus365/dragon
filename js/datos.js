/* ==========================================================================
   datos.js · Catálogos fijos, semilla y consulta de los datos del portal
   Aquí viven los 12 dragones, las 24 misiones y los 4 periodos (el canon del
   sistema, igual que en app/seed.py del Panel del Maestro), la lectura de la
   semilla exportada (data/datos.js) y el índice que usan todas las vistas.
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var CLAVE_XOR = 'CronicasDeLos12Dragones/Portal';

  /* ======================================================================== */
  /* Catálogo fijo del sistema                                                */
  /* ======================================================================== */
  var PERIODOS = [
    { id: 1, nombre: 'Periodo 1', elemento: 'Tierra', emoji: '🪨', color: '#a16207' },
    { id: 2, nombre: 'Periodo 2', elemento: 'Agua', emoji: '💧', color: '#1d4ed8' },
    { id: 3, nombre: 'Periodo 3', elemento: 'Fuego', emoji: '🔥', color: '#b91c1c' },
    { id: 4, nombre: 'Periodo 4', elemento: 'Aire', emoji: '🌬', color: '#7c3aed' }
  ];

  var DRAGONES = [
    [1, 'terrox', 'Terrox', 'Tierra', 1, 'ROCA', 'Fundamentos sólidos, estructura y clasificación', 120, 0, 0, 0, 120, '#a16207'],
    [2, 'floralis', 'Floralis', 'Tierra', 1, 'SELVA', 'Vida, ecosistemas y crecimiento', 130, 0, 10, 0, 250, '#15803d'],
    [3, 'geoda', 'Geoda', 'Tierra', 1, 'CRISTAL', 'Minerales, observación detallada', 150, 0, 0, 15, 400, '#6366f1'],
    [4, 'nereus', 'Nereus', 'Agua', 2, 'RÍO', 'Flujo, ciclos y movimiento', 140, 20, 0, 0, 540, '#0ea5e9'],
    [5, 'glacius', 'Glacius', 'Agua', 2, 'HIELO', 'Estados de la materia, conservación', 150, 0, 30, 0, 690, '#38bdf8'],
    [6, 'tormenta', 'Tormenta', 'Agua', 2, 'LLUVIA', 'Clima, energía y fenómenos', 160, 0, 0, 30, 850, '#5b7cb8'],
    [7, 'ignis', 'Ignis', 'Fuego', 3, 'LLAMA', 'Energía, transformación', 160, 40, 0, 0, 1010, '#ef4444'],
    [8, 'volcan', 'Volcan', 'Fuego', 3, 'MAGMA', 'Fuerza interna, reacción y cambio', 170, 0, 50, 20, 1180, '#ea580c'],
    [9, 'fenix', 'Fénix', 'Fuego', 3, 'SOL', 'Luz, renacimiento y ciclo vital', 180, 60, 0, 0, 1360, '#f59e0b'],
    [10, 'zephyra', 'Zephyra', 'Aire', 4, 'VIENTO', 'Movimiento, comunicación, dispersión', 190, 0, 70, 40, 1550, '#14b8a6'],
    [11, 'stellaris', 'Stellaris', 'Aire', 4, 'ESTRELLAS', 'Universo, orientación y asombro', 210, 100, 0, 0, 1760, '#a78bfa'],
    [12, 'elementum', 'ELEMENTUM', 'Elemental', 4, 'GRAN DRAGÓN ELEMENTAL', 'Síntesis de los 4 elementos. Desbloqueo final.', 280, 200, 200, 200, 2040, '#d4af37']
  ].map(function (d) {
    return {
      id: d[0], slug: d[1], nombre: d[2], elemento: d[3], periodo_id: d[4], poder: d[5],
      descripcion: d[6], costo_gemas: d[7], req_cristales: d[8], req_runas: d[9],
      req_lazos: d[10], gemas_acumuladas: d[11], color: d[12]
    };
  });

  var MISIONES = [
    [1, 1, 'Cimientos de Roca', 'Materia y sus propiedades'],
    [2, 1, 'Sendero de Terrox', 'Clasificación de los seres vivos'],
    [3, 1, 'Semillas de Floralis', 'La célula vegetal'],
    [4, 1, 'Bosque Viviente', 'Ecosistemas y cadenas tróficas'],
    [5, 1, 'Cámara de Geoda', 'Minerales y rocas'],
    [6, 1, 'Cristales Ocultos', 'Mezclas y separación'],
    [7, 2, 'Corriente de Nereus', 'El ciclo del agua'],
    [8, 2, 'El Ciclo del Agua', 'Cuencas y cuidado del recurso'],
    [9, 2, 'Aliento de Glacius', 'Estados de la materia'],
    [10, 2, 'Escudo de Hielo', 'Cambios físicos y químicos'],
    [11, 2, 'Furia de Tormenta', 'Clima y fenómenos atmosféricos'],
    [12, 2, 'Ojo del Huracán', 'Energía y su transferencia'],
    [13, 3, 'Chispa de Ignis', 'Fuentes de energía'],
    [14, 3, 'Forja Ardiente', 'Calor y temperatura'],
    [15, 3, 'Corazón de Volcán', 'Estructura de la Tierra'],
    [16, 3, 'Erupción Mayor', 'Sismos y vulcanismo'],
    [17, 3, 'Vuelo del Fénix', 'La luz y el color'],
    [18, 3, 'Renacer Solar', 'El Sol y la vida'],
    [19, 4, 'Susurro de Zephyra', 'El aire y la atmósfera'],
    [20, 4, 'Alas del Viento', 'Movimiento y fuerzas'],
    [21, 4, 'Mapa de Stellaris', 'El sistema solar'],
    [22, 4, 'Constelación Perdida', 'Estrellas y galaxias'],
    [23, 4, 'Convergencia Elemental', 'Proyecto integrador'],
    [24, 4, 'El Despertar de ELEMENTUM', 'Sustentación final']
  ].map(function (m) {
    return {
      id: m[0], numero: m[0], periodo_id: m[1], titulo: m[2], tema: m[3],
      descripcion: '', activa: 1
    };
  });

  var RECURSOS = [
    { columna: 'nota_taller', clave: 'gemas', nombre: 'Gema del Dragón', evalua: 'Aplicación' },
    { columna: 'nota_actividad', clave: 'cristales', nombre: 'Cristal del Dragón', evalua: 'Agilidad y comprensión' },
    { columna: 'nota_bitacora1', clave: 'runas', nombre: 'Runa del Ingenio', evalua: 'Conocimiento, creatividad, investigación' },
    { columna: 'nota_bitacora2', clave: 'lazos', nombre: 'Lazo del Guardián', evalua: 'Trabajo en equipo y autorreflexión' }
  ];

  function semillaFija() {
    return {
      periodos: JSON.parse(JSON.stringify(PERIODOS)),
      dragones: JSON.parse(JSON.stringify(DRAGONES)),
      misiones: JSON.parse(JSON.stringify(MISIONES)),
      recursos: JSON.parse(JSON.stringify(RECURSOS))
    };
  }

  /* ======================================================================== */
  /* Índice del paquete en uso                                                */
  /* ======================================================================== */
  var estado = {
    crudo: null, porCodigo: {}, porId: {}, misiones: {}, periodos: {},
    dragones: [], avisos: []
  };

  function indexar(datos) {
    estado.crudo = datos;
    estado.porCodigo = {};
    estado.porId = {};
    estado.misiones = {};
    estado.periodos = {};
    estado.dragones = (datos.dragones || []).slice();

    (datos.misiones || []).forEach(function (m) { estado.misiones[m.id] = m; });
    (datos.periodos || []).forEach(function (p) { estado.periodos[p.id] = p; });

    (datos.estudiantes || []).forEach(function (e) {
      estado.porId[e.id] = e;
      var clave = PD.codigoClave(e.codigo);
      // Si dos estudiantes comparten código, gana el primero y se avisa por consola.
      if (clave) {
        if (estado.porCodigo[clave]) {
          if (global.console) console.warn('Código repetido en los datos:', e.codigo);
        } else {
          estado.porCodigo[clave] = e;
        }
      }
    });

    estado.avisos = (global.PD_AVISOS || []).filter(function (a) { return a && a.titulo; });
    return datos;
  }

  /** Rellena valores que podrían faltar si el paquete viene de otra versión. */
  function sanear(datos) {
    if (!datos || typeof datos !== 'object') throw new Error('Paquete de datos vacío.');
    datos.meta = datos.meta || {};
    var m = datos.meta;
    m.totalMisiones = m.totalMisiones || (datos.misiones || []).length || 24;
    m.misionesPorPeriodo = m.misionesPorPeriodo || Math.round(m.totalMisiones / 4) || 6;
    m.gemasMeta = m.gemasMeta || 2040;
    m.factorRecurso = m.factorRecurso || 10;
    m.anio = m.anio || String(new Date().getFullYear());
    m.institucion = m.institucion || '';
    m.docente = m.docente || '';
    if (m.mostrarNombres === undefined) m.mostrarNombres = true;
    datos.estudiantes = (datos.estudiantes || []).map(function (e) {
      e.registros = e.registros || [];
      e.nombres = e.nombres || '';
      e.apellidos = e.apellidos || '';
      return e;
    });
    if (!datos.misiones || !datos.misiones.length) datos.misiones = semillaFija().misiones;
    if (!datos.periodos || !datos.periodos.length) datos.periodos = semillaFija().periodos;
    if (!datos.dragones || !datos.dragones.length) datos.dragones = semillaFija().dragones;
    datos.recursos = datos.recursos && datos.recursos.length ? datos.recursos : semillaFija().recursos;
    return datos;
  }

  /** Pone en uso un paquete ya armado (lo entrega PD.base). */
  function usar(paquete) {
    return indexar(sanear(paquete));
  }

  /* ======================================================================== */
  /* Semilla: data/datos.js (o data/datos.json por HTTP)                       */
  /* ======================================================================== */
  function desofuscar(b64) {
    var binaria = global.atob(b64);
    var bytes = new Uint8Array(binaria.length);
    for (var i = 0; i < binaria.length; i++) {
      bytes[i] = binaria.charCodeAt(i) ^ CLAVE_XOR.charCodeAt(i % CLAVE_XOR.length);
    }
    if (global.TextDecoder) return new global.TextDecoder('utf-8').decode(bytes);
    var texto = '';
    for (var j = 0; j < bytes.length; j++) texto += String.fromCharCode(bytes[j]);
    return decodeURIComponent(escape(texto));
  }

  function semilla() {
    return new Promise(function (resolver, rechazar) {
      try {
        if (global.PD_DATOS) { resolver(sanear(global.PD_DATOS)); return; }
        if (global.PD_PAQUETE) { resolver(sanear(JSON.parse(desofuscar(global.PD_PAQUETE)))); return; }
      } catch (e) {
        rechazar(new Error('El archivo data/datos.js no se pudo leer: ' + e.message));
        return;
      }
      if (!global.fetch || global.location.protocol === 'file:') {
        rechazar(new Error('No se encontró data/datos.js.'));
        return;
      }
      global.fetch('data/datos.json', { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (j) { resolver(sanear(j)); })
        .catch(function (e) { rechazar(new Error('No se pudieron cargar los datos: ' + e.message)); });
    });
  }

  /* ======================================================================== */
  /* Consultas                                                                */
  /* ======================================================================== */
  function buscarPorCodigo(codigo) {
    var clave = PD.codigoClave(codigo);
    if (!clave) return null;
    return estado.porCodigo[clave] || null;
  }

  function estudiantes() { return (estado.crudo && estado.crudo.estudiantes) || []; }

  /** Estudiante del paquete por su id (el mismo id que usa la base del tutor). */
  function porId(id) { return estado.porId[Number(id)] || null; }

  function companeros(est) {
    if (!est) return [];
    return estudiantes().filter(function (e) { return e.grupo_id === est.grupo_id; });
  }

  function delGrado(est) {
    if (!est) return [];
    return estudiantes().filter(function (e) { return e.grado_id === est.grado_id; });
  }

  function mision(id) { return estado.misiones[id] || null; }
  function periodo(id) { return estado.periodos[id] || null; }
  function misiones() { return (estado.crudo && estado.crudo.misiones) || []; }
  function periodos() { return (estado.crudo && estado.crudo.periodos) || []; }
  function dragones() { return estado.dragones; }
  function meta() { return (estado.crudo && estado.crudo.meta) || {}; }
  function recursos() { return (estado.crudo && estado.crudo.recursos) || RECURSOS; }
  function grados() { return (estado.crudo && estado.crudo.grados) || []; }
  function grupos() { return (estado.crudo && estado.crudo.grupos) || []; }

  /** Avisos visibles para un estudiante (los dirigidos a él, a su curso o a todos). */
  function avisosDe(est) {
    return estado.avisos.filter(function (a) {
      var para = a.para;
      if (!para) return true;
      if (para.codigo) return PD.codigoClave(para.codigo) === PD.codigoClave(est.codigo);
      if (para.grupo && PD.normal(para.grupo) !== PD.normal(est.grupo_nombre)) return false;
      if (para.grado && PD.normal(para.grado) !== PD.normal(est.grado_nombre)) return false;
      return true;
    }).sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); });
  }

  /** Nombre del curso listo para mostrar: "Quinto A". */
  function curso(est) {
    if (!est) return '';
    var g = (est.grado_nombre || '').trim();
    var gr = (est.grupo_nombre || '').trim();
    return (g + (gr ? ' ' + gr : '')).trim() || 'Sin grupo';
  }

  PD.datos = {
    semillaFija: semillaFija,
    semilla: semilla,
    usar: usar,
    buscarPorCodigo: buscarPorCodigo,
    estudiantes: estudiantes,
    porId: porId,
    companeros: companeros,
    delGrado: delGrado,
    mision: mision,
    misiones: misiones,
    periodo: periodo,
    periodos: periodos,
    dragones: dragones,
    grados: grados,
    grupos: grupos,
    meta: meta,
    recursos: recursos,
    avisosDe: avisosDe,
    curso: curso
  };

})(window);
