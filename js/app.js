/* ==========================================================================
   app.js · Arranque, accesos y navegación de la Academia de Dragones
   Cuatro pantallas: portada de bienvenida, inicio con la narrativa y los
   accesos, panel del estudiante (Guardianes del Dragón) y panel del maestro
   (Tutor de Dragones).
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var $ = PD.$, $$ = PD.$$, esc = PD.esc;

  var VISTAS_ESTUDIANTE = ['perfil', 'guardianes', 'estadisticas', 'comparativa',
    'ranking', 'boletines', 'escarapela'];
  var VISTAS_TUTOR = ['panel', 'estudiantes', 'calificaciones', 'estadisticas',
    'ranking', 'boletines', 'escarapelas', 'institucion', 'respaldos'];

  var estado = {
    pantalla: 'portada',   // portada | inicio | app | tutor
    est: null,             // estudiante en sesión
    tutor: false,
    vista: 'perfil',
    periodo: 0,
    ambito: 'curso',
    metrica: 'promedio',
    comparar: 'curso',
    alias: false,
    busqueda: ''
  };

  /* ======================================================================== */
  /* Arranque                                                                 */
  /* ======================================================================== */
  function iniciar() {
    PD.tema.iniciar();
    estado.alias = !!PD.almacen.get('alias', false);
    eventosGlobales();

    PD.base.cargar().then(function () {
      PD.revisarIconos();
      marcarDemo();
      prepararPortada();
      ocultarCarga();
      abrirDestinoInicial();
    }).catch(function (e) {
      ocultarCarga();
      mostrarPantalla('portada');
      PD.tostada(e.message || 'No se pudieron cargar los datos.', 'error', 7000);
      if (global.console) console.error(e);
    });
  }

  function ocultarCarga() {
    var carga = $('#cargando');
    if (carga) carga.classList.add('oculto');
  }

  /** Decide dónde empieza el usuario: sesión recordada, enlace directo o portada. */
  function abrirDestinoInicial() {
    var ruta = (global.location.hash || '').replace('#/', '');
    var tutorRecordado = !!PD.almacen.get('sesionTutor', false);
    var codigo = PD.almacen.get('codigo', '');
    var est = codigo ? PD.datos.buscarPorCodigo(codigo) : null;

    if (ruta.indexOf('tutor') === 0) {
      if (tutorRecordado) { entrarTutor(rutaTutor(ruta)); return; }
      mostrarPantalla('inicio');
      pedirCodigoTutor();
      return;
    }
    if (VISTAS_ESTUDIANTE.indexOf(ruta) >= 0 && est) { entrarEstudiante(est, false, ruta); return; }
    if (ruta === 'inicio') { mostrarPantalla('inicio'); return; }

    if (est) { entrarEstudiante(est, false, 'perfil'); return; }
    if (tutorRecordado) { entrarTutor('panel'); return; }
    mostrarPantalla('portada');
  }

  function rutaTutor(ruta) {
    var partes = ruta.split('/');
    var vista = partes[1] || 'panel';
    return VISTAS_TUTOR.indexOf(vista) >= 0 ? vista : 'panel';
  }

  function marcarDemo() {
    var meta = PD.datos.meta();
    var pastilla = $('#marca-demo');
    if (pastilla) pastilla.classList.toggle('oculto', !(meta.ejemplo || meta.demo));
  }

  /* ======================================================================== */
  /* Pantallas                                                                */
  /* ======================================================================== */
  function mostrarPantalla(nombre) {
    estado.pantalla = nombre;
    [['portada', '#portada'], ['inicio', '#inicio'], ['app', '#app'], ['tutor', '#tutor']]
      .forEach(function (par) {
        var el = $(par[1]);
        if (el) el.classList.toggle('oculto', par[0] !== nombre);
      });
    cerrarMenu();
    global.scrollTo({ top: 0, behavior: 'auto' });
  }

  var DRAGONES_PORTADA = ['elementum', 'stellaris', 'fenix', 'tormenta', 'geoda', 'zephyra'];

  function prepararPortada() {
    var meta = PD.datos.meta();
    var titulo = (meta.institucion || 'Crónicas de los 12 Dragones') +
      (meta.anio ? ' · ' + meta.anio : '');
    ['#portada-institucion', '#inicio-institucion'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.textContent = titulo;
    });

    // El dragón de la portada cambia en cada visita.
    var slug = DRAGONES_PORTADA[Math.floor(Math.random() * DRAGONES_PORTADA.length)];
    var dragon = null;
    PD.datos.dragones().forEach(function (d) { if (d.slug === slug) dragon = d; });
    var img = $('#portada-dragon');
    if (img && dragon) {
      img.src = PD.piezas.rutaDragon(dragon.slug);
      img.alt = dragon.nombre;
      $('#portada-dragon-nombre').textContent = dragon.nombre;
      $('#portada-dragon-poder').textContent = dragon.poder || dragon.elemento;
      var arte = img.closest('.portada-arte');
      if (arte) arte.style.setProperty('--acento', dragon.color);
    }
  }

  /* ======================================================================== */
  /* Accesos                                                                  */
  /* ======================================================================== */
  function abrirAcceso(cual) {
    if (cual === 'tutor') return pedirCodigoTutor();
    if (cual === 'guardian') return pedirCodigoEstudiante();
    if (cual === 'recursos') return abrirEnlace('recursos', 'Recursos didácticos');
    if (cual === 'examenes') return abrirEnlace('examenes', 'Portal de exámenes');
    if (cual === 'ejes') return abrirEnlace('ejes', 'Ejes temáticos');
    if (cual === 'gamificacion') return abrirEnlace('gamificacion', 'Gamificación');
  }

  function abrirEnlace(clave, titulo) {
    var enlaces = (PD.base.estado && PD.base.estado.enlaces) || {};
    var url = enlaces[clave];
    if (url) {
      global.open(url, '_blank', 'noopener');
      return;
    }
    PD.modal.abrir({
      titulo: titulo,
      cuerpo: '<p>Todavía no se ha configurado el enlace de <strong>' + esc(titulo.toLowerCase()) +
        '</strong>.</p>' +
        '<p style="margin-top:10px">El docente puede añadirlo desde el panel del tutor, en ' +
        '<strong>Institución → Enlaces del portal</strong>. Al guardarlo, este botón llevará ' +
        'directamente al sitio.</p>',
      pie: '<button type="button" class="boton boton-mini" data-accion="cerrar-modal">Entendido</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-ir-tutor="1">' +
        '<i class="fa-solid fa-hat-wizard" aria-hidden="true"></i><span>Soy el docente</span></button>',
      despues: function (caja) {
        var btn = caja.querySelector('[data-ir-tutor]');
        if (btn) btn.addEventListener('click', function () {
          PD.modal.cerrar();
          pedirCodigoTutor('institucion');
        });
      }
    });
  }

  /* --- Ingreso del estudiante --------------------------------------------- */
  function pedirCodigoEstudiante() {
    var meta = PD.datos.meta();
    var pista = '';
    if (meta.ejemplo || meta.demo) {
      var muestras = PD.datos.estudiantes().slice(0, 3).filter(function (e) { return e.codigo; });
      if (muestras.length) {
        pista = '<div class="portada-pista" style="margin-top:14px"><strong>Datos de ejemplo.</strong> ' +
          'Puedes entrar con: ' + muestras.map(function (e) {
            return '<code data-codigo="' + esc(e.codigo) + '">' + esc(e.codigo) + '</code>';
          }).join(' ') + '</div>';
      }
    }

    PD.modal.abrir({
      titulo: 'Guardianes del Dragón',
      cuerpo:
        '<form id="form-guardian" class="formulario" autocomplete="off">' +
        '<p class="tarjeta-sub">Escribe tu <strong>código de estudiante</strong>, el mismo que ' +
        'aparece en tu escarapela o que te entregó el docente.</p>' +
        '<label class="campo"><span class="campo-etiqueta">' +
        '<i class="fa-solid fa-key" aria-hidden="true"></i> Código de estudiante</span>' +
        '<input id="campo-codigo" type="text" placeholder="Ej: DRG-5A03" maxlength="40" ' +
        'spellcheck="false" autocapitalize="characters" data-foco="1"></label>' +
        '<label class="recordar"><input id="campo-recordar" type="checkbox" checked>' +
        '<span>Recordar mi código en este equipo</span></label>' +
        '<p id="error-guardian" class="ingreso-error oculto" role="alert"></p>' +
        pista +
        '</form>',
      pie: '<button type="button" class="enlace" data-ayuda="1">No recuerdo mi código</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-entrar="1">' +
        '<i class="fa-solid fa-dragon" aria-hidden="true"></i><span>Entrar</span></button>',
      despues: function (caja) {
        var campo = caja.querySelector('#campo-codigo');
        var error = caja.querySelector('#error-guardian');
        campo.focus();

        function intentar() {
          var codigo = (campo.value || '').trim();
          if (!codigo) return fallar('Escribe tu código de estudiante.');
          var est = PD.datos.buscarPorCodigo(codigo);
          if (!est) {
            return fallar('No encontramos el código "' + codigo + '". Revisa que esté completo ' +
              'o pídeselo a tu docente.');
          }
          PD.modal.cerrar();
          entrarEstudiante(est, caja.querySelector('#campo-recordar').checked, 'perfil');
        }

        function fallar(mensaje) {
          error.innerHTML = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' +
            '<span>' + esc(mensaje) + '</span>';
          error.classList.remove('oculto');
          var form = caja.querySelector('#form-guardian');
          form.classList.remove('temblar');
          global.requestAnimationFrame(function () { form.classList.add('temblar'); });
        }

        caja.querySelector('[data-entrar]').addEventListener('click', intentar);
        campo.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); intentar(); }
        });
        $$('code[data-codigo]', caja).forEach(function (c) {
          c.addEventListener('click', function () {
            campo.value = c.getAttribute('data-codigo');
            campo.focus();
          });
        });
        var ayuda = caja.querySelector('[data-ayuda]');
        if (ayuda) ayuda.addEventListener('click', ayudaCodigo);
      }
    });
  }

  /* --- Ingreso del tutor --------------------------------------------------- */
  function pedirCodigoTutor(vistaDestino) {
    PD.modal.abrir({
      titulo: 'Tutor de Dragones',
      cuerpo:
        '<form id="form-tutor" class="formulario" autocomplete="off">' +
        '<p class="tarjeta-sub">Este panel administra estudiantes, notas, informes y ' +
        'escarapelas. Es solo para el docente.</p>' +
        '<label class="campo"><span class="campo-etiqueta">' +
        '<i class="fa-solid fa-lock" aria-hidden="true"></i> Código del tutor</span>' +
        '<input id="campo-tutor" type="password" placeholder="Código de acceso" maxlength="60" ' +
        'spellcheck="false" data-foco="1"></label>' +
        '<label class="recordar"><input id="tutor-recordar" type="checkbox" checked>' +
        '<span>Mantener la sesión abierta en este equipo</span></label>' +
        '<p id="error-tutor" class="ingreso-error oculto" role="alert"></p>' +
        '</form>',
      pie: '<button type="button" class="boton boton-mini boton-fantasma" data-accion="cerrar-modal">Cancelar</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-entrar="1">' +
        '<i class="fa-solid fa-hat-wizard" aria-hidden="true"></i><span>Entrar al panel</span></button>',
      despues: function (caja) {
        var campo = caja.querySelector('#campo-tutor');
        var error = caja.querySelector('#error-tutor');
        campo.focus();

        function intentar() {
          if (!PD.tutor.verificar(campo.value)) {
            error.innerHTML = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' +
              '<span>Código incorrecto.</span>';
            error.classList.remove('oculto');
            var form = caja.querySelector('#form-tutor');
            form.classList.remove('temblar');
            global.requestAnimationFrame(function () { form.classList.add('temblar'); });
            campo.select();
            return;
          }
          if (caja.querySelector('#tutor-recordar').checked) PD.almacen.set('sesionTutor', true);
          PD.modal.cerrar();
          entrarTutor(vistaDestino || 'panel');
        }

        caja.querySelector('[data-entrar]').addEventListener('click', intentar);
        campo.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); intentar(); }
        });
      }
    });
  }

  function ayudaCodigo() {
    PD.modal.abrir({
      titulo: 'No recuerdo mi código',
      cuerpo:
        '<p>El código es el mismo que aparece en tu <strong>escarapela</strong> y en el listado ' +
        'del docente.</p>' +
        '<ul style="margin:12px 0 0 18px;display:grid;gap:7px">' +
        '<li>No distingue mayúsculas de minúsculas.</li>' +
        '<li>Puedes escribirlo con o sin guiones y espacios.</li>' +
        '<li>Si nadie te lo ha entregado, pídeselo a tu docente: él puede verlo e imprimirlo.</li>' +
        '</ul>',
      pie: '<button type="button" class="boton boton-mini boton-oro" data-accion="cerrar-modal">Entendido</button>'
    });
  }

  /* ======================================================================== */
  /* Sesiones                                                                 */
  /* ======================================================================== */
  function entrarEstudiante(est, recordar, vista) {
    estado.est = est;
    estado.tutor = false;
    if (recordar !== false) PD.almacen.set('codigo', est.codigo);

    var elegido = PD.almacen.get('avatar.' + PD.codigoClave(est.codigo), '');
    if (elegido) est.dragon = elegido;

    PD.motor.limpiarCache();
    mostrarPantalla('app');
    estado.vista = VISTAS_ESTUDIANTE.indexOf(vista) >= 0 ? vista : 'perfil';
    irA('#/' + estado.vista, function () { pintar(); });
    PD.tostada('¡Bienvenido de nuevo, ' + est.nombres + '!', 'ok');
  }

  function entrarTutor(vista) {
    estado.tutor = true;
    estado.est = null;
    mostrarPantalla('tutor');
    PD.tutor.estado.vista = VISTAS_TUTOR.indexOf(vista) >= 0 ? vista : 'panel';
    irA('#/tutor/' + PD.tutor.estado.vista, function () { PD.tutor.pintar(); });
  }

  /** Cambia el hash; si ya era el mismo, ejecuta la acción directamente. */
  function irA(hash, siNoCambia) {
    if (global.location.hash === hash) {
      if (siNoCambia) siNoCambia();
    } else {
      global.location.hash = hash;
    }
  }

  function salir() {
    PD.almacen.del('codigo');
    estado.est = null;
    PD.motor.limpiarCache();
    PD.graficas.limpiarTodo();
    mostrarPantalla('inicio');
    global.location.hash = '#/inicio';
    PD.tostada('Sesión cerrada.', 'info');
  }

  function salirTutor() {
    PD.almacen.del('sesionTutor');
    estado.tutor = false;
    PD.graficas.limpiarTodo();
    mostrarPantalla('inicio');
    global.location.hash = '#/inicio';
    PD.tostada('Sesión del tutor cerrada.', 'info');
  }

  /* ======================================================================== */
  /* Navegación                                                               */
  /* ======================================================================== */
  function alCambiarHash() {
    var ruta = (global.location.hash || '').replace('#/', '');

    if (ruta.indexOf('tutor') === 0) {
      if (!estado.tutor) {
        if (PD.almacen.get('sesionTutor', false)) { entrarTutor(rutaTutor(ruta)); return; }
        mostrarPantalla('inicio');
        pedirCodigoTutor(rutaTutor(ruta));
        return;
      }
      if (estado.pantalla !== 'tutor') mostrarPantalla('tutor');
      PD.tutor.estado.vista = rutaTutor(ruta);
      PD.tutor.pintar();
      return;
    }

    if (ruta === 'inicio') { mostrarPantalla('inicio'); return; }

    if (VISTAS_ESTUDIANTE.indexOf(ruta) >= 0) {
      if (!estado.est) {
        mostrarPantalla('inicio');
        pedirCodigoEstudiante();
        return;
      }
      if (estado.pantalla !== 'app') mostrarPantalla('app');
      estado.vista = ruta;
      pintar();
      return;
    }

    // Cualquier otra ruta lleva al inicio (o a la portada la primera vez).
    if (estado.pantalla === 'portada') return;
    mostrarPantalla('inicio');
  }

  /* ======================================================================== */
  /* Panel del estudiante                                                     */
  /* ======================================================================== */
  function contexto() {
    var est = estado.est;
    var perfil = PD.motor.perfil(est, { periodo: estado.periodo });
    var companeros = PD.datos.companeros(est);
    var clasificacion = PD.motor.ranking(companeros, { metrica: 'promedio', periodo: estado.periodo });
    var puesto = 0;
    clasificacion.filas.forEach(function (f) { if (f.perfil.id === est.id) puesto = f.puesto; });

    return {
      est: est,
      perfil: perfil,
      meta: PD.datos.meta(),
      periodo: estado.periodo,
      ambito: estado.ambito,
      metrica: estado.metrica,
      comparar: estado.comparar,
      alias: estado.alias,
      busqueda: estado.busqueda,
      puestoCurso: puesto || '—'
    };
  }

  function pintar(opciones) {
    if (!estado.est) return;
    var o = opciones || {};
    var vista = PD.vistas[estado.vista] || PD.vistas.perfil;
    var ctx = contexto();

    PD.graficas.limpiarTodo();

    $('#titulo-vista').textContent = vista.titulo;
    $('#subtitulo-vista').textContent =
      typeof vista.subtitulo === 'function' ? vista.subtitulo(ctx) : (vista.subtitulo || '');

    var main = $('#vista');
    main.innerHTML = vista.html(ctx);

    actualizarNav();
    actualizarPerfilLateral(ctx);

    if (typeof vista.luego === 'function') vista.luego(ctx);

    animarValores(main);
    PD.animarBarras(main);

    if (o.mantenerFoco) {
      var campo = $(o.mantenerFoco);
      if (campo) {
        campo.focus();
        if (campo.setSelectionRange && campo.value) {
          campo.setSelectionRange(campo.value.length, campo.value.length);
        }
      }
    } else {
      global.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function animarValores(raiz) {
    $$('[data-animar]', raiz).forEach(function (el) {
      var crudo = el.getAttribute('data-animar');
      if (crudo === '' || crudo === null) { el.textContent = '—'; return; }
      PD.animarNumero(el, parseFloat(crudo), {
        decimales: parseInt(el.getAttribute('data-decimales'), 10) || 0,
        sufijo: el.getAttribute('data-sufijo') || ''
      });
    });
  }

  function actualizarNav() {
    $$('#nav .nav-item, .nav-movil-item').forEach(function (a) {
      a.classList.toggle('activo', a.getAttribute('data-vista') === estado.vista);
    });
  }

  function actualizarPerfilLateral(ctx) {
    var p = ctx.perfil;
    var mini = $('#mini-perfil');
    if (mini) {
      mini.innerHTML =
        '<img src="' + PD.piezas.rutaDragon(p.avatar, true) + '" alt="">' +
        '<div class="mini-perfil-datos">' +
        '<div class="mini-perfil-nombre">' + esc(p.nombre) + '</div>' +
        '<div class="mini-perfil-sub">Nivel ' + p.nivel.nivel + ' · ' + esc(p.titulo) + '</div>' +
        '</div>';
    }
    var chip = $('#chip-perfil');
    if (chip) {
      chip.innerHTML =
        '<img src="' + PD.piezas.rutaDragon(p.avatar, true) + '" alt="">' +
        '<span class="chip-perfil-textos">' +
        '<span class="chip-perfil-nombre">' + esc(p.est.nombres) + '</span>' +
        '<span class="chip-perfil-sub">' + esc(p.curso) + '</span></span>';
    }
    var firma = $('#firma-datos');
    if (firma) {
      var meta = ctx.meta;
      firma.innerHTML = esc(meta.institucion || 'Crónicas de los 12 Dragones') + '<br>' +
        'Datos del ' + esc(meta.generado || '—');
    }
  }

  /** Guarda el dragón que el estudiante quiere ver en su escarapela. */
  function elegirAvatar(slug) {
    if (!estado.est) return;
    var perfil = PD.motor.perfil(estado.est, { periodo: estado.periodo });
    var permitido = false;
    perfil.dragones.lista.forEach(function (d) {
      if (d.slug === slug && d.desbloqueado) permitido = true;
    });
    if (!permitido) {
      PD.tostada('Ese dragón todavía está bloqueado.', 'error');
      return;
    }
    estado.est.dragon = slug;
    PD.almacen.set('avatar.' + PD.codigoClave(estado.est.codigo), slug);
    PD.motor.limpiarCache();
    pintar();
    PD.tostada('Tu escarapela ahora muestra a ' + slug.toUpperCase() + '.', 'ok');
  }

  /* ======================================================================== */
  /* Eventos globales                                                         */
  /* ======================================================================== */
  function lateralVisible() {
    return estado.pantalla === 'tutor' ? $('#lateral-tutor') : $('#lateral');
  }
  function veloVisible() {
    return estado.pantalla === 'tutor' ? $('#velo-tutor') : $('#velo');
  }

  function abrirMenu() {
    var l = lateralVisible();
    if (l) l.classList.add('abierta');
    var v = veloVisible();
    if (v) v.hidden = false;
  }

  function cerrarMenu() {
    $$('.lateral').forEach(function (l) { l.classList.remove('abierta'); });
    $$('.velo').forEach(function (v) { v.hidden = true; });
  }

  function eventosGlobales() {
    global.addEventListener('hashchange', alCambiarHash);

    document.addEventListener('click', function (e) {
      var acceso = e.target.closest('[data-acceso]');
      if (acceso) { abrirAcceso(acceso.getAttribute('data-acceso')); return; }

      var disparador = e.target.closest('[data-accion]');
      if (!disparador) return;
      var accion = disparador.getAttribute('data-accion');

      if (accion === 'comenzar') {
        mostrarPantalla('inicio');
        global.location.hash = '#/inicio';
      } else if (accion === 'tema') {
        PD.tema.alternar();
        if (estado.pantalla === 'app' && estado.est) pintar();
        if (estado.pantalla === 'tutor') PD.tutor.pintar();
      } else if (accion === 'salir') salir();
      else if (accion === 'salir-tutor') salirTutor();
      else if (accion === 'abrir-menu') abrirMenu();
      else if (accion === 'cerrar-menu') cerrarMenu();
      else if (accion === 'cerrar-modal') PD.modal.cerrar();
      else if (accion === 'ir-perfil') { global.location.hash = '#/perfil'; cerrarMenu(); }
      else if (accion === 'ir-inicio') { mostrarPantalla('inicio'); global.location.hash = '#/inicio'; }
      else if (accion === 'ayuda-codigo') ayudaCodigo();
    });

    // Al tocar un enlace del menú en móvil, el panel lateral se cierra.
    $$('.nav-item, .nav-movil-item').forEach(function (a) {
      a.addEventListener('click', cerrarMenu);
    });
    $$('.velo').forEach(function (v) { v.addEventListener('click', cerrarMenu); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (PD.modal.abierto()) PD.modal.cerrar();
        else cerrarMenu();
      }
    });

    // Si el tutor cambia datos, el panel del estudiante abierto se refresca.
    document.addEventListener('pd:base', function () {
      if (estado.pantalla === 'app' && estado.est) {
        var actual = PD.datos.buscarPorCodigo(estado.est.codigo);
        if (actual) estado.est = actual;
      }
    });
  }

  PD.app = {
    estado: estado,
    iniciar: iniciar,
    pintar: pintar,
    salir: salir,
    elegirAvatar: elegirAvatar,
    mostrarPantalla: mostrarPantalla,
    pedirCodigoEstudiante: pedirCodigoEstudiante,
    pedirCodigoTutor: pedirCodigoTutor
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

})(window);
