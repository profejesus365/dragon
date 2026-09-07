/* ==========================================================================
   graficas.js · Gráficas del portal
   Usa Chart.js cuando está disponible (CDN). Si no cargó —aula sin internet—
   dibuja la misma información en SVG con un motor propio, para que ninguna
   pantalla quede vacía.
   ========================================================================== */
(function (global) {
  'use strict';

  var PD = global.PD || (global.PD = {});
  var instancias = [];      // {contenedor, grafica, receta}

  function hayChart() { return !!global.Chart; }

  function color(nombre, defecto) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nombre);
    return (v || '').trim() || defecto;
  }

  function tinte(hex, alfa) {
    var h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return hex;
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alfa + ')';
  }

  function paleta() {
    return {
      texto: color('--suave', '#9db0d2'),
      tenue: color('--tenue', '#6b7fa6'),
      rejilla: tinte(color('--borde', '#243352'), .55),
      oro: color('--oro', '#d4af37'),
      cian: color('--cian', '#22d3ee'),
      violeta: color('--violeta', '#a78bfa'),
      gemas: color('--gemas', '#a78bfa'),
      cristales: color('--cristales', '#22d3ee'),
      runas: color('--runas', '#f59e0b'),
      lazos: color('--lazos', '#34d399'),
      panel: color('--panel', '#111b31')
    };
  }

  function limpiar(contenedor) {
    instancias = instancias.filter(function (i) {
      if (i.contenedor !== contenedor) return true;
      if (i.grafica && i.grafica.destroy) { try { i.grafica.destroy(); } catch (e) { /* ya destruida */ } }
      return false;
    });
    contenedor.innerHTML = '';
  }

  /** Borra todas las gráficas (al cambiar de vista). */
  function limpiarTodo() {
    instancias.forEach(function (i) {
      if (i.grafica && i.grafica.destroy) { try { i.grafica.destroy(); } catch (e) { /* ya destruida */ } }
    });
    instancias = [];
  }

  /* ====================================================== Chart.js ======= */
  function opcionesBase(p, receta) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 900, easing: 'easeOutCubic' },
      plugins: {
        legend: {
          display: receta.leyenda !== false,
          labels: { color: p.texto, boxWidth: 12, boxHeight: 12, usePointStyle: true, padding: 14 }
        },
        tooltip: {
          backgroundColor: tinte(p.panel, .96),
          borderColor: p.rejilla,
          borderWidth: 1,
          titleColor: color('--texto', '#e9eefb'),
          bodyColor: p.texto,
          padding: 10,
          displayColors: true
        }
      }
    };
  }

  function ejes(p, receta) {
    return {
      x: {
        ticks: { color: p.tenue, font: { size: 11 } },
        grid: { color: p.rejilla, drawBorder: false }
      },
      y: {
        beginAtZero: true,
        suggestedMax: receta.max,
        ticks: { color: p.tenue, font: { size: 11 }, precision: receta.decimales === 0 ? 0 : undefined },
        grid: { color: p.rejilla, drawBorder: false }
      }
    };
  }

  function conChart(contenedor, tipo, receta) {
    var p = paleta();
    var lienzo = document.createElement('canvas');
    contenedor.appendChild(lienzo);

    var datos = {
      labels: receta.etiquetas,
      datasets: receta.series.map(function (s, i) {
        var c = s.color || [p.oro, p.cian, p.violeta, p.lazos][i % 4];
        var base = {
          label: s.nombre,
          data: s.datos,
          borderColor: c,
          backgroundColor: tipo === 'line' ? tinte(c, .16)
            : (tipo === 'radar' ? tinte(c, .22) : (s.colores || tinte(c, .8))),
          borderWidth: tipo === 'bar' ? 0 : 2,
          borderRadius: tipo === 'bar' ? 7 : undefined,
          maxBarThickness: 46,
          tension: .35,
          fill: tipo === 'line' || tipo === 'radar',
          pointBackgroundColor: c,
          pointBorderColor: tinte(p.panel, 1),
          pointRadius: tipo === 'line' || tipo === 'radar' ? 4 : 0,
          pointHoverRadius: 6
        };
        if (tipo === 'doughnut') {
          base.backgroundColor = receta.colores || [p.oro, p.cian, p.violeta, p.lazos];
          base.borderColor = tinte(p.panel, 1);
          base.borderWidth = 3;
          base.hoverOffset = 8;
        }
        return base;
      })
    };

    var opciones = opcionesBase(p, receta);
    if (tipo === 'bar' || tipo === 'line') {
      opciones.scales = ejes(p, receta);
      if (receta.horizontal) opciones.indexAxis = 'y';
    } else if (tipo === 'radar') {
      opciones.scales = {
        r: {
          beginAtZero: true,
          suggestedMax: receta.max || 10,
          angleLines: { color: p.rejilla },
          grid: { color: p.rejilla },
          pointLabels: { color: p.texto, font: { size: 11.5 } },
          ticks: { display: false, stepSize: 2 }
        }
      };
    } else if (tipo === 'doughnut') {
      opciones.cutout = '68%';
    }

    var g = new global.Chart(lienzo, { type: tipo, data: datos, options: opciones });
    instancias.push({ contenedor: contenedor, grafica: g, receta: { tipo: tipo, receta: receta } });
    return g;
  }

  /* ================================================ Respaldo en SVG ===== */
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function texto(x, y, contenido, opciones) {
    var o = opciones || {};
    var t = svg('text', {
      x: x, y: y,
      fill: o.color || paleta().tenue,
      'font-size': o.tamano || 11,
      'text-anchor': o.anclaje || 'middle',
      'font-family': 'Outfit, system-ui, sans-serif'
    });
    t.textContent = contenido;
    return t;
  }

  function lienzoSvg(contenedor, ancho, alto) {
    var s = svg('svg', {
      viewBox: '0 0 ' + ancho + ' ' + alto,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img'
    });
    contenedor.appendChild(s);
    return s;
  }

  function svgBarras(contenedor, receta) {
    var p = paleta(), W = 640, H = 300, mI = 44, mD = 12, mS = 18, mB = 42;
    var s = lienzoSvg(contenedor, W, H);
    var etiquetas = receta.etiquetas, series = receta.series;
    var max = receta.max || Math.max.apply(null, [1].concat(
      series.reduce(function (a, x) { return a.concat(x.datos.map(function (v) { return v || 0; })); }, [])));
    max = max * 1.08;
    var anchoUtil = W - mI - mD, altoUtil = H - mS - mB;

    for (var g = 0; g <= 4; g++) {
      var y = mS + altoUtil * g / 4;
      s.appendChild(svg('line', { x1: mI, y1: y, x2: W - mD, y2: y, stroke: p.rejilla, 'stroke-width': 1 }));
      s.appendChild(texto(mI - 8, y + 4, PD.fmt.numero(max * (1 - g / 4), receta.decimales === 0 ? 0 : 1),
        { anclaje: 'end', color: p.tenue, tamano: 10 }));
    }

    var paso = anchoUtil / Math.max(1, etiquetas.length);
    var anchoBarra = Math.min(38, (paso * .74) / series.length);
    etiquetas.forEach(function (etq, i) {
      var centro = mI + paso * (i + .5);
      series.forEach(function (serie, j) {
        var v = serie.datos[i] || 0;
        var h = Math.max(0, altoUtil * (v / max));
        var x = centro - (anchoBarra * series.length) / 2 + anchoBarra * j;
        var c = (serie.colores && serie.colores[i % serie.colores.length]) ||
          serie.color || [p.oro, p.cian, p.violeta, p.lazos][j % 4];
        var rect = svg('rect', {
          x: x, y: mS + altoUtil - h, width: Math.max(2, anchoBarra - 3), height: h,
          rx: 5, fill: c, opacity: .88
        });
        var anim = svg('animate', {
          attributeName: 'height', from: 0, to: h, dur: '.7s', fill: 'freeze'
        });
        var anim2 = svg('animate', {
          attributeName: 'y', from: mS + altoUtil, to: mS + altoUtil - h, dur: '.7s', fill: 'freeze'
        });
        rect.appendChild(anim); rect.appendChild(anim2);
        s.appendChild(rect);
      });
      s.appendChild(texto(centro, H - mB + 20, etq, { color: p.tenue, tamano: 11 }));
    });
    leyendaSvg(s, series, W, H, p);
    return s;
  }

  function svgLineas(contenedor, receta) {
    var p = paleta(), W = 640, H = 300, mI = 44, mD = 14, mS = 18, mB = 42;
    var s = lienzoSvg(contenedor, W, H);
    var etiquetas = receta.etiquetas;
    var max = receta.max || 10;
    var anchoUtil = W - mI - mD, altoUtil = H - mS - mB;

    for (var g = 0; g <= 4; g++) {
      var y = mS + altoUtil * g / 4;
      s.appendChild(svg('line', { x1: mI, y1: y, x2: W - mD, y2: y, stroke: p.rejilla, 'stroke-width': 1 }));
      s.appendChild(texto(mI - 8, y + 4, PD.fmt.numero(max * (1 - g / 4), 1), { anclaje: 'end', tamano: 10 }));
    }

    var paso = etiquetas.length > 1 ? anchoUtil / (etiquetas.length - 1) : 0;
    receta.series.forEach(function (serie, j) {
      var c = serie.color || [p.oro, p.cian, p.violeta, p.lazos][j % 4];
      var puntos = [];
      serie.datos.forEach(function (v, i) {
        if (v === null || v === undefined) return;
        puntos.push([mI + paso * i, mS + altoUtil * (1 - v / max)]);
      });
      if (!puntos.length) return;
      var d = puntos.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0] + ' ' + pt[1]; }).join(' ');
      var area = d + ' L' + puntos[puntos.length - 1][0] + ' ' + (mS + altoUtil) +
                 ' L' + puntos[0][0] + ' ' + (mS + altoUtil) + ' Z';
      s.appendChild(svg('path', { d: area, fill: tinte(c, .14), stroke: 'none' }));
      s.appendChild(svg('path', { d: d, fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
      puntos.forEach(function (pt) {
        s.appendChild(svg('circle', { cx: pt[0], cy: pt[1], r: 4, fill: c, stroke: p.panel, 'stroke-width': 2 }));
      });
    });
    etiquetas.forEach(function (etq, i) {
      s.appendChild(texto(mI + paso * i, H - mB + 20, etq, { tamano: 11 }));
    });
    leyendaSvg(s, receta.series, W, H, p);
    return s;
  }

  function svgRadar(contenedor, receta) {
    var p = paleta(), W = 420, H = 300, cx = W / 2, cy = H / 2 - 6, radio = 104;
    var s = lienzoSvg(contenedor, W, H);
    var n = receta.etiquetas.length, max = receta.max || 10;

    function punto(i, valor) {
      var ang = (Math.PI * 2 * i / n) - Math.PI / 2;
      var r = radio * Math.max(0, Math.min(1, (valor || 0) / max));
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    }
    for (var anillo = 1; anillo <= 4; anillo++) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(punto(i, max * anillo / 4).join(','));
      s.appendChild(svg('polygon', { points: pts.join(' '), fill: 'none', stroke: p.rejilla, 'stroke-width': 1 }));
    }
    for (var k = 0; k < n; k++) {
      var borde = punto(k, max);
      s.appendChild(svg('line', { x1: cx, y1: cy, x2: borde[0], y2: borde[1], stroke: p.rejilla }));
      var etq = punto(k, max * 1.2);
      s.appendChild(texto(etq[0], etq[1] + 4, receta.etiquetas[k], { tamano: 10.5, color: p.texto }));
    }
    receta.series.forEach(function (serie, j) {
      var c = serie.color || [p.oro, p.cian][j % 2];
      var pts = serie.datos.map(function (v, i) { return punto(i, v).join(','); });
      s.appendChild(svg('polygon', {
        points: pts.join(' '), fill: tinte(c, .2), stroke: c, 'stroke-width': 2.2
      }));
      serie.datos.forEach(function (v, i) {
        var pt = punto(i, v);
        s.appendChild(svg('circle', { cx: pt[0], cy: pt[1], r: 3.4, fill: c }));
      });
    });
    leyendaSvg(s, receta.series, W, H, p);
    return s;
  }

  function svgDona(contenedor, receta) {
    var p = paleta(), W = 340, H = 300, cx = 150, cy = 140, R = 100, r = 66;
    var s = lienzoSvg(contenedor, W, H);
    var total = receta.datos.reduce(function (a, b) { return a + (b || 0); }, 0) || 1;
    var colores = receta.colores || [p.oro, p.cian, p.violeta, p.lazos];
    var angulo = -Math.PI / 2;

    receta.datos.forEach(function (v, i) {
      var porcion = (v || 0) / total;
      if (porcion <= 0) return;
      var fin = angulo + porcion * Math.PI * 2;
      var grande = porcion > .5 ? 1 : 0;
      var x1 = cx + Math.cos(angulo) * R, y1 = cy + Math.sin(angulo) * R;
      var x2 = cx + Math.cos(fin) * R, y2 = cy + Math.sin(fin) * R;
      var x3 = cx + Math.cos(fin) * r, y3 = cy + Math.sin(fin) * r;
      var x4 = cx + Math.cos(angulo) * r, y4 = cy + Math.sin(angulo) * r;
      var d = 'M' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + grande + ' 1 ' + x2 + ' ' + y2 +
              ' L' + x3 + ' ' + y3 + ' A' + r + ' ' + r + ' 0 ' + grande + ' 0 ' + x4 + ' ' + y4 + ' Z';
      s.appendChild(svg('path', { d: d, fill: colores[i % colores.length], opacity: .9 }));
      angulo = fin;
    });

    if (receta.centro) {
      s.appendChild(texto(cx, cy + 2, receta.centro, { tamano: 26, color: color('--texto', '#e9eefb') }));
      if (receta.centroSub) s.appendChild(texto(cx, cy + 22, receta.centroSub, { tamano: 11 }));
    }
    receta.etiquetas.forEach(function (etq, i) {
      var y = 40 + i * 22;
      s.appendChild(svg('rect', { x: 258, y: y - 9, width: 11, height: 11, rx: 3, fill: colores[i % colores.length] }));
      s.appendChild(texto(276, y, etq, { anclaje: 'start', tamano: 11, color: p.texto }));
    });
    return s;
  }

  function leyendaSvg(s, series, W, H, p) {
    if (!series || series.length < 2) return;
    var x = 14;
    series.forEach(function (serie, j) {
      var c = serie.color || [p.oro, p.cian, p.violeta, p.lazos][j % 4];
      s.appendChild(svg('rect', { x: x, y: H - 14, width: 11, height: 11, rx: 3, fill: c }));
      var t = texto(x + 17, H - 5, serie.nombre, { anclaje: 'start', tamano: 11, color: p.texto });
      s.appendChild(t);
      x += 26 + String(serie.nombre).length * 6.4;
    });
  }

  /* ================================================== API pública ======= */
  function dibujar(tipo, contenedor, receta) {
    if (!contenedor) return null;
    limpiar(contenedor);
    receta.series = receta.series || [];
    try {
      if (hayChart()) return conChart(contenedor, tipo, receta);
    } catch (e) {
      if (global.console) console.warn('Chart.js falló, se usa el respaldo SVG:', e);
      contenedor.innerHTML = '';
    }
    if (tipo === 'bar') return svgBarras(contenedor, receta);
    if (tipo === 'line') return svgLineas(contenedor, receta);
    if (tipo === 'radar') return svgRadar(contenedor, receta);
    if (tipo === 'doughnut') return svgDona(contenedor, receta);
    return null;
  }

  PD.graficas = {
    disponibleChart: hayChart,
    barras: function (c, r) { return dibujar('bar', c, r); },
    lineas: function (c, r) { return dibujar('line', c, r); },
    radar: function (c, r) { return dibujar('radar', c, r); },
    /** La dona recibe {etiquetas, datos, colores, centro}: se arma su serie. */
    dona: function (c, r) {
      var receta = Object.assign({}, r);
      if (!receta.series) receta.series = [{ nombre: receta.titulo || '', datos: receta.datos || [] }];
      return dibujar('doughnut', c, receta);
    },
    limpiarTodo: limpiarTodo,
    color: color,
    tinte: tinte,
    paleta: paleta
  };

})(window);
