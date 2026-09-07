/* ==========================================================================
   nucleo.js · Utilidades comunes del Portal del Guardián
   DOM, formatos, almacenamiento local, avisos flotantes, modal, tema y
   animaciones. Todo cuelga del espacio de nombres global PD.
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});

  /* ---------------------------------------------------------------- DOM -- */
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  /** Escapa texto para insertarlo con seguridad dentro de HTML. */
  function esc(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Construye un elemento a partir de una cadena HTML. */
  function nodo(cadena) {
    var caja = document.createElement('div');
    caja.innerHTML = String(cadena).trim();
    return caja.firstElementChild;
  }

  /* ------------------------------------------------------------ Formato -- */
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var fmt = {
    /** 8.456 -> "8,46" (coma decimal, como en el boletín impreso). */
    numero: function (valor, decimales) {
      if (valor === null || valor === undefined || isNaN(valor)) return '—';
      var d = decimales === undefined ? 2 : decimales;
      return Number(valor).toFixed(d).replace('.', ',');
    },
    nota: function (valor) { return fmt.numero(valor, 2); },
    entero: function (valor) {
      if (valor === null || valor === undefined || isNaN(valor)) return '—';
      return Math.round(valor).toLocaleString('es-CO');
    },
    porcentaje: function (valor, decimales) {
      if (valor === null || valor === undefined || isNaN(valor)) return '—';
      return fmt.numero(valor, decimales === undefined ? 1 : decimales) + ' %';
    },
    /** "2026-03-14" -> "14 de marzo de 2026" */
    fecha: function (iso) {
      if (!iso) return '';
      var p = String(iso).slice(0, 10).split('-');
      if (p.length !== 3) return String(iso);
      var dia = parseInt(p[2], 10), mes = parseInt(p[1], 10) - 1;
      if (isNaN(dia) || !MESES[mes]) return String(iso);
      return dia + ' de ' + MESES[mes] + ' de ' + p[0];
    },
    fechaCorta: function (iso) {
      if (!iso) return '';
      var p = String(iso).slice(0, 10).split('-');
      return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : String(iso);
    },
    nombre: function (est) {
      if (!est) return '';
      return ((est.nombres || '') + ' ' + (est.apellidos || '')).trim();
    },
    /** "PEDRO pérez" -> "Pedro Pérez" */
    capitalizar: function (texto) {
      return String(texto || '').toLowerCase().replace(/(^|\s|-)([\wáéíóúñü])/g,
        function (m, sep, letra) { return sep + letra.toUpperCase(); });
    },
    iniciales: function (est) {
      var n = (est && est.nombres || '?').trim(), a = (est && est.apellidos || '').trim();
      return ((n[0] || '') + (a[0] || '')).toUpperCase();
    }
  };

  /** Quita tildes y mayúsculas: sirve para comparar códigos y buscar. */
  function normal(texto) {
    var s = (texto === null || texto === undefined) ? '' : String(texto);
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.toLowerCase().trim();
  }

  /** Normaliza un código: sin tildes, sin espacios ni guiones, en minúsculas. */
  function codigoClave(texto) {
    return normal(texto).replace(/[\s._-]/g, '');
  }

  /* ------------------------------------------------------- Almacenamiento */
  var almacen = {
    get: function (clave, defecto) {
      try {
        var crudo = global.localStorage.getItem('pd.' + clave);
        return crudo === null ? defecto : JSON.parse(crudo);
      } catch (e) { return defecto; }
    },
    set: function (clave, valor) {
      try { global.localStorage.setItem('pd.' + clave, JSON.stringify(valor)); return true; }
      catch (e) { return false; }
    },
    del: function (clave) {
      try { global.localStorage.removeItem('pd.' + clave); } catch (e) { /* modo privado */ }
    }
  };

  /* ----------------------------------------------------- Avisos flotantes */
  var ICONO_TOSTADA = {
    ok: 'fa-circle-check',
    error: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  function tostada(mensaje, tipo, milis) {
    var caja = $('#tostadas');
    if (!caja) return;
    var clase = ICONO_TOSTADA[tipo] ? tipo : 'info';
    var el = nodo(
      '<div class="tostada tostada-' + clase + '" role="status">' +
      '<i class="fa-solid ' + ICONO_TOSTADA[clase] + '" aria-hidden="true"></i>' +
      '<div>' + esc(mensaje) + '</div></div>');
    caja.appendChild(el);
    var vida = milis || 3600;
    global.setTimeout(function () {
      el.classList.add('saliendo');
      global.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, vida);
  }

  /* ---------------------------------------------------------------- Modal */
  var modal = {
    _ultimoFoco: null,
    abrir: function (opciones) {
      var caja = $('#modal');
      if (!caja) return;
      modal._ultimoFoco = document.activeElement;
      $('#modal-titulo').innerHTML = opciones.titulo || '';
      $('#modal-cuerpo').innerHTML = opciones.cuerpo || '';
      $('#modal-pie').innerHTML = opciones.pie || '';
      caja.classList.remove('oculto');
      document.body.style.overflow = 'hidden';
      var foco = caja.querySelector('[data-foco]') || caja.querySelector('button');
      if (foco) foco.focus();
      if (typeof opciones.despues === 'function') opciones.despues(caja);
    },
    cerrar: function () {
      var caja = $('#modal');
      if (!caja || caja.classList.contains('oculto')) return;
      caja.classList.add('oculto');
      document.body.style.overflow = '';
      if (modal._ultimoFoco && modal._ultimoFoco.focus) modal._ultimoFoco.focus();
    },
    abierto: function () {
      var caja = $('#modal');
      return !!caja && !caja.classList.contains('oculto');
    }
  };

  /* ----------------------------------------------------------------- Tema */
  var tema = {
    actual: function () { return document.documentElement.getAttribute('data-tema') || 'oscuro'; },
    aplicar: function (valor) {
      var v = valor === 'claro' ? 'claro' : 'oscuro';
      document.documentElement.setAttribute('data-tema', v);
      almacen.set('tema', v);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', v === 'claro' ? '#eef1f8' : '#070c17');
      $$('[data-accion="tema"] i').forEach(function (i) {
        i.className = 'fa-solid ' + (v === 'claro' ? 'fa-sun' : 'fa-moon');
      });
      document.dispatchEvent(new CustomEvent('pd:tema', { detail: { tema: v } }));
      return v;
    },
    alternar: function () { return tema.aplicar(tema.actual() === 'claro' ? 'oscuro' : 'claro'); },
    iniciar: function () {
      var guardado = almacen.get('tema', null);
      if (!guardado && global.matchMedia) {
        guardado = global.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
      }
      return tema.aplicar(guardado || 'oscuro');
    }
  };

  /* ----------------------------------------------------------- Animación  */
  /** Cuenta desde 0 hasta el valor final; respeta "reducir movimiento". */
  function animarNumero(el, valor, opciones) {
    if (!el) return;
    var o = opciones || {};
    var decimales = o.decimales === undefined ? 0 : o.decimales;
    var sufijo = o.sufijo || '';
    var duracion = o.duracion || 900;
    var pintar = function (n) {
      el.textContent = (decimales ? fmt.numero(n, decimales) : fmt.entero(n)) + sufijo;
    };
    if (valor === null || valor === undefined || isNaN(valor)) { el.textContent = '—'; return; }
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || duracion <= 0) { pintar(valor); return; }
    var inicio = null;
    function paso(t) {
      if (inicio === null) inicio = t;
      var avance = Math.min(1, (t - inicio) / duracion);
      var suave = 1 - Math.pow(1 - avance, 3);
      pintar(valor * suave);
      if (avance < 1) global.requestAnimationFrame(paso);
      else pintar(valor);
    }
    global.requestAnimationFrame(paso);
  }

  /** Lanza las barras de progreso (width: 0 -> data-valor) al entrar en vista. */
  function animarBarras(raiz) {
    var barras = $$('.barra-relleno[data-valor]', raiz || document);
    if (!barras.length) return;
    global.requestAnimationFrame(function () {
      global.setTimeout(function () {
        barras.forEach(function (b) {
          var v = Math.max(0, Math.min(100, parseFloat(b.getAttribute('data-valor')) || 0));
          b.style.width = v + '%';
        });
      }, 60);
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ese = this;
      global.clearTimeout(t);
      t = global.setTimeout(function () { fn.apply(ese, args); }, ms || 180);
    };
  }

  /* --------------------------------------------------------- Descargas --- */
  function descargar(nombre, contenido, tipo) {
    try {
      var blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      global.setTimeout(function () {
        URL.revokeObjectURL(url);
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 1500);
      return true;
    } catch (e) { return false; }
  }

  /** ¿Cargó FontAwesome? Si no, el portal oculta los huecos de icono. */
  function revisarIconos() {
    var prueba = document.createElement('i');
    prueba.className = 'fa-solid fa-dragon';
    prueba.style.cssText = 'position:absolute;left:-9999px;visibility:hidden';
    document.body.appendChild(prueba);
    var familia = global.getComputedStyle(prueba).fontFamily || '';
    document.body.removeChild(prueba);
    var hay = /font awesome/i.test(familia);
    if (!hay) document.body.classList.add('sin-iconos');
    return hay;
  }

  PD.$ = $;
  PD.$$ = $$;
  PD.esc = esc;
  PD.nodo = nodo;
  PD.fmt = fmt;
  PD.normal = normal;
  PD.codigoClave = codigoClave;
  PD.almacen = almacen;
  PD.tostada = tostada;
  PD.modal = modal;
  PD.tema = tema;
  PD.animarNumero = animarNumero;
  PD.animarBarras = animarBarras;
  PD.debounce = debounce;
  PD.descargar = descargar;
  PD.revisarIconos = revisarIconos;

})(window);
