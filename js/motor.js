/* ==========================================================================
   motor.js · Motor de cálculo del portal
   Reproduce exactamente las reglas del Panel del Maestro (app/logic.py):
     · Recursos = Nota x 10  ->  gemas, cristales, runas, lazos
     · El promedio usa SOLO las actividades efectivamente desarrolladas
     · Los dragones se desbloquean en cadena, por gemas acumuladas y requisitos
   y añade la capa de juego del portal: XP, nivel de guardián, rachas,
   estado de ánimo del dragón, insignias, ranking y comparativas.
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});

  var COLUMNAS = ['nota_taller', 'nota_actividad', 'nota_bitacora1', 'nota_bitacora2'];
  var CLAVES = ['gemas', 'cristales', 'runas', 'lazos'];
  var FACTOR = 10;
  var TOTAL_MISIONES = 24;
  var POR_PERIODO = 6;
  var GEMAS_META = 2040;

  var NIVELES = [
    [9.0, 'superior', 'SUPERIOR'],
    [8.0, 'alto', 'ALTO'],
    [7.0, 'basico', 'BÁSICO'],
    [0.0, 'bajo', 'BAJO']
  ];

  var TITULOS = [
    [12, 'Maestro de Elemoria'],
    [10, 'Guardián Estelar'],
    [8, 'Guardián de Aire'],
    [6, 'Guardián de Fuego'],
    [4, 'Guardián de Agua'],
    [2, 'Guardián de Tierra'],
    [1, 'Aprendiz de Guardián'],
    [0, 'Iniciado']
  ];

  /* ------------------------------------------------------------ Básicos -- */
  function redondear(valor, dec) {
    if (valor === null || valor === undefined || isNaN(valor)) return null;
    var d = dec === undefined ? 2 : dec;
    var f = Math.pow(10, d);
    return Math.round(valor * f + 1e-9) / f;
  }

  function normalizarNota(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    var n = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor);
    if (isNaN(n) || !isFinite(n)) return null;
    return redondear(Math.max(0, Math.min(10, n)), 2);
  }

  function nivelDe(promedio) {
    if (promedio === null || promedio === undefined) return { clave: 'sin-datos', etiqueta: 'SIN DATOS' };
    for (var i = 0; i < NIVELES.length; i++) {
      if (promedio >= NIVELES[i][0]) return { clave: NIVELES[i][1], etiqueta: NIVELES[i][2] };
    }
    return { clave: 'bajo', etiqueta: 'BAJO' };
  }

  function tituloDe(desbloqueados) {
    for (var i = 0; i < TITULOS.length; i++) {
      if (desbloqueados >= TITULOS[i][0]) return TITULOS[i][1];
    }
    return 'Iniciado';
  }

  function recursosVacios() {
    return { gemas: 0, cristales: 0, runas: 0, lazos: 0 };
  }

  /* ------------------------------------------------- Agregación de notas - */
  /**
   * Recorre los registros de un estudiante y devuelve recursos, promedio,
   * detalle por periodo y por componente. Tolera notas faltantes.
   */
  function agregar(registros, misionesPorId) {
    var recursos = recursosVacios();
    var sumaTotal = 0, nTotal = 0;
    var vistas = {}, cuantasVistas = 0;
    var porPeriodo = {}, componentes = {};
    var p, i, c;

    for (p = 1; p <= 4; p++) {
      porPeriodo[p] = {
        periodo_id: p, recursos: recursosVacios(), suma: 0, n: 0,
        misiones: {}, cuantas: 0, completas: 0,
        componentes: { gemas: { suma: 0, n: 0 }, cristales: { suma: 0, n: 0 }, runas: { suma: 0, n: 0 }, lazos: { suma: 0, n: 0 } }
      };
    }
    CLAVES.forEach(function (k) { componentes[k] = { suma: 0, n: 0 }; });

    (registros || []).forEach(function (reg) {
      var m = misionesPorId ? misionesPorId(reg.mision_id) : null;
      var periodo = m ? Number(m.periodo_id) : Number(reg.periodo_id || 0);
      if (!porPeriodo[periodo]) return;
      var acc = porPeriodo[periodo];

      var presentes = 0, sumaFila = 0;
      for (i = 0; i < COLUMNAS.length; i++) {
        var nota = normalizarNota(reg[COLUMNAS[i]]);
        if (nota === null) continue;
        var clave = CLAVES[i];
        var puntos = Math.round(nota * FACTOR);
        recursos[clave] += puntos;
        acc.recursos[clave] += puntos;
        componentes[clave].suma += nota;
        componentes[clave].n += 1;
        acc.componentes[clave].suma += nota;
        acc.componentes[clave].n += 1;
        sumaFila += nota;
        presentes += 1;
      }
      if (!presentes) return;

      var promedioFila = sumaFila / presentes;
      sumaTotal += promedioFila;
      nTotal += 1;
      acc.suma += promedioFila;
      acc.n += 1;
      if (reg.mision_id !== undefined && reg.mision_id !== null) {
        if (!vistas[reg.mision_id]) { vistas[reg.mision_id] = true; cuantasVistas += 1; }
        if (!acc.misiones[reg.mision_id]) { acc.misiones[reg.mision_id] = true; acc.cuantas += 1; }
      }
      if (presentes === COLUMNAS.length) acc.completas += 1;
    });

    var promedio = nTotal ? redondear(sumaTotal / nTotal) : null;

    var periodos = {};
    for (p = 1; p <= 4; p++) {
      var a = porPeriodo[p];
      var prom = a.n ? redondear(a.suma / a.n) : null;
      var comp = {};
      CLAVES.forEach(function (k) {
        comp[k] = {
          promedio: a.componentes[k].n ? redondear(a.componentes[k].suma / a.componentes[k].n) : null,
          registros: a.componentes[k].n
        };
      });
      periodos[p] = {
        periodo_id: p,
        promedio: prom,
        nivel: nivelDe(prom),
        misiones_registradas: a.cuantas,
        misiones_completas: a.completas,
        misiones_totales: POR_PERIODO,
        avance: redondear(100 * a.cuantas / POR_PERIODO, 1),
        recursos: a.recursos,
        componentes: comp
      };
    }

    var detalleComp = {};
    CLAVES.forEach(function (k) {
      detalleComp[k] = {
        clave: k,
        promedio: componentes[k].n ? redondear(componentes[k].suma / componentes[k].n) : null,
        registros: componentes[k].n,
        total: recursos[k]
      };
    });

    return {
      recursos: recursos,
      promedio: promedio,
      nivel: nivelDe(promedio),
      misiones_registradas: cuantasVistas,
      misiones_totales: TOTAL_MISIONES,
      avance: redondear(100 * cuantasVistas / TOTAL_MISIONES, 1),
      periodos: periodos,
      componentes: detalleComp
    };
  }

  /* ------------------------------------------------ Cadena de los dragones */
  function estadoDragones(recursos, dragones) {
    var gemas = recursos.gemas | 0, cristales = recursos.cristales | 0;
    var runas = recursos.runas | 0, lazos = recursos.lazos | 0;
    var lista = [], cadenaViva = true, desbloqueados = 0, siguiente = null;

    (dragones || []).forEach(function (d) {
      var req = {
        gemas: Number(d.gemas_acumuladas) || 0,
        cristales: Number(d.req_cristales) || 0,
        runas: Number(d.req_runas) || 0,
        lazos: Number(d.req_lazos) || 0
      };
      var faltantes = {
        gemas: Math.max(0, req.gemas - gemas),
        cristales: Math.max(0, req.cristales - cristales),
        runas: Math.max(0, req.runas - runas),
        lazos: Math.max(0, req.lazos - lazos)
      };
      var cumple = !(faltantes.gemas || faltantes.cristales || faltantes.runas || faltantes.lazos);
      var abierto = cadenaViva && cumple;
      if (abierto) desbloqueados += 1; else cadenaViva = false;

      var progreso = abierto ? 100 : (req.gemas ? Math.min(100, 100 * gemas / req.gemas) : 100);
      var item = {
        id: d.id, slug: d.slug, nombre: d.nombre, elemento: d.elemento,
        periodo_id: d.periodo_id, poder: d.poder, descripcion: d.descripcion,
        color: d.color, costo_gemas: Number(d.costo_gemas) || 0,
        requisitos: req, faltantes: faltantes,
        desbloqueado: abierto, progreso: redondear(progreso, 1)
      };
      if (siguiente === null && !abierto) siguiente = item;
      lista.push(item);
    });

    return {
      lista: lista,
      desbloqueados: desbloqueados,
      total: lista.length,
      siguiente: siguiente,
      granDragon: lista.length > 0 && desbloqueados === lista.length,
      progresoElementum: redondear(Math.min(100, 100 * gemas / GEMAS_META), 1)
    };
  }

  /* ----------------------------------------------------- Nivel y XP ------ */
  /** XP = todos los recursos ganados. Umbral del nivel n: 30·n·(n+1). */
  function umbralNivel(n) { return 30 * n * (n + 1); }

  function nivelGuardian(xp) {
    var n = 1;
    while (umbralNivel(n) <= xp && n < 40) n += 1;
    var base = n > 1 ? umbralNivel(n - 1) : 0;
    var techo = umbralNivel(n);
    return {
      nivel: n,
      xp: xp,
      xpBase: base,
      xpTecho: techo,
      xpEnNivel: xp - base,
      xpNecesaria: techo - base,
      falta: Math.max(0, techo - xp),
      progreso: redondear(100 * (xp - base) / Math.max(1, techo - base), 1)
    };
  }

  /* --------------------------------------------------------- Constancia -- */
  /**
   * Racha = misiones seguidas con registro, contando desde la última
   * registrada hacia atrás. También devuelve la mejor racha del año.
   */
  function rachas(registradas, totalMisiones) {
    var mejor = 0, actual = 0, corriendo = 0, ultima = 0;
    for (var i = 1; i <= totalMisiones; i++) {
      if (registradas[i]) {
        corriendo += 1;
        ultima = i;
        if (corriendo > mejor) mejor = corriendo;
      } else {
        corriendo = 0;
      }
    }
    corriendo = 0;
    for (var j = ultima; j >= 1; j--) {
      if (registradas[j]) corriendo += 1; else break;
    }
    actual = corriendo;
    return { actual: actual, mejor: mejor, ultima: ultima };
  }

  /* ------------------------------------------------- Ánimo del guardián -- */
  var ANIMOS = {
    radiante: {
      etiqueta: 'Radiante', icono: 'fa-fire-flame-curved', acento: '#f59e0b',
      frases: ['¡Tus últimas misiones brillan! Sigo creciendo contigo.',
        '¡Ese es el fuego de un verdadero guardián!',
        'Con este ritmo, pronto despertaremos a ELEMENTUM.']
    },
    animado: {
      etiqueta: 'Animado', icono: 'fa-face-grin-stars', acento: '#34d399',
      frases: ['Vas muy bien. Cada misión suma a nuestro vínculo.',
        'Me gusta cómo trabajas. Sigamos así.',
        'Un poco más de precisión y llegamos a lo más alto.']
    },
    sereno: {
      etiqueta: 'Sereno', icono: 'fa-wind', acento: '#60a5fa',
      frases: ['Avanzamos con calma; el camino todavía es largo.',
        'Un esfuerzo extra en la próxima misión nos hará subir.',
        'Estoy contigo: revisa tus bitácoras y verás la diferencia.']
    },
    inquieto: {
      etiqueta: 'Inquieto', icono: 'fa-cloud-bolt', acento: '#f87171',
      frases: ['Necesito más energía: entrega tus próximas misiones completas.',
        'No me rindo contigo. Empecemos por una bitácora bien hecha.',
        'Pide ayuda al maestro; juntos remontamos esto.']
    },
    dormido: {
      etiqueta: 'Dormido', icono: 'fa-moon', acento: '#6b7fa6',
      frases: ['Aún duermo… registra tu primera misión para despertarme.',
        'Sin misiones no hay recursos, y sin recursos no hay vuelo.']
    }
  };

  function animoDe(promedioReciente, misionesRegistradas, semilla) {
    var clave = 'dormido';
    if (misionesRegistradas > 0 && promedioReciente !== null) {
      if (promedioReciente >= 9) clave = 'radiante';
      else if (promedioReciente >= 8) clave = 'animado';
      else if (promedioReciente >= 7) clave = 'sereno';
      else clave = 'inquieto';
    }
    var a = ANIMOS[clave];
    var idx = Math.abs(semilla || 0) % a.frases.length;
    return { clave: clave, etiqueta: a.etiqueta, icono: a.icono, acento: a.acento, frase: a.frases[idx] };
  }

  /** Frase que dice el dragón al tocarlo. */
  function frasesMimo(clave) {
    var base = ANIMOS[clave] || ANIMOS.sereno;
    return base.frases;
  }

  /* ------------------------------------------------------- Insignias ----- */
  function insigniasDe(p) {
    var r = p.progreso.recursos;
    var comp = p.progreso.componentes;
    var mejorMision = 0;
    p.misiones.forEach(function (m) {
      if (m.promedio !== null && m.promedio > mejorMision) mejorMision = m.promedio;
    });
    var equilibrio = Math.min(
      comp.gemas.promedio || 0, comp.cristales.promedio || 0,
      comp.runas.promedio || 0, comp.lazos.promedio || 0);

    var lista = [
      { clave: 'primer-vuelo', nombre: 'Primer vuelo', icono: 'fa-egg', acento: '#a78bfa',
        desc: 'Registra tu primera misión.', valor: p.progreso.misiones_registradas, meta: 1 },
      { clave: 'constante', nombre: 'Constante', icono: 'fa-repeat', acento: '#22d3ee',
        desc: 'Ocho misiones registradas.', valor: p.progreso.misiones_registradas, meta: 8 },
      { clave: 'racha-viva', nombre: 'Racha viva', icono: 'fa-fire', acento: '#f59e0b',
        desc: 'Cinco misiones seguidas sin fallar.', valor: p.racha.mejor, meta: 5 },
      { clave: 'cazador', nombre: 'Cazador de gemas', icono: 'fa-gem', acento: '#a78bfa',
        desc: 'Mil gemas acumuladas.', valor: r.gemas, meta: 1000 },
      { clave: 'cristalero', nombre: 'Filo de cristal', icono: 'fa-icicles', acento: '#22d3ee',
        desc: 'Quinientos cristales.', valor: r.cristales, meta: 500 },
      { clave: 'runico', nombre: 'Sabio de runas', icono: 'fa-scroll', acento: '#f59e0b',
        desc: 'Quinientas runas del ingenio.', valor: r.runas, meta: 500 },
      { clave: 'tejedor', nombre: 'Tejedor de lazos', icono: 'fa-handshake-angle', acento: '#34d399',
        desc: 'Quinientos lazos del guardián.', valor: r.lazos, meta: 500 },
      { clave: 'perfeccion', nombre: 'Obra maestra', icono: 'fa-star', acento: '#d4af37',
        desc: 'Una misión con promedio de 9,5 o más.', valor: mejorMision, meta: 9.5, decimales: 2 },
      { clave: 'equilibrio', nombre: 'Equilibrio elemental', icono: 'fa-scale-balanced', acento: '#60a5fa',
        desc: 'Las cuatro actividades en 8,0 o más.', valor: equilibrio, meta: 8, decimales: 2 },
      { clave: 'domador', nombre: 'Domador', icono: 'fa-dragon', acento: '#ef4444',
        desc: 'Seis dragones desbloqueados.', valor: p.dragones.desbloqueados, meta: 6 },
      { clave: 'cronista', nombre: 'Cronista completo', icono: 'fa-flag-checkered', acento: '#34d399',
        desc: 'Las 24 misiones registradas.', valor: p.progreso.misiones_registradas, meta: 24 },
      { clave: 'elementum', nombre: 'Despertar de ELEMENTUM', icono: 'fa-crown', acento: '#d4af37',
        desc: '2.040 gemas: el Gran Dragón despierta.', valor: r.gemas, meta: GEMAS_META }
    ];

    lista.forEach(function (i) {
      i.ganada = i.valor >= i.meta;
      i.progreso = redondear(Math.min(100, 100 * (i.valor || 0) / i.meta), 1);
    });
    return lista;
  }

  /* ------------------------------------------------------------ Perfil --- */
  var cache = {};

  /** Calcula todo lo que el portal necesita de un estudiante. */
  function perfil(est, opciones) {
    if (!est) return null;
    var o = opciones || {};
    var llave = est.id + '|' + (o.periodo || 0);
    if (!o.recalcular && cache[llave]) return cache[llave];

    var misiones = PD.datos.misiones();
    var buscarMision = PD.datos.mision;
    var registros = est.registros || [];
    if (o.periodo) {
      registros = registros.filter(function (r) {
        var m = buscarMision(r.mision_id);
        return m && Number(m.periodo_id) === Number(o.periodo);
      });
    }

    var progreso = agregar(registros, buscarMision);
    var dragones = estadoDragones(progreso.recursos, PD.datos.dragones());
    var actual = dragones.desbloqueados > 0
      ? dragones.lista[dragones.desbloqueados - 1]
      : (dragones.lista.length ? dragones.lista[0] : null);

    var porMision = {};
    registros.forEach(function (r) { porMision[r.mision_id] = r; });

    var registradas = {};
    var detalle = misiones.map(function (m) {
      var reg = porMision[m.id] || null;
      var notas = {}, suma = 0, n = 0;
      COLUMNAS.forEach(function (col, i) {
        var v = reg ? normalizarNota(reg[col]) : null;
        notas[CLAVES[i]] = v;
        if (v !== null) { suma += v; n += 1; }
      });
      if (n) registradas[m.numero] = true;
      return {
        id: m.id, numero: m.numero, titulo: m.titulo, tema: m.tema || '',
        periodo_id: m.periodo_id, color: m.periodo_color || m.color || '#d4af37',
        notas: notas,
        promedio: n ? redondear(suma / n) : null,
        completa: n === COLUMNAS.length,
        registrada: n > 0,
        observaciones: reg ? (reg.observaciones || '') : '',
        fecha: reg ? (reg.fecha || '') : ''
      };
    });

    var racha = rachas(registradas, misiones.length || TOTAL_MISIONES);

    // Promedio de las últimas cuatro misiones con registro: define el ánimo.
    var ultimas = detalle.filter(function (m) { return m.promedio !== null; }).slice(-4);
    var promReciente = ultimas.length
      ? redondear(ultimas.reduce(function (s, m) { return s + m.promedio; }, 0) / ultimas.length)
      : null;

    var xp = CLAVES.reduce(function (s, k) { return s + progreso.recursos[k]; }, 0);

    var p = {
      est: est,
      id: est.id,
      codigo: est.codigo,
      nombre: PD.fmt.nombre(est),
      curso: PD.datos.curso(est),
      progreso: progreso,
      misiones: detalle,
      dragones: dragones,
      dragonActual: actual,
      avatar: est.dragon || (actual && actual.slug) || 'terrox',
      titulo: tituloDe(dragones.desbloqueados),
      xp: xp,
      nivel: nivelGuardian(xp),
      racha: racha,
      promedioReciente: promReciente,
      animo: animoDe(promReciente, progreso.misiones_registradas, est.id)
    };
    p.insignias = insigniasDe(p);
    p.insigniasGanadas = p.insignias.filter(function (i) { return i.ganada; }).length;

    cache[llave] = p;
    return p;
  }

  function limpiarCache() { cache = {}; }

  /* ------------------------------------------------- Grupo y comparativas */
  /** Promedios del curso (o del grado) para comparar al estudiante. */
  function resumenGrupo(lista, opciones) {
    var o = opciones || {};
    var perfiles = lista.map(function (e) { return perfil(e, { periodo: o.periodo }); });
    var conNota = perfiles.filter(function (p) { return p.progreso.promedio !== null; });

    var promedio = conNota.length
      ? redondear(conNota.reduce(function (s, p) { return s + p.progreso.promedio; }, 0) / conNota.length)
      : null;

    var componentes = {};
    CLAVES.forEach(function (k) {
      var vals = perfiles.map(function (p) { return p.progreso.componentes[k].promedio; })
        .filter(function (v) { return v !== null; });
      componentes[k] = vals.length
        ? redondear(vals.reduce(function (s, v) { return s + v; }, 0) / vals.length) : null;
    });

    var periodos = {};
    for (var p = 1; p <= 4; p++) {
      var vals = perfiles.map(function (x) { return x.progreso.periodos[p].promedio; })
        .filter(function (v) { return v !== null; });
      periodos[p] = vals.length
        ? redondear(vals.reduce(function (s, v) { return s + v; }, 0) / vals.length) : null;
    }

    var recursos = recursosVacios();
    perfiles.forEach(function (x) {
      CLAVES.forEach(function (k) { recursos[k] += x.progreso.recursos[k]; });
    });
    var recursosMedios = {};
    CLAVES.forEach(function (k) {
      recursosMedios[k] = perfiles.length ? Math.round(recursos[k] / perfiles.length) : 0;
    });

    var niveles = { superior: 0, alto: 0, basico: 0, bajo: 0, 'sin-datos': 0 };
    perfiles.forEach(function (x) {
      var c = x.progreso.nivel.clave;
      niveles[c] = (niveles[c] || 0) + 1;
    });

    return {
      perfiles: perfiles,
      estudiantes: perfiles.length,
      conDatos: conNota.length,
      promedio: promedio,
      nivel: nivelDe(promedio),
      componentes: componentes,
      periodos: periodos,
      recursos: recursos,
      recursosMedios: recursosMedios,
      niveles: niveles,
      misionesMedias: perfiles.length
        ? redondear(perfiles.reduce(function (s, x) { return s + x.progreso.misiones_registradas; }, 0) / perfiles.length, 1)
        : 0,
      dragonesMedios: perfiles.length
        ? redondear(perfiles.reduce(function (s, x) { return s + x.dragones.desbloqueados; }, 0) / perfiles.length, 1)
        : 0,
      mejorPromedio: conNota.length
        ? Math.max.apply(null, conNota.map(function (x) { return x.progreso.promedio; })) : null
    };
  }

  var METRICAS = {
    promedio: { etiqueta: 'Promedio', valor: function (p) { return p.progreso.promedio; }, decimales: 2 },
    xp: { etiqueta: 'Experiencia (XP)', valor: function (p) { return p.xp; }, decimales: 0 },
    gemas: { etiqueta: 'Gemas', valor: function (p) { return p.progreso.recursos.gemas; }, decimales: 0 },
    dragones: { etiqueta: 'Dragones', valor: function (p) { return p.dragones.desbloqueados; }, decimales: 0 },
    misiones: { etiqueta: 'Misiones', valor: function (p) { return p.progreso.misiones_registradas; }, decimales: 0 }
  };

  /** Ordena a un conjunto de estudiantes por la métrica pedida. */
  function ranking(lista, opciones) {
    var o = opciones || {};
    var metrica = METRICAS[o.metrica] ? o.metrica : 'promedio';
    var m = METRICAS[metrica];
    var filas = lista.map(function (e) {
      var p = e.progreso ? e : perfil(e, { periodo: o.periodo });
      return { perfil: p, valor: m.valor(p) };
    });
    filas.sort(function (a, b) {
      var va = a.valor === null ? -1 : a.valor;
      var vb = b.valor === null ? -1 : b.valor;
      if (vb !== va) return vb - va;
      return a.perfil.nombre.localeCompare(b.perfil.nombre, 'es');
    });
    var puesto = 0, anterior = null, empatados = 0;
    filas.forEach(function (f) {
      empatados += 1;
      if (anterior === null || f.valor !== anterior) { puesto = empatados; anterior = f.valor; }
      f.puesto = puesto;
    });
    return { metrica: metrica, etiqueta: m.etiqueta, decimales: m.decimales, filas: filas };
  }

  /** Porcentaje de compañeros que quedan por debajo (0-100). */
  function percentil(valor, valores) {
    if (valor === null || !valores.length) return null;
    var limpios = valores.filter(function (v) { return v !== null && v !== undefined; });
    if (!limpios.length) return null;
    var debajo = limpios.filter(function (v) { return v < valor; }).length;
    var iguales = limpios.filter(function (v) { return v === valor; }).length;
    return redondear(100 * (debajo + iguales / 2) / limpios.length, 1);
  }

  PD.motor = {
    COLUMNAS: COLUMNAS,
    CLAVES: CLAVES,
    TOTAL_MISIONES: TOTAL_MISIONES,
    POR_PERIODO: POR_PERIODO,
    GEMAS_META: GEMAS_META,
    redondear: redondear,
    normalizarNota: normalizarNota,
    nivelDe: nivelDe,
    tituloDe: tituloDe,
    agregar: agregar,
    estadoDragones: estadoDragones,
    nivelGuardian: nivelGuardian,
    animoDe: animoDe,
    frasesMimo: frasesMimo,
    perfil: perfil,
    limpiarCache: limpiarCache,
    resumenGrupo: resumenGrupo,
    ranking: ranking,
    METRICAS: METRICAS,
    percentil: percentil
  };

})(window);
