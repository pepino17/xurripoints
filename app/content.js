/* ================================================================
   Xurripoints — contenido de los juegos para dos (textos propios).
   Tono: divertido y cariñoso, nunca para dejar mal al otro (docs/PSICOLOGIA.md).
   ================================================================ */

/** "Esto o aquello": cada uno elige en secreto y se ve si coincidís. */
export const THIS_OR_THAT = [
  ['🏖️ Playa', '🏔️ Montaña'], ['🍕 Pizza', '🍣 Sushi'], ['🎬 Pelis', '📺 Series'], ['🌅 Madrugar', '🌙 Trasnochar'],
  ['🍫 Dulce', '🥨 Salado'], ['🐶 Perro', '🐱 Gato'], ['❄️ Invierno', '☀️ Verano'], ['🛋️ Plan en casa', '🎉 Plan fuera'],
  ['💬 Mensaje', '📞 Llamada'], ['☕ Café', '🫖 Té'], ['✈️ Viaje lejos', '🚗 Escapada cerca'], ['👩‍🍳 Cocinar', '🛵 Pedir comida'],
  ['🚿 Ducha', '🛁 Baño'], ['📚 Libro', '🎧 Podcast'], ['🏙️ Ciudad', '🌾 Pueblo'], ['😂 Comedia', '👻 Terror'],
  ['🥐 Desayuno', '🍝 Cena'], ['🎁 Sorpresas', '🗓️ Planes claros'], ['🎮 Videojuegos', '🎲 Juegos de mesa'], ['🌊 Mar', '🏊 Piscina'],
  ['🍳 Huevos fritos', '🍳 Tortilla'], ['🎤 Karaoke', '💃 Bailar'], ['🏕️ Acampar', '🏨 Hotel'], ['🌧️ Día de lluvia en casa', '🌞 Día de sol fuera'],
  ['🎂 Tarta de queso', '🍫 Tarta de chocolate'], ['🧊 Bebida fría', '♨️ Bebida caliente'], ['🗺️ Improvisar', '📋 Organizarlo todo'],
  ['🎶 Música a tope', '🤫 Silencio'], ['🍿 Palomitas dulces', '🧂 Palomitas saladas'], ['🐦 Madrugón con vistas', '😴 Siesta larga'],
];

/** "¿Quién es más probable que…?": a la de tres, los dos señaláis a quién. */
export const WHO_MORE = [
  'se duerma en mitad de una peli', 'se coma lo último de la nevera sin avisar', 'llore con un anuncio',
  'se pierda aunque lleve el GPS', 'le ponga nombre a las plantas', 'cante en la ducha a pleno pulmón',
  'se olvide de dónde ha dejado las llaves', 'organice una fiesta sorpresa', 'se ría en un momento serio',
  'haga la maleta la noche antes', 'hable con las plantas', 'se apunte a un plan improvisado a las 11 de la noche',
  // Nada que toque heridas típicas (discusiones, dinero, decidir a solas): solo risas.
  'se enganche a una serie en un solo día', 'se haga amigo del perro del vecino', 'se quede dormido en el sofá',
  'se compre otra taza con dibujitos', 'haga amigos en la cola del súper', 'se ponga nervioso en una atracción',
  'se acuerde de todos los cumpleaños', 'pruebe la comida más rara del menú', 'baile cuando nadie mira',
  'se lleve mil fotos del mismo sitio', 'cuente el mismo chiste dos veces', 'se emocione en una boda',
  'deje la ropa en la silla "solo un momento"', 'se ofrezca a ayudar a un desconocido', 'tenga hambre a todas horas',
  'aprenda un idioma por su cuenta', 'se levante a por agua a mitad de la noche', 'planee el próximo viaje',
];

/* ---------------- Plus: más cartas y packs de preguntas ----------------
   Mismas reglas que el resto: preguntas amables, para hablar en persona, sin tocar heridas ni comparar. */

/** Cartas extra de "Esto o aquello" (solo con Plus; se suman a las de siempre). */
export const THIS_OR_THAT_PLUS = [
  ['🎡 Feria', '🎭 Teatro'], ['🍦 Helado', '🍰 Pastel'], ['🚲 Bici', '🛶 Kayak'], ['🏛️ Museo', '🌳 Parque'],
  ['📸 Fotos', '🎥 Vídeos'], ['🥘 Paella', '🌮 Tacos'], ['🌄 Amanecer', '🌇 Atardecer'], ['🎹 Piano', '🎸 Guitarra'],
  ['🧩 Puzzle', '🃏 Cartas'], ['🍷 Vino', '🍹 Cóctel'], ['🚂 Tren', '✈️ Avión'], ['🏠 Casa con jardín', '🏙️ Piso en el centro'],
  ['🎄 Navidad', '🎃 Halloween'], ['🧘 Yoga', '🏃 Correr'], ['🥞 Tortitas', '🥐 Cruasán'], ['🐢 Ir con calma', '🐇 Hacerlo todo'],
];

/** Cartas extra de "¿Quién es más probable…?" (solo con Plus). */
export const WHO_MORE_PLUS = [
  'se ponga a bailar en la cocina', 'tenga la idea del próximo plan', 'se acuerde de la letra entera de una canción',
  'haga una foto a la comida antes de comer', 'se emocione con un vídeo de animales', 'pida postre aunque diga que no',
  'convierta un recado en una aventura', 'se ofrezca voluntario en un espectáculo', 'haga reír a un bebé',
  'tenga la mejor idea para un regalo', 'se lleve un recuerdo de cada viaje', 'se sepa el horóscopo del otro',
  'quiera adoptar todos los perros del refugio', 'se ponga el pijama nada más llegar a casa', 'encuentre el mejor sitio para cenar',
];

