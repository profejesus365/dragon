/* ==========================================================================
   tutor.js · Panel del Tutor de Dragones (el maestro)
   Estudiantes, calificaciones, estadísticas, ranking, informes, escarapelas,
   datos institucionales y respaldos. Todo lo que se edita aquí se guarda solo
   (PD.base) y se refleja de inmediato en el panel de los estudiantes.
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var esc = PD.esc;

  var CODIGO_TUTOR = 'profejesus365';

  var COLUMNAS = [
    { columna: 'nota_taller', clave: 'gemas', corto: 'Gema', nombre: 'Taller práctico' },
    { columna: 'nota_actividad', clave: 'cristales', corto: 'Cristal', nombre: 'Actividad gamificada' },
    { columna: 'nota_bitacora1', clave: 'runas', corto: 'Runa', nombre: 'Bitácora 1' },
    { columna: 'nota_bitacora2', clave: 'lazos', corto: 'Lazo', nombre: 'Bitácora 2' }
  ];

  var ESCALA = [
    { clave: 'superior', etiqueta: 'SUPERIOR', rango: '9,0 a 10,0' },
    { clave: 'alto', etiqueta: 'ALTO', rango: '8,0 a 8,9' },
    { clave: 'basico', etiqueta: 'BÁSICO', rango: '7,0 a 7,9' },
    { clave: 'bajo', etiqueta: 'BAJO', rango: '0,0 a 6,9' }
  ];

  var estado = {
    vista: 'panel',
    periodo: 0,
    filtros: { grado_id: 0, grupo_id: 0, genero: '', q: '', estado: 'activos' },
    mision_id: 1,
    modoNotas: 'mision',        // mision | estudiante
    estudianteNotas: 0,
    metrica: 'promedio',
    boletin: { estudiante_id: 0 },
    escarapelas: { reverso: false, tamano: 'cr80' }
  };

  /* ======================================================================== */
  /* Utilidades                                                               */
  /* ======================================================================== */
  function base() { return PD.base.estado; }
  function Pz() { return PD.piezas; }

  function nombreCompleto(e) {
    return ((e.apellidos || '') + ' ' + (e.nombres || '')).trim() || '(sin nombre)';
  }

  function nombreGrado(id) {
    var g = PD.base.grado(id);
    return g ? g.nombre : '—';
  }

  function nombreGrupo(id) {
    var g = PD.base.grupo(id);
    return g ? g.nombre : '—';
  }

  function curso(e) {
    var g = PD.base.grado(e.grado_id), gr = PD.base.grupo(e.grupo_id);
    return ((g ? g.nombre : '') + ' ' + (gr ? gr.nombre : '')).trim() || 'Sin curso';
  }

  /** Perfil calculado (solo existe para estudiantes activos). */
  function perfil(e) {
    var enPaquete = PD.datos.porId(e.id);
    return enPaquete ? PD.motor.perfil(enPaquete, { periodo: estado.periodo }) : null;
  }

  function estudiantesFiltrados(opciones) {
    var o = opciones || {};
    var f = estado.filtros;
    var q = PD.normal(f.q);
    return base().estudiantes.filter(function (e) {
      if (f.grado_id && e.grado_id !== f.grado_id) return false;
      if (f.grupo_id && e.grupo_id !== f.grupo_id) return false;
      if (f.genero && e.genero !== f.genero) return false;
      if (!o.incluirInactivos) {
        if (f.estado === 'activos' && e.activo === 0) return false;
        if (f.estado === 'inactivos' && e.activo !== 0) return false;
      }
      if (q) {
        var texto = PD.normal(nombreCompleto(e) + ' ' + e.codigo + ' ' + curso(e));
        if (texto.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      return nombreCompleto(a).localeCompare(nombreCompleto(b), 'es');
    });
  }

  /** Los mismos filtros, pero devolviendo perfiles calculados (solo activos). */
  function perfilesFiltrados() {
    return estudiantesFiltrados().map(perfil).filter(Boolean);
  }

  /* ------------------------------------------------------- Filtros HTML -- */
  /** Cuántos estudiantes hay en cada grado y en cada grupo. */
  function conteos() {
    var porGrado = {}, porGrupo = {};
    base().estudiantes.forEach(function (e) {
      porGrado[e.grado_id] = (porGrado[e.grado_id] || 0) + 1;
      porGrupo[e.grupo_id] = (porGrupo[e.grupo_id] || 0) + 1;
    });
    return { grado: porGrado, grupo: porGrupo };
  }

  /** Grados que tienen estudiantes (los vacíos no ensucian los filtros). */
  function gradosConEstudiantes(incluirId) {
    var c = conteos().grado;
    return base().grados.filter(function (g) {
      return c[g.id] || Number(incluirId) === g.id;
    }).sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
  }

  function gruposConEstudiantes(gradoId, incluirId) {
    var c = conteos().grupo;
    return base().grupos.filter(function (g) {
      if (gradoId && g.grado_id !== Number(gradoId)) return false;
      return c[g.id] || Number(incluirId) === g.id;
    });
  }

  function selectorGrados(valor, accion) {
    var lista = gradosConEstudiantes(valor);
    var c = conteos().grado;
    var opciones = ['<option value="0">' +
      (lista.length ? 'Todos los grados' : 'Sin grados registrados') + '</option>'];
    lista.forEach(function (g) {
      opciones.push('<option value="' + g.id + '"' + (Number(valor) === g.id ? ' selected' : '') +
        '>' + esc(g.nombre) + ' (' + (c[g.id] || 0) + ')</option>');
    });
    return '<label class="filtro"><span>Grado</span><select class="control" data-accion="' +
      accion + '">' + opciones.join('') + '</select></label>';
  }

  function selectorGrupos(gradoId, valor, accion) {
    var lista = gruposConEstudiantes(gradoId, valor);
    var c = conteos().grupo;
    var opciones = ['<option value="0">' +
      (lista.length ? 'Todos los grupos' : 'Sin grupos registrados') + '</option>'];
    lista.forEach(function (g) {
      opciones.push('<option value="' + g.id + '"' + (Number(valor) === g.id ? ' selected' : '') +
        '>' + esc(nombreGrado(g.grado_id) + ' ' + g.nombre) + ' (' + (c[g.id] || 0) + ')</option>');
    });
    return '<label class="filtro"><span>Grupo</span><select class="control" data-accion="' +
      accion + '">' + opciones.join('') + '</select></label>';
  }

  function selectorPeriodos(valor, accion, etiqueta) {
    var opciones = ['<option value="0">' + (etiqueta || 'Todo el año') + '</option>'];
    base().periodos.forEach(function (p) {
      opciones.push('<option value="' + p.id + '"' + (Number(valor) === p.id ? ' selected' : '') +
        '>' + esc(p.nombre + ' · ' + p.elemento) + '</option>');
    });
    return '<label class="filtro"><span>Periodo</span><select class="control" data-accion="' +
      accion + '">' + opciones.join('') + '</select></label>';
  }

  function selectorGenero(valor, accion) {
    var opciones = ['<option value="">Todos</option>'];
    Object.keys(PD.base.GENEROS).forEach(function (k) {
      opciones.push('<option value="' + k + '"' + (valor === k ? ' selected' : '') + '>' +
        esc(PD.base.GENEROS[k]) + '</option>');
    });
    return '<label class="filtro"><span>Género</span><select class="control" data-accion="' +
      accion + '">' + opciones.join('') + '</select></label>';
  }

  function filtrosComunes(opciones) {
    var o = opciones || {};
    var f = estado.filtros;
    return '<div class="filtros">' +
      selectorGrados(f.grado_id, 'f-grado') +
      selectorGrupos(f.grado_id, f.grupo_id, 'f-grupo') +
      (o.genero === false ? '' : selectorGenero(f.genero, 'f-genero')) +
      (o.periodo ? selectorPeriodos(estado.periodo, 'f-periodo') : '') +
      (o.estado === false ? '' :
        '<label class="filtro"><span>Estado</span><select class="control" data-accion="f-estado">' +
        ['activos', 'inactivos', 'todos'].map(function (v) {
          return '<option value="' + v + '"' + (f.estado === v ? ' selected' : '') + '>' +
            (v === 'activos' ? 'Activos' : v === 'inactivos' ? 'Retirados' : 'Todos') + '</option>';
        }).join('') + '</select></label>') +
      (o.buscar === false ? '' :
        '<label class="filtro"><span>Buscar</span><input class="control" type="search" ' +
        'placeholder="Nombre o código…" data-accion="f-buscar" value="' + esc(f.q) + '"></label>') +
      '</div>';
  }

  /** Conecta los filtros comunes con el estado y vuelve a pintar. */
  function enlazarFiltros() {
    function cambiar(sel, fn) {
      var el = PD.$(sel);
      if (el) el.addEventListener('change', function () { fn(el.value); pintar(); });
    }
    cambiar('[data-accion="f-grado"]', function (v) {
      estado.filtros.grado_id = parseInt(v, 10) || 0;
      estado.filtros.grupo_id = 0;
    });
    cambiar('[data-accion="f-grupo"]', function (v) { estado.filtros.grupo_id = parseInt(v, 10) || 0; });
    cambiar('[data-accion="f-genero"]', function (v) { estado.filtros.genero = v; });
    cambiar('[data-accion="f-estado"]', function (v) { estado.filtros.estado = v; });
    cambiar('[data-accion="f-periodo"]', function (v) {
      estado.periodo = parseInt(v, 10) || 0;
      PD.motor.limpiarCache();
    });
    var buscar = PD.$('[data-accion="f-buscar"]');
    if (buscar) {
      buscar.addEventListener('input', PD.debounce(function () {
        estado.filtros.q = buscar.value;
        pintar({ mantenerFoco: '[data-accion="f-buscar"]' });
      }, 260));
    }
  }

  /* ======================================================================== */
  /* 1. Panel                                                                 */
  /* ======================================================================== */
  var vistaPanel = {
    titulo: 'Panel',
    subtitulo: function () {
      var b = base();
      return (b.institucion.nombre || 'Sin institución configurada') +
        (b.institucion.sede ? ' · ' + b.institucion.sede : '') + ' · ' + b.institucion.anio;
    },
    html: function () {
      var b = base();
      var perfiles = base().estudiantes.filter(function (e) { return e.activo !== 0; })
        .map(perfil).filter(Boolean);
      var resumen = PD.motor.resumenGrupo(PD.datos.estudiantes(), { periodo: estado.periodo });
      var registros = perfiles.reduce(function (s, p) { return s + p.progreso.misiones_registradas; }, 0);
      var dragones = perfiles.reduce(function (s, p) { return s + p.dragones.desbloqueados; }, 0);
      var sinCodigo = b.estudiantes.filter(function (e) { return !String(e.codigo || '').trim(); }).length;

      var kpis = '<div class="rejilla-kpi">' +
        Pz().kpi({ icono: 'fa-users', etiqueta: 'Estudiantes activos', valor: perfiles.length, acento: 'var(--cian)', pie: b.estudiantes.length + ' en total' }) +
        Pz().kpi({ icono: 'fa-layer-group', etiqueta: 'Grupos', valor: gruposConEstudiantes(0).length,
          acento: 'var(--violeta)', pie: gradosConEstudiantes(0).length + ' grados con estudiantes' }) +
        Pz().kpi({ icono: 'fa-star', etiqueta: 'Promedio general', valor: resumen.promedio, decimales: 2, acento: 'var(--oro)', pie: resumen.nivel.etiqueta }) +
        Pz().kpi({ icono: 'fa-scroll', etiqueta: 'Misiones registradas', valor: registros, acento: 'var(--lazos)', pie: 'de ' + (perfiles.length * 24) + ' posibles' }) +
        Pz().kpi({ icono: 'fa-dragon', etiqueta: 'Dragones despertados', valor: dragones, acento: 'var(--runas)', pie: 'promedio ' + PD.fmt.numero(resumen.dragonesMedios, 1) + ' por guardián' }) +
        '</div>';

      var avisos = '';
      if (sinCodigo) {
        avisos += '<div class="aviso-linea"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' +
          '<div><strong>' + sinCodigo + ' estudiante(s) sin código.</strong> No podrán entrar al portal. ' +
          'Ábrelos en <a class="enlace" href="#/tutor/estudiantes">Estudiantes</a> y usa el botón ' +
          '«Generar códigos faltantes».</div></div>';
      }
      if (!b.estudiantes.length) {
        avisos += '<div class="aviso-linea"><i class="fa-solid fa-circle-info" aria-hidden="true"></i>' +
          '<div>Todavía no hay estudiantes. Créalos uno a uno o importa el listado desde Excel en ' +
          '<a class="enlace" href="#/tutor/estudiantes">Estudiantes</a>.</div></div>';
      }

      var graficas = '<div class="rejilla rejilla-2">' +
        Pz().tarjeta({
          titulo: 'Desempeño del colegio', icono: 'fa-chart-pie',
          sub: 'estudiantes por nivel',
          cuerpo: '<div class="lienzo-envoltorio" id="t-niveles"></div>'
        }) +
        Pz().tarjeta({
          titulo: 'Promedio por periodo', icono: 'fa-chart-column',
          sub: 'todos los grupos',
          cuerpo: '<div class="lienzo-envoltorio" id="t-periodos"></div>'
        }) +
        '</div>';

      var grupos = gruposConEstudiantes(0).map(function (g) {
        var lista = PD.datos.estudiantes().filter(function (e) { return e.grupo_id === g.id; });
        var r = PD.motor.resumenGrupo(lista, { periodo: estado.periodo });
        return {
          nombre: nombreGrado(g.grado_id) + ' ' + g.nombre,
          estudiantes: r.estudiantes,
          promedio: r.promedio,
          nivel: r.nivel,
          misiones: r.misionesMedias,
          dragones: r.dragonesMedios
        };
      }).sort(function (a, b2) { return (b2.promedio || -1) - (a.promedio || -1); });

      var tabla = Pz().tarjeta({
        titulo: 'Resumen por grupo', icono: 'fa-table-list',
        acciones: '<button type="button" class="boton boton-mini" data-accion="excel-resumen">' +
          '<i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Excel</span></button>',
        cuerpo: grupos.length
          ? '<div class="tabla-envoltorio"><table class="tabla"><thead><tr>' +
            '<th>Grupo</th><th class="num">Estudiantes</th><th class="num">Promedio</th>' +
            '<th>Nivel</th><th class="num">Misiones (prom.)</th><th class="num">Dragones (prom.)</th>' +
            '</tr></thead><tbody>' + grupos.map(function (g) {
              return '<tr><td>' + esc(g.nombre) + '</td>' +
                '<td class="num">' + g.estudiantes + '</td>' +
                '<td class="num">' + PD.fmt.nota(g.promedio) + '</td>' +
                '<td>' + Pz().marcaNivel(g.nivel) + '</td>' +
                '<td class="num">' + PD.fmt.numero(g.misiones, 1) + '</td>' +
                '<td class="num">' + PD.fmt.numero(g.dragones, 1) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : Pz().vacio('Aún no hay grupos creados.', 'fa-layer-group')
      });

      var accesos = Pz().tarjeta({
        titulo: 'Accesos rápidos', icono: 'fa-bolt',
        cuerpo: '<div class="tarjeta-acciones">' +
          '<a class="boton boton-mini" href="#/tutor/estudiantes"><i class="fa-solid fa-user-plus" aria-hidden="true"></i><span>Agregar estudiantes</span></a>' +
          '<a class="boton boton-mini" href="#/tutor/calificaciones"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i><span>Registrar notas</span></a>' +
          '<a class="boton boton-mini" href="#/tutor/boletines"><i class="fa-solid fa-scroll" aria-hidden="true"></i><span>Generar boletines</span></a>' +
          '<a class="boton boton-mini" href="#/tutor/escarapelas"><i class="fa-solid fa-address-card" aria-hidden="true"></i><span>Imprimir escarapelas</span></a>' +
          '<a class="boton boton-mini boton-fantasma" href="#/tutor/respaldos"><i class="fa-solid fa-database" aria-hidden="true"></i><span>Hacer respaldo</span></a>' +
          '</div>'
      });

      return avisos + kpis + graficas + tabla + accesos;
    },
    luego: function () {
      var pal = PD.graficas.paleta();
      var resumen = PD.motor.resumenGrupo(PD.datos.estudiantes(), { periodo: estado.periodo });

      PD.graficas.dona(PD.$('#t-niveles'), {
        etiquetas: ['Superior', 'Alto', 'Básico', 'Bajo', 'Sin datos'],
        datos: ['superior', 'alto', 'basico', 'bajo', 'sin-datos'].map(function (n) {
          return resumen.niveles[n] || 0;
        }),
        colores: [PD.graficas.color('--superior'), PD.graficas.color('--alto'),
          PD.graficas.color('--basico'), PD.graficas.color('--bajo'), pal.rejilla],
        centro: String(resumen.estudiantes),
        centroSub: 'estudiantes'
      });

      PD.graficas.barras(PD.$('#t-periodos'), {
        etiquetas: base().periodos.map(function (p) { return p.nombre; }),
        max: 10,
        leyenda: false,
        series: [{
          nombre: 'Promedio', color: pal.oro,
          datos: [1, 2, 3, 4].map(function (i) { return resumen.periodos[i] || 0; }),
          colores: base().periodos.map(function (p) { return p.color; })
        }]
      });

      var btn = PD.$('[data-accion="excel-resumen"]');
      if (btn) btn.addEventListener('click', exportarResumenExcel);
    }
  };

  function exportarResumenExcel() {
    var filas = [['Grupo', 'Estudiantes', 'Promedio', 'Nivel', 'Misiones promedio', 'Dragones promedio']];
    gruposConEstudiantes(0).forEach(function (g) {
      var lista = PD.datos.estudiantes().filter(function (e) { return e.grupo_id === g.id; });
      var r = PD.motor.resumenGrupo(lista, { periodo: estado.periodo });
      filas.push([nombreGrado(g.grado_id) + ' ' + g.nombre, r.estudiantes,
        r.promedio, r.nivel.etiqueta, r.misionesMedias, r.dragonesMedios]);
    });
    PD.docs.excel([{ nombre: 'Resumen por grupo', filas: filas }],
      'Resumen-grupos-' + base().institucion.anio + '.xlsx');
  }

  /* ======================================================================== */
  /* 2. Estudiantes                                                           */
  /* ======================================================================== */
  var vistaEstudiantes = {
    titulo: 'Estudiantes',
    subtitulo: function () {
      var todos = base().estudiantes.length;
      return estudiantesFiltrados().length + ' mostrados de ' + todos + ' registrados';
    },
    html: function () {
      var lista = estudiantesFiltrados();
      var filas = lista.map(function (e) {
        var p = perfil(e);
        return '<tr class="' + (e.activo === 0 ? 'inactivo' : '') + '">' +
          '<td class="mono">' + esc(e.codigo || '—') + '</td>' +
          '<td><strong>' + esc(nombreCompleto(e)) + '</strong></td>' +
          '<td><span class="etiqueta-genero ' + esc(e.genero) + '">' + esc(e.genero) + '</span></td>' +
          '<td>' + esc(nombreGrado(e.grado_id)) + '</td>' +
          '<td>' + esc(nombreGrupo(e.grupo_id)) + '</td>' +
          '<td class="num">' + (p ? p.progreso.misiones_registradas : '—') + '</td>' +
          '<td class="num">' + (p ? PD.fmt.nota(p.progreso.promedio) : '—') + '</td>' +
          '<td>' + (p ? Pz().marcaNivel(p.progreso.nivel) : '<span class="pastilla">Retirado</span>') + '</td>' +
          '<td><div class="acciones-fila">' +
          '<button type="button" class="boton-icono" data-editar="' + e.id + '" title="Editar"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>' +
          '<button type="button" class="boton-icono" data-notas="' + e.id + '" title="Ver sus notas"><i class="fa-solid fa-list-check" aria-hidden="true"></i></button>' +
          '<button type="button" class="boton-icono" data-activo="' + e.id + '" title="' +
          (e.activo === 0 ? 'Reactivar' : 'Marcar como retirado') + '"><i class="fa-solid ' +
          (e.activo === 0 ? 'fa-rotate-left' : 'fa-user-slash') + '" aria-hidden="true"></i></button>' +
          '<button type="button" class="boton-icono peligro" data-eliminar="' + e.id + '" title="Eliminar"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
          '</div></td></tr>';
      }).join('');

      var herramientas =
        '<div class="barra-tareas">' + filtrosComunes({ periodo: false }) +
        '<div class="tarjeta-acciones">' +
        '<button type="button" class="boton boton-mini boton-oro" data-accion="nuevo"><i class="fa-solid fa-user-plus" aria-hidden="true"></i><span>Nuevo</span></button>' +
        '<button type="button" class="boton boton-mini" data-accion="importar"><i class="fa-solid fa-file-import" aria-hidden="true"></i><span>Importar</span></button>' +
        '<button type="button" class="boton boton-mini" data-accion="exportar"><i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Exportar</span></button>' +
        '<button type="button" class="boton boton-mini boton-fantasma" data-accion="codigos"><i class="fa-solid fa-key" aria-hidden="true"></i><span>Códigos faltantes</span></button>' +
        '<button type="button" class="boton boton-mini boton-fantasma" data-accion="herramientas"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span>Herramientas</span></button>' +
        '</div></div>';

      return Pz().tarjeta({ cuerpo: herramientas }) +
        Pz().tarjeta({
          titulo: 'Listado', icono: 'fa-users',
          sub: lista.length + ' estudiantes',
          cuerpo: lista.length
            ? '<div class="tabla-envoltorio"><table class="tabla tabla-admin"><thead><tr>' +
              '<th>Código</th><th>Estudiante</th><th>Gén.</th><th>Grado</th><th>Grupo</th>' +
              '<th class="num">Misiones</th><th class="num">Promedio</th><th>Nivel</th><th></th>' +
              '</tr></thead><tbody>' + filas + '</tbody></table></div>'
            : Pz().vacio('Ningún estudiante coincide con los filtros.', 'fa-user-slash')
        });
    },
    luego: function () {
      enlazarFiltros();
      PD.$$('[data-editar]').forEach(function (b) {
        b.addEventListener('click', function () { fichaEstudiante(parseInt(b.getAttribute('data-editar'), 10)); });
      });
      PD.$$('[data-notas]').forEach(function (b) {
        b.addEventListener('click', function () {
          estado.modoNotas = 'estudiante';
          estado.estudianteNotas = parseInt(b.getAttribute('data-notas'), 10);
          global.location.hash = '#/tutor/calificaciones';
        });
      });
      PD.$$('[data-activo]').forEach(function (b) {
        b.addEventListener('click', function () {
          var e = PD.base.alternarActivo(parseInt(b.getAttribute('data-activo'), 10));
          PD.tostada(e && e.activo ? 'Estudiante reactivado.' : 'Estudiante marcado como retirado.', 'ok');
          pintar();
        });
      });
      PD.$$('[data-eliminar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = parseInt(b.getAttribute('data-eliminar'), 10);
          var e = PD.base.estudiante(id);
          if (!e) return;
          confirmar({
            titulo: 'Eliminar estudiante',
            texto: 'Se borrará <strong>' + esc(nombreCompleto(e)) + '</strong> y todas sus notas. ' +
              'Esta acción no se puede deshacer; si solo se retiró del colegio, es mejor marcarlo como retirado.',
            botón: 'Eliminar definitivamente',
            peligro: true
          }).then(function (si) {
            if (!si) return;
            PD.base.eliminarEstudiante(id);
            PD.tostada('Estudiante eliminado.', 'ok');
            pintar();
          });
        });
      });

      atajo('nuevo', function () { fichaEstudiante(null); });
      atajo('importar', dialogoImportar);
      atajo('exportar', exportarEstudiantes);
      atajo('codigos', generarCodigos);
      atajo('herramientas', dialogoHerramientas);
    }
  };

  /** Arreglos rápidos sobre el listado (nombres al revés, mayúsculas, etc.). */
  function dialogoHerramientas() {
    var lista = estudiantesFiltrados({ incluirInactivos: true });
    var c = conteos();
    var vacios = {
      grados: base().grados.filter(function (g) { return !c.grado[g.id]; }),
      grupos: base().grupos.filter(function (g) { return !c.grupo[g.id]; })
    };
    var muestra = lista.slice(0, 3).map(function (e) {
      return '<li><span><strong>' + esc(e.apellidos) + '</strong> · ' + esc(e.nombres) +
        '  →  <strong>' + esc(e.nombres) + '</strong> · ' + esc(e.apellidos) + '</span></li>';
    }).join('');

    PD.modal.abrir({
      titulo: 'Herramientas del listado',
      cuerpo:
        '<p class="tarjeta-sub">Se aplican a los <strong>' + lista.length + ' estudiantes ' +
        'que muestran los filtros actuales</strong>.</p>' +
        '<div class="aviso-linea" style="margin-top:12px"><i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>' +
        '<div><strong>Intercambiar apellidos y nombres.</strong> Úsalo si el listado se importó ' +
        'en el orden contrario (por ejemplo «Adrián David Mendoza Durán» quedó con «Adrián David» ' +
        'como apellidos). Así se vería el cambio:' +
        (muestra ? '<ul class="bol-lista" style="margin-top:8px">' + muestra + '</ul>' : '') +
        '</div></div>' +
        (vacios.grados.length || vacios.grupos.length
          ? '<div class="aviso-linea" style="margin-top:12px"><i class="fa-solid fa-broom" aria-hidden="true"></i>' +
            '<div><strong>Limpiar grados y grupos vacíos.</strong> Sobran ' +
            (vacios.grados.length ? vacios.grados.length + ' grado(s) (' +
              esc(vacios.grados.map(function (g) { return g.nombre; }).join(', ')) + ')' : '') +
            (vacios.grados.length && vacios.grupos.length ? ' y ' : '') +
            (vacios.grupos.length ? vacios.grupos.length + ' grupo(s)' : '') +
            ' sin ningún estudiante. Se pueden borrar para que no aparezcan en los filtros.' +
            '<div class="tarjeta-acciones" style="margin-top:10px">' +
            '<button type="button" class="boton boton-mini" data-limpiar="1">' +
            '<i class="fa-solid fa-broom" aria-hidden="true"></i><span>Borrar los vacíos</span></button>' +
            '</div></div></div>'
          : ''),
      pie: '<button type="button" class="boton boton-mini boton-fantasma" data-accion="cerrar-modal">Cancelar</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-invertir="1">' +
        '<i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>' +
        '<span>Intercambiar en ' + lista.length + ' estudiantes</span></button>',
      despues: function (caja) {
        caja.querySelector('[data-invertir]').addEventListener('click', function () {
          var cuantos = PD.base.invertirNombres(lista.map(function (e) { return e.id; }));
          PD.modal.cerrar();
          PD.tostada('Se intercambiaron apellidos y nombres en ' + cuantos + ' estudiantes.', 'ok', 5000);
          pintar();
        });
        var limpiar = caja.querySelector('[data-limpiar]');
        if (limpiar) limpiar.addEventListener('click', function () {
          var borrados = PD.base.limpiarCatalogos();
          PD.modal.cerrar();
          PD.tostada('Se borraron ' + borrados.grados + ' grados y ' + borrados.grupos +
            ' grupos sin estudiantes.', 'ok', 5000);
          pintar();
        });
      }
    });
  }

  function atajo(accion, fn) {
    var el = PD.$('[data-accion="' + accion + '"]');
    if (el) el.addEventListener('click', fn);
  }

  /** Ficha de creación / edición. */
  function fichaEstudiante(id) {
    var e = id ? PD.base.estudiante(id) : null;
    var b = base();
    var gradosOpciones = gradosConEstudiantes(e ? e.grado_id : 0).map(function (g) {
      return '<option value="' + esc(g.nombre) + '">';
    }).join('');
    var gruposOpciones = gruposConEstudiantes(0, e ? e.grupo_id : 0).map(function (g) {
      return '<option value="' + esc(g.nombre) + '">';
    }).join('');

    var cuerpo =
      '<form class="formulario" id="form-estudiante">' +
      '<div class="formulario-fila">' +
      campo('Apellidos', 'apellidos', e ? e.apellidos : '', { requerido: true }) +
      campo('Nombres', 'nombres', e ? e.nombres : '', { requerido: true }) +
      '</div>' +
      '<div class="formulario-fila">' +
      '<label class="campo"><span class="campo-etiqueta">Género</span>' +
      '<select name="genero">' + Object.keys(PD.base.GENEROS).map(function (k) {
        return '<option value="' + k + '"' + (e && e.genero === k ? ' selected' : '') + '>' +
          esc(PD.base.GENEROS[k]) + '</option>';
      }).join('') + '</select></label>' +
      campo('Grado', 'grado', e ? nombreGrado(e.grado_id) : '', { lista: 'lista-grados' }) +
      campo('Grupo', 'grupo', e ? nombreGrupo(e.grupo_id) : '', { lista: 'lista-grupos' }) +
      '</div>' +
      '<datalist id="lista-grados">' + gradosOpciones + '</datalist>' +
      '<datalist id="lista-grupos">' + gruposOpciones + '</datalist>' +
      '<div class="formulario-fila">' +
      campo('Código del estudiante', 'codigo', e ? e.codigo : '', {
        ayuda: 'Es la llave con la que entra al portal. Si lo dejas vacío se genera solo.'
      }) +
      '</div>' +
      '<label class="campo"><span class="campo-etiqueta">Nota del docente (la ve el estudiante)</span>' +
      '<textarea name="notas" maxlength="400">' + esc(e ? e.notas : '') + '</textarea></label>' +
      '<label class="interruptor"><input type="checkbox" name="activo"' +
      (!e || e.activo !== 0 ? ' checked' : '') + '><span>Estudiante activo</span></label>' +
      '<p class="campo-error oculto" id="error-estudiante"></p>' +
      '</form>';

    PD.modal.abrir({
      titulo: e ? 'Editar estudiante' : 'Nuevo estudiante',
      cuerpo: cuerpo,
      pie: '<button type="button" class="boton boton-mini boton-fantasma" data-accion="cerrar-modal">Cancelar</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-guardar="1">' +
        '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i><span>Guardar</span></button>',
      despues: function (caja) {
        var form = caja.querySelector('#form-estudiante');
        var primero = form.querySelector('input[name="apellidos"]');
        if (primero) primero.focus();
        caja.querySelector('[data-guardar]').addEventListener('click', function () {
          var datos = {
            id: e ? e.id : null,
            apellidos: form.apellidos.value,
            nombres: form.nombres.value,
            genero: form.genero.value,
            grado_nombre: form.grado.value,
            grupo_nombre: form.grupo.value,
            codigo: form.codigo.value,
            notas: form.notas.value,
            activo: form.activo.checked ? 1 : 0
          };
          if (!datos.apellidos.trim() && !datos.nombres.trim()) {
            return mostrarError(caja, 'Escribe al menos el nombre del estudiante.');
          }
          try {
            PD.base.guardarEstudiante(datos);
            PD.modal.cerrar();
            PD.tostada(e ? 'Estudiante actualizado.' : 'Estudiante creado.', 'ok');
            pintar();
          } catch (err) {
            mostrarError(caja, err.message);
          }
        });
        form.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' && ev.target.tagName !== 'TEXTAREA') {
            ev.preventDefault();
            caja.querySelector('[data-guardar]').click();
          }
        });
      }
    });
  }

  function campo(etiqueta, nombre, valor, opciones) {
    var o = opciones || {};
    return '<label class="campo"><span class="campo-etiqueta">' + esc(etiqueta) + '</span>' +
      '<input type="text" name="' + nombre + '" value="' + esc(valor || '') + '"' +
      (o.lista ? ' list="' + o.lista + '"' : '') +
      (o.requerido ? ' required' : '') + ' maxlength="80" autocomplete="off">' +
      (o.ayuda ? '<span class="campo-ayuda">' + esc(o.ayuda) + '</span>' : '') +
      '</label>';
  }

  function mostrarError(caja, mensaje) {
    var p = caja.querySelector('#error-estudiante') || caja.querySelector('.campo-error');
    if (p) {
      p.textContent = mensaje;
      p.classList.remove('oculto');
    } else {
      PD.tostada(mensaje, 'error');
    }
  }

  function confirmar(opciones) {
    return new Promise(function (resolver) {
      PD.modal.abrir({
        titulo: opciones.titulo,
        cuerpo: '<p>' + opciones.texto + '</p>',
        pie: '<button type="button" class="boton boton-mini boton-fantasma" data-accion="cerrar-modal">Cancelar</button>' +
          '<button type="button" class="boton boton-mini ' + (opciones.peligro ? '' : 'boton-oro') +
          '" data-si="1" style="' + (opciones.peligro ? 'border-color:var(--bajo);color:var(--bajo)' : '') + '">' +
          esc(opciones['botón'] || 'Aceptar') + '</button>',
        despues: function (caja) {
          caja.querySelector('[data-si]').addEventListener('click', function () {
            PD.modal.cerrar();
            resolver(true);
          });
          caja.querySelectorAll('[data-accion="cerrar-modal"]').forEach(function (b) {
            b.addEventListener('click', function () { resolver(false); });
          });
        }
      });
    });
  }

  function generarCodigos() {
    var sin = base().estudiantes.filter(function (e) { return !String(e.codigo || '').trim(); });
    if (!sin.length) { PD.tostada('Todos los estudiantes ya tienen código.', 'ok'); return; }
    sin.forEach(function (e) {
      e.codigo = PD.base.codigoSugerido(e.grado_id, e.grupo_id);
    });
    PD.base.guardar('codigos');
    PD.tostada('Se generaron ' + sin.length + ' códigos.', 'ok');
    pintar();
  }

  function exportarEstudiantes() {
    var filas = [['Código', 'Apellidos', 'Nombres', 'Género', 'Grado', 'Grupo', 'Estado',
      'Misiones registradas', 'Promedio', 'Nivel', 'Dragones']];
    estudiantesFiltrados({ incluirInactivos: true }).forEach(function (e) {
      var p = perfil(e);
      filas.push([
        e.codigo, e.apellidos, e.nombres, PD.base.GENEROS[e.genero] || '',
        nombreGrado(e.grado_id), nombreGrupo(e.grupo_id),
        e.activo === 0 ? 'Retirado' : 'Activo',
        p ? p.progreso.misiones_registradas : '',
        p ? p.progreso.promedio : '',
        p ? p.progreso.nivel.etiqueta : '',
        p ? p.dragones.desbloqueados : ''
      ]);
    });
    PD.docs.excel([{ nombre: 'Estudiantes', filas: filas }],
      'Estudiantes-' + base().institucion.anio + '.xlsx');
  }

  /* ------------------------------------------------------- Importación --- */
  function dialogoImportar() {
    var cuerpo =
      '<div class="formulario">' +
      '<div class="zona-soltar" id="zona-soltar">' +
      '<i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i>' +
      '<strong>Arrastra aquí el archivo o haz clic para elegirlo</strong>' +
      '<small>Excel (.xlsx), CSV o texto. Columnas: Nombre completo · Grado · Grupo · Género · Código</small>' +
      '<input type="file" id="archivo-listado" accept=".xlsx,.xls,.csv,.txt" hidden>' +
      '</div>' +
      '<label class="campo"><span class="campo-etiqueta">…o pega el listado aquí</span>' +
      '<textarea id="texto-listado" placeholder="Rojas Pérez Valentina;Quinto;A;F;DRG-5A01"></textarea>' +
      '<span class="campo-ayuda">Una línea por estudiante. Separadores admitidos: tabulación, ; o coma. ' +
      'Si el listado trae encabezados, se detectan solos.</span></label>' +
      '<div class="formulario-fila">' +
      '<label class="campo"><span class="campo-etiqueta">Orden del nombre completo</span>' +
      '<select name="orden_nombre">' +
      '<option value="apellidos">Apellidos primero · «Rojas Pérez Valentina María»</option>' +
      '<option value="nombres">Nombres primero · «Valentina María Rojas Pérez»</option>' +
      '</select>' +
      '<span class="campo-ayuda">Solo se usa cuando el archivo trae una única columna con el ' +
      'nombre completo. Si trae columnas separadas de apellidos y nombres, se respetan.</span></label>' +
      '</div>' +
      '<div class="formulario-fila">' +
      campo('Grado por defecto (opcional)', 'grado_defecto', '', { lista: 'lista-grados-imp' }) +
      campo('Grupo por defecto (opcional)', 'grupo_defecto', '', { lista: 'lista-grupos-imp' }) +
      '</div>' +
      '<datalist id="lista-grados-imp">' + gradosConEstudiantes(0).map(function (g) {
        return '<option value="' + esc(g.nombre) + '">';
      }).join('') + '</datalist>' +
      '<datalist id="lista-grupos-imp">' + gruposConEstudiantes(0).map(function (g) {
        return '<option value="' + esc(g.nombre) + '">';
      }).join('') + '</datalist>' +
      '<div id="previa-importar"></div>' +
      '</div>';

    PD.modal.abrir({
      titulo: 'Importar listado de estudiantes',
      cuerpo: cuerpo,
      pie: '<button type="button" class="boton boton-mini boton-fantasma" data-accion="cerrar-modal">Cancelar</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-importar="1">' +
        '<i class="fa-solid fa-file-import" aria-hidden="true"></i><span>Importar</span></button>',
      despues: function (caja) {
        var zona = caja.querySelector('#zona-soltar');
        var archivo = caja.querySelector('#archivo-listado');
        var area = caja.querySelector('#texto-listado');
        var previa = caja.querySelector('#previa-importar');
        var filasArchivo = null;

        zona.addEventListener('click', function () { archivo.click(); });
        ['dragenter', 'dragover'].forEach(function (ev) {
          zona.addEventListener(ev, function (e) {
            e.preventDefault();
            zona.classList.add('encima');
          });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
          zona.addEventListener(ev, function (e) {
            e.preventDefault();
            zona.classList.remove('encima');
          });
        });
        zona.addEventListener('drop', function (e) {
          if (e.dataTransfer.files && e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]);
        });
        archivo.addEventListener('change', function () {
          if (archivo.files[0]) leerArchivo(archivo.files[0]);
        });

        function leerArchivo(f) {
          var nombre = f.name.toLowerCase();
          if (/\.(xlsx|xls)$/.test(nombre)) {
            if (!global.XLSX) {
              PD.tostada('Para leer Excel se necesita internet. Guarda el archivo como CSV y vuelve a intentarlo.', 'error', 6000);
              return;
            }
            var lector = new FileReader();
            lector.onload = function () {
              try {
                var libro = global.XLSX.read(new Uint8Array(lector.result), { type: 'array' });
                var hoja = libro.Sheets[libro.SheetNames[0]];
                filasArchivo = global.XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: '' });
                mostrarPrevia(filasArchivo, f.name);
              } catch (err) {
                PD.tostada('No se pudo leer el Excel: ' + err.message, 'error', 5000);
              }
            };
            lector.readAsArrayBuffer(f);
          } else {
            var lectorTexto = new FileReader();
            lectorTexto.onload = function () {
              area.value = String(lectorTexto.result || '');
              filasArchivo = null;
              mostrarPrevia(filasDeTexto(area.value), f.name);
            };
            lectorTexto.readAsText(f, 'utf-8');
          }
        }

        function mostrarPrevia(filas, nombre) {
          var muestra = (filas || []).slice(0, 6);
          if (!muestra.length) { previa.innerHTML = ''; return; }
          previa.innerHTML = '<p class="campo-ayuda" style="margin-bottom:6px">' +
            '<strong>' + esc(nombre || 'Listado') + '</strong> · ' + filas.length + ' filas leídas</p>' +
            '<div class="vista-previa"><table class="tabla"><tbody>' +
            muestra.map(function (f) {
              return '<tr>' + f.slice(0, 6).map(function (c) {
                return '<td>' + esc(String(c || '')) + '</td>';
              }).join('') + '</tr>';
            }).join('') + '</tbody></table></div>';
        }

        area.addEventListener('input', PD.debounce(function () {
          filasArchivo = null;
          mostrarPrevia(filasDeTexto(area.value), 'Texto pegado');
        }, 400));

        caja.querySelector('[data-importar]').addEventListener('click', function () {
          var filas = filasArchivo || filasDeTexto(area.value);
          if (!filas || !filas.length) {
            PD.tostada('Primero elige un archivo o pega el listado.', 'error');
            return;
          }
          try {
            var resumen = PD.base.importarFilas(filas, {
              grado: caja.querySelector('input[name="grado_defecto"]').value,
              grupo: caja.querySelector('input[name="grupo_defecto"]').value,
              orden: caja.querySelector('select[name="orden_nombre"]').value
            });
            PD.modal.cerrar();
            pintar();
            PD.tostada('Importación lista: ' + resumen.creados + ' nuevos, ' +
              resumen.actualizados + ' actualizados' +
              (resumen.omitidos ? ', ' + resumen.omitidos + ' omitidos' : '') + '.', 'ok', 5200);
            if (resumen.avisos.length) {
              PD.modal.abrir({
                titulo: 'Filas que no se pudieron importar',
                cuerpo: '<ul style="display:grid;gap:6px;margin-left:18px">' +
                  resumen.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>',
                pie: '<button type="button" class="boton boton-mini" data-accion="cerrar-modal">Entendido</button>'
              });
            }
          } catch (err) {
            PD.tostada(err.message, 'error', 5000);
          }
        });
      }
    });
  }

  /** Convierte texto pegado en matriz de celdas. */
  function filasDeTexto(texto) {
    return String(texto || '').split(/\r?\n/)
      .map(function (linea) { return linea.trim(); })
      .filter(Boolean)
      .map(function (linea) {
        var separador = linea.indexOf('\t') >= 0 ? '\t' : (linea.indexOf(';') >= 0 ? ';' : ',');
        return linea.split(separador).map(function (c) { return c.trim(); });
      });
  }

  /* ======================================================================== */
  /* 3. Calificaciones                                                        */
  /* ======================================================================== */
  var vistaCalificaciones = {
    titulo: 'Calificaciones',
    subtitulo: function () {
      if (estado.modoNotas === 'estudiante') {
        // El mismo estudiante que elegirá la vista si todavía no hay uno fijado.
        var e = PD.base.estudiante(estado.estudianteNotas) || estudiantesFiltrados()[0];
        return e ? ('Notas de ' + nombreCompleto(e)) : 'Aún no hay estudiantes';
      }
      var m = misionActual();
      return m ? ('Misión ' + m.numero + ' · ' + m.titulo) : 'Selecciona una misión';
    },
    html: function () {
      return estado.modoNotas === 'estudiante' ? notasPorEstudiante() : notasPorMision();
    },
    luego: function () {
      enlazarFiltros();
      enlazarNotas();
    }
  };

  function misionActual() {
    var salida = null;
    base().misiones.forEach(function (m) { if (Number(m.id) === Number(estado.mision_id)) salida = m; });
    return salida || base().misiones[0];
  }

  function selectorMisiones() {
    var porPeriodo = {};
    base().misiones.forEach(function (m) {
      (porPeriodo[m.periodo_id] = porPeriodo[m.periodo_id] || []).push(m);
    });
    var grupos = base().periodos.map(function (p) {
      return '<optgroup label="' + esc(p.nombre + ' · ' + p.elemento) + '">' +
        (porPeriodo[p.id] || []).map(function (m) {
          return '<option value="' + m.id + '"' + (Number(estado.mision_id) === m.id ? ' selected' : '') +
            '>' + m.numero + '. ' + esc(m.titulo) + '</option>';
        }).join('') + '</optgroup>';
    }).join('');
    return '<label class="filtro"><span>Misión</span>' +
      '<select class="control" data-accion="f-mision" style="min-width:230px">' + grupos + '</select></label>';
  }

  function cabeceraModo() {
    return '<div class="filtros">' +
      '<label class="filtro"><span>Modo</span><select class="control" data-accion="f-modo">' +
      '<option value="mision"' + (estado.modoNotas === 'mision' ? ' selected' : '') + '>Por misión (todo el grupo)</option>' +
      '<option value="estudiante"' + (estado.modoNotas === 'estudiante' ? ' selected' : '') + '>Por estudiante (sus 24 misiones)</option>' +
      '</select></label>' +
      '</div>';
  }

  function escalaHtml() {
    return '<div class="escala">' + ESCALA.map(function (e) {
      return '<div class="escala-item nivel-' + e.clave + '"><strong>' + e.etiqueta + '</strong>' +
        '<span>' + e.rango + '</span></div>';
    }).join('') + '</div>';
  }

  function notasPorMision() {
    var m = misionActual();
    var periodo = PD.datos.periodo(m.periodo_id) || {};
    var lista = estudiantesFiltrados();

    var filas = lista.map(function (e) {
      var reg = null;
      e.registros.forEach(function (r) { if (Number(r.mision_id) === Number(m.id)) reg = r; });
      return filaNotas(e, m, reg, { mostrar: 'estudiante' });
    }).join('');

    var herramientas = '<div class="barra-tareas">' +
      '<div class="filtros">' +
      selectorGrados(estado.filtros.grado_id, 'f-grado') +
      selectorGrupos(estado.filtros.grado_id, estado.filtros.grupo_id, 'f-grupo') +
      selectorMisiones() +
      '<label class="filtro"><span>Buscar</span><input class="control" type="search" ' +
      'placeholder="Estudiante…" data-accion="f-buscar" value="' + esc(estado.filtros.q) + '"></label>' +
      '</div>' +
      '<div class="tarjeta-acciones">' +
      '<button type="button" class="boton boton-mini" data-accion="editar-mision"><i class="fa-solid fa-pen" aria-hidden="true"></i><span>Editar misión</span></button>' +
      '<button type="button" class="boton boton-mini" data-accion="excel-notas"><i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Excel</span></button>' +
      '</div></div>';

    return Pz().tarjeta({ cuerpo: cabeceraModo() + herramientas }) +
      Pz().tarjeta({
        cuerpo:
          '<div class="cabecera-mision" style="--acento:' + (periodo.color || 'var(--oro)') + '">' +
          '<h3>Misión ' + m.numero + ' · ' + esc(m.titulo) + '</h3>' +
          '<p>' + esc(periodo.nombre || '') + ' · ' + esc(periodo.elemento || '') +
          (m.tema ? ' · Tema: ' + esc(m.tema) : '') + '</p>' +
          '</div>' +
          '<div style="margin-top:14px">' + escalaHtml() + '</div>'
      }) +
      Pz().tarjeta({
        titulo: 'Registro de notas', icono: 'fa-pen-to-square',
        sub: lista.length + ' estudiantes · se guarda solo al salir de cada casilla',
        cuerpo: lista.length ? tablaNotas(filas, 'estudiante')
          : Pz().vacio('No hay estudiantes con esos filtros.', 'fa-users')
      });
  }

  function notasPorEstudiante() {
    var e = PD.base.estudiante(estado.estudianteNotas) || estudiantesFiltrados()[0];
    if (!e) {
      return Pz().tarjeta({ cuerpo: cabeceraModo() }) +
        Pz().tarjeta({ cuerpo: Pz().vacio('No hay estudiantes registrados todavía.', 'fa-users') });
    }
    estado.estudianteNotas = e.id;

    var lista = estudiantesFiltrados();
    var selector = '<label class="filtro"><span>Estudiante</span>' +
      '<select class="control" data-accion="f-estudiante" style="min-width:240px">' +
      lista.map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === e.id ? ' selected' : '') + '>' +
          esc(nombreCompleto(x)) + '</option>';
      }).join('') + '</select></label>';

    var filas = base().misiones.filter(function (m) {
      return !estado.periodo || Number(m.periodo_id) === Number(estado.periodo);
    }).map(function (m) {
      var reg = null;
      e.registros.forEach(function (r) { if (Number(r.mision_id) === Number(m.id)) reg = r; });
      return filaNotas(e, m, reg, { mostrar: 'mision' });
    }).join('');

    var p = perfil(e);
    return Pz().tarjeta({
      cuerpo: cabeceraModo() +
        '<div class="barra-tareas"><div class="filtros">' +
        selectorGrados(estado.filtros.grado_id, 'f-grado') +
        selectorGrupos(estado.filtros.grado_id, estado.filtros.grupo_id, 'f-grupo') +
        selector +
        selectorPeriodos(estado.periodo, 'f-periodo') +
        '</div></div>'
    }) +
      (p ? '<div class="rejilla-kpi">' +
        Pz().kpi({ icono: 'fa-star', etiqueta: 'Promedio', valor: p.progreso.promedio, decimales: 2, acento: 'var(--oro)', pie: p.progreso.nivel.etiqueta }) +
        Pz().kpi({ icono: 'fa-scroll', etiqueta: 'Misiones', valor: p.progreso.misiones_registradas, acento: 'var(--cian)', pie: 'de ' + p.progreso.misiones_totales }) +
        Pz().kpi({ icono: 'fa-dragon', etiqueta: 'Dragones', valor: p.dragones.desbloqueados, acento: 'var(--violeta)', pie: p.titulo }) +
        Pz().kpi({ icono: 'fa-gem', etiqueta: 'Gemas', valor: p.progreso.recursos.gemas, acento: 'var(--gemas)', pie: 'de 2.040 para ELEMENTUM' }) +
        '</div>' : '') +
      Pz().tarjeta({
        titulo: nombreCompleto(e), icono: 'fa-user',
        sub: curso(e) + ' · código ' + (e.codigo || 'sin código'),
        cuerpo: tablaNotas(filas, 'mision')
      });
  }

  function tablaNotas(filas, primeraColumna) {
    return '<div class="tabla-envoltorio"><table class="tabla tabla-notas"><thead><tr>' +
      '<th>' + (primeraColumna === 'mision' ? 'Misión' : 'Estudiante') + '</th>' +
      COLUMNAS.map(function (c) {
        return '<th class="nota" title="' + esc(c.nombre) + '">' + esc(c.corto) + '</th>';
      }).join('') +
      '<th class="nota">Prom.</th><th>Observaciones</th>' +
      '</tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function filaNotas(e, m, reg, opciones) {
    var notas = COLUMNAS.map(function (c) { return reg ? PD.motor.normalizarNota(reg[c.columna]) : null; });
    var validas = notas.filter(function (n) { return n !== null; });
    var promedio = validas.length ? PD.motor.redondear(validas.reduce(function (a, b) { return a + b; }, 0) / validas.length) : null;
    var nivel = PD.motor.nivelDe(promedio);

    var etiqueta = opciones.mostrar === 'mision'
      ? '<td><strong>' + m.numero + '. ' + esc(m.titulo) + '</strong>' +
        (m.tema ? '<br><span class="tarjeta-sub">' + esc(m.tema) + '</span>' : '') + '</td>'
      : '<td><strong>' + esc(nombreCompleto(e)) + '</strong>' +
        '<br><span class="tarjeta-sub">' + esc(e.codigo || 'sin código') + ' · ' + esc(curso(e)) + '</span></td>';

    return '<tr data-estudiante="' + e.id + '" data-mision="' + m.id + '">' + etiqueta +
      COLUMNAS.map(function (c, i) {
        var v = notas[i];
        var clave = PD.motor.nivelDe(v).clave;
        return '<td class="nota"><input class="nota-campo ' + (v === null ? '' : clave) + '" ' +
          'type="number" min="0" max="10" step="0.1" inputmode="decimal" ' +
          'data-columna="' + c.columna + '" value="' + (v === null ? '' : v) + '" ' +
          'aria-label="' + esc(c.nombre) + '"></td>';
      }).join('') +
      '<td class="promedio nivel-' + nivel.clave + '" data-promedio>' +
      (promedio === null ? '—' : PD.fmt.nota(promedio)) + '</td>' +
      '<td><input class="obs-campo" type="text" maxlength="400" data-columna="observaciones" ' +
      'value="' + esc(reg ? reg.observaciones : '') + '" placeholder="Comentario para el estudiante…"></td>' +
      '</tr>';
  }

  function enlazarNotas() {
    var selMision = PD.$('[data-accion="f-mision"]');
    if (selMision) selMision.addEventListener('change', function () {
      estado.mision_id = parseInt(selMision.value, 10);
      pintar();
    });
    var selModo = PD.$('[data-accion="f-modo"]');
    if (selModo) selModo.addEventListener('change', function () {
      estado.modoNotas = selModo.value;
      pintar();
    });
    var selEst = PD.$('[data-accion="f-estudiante"]');
    if (selEst) selEst.addEventListener('change', function () {
      estado.estudianteNotas = parseInt(selEst.value, 10);
      pintar();
    });
    atajo('editar-mision', editarMision);
    atajo('excel-notas', exportarNotasExcel);

    PD.$$('.tabla-notas tbody tr').forEach(function (fila) {
      var estudianteId = parseInt(fila.getAttribute('data-estudiante'), 10);
      var misionId = parseInt(fila.getAttribute('data-mision'), 10);

      function recoger() {
        var datos = {};
        PD.$$('[data-columna]', fila).forEach(function (campo) {
          datos[campo.getAttribute('data-columna')] = campo.value;
        });
        return datos;
      }

      function guardarFila() {
        var datos = recoger();
        PD.base.guardarRegistro(estudianteId, misionId, datos);
        // Promedio y colores se actualizan sin repintar toda la vista.
        var notas = COLUMNAS.map(function (c) { return PD.motor.normalizarNota(datos[c.columna]); });
        var validas = notas.filter(function (n) { return n !== null; });
        var promedio = validas.length
          ? PD.motor.redondear(validas.reduce(function (a, b) { return a + b; }, 0) / validas.length) : null;
        var celda = fila.querySelector('[data-promedio]');
        var nivel = PD.motor.nivelDe(promedio);
        celda.textContent = promedio === null ? '—' : PD.fmt.nota(promedio);
        celda.className = 'promedio nivel-' + nivel.clave;
        PD.$$('.nota-campo', fila).forEach(function (campo, i) {
          campo.className = 'nota-campo ' + (notas[i] === null ? '' : PD.motor.nivelDe(notas[i]).clave);
        });
      }

      PD.$$('input', fila).forEach(function (campo) {
        campo.addEventListener('change', guardarFila);
        campo.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); campo.blur(); saltarAbajo(campo); }
        });
      });
    });
  }

  /** Enter baja a la misma casilla de la fila siguiente, como en una planilla. */
  function saltarAbajo(campo) {
    var fila = campo.closest('tr');
    var siguiente = fila && fila.nextElementSibling;
    if (!siguiente) return;
    var columna = campo.getAttribute('data-columna');
    var destino = siguiente.querySelector('[data-columna="' + columna + '"]');
    if (destino) { destino.focus(); destino.select && destino.select(); }
  }

  function editarMision() {
    var m = misionActual();
    PD.modal.abrir({
      titulo: 'Misión ' + m.numero,
      cuerpo: '<form class="formulario" id="form-mision">' +
        campo('Título', 'titulo', m.titulo, { requerido: true }) +
        campo('Tema académico', 'tema', m.tema, { ayuda: 'Aparece en el boletín, junto al nombre de la misión.' }) +
        '<label class="campo"><span class="campo-etiqueta">Descripción</span>' +
        '<textarea name="descripcion" maxlength="400">' + esc(m.descripcion || '') + '</textarea></label>' +
        '</form>',
      pie: '<button type="button" class="boton boton-mini boton-fantasma" data-accion="cerrar-modal">Cancelar</button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-guardar="1">Guardar</button>',
      despues: function (caja) {
        caja.querySelector('[data-guardar]').addEventListener('click', function () {
          var form = caja.querySelector('#form-mision');
          PD.base.guardarMision({
            id: m.id,
            titulo: form.titulo.value,
            tema: form.tema.value,
            descripcion: form.descripcion.value
          });
          PD.modal.cerrar();
          PD.tostada('Misión actualizada.', 'ok');
          pintar();
        });
      }
    });
  }

  function exportarNotasExcel() {
    var misiones = base().misiones;
    var lista = estudiantesFiltrados();
    var encabezado = ['Código', 'Estudiante', 'Grado', 'Grupo'];
    misiones.forEach(function (m) {
      COLUMNAS.forEach(function (c) { encabezado.push('M' + m.numero + ' ' + c.corto); });
      encabezado.push('M' + m.numero + ' Prom.');
    });
    encabezado.push('Promedio general', 'Nivel');

    var filas = [encabezado];
    lista.forEach(function (e) {
      var p = perfil(e);
      var fila = [e.codigo, nombreCompleto(e), nombreGrado(e.grado_id), nombreGrupo(e.grupo_id)];
      misiones.forEach(function (m) {
        var reg = null;
        e.registros.forEach(function (r) { if (Number(r.mision_id) === Number(m.id)) reg = r; });
        var valores = COLUMNAS.map(function (c) { return reg ? PD.motor.normalizarNota(reg[c.columna]) : null; });
        valores.forEach(function (v) { fila.push(v === null ? '' : v); });
        var validas = valores.filter(function (v) { return v !== null; });
        fila.push(validas.length ? PD.motor.redondear(validas.reduce(function (a, b) { return a + b; }, 0) / validas.length) : '');
      });
      fila.push(p && p.progreso.promedio !== null ? p.progreso.promedio : '',
        p ? p.progreso.nivel.etiqueta : '');
      filas.push(fila);
    });

    PD.docs.excel([{ nombre: 'Calificaciones', filas: filas }],
      'Calificaciones-' + base().institucion.anio + '.xlsx');
  }

  /* ======================================================================== */
  /* 4. Estadísticas                                                          */
  /* ======================================================================== */
  var vistaEstadisticas = {
    titulo: 'Estadísticas',
    subtitulo: function () {
      var p = estado.periodo ? ('Periodo ' + estado.periodo) : 'Todo el año';
      return p + ' · ' + perfilesFiltrados().length + ' estudiantes en el filtro';
    },
    html: function () {
      var perfiles = perfilesFiltrados();
      var lista = perfiles.map(function (p) { return p.est; });
      var resumen = PD.motor.resumenGrupo(lista, { periodo: estado.periodo });

      var kpis = '<div class="rejilla-kpi">' +
        Pz().kpi({ icono: 'fa-users', etiqueta: 'Estudiantes', valor: resumen.estudiantes, acento: 'var(--cian)', pie: resumen.conDatos + ' con notas' }) +
        Pz().kpi({ icono: 'fa-star', etiqueta: 'Promedio', valor: resumen.promedio, decimales: 2, acento: 'var(--oro)', pie: resumen.nivel.etiqueta }) +
        Pz().kpi({ icono: 'fa-scroll', etiqueta: 'Misiones promedio', valor: resumen.misionesMedias, decimales: 1, acento: 'var(--lazos)', pie: 'por estudiante' }) +
        Pz().kpi({ icono: 'fa-dragon', etiqueta: 'Dragones promedio', valor: resumen.dragonesMedios, decimales: 1, acento: 'var(--violeta)', pie: 'de 12 posibles' }) +
        Pz().kpi({ icono: 'fa-trophy', etiqueta: 'Mejor promedio', valor: resumen.mejorPromedio, decimales: 2, acento: 'var(--runas)', pie: 'del grupo filtrado' }) +
        '</div>';

      var graficas = '<div class="rejilla rejilla-2">' +
        Pz().tarjeta({ titulo: 'Promedio por periodo', icono: 'fa-chart-line', cuerpo: '<div class="lienzo-envoltorio" id="e-periodos"></div>' }) +
        Pz().tarjeta({ titulo: 'Distribución por nivel', icono: 'fa-chart-pie', cuerpo: '<div class="lienzo-envoltorio" id="e-niveles"></div>' }) +
        '</div>' +
        '<div class="rejilla rejilla-2">' +
        Pz().tarjeta({ titulo: 'Promedio por actividad', icono: 'fa-chart-simple', sub: 'las cuatro fuentes de recursos', cuerpo: '<div class="lienzo-envoltorio" id="e-componentes"></div>' }) +
        Pz().tarjeta({ titulo: 'Comparación entre grupos', icono: 'fa-chart-column', cuerpo: '<div class="lienzo-envoltorio" id="e-grupos"></div>' }) +
        '</div>';

      var filas = perfiles.slice().sort(function (a, b) {
        return (b.progreso.promedio || -1) - (a.progreso.promedio || -1);
      }).map(function (p, i) {
        return '<tr><td class="num">' + (i + 1) + '</td>' +
          '<td>' + esc(p.nombre) + '</td>' +
          '<td>' + esc(p.curso) + '</td>' +
          '<td class="num">' + p.progreso.misiones_registradas + '</td>' +
          '<td class="num">' + PD.fmt.nota(p.progreso.promedio) + '</td>' +
          '<td>' + Pz().marcaNivel(p.progreso.nivel) + '</td>' +
          '<td class="num">' + p.dragones.desbloqueados + '</td>' +
          '<td class="num">' + PD.fmt.entero(p.xp) + '</td></tr>';
      }).join('');

      return Pz().tarjeta({
        cuerpo: '<div class="barra-tareas">' + filtrosComunes({ periodo: true, estado: false }) +
          '<div class="tarjeta-acciones">' +
          '<button type="button" class="boton boton-mini" data-accion="excel-estadisticas">' +
          '<i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Exportar Excel</span></button>' +
          '</div></div>'
      }) + kpis + graficas +
        Pz().tarjeta({
          titulo: 'Detalle por estudiante', icono: 'fa-table-list',
          sub: perfiles.length + ' estudiantes',
          cuerpo: perfiles.length
            ? '<div class="tabla-envoltorio"><table class="tabla"><thead><tr>' +
              '<th>#</th><th>Estudiante</th><th>Curso</th><th class="num">Misiones</th>' +
              '<th class="num">Promedio</th><th>Nivel</th><th class="num">Dragones</th><th class="num">XP</th>' +
              '</tr></thead><tbody>' + filas + '</tbody></table></div>'
            : Pz().vacio('Sin estudiantes en el filtro.', 'fa-chart-column')
        });
    },
    luego: function () {
      enlazarFiltros();
      var perfiles = perfilesFiltrados();
      var lista = perfiles.map(function (p) { return p.est; });
      var resumen = PD.motor.resumenGrupo(lista, { periodo: estado.periodo });
      var pal = PD.graficas.paleta();

      PD.graficas.lineas(PD.$('#e-periodos'), {
        etiquetas: base().periodos.map(function (p) { return p.nombre; }),
        max: 10,
        leyenda: false,
        series: [{ nombre: 'Promedio', color: pal.oro, datos: [1, 2, 3, 4].map(function (i) { return resumen.periodos[i]; }) }]
      });

      PD.graficas.dona(PD.$('#e-niveles'), {
        etiquetas: ['Superior', 'Alto', 'Básico', 'Bajo', 'Sin datos'],
        datos: ['superior', 'alto', 'basico', 'bajo', 'sin-datos'].map(function (n) { return resumen.niveles[n] || 0; }),
        colores: [PD.graficas.color('--superior'), PD.graficas.color('--alto'),
          PD.graficas.color('--basico'), PD.graficas.color('--bajo'), pal.rejilla],
        centro: String(resumen.estudiantes), centroSub: 'estudiantes'
      });

      PD.graficas.barras(PD.$('#e-componentes'), {
        etiquetas: PD.motor.CLAVES.map(function (k) { return Pz().RECURSOS[k].nombre; }),
        max: 10, leyenda: false,
        series: [{
          nombre: 'Promedio', color: pal.oro,
          datos: PD.motor.CLAVES.map(function (k) { return resumen.componentes[k] || 0; }),
          colores: [pal.gemas, pal.cristales, pal.runas, pal.lazos]
        }]
      });

      var grupos = gruposConEstudiantes(estado.filtros.grado_id);
      PD.graficas.barras(PD.$('#e-grupos'), {
        etiquetas: grupos.map(function (g) { return nombreGrado(g.grado_id) + ' ' + g.nombre; }),
        max: 10, leyenda: false,
        series: [{
          nombre: 'Promedio', color: pal.cian,
          datos: grupos.map(function (g) {
            var r = PD.motor.resumenGrupo(PD.datos.estudiantes().filter(function (e) {
              return e.grupo_id === g.id;
            }), { periodo: estado.periodo });
            return r.promedio || 0;
          })
        }]
      });

      atajo('excel-estadisticas', function () {
        var filas = [['Código', 'Estudiante', 'Grado', 'Grupo', 'Género', 'Misiones',
          'Promedio', 'Nivel', 'Gemas', 'Cristales', 'Runas', 'Lazos', 'Dragones', 'XP']];
        perfiles.forEach(function (p) {
          filas.push([p.codigo, p.nombre, p.est.grado_nombre, p.est.grupo_nombre,
            PD.base.GENEROS[p.est.genero] || '', p.progreso.misiones_registradas,
            p.progreso.promedio, p.progreso.nivel.etiqueta,
            p.progreso.recursos.gemas, p.progreso.recursos.cristales,
            p.progreso.recursos.runas, p.progreso.recursos.lazos,
            p.dragones.desbloqueados, p.xp]);
        });
        var porGrupo = [['Grupo', 'Estudiantes', 'Promedio', 'Superior', 'Alto', 'Básico', 'Bajo']];
        gruposConEstudiantes(0).forEach(function (g) {
          var r = PD.motor.resumenGrupo(PD.datos.estudiantes().filter(function (e) {
            return e.grupo_id === g.id;
          }), { periodo: estado.periodo });
          porGrupo.push([nombreGrado(g.grado_id) + ' ' + g.nombre, r.estudiantes, r.promedio,
            r.niveles.superior, r.niveles.alto, r.niveles.basico, r.niveles.bajo]);
        });
        PD.docs.excel([
          { nombre: 'Estudiantes', filas: filas },
          { nombre: 'Por grupo', filas: porGrupo }
        ], 'Estadisticas-' + base().institucion.anio + '.xlsx');
      });
    }
  };

  /* ======================================================================== */
  /* 5. Ranking                                                               */
  /* ======================================================================== */
  var vistaRanking = {
    titulo: 'Ranking',
    subtitulo: function () {
      return 'Clasificación por ' + (PD.motor.METRICAS[estado.metrica] || PD.motor.METRICAS.promedio).etiqueta.toLowerCase();
    },
    html: function () {
      var perfiles = perfilesFiltrados();
      var tabla = PD.motor.ranking(perfiles, { metrica: estado.metrica, periodo: estado.periodo });

      var filtros = '<div class="barra-tareas"><div class="filtros">' +
        selectorGrados(estado.filtros.grado_id, 'f-grado') +
        selectorGrupos(estado.filtros.grado_id, estado.filtros.grupo_id, 'f-grupo') +
        selectorPeriodos(estado.periodo, 'f-periodo') +
        '<label class="filtro"><span>Clasificar por</span><select class="control" data-accion="f-metrica">' +
        Object.keys(PD.motor.METRICAS).map(function (k) {
          return '<option value="' + k + '"' + (estado.metrica === k ? ' selected' : '') + '>' +
            esc(PD.motor.METRICAS[k].etiqueta) + '</option>';
        }).join('') + '</select></label>' +
        '<label class="filtro"><span>Buscar</span><input class="control" type="search" ' +
        'data-accion="f-buscar" placeholder="Estudiante…" value="' + esc(estado.filtros.q) + '"></label>' +
        '</div><div class="tarjeta-acciones">' +
        '<button type="button" class="boton boton-mini" data-accion="excel-ranking">' +
        '<i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Excel</span></button>' +
        '<button type="button" class="boton boton-mini" data-accion="png-ranking">' +
        '<i class="fa-solid fa-image" aria-hidden="true"></i><span>Imagen</span></button>' +
        '<button type="button" class="boton boton-mini" data-accion="imprimir-ranking">' +
        '<i class="fa-solid fa-print" aria-hidden="true"></i><span>Imprimir</span></button>' +
        '</div></div>';

      var podio = '';
      if (tabla.filas.length >= 3) {
        podio = '<div class="podio">' + [1, 0, 2].map(function (i) {
          var f = tabla.filas[i];
          return '<article class="podio-puesto podio-' + (i + 1) + '">' +
            '<div class="podio-medalla">' + ['🥇', '🥈', '🥉'][i] + '</div>' +
            '<img class="podio-avatar" src="' + Pz().rutaDragon(f.perfil.avatar, true) + '" alt="">' +
            '<div class="podio-nombre">' + esc(f.perfil.nombre) + '</div>' +
            '<div class="podio-dato">' + esc(valorTexto(f.valor, tabla.decimales)) + '</div>' +
            '<div class="podio-sub">' + esc(f.perfil.curso) + '</div></article>';
        }).join('') + '</div>';
      }

      var filas = tabla.filas.map(function (f) {
        return '<tr><td>' + Pz().medallon(f.puesto) + '</td>' +
          '<td>' + Pz().miniPersona(f.perfil, { sub: f.perfil.curso }) + '</td>' +
          '<td>' + esc(f.perfil.titulo) + '</td>' +
          '<td class="num">' + esc(valorTexto(f.valor, tabla.decimales)) + '</td>' +
          '<td class="num">' + f.perfil.dragones.desbloqueados + '</td>' +
          '<td class="num">' + f.perfil.progreso.misiones_registradas + '</td>' +
          '<td>' + Pz().marcaNivel(f.perfil.progreso.nivel) + '</td></tr>';
      }).join('');

      return Pz().tarjeta({ cuerpo: filtros }) +
        (podio ? Pz().tarjeta({ titulo: 'Podio', icono: 'fa-trophy', cuerpo: podio }) : '') +
        Pz().tarjeta({
          clase: 'zona-impresion',
          titulo: 'Clasificación', icono: 'fa-ranking-star',
          sub: tabla.filas.length + ' estudiantes',
          cuerpo: tabla.filas.length
            ? '<div class="tabla-envoltorio"><table class="tabla"><thead><tr>' +
              '<th>#</th><th>Estudiante</th><th>Título</th><th class="num">' + esc(tabla.etiqueta) + '</th>' +
              '<th class="num">Dragones</th><th class="num">Misiones</th><th>Nivel</th>' +
              '</tr></thead><tbody>' + filas + '</tbody></table></div>'
            : Pz().vacio('Sin estudiantes para clasificar.', 'fa-trophy')
        });
    },
    luego: function () {
      enlazarFiltros();
      var sel = PD.$('[data-accion="f-metrica"]');
      if (sel) sel.addEventListener('change', function () { estado.metrica = sel.value; pintar(); });
      atajo('imprimir-ranking', function () { PD.docs.imprimir('.zona-impresion'); });
      atajo('png-ranking', function () {
        var ambito = estado.filtros.grupo_id ? nombreGrupo(estado.filtros.grupo_id)
          : (estado.filtros.grado_id ? nombreGrado(estado.filtros.grado_id) : 'general');
        PD.docs.aPng(PD.$('.zona-impresion'),
          'Ranking-' + PD.normal(ambito).replace(/\s+/g, '-') + '-' + estado.metrica + '.png', 1.6);
      });
      atajo('excel-ranking', function () {
        var tabla = PD.motor.ranking(perfilesFiltrados(), { metrica: estado.metrica, periodo: estado.periodo });
        var filas = [['Puesto', 'Código', 'Estudiante', 'Curso', 'Título', tabla.etiqueta,
          'Dragones', 'Misiones', 'Nivel']];
        tabla.filas.forEach(function (f) {
          filas.push([f.puesto, f.perfil.codigo, f.perfil.nombre, f.perfil.curso, f.perfil.titulo,
            f.valor, f.perfil.dragones.desbloqueados, f.perfil.progreso.misiones_registradas,
            f.perfil.progreso.nivel.etiqueta]);
        });
        PD.docs.excel([{ nombre: 'Ranking', filas: filas }],
          'Ranking-' + estado.metrica + '-' + base().institucion.anio + '.xlsx');
      });
    }
  };

  function valorTexto(valor, decimales) {
    if (valor === null || valor === undefined) return '—';
    return decimales ? PD.fmt.numero(valor, decimales) : PD.fmt.entero(valor);
  }

  /* ======================================================================== */
  /* 6. Informes y boletines                                                  */
  /* ======================================================================== */
  var vistaBoletines = {
    titulo: 'Informes y boletines',
    subtitulo: function () {
      return estado.periodo ? ('Periodo ' + estado.periodo) : 'Consolidado del año';
    },
    html: function () {
      var perfiles = perfilesFiltrados();
      var elegido = null;
      perfiles.forEach(function (p) { if (p.id === estado.boletin.estudiante_id) elegido = p; });
      if (!elegido) elegido = perfiles[0];
      if (elegido) estado.boletin.estudiante_id = elegido.id;

      var filtros = '<div class="barra-tareas"><div class="filtros">' +
        selectorGrados(estado.filtros.grado_id, 'f-grado') +
        selectorGrupos(estado.filtros.grado_id, estado.filtros.grupo_id, 'f-grupo') +
        selectorPeriodos(estado.periodo, 'f-periodo', 'Global · todo el año') +
        '<label class="filtro"><span>Estudiante</span>' +
        '<select class="control" data-accion="f-boletin" style="min-width:240px">' +
        perfiles.map(function (p) {
          return '<option value="' + p.id + '"' + (elegido && p.id === elegido.id ? ' selected' : '') +
            '>' + esc(p.nombre) + '</option>';
        }).join('') + '</select></label>' +
        '</div></div>';

      var acciones =
        '<button type="button" class="boton boton-mini" data-accion="bol-imprimir"><i class="fa-solid fa-print" aria-hidden="true"></i><span>Imprimir</span></button>' +
        '<button type="button" class="boton boton-mini" data-accion="bol-pdf"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>PDF</span></button>' +
        '<button type="button" class="boton boton-mini" data-accion="bol-png"><i class="fa-solid fa-image" aria-hidden="true"></i><span>PNG</span></button>' +
        '<button type="button" class="boton boton-mini" data-accion="bol-html"><i class="fa-solid fa-code" aria-hidden="true"></i><span>HTML</span></button>' +
        '<button type="button" class="boton boton-mini boton-oro" data-accion="bol-lote"><i class="fa-solid fa-layer-group" aria-hidden="true"></i><span>PDF de todo el grupo</span></button>';

      var informe = Pz().tarjeta({
        titulo: 'Informe consolidado', icono: 'fa-table',
        sub: perfiles.length + ' estudiantes en el filtro',
        acciones: '<button type="button" class="boton boton-mini" data-accion="inf-excel">' +
          '<i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Excel</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="inf-html">' +
          '<i class="fa-solid fa-code" aria-hidden="true"></i><span>HTML interactivo</span></button>',
        cuerpo: '<div id="tabla-informe">' + tablaInforme(perfiles) + '</div>'
      });

      var boletin = elegido ? Pz().tarjeta({
        clase: 'zona-impresion',
        titulo: 'Boletín del estudiante', icono: 'fa-scroll',
        sub: elegido.nombre + ' · ' + elegido.curso,
        acciones: acciones,
        cuerpo: '<div class="boletin-marco"><div id="hoja-boletin">' +
          PD.docs.boletinHtml(elegido, { periodo: estado.periodo }) + '</div></div>'
      }) : Pz().tarjeta({ cuerpo: Pz().vacio('No hay estudiantes con esos filtros.', 'fa-scroll') });

      return Pz().tarjeta({ cuerpo: filtros }) + informe + boletin;
    },
    luego: function () {
      enlazarFiltros();
      var sel = PD.$('[data-accion="f-boletin"]');
      if (sel) sel.addEventListener('change', function () {
        estado.boletin.estudiante_id = parseInt(sel.value, 10);
        pintar();
      });

      var perfiles = perfilesFiltrados();
      var elegido = null;
      perfiles.forEach(function (p) { if (p.id === estado.boletin.estudiante_id) elegido = p; });

      atajo('bol-imprimir', function () { PD.docs.imprimir('.zona-impresion'); });
      atajo('bol-png', function () {
        PD.docs.aPng(PD.$('#hoja-boletin .boletin-hoja'),
          'Boletin-' + (elegido ? elegido.codigo : 'guardian') + '.png', 1.6);
      });
      atajo('bol-pdf', function () {
        PD.docs.pdfDeNodos(PD.$('#hoja-boletin .boletin-hoja'),
          'Boletin-' + (elegido ? elegido.codigo : 'guardian') + '.pdf', { escala: 1.8 });
      });
      atajo('bol-html', function () {
        PD.docs.htmlAutonomo(PD.$('#hoja-boletin .boletin-hoja'),
          'Boletin-' + (elegido ? elegido.codigo : 'guardian') + '.html',
          'Boletín · ' + (elegido ? elegido.nombre : ''));
      });
      atajo('bol-lote', function () { boletinesEnLote(perfiles); });
      atajo('inf-excel', function () { informeExcel(perfiles); });
      atajo('inf-html', function () {
        PD.docs.htmlAutonomo(PD.$('#tabla-informe'),
          'Informe-' + base().institucion.anio + '.html', 'Informe consolidado');
      });
    }
  };

  function tablaInforme(perfiles) {
    if (!perfiles.length) return Pz().vacio('Sin estudiantes en el filtro.', 'fa-table');
    var misiones = base().misiones.filter(function (m) {
      return !estado.periodo || Number(m.periodo_id) === Number(estado.periodo);
    });
    var filas = perfiles.slice().sort(function (a, b) {
      return (b.progreso.promedio || -1) - (a.progreso.promedio || -1);
    }).map(function (p, i) {
      var celdas = misiones.map(function (m) {
        var det = null;
        p.misiones.forEach(function (x) { if (x.id === m.id) det = x; });
        return '<td class="num">' + (det && det.promedio !== null ? PD.fmt.numero(det.promedio, 1) : '—') + '</td>';
      }).join('');
      return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(p.nombre) + '</td>' +
        '<td>' + esc(p.curso) + '</td>' + celdas +
        '<td class="num"><strong>' + PD.fmt.nota(p.progreso.promedio) + '</strong></td>' +
        '<td>' + Pz().marcaNivel(p.progreso.nivel) + '</td></tr>';
    }).join('');

    return '<div class="tabla-envoltorio"><table class="tabla"><thead><tr>' +
      '<th>#</th><th>Estudiante</th><th>Curso</th>' +
      misiones.map(function (m) {
        return '<th class="num" title="' + esc(m.titulo) + '">M' + m.numero + '</th>';
      }).join('') +
      '<th class="num">Promedio</th><th>Nivel</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function informeExcel(perfiles) {
    var misiones = base().misiones;
    var encabezado = ['Puesto', 'Código', 'Estudiante', 'Curso'];
    misiones.forEach(function (m) { encabezado.push('M' + m.numero); });
    encabezado.push('Promedio', 'Nivel', 'Gemas', 'Cristales', 'Runas', 'Lazos', 'Dragones');

    var ordenados = perfiles.slice().sort(function (a, b) {
      return (b.progreso.promedio || -1) - (a.progreso.promedio || -1);
    });
    var filas = [encabezado];
    ordenados.forEach(function (p, i) {
      var fila = [i + 1, p.codigo, p.nombre, p.curso];
      misiones.forEach(function (m) {
        var det = null;
        p.misiones.forEach(function (x) { if (x.id === m.id) det = x; });
        fila.push(det && det.promedio !== null ? det.promedio : '');
      });
      fila.push(p.progreso.promedio, p.progreso.nivel.etiqueta,
        p.progreso.recursos.gemas, p.progreso.recursos.cristales,
        p.progreso.recursos.runas, p.progreso.recursos.lazos, p.dragones.desbloqueados);
      filas.push(fila);
    });

    var b = base();
    var portada = [
      ['Institución', b.institucion.nombre],
      ['Sede', b.institucion.sede],
      ['Jornada', b.institucion.jornada],
      ['Docente', b.institucion.docente],
      ['Año lectivo', b.institucion.anio],
      ['Periodo', estado.periodo ? ('Periodo ' + estado.periodo) : 'Consolidado del año'],
      ['Generado', new Date().toLocaleString('es-CO')]
    ];
    PD.docs.excel([
      { nombre: 'Informe', filas: filas },
      { nombre: 'Datos', filas: portada }
    ], 'Informe-' + (estado.periodo ? 'P' + estado.periodo : 'anual') + '-' + b.institucion.anio + '.xlsx');
  }

  /** Genera un PDF con el boletín de cada estudiante filtrado. */
  function boletinesEnLote(perfiles) {
    if (!perfiles.length) { PD.tostada('No hay estudiantes en el filtro.', 'error'); return; }
    if (perfiles.length > 60) {
      PD.tostada('Son muchos boletines de una vez; filtra por grupo para no bloquear el navegador.', 'error', 6000);
      return;
    }
    var oculto = document.createElement('div');
    oculto.style.cssText = 'position:fixed;left:-10000px;top:0;width:816px';
    document.body.appendChild(oculto);
    var nodos = perfiles.map(function (p) {
      var caja = document.createElement('div');
      caja.innerHTML = PD.docs.boletinHtml(p, { periodo: estado.periodo });
      oculto.appendChild(caja);
      return caja.firstElementChild;
    });
    PD.tostada('Generando ' + nodos.length + ' boletines…', 'info', 4000);
    PD.docs.pdfDeNodos(nodos, 'Boletines-' +
      (estado.periodo ? 'P' + estado.periodo : 'anual') + '.pdf', { escala: 1.5 })
      .then(function () { document.body.removeChild(oculto); })
      .catch(function () { document.body.removeChild(oculto); });
  }

  /* ======================================================================== */
  /* 7. Escarapelas                                                           */
  /* ======================================================================== */
  /* Tamaños reales de escarapela (milímetros). El de la vista se dibuja con
     la misma proporción, así lo que se ve es lo que sale impreso. */
  var TAMANOS_ESC = {
    cr80: { nombre: 'Carné CR80 · 54 × 86 mm', ancho: 54, alto: 86 },
    colgante: { nombre: 'Colgante escolar · 86 × 120 mm', ancho: 86, alto: 120 },
    grande: { nombre: 'Grande · 100 × 140 mm', ancho: 100, alto: 140 }
  };

  function tamanoEsc() {
    return TAMANOS_ESC[estado.escarapelas.tamano] || TAMANOS_ESC.cr80;
  }

  var vistaEscarapelas = {
    titulo: 'Escarapelas',
    subtitulo: function () {
      var t = tamanoEsc();
      return perfilesFiltrados().length + ' credenciales · ' + t.ancho + ' × ' + t.alto + ' mm';
    },
    html: function () {
      var perfiles = perfilesFiltrados();
      var t = tamanoEsc();
      var anchoPx = 320;
      var altoPx = Math.round(anchoPx * t.alto / t.ancho);

      var tarjetas = perfiles.map(function (p) {
        return '<div class="escarapela-lote' + (estado.escarapelas.reverso ? ' mostrar-reverso' : '') +
          '" data-codigo="' + esc(p.codigo) + '" ' +
          'style="width:' + anchoPx + 'px;height:' + altoPx + 'px;' +
          '--esc-ancho-px:' + anchoPx + 'px;--esc-alto-px:' + altoPx + 'px">' +
          PD.docs.escarapelaHtml(p, {}) + '</div>';
      }).join('');

      var selectorTamano = '<label class="filtro"><span>Tamaño de impresión</span>' +
        '<select class="control" data-accion="esc-tamano" style="min-width:210px">' +
        Object.keys(TAMANOS_ESC).map(function (k) {
          return '<option value="' + k + '"' + (estado.escarapelas.tamano === k ? ' selected' : '') +
            '>' + esc(TAMANOS_ESC[k].nombre) + '</option>';
        }).join('') + '</select></label>';

      return Pz().tarjeta({
        cuerpo: '<div class="barra-tareas">' +
          '<div class="filtros">' +
          selectorGrados(estado.filtros.grado_id, 'f-grado') +
          selectorGrupos(estado.filtros.grado_id, estado.filtros.grupo_id, 'f-grupo') +
          selectorTamano +
          '<label class="filtro"><span>Buscar</span><input class="control" type="search" ' +
          'data-accion="f-buscar" placeholder="Nombre o código…" value="' + esc(estado.filtros.q) + '"></label>' +
          '</div>' +
          '<div class="tarjeta-acciones">' +
          '<button type="button" class="boton boton-mini" data-accion="esc-cara"><i class="fa-solid fa-rotate" aria-hidden="true"></i><span>' +
          (estado.escarapelas.reverso ? 'Ver frente' : 'Ver reverso') + '</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="esc-imprimir"><i class="fa-solid fa-print" aria-hidden="true"></i><span>Imprimir</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="esc-png"><i class="fa-solid fa-image" aria-hidden="true"></i><span>Imagen</span></button>' +
          '<button type="button" class="boton boton-mini boton-oro" data-accion="esc-pdf"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>PDF por lotes</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="esc-html"><i class="fa-solid fa-code" aria-hidden="true"></i><span>HTML interactivo</span></button>' +
          '</div></div>' +
          '<p class="campo-ayuda" style="margin-top:10px">El PDF por lotes acomoda las credenciales ' +
          'a tamaño real (' + t.ancho + ' × ' + t.alto + ' mm) con guías de corte, tantas como quepan ' +
          'en cada hoja carta. La descarga en imagen toma la hoja completa; para una sola credencial, ' +
          'toca la que quieras.</p>'
      }) +
        Pz().tarjeta({
          clase: 'zona-impresion',
          titulo: 'Credenciales', icono: 'fa-address-card',
          sub: (estado.escarapelas.reverso ? 'reverso' : 'frente') + ' · toca una para descargarla en PNG',
          cuerpo: perfiles.length
            ? '<div class="rejilla-escarapelas" id="rejilla-escarapelas" ' +
              'style="--esc-ancho:' + t.ancho + 'mm;--esc-alto:' + t.alto + 'mm">' + tarjetas + '</div>'
            : Pz().vacio('No hay estudiantes con esos filtros.', 'fa-address-card')
        });
    },
    luego: function () {
      enlazarFiltros();
      var t = tamanoEsc();

      var selTamano = PD.$('[data-accion="esc-tamano"]');
      if (selTamano) selTamano.addEventListener('change', function () {
        estado.escarapelas.tamano = selTamano.value;
        pintar();
      });

      atajo('esc-cara', function () {
        estado.escarapelas.reverso = !estado.escarapelas.reverso;
        pintar();
      });
      atajo('esc-imprimir', function () { PD.docs.imprimir('.zona-impresion'); });

      atajo('esc-png', function () {
        PD.docs.aPng(PD.$('#rejilla-escarapelas'),
          'Escarapelas-' + (estado.escarapelas.reverso ? 'reverso' : 'frente') + '.png', 1.2);
      });

      atajo('esc-pdf', function () {
        var tarjetas = PD.$$('.escarapela-lote');
        if (!tarjetas.length) { PD.tostada('No hay escarapelas para exportar.', 'error'); return; }
        PD.docs.pdfCuadricula(tarjetas, {
          ancho: t.ancho,
          alto: t.alto,
          escala: 2,
          nombre: 'Escarapelas-' + t.ancho + 'x' + t.alto + 'mm.pdf'
        });
      });

      atajo('esc-html', function () {
        PD.docs.htmlAutonomo(PD.$('#rejilla-escarapelas'), 'Escarapelas.html',
          'Escarapelas · ' + (base().institucion.nombre || 'Crónicas de los 12 Dragones'),
          { interactivo: true, girable: true });
      });

      PD.$$('.escarapela-lote').forEach(function (tarjeta) {
        tarjeta.addEventListener('click', function () {
          PD.docs.aPng(tarjeta, 'Escarapela-' + tarjeta.getAttribute('data-codigo') +
            (estado.escarapelas.reverso ? '-reverso' : '') + '.png');
        });
      });
    }
  };

  /* ======================================================================== */
  /* 8. Datos institucionales                                                 */
  /* ======================================================================== */
  var vistaInstitucion = {
    titulo: 'Datos institucionales',
    subtitulo: function () { return 'Se guardan solos y salen en boletines y escarapelas'; },
    html: function () {
      var b = base();
      var i = b.institucion;
      var enlaces = b.enlaces || { recursos: '', examenes: '', ejes: '', gamificacion: '' };
      return Pz().tarjeta({
        titulo: 'Institución', icono: 'fa-school',
        sub: 'aparece en el encabezado de los documentos',
        cuerpo: '<form class="formulario" id="form-institucion">' +
          '<div class="formulario-fila">' +
          campoLargo('Nombre de la institución educativa', 'nombre', i.nombre) +
          campoLargo('Sede', 'sede', i.sede) +
          '</div>' +
          '<div class="formulario-fila">' +
          campoLargo('Jornada', 'jornada', i.jornada) +
          campoLargo('Docente responsable', 'docente', i.docente) +
          campoLargo('Año lectivo', 'anio', i.anio) +
          '</div>' +
          '<label class="interruptor"><input type="checkbox" name="mostrarNombres"' +
          (b.mostrarNombres !== false ? ' checked' : '') + '>' +
          '<span>Mostrar nombres completos en el ranking de los estudiantes</span></label>' +
          '</form>'
      }) +
        Pz().tarjeta({
          titulo: 'Enlaces del portal', icono: 'fa-link',
          sub: 'los cuatro botones externos de la pantalla de inicio; si un enlace ' +
            'queda vacío, el botón explica que aún no se ha configurado',
          cuerpo: '<form class="formulario" id="form-enlaces">' +
            campoLargo('Recursos didácticos (URL)', 'recursos', enlaces.recursos,
              'Ej: https://sites.google.com/…  ·  déjalo vacío mientras no exista') +
            campoLargo('Portal de exámenes (URL)', 'examenes', enlaces.examenes,
              'Ej: https://examenes.tucolegio.edu.co') +
            campoLargo('Ejes temáticos (URL)', 'ejes', enlaces.ejes,
              'La malla o los ejes de cada periodo') +
            campoLargo('Gamificación (URL)', 'gamificacion', enlaces.gamificacion,
              'Manual del juego, retos o tablero de premios') +
            '</form>'
        }) +
        Pz().tarjeta({
          titulo: 'Reglas del sistema', icono: 'fa-scale-balanced',
          sub: 'fijas para todo el colegio',
          cuerpo: escalaHtml() +
            '<div class="rejilla rejilla-3" style="margin-top:16px">' +
            [['24 misiones', '6 por cada periodo, 4 periodos'],
              ['Recursos = nota × 10', 'gemas, cristales, runas y lazos'],
              ['2.040 gemas', 'despiertan a ELEMENTUM'],
              ['Promedio', 'solo con las actividades desarrolladas']].map(function (x) {
              return '<div class="marcador"><div class="marcador-valor" style="font-size:16px">' +
                esc(x[0]) + '</div><div class="marcador-etq">' + esc(x[1]) + '</div></div>';
            }).join('') + '</div>'
        });
    },
    luego: function () {
      var form = PD.$('#form-institucion');
      var enlaces = PD.$('#form-enlaces');
      function guardar() {
        PD.base.guardarInstitucion({
          nombre: form.nombre.value,
          sede: form.sede.value,
          jornada: form.jornada.value,
          docente: form.docente.value,
          anio: form.anio.value,
          mostrarNombres: form.mostrarNombres.checked,
          enlaces: {
            recursos: enlaces.recursos.value,
            examenes: enlaces.examenes.value,
            ejes: enlaces.ejes.value,
            gamificacion: enlaces.gamificacion.value
          }
        });
      }
      PD.$$('input', form).forEach(function (campo) {
        campo.addEventListener('change', guardar);
        campo.addEventListener('input', PD.debounce(guardar, 900));
      });
      PD.$$('input', enlaces).forEach(function (campo) {
        campo.addEventListener('change', guardar);
        campo.addEventListener('input', PD.debounce(guardar, 900));
      });
    }
  };

  function campoLargo(etiqueta, nombre, valor, ayuda) {
    return '<label class="campo"><span class="campo-etiqueta">' + esc(etiqueta) + '</span>' +
      '<input type="text" name="' + nombre + '" value="' + esc(valor || '') + '" maxlength="160" autocomplete="off">' +
      (ayuda ? '<span class="campo-ayuda">' + esc(ayuda) + '</span>' : '') + '</label>';
  }

  /* ======================================================================== */
  /* 9. Respaldos                                                             */
  /* ======================================================================== */
  var vistaRespaldos = {
    titulo: 'Respaldos y copias',
    subtitulo: function () {
      return PD.base.conServidor()
        ? 'Se guardan en data/respaldos/ de esta misma carpeta'
        : 'Sin servidor: las copias se descargan como archivo';
    },
    html: function () {
      var s = PD.base.servidor;
      var b = base();
      var estadoAlmacen = s.activo && s.escritura
        ? '<div class="aviso-linea ok"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>' +
          '<div><strong>Guardado automático activo.</strong> Los cambios se escriben en ' +
          '<code>data/base.json</code>, dentro de la carpeta del sitio' +
          (s.carpeta ? ' (<code>' + esc(s.carpeta) + '</code>)' : '') + '. ' +
          'Además se conserva una copia en este navegador.</div></div>'
        : '<div class="aviso-linea"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' +
          '<div><strong>Los cambios se están guardando solo en este navegador.</strong><br>' +
          esc(PD.base.motivoTexto()) +
          '<div class="tarjeta-acciones" style="margin-top:10px">' +
          '<button type="button" class="boton boton-mini" data-accion="comprobar-servidor">' +
          '<i class="fa-solid fa-rotate" aria-hidden="true"></i><span>Volver a comprobar</span></button>' +
          '</div></div></div>';

      var lista = (s.respaldos || []).map(function (r) {
        return '<div class="respaldo">' +
          '<i class="fa-solid fa-file-shield" aria-hidden="true"></i>' +
          '<div class="respaldo-datos"><div class="respaldo-nombre">' + esc(r.nombre) + '</div>' +
          '<div class="respaldo-meta">' + esc(r.fecha) + ' · ' + Math.round(r.bytes / 1024) + ' KB</div></div>' +
          '<div class="acciones-fila">' +
          '<button type="button" class="boton-icono" data-restaurar="' + esc(r.nombre) + '" title="Restaurar"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i></button>' +
          '<a class="boton-icono" href="data/respaldos/' + encodeURIComponent(r.nombre) + '" download title="Descargar"><i class="fa-solid fa-download" aria-hidden="true"></i></a>' +
          '<button type="button" class="boton-icono peligro" data-borrar="' + esc(r.nombre) + '" title="Borrar"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
          '</div></div>';
      }).join('');

      return Pz().tarjeta({
        titulo: 'Dónde se guardan los datos', icono: 'fa-database',
        cuerpo: estadoAlmacen +
          '<div class="rejilla rejilla-3" style="margin-top:16px">' +
          '<div class="marcador"><div class="marcador-valor">' + b.estudiantes.length + '</div><div class="marcador-etq">Estudiantes</div></div>' +
          '<div class="marcador"><div class="marcador-valor">' +
          b.estudiantes.reduce(function (s2, e) { return s2 + e.registros.length; }, 0) +
          '</div><div class="marcador-etq">Misiones registradas</div></div>' +
          '<div class="marcador"><div class="marcador-valor" style="font-size:15px">' +
          esc(b.actualizado || '—') + '</div><div class="marcador-etq">Último guardado</div></div>' +
          '</div>',
        acciones: '<button type="button" class="boton boton-mini boton-oro" data-accion="respaldo-crear">' +
          '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Crear respaldo</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="respaldo-descargar">' +
          '<i class="fa-solid fa-download" aria-hidden="true"></i><span>Descargar copia</span></button>' +
          '<button type="button" class="boton boton-mini" data-accion="respaldo-importar">' +
          '<i class="fa-solid fa-upload" aria-hidden="true"></i><span>Restaurar desde archivo</span></button>'
      }) +
        Pz().tarjeta({
          titulo: 'Respaldos guardados', icono: 'fa-clock-rotate-left',
          sub: (s.respaldos || []).length + ' copias · se conservan las 30 más recientes',
          cuerpo: lista ? '<div class="lista-respaldos">' + lista + '</div>'
            : Pz().vacio(s.activo ? 'Todavía no hay respaldos guardados.'
              : 'Los respaldos en carpeta necesitan el servidor local.', 'fa-clock-rotate-left')
        }) +
        Pz().tarjeta({
          titulo: 'Traer datos del Panel del Maestro (escritorio)', icono: 'fa-file-import',
          cuerpo: '<p class="tarjeta-sub">Si sigues usando el programa de escritorio, ejecuta allí ' +
            '<code>Actualizar datos.bat</code> y luego pulsa este botón: la Academia vuelve a leer ' +
            '<code>data/datos.js</code>. <strong>Reemplaza los estudiantes y las notas de esta web</strong> ' +
            '(los datos del colegio y los enlaces se conservan).</p>',
          acciones: '<button type="button" class="boton boton-mini" data-accion="reimportar">' +
            '<i class="fa-solid fa-rotate" aria-hidden="true"></i><span>Recargar desde data/datos.js</span></button>'
        }) +
        Pz().tarjeta({
          titulo: 'Zona delicada', icono: 'fa-triangle-exclamation',
          cuerpo: '<p class="tarjeta-sub">Borra todos los estudiantes y sus notas. Los 12 dragones, ' +
            'las 24 misiones y los datos de la institución se conservan.</p>',
          acciones: '<button type="button" class="boton boton-mini" data-accion="borrar-todo" ' +
            'style="border-color:var(--bajo);color:var(--bajo)">' +
            '<i class="fa-solid fa-eraser" aria-hidden="true"></i><span>Vaciar estudiantes</span></button>'
        });
    },
    luego: function () {
      atajo('respaldo-crear', function () {
        PD.base.crearRespaldo('manual').then(function (nombre) {
          PD.tostada('Respaldo creado: ' + nombre, 'ok');
          pintar();
        }).catch(function () {
          PD.tostada('Sin servidor local no se puede escribir en la carpeta; se descarga una copia.', 'info', 5000);
          PD.base.descargarCopia();
        });
      });
      atajo('respaldo-descargar', function () {
        var nombre = PD.base.descargarCopia();
        PD.tostada(nombre ? 'Copia descargada: ' + nombre : 'No se pudo descargar.', nombre ? 'ok' : 'error');
      });
      atajo('respaldo-importar', importarCopia);
      atajo('comprobar-servidor', function () {
        PD.base.consultarServidor().then(function (hay) {
          if (hay) {
            PD.base.guardarYa();
            PD.tostada('Servidor local detectado: a partir de ahora se guarda en la carpeta.', 'ok', 5000);
          } else {
            PD.tostada(PD.base.motivoTexto(), 'error', 7000);
          }
          pintar();
        });
      });
      atajo('reimportar', function () {
        confirmar({
          titulo: 'Recargar desde data/datos.js',
          texto: 'Se reemplazarán los estudiantes y las notas de la Academia por los del archivo ' +
            'exportado del Panel del Maestro. Conviene crear antes un respaldo.',
          'botón': 'Recargar'
        }).then(function (si) {
          if (!si) return;
          PD.base.reimportarSemilla().then(function () {
            PD.tostada('Datos recargados desde data/datos.js', 'ok');
            pintar();
          }).catch(function (e) {
            PD.tostada('No se pudo leer la semilla: ' + e.message, 'error', 5000);
          });
        });
      });
      atajo('borrar-todo', function () {
        confirmar({
          titulo: 'Vaciar la lista de estudiantes',
          texto: 'Se borrarán <strong>todos los estudiantes y sus notas</strong>. ' +
            'Antes de continuar conviene crear un respaldo.',
          'botón': 'Sí, vaciar',
          peligro: true
        }).then(function (si) {
          if (!si) return;
          base().estudiantes = [];
          PD.base.guardar('vaciar');
          PD.tostada('Lista vaciada.', 'ok');
          pintar();
        });
      });

      PD.$$('[data-restaurar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var nombre = b.getAttribute('data-restaurar');
          confirmar({
            titulo: 'Restaurar respaldo',
            texto: 'Se reemplazarán los datos actuales por los de <strong>' + esc(nombre) +
              '</strong>. Antes de reemplazar se guarda un respaldo del estado actual.',
            'botón': 'Restaurar'
          }).then(function (si) {
            if (!si) return;
            PD.base.restaurar(nombre).then(function () {
              PD.tostada('Respaldo restaurado.', 'ok');
              pintar();
            }).catch(function (e) { PD.tostada('No se pudo restaurar: ' + e.message, 'error'); });
          });
        });
      });

      PD.$$('[data-borrar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var nombre = b.getAttribute('data-borrar');
          confirmar({
            titulo: 'Borrar respaldo',
            texto: 'Se eliminará el archivo <strong>' + esc(nombre) + '</strong>.',
            'botón': 'Borrar',
            peligro: true
          }).then(function (si) {
            if (!si) return;
            PD.base.borrarRespaldo(nombre).then(function () {
              PD.tostada('Respaldo borrado.', 'ok');
              pintar();
            }).catch(function (e) { PD.tostada('No se pudo borrar: ' + e.message, 'error'); });
          });
        });
      });
    }
  };

  function importarCopia() {
    var entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = '.json';
    entrada.addEventListener('change', function () {
      var f = entrada.files[0];
      if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          PD.base.importarCopia(String(lector.result));
          PD.tostada('Copia restaurada.', 'ok');
          pintar();
        } catch (e) {
          PD.tostada('Archivo no válido: ' + e.message, 'error', 5000);
        }
      };
      lector.readAsText(f, 'utf-8');
    });
    entrada.click();
  }

  /* ======================================================================== */
  /* Registro de vistas y pintado                                             */
  /* ======================================================================== */
  var vistas = {
    panel: vistaPanel,
    estudiantes: vistaEstudiantes,
    calificaciones: vistaCalificaciones,
    estadisticas: vistaEstadisticas,
    ranking: vistaRanking,
    boletines: vistaBoletines,
    escarapelas: vistaEscarapelas,
    institucion: vistaInstitucion,
    respaldos: vistaRespaldos
  };

  function pintar(opciones) {
    var o = opciones || {};
    var vista = vistas[estado.vista] || vistas.panel;
    PD.graficas.limpiarTodo();

    PD.$('#titulo-tutor').textContent = vista.titulo;
    PD.$('#subtitulo-tutor').textContent =
      typeof vista.subtitulo === 'function' ? vista.subtitulo() : (vista.subtitulo || '');

    var main = PD.$('#vista-tutor');
    main.innerHTML = vista.html();

    PD.$$('#nav-tutor .nav-item').forEach(function (a) {
      a.classList.toggle('activo', a.getAttribute('data-vista') === estado.vista);
    });

    if (typeof vista.luego === 'function') vista.luego();

    PD.$$('[data-animar]', main).forEach(function (el) {
      var crudo = el.getAttribute('data-animar');
      if (crudo === '' || crudo === null) { el.textContent = '—'; return; }
      PD.animarNumero(el, parseFloat(crudo), {
        decimales: parseInt(el.getAttribute('data-decimales'), 10) || 0,
        sufijo: el.getAttribute('data-sufijo') || ''
      });
    });
    PD.animarBarras(main);
    actualizarPie();

    if (o.mantenerFoco) {
      var campo = PD.$(o.mantenerFoco);
      if (campo) {
        campo.focus();
        if (campo.setSelectionRange && campo.value) {
          campo.setSelectionRange(campo.value.length, campo.value.length);
        }
      }
    }
  }

  function actualizarPie() {
    var b = base();
    var firma = PD.$('#firma-tutor');
    if (firma) {
      firma.innerHTML = esc(b.institucion.nombre || 'Sin institución') + '<br>' +
        esc(b.institucion.docente || '') + '<br>Año ' + esc(b.institucion.anio || '');
    }
    var pastilla = PD.$('#pastilla-almacen');
    if (pastilla) {
      var enServidor = PD.base.conServidor();
      pastilla.innerHTML = '<i class="fa-solid ' + (enServidor ? 'fa-folder-open' : 'fa-laptop') +
        '" aria-hidden="true"></i>' + (enServidor ? 'data/base.json' : 'Solo este navegador');
      pastilla.className = 'pastilla ' + (enServidor ? 'pastilla-oro' : 'pastilla-aviso');
      pastilla.title = enServidor
        ? 'Los cambios se guardan en ' + (PD.base.servidor.carpeta || 'la carpeta del sitio')
        : PD.base.motivoTexto();
    }
  }

  /* --- Indicador de guardado --------------------------------------------- */
  document.addEventListener('pd:guardado', function (e) {
    var caja = PD.$('#estado-guardado');
    if (!caja) return;
    var mapa = {
      guardando: ['guardando', 'fa-cloud-arrow-up', 'Guardando…'],
      servidor: ['ok', 'fa-circle-check', 'Guardado en la carpeta'],
      local: ['local', 'fa-laptop', 'Guardado en este equipo'],
      error: ['error', 'fa-triangle-exclamation', 'No se pudo guardar']
    };
    var info = mapa[e.detail.estado] || mapa.local;
    caja.className = 'estado-guardado ' + info[0];
    caja.innerHTML = '<i class="fa-solid ' + info[1] + '" aria-hidden="true"></i><span>' + info[2] + '</span>';
  });

  PD.tutor = {
    CODIGO: CODIGO_TUTOR,
    estado: estado,
    vistas: vistas,
    pintar: pintar,
    verificar: function (codigo) {
      return PD.codigoClave(codigo) === PD.codigoClave(CODIGO_TUTOR);
    }
  };

})(window);
