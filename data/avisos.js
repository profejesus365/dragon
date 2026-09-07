/* ==========================================================================
   avisos.js  ·  Tablón de avisos del Portal del Guardián
   ESTE ARCHIVO SÍ SE EDITA A MANO. El exportador nunca lo sobrescribe.

   Cada aviso admite:
     fecha    "2026-09-05"          obligatorio (ordena el tablón)
     titulo   texto corto           obligatorio
     texto    cuerpo del aviso      admite varias frases
     tipo     "aviso" | "mision" | "logro" | "urgente"
     para     null                  -> lo ven todos
              {grado: "Quinto"}     -> solo ese grado
              {grupo: "A"}          -> solo ese grupo
              {codigo: "DRG-5A03"}  -> solo ese estudiante (mensaje personal)
   ========================================================================== */
window.PD_AVISOS = [
  {
    fecha: "2026-09-01",
    titulo: "Se abre el Periodo 3 · Elemento Fuego",
    texto: "Ignis, Volcán y Fénix esperan al otro lado de la forja. Las seis " +
           "misiones del periodo estarán disponibles durante las próximas seis " +
           "semanas. Recuerda que la bitácora se entrega el mismo día del taller.",
    tipo: "mision",
    para: null
  },
  {
    fecha: "2026-08-25",
    titulo: "Reto de gemas: 2.040 para despertar a ELEMENTUM",
    texto: "El Gran Dragón Elemental solo despierta cuando el curso completo " +
           "acumula sus gemas. Revisa en la sección Guardianes cuánto te falta " +
           "para tu próximo dragón.",
    tipo: "logro",
    para: null
  },
  {
    fecha: "2026-08-18",
    titulo: "Entrega de bitácoras pendientes",
    texto: "Quienes tengan misiones sin registrar pueden ponerse al día hasta el " +
           "viernes. Después de esa fecha la misión queda cerrada y no suma recursos.",
    tipo: "urgente",
    para: null
  },
  {
    fecha: "2026-08-10",
    titulo: "Bienvenidos al Portal del Guardián",
    texto: "Desde aquí puedes ver tu progreso, tus dragones desbloqueados, tu " +
           "escarapela digital y el ranking del curso. Entra con el mismo código " +
           "que aparece en el Panel del Maestro.",
    tipo: "aviso",
    para: null
  }
];
