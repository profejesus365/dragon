/* ==========================================================================
   base.js · Base de datos viva de la Academia
   El Tutor de Dragones edita aquí; el panel del estudiante lee de aquí.

   Dónde se guarda, por orden de preferencia:
     1. data/base.json en la carpeta del sitio  (cuando corre el servidor local)
     2. localStorage del navegador               (siempre, como copia inmediata)
     3. data/datos.js                            (semilla: curso exportado o de ejemplo)

   Guardar es automático: cada cambio del tutor se escribe sin pedir permiso,
   con respaldos con fecha en data/respaldos/.
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var VERSION = 1;
  var CLAVE_LOCAL = 'base';

  var estado = null;
  var servidor = {
    activo: false, escritura: false, respaldos: [], carpeta: '',
    motivo: '', detalle: '', version: 0
  };
  var temporizador = null;
  var guardando = false;
  var pendiente = false;

  var GENEROS = {
    F: 'Femenino',
    M: 'Masculino',
    O: 'Otro / no informa'
  };

  /* ======================================================================== */
  /* Utilidades                                                               */
  /* ======================================================================== */
  function ahora() {
    var d = new Date();
    function dd(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + dd(d.getMonth() + 1) + '-' + dd(d.getDate()) +
      ' ' + dd(d.getHours()) + ':' + dd(d.getMinutes());
  }

  function proximoId(lista) {
    var max = 0;
    (lista || []).forEach(function (x) { if (Number(x.id) > max) max = Number(x.id); });
    return max + 1;
  }

  function texto(valor, maximo) {
    var s = (valor === null || valor === undefined) ? '' : String(valor);
    s = s.replace(/\s+/g, ' ').trim();
    return maximo ? s.slice(0, maximo) : s;
  }

  /**
   * Divide un nombre completo en [apellidos, nombres].
   *   orden 'apellidos' (por defecto): "Rojas Pérez Valentina María"
   *   orden 'nombres':                 "Valentina María Rojas Pérez"
   * Con cuatro o más palabras se toman dos por lado; con tres, una sola.
   * "Apellidos, Nombres" (con coma) siempre se respeta tal cual.
   */
  function partirNombre(completo, orden) {
    var limpio = texto(completo, 160);
    if (!limpio) return ['', ''];
    if (limpio.indexOf(',') >= 0) {
      var mitades = limpio.split(',');
      return [texto(mitades[0], 80), texto(mitades.slice(1).join(' '), 80)];
    }
    var partes = limpio.split(' ').filter(Boolean);
    if (partes.length < 2) return ['', partes[0] || ''];
    var corte = partes.length >= 4 ? 2 : 1;
    if (orden === 'nombres') {
      return [partes.slice(partes.length - corte).join(' '),
        partes.slice(0, partes.length - corte).join(' ')];
    }
    return [partes.slice(0, corte).join(' '), partes.slice(corte).join(' ')];
  }

  /** Borra los grados y grupos que se quedaron sin ningún estudiante. */
  function limpiarCatalogos() {
    var conGrado = {}, conGrupo = {};
    estado.estudiantes.forEach(function (e) {
      conGrado[e.grado_id] = true;
      conGrupo[e.grupo_id] = true;
    });
    var antesGrados = estado.grados.length, antesGrupos = estado.grupos.length;
    estado.grupos = estado.grupos.filter(function (g) { return conGrupo[g.id]; });
    estado.grados = estado.grados.filter(function (g) { return conGrado[g.id]; });
    guardar('limpiar-catalogos');
    return {
      grados: antesGrados - estado.grados.length,
      grupos: antesGrupos - estado.grupos.length
    };
  }

  /** Cambia apellidos por nombres en los estudiantes indicados (o en todos). */
  function invertirNombres(ids) {
    var lista = ids && ids.length
      ? estado.estudiantes.filter(function (e) { return ids.indexOf(e.id) >= 0; })
      : estado.estudiantes;
    lista.forEach(function (e) {
      var apellidos = e.apellidos;
      e.apellidos = e.nombres;
      e.nombres = apellidos;
    });
    guardar('invertir-nombres');
    return lista.length;
  }

  function generoNormal(valor) {
    var v = PD.normal(valor);
    if (!v) return 'O';
    if (v[0] === 'f' || v.indexOf('femen') === 0 || v === 'niña' || v === 'nina') return 'F';
    if (v[0] === 'm' || v.indexOf('mascul') === 0 || v === 'niño' || v === 'nino') return 'M';
    return 'O';
  }

  /* ======================================================================== */
  /* Estructura por defecto                                                   */
  /* ======================================================================== */
  function institucionVacia() {
    return {
      nombre: '', sede: '', jornada: '',
      docente: 'Mgtr. Jesús David Álvarez Sáez',
      anio: String(new Date().getFullYear())
    };
  }

  function baseVacia() {
    var semilla = PD.datos.semillaFija();
    return {
      version: VERSION,
      actualizado: ahora(),
      institucion: institucionVacia(),
      grados: [],
      grupos: [],
      estudiantes: [],
      misiones: semilla.misiones,
      periodos: semilla.periodos,
      dragones: semilla.dragones,
      mostrarNombres: true
    };
  }

  /** Convierte el paquete exportado (data/datos.js) en la base normalizada. */
  function desdePaquete(paquete) {
    var semilla = PD.datos.semillaFija();
    var meta = paquete.meta || {};
    var grados = (paquete.grados || []).map(function (g, i) {
      return { id: Number(g.id) || (i + 1), nombre: texto(g.nombre, 60), orden: Number(g.orden) || (i + 1) };
    });
    var grupos = (paquete.grupos || []).map(function (g, i) {
      return {
        id: Number(g.id) || (i + 1),
        grado_id: Number(g.grado_id) || null,
        nombre: texto(g.nombre, 40)
      };
    });

    // Si el paquete no traía catálogos, se deducen de los estudiantes.
    var porGrado = {}, porGrupo = {};
    grados.forEach(function (g) { porGrado[PD.normal(g.nombre)] = g; });
    grupos.forEach(function (g) { porGrupo[g.grado_id + '|' + PD.normal(g.nombre)] = g; });

    var estudiantes = (paquete.estudiantes || []).map(function (e, i) {
      var gradoNombre = texto(e.grado_nombre, 60);
      var grupoNombre = texto(e.grupo_nombre, 40);
      var grado = gradoNombre ? porGrado[PD.normal(gradoNombre)] : null;
      if (gradoNombre && !grado) {
        grado = { id: proximoId(grados), nombre: gradoNombre, orden: Number(e.grado_orden) || grados.length + 1 };
        grados.push(grado);
        porGrado[PD.normal(gradoNombre)] = grado;
      }
      var grupo = null;
      if (grado && grupoNombre) {
        grupo = porGrupo[grado.id + '|' + PD.normal(grupoNombre)];
        if (!grupo) {
          grupo = { id: proximoId(grupos), grado_id: grado.id, nombre: grupoNombre };
          grupos.push(grupo);
          porGrupo[grado.id + '|' + PD.normal(grupoNombre)] = grupo;
        }
      }
      return {
        id: Number(e.id) || (i + 1),
        codigo: texto(e.codigo, 40),
        nombres: texto(e.nombres, 80),
        apellidos: texto(e.apellidos, 80),
        genero: generoNormal(e.genero),
        grado_id: grado ? grado.id : null,
        grupo_id: grupo ? grupo.id : null,
        dragon: texto(e.dragon, 30),
        notas: texto(e.notas, 400),
        activo: e.activo === 0 ? 0 : 1,
        registros: (e.registros || []).map(limpiarRegistro)
      };
    });

    return {
      version: VERSION,
      actualizado: ahora(),
      institucion: {
        nombre: texto(meta.institucion, 120),
        sede: texto(meta.sede, 120),
        jornada: texto(meta.jornada, 60),
        docente: texto(meta.docente, 120) || institucionVacia().docente,
        anio: texto(meta.anio, 10) || String(new Date().getFullYear())
      },
      enlaces: Object.assign(
        { recursos: '', examenes: '', ejes: '', gamificacion: '' }, meta.enlaces || {}),
      grados: grados,
      grupos: grupos,
      estudiantes: estudiantes,
      misiones: (paquete.misiones && paquete.misiones.length) ? paquete.misiones.map(limpiarMision) : semilla.misiones,
      periodos: (paquete.periodos && paquete.periodos.length) ? paquete.periodos : semilla.periodos,
      dragones: (paquete.dragones && paquete.dragones.length) ? paquete.dragones : semilla.dragones,
      mostrarNombres: meta.mostrarNombres !== false,
      origen: meta.ejemplo ? 'ejemplo' : 'exportacion'
    };
  }

  function limpiarMision(m) {
    return {
      id: Number(m.id) || Number(m.numero),
      numero: Number(m.numero) || Number(m.id),
      periodo_id: Number(m.periodo_id) || 1,
      titulo: texto(m.titulo, 120),
      tema: texto(m.tema, 120),
      descripcion: texto(m.descripcion, 400),
      activa: m.activa === 0 ? 0 : 1
    };
  }

  function limpiarRegistro(r) {
    return {
      mision_id: Number(r.mision_id),
      nota_taller: PD.motor.normalizarNota(r.nota_taller),
      nota_actividad: PD.motor.normalizarNota(r.nota_actividad),
      nota_bitacora1: PD.motor.normalizarNota(r.nota_bitacora1),
      nota_bitacora2: PD.motor.normalizarNota(r.nota_bitacora2),
      observaciones: texto(r.observaciones, 400),
      fecha: texto(r.fecha, 20)
    };
  }

  /* ======================================================================== */
  /* Carga                                                                    */
  /* ======================================================================== */
  function pedir(ruta, opciones) {
    var o = opciones || {};
    var cabeceras = { 'X-Portal': 'dragones' };
    if (o.cuerpo) cabeceras['Content-Type'] = 'application/json';
    return global.fetch(ruta, {
      method: o.metodo || 'GET',
      headers: cabeceras,
      cache: 'no-store',
      body: o.cuerpo ? JSON.stringify(o.cuerpo) : undefined
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
        return j;
      });
    });
  }

  function conServidor() {
    return servidor.activo && servidor.escritura;
  }

  /**
   * Averigua si detrás de la página hay un servidor local que pueda escribir.
   * Guarda también el motivo cuando no lo hay: el panel del tutor lo explica
   * en lugar de limitarse a decir "solo este navegador".
   */
  /** ¿Es la copia publicada en internet? La semilla lo marca al generarse. */
  function esPublicado() {
    var meta = (global.PD_DATOS && global.PD_DATOS.meta) || {};
    return !!meta.publicado;
  }

  function consultarServidor() {
    if (esPublicado()) {
      // Sitio subido a un hosting: no hay API que consultar, no se pide.
      servidor.activo = false;
      servidor.motivo = 'publicado';
      return Promise.resolve(false);
    }
    if (!global.fetch || global.location.protocol === 'file:') {
      servidor.activo = false;
      servidor.motivo = 'archivo';
      return Promise.resolve(false);
    }
    return pedir('api/estado').then(function (j) {
      servidor.activo = true;
      servidor.version = Number(j.version) || 1;
      servidor.escritura = !!j.escritura;
      servidor.respaldos = j.respaldos || [];
      servidor.carpeta = j.carpeta || '';
      servidor.hayBase = !!j.base;
      servidor.motivo = servidor.escritura ? '' : 'solo-lectura';
      return true;
    }).catch(function (e) {
      servidor.activo = false;
      servidor.escritura = false;
      // 404 = hay un servidor, pero es una versión anterior sin API de guardado.
      servidor.motivo = /404/.test(e.message) ? 'antiguo' : 'sin-respuesta';
      servidor.detalle = e.message;
      return false;
    });
  }

  /** Frase lista para mostrar cuando no se puede guardar en la carpeta. */
  function motivoTexto() {
    var m = servidor.motivo;
    if (!m) return '';
    if (m === 'publicado') {
      return 'Esta es la copia publicada del sitio: no tiene servidor de guardado. ' +
        'Lo que cambies aquí queda solo en este navegador; la base oficial es la de ' +
        'tu computador. Para actualizar lo publicado, vuelve a ejecutar «Publicar sitio.bat».';
    }
    if (m === 'archivo') {
      return 'Abriste el sitio como archivo (file://). Para guardar en la carpeta, ' +
        'ciérralo y usa «Abrir portal.bat».';
    }
    if (m === 'antiguo') {
      return 'Está respondiendo una versión anterior del servidor. Cierra todas las ventanas ' +
        'negras del portal y vuelve a ejecutar «Abrir portal.bat».';
    }
    if (m === 'solo-lectura') {
      return 'El servidor se inició con --red sin --permitir-escritura, así que nadie ' +
        'puede modificar la base desde la red.';
    }
    return 'El servidor local no respondió (' + (servidor.detalle || 'sin detalle') + '). ' +
      'Cierra las ventanas negras del portal y vuelve a ejecutar «Abrir portal.bat».';
  }

  function cargar() {
    return consultarServidor().then(function () {
      if (servidor.activo && servidor.hayBase) {
        return pedir('api/base').then(function (j) { return sanear(j.base); })
          .catch(function () { return null; });
      }
      return null;
    }).then(function (deServidor) {
      if (deServidor) { estado = deServidor; return estado; }

      var local = PD.almacen.get(CLAVE_LOCAL, null);
      if (local && local.estudiantes) { estado = sanear(local); return estado; }

      // Sin base propia: se parte de la semilla exportada del Panel del Maestro.
      return PD.datos.semilla().then(function (paquete) {
        estado = sanear(desdePaquete(paquete));
        return estado;
      }).catch(function () {
        estado = baseVacia();
        return estado;
      });
    }).then(function () {
      aplicar();
      return estado;
    });
  }

  /** Rellena lo que falte para que la base sea utilizable pase lo que pase. */
  function sanear(base) {
    var semilla = PD.datos.semillaFija();
    var b = base && typeof base === 'object' ? base : {};
    b.version = VERSION;
    b.institucion = Object.assign(institucionVacia(), b.institucion || {});
    b.grados = Array.isArray(b.grados) ? b.grados : [];
    b.grupos = Array.isArray(b.grupos) ? b.grupos : [];
    b.estudiantes = Array.isArray(b.estudiantes) ? b.estudiantes : [];
    b.enlaces = Object.assign(
      { recursos: '', examenes: '', ejes: '', gamificacion: '' }, b.enlaces || {});
    b.misiones = (Array.isArray(b.misiones) && b.misiones.length) ? b.misiones.map(limpiarMision) : semilla.misiones;
    b.periodos = (Array.isArray(b.periodos) && b.periodos.length) ? b.periodos : semilla.periodos;
    b.dragones = (Array.isArray(b.dragones) && b.dragones.length) ? b.dragones : semilla.dragones;
    if (b.mostrarNombres === undefined) b.mostrarNombres = true;
    b.estudiantes.forEach(function (e) {
      e.registros = Array.isArray(e.registros) ? e.registros.map(limpiarRegistro) : [];
      e.genero = generoNormal(e.genero);
      e.activo = e.activo === 0 ? 0 : 1;
    });
    return b;
  }

  /* ======================================================================== */
  /* Guardado                                                                 */
  /* ======================================================================== */
  function marcar(texto_estado) {
    document.dispatchEvent(new CustomEvent('pd:guardado', { detail: { estado: texto_estado } }));
  }

  /** Guardado automático: junta los cambios seguidos en una sola escritura. */
  function guardar(motivo) {
    if (!estado) return;
    estado.actualizado = ahora();
    PD.almacen.set(CLAVE_LOCAL, estado);
    aplicar();
    marcar('guardando');
    if (temporizador) global.clearTimeout(temporizador);
    temporizador = global.setTimeout(function () { guardarYa(motivo); }, 700);
  }

  function guardarYa() {
    if (!estado) return Promise.resolve(false);
    PD.almacen.set(CLAVE_LOCAL, estado);
    if (!conServidor()) { marcar('local'); return Promise.resolve(false); }
    if (guardando) { pendiente = true; return Promise.resolve(false); }
    guardando = true;
    return pedir('api/base', { metodo: 'POST', cuerpo: { base: estado } })
      .then(function () {
        marcar('servidor');
        return true;
      })
      .catch(function (e) {
        marcar('error');
        if (global.console) console.warn('No se pudo guardar en el servidor:', e.message);
        return false;
      })
      .then(function (ok) {
        guardando = false;
        if (pendiente) { pendiente = false; return guardarYa(); }
        return ok;
      });
  }

  /* ======================================================================== */
  /* Paquete para el panel del estudiante                                     */
  /* ======================================================================== */
  function grado(id) {
    var salida = null;
    (estado.grados || []).forEach(function (g) { if (g.id === id) salida = g; });
    return salida;
  }

  function grupo(id) {
    var salida = null;
    (estado.grupos || []).forEach(function (g) { if (g.id === id) salida = g; });
    return salida;
  }

  function paquete() {
    var b = estado;
    var porId = {};
    (b.periodos || []).forEach(function (p) { porId[p.id] = p; });

    return {
      meta: {
        institucion: b.institucion.nombre,
        sede: b.institucion.sede,
        jornada: b.institucion.jornada,
        anio: b.institucion.anio,
        docente: b.institucion.docente,
        generado: b.actualizado,
        totalMisiones: b.misiones.length || 24,
        misionesPorPeriodo: Math.round((b.misiones.length || 24) / 4),
        gemasMeta: 2040,
        factorRecurso: 10,
        demo: false,
        ejemplo: b.origen === 'ejemplo',
        mostrarNombres: b.mostrarNombres !== false,
        enlaces: b.enlaces || {}
      },
      periodos: b.periodos,
      dragones: b.dragones,
      misiones: b.misiones.map(function (m) {
        var p = porId[m.periodo_id] || {};
        return Object.assign({}, m, {
          elemento: p.elemento || '',
          periodo_color: p.color || '#d4af37',
          periodo_emoji: p.emoji || ''
        });
      }),
      grados: b.grados,
      grupos: b.grupos,
      recursos: PD.datos.semillaFija().recursos,
      estudiantes: b.estudiantes.filter(function (e) { return e.activo !== 0; }).map(function (e) {
        var g = grado(e.grado_id), gr = grupo(e.grupo_id);
        return {
          id: e.id, codigo: e.codigo, nombres: e.nombres, apellidos: e.apellidos,
          genero: e.genero, dragon: e.dragon, notas: e.notas, activo: e.activo,
          grado_id: e.grado_id, grado_nombre: g ? g.nombre : '', grado_orden: g ? g.orden : 0,
          grupo_id: e.grupo_id, grupo_nombre: gr ? gr.nombre : '',
          grupo_anio: b.institucion.anio, grupo_docente: b.institucion.docente,
          registros: e.registros
        };
      })
    };
  }

  /** Reindexa los datos del portal y borra la caché de cálculo. */
  function aplicar() {
    if (!estado) return;
    PD.datos.usar(paquete());
    PD.motor.limpiarCache();
    document.dispatchEvent(new CustomEvent('pd:base'));
  }

  /* ======================================================================== */
  /* Operaciones del tutor                                                    */
  /* ======================================================================== */
  var ORDINALES = {
    primero: 1, primera: 1, segundo: 2, tercero: 3, tercera: 3, cuarto: 4, quinto: 5,
    sexto: 6, septimo: 7, octavo: 8, noveno: 9, decimo: 10, once: 11, undecimo: 11,
    doce: 12, duodecimo: 12, transicion: 0, preescolar: 0
  };

  /** "Sexto" -> 6, "601" -> 6, "10°" -> 10. Sirve para ordenar y para el código. */
  function ordenDeGrado(nombre) {
    var limpio = PD.normal(nombre);
    if (ORDINALES[limpio] !== undefined) return ORDINALES[limpio];
    var palabras = limpio.split(' ');
    for (var i = 0; i < palabras.length; i++) {
      if (ORDINALES[palabras[i]] !== undefined) return ORDINALES[palabras[i]];
    }
    var numero = limpio.match(/\d+/);
    if (numero) {
      var n = parseInt(numero[0], 10);
      return n > 13 ? Math.floor(n / 100) : n;      // 601 -> 6
    }
    return 0;
  }

  function obtenerGrado(nombre) {
    var limpio = texto(nombre, 60);
    if (!limpio) return null;
    var encontrado = null;
    estado.grados.forEach(function (g) {
      if (PD.normal(g.nombre) === PD.normal(limpio)) encontrado = g;
    });
    if (encontrado) return encontrado;
    var nuevo = {
      id: proximoId(estado.grados),
      nombre: limpio,
      orden: ordenDeGrado(limpio) || (estado.grados.length + 1)
    };
    estado.grados.push(nuevo);
    return nuevo;
  }

  function obtenerGrupo(gradoId, nombre) {
    var limpio = texto(nombre, 40) || 'A';
    if (!gradoId) return null;
    var encontrado = null;
    estado.grupos.forEach(function (g) {
      if (g.grado_id === gradoId && PD.normal(g.nombre) === PD.normal(limpio)) encontrado = g;
    });
    if (encontrado) return encontrado;
    var nuevo = { id: proximoId(estado.grupos), grado_id: gradoId, nombre: limpio };
    estado.grupos.push(nuevo);
    return nuevo;
  }

  function estudiante(id) {
    var salida = null;
    estado.estudiantes.forEach(function (e) { if (e.id === Number(id)) salida = e; });
    return salida;
  }

  /**
   * Código automático. Si el grupo ya trae números (301, 502…) se usa tal cual
   * —DRG-301-05—; si es una letra, se antepone el grado —DRG-5A05—.
   */
  function codigoSugerido(gradoId, grupoId) {
    var g = grado(gradoId), gr = grupo(grupoId);
    var nombreGrupo = gr ? String(gr.nombre).replace(/[^0-9A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').toUpperCase() : '';
    var raiz;
    if (/\d/.test(nombreGrupo)) {
      raiz = 'DRG-' + nombreGrupo.slice(0, 4) + '-';
    } else {
      raiz = 'DRG-' + (g ? (g.orden || String(g.nombre).slice(0, 1)) : 'X') + nombreGrupo.slice(0, 2);
    }
    var usados = {};
    estado.estudiantes.forEach(function (e) { usados[PD.codigoClave(e.codigo)] = true; });
    for (var i = 1; i < 999; i++) {
      var intento = raiz + (i < 10 ? '0' : '') + i;
      if (!usados[PD.codigoClave(intento)]) return intento;
    }
    return raiz + Date.now().toString().slice(-4);
  }

  function codigoRepetido(codigo, exceptoId) {
    var clave = PD.codigoClave(codigo);
    if (!clave) return false;
    var repetido = false;
    estado.estudiantes.forEach(function (e) {
      if (e.id !== exceptoId && PD.codigoClave(e.codigo) === clave) repetido = true;
    });
    return repetido;
  }

  function guardarEstudiante(datos) {
    var g = datos.grado_nombre ? obtenerGrado(datos.grado_nombre) : grado(datos.grado_id);
    var gr = g ? (datos.grupo_nombre ? obtenerGrupo(g.id, datos.grupo_nombre) : grupo(datos.grupo_id)) : null;
    var e = datos.id ? estudiante(datos.id) : null;
    var nuevo = !e;
    if (!e) {
      e = { id: proximoId(estado.estudiantes), registros: [] };
      estado.estudiantes.push(e);
    }
    e.nombres = texto(datos.nombres, 80);
    e.apellidos = texto(datos.apellidos, 80);
    e.genero = generoNormal(datos.genero);
    e.grado_id = g ? g.id : null;
    e.grupo_id = gr ? gr.id : null;
    e.notas = texto(datos.notas, 400);
    e.activo = datos.activo === 0 ? 0 : 1;
    if (datos.dragon !== undefined) e.dragon = texto(datos.dragon, 30);

    var codigo = texto(datos.codigo, 40);
    if (!codigo) codigo = codigoSugerido(e.grado_id, e.grupo_id);
    if (codigoRepetido(codigo, e.id)) {
      if (nuevo) estado.estudiantes.pop();
      throw new Error('El código "' + codigo + '" ya pertenece a otro estudiante.');
    }
    e.codigo = codigo;
    guardar('estudiante');
    return e;
  }

  function eliminarEstudiante(id) {
    estado.estudiantes = estado.estudiantes.filter(function (e) { return e.id !== Number(id); });
    guardar('eliminar');
  }

  function alternarActivo(id) {
    var e = estudiante(id);
    if (!e) return;
    e.activo = e.activo === 0 ? 1 : 0;
    guardar('activo');
    return e;
  }

  /** Guarda las cuatro notas de una misión para un estudiante. */
  function guardarRegistro(estudianteId, misionId, notas) {
    var e = estudiante(estudianteId);
    if (!e) return null;
    var reg = null;
    e.registros.forEach(function (r) { if (Number(r.mision_id) === Number(misionId)) reg = r; });
    var vacio = ['nota_taller', 'nota_actividad', 'nota_bitacora1', 'nota_bitacora2']
      .every(function (c) { return PD.motor.normalizarNota(notas[c]) === null; });

    if (!reg) {
      if (vacio && !texto(notas.observaciones)) return null;
      reg = { mision_id: Number(misionId), fecha: new Date().toISOString().slice(0, 10) };
      e.registros.push(reg);
    }
    ['nota_taller', 'nota_actividad', 'nota_bitacora1', 'nota_bitacora2'].forEach(function (c) {
      reg[c] = PD.motor.normalizarNota(notas[c]);
    });
    reg.observaciones = texto(notas.observaciones, 400);
    if (notas.fecha) reg.fecha = texto(notas.fecha, 20);

    // Una misión sin ninguna nota ni observación se retira del registro.
    if (vacio && !reg.observaciones) {
      e.registros = e.registros.filter(function (r) { return Number(r.mision_id) !== Number(misionId); });
    }
    e.registros.sort(function (a, b) { return a.mision_id - b.mision_id; });
    guardar('nota');
    return reg;
  }

  function guardarMision(datos) {
    var m = null;
    estado.misiones.forEach(function (x) { if (Number(x.id) === Number(datos.id)) m = x; });
    if (!m) return null;
    m.titulo = texto(datos.titulo, 120) || m.titulo;
    m.tema = texto(datos.tema, 120);
    m.descripcion = texto(datos.descripcion, 400);
    guardar('mision');
    return m;
  }

  function guardarInstitucion(datos) {
    estado.institucion = {
      nombre: texto(datos.nombre, 120),
      sede: texto(datos.sede, 120),
      jornada: texto(datos.jornada, 60),
      docente: texto(datos.docente, 120),
      anio: texto(datos.anio, 10)
    };
    if (datos.mostrarNombres !== undefined) estado.mostrarNombres = !!datos.mostrarNombres;
    if (datos.enlaces) {
      estado.enlaces = {
        recursos: enlaceSeguro(datos.enlaces.recursos),
        examenes: enlaceSeguro(datos.enlaces.examenes),
        ejes: enlaceSeguro(datos.enlaces.ejes),
        gamificacion: enlaceSeguro(datos.enlaces.gamificacion)
      };
    }
    guardar('institucion');
  }

  /** Solo se aceptan enlaces http(s): nada de javascript: ni data:. */
  function enlaceSeguro(valor) {
    var limpio = texto(valor, 300);
    if (!limpio) return '';
    if (/^https?:\/\//i.test(limpio)) return limpio;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(limpio)) return 'https://' + limpio;
    return '';
  }

  /* ======================================================================== */
  /* Importación de listados                                                  */
  /* ======================================================================== */
  var CABECERAS = {
    nombre_completo: ['nombre completo', 'nombre del estudiante', 'estudiante', 'nombre',
      'nombres y apellidos', 'apellidos y nombres', 'nombre y apellidos'],
    apellidos: ['apellidos', 'apellido'],
    nombres: ['nombres', 'nombre(s)'],
    grado: ['grado', 'curso', 'nivel'],
    grupo: ['grupo', 'seccion', 'sección', 'salon', 'salón', 'letra'],
    genero: ['genero', 'género', 'sexo'],
    codigo: ['codigo', 'código', 'documento', 'identificacion', 'identificación',
      'cedula', 'cédula', 'id', 'tarjeta', 'ti']
  };

  function mapaCabeceras(fila) {
    var mapa = {};
    var limpias = fila.map(function (c) { return PD.normal(c); });
    Object.keys(CABECERAS).forEach(function (campo) {
      limpias.forEach(function (celda, i) {
        if (mapa[campo] !== undefined) return;
        if (CABECERAS[campo].indexOf(celda) >= 0) mapa[campo] = i;
      });
    });
    if (mapa.apellidos !== undefined && mapa.nombres !== undefined) delete mapa.nombre_completo;
    return mapa;
  }

  /**
   * Importa filas (matriz de celdas) leídas de Excel, CSV o texto pegado.
   * Devuelve un resumen: creados, actualizados, omitidos y avisos.
   */
  function importarFilas(filas, opciones) {
    var o = opciones || {};
    var limpias = (filas || []).filter(function (f) {
      return f && f.some(function (c) { return texto(c) !== ''; });
    });
    if (!limpias.length) throw new Error('El archivo no tiene filas con datos.');

    var mapa = mapaCabeceras(limpias[0]);
    var conCabecera = Object.keys(mapa).length >= 2;
    if (!conCabecera) {
      // Sin encabezado reconocible: se asume el orden pedido en el manual.
      mapa = { nombre_completo: 0, grado: 1, grupo: 2, genero: 3, codigo: 4 };
    }
    var cuerpo = conCabecera ? limpias.slice(1) : limpias;

    var resumen = { creados: 0, actualizados: 0, omitidos: 0, avisos: [] };
    cuerpo.forEach(function (fila, indice) {
      function celda(campo) {
        var i = mapa[campo];
        return i === undefined ? '' : texto(fila[i], 160);
      }
      var apellidos = celda('apellidos');
      var nombres = celda('nombres');
      if (!apellidos && !nombres) {
        var partes = partirNombre(celda('nombre_completo'), o.orden);
        apellidos = partes[0];
        nombres = partes[1];
      }
      if (!nombres && !apellidos) { resumen.omitidos++; return; }

      var codigo = celda('codigo');
      var gradoNombre = celda('grado') || o.grado || '';
      var grupoNombre = celda('grupo') || o.grupo || '';
      var existente = null;
      if (codigo) {
        var clave = PD.codigoClave(codigo);
        estado.estudiantes.forEach(function (e) {
          if (PD.codigoClave(e.codigo) === clave) existente = e;
        });
      }
      try {
        guardarEstudiante({
          id: existente ? existente.id : null,
          codigo: codigo,
          nombres: nombres,
          apellidos: apellidos,
          genero: celda('genero'),
          grado_nombre: gradoNombre,
          grupo_nombre: grupoNombre,
          activo: 1
        });
        if (existente) resumen.actualizados++; else resumen.creados++;
      } catch (e) {
        resumen.omitidos++;
        resumen.avisos.push('Fila ' + (indice + 1 + (conCabecera ? 1 : 0)) + ': ' + e.message);
      }
    });
    guardar('importacion');
    return resumen;
  }

  /* ======================================================================== */
  /* Respaldos                                                                */
  /* ======================================================================== */
  function listarRespaldos() {
    if (!servidor.activo) return Promise.resolve([]);
    return pedir('api/respaldos').then(function (j) {
      servidor.respaldos = j.respaldos || [];
      return servidor.respaldos;
    }).catch(function () { return []; });
  }

  function crearRespaldo(etiqueta) {
    if (!conServidor()) return Promise.reject(new Error('sin-servidor'));
    return guardarYa().then(function () {
      return pedir('api/respaldo', { metodo: 'POST', cuerpo: { etiqueta: etiqueta || '' } });
    }).then(function (j) {
      servidor.respaldos = j.respaldos || servidor.respaldos;
      return j.nombre;
    });
  }

  function restaurar(nombre) {
    if (!conServidor()) return Promise.reject(new Error('sin-servidor'));
    return pedir('api/restaurar', { metodo: 'POST', cuerpo: { nombre: nombre } })
      .then(function (j) {
        estado = sanear(j.base);
        PD.almacen.set(CLAVE_LOCAL, estado);
        aplicar();
        return estado;
      });
  }

  function borrarRespaldo(nombre) {
    if (!conServidor()) return Promise.reject(new Error('sin-servidor'));
    return pedir('api/borrar-respaldo', { metodo: 'POST', cuerpo: { nombre: nombre } })
      .then(function (j) {
        servidor.respaldos = j.respaldos || [];
        return servidor.respaldos;
      });
  }

  /** Copia de seguridad manual: descarga la base como archivo .json. */
  function descargarCopia() {
    var nombre = 'academia-dragones-' + new Date().toISOString().slice(0, 10) + '.json';
    var ok = PD.descargar(nombre, JSON.stringify(estado, null, 1), 'application/json');
    return ok ? nombre : null;
  }

  /**
   * Vuelve a construir la base desde data/datos.js (lo que exporta el Panel
   * del Maestro de escritorio). Reemplaza estudiantes y notas actuales.
   */
  function reimportarSemilla() {
    return PD.datos.semilla().then(function (paquete) {
      var institucion = estado ? estado.institucion : null;
      var enlaces = estado ? estado.enlaces : null;
      estado = sanear(desdePaquete(paquete));
      // Los datos del colegio y los enlaces los escribió el tutor: se respetan.
      if (institucion && institucion.nombre) estado.institucion = institucion;
      if (enlaces) estado.enlaces = enlaces;
      guardar('semilla');
      return estado;
    });
  }

  /** Restaura desde un archivo .json elegido por el tutor. */
  function importarCopia(textoJson) {
    var datos = JSON.parse(textoJson);
    if (!datos || !Array.isArray(datos.estudiantes)) {
      throw new Error('El archivo no parece una copia de la Academia.');
    }
    estado = sanear(datos);
    guardar('restauracion');
    return estado;
  }

  /* ======================================================================== */
  PD.base = {
    GENEROS: GENEROS,
    cargar: cargar,
    guardar: guardar,
    guardarYa: guardarYa,
    aplicar: aplicar,
    paquete: paquete,
    servidor: servidor,
    conServidor: conServidor,
    consultarServidor: consultarServidor,
    motivoTexto: motivoTexto,

    get estado() { return estado; },
    grado: grado,
    grupo: grupo,
    estudiante: estudiante,
    obtenerGrado: obtenerGrado,
    obtenerGrupo: obtenerGrupo,
    ordenDeGrado: ordenDeGrado,
    codigoSugerido: codigoSugerido,
    codigoRepetido: codigoRepetido,
    guardarEstudiante: guardarEstudiante,
    eliminarEstudiante: eliminarEstudiante,
    alternarActivo: alternarActivo,
    guardarRegistro: guardarRegistro,
    guardarMision: guardarMision,
    guardarInstitucion: guardarInstitucion,
    importarFilas: importarFilas,
    partirNombre: partirNombre,
    invertirNombres: invertirNombres,
    limpiarCatalogos: limpiarCatalogos,
    generoNormal: generoNormal,

    listarRespaldos: listarRespaldos,
    crearRespaldo: crearRespaldo,
    restaurar: restaurar,
    borrarRespaldo: borrarRespaldo,
    descargarCopia: descargarCopia,
    importarCopia: importarCopia,
    reimportarSemilla: reimportarSemilla
  };

})(window);
