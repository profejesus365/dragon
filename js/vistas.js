/* ==========================================================================
   vistas.js · Las siete pantallas del portal
   Cada vista expone: titulo, subtitulo(ctx), html(ctx) y luego(ctx).
   `html` devuelve la cadena que se inserta en <main>; `luego` se ejecuta ya
   con el HTML en el DOM (gráficas, eventos propios de la vista).
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var esc = PD.esc;

  function piezas() { return PD.piezas; }

  /* ---------------------------------------------------------- Auxiliares - */
  function acentoRecurso(clave) { return 'var(--' + clave + ')'; }

  function nombrePeriodo(id) {
    var p = PD.datos.periodo(id);
    return p ? (p.nombre + ' · ' + p.elemento) : ('Periodo ' + id);
  }

  function colorPeriodo(id) {
    var p = PD.datos.periodo(id);
    return (p && p.color) || '#d4af37';
  }

  function selectorPeriodo(valor, accion) {
    var opciones = ['<option value="0">Global · todo el año</option>'];
    PD.datos.periodos().forEach(function (p) {
      opciones.push('<option value="' + p.id + '"' + (Number(valor) === p.id ? ' selected' : '') + '>' +
        esc(p.nombre + ' · ' + p.elemento) + '</option>');
    });
    return '<label class="filtro"><span>Periodo</span>' +
      '<select class="control" data-accion="' + accion + '">' + opciones.join('') + '</select></label>';
  }

  /** Datos del curso y del grado del estudiante, ya calculados. */
  function referencias(ctx) {
    if (!ctx._refs) {
      ctx._refs = {
        curso: PD.motor.resumenGrupo(PD.datos.companeros(ctx.est), { periodo: ctx.periodo }),
        grado: PD.motor.resumenGrupo(PD.datos.delGrado(ctx.est), { periodo: ctx.periodo })
      };
    }
    return ctx._refs;
  }

  /* ======================================================================== */
  /* 1. Mi perfil                                                             */
  /* ======================================================================== */
  var vistaPerfil = {
    titulo: 'Mi perfil',
    subtitulo: function (ctx) {
      return ctx.perfil.titulo + ' · ' + ctx.perfil.curso;
    },
    html: function (ctx) {
      var p = ctx.perfil, Pz = piezas();
      var dragon = p.dragonActual || { nombre: 'Sin dragón', color: '#d4af37', poder: '' };
      var refs = referencias(ctx);
      var puesto = ctx.puestoCurso;

      var heroe =
        '<section class="heroe animar-entrada" style="--acento:' + dragon.color + '">' +
        '<div class="heroe-avatar"><div class="heroe-aura"></div>' +
        '<img id="avatar-heroe" src="' + Pz.rutaDragon(p.avatar) + '" alt="' + esc(dragon.nombre) + '" ' +
        'data-accion="mimar" title="Toca a tu guardián"></div>' +

        '<div class="heroe-datos">' +
        '<p class="heroe-saludo">' + esc(saludo()) + ', guardián</p>' +
        '<h2 class="heroe-nombre">' + esc(p.nombre) + '</h2>' +
        '<div class="heroe-etiquetas">' +
        Pz.pastilla(p.titulo, 'fa-award', 'pastilla-oro') +
        Pz.pastilla(p.curso, 'fa-graduation-cap') +
        Pz.pastilla('Código ' + p.codigo, 'fa-key') +
        Pz.marcaNivel(p.progreso.nivel) +
        '</div>' +
        '<p class="heroe-frase" id="frase-guardian">“' + esc(p.animo.frase) + '” — ' + esc(dragon.nombre) + '</p>' +
        '<div class="heroe-xp">' +
        Pz.barra({
          etiqueta: 'Experiencia hacia el nivel ' + (p.nivel.nivel + 1),
          porcentaje: p.nivel.progreso,
          acento: 'var(--oro)',
          texto: PD.fmt.entero(p.nivel.xpEnNivel) + ' / ' + PD.fmt.entero(p.nivel.xpNecesaria) + ' XP'
        }) +
        '</div></div>' +

        '<div class="anillo" style="--avance:' + p.nivel.progreso + ';--acento:' + dragon.color + '">' +
        '<div class="anillo-centro"><span class="anillo-numero">' + p.nivel.nivel + '</span>' +
        '<span class="anillo-texto">Nivel</span></div></div>' +
        '</section>';

      var kpis = '<div class="rejilla-kpi">' +
        Pz.kpi({
          icono: 'fa-star', etiqueta: 'Promedio general', decimales: 2,
          valor: p.progreso.promedio, acento: 'var(--oro)',
          pie: p.progreso.nivel.etiqueta
        }) +
        Pz.kpi({
          icono: 'fa-scroll', etiqueta: 'Misiones', valor: p.progreso.misiones_registradas,
          acento: 'var(--cian)', pie: 'de ' + p.progreso.misiones_totales + ' del año'
        }) +
        Pz.kpi({
          icono: 'fa-dragon', etiqueta: 'Dragones', valor: p.dragones.desbloqueados,
          acento: 'var(--violeta)', pie: 'de ' + p.dragones.total + ' del bestiario'
        }) +
        Pz.kpi({
          icono: 'fa-fire', etiqueta: 'Racha actual', valor: p.racha.actual,
          acento: 'var(--runas)', pie: 'mejor racha: ' + p.racha.mejor
        }) +
        Pz.kpi({
          icono: 'fa-trophy', etiqueta: 'Puesto en el curso', valor: puesto,
          acento: 'var(--lazos)', pie: 'entre ' + refs.curso.estudiantes + ' guardianes'
        }) +
        '</div>';

      var elementum = Pz.tarjeta({
        titulo: 'Camino a ELEMENTUM', icono: 'fa-crown',
        sub: 'El Gran Dragón despierta con 2.040 gemas',
        cuerpo:
          Pz.barra({
            etiqueta: 'Gemas acumuladas', porcentaje: p.dragones.progresoElementum,
            acento: 'var(--oro)',
            texto: PD.fmt.entero(p.progreso.recursos.gemas) + ' / ' + PD.fmt.entero(PD.motor.GEMAS_META)
          }) +
          (p.dragones.siguiente
            ? '<div class="rejilla rejilla-2" style="margin-top:16px">' +
              '<div class="recurso" style="--acento:' + p.dragones.siguiente.color + '">' +
              '<img class="mini-avatar" style="width:46px;height:46px;border-radius:12px" src="' +
              Pz.rutaDragon(p.dragones.siguiente.slug, true) + '" alt="">' +
              '<div class="recurso-datos"><div class="recurso-valor" style="font-size:16px">' +
              esc(p.dragones.siguiente.nombre) + '</div>' +
              '<div class="recurso-nombre">Tu próximo guardián</div>' +
              '<div class="recurso-nota">' + esc(faltaTexto(p.dragones.siguiente)) + '</div></div></div>' +
              '<div>' + Pz.barra({
                etiqueta: 'Progreso hacia ' + p.dragones.siguiente.nombre,
                porcentaje: p.dragones.siguiente.progreso,
                acento: p.dragones.siguiente.color,
                texto: PD.fmt.numero(p.dragones.siguiente.progreso, 0) + ' %'
              }) + '</div></div>'
            : '<p class="tarjeta-sub" style="margin-top:14px">' +
              '¡Has despertado a los doce dragones! ELEMENTUM vuela contigo.</p>')
      });

      var recursos = Pz.tarjeta({
        titulo: 'Mis recursos', icono: 'fa-sack-dollar',
        sub: 'Recursos = nota × 10 en cada actividad',
        cuerpo: Pz.tiraRecursos(p.progreso)
      });

      var insignias = Pz.tarjeta({
        titulo: 'Insignias', icono: 'fa-medal',
        sub: p.insigniasGanadas + ' de ' + p.insignias.length + ' conseguidas',
        cuerpo: '<div class="rejilla-insignias">' +
          p.insignias.map(Pz.insignia).join('') + '</div>'
      });

      var avisos = PD.datos.avisosDe(ctx.est).slice(0, 2);
      var tablon = avisos.length ? Pz.tarjeta({
        titulo: 'Últimos avisos', icono: 'fa-bullhorn',
        acciones: '<a class="boton boton-mini boton-fantasma" href="#/boletines">Ver todos</a>',
        cuerpo: '<div class="lista-avisos">' + avisos.map(tarjetaAviso).join('') + '</div>'
      }) : '';

      return heroe + kpis +
        '<div class="rejilla rejilla-2">' + elementum + recursos + '</div>' +
        insignias + tablon;
    },
    luego: function (ctx) {
      var img = PD.$('#avatar-heroe');
      if (img) {
        img.addEventListener('click', function () {
          var frases = PD.motor.frasesMimo(ctx.perfil.animo.clave);
          var frase = frases[Math.floor(Math.random() * frases.length)];
          var caja = PD.$('#frase-guardian');
          if (caja) caja.innerHTML = '“' + esc(frase) + '” — ' +
            esc((ctx.perfil.dragonActual || {}).nombre || 'Tu guardián');
          img.style.animation = 'none';
          global.requestAnimationFrame(function () { img.style.animation = ''; });
          PD.tostada('Tu guardián responde a tu llamado.', 'info', 2200);
        });
      }
    }
  };

  function saludo() {
    var h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function faltaTexto(d) {
    var f = d.faltantes, partes = [];
    if (f.gemas) partes.push(f.gemas + ' gemas');
    if (f.cristales) partes.push(f.cristales + ' cristales');
    if (f.runas) partes.push(f.runas + ' runas');
    if (f.lazos) partes.push(f.lazos + ' lazos');
    return partes.length ? 'Te faltan ' + partes.join(', ') : 'Requisitos cumplidos';
  }

  var ICONO_AVISO = { mision: 'fa-scroll', logro: 'fa-trophy', urgente: 'fa-triangle-exclamation', aviso: 'fa-bullhorn' };
  var COLOR_AVISO = { mision: 'var(--cian)', logro: 'var(--oro)', urgente: 'var(--bajo)', aviso: 'var(--violeta)' };

  function tarjetaAviso(a) {
    var tipo = ICONO_AVISO[a.tipo] ? a.tipo : 'aviso';
    return '<article class="aviso" style="--acento:' + COLOR_AVISO[tipo] + '">' +
      '<div class="aviso-cabeza"><h3 class="aviso-titulo">' +
      '<i class="fa-solid ' + ICONO_AVISO[tipo] + '" aria-hidden="true"></i>' + esc(a.titulo) + '</h3>' +
      '<span class="aviso-fecha">' + esc(PD.fmt.fecha(a.fecha)) + '</span></div>' +
      (a.texto ? '<p class="aviso-texto">' + esc(a.texto) + '</p>' : '') +
      (a.para && a.para.codigo ? '<span class="pastilla pastilla-oro" style="justify-self:start">' +
        '<i class="fa-solid fa-user" aria-hidden="true"></i>Mensaje para ti</span>' : '') +
      '</article>';
  }

  /* ======================================================================== */
  /* 2. Los Guardianes                                                        */
  /* ======================================================================== */
  var vistaGuardianes = {
    titulo: 'Los Guardianes',
    subtitulo: function (ctx) {
      return ctx.perfil.dragones.desbloqueados + ' de ' + ctx.perfil.dragones.total + ' dragones despiertos';
    },
    html: function (ctx) {
      var p = ctx.perfil, Pz = piezas();
      var d = p.dragonActual || { nombre: 'Sin dragón', color: '#d4af37', poder: '', descripcion: '', slug: 'terrox' };

      var pasos = '';
      for (var i = 0; i < p.dragones.total; i++) {
        pasos += '<span class="evolucion-paso' + (i < p.dragones.desbloqueados ? ' lleno' : '') + '"></span>';
      }

      var vivo = Pz.tarjeta({
        clase: 'animar-entrada',
        titulo: 'Tu guardián', icono: 'fa-dragon',
        sub: 'Su ánimo cambia con tus últimas misiones',
        cuerpo:
          '<div class="guardian-vivo" style="--acento:' + d.color + '">' +
          '<div class="guardian-retrato" id="retrato-guardian">' +
          '<div class="heroe-aura"></div>' +
          '<img src="' + Pz.rutaDragon(p.avatar) + '" alt="' + esc(d.nombre) + '" data-accion="mimar-guardian">' +
          '</div>' +
          '<div style="display:grid;gap:12px;min-width:0">' +
          '<div><h3 style="font-size:26px">' + esc(d.nombre) + '</h3>' +
          '<p class="carta-dragon-poder">' + esc(d.poder) + ' · ' + esc(d.elemento || '') + '</p></div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
          '<span class="estado-animo" style="--acento:' + p.animo.acento + '">' +
          '<i class="fa-solid ' + p.animo.icono + '" aria-hidden="true"></i>' + esc(p.animo.etiqueta) + '</span>' +
          Pz.pastilla('Promedio reciente ' + (p.promedioReciente === null ? '—' : PD.fmt.nota(p.promedioReciente)), 'fa-chart-simple') +
          Pz.pastilla('Racha ' + p.racha.actual, 'fa-fire') +
          '</div>' +
          '<p class="heroe-frase" id="frase-guardian-2">“' + esc(p.animo.frase) + '”</p>' +
          '<div><p class="tarjeta-sub" style="margin-bottom:6px">Evolución de tu vínculo</p>' +
          '<div class="evolucion-pasos">' + pasos + '</div></div>' +
          '<div class="tarjeta-acciones">' +
          '<button type="button" class="boton boton-mini" data-accion="mimar-guardian">' +
          '<i class="fa-solid fa-hand-sparkles" aria-hidden="true"></i><span>Acariciar</span></button>' +
          '<a class="boton boton-mini boton-fantasma" href="#/escarapela">' +
          '<i class="fa-solid fa-address-card" aria-hidden="true"></i><span>Ver mi escarapela</span></a>' +
          '</div></div></div>'
      });

      var siguiente = p.dragones.siguiente;
      var proximo = siguiente ? Pz.tarjeta({
        titulo: 'Próximo desbloqueo', icono: 'fa-lock-open',
        sub: siguiente.nombre + ' · ' + siguiente.poder,
        cuerpo:
          '<div class="rejilla rejilla-2">' +
          '<div style="display:grid;gap:12px">' +
          Pz.barra({
            etiqueta: 'Gemas acumuladas', porcentaje: siguiente.progreso, acento: siguiente.color,
            texto: PD.fmt.entero(p.progreso.recursos.gemas) + ' / ' + PD.fmt.entero(siguiente.requisitos.gemas)
          }) +
          requisitosHtml(siguiente, p.progreso.recursos) +
          '</div>' +
          '<div style="display:grid;place-items:center">' +
          '<img src="' + Pz.rutaDragon(siguiente.slug, true) + '" alt="" ' +
          'style="width:150px;filter:grayscale(1) brightness(.6)">' +
          '<p class="tarjeta-sub">' + esc(siguiente.descripcion) + '</p></div>' +
          '</div>'
      }) : Pz.tarjeta({
        titulo: 'Bestiario completo', icono: 'fa-crown',
        cuerpo: '<p>Has despertado a los doce dragones. ELEMENTUM reconoce tu nombre entre los guardianes de Elemoria.</p>'
      });

      var cartas = p.dragones.lista.map(function (dr, i) {
        return Pz.cartaDragon(dr, { actual: i === p.dragones.desbloqueados - 1 });
      }).join('');

      var bestiario = Pz.tarjeta({
        titulo: 'Bestiario de Elemoria', icono: 'fa-book-open',
        sub: 'Toca cualquier dragón para ver su ficha',
        cuerpo: '<div class="rejilla-dragones">' + cartas + '</div>'
      });

      return vivo + proximo + bestiario;
    },
    luego: function (ctx) {
      // Ficha del dragón
      PD.$$('.carta-dragon').forEach(function (carta) {
        function abrir() { fichaDragon(carta.getAttribute('data-dragon'), ctx); }
        carta.addEventListener('click', abrir);
        carta.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
        });
      });

      PD.$$('[data-accion="mimar-guardian"]').forEach(function (el) {
        el.addEventListener('click', function () {
          var frases = PD.motor.frasesMimo(ctx.perfil.animo.clave);
          var frase = frases[Math.floor(Math.random() * frases.length)];
          var caja = PD.$('#frase-guardian-2');
          if (caja) caja.textContent = '“' + frase + '”';
          var retrato = PD.$('#retrato-guardian');
          if (retrato) {
            retrato.classList.remove('mimado');
            global.requestAnimationFrame(function () { retrato.classList.add('mimado'); });
          }
        });
      });
    }
  };

  function requisitosHtml(d, recursos) {
    var filas = PD.motor.CLAVES.map(function (k) {
      var req = d.requisitos[k];
      if (!req) return '';
      var tengo = recursos[k];
      var cumplido = tengo >= req;
      return '<div class="comparar-pista">' +
        '<span>' + esc(piezas().RECURSOS[k].nombre) + '</span>' +
        '<div class="barra barra-fina" style="--acento:' + (cumplido ? 'var(--superior)' : acentoRecurso(k)) + '">' +
        '<div class="barra-relleno" data-valor="' + Math.min(100, 100 * tengo / req).toFixed(1) + '"></div></div>' +
        (cumplido
          ? '<strong class="nivel-superior"><i class="fa-solid fa-check" aria-hidden="true"></i> listo</strong>'
          : '<strong>' + PD.fmt.entero(req - tengo) + ' más</strong>') +
        '</div>';
    }).join('');
    return '<div class="comparar-pistas">' + (filas || '<p class="tarjeta-sub">Sin requisitos extra.</p>') + '</div>';
  }

  function fichaDragon(slug, ctx) {
    var p = ctx.perfil, Pz = piezas();
    var d = null;
    p.dragones.lista.forEach(function (x) { if (x.slug === slug) d = x; });
    if (!d) return;
    var abierto = d.desbloqueado;

    var cuerpo =
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start">' +
      '<img src="' + Pz.rutaDragon(d.slug) + '" alt="" style="width:190px;border-radius:16px' +
      (abierto ? '' : ';filter:grayscale(1) brightness(.55)') + '">' +
      '<div style="display:grid;gap:12px;min-width:0">' +
      '<div><p class="carta-dragon-poder" style="--acento:' + d.color + '">' + esc(d.poder) + '</p>' +
      '<p>' + esc(d.descripcion) + '</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      Pz.pastilla(d.elemento, Pz.iconoElemento(d.elemento)) +
      Pz.pastilla('Periodo ' + d.periodo_id, 'fa-calendar') +
      Pz.pastilla(PD.fmt.entero(d.costo_gemas) + ' gemas de costo', 'fa-gem') +
      (abierto ? Pz.pastilla('Desbloqueado', 'fa-unlock', 'pastilla-oro')
        : Pz.pastilla('Bloqueado', 'fa-lock')) +
      '</div>' +
      (abierto ? '' : requisitosHtml(d, p.progreso.recursos)) +
      '</div></div>';

    var pie = abierto && p.dragones.desbloqueados > 0
      ? '<button type="button" class="boton boton-oro boton-mini" data-elegir="' + esc(d.slug) + '">' +
        '<i class="fa-solid fa-id-badge" aria-hidden="true"></i><span>Usar en mi escarapela</span></button>'
      : '';

    PD.modal.abrir({
      titulo: '<span style="color:' + d.color + '">' + esc(d.nombre) + '</span>',
      cuerpo: cuerpo,
      pie: pie,
      despues: function (caja) {
        PD.animarBarras(caja);
        var btn = caja.querySelector('[data-elegir]');
        if (btn) {
          btn.addEventListener('click', function () {
            PD.app.elegirAvatar(btn.getAttribute('data-elegir'));
            PD.modal.cerrar();
          });
        }
      }
    });
  }

  /* ======================================================================== */
  /* 3. Estadísticas                                                          */
  /* ======================================================================== */
  var vistaEstadisticas = {
    titulo: 'Estadísticas y reportes',
    subtitulo: function (ctx) {
      return 'Promedio ' + (ctx.perfil.progreso.promedio === null ? '—' : PD.fmt.nota(ctx.perfil.progreso.promedio)) +
        ' · ' + PD.fmt.porcentaje(ctx.perfil.progreso.avance) + ' del año recorrido';
    },
    html: function (ctx) {
      var p = ctx.perfil, Pz = piezas();
      var completas = p.misiones.filter(function (m) { return m.completa; }).length;

      var mejorPeriodo = null;
      [1, 2, 3, 4].forEach(function (i) {
        var pr = p.progreso.periodos[i].promedio;
        if (pr !== null && (mejorPeriodo === null || pr > p.progreso.periodos[mejorPeriodo].promedio)) mejorPeriodo = i;
      });

      var kpis = '<div class="rejilla-kpi">' +
        Pz.kpi({ icono: 'fa-star', etiqueta: 'Promedio general', valor: p.progreso.promedio, decimales: 2, acento: 'var(--oro)', pie: p.progreso.nivel.etiqueta }) +
        Pz.kpi({ icono: 'fa-circle-check', etiqueta: 'Misiones completas', valor: completas, acento: 'var(--lazos)', pie: 'con las 4 actividades' }) +
        Pz.kpi({ icono: 'fa-gauge-high', etiqueta: 'Avance del año', valor: p.progreso.avance, decimales: 1, sufijo: ' %', acento: 'var(--cian)', pie: p.progreso.misiones_registradas + ' de ' + p.progreso.misiones_totales + ' misiones' }) +
        Pz.kpi({ icono: 'fa-bolt', etiqueta: 'Experiencia total', valor: p.xp, acento: 'var(--violeta)', pie: 'nivel ' + p.nivel.nivel + ' de guardián' }) +
        (mejorPeriodo ? Pz.kpi({
          icono: 'fa-crown', etiqueta: 'Mejor periodo',
          valor: p.progreso.periodos[mejorPeriodo].promedio, decimales: 2,
          acento: colorPeriodo(mejorPeriodo), pie: nombrePeriodo(mejorPeriodo)
        }) : '') +
        '</div>';

      var graficas =
        '<div class="rejilla rejilla-2">' +
        Pz.tarjeta({
          titulo: 'Promedio por periodo', icono: 'fa-chart-line',
          sub: 'tu evolución frente al curso',
          cuerpo: '<div class="lienzo-envoltorio" id="g-periodos"></div>'
        }) +
        Pz.tarjeta({
          titulo: 'Perfil de actividades', icono: 'fa-chart-pie',
          sub: 'promedio en cada tipo de actividad',
          cuerpo: '<div class="lienzo-envoltorio" id="g-radar"></div>'
        }) +
        '</div>' +
        '<div class="rejilla rejilla-2">' +
        Pz.tarjeta({
          titulo: 'Recursos acumulados', icono: 'fa-sack-dollar',
          sub: 'nota × 10 en cada actividad',
          cuerpo: '<div class="lienzo-envoltorio" id="g-recursos"></div>'
        }) +
        Pz.tarjeta({
          titulo: 'Cumplimiento de misiones', icono: 'fa-list-check',
          sub: 'registradas, incompletas y pendientes',
          cuerpo: '<div class="lienzo-envoltorio" id="g-misiones"></div>'
        }) +
        '</div>';

      var mapa = Pz.tarjeta({
        titulo: 'Mapa de misiones', icono: 'fa-map',
        sub: 'toca una misión para ver su detalle',
        cuerpo:
          '<div class="mapa-misiones">' + p.misiones.map(Pz.celdaMision).join('') + '</div>' +
          '<div class="leyenda" style="margin-top:14px">' +
          '<span><i class="punto" style="--acento:var(--lazos);background:var(--lazos)"></i> Completa (4 notas)</span>' +
          '<span><i class="punto" style="background:var(--runas)"></i> Parcial</span>' +
          '<span><i class="punto" style="background:var(--panel-3)"></i> Pendiente</span>' +
          '</div>' +
          '<div style="margin-top:18px">' +
          '<p class="tarjeta-sub" style="margin-bottom:6px">Constancia misión a misión</p>' +
          '<div class="racha-tira">' + p.misiones.map(function (m) {
            var alto = m.promedio === null ? 8 : Math.max(10, m.promedio * 5.4);
            return '<span class="racha-barra' + (m.registrada ? ' viva' : '') + '" ' +
              'style="height:' + alto + 'px" title="' + esc(m.numero + '. ' + m.titulo) + '"></span>';
          }).join('') + '</div></div>'
      });

      var tabla = Pz.tarjeta({
        titulo: 'Detalle de misiones', icono: 'fa-table-list',
        acciones: selectorPeriodo(ctx.periodo, 'filtrar-periodo-tabla') +
          '<button type="button" class="boton boton-mini" data-accion="descargar-csv">' +
          '<i class="fa-solid fa-file-csv" aria-hidden="true"></i><span>Descargar CSV</span></button>',
        cuerpo: '<div id="caja-tabla-misiones">' + Pz.tablaMisiones(p, { periodo: ctx.periodo }) + '</div>'
      });

      return kpis + graficas + mapa + tabla;
    },
    luego: function (ctx) {
      var p = ctx.perfil;
      var refs = referencias(ctx);
      var pal = PD.graficas.paleta();

      PD.graficas.lineas(PD.$('#g-periodos'), {
        etiquetas: [1, 2, 3, 4].map(function (i) { return 'P' + i; }),
        max: 10,
        series: [
          { nombre: 'Yo', color: pal.oro, datos: [1, 2, 3, 4].map(function (i) { return p.progreso.periodos[i].promedio; }) },
          { nombre: 'Mi curso', color: pal.cian, datos: [1, 2, 3, 4].map(function (i) { return refs.curso.periodos[i]; }) }
        ]
      });

      PD.graficas.radar(PD.$('#g-radar'), {
        etiquetas: PD.motor.CLAVES.map(function (k) { return piezas().RECURSOS[k].nombre; }),
        max: 10,
        series: [
          { nombre: 'Yo', color: pal.oro, datos: PD.motor.CLAVES.map(function (k) { return p.progreso.componentes[k].promedio || 0; }) },
          { nombre: 'Mi curso', color: pal.cian, datos: PD.motor.CLAVES.map(function (k) { return refs.curso.componentes[k] || 0; }) }
        ]
      });

      PD.graficas.barras(PD.$('#g-recursos'), {
        etiquetas: PD.motor.CLAVES.map(function (k) { return piezas().RECURSOS[k].nombre; }),
        leyenda: false,
        decimales: 0,
        series: [{
          nombre: 'Recursos', datos: PD.motor.CLAVES.map(function (k) { return p.progreso.recursos[k]; }),
          color: pal.oro,
          colores: [pal.gemas, pal.cristales, pal.runas, pal.lazos]
        }]
      });

      var completas = p.misiones.filter(function (m) { return m.completa; }).length;
      var parciales = p.misiones.filter(function (m) { return m.registrada && !m.completa; }).length;
      var pendientes = p.misiones.length - completas - parciales;
      PD.graficas.dona(PD.$('#g-misiones'), {
        etiquetas: ['Completas', 'Parciales', 'Pendientes'],
        datos: [completas, parciales, pendientes],
        colores: [pal.lazos, pal.runas, pal.rejilla],
        centro: String(p.progreso.misiones_registradas),
        centroSub: 'de ' + p.progreso.misiones_totales
      });

      PD.$$('.celda-mision').forEach(function (celda) {
        celda.addEventListener('click', function () {
          detalleMision(ctx, parseInt(celda.getAttribute('data-mision'), 10));
        });
      });

      var selector = PD.$('[data-accion="filtrar-periodo-tabla"]');
      if (selector) {
        selector.addEventListener('change', function () {
          var periodo = parseInt(selector.value, 10) || 0;
          PD.$('#caja-tabla-misiones').innerHTML = piezas().tablaMisiones(p, { periodo: periodo });
        });
      }

      var csv = PD.$('[data-accion="descargar-csv"]');
      if (csv) csv.addEventListener('click', function () { PD.docs.csvMisiones(p); });
    }
  };

  function detalleMision(ctx, numero) {
    var m = null;
    ctx.perfil.misiones.forEach(function (x) { if (x.numero === numero) m = x; });
    if (!m) return;
    var Pz = piezas();
    var notas = PD.motor.CLAVES.map(function (k) {
      var v = m.notas[k];
      return '<div class="recurso" style="--acento:' + acentoRecurso(k) + '">' +
        '<div class="recurso-icono"><i class="fa-solid ' + Pz.RECURSOS[k].icono + '" aria-hidden="true"></i></div>' +
        '<div class="recurso-datos"><div class="recurso-valor">' + (v === null ? '—' : PD.fmt.nota(v)) + '</div>' +
        '<div class="recurso-nombre">' + esc(Pz.RECURSOS[k].nombre) + '</div>' +
        '<div class="recurso-nota">' + (v === null ? 'no desarrollada' : '+' + Math.round(v * 10) + ' recursos') + '</div>' +
        '</div></div>';
    }).join('');

    PD.modal.abrir({
      titulo: 'Misión ' + m.numero + ' · ' + esc(m.titulo),
      cuerpo:
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
        Pz.pastilla(nombrePeriodo(m.periodo_id), 'fa-calendar') +
        (m.tema ? Pz.pastilla(m.tema, 'fa-book') : '') +
        (m.fecha ? Pz.pastilla(PD.fmt.fechaCorta(m.fecha), 'fa-clock') : '') +
        Pz.marcaNivel(PD.motor.nivelDe(m.promedio)) +
        '</div>' +
        '<div class="tira-recursos">' + notas + '</div>' +
        '<div style="margin-top:16px">' + Pz.barra({
          etiqueta: 'Promedio de la misión', porcentaje: (m.promedio || 0) * 10,
          acento: m.color, texto: m.promedio === null ? 'sin registro' : PD.fmt.nota(m.promedio)
        }) + '</div>' +
        (m.observaciones
          ? '<div class="observacion" style="--acento:' + m.color + ';margin-top:16px">' +
            '<div class="observacion-cabeza"><span>Observación del maestro</span></div>' +
            '<p class="observacion-texto">' + esc(m.observaciones) + '</p></div>'
          : ''),
      despues: function (caja) { PD.animarBarras(caja); }
    });
  }

  /* ======================================================================== */
  /* 4. Comparativa de curso                                                  */
  /* ======================================================================== */
  var vistaComparativa = {
    titulo: 'Comparativa de curso',
    subtitulo: function (ctx) { return 'Tu progreso frente a ' + ctx.perfil.curso; },
    html: function (ctx) {
      var p = ctx.perfil, Pz = piezas();
      var refs = referencias(ctx);
      var ambito = ctx.comparar === 'grado' ? refs.grado : refs.curso;
      var nombreAmbito = ctx.comparar === 'grado' ? ('Grado ' + (ctx.est.grado_nombre || '')) : p.curso;

      var mio = p.progreso.promedio;
      var suyo = ambito.promedio;
      var dif = (mio !== null && suyo !== null) ? PD.motor.redondear(mio - suyo) : null;
      var pct = PD.motor.percentil(mio, ambito.perfiles.map(function (x) { return x.progreso.promedio; }));

      var marcadores = '<div class="rejilla rejilla-3">' +
        marcador(mio === null ? '—' : PD.fmt.nota(mio), 'Mi promedio') +
        marcador(suyo === null ? '—' : PD.fmt.nota(suyo), 'Promedio del grupo') +
        marcador((dif === null ? '—' : (dif >= 0 ? '+' : '') + PD.fmt.nota(dif)),
          'Diferencia', dif === null ? '' : (dif >= 0 ? 'nivel-superior' : 'nivel-bajo')) +
        marcador(pct === null ? '—' : PD.fmt.numero(pct, 0) + '%', 'Percentil') +
        marcador(ctx.puestoCurso + '°', 'Mi puesto') +
        marcador(ambito.estudiantes, 'Guardianes comparados') +
        '</div>';

      var termometro = Pz.tarjeta({
        titulo: 'Dónde estoy', icono: 'fa-temperature-half',
        sub: 'escala de 0 a 10 con tu marca y la del grupo',
        cuerpo:
          '<div class="termometro">' +
          '<div class="termometro-pista"></div>' +
          '<div class="termometro-marca curso" style="left:' + ((suyo || 0) * 10) + '%" title="Grupo"></div>' +
          '<div class="termometro-marca yo" style="left:' + ((mio || 0) * 10) + '%" title="Yo"></div>' +
          '</div>' +
          '<div class="termometro-etiquetas"><span>0</span><span>5</span><span>7</span><span>8</span><span>9</span><span>10</span></div>' +
          '<div class="leyenda" style="margin-top:12px">' +
          '<span><i class="punto" style="background:var(--oro)"></i> Yo (' + (mio === null ? '—' : PD.fmt.nota(mio)) + ')</span>' +
          '<span><i class="punto" style="background:var(--cian)"></i> ' + esc(nombreAmbito) + ' (' + (suyo === null ? '—' : PD.fmt.nota(suyo)) + ')</span>' +
          '</div>'
      });

      var graficas = '<div class="rejilla rejilla-2">' +
        Pz.tarjeta({
          titulo: 'Periodo a periodo', icono: 'fa-chart-column',
          sub: 'yo frente al promedio del grupo',
          cuerpo: '<div class="lienzo-envoltorio" id="c-periodos"></div>'
        }) +
        Pz.tarjeta({
          titulo: 'Actividad por actividad', icono: 'fa-chart-simple',
          sub: 'dónde estás por encima y dónde conviene reforzar',
          cuerpo: '<div class="lienzo-envoltorio" id="c-componentes"></div>'
        }) +
        '</div>';

      var recursos = Pz.tarjeta({
        titulo: 'Recursos: yo y el promedio del grupo', icono: 'fa-scale-balanced',
        cuerpo: '<div class="comparador">' + PD.motor.CLAVES.map(function (k) {
          var mioR = p.progreso.recursos[k];
          var suyoR = ambito.recursosMedios[k];
          var tope = Math.max(mioR, suyoR, 1);
          return '<div class="comparar-fila">' +
            '<div class="comparar-nombre"><strong>' + esc(Pz.RECURSOS[k].nombre) + '</strong>' +
            '<span class="tarjeta-sub">' + esc(Pz.RECURSOS[k].evalua) + '</span></div>' +
            '<div class="comparar-pistas">' +
            '<div class="comparar-pista"><span>Yo</span>' +
            '<div class="barra barra-fina" style="--acento:' + acentoRecurso(k) + '">' +
            '<div class="barra-relleno" data-valor="' + (100 * mioR / tope).toFixed(1) + '"></div></div>' +
            '<strong>' + PD.fmt.entero(mioR) + '</strong></div>' +
            '<div class="comparar-pista"><span>Grupo</span>' +
            '<div class="barra barra-fina" style="--acento:var(--tenue)">' +
            '<div class="barra-relleno" data-valor="' + (100 * suyoR / tope).toFixed(1) + '"></div></div>' +
            '<strong>' + PD.fmt.entero(suyoR) + '</strong></div>' +
            '</div></div>';
        }).join('') + '</div>'
      });

      var distribucion = Pz.tarjeta({
        titulo: 'Cómo va el grupo', icono: 'fa-users',
        sub: 'distribución por nivel de desempeño · tu nivel: ' + p.progreso.nivel.etiqueta,
        cuerpo: '<div class="rejilla rejilla-2">' +
          '<div class="lienzo-envoltorio" id="c-niveles"></div>' +
          '<div style="display:grid;gap:10px;align-content:center">' +
          ['superior', 'alto', 'basico', 'bajo'].map(function (n) {
            var cuantos = ambito.niveles[n] || 0;
            var total = ambito.estudiantes || 1;
            return Pz.barra({
              etiqueta: n.toUpperCase() + (p.progreso.nivel.clave === n ? ' · aquí estás' : ''),
              porcentaje: 100 * cuantos / total,
              acento: 'var(--' + n + ')',
              texto: cuantos + ' de ' + total
            });
          }).join('') +
          '</div></div>'
      });

      var selector = '<label class="filtro"><span>Comparar con</span>' +
        '<select class="control" data-accion="cambiar-ambito">' +
        '<option value="curso"' + (ctx.comparar !== 'grado' ? ' selected' : '') + '>Mi curso (' + esc(p.curso) + ')</option>' +
        '<option value="grado"' + (ctx.comparar === 'grado' ? ' selected' : '') + '>Todo el grado ' + esc(ctx.est.grado_nombre || '') + '</option>' +
        '</select></label>';

      return '<section class="tarjeta"><div class="filtros">' + selector + '</div></section>' +
        marcadores + termometro + graficas + recursos + distribucion;
    },
    luego: function (ctx) {
      var p = ctx.perfil;
      var refs = referencias(ctx);
      var ambito = ctx.comparar === 'grado' ? refs.grado : refs.curso;
      var pal = PD.graficas.paleta();

      PD.graficas.barras(PD.$('#c-periodos'), {
        etiquetas: [1, 2, 3, 4].map(function (i) { return 'Periodo ' + i; }),
        max: 10,
        series: [
          { nombre: 'Yo', color: pal.oro, datos: [1, 2, 3, 4].map(function (i) { return p.progreso.periodos[i].promedio || 0; }) },
          { nombre: 'Grupo', color: pal.cian, datos: [1, 2, 3, 4].map(function (i) { return ambito.periodos[i] || 0; }) }
        ]
      });

      PD.graficas.barras(PD.$('#c-componentes'), {
        etiquetas: PD.motor.CLAVES.map(function (k) { return piezas().RECURSOS[k].nombre; }),
        max: 10,
        series: [
          { nombre: 'Yo', color: pal.oro, datos: PD.motor.CLAVES.map(function (k) { return p.progreso.componentes[k].promedio || 0; }) },
          { nombre: 'Grupo', color: pal.cian, datos: PD.motor.CLAVES.map(function (k) { return ambito.componentes[k] || 0; }) }
        ]
      });

      PD.graficas.dona(PD.$('#c-niveles'), {
        etiquetas: ['Superior', 'Alto', 'Básico', 'Bajo'],
        datos: ['superior', 'alto', 'basico', 'bajo'].map(function (n) { return ambito.niveles[n] || 0; }),
        colores: [PD.graficas.color('--superior'), PD.graficas.color('--alto'),
          PD.graficas.color('--basico'), PD.graficas.color('--bajo')],
        centro: String(ambito.estudiantes),
        centroSub: 'guardianes'
      });

      var sel = PD.$('[data-accion="cambiar-ambito"]');
      if (sel) sel.addEventListener('change', function () {
        PD.app.estado.comparar = sel.value;
        PD.app.pintar();
      });
    }
  };

  function marcador(valor, etiqueta, clase) {
    return '<div class="marcador"><div class="marcador-valor ' + (clase || '') + '">' + esc(valor) + '</div>' +
      '<div class="marcador-etq">' + esc(etiqueta) + '</div></div>';
  }

  /* ======================================================================== */
  /* 5. Ranking                                                               */
  /* ======================================================================== */
  var vistaRanking = {
    titulo: 'Ranking del curso',
    subtitulo: function (ctx) {
      return 'Clasificación por ' + (PD.motor.METRICAS[ctx.metrica] || PD.motor.METRICAS.promedio).etiqueta.toLowerCase();
    },
    html: function (ctx) {
      var Pz = piezas();
      var lista = ctx.ambito === 'grado' ? PD.datos.delGrado(ctx.est)
        : (ctx.ambito === 'todos' ? PD.datos.estudiantes() : PD.datos.companeros(ctx.est));
      var tabla = PD.motor.ranking(lista, { metrica: ctx.metrica, periodo: ctx.periodo });
      var alias = !!ctx.alias;

      var mio = null;
      tabla.filas.forEach(function (f) { if (f.perfil.id === ctx.est.id) mio = f; });

      var filtros =
        '<div class="filtros">' +
        '<label class="filtro"><span>Grupo</span><select class="control" data-accion="ranking-ambito">' +
        '<option value="curso"' + (ctx.ambito === 'curso' ? ' selected' : '') + '>Mi curso</option>' +
        '<option value="grado"' + (ctx.ambito === 'grado' ? ' selected' : '') + '>Mi grado</option>' +
        '<option value="todos"' + (ctx.ambito === 'todos' ? ' selected' : '') + '>Toda la institución</option>' +
        '</select></label>' +
        '<label class="filtro"><span>Clasificar por</span><select class="control" data-accion="ranking-metrica">' +
        Object.keys(PD.motor.METRICAS).map(function (k) {
          return '<option value="' + k + '"' + (ctx.metrica === k ? ' selected' : '') + '>' +
            esc(PD.motor.METRICAS[k].etiqueta) + '</option>';
        }).join('') +
        '</select></label>' +
        selectorPeriodo(ctx.periodo, 'ranking-periodo') +
        '<label class="filtro"><span>Buscar</span>' +
        '<input class="control" type="search" placeholder="Nombre…" data-accion="ranking-buscar" value="' + esc(ctx.busqueda || '') + '"></label>' +
        '<button type="button" class="boton boton-mini' + (alias ? ' boton-oro' : '') + '" data-accion="ranking-alias" ' +
        'title="Muestra solo el nombre y la inicial del apellido">' +
        '<i class="fa-solid fa-user-secret" aria-hidden="true"></i><span>' + (alias ? 'Modo discreto' : 'Nombres completos') + '</span></button>' +
        '</div>';

      var podio = '';
      if (tabla.filas.length >= 3) {
        podio = '<div class="podio">' + [1, 0, 2].map(function (i) {
          var f = tabla.filas[i];
          if (!f) return '';
          var yo = f.perfil.id === ctx.est.id;
          return '<article class="podio-puesto podio-' + (i + 1) + (yo ? ' yo' : '') + '">' +
            '<div class="podio-medalla">' + ['🥇', '🥈', '🥉'][i] + '</div>' +
            '<img class="podio-avatar" src="' + Pz.rutaDragon(f.perfil.avatar, true) + '" alt="">' +
            '<div class="podio-nombre">' + esc(alias ? Pz.alias(f.perfil) : f.perfil.nombre) + '</div>' +
            '<div class="podio-dato">' + esc(valorFormateado(f.valor, tabla.decimales)) + '</div>' +
            '<div class="podio-sub">' + esc(f.perfil.titulo) + '</div>' +
            '</article>';
        }).join('') + '</div>';
      }

      var busqueda = PD.normal(ctx.busqueda || '');
      var filas = tabla.filas.filter(function (f) {
        if (!busqueda) return true;
        return PD.normal(f.perfil.nombre).indexOf(busqueda) >= 0 ||
          PD.normal(f.perfil.curso).indexOf(busqueda) >= 0;
      });

      var cuerpo = filas.map(function (f) {
        var yo = f.perfil.id === ctx.est.id;
        return '<tr class="' + (yo ? 'fila-yo' : '') + '">' +
          '<td>' + Pz.medallon(f.puesto) + '</td>' +
          '<td>' + Pz.miniPersona(f.perfil, { alias: alias && !yo, sub: f.perfil.curso }) + '</td>' +
          '<td>' + esc(f.perfil.titulo) + '</td>' +
          '<td class="num">' + esc(valorFormateado(f.valor, tabla.decimales)) + '</td>' +
          '<td class="num">' + f.perfil.dragones.desbloqueados + '</td>' +
          '<td class="num">' + f.perfil.progreso.misiones_registradas + '</td>' +
          '<td>' + Pz.marcaNivel(f.perfil.progreso.nivel) + '</td>' +
          '</tr>';
      }).join('');

      var miResumen = mio ? '<div class="rejilla rejilla-3">' +
        marcador(mio.puesto + '°', 'Mi puesto') +
        marcador(valorFormateado(mio.valor, tabla.decimales), 'Mi ' + tabla.etiqueta.toLowerCase()) +
        marcador(tabla.filas.length, 'Guardianes en la lista') +
        '</div>' : '';

      return piezas().tarjeta({ cuerpo: filtros }) + miResumen +
        (podio ? piezas().tarjeta({ titulo: 'Podio', icono: 'fa-trophy', cuerpo: podio }) : '') +
        piezas().tarjeta({
          clase: 'zona-impresion',
          titulo: 'Clasificación completa', icono: 'fa-ranking-star',
          sub: filas.length + ' guardianes',
          acciones:
            '<button type="button" class="boton boton-mini" data-accion="ranking-png">' +
            '<i class="fa-solid fa-image" aria-hidden="true"></i><span>Imagen</span></button>' +
            '<button type="button" class="boton boton-mini boton-fantasma" data-accion="ranking-imprimir">' +
            '<i class="fa-solid fa-print" aria-hidden="true"></i><span>Imprimir</span></button>',
          cuerpo: filas.length
            ? '<div class="tabla-envoltorio"><table class="tabla">' +
              '<thead><tr><th>#</th><th>Guardián</th><th>Título</th><th class="num">' + esc(tabla.etiqueta) + '</th>' +
              '<th class="num">Dragones</th><th class="num">Misiones</th><th>Nivel</th></tr></thead>' +
              '<tbody>' + cuerpo + '</tbody></table></div>'
            : piezas().vacio('Ningún guardián coincide con la búsqueda.', 'fa-magnifying-glass')
        });
    },
    luego: function (ctx) {
      var app = PD.app;
      enlazar('[data-accion="ranking-ambito"]', 'change', function (el) { app.estado.ambito = el.value; app.pintar(); });
      enlazar('[data-accion="ranking-metrica"]', 'change', function (el) { app.estado.metrica = el.value; app.pintar(); });
      enlazar('[data-accion="ranking-periodo"]', 'change', function (el) {
        app.estado.periodo = parseInt(el.value, 10) || 0;
        PD.motor.limpiarCache();
        app.pintar();
      });
      var alias = PD.$('[data-accion="ranking-alias"]');
      if (alias) alias.addEventListener('click', function () {
        app.estado.alias = !app.estado.alias;
        PD.almacen.set('alias', app.estado.alias);
        app.pintar();
      });
      var buscar = PD.$('[data-accion="ranking-buscar"]');
      if (buscar) {
        buscar.addEventListener('input', PD.debounce(function () {
          app.estado.busqueda = buscar.value;
          app.pintar({ mantenerFoco: '[data-accion="ranking-buscar"]' });
        }, 260));
      }
      enlazar('[data-accion="ranking-png"]', 'click', function () {
        PD.docs.aPng(PD.$('.zona-impresion'), 'Ranking-' + ctx.perfil.curso.replace(/\s+/g, '') + '.png', 1.6);
      });
      enlazar('[data-accion="ranking-imprimir"]', 'click', function () {
        PD.docs.imprimir('.zona-impresion');
      });

      // La fila propia queda a la vista sin que el estudiante la busque.
      var fila = PD.$('.fila-yo');
      if (fila && fila.scrollIntoView) {
        global.setTimeout(function () {
          fila.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 400);
      }
    }
  };

  function valorFormateado(valor, decimales) {
    if (valor === null || valor === undefined) return '—';
    return decimales ? PD.fmt.numero(valor, decimales) : PD.fmt.entero(valor);
  }

  function enlazar(selector, evento, fn) {
    var el = PD.$(selector);
    if (el) el.addEventListener(evento, function () { fn(el); });
  }

  /* ======================================================================== */
  /* 6. Boletines                                                             */
  /* ======================================================================== */
  var vistaBoletines = {
    titulo: 'Boletines y avisos',
    subtitulo: function (ctx) {
      return ctx.periodo ? nombrePeriodo(ctx.periodo) : 'Todo el año escolar';
    },
    html: function (ctx) {
      var p = ctx.perfil, Pz = piezas();
      var avisos = PD.datos.avisosDe(ctx.est);

      var tablon = Pz.tarjeta({
        titulo: 'Tablón de avisos', icono: 'fa-bullhorn',
        sub: avisos.length + ' publicaciones',
        cuerpo: avisos.length
          ? '<div class="lista-avisos">' + avisos.map(tarjetaAviso).join('') + '</div>'
          : Pz.vacio('Todavía no hay avisos publicados.', 'fa-bullhorn')
      });

      var retro = retroalimentacion(p);
      var consejos = Pz.tarjeta({
        titulo: 'Retroalimentación personalizada', icono: 'fa-comment-dots',
        sub: 'generada a partir de tus propios registros',
        cuerpo: '<div class="retro">' + retro.map(function (r) {
          return '<article class="retro-item" style="--acento:' + r.acento + '">' +
            '<h3 class="retro-titulo"><i class="fa-solid ' + r.icono + '" aria-hidden="true"></i>' + esc(r.titulo) + '</h3>' +
            '<p class="retro-texto">' + esc(r.texto) + '</p></article>';
        }).join('') + '</div>' +
        (ctx.est.notas ? '<div class="observacion" style="margin-top:16px">' +
          '<div class="observacion-cabeza"><span>Nota del maestro</span></div>' +
          '<p class="observacion-texto">' + esc(ctx.est.notas) + '</p></div>' : '')
      });

      var conObs = p.misiones.filter(function (m) {
        return m.observaciones && (!ctx.periodo || Number(m.periodo_id) === Number(ctx.periodo));
      });
      var observaciones = Pz.tarjeta({
        titulo: 'Observaciones misión a misión', icono: 'fa-pen-to-square',
        sub: conObs.length + ' comentarios del maestro',
        cuerpo: conObs.length
          ? '<div class="observaciones">' + conObs.map(function (m) {
              return '<article class="observacion" style="--acento:' + m.color + '">' +
                '<div class="observacion-cabeza"><span>Misión ' + m.numero + ' · ' + esc(m.titulo) + '</span>' +
                '<span>' + esc(m.promedio === null ? '' : PD.fmt.nota(m.promedio)) + '</span></div>' +
                '<p class="observacion-texto">' + esc(m.observaciones) + '</p></article>';
            }).join('') + '</div>'
          : Pz.vacio('Aún no hay observaciones escritas para este periodo.', 'fa-pen')
      });

      var boletin = Pz.tarjeta({
        clase: 'zona-impresion',
        titulo: 'Mi boletín', icono: 'fa-scroll',
        sub: ctx.periodo ? nombrePeriodo(ctx.periodo) : 'consolidado del año',
        acciones:
          selectorPeriodo(ctx.periodo, 'boletin-periodo') +
          '<button type="button" class="boton boton-mini" data-accion="boletin-imprimir">' +
          '<i class="fa-solid fa-print" aria-hidden="true"></i><span>Imprimir</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="boletin-pdf">' +
          '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>PDF</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="boletin-html">' +
          '<i class="fa-solid fa-code" aria-hidden="true"></i><span>HTML</span></button>' +
          '<button type="button" class="boton boton-mini boton-oro" data-accion="boletin-png">' +
          '<i class="fa-solid fa-image" aria-hidden="true"></i><span>Imagen</span></button>',
        cuerpo: '<div class="boletin-marco"><div id="hoja-boletin">' +
          PD.docs.boletinHtml(p, ctx) + '</div></div>'
      });

      return tablon + consejos + observaciones + boletin;
    },
    luego: function (ctx) {
      enlazar('[data-accion="boletin-periodo"]', 'change', function (el) {
        PD.app.estado.periodo = parseInt(el.value, 10) || 0;
        PD.motor.limpiarCache();
        PD.app.pintar();
      });
      enlazar('[data-accion="boletin-imprimir"]', 'click', function () {
        PD.docs.imprimir('.zona-impresion');
      });
      enlazar('[data-accion="boletin-png"]', 'click', function () {
        PD.docs.aPng(PD.$('#hoja-boletin .boletin-hoja'), nombreBoletin(ctx) + '.png', 1.6);
      });
      enlazar('[data-accion="boletin-pdf"]', 'click', function () {
        PD.docs.pdfDeNodos(PD.$('#hoja-boletin .boletin-hoja'), nombreBoletin(ctx) + '.pdf', { escala: 1.8 });
      });
      enlazar('[data-accion="boletin-html"]', 'click', function () {
        PD.docs.htmlAutonomo(PD.$('#hoja-boletin .boletin-hoja'), nombreBoletin(ctx) + '.html',
          'Boletín · ' + ctx.perfil.nombre, { interactivo: true });
      });
    }
  };

  function nombreBoletin(ctx) {
    return 'Boletin-' + (ctx.perfil.codigo || 'guardian') +
      (ctx.periodo ? '-P' + ctx.periodo : '-anual');
  }

  /** Fortalezas y oportunidades deducidas de los propios registros. */
  function retroalimentacion(p) {
    var Pz = piezas();
    var salida = [];
    var comp = p.progreso.componentes;
    var mejor = null, peor = null;
    PD.motor.CLAVES.forEach(function (k) {
      var v = comp[k].promedio;
      if (v === null) return;
      if (mejor === null || v > comp[mejor].promedio) mejor = k;
      if (peor === null || v < comp[peor].promedio) peor = k;
    });

    if (mejor) {
      salida.push({
        titulo: 'Tu mayor fortaleza', icono: 'fa-star', acento: acentoRecurso(mejor),
        texto: 'Destacas en ' + Pz.RECURSOS[mejor].nombre.toLowerCase() + ' (' +
          Pz.RECURSOS[mejor].evalua.toLowerCase() + ') con un promedio de ' +
          PD.fmt.nota(comp[mejor].promedio) + '. Apóyate en esa habilidad para las próximas misiones.'
      });
    }
    if (peor && peor !== mejor) {
      salida.push({
        titulo: 'Dónde puedes crecer', icono: 'fa-arrow-trend-up', acento: 'var(--cian)',
        texto: 'Tu promedio más bajo está en ' + Pz.RECURSOS[peor].nombre.toLowerCase() + ' (' +
          PD.fmt.nota(comp[peor].promedio) + '). Subirlo un punto te daría cerca de ' +
          PD.fmt.entero(comp[peor].registros * 10) + ' recursos adicionales.'
      });
    }

    var pendientes = p.misiones.filter(function (m) { return !m.registrada; }).length;
    if (pendientes) {
      salida.push({
        titulo: 'Misiones pendientes', icono: 'fa-hourglass-half', acento: 'var(--runas)',
        texto: 'Te faltan ' + pendientes + ' misiones por registrar. Cada misión completa puede darte hasta 400 recursos.'
      });
    } else {
      salida.push({
        titulo: 'Constancia perfecta', icono: 'fa-flag-checkered', acento: 'var(--lazos)',
        texto: 'No tienes misiones pendientes. Ese es el sello de un guardián constante.'
      });
    }

    // Tendencia entre los dos últimos periodos con datos.
    var conDatos = [1, 2, 3, 4].filter(function (i) { return p.progreso.periodos[i].promedio !== null; });
    if (conDatos.length >= 2) {
      var ultimo = conDatos[conDatos.length - 1], previo = conDatos[conDatos.length - 2];
      var dif = PD.motor.redondear(p.progreso.periodos[ultimo].promedio - p.progreso.periodos[previo].promedio);
      salida.push({
        titulo: dif >= 0 ? 'Vas subiendo' : 'Atención a la tendencia',
        icono: dif >= 0 ? 'fa-arrow-up' : 'fa-arrow-down',
        acento: dif >= 0 ? 'var(--superior)' : 'var(--bajo)',
        texto: 'Entre el periodo ' + previo + ' y el ' + ultimo + ' tu promedio ' +
          (dif >= 0 ? 'subió ' : 'bajó ') + PD.fmt.nota(Math.abs(dif)) + ' puntos.'
      });
    }

    if (p.dragones.siguiente) {
      salida.push({
        titulo: 'Tu próxima meta', icono: 'fa-dragon', acento: p.dragones.siguiente.color,
        texto: faltaTexto(p.dragones.siguiente) + ' para despertar a ' + p.dragones.siguiente.nombre + '.'
      });
    }
    return salida;
  }

  /* ======================================================================== */
  /* 7. Escarapela digital                                                    */
  /* ======================================================================== */
  var vistaEscarapela = {
    titulo: 'Escarapela digital',
    subtitulo: function (ctx) { return ctx.perfil.titulo + ' · ' + ctx.perfil.codigo; },
    html: function (ctx) {
      var p = ctx.perfil, Pz = piezas();
      var abiertos = p.dragones.lista.filter(function (d) { return d.desbloqueado; });
      var opciones = abiertos.length
        ? abiertos.map(function (d) {
            return '<option value="' + esc(d.slug) + '"' + (d.slug === p.avatar ? ' selected' : '') + '>' +
              esc(d.nombre) + '</option>';
          }).join('')
        : '<option value="terrox">Terrox (aún bloqueado)</option>';

      return Pz.tarjeta({
        clase: 'zona-impresion',
        titulo: 'Credencial del guardián', icono: 'fa-address-card',
        sub: 'toca la tarjeta para girarla',
        acciones:
          '<label class="filtro"><span>Dragón de la escarapela</span>' +
          '<select class="control" data-accion="elegir-avatar">' + opciones + '</select></label>' +
          '<button type="button" class="boton boton-mini" data-accion="girar-escarapela">' +
          '<i class="fa-solid fa-rotate" aria-hidden="true"></i><span>Girar</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="escarapela-imprimir">' +
          '<i class="fa-solid fa-print" aria-hidden="true"></i><span>Imprimir / PDF</span></button>' +
          '<button type="button" class="boton boton-mini boton-oro" data-accion="escarapela-png">' +
          '<i class="fa-solid fa-image" aria-hidden="true"></i><span>Descargar PNG</span></button>',
        cuerpo:
          '<div class="escarapela-zona">' +
          '<div class="escenario"><div class="escarapela" id="escarapela">' +
          PD.docs.escarapelaHtml(p, ctx) +
          '</div></div>' +
          '<p class="escarapela-ayuda">' +
          'El frente muestra tu identidad de guardián; el reverso, tus dragones y recursos. ' +
          'Al imprimir salen las dos caras en una sola hoja.</p>' +
          '</div>'
      });
    },
    luego: function (ctx) {
      var tarjeta = PD.$('#escarapela');
      if (tarjeta) {
        tarjeta.addEventListener('click', function () { tarjeta.classList.toggle('girada'); });
      }
      enlazar('[data-accion="girar-escarapela"]', 'click', function () {
        if (tarjeta) tarjeta.classList.toggle('girada');
      });
      enlazar('[data-accion="elegir-avatar"]', 'change', function (el) {
        PD.app.elegirAvatar(el.value);
      });
      enlazar('[data-accion="escarapela-imprimir"]', 'click', function () {
        PD.docs.imprimir('.zona-impresion');
      });
      enlazar('[data-accion="escarapela-png"]', 'click', function () {
        if (!tarjeta) return;
        // Se descarga la cara que el estudiante está viendo.
        var cara = tarjeta.classList.contains('girada')
          ? tarjeta.querySelector('.cara-atras') : tarjeta.querySelector('.cara-frente');
        PD.docs.aPng(cara, 'Escarapela-' + ctx.perfil.codigo +
          (tarjeta.classList.contains('girada') ? '-reverso' : '') + '.png');
      });
    }
  };

  /* ======================================================================== */
  PD.vistas = {
    perfil: vistaPerfil,
    guardianes: vistaGuardianes,
    estadisticas: vistaEstadisticas,
    comparativa: vistaComparativa,
    ranking: vistaRanking,
    boletines: vistaBoletines,
    escarapela: vistaEscarapela,
    tarjetaAviso: tarjetaAviso,
    retroalimentacion: retroalimentacion
  };

})(window);
