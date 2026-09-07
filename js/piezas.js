/* ==========================================================================
   piezas.js · Piezas de interfaz reutilizables
   Cada función devuelve una cadena HTML lista para insertar. El texto que
   viene de los datos siempre pasa por PD.esc().
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var esc = PD.esc;

  var RECURSOS = {
    gemas: { nombre: 'Gemas', icono: 'fa-gem', variable: '--gemas', evalua: 'Taller práctico · aplicación' },
    cristales: { nombre: 'Cristales', icono: 'fa-icicles', variable: '--cristales', evalua: 'Actividad gamificada · agilidad' },
    runas: { nombre: 'Runas', icono: 'fa-scroll', variable: '--runas', evalua: 'Bitácora 1 · ingenio e investigación' },
    lazos: { nombre: 'Lazos', icono: 'fa-handshake-angle', variable: '--lazos', evalua: 'Bitácora 2 · equipo y autorreflexión' }
  };

  var ELEMENTOS = {
    'Tierra': { icono: 'fa-mountain', variable: '--tierra' },
    'Agua': { icono: 'fa-droplet', variable: '--agua' },
    'Fuego': { icono: 'fa-fire', variable: '--fuego' },
    'Aire': { icono: 'fa-wind', variable: '--aire' },
    'Elemental': { icono: 'fa-crown', variable: '--elemental' }
  };

  /** Ruta del avatar del dragón (mini = versión ligera de 256 px). */
  function rutaDragon(slug, mini) {
    var s = String(slug || 'terrox').toLowerCase();
    return 'assets/dragones/' + s + (mini ? '_t' : '') + '.webp';
  }

  /** "#d4af37" + 0.34 -> "rgba(212,175,55,0.34)". Los documentos que se
      convierten en PNG no pueden usar color-mix(): el rasterizador no lo
      entiende, así que el color se calcula aquí y viaja como variable CSS. */
  function rgba(hex, alfa) {
    var h = String(hex || '#d4af37').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return 'rgba(212,175,55,' + alfa + ')';
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alfa + ')';
  }

  function colorElemento(elemento) {
    var e = ELEMENTOS[elemento];
    return e ? 'var(' + e.variable + ')' : 'var(--oro)';
  }

  function iconoElemento(elemento) {
    var e = ELEMENTOS[elemento];
    return e ? e.icono : 'fa-dragon';
  }

  /* --------------------------------------------------------- Contenedores */
  function tarjeta(o) {
    var acciones = o.acciones ? '<div class="tarjeta-acciones">' + o.acciones + '</div>' : '';
    var sub = o.sub ? '<span class="tarjeta-sub">' + esc(o.sub) + '</span>' : '';
    var cabecera = (o.titulo || o.acciones)
      ? '<div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">' +
        (o.icono ? '<i class="fa-solid ' + o.icono + '" aria-hidden="true"></i>' : '') +
        '<span>' + esc(o.titulo || '') + '</span>' + sub + '</h2>' + acciones + '</div>'
      : '';
    return '<section class="tarjeta ' + (o.clase || '') + '"' +
      (o.estilo ? ' style="' + o.estilo + '"' : '') + '>' +
      cabecera + (o.cuerpo || '') + '</section>';
  }

  function vacio(texto, icono) {
    return '<div class="vacio"><i class="fa-solid ' + (icono || 'fa-wind') + '" aria-hidden="true"></i>' +
      '<p>' + esc(texto) + '</p></div>';
  }

  /* ------------------------------------------------------------- Métricas */
  function kpi(o) {
    var acento = o.acento || 'var(--oro)';
    return '<article class="kpi" style="--acento:' + acento + '">' +
      '<div class="kpi-icono"><i class="fa-solid ' + (o.icono || 'fa-star') + '" aria-hidden="true"></i></div>' +
      '<div class="kpi-valor" data-animar="' + (o.valor === null || o.valor === undefined ? '' : o.valor) + '"' +
      ' data-decimales="' + (o.decimales || 0) + '" data-sufijo="' + esc(o.sufijo || '') + '">' +
      (o.valor === null || o.valor === undefined ? '—' : '0') + '</div>' +
      '<div class="kpi-etiqueta">' + esc(o.etiqueta) + '</div>' +
      (o.pie ? '<div class="kpi-pie">' + esc(o.pie) + '</div>' : '') +
      '</article>';
  }

  function barra(o) {
    var acento = o.acento || 'var(--oro)';
    var pct = o.porcentaje !== undefined ? o.porcentaje
      : (o.max ? 100 * (o.valor || 0) / o.max : 0);
    pct = Math.max(0, Math.min(100, pct));
    var linea = (o.etiqueta || o.texto)
      ? '<div class="barra-linea"><span>' + esc(o.etiqueta || '') + '</span>' +
        '<strong>' + esc(o.texto !== undefined ? o.texto : PD.fmt.numero(pct, 0) + ' %') + '</strong></div>'
      : '';
    return '<div class="barra-bloque" style="--acento:' + acento + '">' + linea +
      '<div class="barra' + (o.fina ? ' barra-fina' : '') + '">' +
      '<div class="barra-relleno" data-valor="' + pct.toFixed(1) + '"></div></div></div>';
  }

  function marcaNivel(nivel) {
    if (!nivel) return '';
    return '<span class="marca-nivel nivel-' + esc(nivel.clave) + '">' +
      '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>' + esc(nivel.etiqueta) + '</span>';
  }

  function pastilla(texto, icono, clase) {
    return '<span class="pastilla ' + (clase || '') + '">' +
      (icono ? '<i class="fa-solid ' + icono + '" aria-hidden="true"></i>' : '') + esc(texto) + '</span>';
  }

  /* ------------------------------------------------------------ Recursos  */
  function recurso(clave, valor, promedio) {
    var r = RECURSOS[clave] || RECURSOS.gemas;
    return '<article class="recurso" style="--acento:var(' + r.variable + ')" title="' + esc(r.evalua) + '">' +
      '<div class="recurso-icono"><i class="fa-solid ' + r.icono + '" aria-hidden="true"></i></div>' +
      '<div class="recurso-datos">' +
      '<div class="recurso-valor" data-animar="' + (valor || 0) + '" data-decimales="0">0</div>' +
      '<div class="recurso-nombre">' + esc(r.nombre) + '</div>' +
      '<div class="recurso-nota">' + (promedio === null || promedio === undefined
        ? 'sin registros' : 'promedio ' + PD.fmt.nota(promedio)) + '</div>' +
      '</div></article>';
  }

  function tiraRecursos(progreso) {
    return '<div class="tira-recursos">' + PD.motor.CLAVES.map(function (k) {
      return recurso(k, progreso.recursos[k], progreso.componentes[k].promedio);
    }).join('') + '</div>';
  }

  /* ----------------------------------------------------------- Insignias  */
  function insignia(i) {
    var cuerpo = '<div class="insignia-icono"><i class="fa-solid ' + i.icono + '" aria-hidden="true"></i></div>' +
      '<div class="insignia-nombre">' + esc(i.nombre) + '</div>' +
      '<div class="insignia-desc">' + esc(i.desc) + '</div>';
    if (!i.ganada) {
      cuerpo += '<div class="insignia-progreso">' + barra({
        porcentaje: i.progreso, fina: true, acento: i.acento,
        texto: PD.fmt.numero(i.valor, i.decimales || 0) + ' / ' + PD.fmt.numero(i.meta, i.decimales || 0),
        etiqueta: 'Falta'
      }) + '</div>';
    } else {
      cuerpo += '<span class="pastilla pastilla-oro"><i class="fa-solid fa-check" aria-hidden="true"></i>Conseguida</span>';
    }
    return '<article class="insignia ' + (i.ganada ? 'ganada' : 'bloqueada') + '" style="--acento:' + i.acento + '">' +
      cuerpo + '</article>';
  }

  /* ------------------------------------------------------------- Dragones */
  function cartaDragon(d, opciones) {
    var o = opciones || {};
    var abierto = d.desbloqueado;
    var clases = 'carta-dragon ' + (abierto ? 'abierta' : 'cerrada') + (o.actual ? ' actual' : '');
    var falta = '';
    if (!abierto) {
      var f = d.faltantes;
      var partes = [];
      if (f.gemas) partes.push(f.gemas + ' gemas');
      if (f.cristales) partes.push(f.cristales + ' cristales');
      if (f.runas) partes.push(f.runas + ' runas');
      if (f.lazos) partes.push(f.lazos + ' lazos');
      falta = barra({
        porcentaje: d.progreso, fina: true, acento: d.color,
        etiqueta: partes.length ? 'Falta ' + partes.join(' · ') : 'Casi listo',
        texto: PD.fmt.numero(d.progreso, 0) + ' %'
      });
    } else {
      falta = '<span class="pastilla pastilla-oro"><i class="fa-solid fa-unlock" aria-hidden="true"></i>Desbloqueado</span>';
    }

    return '<article class="' + clases + '" style="--acento:' + d.color + '" data-dragon="' + esc(d.slug) + '" ' +
      'tabindex="0" role="button" aria-label="Ver ficha de ' + esc(d.nombre) + '">' +
      (o.actual ? '<span class="cinta-actual">ACTUAL</span>' : '') +
      '<div class="carta-dragon-arte">' +
      '<img src="' + rutaDragon(d.slug, true) + '" alt="' + esc(d.nombre) + '" loading="lazy">' +
      (abierto ? '' : '<span class="carta-candado"><i class="fa-solid fa-lock" aria-hidden="true"></i></span>') +
      '</div>' +
      '<div class="carta-dragon-nombre"><span>' + esc(d.nombre) + '</span>' +
      '<span class="carta-dragon-numero">#' + d.id + '</span></div>' +
      '<div class="carta-dragon-poder"><i class="fa-solid ' + iconoElemento(d.elemento) + '" aria-hidden="true"></i> ' +
      esc(d.poder) + '</div>' +
      '<p class="carta-dragon-desc">' + esc(d.descripcion) + '</p>' +
      falta + '</article>';
  }

  /* ------------------------------------------------------------- Misiones */
  function celdaMision(m) {
    var clase = m.completa ? 'hecha' : (m.registrada ? 'parcial' : '');
    var titulo = m.numero + '. ' + m.titulo +
      (m.promedio !== null ? ' — ' + PD.fmt.nota(m.promedio) : ' — sin registro');
    return '<button type="button" class="celda-mision ' + clase + '" style="--acento:' + m.color + '" ' +
      'data-mision="' + m.numero + '" title="' + esc(titulo) + '">' +
      '<span>' + m.numero + '</span>' +
      (m.promedio !== null ? '<small>' + PD.fmt.numero(m.promedio, 1) + '</small>' : '') +
      '</button>';
  }

  function tablaMisiones(perfil, opciones) {
    var o = opciones || {};
    var filas = perfil.misiones.filter(function (m) {
      if (o.periodo && Number(m.periodo_id) !== Number(o.periodo)) return false;
      if (o.soloRegistradas && !m.registrada) return false;
      return true;
    });
    if (!filas.length) return vacio('Todavía no hay misiones registradas en este periodo.', 'fa-scroll');

    var cuerpo = filas.map(function (m) {
      var nivel = PD.motor.nivelDe(m.promedio);
      return '<tr class="' + (m.registrada ? '' : 'sin-registro') + '">' +
        '<td class="num">' + m.numero + '</td>' +
        '<td><strong>' + esc(m.titulo) + '</strong>' +
        (m.tema ? '<br><span class="tarjeta-sub">' + esc(m.tema) + '</span>' : '') + '</td>' +
        '<td class="num">' + (m.notas.gemas === null ? '—' : PD.fmt.nota(m.notas.gemas)) + '</td>' +
        '<td class="num">' + (m.notas.cristales === null ? '—' : PD.fmt.nota(m.notas.cristales)) + '</td>' +
        '<td class="num">' + (m.notas.runas === null ? '—' : PD.fmt.nota(m.notas.runas)) + '</td>' +
        '<td class="num">' + (m.notas.lazos === null ? '—' : PD.fmt.nota(m.notas.lazos)) + '</td>' +
        '<td class="num"><strong class="nivel-' + nivel.clave + '">' +
        (m.promedio === null ? '—' : PD.fmt.nota(m.promedio)) + '</strong></td>' +
        '</tr>';
    }).join('');

    return '<div class="tabla-envoltorio"><table class="tabla">' +
      '<thead><tr><th>#</th><th>Misión</th><th class="num">Gemas</th><th class="num">Cristales</th>' +
      '<th class="num">Runas</th><th class="num">Lazos</th><th class="num">Promedio</th></tr></thead>' +
      '<tbody>' + cuerpo + '</tbody></table></div>';
  }

  /* ------------------------------------------------------------- Personas */
  function miniPersona(perfil, opciones) {
    var o = opciones || {};
    var nombre = o.alias ? alias(perfil) : perfil.nombre;
    return '<div class="celda-persona">' +
      '<img class="mini-avatar" src="' + rutaDragon(perfil.avatar, true) + '" alt="" loading="lazy">' +
      '<div><div>' + esc(nombre) + '</div>' +
      (o.sub ? '<div class="tarjeta-sub">' + esc(o.sub) + '</div>' : '') + '</div></div>';
  }

  /** Nombre corto para proyectar el ranking sin exponer a todo el curso. */
  function alias(perfil) {
    var n = (perfil.est.nombres || '').trim().split(/\s+/)[0] || '';
    var a = (perfil.est.apellidos || '').trim()[0] || '';
    return n + (a ? ' ' + a + '.' : '');
  }

  function medallon(puesto) {
    var clase = puesto === 1 ? 'oro' : (puesto === 2 ? 'plata' : (puesto === 3 ? 'bronce' : ''));
    return '<span class="medallon ' + clase + '">' + puesto + '</span>';
  }

  PD.piezas = {
    RECURSOS: RECURSOS,
    ELEMENTOS: ELEMENTOS,
    rutaDragon: rutaDragon,
    rgba: rgba,
    colorElemento: colorElemento,
    iconoElemento: iconoElemento,
    tarjeta: tarjeta,
    vacio: vacio,
    kpi: kpi,
    barra: barra,
    marcaNivel: marcaNivel,
    pastilla: pastilla,
    recurso: recurso,
    tiraRecursos: tiraRecursos,
    insignia: insignia,
    cartaDragon: cartaDragon,
    celdaMision: celdaMision,
    tablaMisiones: tablaMisiones,
    miniPersona: miniPersona,
    alias: alias,
    medallon: medallon
  };

})(window);
