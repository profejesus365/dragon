/* ==========================================================================
   documentos.js · Escarapela digital, boletín, impresión y descargas
   El PNG se genera con html2canvas, que redibuja el documento en un canvas
   limpio. Si esa librería no cargó (aula sin internet) se intenta el respaldo
   clásico: el HTML dentro de un <foreignObject> de SVG. Y si el navegador
   tampoco lo permite —al abrir el sitio con doble clic, en file://, o porque
   marca el canvas como manchado— se ofrece "Imprimir → Guardar como PDF",
   que produce el mismo documento.
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var esc = PD.esc;

  /* ======================================================================== */
  /* Escarapela                                                               */
  /* ======================================================================== */
  function escarapelaHtml(p, ctx) {
    var Pz = PD.piezas;
    var inst = (PD.base && PD.base.estado && PD.base.estado.institucion) || {};
    var meta = PD.datos.meta();
    var institucion = inst.nombre || meta.institucion || 'Crónicas de los 12 Dragones';
    var anio = inst.anio || meta.anio || '';

    var dragon = null;
    p.dragones.lista.forEach(function (d) { if (d.slug === p.avatar) dragon = d; });
    if (!dragon) dragon = p.dragonActual || { nombre: '—', color: '#d4af37' };

    // Los tonos derivados viajan como variables: el rasterizado a PNG no
    // entiende color-mix() y el documento debe verse igual en la imagen.
    var tonos = '--acento:' + dragon.color +
      ';--acento-fuerte:' + Pz.rgba(dragon.color, .34) +
      ';--acento-medio:' + Pz.rgba(dragon.color, .45);
    var codigo = p.codigo || 'SIN CÓDIGO';

    var frente =
      '<div class="cara cara-frente" style="' + tonos + '">' +
      '<div class="esc-cinta"><strong>GUARDIÁN DE ELEMORIA</strong>' +
      '<span>' + esc(institucion) + '</span></div>' +
      '<div class="esc-cuerpo">' +
      '<div class="esc-retrato"><div class="esc-halo"></div>' +
      '<img src="' + Pz.rutaDragon(p.avatar) + '" alt="' + esc(dragon.nombre) + '"></div>' +
      '<div>' +
      '<div class="esc-nombre">' + esc(p.nombre) + '</div>' +
      '<div class="esc-titulo">' + esc(p.titulo) + '</div>' +
      '</div>' +
      '<div class="esc-datos">' +
      dato('Curso', p.curso) +
      dato('Código', codigo, true) +
      dato('Dragón', dragon.nombre) +
      dato('Promedio', p.progreso.promedio === null ? '—' : PD.fmt.nota(p.progreso.promedio)) +
      '</div>' +
      '<div class="esc-tira">' +
      mini('N.º ' + p.nivel.nivel, 'Nivel') +
      mini(p.progreso.misiones_registradas + '/' + p.progreso.misiones_totales, 'Misiones') +
      mini(p.dragones.desbloqueados + '/' + p.dragones.total, 'Dragones') +
      '</div>' +
      '<div class="esc-progreso">' +
      '<span>Camino a ELEMENTUM</span>' +
      '<div class="esc-barra"><i style="width:' + p.dragones.progresoElementum + '%"></i></div>' +
      '<strong>' + PD.fmt.entero(p.progreso.recursos.gemas) + ' / ' +
      PD.fmt.entero(PD.motor.GEMAS_META) + ' gemas</strong>' +
      '</div>' +
      '</div>' +
      '<div class="esc-pie"><span class="esc-codigo">' + esc(codigo) + '</span>' +
      '<span>' + esc(anio) + '</span></div>' +
      '</div>';

    var dragones = p.dragones.lista.map(function (d) {
      return '<div class="esc-dragon ' + (d.desbloqueado ? 'abierto' : 'cerrado') + '" title="' + esc(d.nombre) + '">' +
        '<img src="' + Pz.rutaDragon(d.slug, true) + '" alt="' + esc(d.nombre) + '"></div>';
    }).join('');

    var recursos = PD.motor.CLAVES.map(function (k) {
      return '<div class="esc-recurso"><span>' + esc(Pz.RECURSOS[k].nombre) + '</span>' +
        '<strong>' + PD.fmt.entero(p.progreso.recursos[k]) + '</strong></div>';
    }).join('');

    var atras =
      '<div class="cara cara-atras" style="' + tonos + '">' +
      '<div class="esc-cinta"><strong>BESTIARIO PERSONAL</strong>' +
      '<span>' + p.dragones.desbloqueados + ' de ' + p.dragones.total + ' dragones despiertos</span></div>' +
      '<div class="esc-cuerpo">' +
      '<div>' +
      '<div class="esc-atras-nombre">' + esc(p.nombre) + '</div>' +
      '<div class="esc-atras-titulo">' + esc(p.curso) + '</div>' +
      '</div>' +
      '<div class="esc-dragones">' + dragones + '</div>' +
      '<div style="width:100%">' +
      '<div class="esc-atras-titulo">Recursos acumulados</div>' +
      '<div class="esc-recursos" style="margin-top:.35em">' + recursos + '</div>' +
      '</div>' +
      '<div style="width:100%">' +
      '<div class="esc-barras">' + barras(codigo) + '</div>' +
      '<div class="esc-codigo" style="display:block;text-align:center;margin-top:.25em">' +
      esc(codigo) + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="esc-firma"><strong>' + esc(inst.docente || meta.docente || '') + '</strong>' +
      'Maestro de Dragones' + (inst.sede ? ' · ' + esc(inst.sede) : '') + '</div>' +
      '</div>';

    return frente + atras;
  }

  function dato(etiqueta, valor, destacado) {
    return '<div class="esc-dato' + (destacado ? ' destacado' : '') + '">' +
      '<span>' + esc(etiqueta) + '</span><strong>' + esc(valor) + '</strong></div>';
  }

  function mini(valor, etiqueta) {
    return '<div class="esc-mini"><strong>' + esc(valor) + '</strong><span>' + esc(etiqueta) + '</span></div>';
  }

  /** Dibuja un patrón de barras derivado del código (decorativo, no es un QR). */
  function barras(semilla) {
    var texto = String(semilla || 'DRAGON');
    var salida = '';
    for (var i = 0; i < 40; i++) {
      var c = texto.charCodeAt(i % texto.length) + i * 7;
      var ancho = (1 + (c % 3)) * 0.09;               // em: se adapta al tamaño
      var alto = 40 + (c % 60);
      salida += '<i style="width:' + ancho.toFixed(2) + 'em;height:' + alto + '%"></i>';
    }
    return salida;
  }

  /* ======================================================================== */
  /* Boletín                                                                  */
  /* ======================================================================== */
  /* --- Referencias del grupo (se calculan una vez por grupo y periodo) ---- */
  var cacheGrupo = {};
  document.addEventListener('pd:base', function () { cacheGrupo = {}; });

  function refGrupo(est, periodo) {
    var clave = (est.grupo_id || 0) + '|' + (periodo || 0);
    if (!cacheGrupo[clave]) {
      var companeros = PD.datos.companeros(est);
      var resumen = PD.motor.resumenGrupo(companeros, { periodo: periodo });
      var tabla = PD.motor.ranking(companeros, { metrica: 'promedio', periodo: periodo });
      var puesto = 0;
      tabla.filas.forEach(function (f) { if (f.perfil.id === est.id) puesto = f.puesto; });
      resumen.puesto = puesto;
      resumen.total = tabla.filas.length;
      cacheGrupo[clave] = resumen;
    }
    return cacheGrupo[clave];
  }

  var ESCALA_BOL = [
    ['superior', 'SUPERIOR', '9,0 – 10,0'],
    ['alto', 'ALTO', '8,0 – 8,9'],
    ['basico', 'BÁSICO', '7,0 – 7,9'],
    ['bajo', 'BAJO', '0,0 – 6,9']
  ];

  /**
   * Boletín del estudiante con forma de informe académico.
   *   ctx.periodo = 1..4  -> informe del periodo
   *   ctx.periodo = 0     -> informe global del año, con consolidado por periodo
   */
  function boletinHtml(p, ctx) {
    var Pz = PD.piezas;
    var inst = (PD.base && PD.base.estado && PD.base.estado.institucion) || {};
    var meta = PD.datos.meta();
    var periodo = ctx && ctx.periodo ? Number(ctx.periodo) : 0;
    var anual = !periodo;

    var institucion = inst.nombre || meta.institucion || 'Crónicas de los 12 Dragones';
    var anio = inst.anio || meta.anio || '';
    var docente = inst.docente || meta.docente || '';
    var datosPeriodo = PD.datos.periodo(periodo) || {};

    var promedio = anual ? p.progreso.promedio : p.progreso.periodos[periodo].promedio;
    var nivel = PD.motor.nivelDe(promedio);
    var grupo = refGrupo(p.est, periodo);

    var misiones = p.misiones.filter(function (m) {
      return anual || Number(m.periodo_id) === periodo;
    });

    /* --- Encabezado institucional ---------------------------------------- */
    var cabecera =
      '<header class="bol-cabecera">' +
      '<div class="bol-sello">🐉</div>' +
      '<div class="bol-titulos">' +
      '<h1>' + esc(institucion) + '</h1>' +
      '<p>' + [inst.sede ? 'Sede ' + inst.sede : '', inst.jornada ? 'Jornada ' + inst.jornada : '',
        anio ? 'Año lectivo ' + anio : ''].filter(Boolean).map(esc).join(' · ') + '</p>' +
      '<h2>' + (anual ? 'Informe académico anual' : 'Informe académico de periodo') + '</h2>' +
      '<p class="bol-area">Área: Ciencias Naturales · Proyecto <em>Crónicas de los 12 Dragones</em></p>' +
      '</div>' +
      '<div class="bol-periodo">' +
      '<strong>' + (anual ? 'AÑO' : 'P' + periodo) + '</strong>' +
      '<span>' + esc(anual ? 'Consolidado' : (datosPeriodo.nombre || '')) + '</span>' +
      (anual ? '' : '<span>' + esc(datosPeriodo.elemento || '') + '</span>') +
      '</div>' +
      '</header>';

    /* --- Identificación --------------------------------------------------- */
    var identificacion =
      '<section class="bol-identidad">' +
      '<img class="bol-avatar" src="' + Pz.rutaDragon(p.avatar, true) + '" alt="">' +
      '<table class="bol-datos"><tbody>' +
      '<tr><th>Estudiante</th><td>' + esc(p.est.apellidos + ' ' + p.est.nombres) + '</td>' +
      '<th>Código</th><td class="mono">' + esc(p.codigo || '—') + '</td></tr>' +
      '<tr><th>Grado y grupo</th><td>' + esc(p.curso) + '</td>' +
      '<th>Docente</th><td>' + esc(docente) + '</td></tr>' +
      '<tr><th>Título de guardián</th><td>' + esc(p.titulo) + '</td>' +
      '<th>Dragones</th><td>' + p.dragones.desbloqueados + ' de ' + p.dragones.total + '</td></tr>' +
      '</tbody></table>' +
      '<div class="bol-nota-global">' +
      '<div class="bol-nota-valor">' + notaTxt(promedio) + '</div>' +
      '<div class="bol-marca bol-' + nivel.clave + '">' + esc(nivel.etiqueta) + '</div>' +
      '<div class="bol-nota-etq">' + (anual ? 'Promedio anual' : 'Promedio del periodo') + '</div>' +
      '</div>' +
      '</section>';

    /* --- Tabla de desempeño ------------------------------------------------ */
    var filasTabla = '';
    if (anual) {
      // Agrupada por periodo, con subtotal de cada uno.
      PD.datos.periodos().forEach(function (per) {
        var delPeriodo = misiones.filter(function (m) { return Number(m.periodo_id) === per.id; });
        if (!delPeriodo.length) return;
        var info = p.progreso.periodos[per.id];
        filasTabla += '<tr class="bol-fila-periodo"><td colspan="8">' +
          esc(per.nombre + ' · Elemento ' + per.elemento) + '</td></tr>' +
          delPeriodo.map(filaMision).join('') +
          '<tr class="bol-fila-subtotal"><td></td><td>Promedio del ' + esc(per.nombre.toLowerCase()) + '</td>' +
          '<td class="num" colspan="4">' + info.misiones_registradas + ' de ' + info.misiones_totales +
          ' misiones registradas</td>' +
          '<td class="num"><strong>' + notaTxt(info.promedio) + '</strong></td>' +
          '<td class="num"><span class="bol-marca bol-' + info.nivel.clave + '">' +
          esc(info.nivel.etiqueta) + '</span></td></tr>';
      });
    } else {
      filasTabla = misiones.map(filaMision).join('');
    }

    function filaMision(m) {
      var nv = PD.motor.nivelDe(m.promedio);
      return '<tr class="' + (m.registrada ? '' : 'sin-registro') + '">' +
        '<td class="num">' + m.numero + '</td>' +
        '<td class="bol-mision-titulo"><strong>' + esc(m.titulo) + '</strong>' +
        (m.tema ? '<span>' + esc(m.tema) + '</span>' : '') + '</td>' +
        '<td class="num">' + notaTxt(m.notas.gemas) + '</td>' +
        '<td class="num">' + notaTxt(m.notas.cristales) + '</td>' +
        '<td class="num">' + notaTxt(m.notas.runas) + '</td>' +
        '<td class="num">' + notaTxt(m.notas.lazos) + '</td>' +
        '<td class="num"><strong>' + notaTxt(m.promedio) + '</strong></td>' +
        '<td class="num"><span class="bol-marca bol-' + nv.clave + '">' + esc(nv.etiqueta) + '</span></td>' +
        '</tr>';
    }

    var tabla =
      '<section class="bol-bloque">' +
      '<h3 class="bol-seccion-titulo">' +
      (anual ? 'Desempeño en las 24 misiones del año' : 'Desempeño en las misiones del ' +
        esc((datosPeriodo.nombre || 'periodo').toLowerCase())) + '</h3>' +
      '<table class="bol-tabla"><thead><tr>' +
      '<th class="num">N°</th><th>Misión y tema</th>' +
      '<th class="num">Taller<small>Gema</small></th>' +
      '<th class="num">Actividad<small>Cristal</small></th>' +
      '<th class="num">Bitácora 1<small>Runa</small></th>' +
      '<th class="num">Bitácora 2<small>Lazo</small></th>' +
      '<th class="num">Prom.</th><th class="num">Valoración</th>' +
      '</tr></thead><tbody>' + filasTabla + '</tbody></table>' +
      '</section>';

    /* --- Consolidado / comparativo ----------------------------------------- */
    // Solo el informe anual lleva el consolidado de los cuatro periodos.
    var consolidado = '';
    if (anual) {
      consolidado =
        '<section class="bol-bloque">' +
        '<h3 class="bol-seccion-titulo">Consolidado por periodo</h3>' +
        '<table class="bol-tabla bol-consolidado"><thead><tr>' +
        '<th>Periodo</th><th>Elemento</th><th class="num">Misiones</th>' +
        '<th class="num">Gemas</th><th class="num">Cristales</th><th class="num">Runas</th>' +
        '<th class="num">Lazos</th><th class="num">Promedio</th><th class="num">Valoración</th>' +
        '</tr></thead><tbody>' +
        PD.datos.periodos().map(function (per) {
          var i = p.progreso.periodos[per.id];
          return '<tr><td><strong>' + esc(per.nombre) + '</strong></td><td>' + esc(per.elemento) + '</td>' +
            '<td class="num">' + i.misiones_registradas + '/' + i.misiones_totales + '</td>' +
            '<td class="num">' + PD.fmt.entero(i.recursos.gemas) + '</td>' +
            '<td class="num">' + PD.fmt.entero(i.recursos.cristales) + '</td>' +
            '<td class="num">' + PD.fmt.entero(i.recursos.runas) + '</td>' +
            '<td class="num">' + PD.fmt.entero(i.recursos.lazos) + '</td>' +
            '<td class="num"><strong>' + notaTxt(i.promedio) + '</strong></td>' +
            '<td class="num"><span class="bol-marca bol-' + i.nivel.clave + '">' +
            esc(i.nivel.etiqueta) + '</span></td></tr>';
        }).join('') +
        '<tr class="bol-fila-total"><td colspan="2"><strong>Resultado anual</strong></td>' +
        '<td class="num">' + p.progreso.misiones_registradas + '/' + p.progreso.misiones_totales + '</td>' +
        '<td class="num">' + PD.fmt.entero(p.progreso.recursos.gemas) + '</td>' +
        '<td class="num">' + PD.fmt.entero(p.progreso.recursos.cristales) + '</td>' +
        '<td class="num">' + PD.fmt.entero(p.progreso.recursos.runas) + '</td>' +
        '<td class="num">' + PD.fmt.entero(p.progreso.recursos.lazos) + '</td>' +
        '<td class="num"><strong>' + notaTxt(p.progreso.promedio) + '</strong></td>' +
        '<td class="num"><span class="bol-marca bol-' + p.progreso.nivel.clave + '">' +
        esc(p.progreso.nivel.etiqueta) + '</span></td></tr>' +
        '</tbody></table></section>';
    }

    /* --- Progreso en el proyecto ------------------------------------------- */
    var progreso =
      '<section class="bol-bloque">' +
      '<h3 class="bol-seccion-titulo">Progreso en el proyecto</h3>' +
      '<div class="bol-progreso">' +
      '<div class="bol-recursos">' + PD.motor.CLAVES.map(function (k) {
        var total = anual ? p.progreso.recursos[k] : p.progreso.periodos[periodo].recursos[k];
        var prom = anual ? p.progreso.componentes[k].promedio
          : p.progreso.periodos[periodo].componentes[k].promedio;
        return '<div class="bol-recurso"><span>' + esc(Pz.RECURSOS[k].nombre) + '</span>' +
          '<strong>' + PD.fmt.entero(total) + '</strong>' +
          '<small>promedio ' + notaTxt(prom) + '</small></div>';
      }).join('') + '</div>' +
      '<div class="bol-progreso-derecha">' +
      '<p class="bol-subtitulo" style="margin-top:0">Camino a ELEMENTUM</p>' +
      '<div class="bol-barra"><i style="width:' + p.dragones.progresoElementum + '%"></i></div>' +
      '<p class="bol-pie-nota">' + PD.fmt.entero(p.progreso.recursos.gemas) + ' de ' +
      PD.fmt.entero(PD.motor.GEMAS_META) + ' gemas acumuladas en el año · ' +
      p.dragones.desbloqueados + ' de ' + p.dragones.total + ' dragones despiertos' +
      (grupo && grupo.promedio !== null
        ? ' · promedio del grupo: ' + notaTxt(grupo.promedio) +
          (grupo.puesto ? ' · puesto ' + grupo.puesto + ' de ' + grupo.total : '')
        : '') + '.</p>' +
      '<div class="bol-dragones">' + p.dragones.lista.map(function (d) {
        return '<div class="bol-dragon ' + (d.desbloqueado ? '' : 'cerrado') + '">' +
          '<img src="' + Pz.rutaDragon(d.slug, true) + '" alt="' + esc(d.nombre) + '">' +
          '<span>' + esc(d.nombre) + '</span></div>';
      }).join('') + '</div>' +
      '</div></div></section>';

    /* --- Observaciones ------------------------------------------------------ */
    var conObs = misiones.filter(function (m) { return m.observaciones; });
    var concepto = p.est.notas
      ? '<p class="bol-concepto"><strong>Concepto general:</strong> ' + esc(p.est.notas) + '</p>'
      : '';
    var observaciones = conObs.length
      ? '<section class="bol-bloque">' +
        '<h3 class="bol-seccion-titulo">Observaciones del docente</h3>' + concepto +
        '<table class="bol-tabla bol-observaciones"><tbody>' +
        conObs.map(function (m) {
          return '<tr><td class="num">' + m.numero + '</td>' +
            '<td><strong>' + esc(m.titulo) + '</strong></td>' +
            '<td>' + esc(m.observaciones) + '</td>' +
            '<td class="num">' + notaTxt(m.promedio) + '</td></tr>';
        }).join('') + '</tbody></table></section>'
      : (concepto
        ? '<section class="bol-bloque"><h3 class="bol-seccion-titulo">Observaciones del docente</h3>' +
          concepto + '</section>'
        : '');

    /* --- Firmas y pie ------------------------------------------------------- */
    var firmas =
      '<footer class="bol-firmas">' +
      '<div class="bol-firma"><hr>' + esc(docente) + '<br>Docente del área</div>' +
      '<div class="bol-firma"><hr>Firma del padre, madre o acudiente</div>' +
      '</footer>' +
      '<div class="bol-pie">' +
      '<span>' + esc(institucion) + (anio ? ' · Año lectivo ' + esc(anio) : '') + '</span>' +
      '<span>Generado el ' + esc(PD.fmt.fecha(new Date().toISOString())) + '</span>' +
      '</div>';

    return '<article class="boletin-hoja">' + cabecera + identificacion + tabla +
      consolidado + progreso + observaciones + firmas + '</article>';
  }

  function notaTxt(v) { return (v === null || v === undefined) ? '—' : PD.fmt.nota(v); }

  /* ======================================================================== */
  /* Impresión                                                                */
  /* ======================================================================== */
  function imprimir(selector) {
    var zona = PD.$(selector);
    if (!zona) { PD.tostada('No se encontró el documento para imprimir.', 'error'); return; }
    document.body.classList.add('imprimiendo');
    var limpiar = function () {
      document.body.classList.remove('imprimiendo');
      global.removeEventListener('afterprint', limpiar);
    };
    global.addEventListener('afterprint', limpiar);
    global.setTimeout(function () {
      global.print();
      // Safari en iOS no siempre dispara afterprint.
      global.setTimeout(limpiar, 1500);
    }, 80);
  }

  /* ======================================================================== */
  /* Rasterizado a PNG                                                        */
  /* ======================================================================== */
  function cssDelDocumento() {
    var partes = [];
    Array.prototype.forEach.call(document.styleSheets, function (hoja) {
      try {
        Array.prototype.forEach.call(hoja.cssRules, function (regla) { partes.push(regla.cssText); });
      } catch (e) {
        // Hoja de otro origen (CDN) o file:// bloqueado: se omite.
      }
    });
    return partes.join('\n');
  }

  function aDataUri(url) {
    return global.fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolver, rechazar) {
        var lector = new FileReader();
        lector.onload = function () { resolver(lector.result); };
        lector.onerror = rechazar;
        lector.readAsDataURL(blob);
      });
    });
  }

  /** Sustituye cada <img> del clon por su versión data: para que viaje al SVG. */
  function incrustarImagenes(clon) {
    var imgs = Array.prototype.slice.call(clon.querySelectorAll('img'));
    return Promise.all(imgs.map(function (img) {
      var src = img.getAttribute('src');
      if (!src || src.indexOf('data:') === 0) return Promise.resolve();
      return aDataUri(src).then(function (uri) { img.setAttribute('src', uri); })
        .catch(function () { img.remove(); });
    }));
  }

  function aPng(nodo, nombre, escala) {
    if (!nodo) { PD.tostada('No se encontró el documento.', 'error'); return; }
    PD.tostada('Generando la imagen…', 'info', 1800);

    // Camino principal: html2canvas redibuja el nodo en un canvas limpio.
    if (global.html2canvas) {
      canvasDeNodo(nodo, escala || 2).then(function (lienzo) {
        return new Promise(function (resolver, rechazar) {
          try {
            lienzo.toBlob(function (png) {
              if (png) resolver(png); else rechazar(new Error('canvas vacío'));
            }, 'image/png');
          } catch (e) { rechazar(e); }
        });
      }).then(function (png) {
        PD.descargar(nombre || 'documento.png', png, 'image/png');
        PD.tostada('Imagen descargada.', 'ok');
      }).catch(function (e) {
        if (global.console) console.warn('html2canvas falló, se intenta el respaldo:', e);
        porForeignObject(nodo, nombre, escala);
      });
      return;
    }
    porForeignObject(nodo, nombre, escala);
  }

  /** Respaldo: el HTML dentro de un <foreignObject> de SVG. Algunos
      navegadores marcan el canvas como "manchado" y no dejan exportarlo;
      en ese caso se ofrece imprimir. */
  function porForeignObject(nodo, nombre, escala) {
    if (global.location.protocol === 'file:') {
      avisoImpresion();
      return;
    }
    var rect = nodo.getBoundingClientRect();
    var ancho = Math.ceil(rect.width);
    var alto = Math.ceil(rect.height);
    var factor = escala || 2;
    var clon = nodo.cloneNode(true);
    clon.style.margin = '0';
    clon.style.transform = 'none';
    clon.style.position = 'static';
    clon.style.animation = 'none';

    incrustarImagenes(clon).then(function () {
      var fondo = (getComputedStyle(document.documentElement)
        .getPropertyValue('--panel') || '#111b31').trim();

      // El <foreignObject> se lee como XML: hay que serializar en XHTML para
      // que <img> y <br> queden cerrados, y encerrar el CSS en CDATA.
      var marca = new XMLSerializer().serializeToString(clon);
      var html =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + ancho * factor + '" height="' + alto * factor + '" ' +
        'viewBox="0 0 ' + ancho + ' ' + alto + '">' +
        '<foreignObject width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + ancho + 'px;background:' + fondo + '">' +
        '<style><![CDATA[' + cssDelDocumento() + ']]></style>' +
        marca +
        '</div></foreignObject></svg>';

      var blob = new Blob([html], { type: 'image/svg+xml;charset=utf-8' });
      var dibujo = global.createImageBitmap
        ? global.createImageBitmap(blob).catch(function () { return imagenDesde(blob); })
        : imagenDesde(blob);

      return dibujo.then(function (bitmap) {
        var lienzo = document.createElement('canvas');
        lienzo.width = ancho * factor;
        lienzo.height = alto * factor;
        var ctx = lienzo.getContext('2d');
        ctx.fillStyle = fondo || '#0b1324';
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);
        ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
        return new Promise(function (resolver) {
          lienzo.toBlob(function (png) { resolver(png); }, 'image/png');
        });
      });
    }).then(function (png) {
      if (!png) throw new Error('sin imagen');
      PD.descargar(nombre || 'documento.png', png, 'image/png');
      PD.tostada('Imagen descargada.', 'ok');
    }).catch(function (e) {
      if (global.console) console.warn('Rasterizado fallido:', e);
      avisoImpresion();
    });
  }

  function imagenDesde(blob) {
    return new Promise(function (resolver, rechazar) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolver(img); };
      img.onerror = function (e) { URL.revokeObjectURL(url); rechazar(e); };
      img.src = url;
    });
  }

  function avisoImpresion() {
    PD.modal.abrir({
      titulo: 'Descarga en PNG no disponible',
      cuerpo: '<p>El navegador no permite generar la imagen cuando el portal se abre con doble clic ' +
        '(dirección <code>file://</code>) o cuando el diseño viene de un servidor externo.</p>' +
        '<p style="margin-top:10px">Tienes dos caminos:</p>' +
        '<ul style="margin:10px 0 0 18px;display:grid;gap:6px">' +
        '<li>Usa <strong>Imprimir → Guardar como PDF</strong>: el documento sale idéntico.</li>' +
        '<li>O abre el portal con <code>Abrir portal.bat</code> (servidor local) y vuelve a intentarlo.</li>' +
        '</ul>',
      pie: '<button type="button" class="boton boton-mini" data-accion="cerrar-modal">Entendido</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-imprimir="1">' +
        '<i class="fa-solid fa-print" aria-hidden="true"></i><span>Imprimir ahora</span></button>',
      despues: function (caja) {
        var btn = caja.querySelector('[data-imprimir]');
        if (btn) btn.addEventListener('click', function () {
          PD.modal.cerrar();
          imprimir('.zona-impresion');
        });
      }
    });
  }

  /* ======================================================================== */
  /* CSV                                                                      */
  /* ======================================================================== */
  function csvMisiones(p) {
    var lineas = [['Numero', 'Mision', 'Tema', 'Periodo', 'Gemas', 'Cristales', 'Runas', 'Lazos',
      'Promedio', 'Observaciones'].join(';')];
    p.misiones.forEach(function (m) {
      lineas.push([
        m.numero, campo(m.titulo), campo(m.tema), m.periodo_id,
        csvNota(m.notas.gemas), csvNota(m.notas.cristales),
        csvNota(m.notas.runas), csvNota(m.notas.lazos),
        csvNota(m.promedio), campo(m.observaciones)
      ].join(';'));
    });
    var contenido = '﻿' + lineas.join('\r\n');
    var ok = PD.descargar('Misiones-' + (p.codigo || 'guardian') + '.csv', contenido,
      'text/csv;charset=utf-8');
    PD.tostada(ok ? 'Archivo CSV descargado.' : 'No se pudo descargar el archivo.', ok ? 'ok' : 'error');
  }

  function campo(texto) { return '"' + String(texto || '').replace(/"/g, '""') + '"'; }
  function csvNota(v) { return (v === null || v === undefined) ? '' : String(v).replace('.', ','); }

  /* ======================================================================== */
  /* PDF, HTML autónomo y Excel                                               */
  /* ======================================================================== */
  /**
   * color(srgb 0.83 0.68 0.21 / 0.3) -> rgba(212,174,54,0.3)
   * El navegador resuelve color-mix() a la función color(), que el rasterizador
   * no entiende; se traduce antes de dibujar.
   */
  function convertirColorSrgb(valor) {
    return String(valor).replace(
      /color\(srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)(?:\s*\/\s*([\d.eE+-]+%?))?\)/g,
      function (todo, r, g, b, a) {
        function canal(x) {
          var n = parseFloat(x);
          if (isNaN(n)) return 0;
          return Math.round(Math.min(1, Math.max(0, n)) * 255);
        }
        var alfa = 1;
        if (a !== undefined) {
          alfa = String(a).slice(-1) === '%' ? parseFloat(a) / 100 : parseFloat(a);
          if (isNaN(alfa)) alfa = 1;
        }
        return 'rgba(' + canal(r) + ',' + canal(g) + ',' + canal(b) + ',' + alfa + ')';
      });
  }

  var PROPIEDADES_COLOR = ['color', 'background-color', 'background-image', 'border-top-color',
    'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color',
    'box-shadow', 'fill', 'stroke'];

  function normalizarColores(raiz) {
    if (!raiz) return;
    var vista = raiz.ownerDocument && raiz.ownerDocument.defaultView;
    if (!vista) return;
    var nodos = [raiz].concat(Array.prototype.slice.call(raiz.querySelectorAll('*')));
    nodos.forEach(function (el) {
      if (!el.style) return;
      var cs;
      try { cs = vista.getComputedStyle(el); } catch (e) { return; }
      PROPIEDADES_COLOR.forEach(function (prop) {
        var v = cs.getPropertyValue(prop);
        if (v && v.indexOf('color(') >= 0) el.style.setProperty(prop, convertirColorSrgb(v));
      });
    });
  }

  function canvasDeNodo(nodo, escala) {
    if (!global.html2canvas) return Promise.reject(new Error('html2canvas no cargó'));
    var fondo = (getComputedStyle(document.documentElement)
      .getPropertyValue('--panel') || '#111b31').trim();
    return global.html2canvas(nodo, {
      scale: escala || 2,
      backgroundColor: fondo,
      logging: false,
      useCORS: true,
      imageTimeout: 8000,
      onclone: function (documentoClon, elementoClon) {
        normalizarColores(elementoClon || documentoClon.body);
      }
    });
  }

  /**
   * Arma un PDF con una página por nodo (boletines o escarapelas en lote).
   * Cada página se dibuja como imagen, así el PDF conserva el diseño exacto.
   */
  function pdfDeNodos(nodos, nombre, opciones) {
    var o = opciones || {};
    var ctor = global.jspdf && global.jspdf.jsPDF;
    var lista = [].concat(nodos).filter(Boolean);
    if (!lista.length) { PD.tostada('No hay nada que exportar.', 'error'); return Promise.resolve(false); }
    if (!ctor || !global.html2canvas) { avisoImpresion(); return Promise.resolve(false); }

    PD.tostada('Preparando el PDF…', 'info', 2200);
    var doc = new ctor({
      orientation: o.orientacion || 'p',
      unit: 'pt',
      format: o.formato || 'letter'
    });
    var ancho = doc.internal.pageSize.getWidth();
    var alto = doc.internal.pageSize.getHeight();
    var margen = o.margen === undefined ? 22 : o.margen;

    var primeraPagina = true;

    /**
     * Puntos por donde se puede cortar sin partir una fila o un bloque:
     * el final de cada sección, fila de tabla o caja del documento.
     */
    function cortesDe(nodo) {
      var arriba = nodo.getBoundingClientRect().top;
      var puntos = [];
      Array.prototype.forEach.call(
        nodo.querySelectorAll('section, tr, .bol-bloque, .bol-caja, .bol-firmas, .bol-pie'),
        function (el) {
          var r = el.getBoundingClientRect();
          if (r.height > 0) puntos.push(r.bottom - arriba);
        });
      puntos.sort(function (a, b) { return a - b; });
      return puntos;
    }

    /** Un documento más alto que la hoja se reparte en varias páginas. */
    function colocar(lienzo, cortes, altoNodo) {
      var util = ancho - margen * 2;
      var escala = util / lienzo.width;
      var altoUtil = alto - margen * 2;
      var altoTotal = lienzo.height * escala;

      if (altoTotal <= altoUtil) {
        if (!primeraPagina) doc.addPage();
        primeraPagina = false;
        doc.addImage(lienzo.toDataURL('image/jpeg', 0.92), 'JPEG',
          margen, margen, util, altoTotal, undefined, 'FAST');
        return;
      }

      var altoTrozo = Math.floor(altoUtil / escala);     // en píxeles del lienzo
      // Del nodo original al lienzo (html2canvas dibuja a otra resolución).
      var aLienzo = altoNodo ? (lienzo.height / altoNodo) : 1;
      var y = 0;
      while (y < lienzo.height) {
        var h = Math.min(altoTrozo, lienzo.height - y);
        if (h === altoTrozo && cortes && cortes.length) {
          // Se busca el último corte limpio que quepa en la página.
          var limite = y + altoTrozo;
          var mejor = 0;
          for (var c = 0; c < cortes.length; c++) {
            var punto = cortes[c] * aLienzo;
            if (punto > y + altoTrozo * 0.45 && punto <= limite) mejor = punto;
          }
          if (mejor) h = Math.round(mejor - y);
        }
        var recorte = document.createElement('canvas');
        recorte.width = lienzo.width;
        recorte.height = h;
        var ctx = recorte.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, recorte.width, recorte.height);
        ctx.drawImage(lienzo, 0, -y);
        if (!primeraPagina) doc.addPage();
        primeraPagina = false;
        doc.addImage(recorte.toDataURL('image/jpeg', 0.92), 'JPEG',
          margen, margen, util, h * escala, undefined, 'FAST');
        y += h;
      }
    }

    return lista.reduce(function (cadena, nodo) {
      return cadena.then(function () {
        var cortes = cortesDe(nodo);
        var altoNodo = nodo.getBoundingClientRect().height;
        return canvasDeNodo(nodo, o.escala || 2).then(function (lienzo) {
          colocar(lienzo, cortes, altoNodo);
        });
      });
    }, Promise.resolve()).then(function () {
      doc.save(nombre || 'documento.pdf');
      PD.tostada('PDF descargado.', 'ok');
      return true;
    }).catch(function (e) {
      if (global.console) console.warn('PDF fallido:', e);
      avisoImpresion();
      return false;
    });
  }

  /**
   * PDF en cuadrícula con el tamaño real de una escarapela.
   * opciones: {ancho, alto} en milímetros, {margen, hueco, marcas, nombre}.
   * Los nodos deben venir con la misma proporción que la celda para que la
   * imagen no se deforme (de eso se encarga quien los prepara).
   */
  function pdfCuadricula(nodos, opciones) {
    var o = opciones || {};
    var ctor = global.jspdf && global.jspdf.jsPDF;
    var lista = [].concat(nodos).filter(Boolean);
    if (!lista.length) { PD.tostada('No hay nada que exportar.', 'error'); return Promise.resolve(false); }
    if (!ctor || !global.html2canvas) { avisoImpresion(); return Promise.resolve(false); }

    var anchoCelda = o.ancho || 86;
    var altoCelda = o.alto || 120;
    var doc = new ctor({ orientation: 'p', unit: 'mm', format: o.formato || 'letter' });
    var anchoPag = doc.internal.pageSize.getWidth();
    var altoPag = doc.internal.pageSize.getHeight();
    // Márgenes ajustados para que quepan 9 carnés CR80 (o 4 colgantes) por hoja.
    var margen = o.margen === undefined ? 8 : o.margen;
    var hueco = o.hueco === undefined ? 2 : o.hueco;

    var cols = Math.max(1, Math.floor((anchoPag - 2 * margen + hueco) / (anchoCelda + hueco)));
    var filas = Math.max(1, Math.floor((altoPag - 2 * margen + hueco) / (altoCelda + hueco)));
    var porPagina = cols * filas;
    var xInicio = (anchoPag - (cols * anchoCelda + (cols - 1) * hueco)) / 2;

    PD.tostada('Preparando ' + lista.length + ' escarapelas…', 'info', 2600);

    return lista.reduce(function (cadena, nodo, i) {
      return cadena.then(function () {
        return canvasDeNodo(nodo, o.escala || 2).then(function (lienzo) {
          var enPagina = i % porPagina;
          if (i > 0 && enPagina === 0) doc.addPage();
          var x = xInicio + (enPagina % cols) * (anchoCelda + hueco);
          var y = margen + Math.floor(enPagina / cols) * (altoCelda + hueco);
          doc.addImage(lienzo.toDataURL('image/jpeg', 0.92), 'JPEG',
            x, y, anchoCelda, altoCelda, undefined, 'FAST');
          if (o.marcas !== false) {                       // guía de corte
            doc.setDrawColor(200);
            doc.setLineWidth(0.1);
            doc.rect(x, y, anchoCelda, altoCelda);
          }
        });
      });
    }, Promise.resolve()).then(function () {
      doc.save(o.nombre || 'escarapelas.pdf');
      PD.tostada('PDF descargado (' + anchoCelda + ' × ' + altoCelda + ' mm).', 'ok');
      return true;
    }).catch(function (e) {
      if (global.console) console.warn('PDF en cuadrícula fallido:', e);
      avisoImpresion();
      return false;
    });
  }

  /**
   * Convierte las imágenes del clon en un diccionario de URIs únicas.
   * Un pliego de 32 escarapelas repite los mismos 13 dragones: guardarlos una
   * sola vez baja el archivo de ~14 MB a poco más de 1 MB.
   */
  function imagenesUnicas(clon) {
    var imgs = Array.prototype.slice.call(clon.querySelectorAll('img'));
    var fuentes = {};
    imgs.forEach(function (img) {
      var src = img.getAttribute('src');
      if (src && src.indexOf('data:') !== 0) fuentes[src] = null;
    });
    var urls = Object.keys(fuentes);
    return Promise.all(urls.map(function (u) {
      return aDataUri(u).then(function (d) { fuentes[u] = d; }).catch(function () { fuentes[u] = null; });
    })).then(function () {
      var diccionario = {};
      var clave = {};
      urls.forEach(function (u, i) {
        if (!fuentes[u]) return;
        clave[u] = 'i' + i;
        diccionario['i' + i] = fuentes[u];
      });
      imgs.forEach(function (img) {
        var src = img.getAttribute('src');
        if (clave[src]) {
          img.setAttribute('data-img', clave[src]);
          img.removeAttribute('src');
        }
      });
      return diccionario;
    });
  }

  /** Guarda el nodo como página HTML independiente (se abre en cualquier PC). */
  function htmlAutonomo(nodo, nombre, titulo, opciones) {
    if (!nodo) return Promise.resolve(false);
    var clon = nodo.cloneNode(true);
    clon.style.animation = 'none';
    var tema = document.documentElement.getAttribute('data-tema') || 'oscuro';

    return imagenesUnicas(clon).catch(function () { return {}; })
      .then(function (imagenes) {
        var o = opciones || {};
        var css = cssDelDocumento();
        var barra = o.interactivo
          ? '<div class="html-barra">' +
            '<span>' + esc(titulo || 'Documento') + '</span>' +
            '<button type="button" onclick="window.print()">Imprimir</button>' +
            (o.girable ? '<small>Toca una escarapela para ver el reverso</small>' : '') +
            '</div>'
          : '';
        var guion =
          '<script>var PD_IMG=' + JSON.stringify(imagenes || {}) + ';' +
          'Array.prototype.forEach.call(document.querySelectorAll("img[data-img]"),' +
          'function(i){var d=PD_IMG[i.getAttribute("data-img")];if(d)i.src=d;});' +
          (o.girable
            ? 'document.addEventListener("click",function(e){' +
              'var t=e.target.closest(".escarapela-lote,.escarapela");' +
              'if(t){t.classList.toggle("mostrar-reverso");t.classList.toggle("girada");}});'
            : '') +
          '<\/script>';
        var pagina = [
          '<!DOCTYPE html>',
          '<html lang="es" data-tema="' + tema + '">',
          '<head>',
          '<meta charset="UTF-8">',
          '<meta name="viewport" content="width=device-width, initial-scale=1">',
          '<title>' + esc(titulo || nombre || 'Documento') + '</title>',
          '<style>',
          css,
          'body{padding:24px;display:grid;justify-items:center;gap:20px}',
          '.html-barra{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;' +
          'padding:10px 16px;border-radius:99px;border:1px solid var(--borde,#243352);' +
          'background:var(--panel,#111b31);color:var(--texto,#e9eefb);font-size:13px}',
          '.html-barra button{padding:7px 16px;border-radius:99px;border:0;cursor:pointer;' +
          'background:linear-gradient(135deg,#d4af37,#f0d878);color:#221a05;font-weight:600}',
          '.html-barra small{color:var(--tenue,#6b7fa6)}',
          '@media print{.html-barra{display:none}}',
          '</style>',
          '</head>',
          '<body>',
          barra,
          clon.outerHTML,
          guion,
          '</body>',
          '</html>'
        ].join('\n');
        var ok = PD.descargar(nombre || 'documento.html', pagina, 'text/html;charset=utf-8');
        PD.tostada(ok ? 'Archivo HTML descargado.' : 'No se pudo descargar.', ok ? 'ok' : 'error');
        return ok;
      });
  }

  /**
   * Libro de Excel real cuando la librería está disponible; si no, CSV.
   * hojas = [{nombre, filas: [[celda, celda…], …]}]
   */
  function excel(hojas, nombre) {
    var lista = [].concat(hojas).filter(function (h) { return h && h.filas; });
    if (!lista.length) { PD.tostada('No hay datos que exportar.', 'error'); return false; }

    if (global.XLSX) {
      var libro = global.XLSX.utils.book_new();
      lista.forEach(function (h, i) {
        var hoja = global.XLSX.utils.aoa_to_sheet(h.filas);
        hoja['!cols'] = (h.filas[0] || []).map(function (_, c) {
          var largo = 10;
          h.filas.forEach(function (f) {
            var v = f[c] === null || f[c] === undefined ? '' : String(f[c]);
            if (v.length > largo) largo = Math.min(46, v.length);
          });
          return { wch: largo + 2 };
        });
        if (h.filas.length) hoja['!freeze'] = { xSplit: 0, ySplit: 1 };
        global.XLSX.utils.book_append_sheet(libro, hoja,
          (h.nombre || ('Hoja' + (i + 1))).slice(0, 28));
      });
      global.XLSX.writeFile(libro, nombre || 'reporte.xlsx');
      PD.tostada('Excel descargado.', 'ok');
      return true;
    }

    // Respaldo sin librería: la primera hoja como CSV con separador punto y coma.
    var csv = lista[0].filas.map(function (fila) {
      return fila.map(function (c) {
        return '"' + String(c === null || c === undefined ? '' : c).replace(/"/g, '""') + '"';
      }).join(';');
    }).join('\r\n');
    var ok = PD.descargar((nombre || 'reporte').replace(/\.xlsx$/i, '') + '.csv',
      '﻿' + csv, 'text/csv;charset=utf-8');
    PD.tostada(ok ? 'Se descargó en CSV (Excel no disponible sin internet).' : 'No se pudo descargar.',
      ok ? 'ok' : 'error');
    return ok;
  }

  PD.docs = {
    escarapelaHtml: escarapelaHtml,
    boletinHtml: boletinHtml,
    imprimir: imprimir,
    aPng: aPng,
    csvMisiones: csvMisiones,
    canvasDeNodo: canvasDeNodo,
    pdfDeNodos: pdfDeNodos,
    pdfCuadricula: pdfCuadricula,
    htmlAutonomo: htmlAutonomo,
    excel: excel
  };

})(window);