/** Packs de preguntas para hablar sin móvil (juego «Preguntas para conoceros», Plus). [id, emoji, nombre, preguntas] */
export const QUESTION_PACKS = [
  ['conocer', '💞', 'Conoceros más', [
    '¿Qué es lo primero que haces cuando necesitas desconectar?', '¿Cuál es tu comida de consuelo?',
    '¿Qué te hacía ilusión de pequeño o pequeña y todavía te la hace?', '¿Qué canción pondrías para describir cómo estás hoy?',
    '¿Qué pequeño lujo te darías cada semana si pudieras?', '¿Qué te pone de buen humor sin fallar?',
    '¿Qué cosa te da vergüenza que te guste?', '¿Qué lugar te hace sentir en paz?',
    '¿A qué persona admiras y por qué?', '¿Qué habilidad te gustaría tener de golpe?',
    '¿Qué es lo que más te cuesta pedir?', '¿Cómo es tu domingo ideal, de la mañana a la noche?',
    '¿Qué olor te lleva directo a un recuerdo?', '¿Qué te gustaría que la gente supiera de ti sin tener que contarlo?',
    '¿Qué película has visto más veces?', '¿Qué te hace sentir orgulloso u orgullosa de ti?',
    '¿Qué costumbre de tu familia te gustaría mantener?', '¿Qué te relaja más: hablar, estar en silencio o hacer algo con las manos?',
    '¿Qué es algo que siempre has querido probar y nunca has hecho?', '¿Qué te hace sentir querido o querida de verdad?',
  ]],
  ['futuro', '🌱', 'Sueños y futuro', [
    '¿Dónde te imaginas viviendo dentro de diez años?', '¿Qué viaje haríamos si no hubiera límite de tiempo ni dinero?',
    '¿Qué te gustaría aprender juntos?', '¿Qué tradición te gustaría que tuviéramos cada año?',
    '¿Cómo sería nuestra casa ideal?', '¿Qué te gustaría haber hecho antes de los próximos cinco años?',
    '¿Qué proyecto pequeño podríamos empezar este mes?', '¿Qué te gustaría celebrar a lo grande algún día?',
    '¿Qué te gustaría cambiar de nuestra rutina?', '¿Cómo te imaginas un día normal nuestro cuando seamos mayores?',
    '¿Qué sueño tuyo no me has contado todavía?', '¿Qué te gustaría que dijeran de nosotros como pareja?',
    '¿Qué ciudad te gustaría conocer a fondo?', '¿Qué haríamos con un año sabático?',
    '¿Qué te gustaría que hiciéramos más a menudo con amigos o familia?', '¿Qué hábito sano te gustaría que cuidáramos juntos?',
    '¿Qué te hace ilusión del año que viene?', '¿Qué aventura haríamos si nos atreviéramos?',
  ]],
  ['recuerdos', '📸', 'Recuerdos', [
    '¿Cuál es tu recuerdo favorito de nuestra primera cita?', '¿Qué viaje juntos repetirías mañana?',
    '¿Qué día nuestro te gustaría volver a vivir?', '¿Cuándo supiste que querías estar conmigo?',
    '¿Qué es lo más gracioso que nos ha pasado juntos?', '¿Qué foto nuestra enmarcarías?',
    '¿Qué comida te recuerda a un momento nuestro?', '¿Qué canción suena en tu cabeza cuando piensas en nosotros?',
    '¿Qué plan improvisado nos salió mejor de lo esperado?', '¿Qué detalle mío recuerdas con cariño?',
    '¿Qué momento difícil superamos bien juntos?', '¿Cuál fue nuestra mejor noche de peli o de sofá?',
    '¿Qué regalo te ha hecho más ilusión?', '¿Qué lugar es "nuestro sitio"?',
    '¿Qué es lo primero que te hizo reír de mí?', '¿Qué recuerdo de este año te guardarías para siempre?',
  ]],
  ['risas', '😂', 'Para reír', [
    'Si fuéramos un dúo de superhéroes, ¿cuáles serían nuestros poderes?', 'Si nuestra vida fuera una serie, ¿cómo se llamaría?',
    '¿Qué animal sería yo y por qué?', '¿Qué canción cantaríamos en un concurso de karaoke?',
    'Si tuviéramos un food truck, ¿qué venderíamos?', '¿Qué personaje de película sería tu doble?',
    'Si pudieras cenar con cualquier personaje de ficción, ¿con quién?', '¿Qué objeto de casa salvarías de un tornado de calcetines?',
    '¿Cuál sería nuestro grito de guerra antes de limpiar la casa?', 'Si tuviéramos una mascota que habla, ¿qué diría de nosotros?',
    '¿Qué deporte olímpico ganaríamos juntos?', 'Si fuéramos un plato, ¿cuál seríamos?',
    '¿Qué palabra inventada deberíamos usar más?', '¿Qué haría yo si fuera invisible un día?',
    '¿Qué emoji me representa mejor?', '¿Qué título tendría la película de nuestro último domingo?',
  ]],
];

/** Caras de los dados: posiciones (0-8, rejilla 3×3) con punto. */
export const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
