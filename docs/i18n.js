/**
 * quotes :: i18n
 *
 * Interface strings. The page is written in English; each dictionary maps an
 * English string to its translation, so anything without an entry simply
 * stays as written. Quotes, authors and dedications are not here: they are
 * translated by hand in the database and served by quotes.wasm.
 */

/** @type {Record<string, Record<string, string>>} */
const STRINGS = {
  "pt-BR": {
    // panel and tabs
    "Settings": "Configurações",
    "Sections": "Seções",
    "Language": "Idioma",
    "How it works": "Como funciona",
    "Share": "Compartilhar",
    "Credits": "Créditos",
    "Close": "Fechar",
    "Every day so far": "Todos os dias até agora",

    // settings
    "Theme": "Tema",
    "Auto": "Automático",
    "Light": "Claro",
    "Dark": "Escuro",
    "Auto turns the page dark from 9 p.m. to 6 a.m.": "No automático, a página fica escura das 21h às 6h.",
    "Text size": "Tamanho do texto",
    "Small": "Pequeno",
    "Medium": "Médio",
    "Large": "Grande",
    "Animations": "Animações",
    "On": "Ligadas",
    "Off": "Desligadas",
    "Off swaps quotes instantly, without sliding.": "Desligadas, as frases trocam na hora, sem deslizar.",
    "Day counter": "Contador de dias",
    "Show": "Mostrar",
    "Hide": "Ocultar",
    "Copy": "Copiar",
    "With author": "Com autor",
    "Quote only": "Só a frase",
    "What a click on the quote puts on your clipboard.": "O que um clique na frase coloca na sua área de transferência.",
    "Search with": "Pesquisar com",
    "Used when you right-click the quote or the author.": "Usado quando você clica com o botão direito na frase ou no autor.",
    "Saved on this device only.": "Salvo apenas neste aparelho.",

    // language
    "Auto follows the language of your browser.": "No automático, o site segue o idioma do seu navegador.",
    "Every quote is translated by hand, to carry its meaning rather than its words.":
      "Cada frase é traduzida à mão, para transmitir o seu sentido, e não apenas as suas palavras.",

    // how it works
    "One quote a day": "Uma frase por dia",
    "A new quote about overcoming appears every day at midnight, in your own time zone. The old one drops away and the new one comes down from above.":
      "Uma nova frase sobre superação aparece todos os dias à meia-noite, no seu fuso horário. A antiga desce e some, e a nova chega lá de cima.",
    "Click or tap the quote to copy it, together with its author. You can copy the quote alone in Settings.":
      "Clique ou toque na frase para copiá-la junto com o autor. Nas Configurações, dá para copiar só a frase.",
    "Search": "Pesquisar",
    "Right-click the quote to search for it on the web, or right-click the author to look them up. Pick the search engine in Settings.":
      "Clique com o botão direito na frase para pesquisá-la na web, ou no autor para saber mais sobre ele. O buscador é escolhido nas Configurações.",
    "The Share tab here sends the quote to WhatsApp, Facebook, X, Telegram, Discord, email or your Instagram story, and Save image turns it into a square picture.":
      "A aba Compartilhar envia a frase para o WhatsApp, Facebook, X, Telegram, Discord, e-mail ou para o seu story do Instagram, e Salvar imagem a transforma numa imagem quadrada.",
    "Past days": "Dias anteriores",
    "Press ← and → on a keyboard, or swipe left and right on a phone, to walk back through every day since Day 1.":
      "Use ← e → no teclado, ou deslize o dedo para os lados no celular, para rever todos os dias desde o Dia 1.",
    "The day counter": "O contador de dias",
    "The number in the corner counts the days since the first one. Open it to read every quote so far. Hover over it to see how long until the next.":
      "O número no canto conta os dias desde o primeiro. Clique nele para ler todas as frases até hoje. Passe o mouse para ver quanto falta para a próxima.",
    "Night": "Noite",
    "From 9 p.m. to 6 a.m. the page turns white on black, and back again in the morning. Settings can keep it light or dark all the time.":
      "Das 21h às 6h, a página fica branca sobre preto e volta ao normal de manhã. Nas Configurações, dá para deixá-la sempre clara ou sempre escura.",
    "Offline": "Sem internet",
    "Once you have visited, the site keeps working without a connection.":
      "Depois da primeira visita, o site continua funcionando sem conexão.",
    "Underneath": "Por baixo",
    "Every quote, and the calendar that picks them, lives inside a WebAssembly module written by hand:":
      "Todas as frases, e o calendário que as escolhe, vivem dentro de um módulo WebAssembly escrito à mão:",
    ", scheduled for the next four hundred years.": ", programadas para os próximos quatrocentos anos.",

    // share
    "Send the quote on screen, with a link back here.": "Envie a frase que está na tela, com um link para cá.",
    "Email": "E-mail",
    "Copy link": "Copiar link",
    "Save image": "Salvar imagem",
    "Discord has no share link, so its button copies a message ready to paste. Instagram stories need a picture: on a phone the share sheet opens with the image; on a computer it is saved for you to post.":
      "O Discord não tem link de compartilhamento, então o botão copia uma mensagem pronta para colar. O story do Instagram precisa de uma imagem: no celular, o menu de compartilhar abre com ela; no computador, ela é salva para você postar.",

    // credits
    "Made by": "Feito por",
    "Typeset in": "Tipografia",
    "Cormorant Garamond, by Christian Thalmann": "Cormorant Garamond, de Christian Thalmann",
    "Icons": "Ícones",
    "App logos from": "Logos dos apps por",
    "Engine": "Motor",
    "Hand-written WebAssembly, SQLite and Python": "WebAssembly escrito à mão, SQLite e Python",
    "Words": "Palavras",
    "Every quote belongs to its author": "Cada frase pertence ao seu autor",
    "Source": "Código-fonte",
    "© 2026 · Since Day 1": "© 2026 · Desde o Dia 1",

    // built at runtime
    "Day {n}": "Dia {n}",
    "Next in {t}": "Próxima em {t}",
    "The next one arrives in {t}.": "A próxima chega em {t}.",
    "{q} quotes by {a} authors": "{q} frases de {a} autores",
    "A quote for you": "Uma frase para você",
    "Copied": "Copiado",
    "Could not copy": "Não foi possível copiar",
    "Could not share": "Não foi possível compartilhar",
    "Link copied": "Link copiado",
    "Copied for Discord": "Copiado para o Discord",
    "Image saved": "Imagem salva",
    "Image saved for your story": "Imagem salva para o seu story",
  },
  "es": {
    "Settings": "Ajustes",
    "Sections": "Secciones",
    "Language": "Idioma",
    "How it works": "Cómo funciona",
    "Share": "Compartir",
    "Credits": "Créditos",
    "Close": "Cerrar",
    "Every day so far": "Todos los días hasta ahora",
    "Theme": "Tema",
    "Auto": "Automático",
    "Light": "Claro",
    "Dark": "Oscuro",
    "Auto turns the page dark from 9 p.m. to 6 a.m.": "En automático, la página se oscurece de 21:00 a 6:00.",
    "Text size": "Tamaño del texto",
    "Small": "Pequeño",
    "Medium": "Mediano",
    "Large": "Grande",
    "Animations": "Animaciones",
    "On": "Activadas",
    "Off": "Desactivadas",
    "Off swaps quotes instantly, without sliding.": "Desactivadas, las frases cambian al instante, sin deslizarse.",
    "Day counter": "Contador de días",
    "Show": "Mostrar",
    "Hide": "Ocultar",
    "Copy": "Copiar",
    "With author": "Con autor",
    "Quote only": "Solo la frase",
    "What a click on the quote puts on your clipboard.": "Lo que un clic en la frase copia al portapapeles.",
    "Search with": "Buscar con",
    "Used when you right-click the quote or the author.": "Se usa al hacer clic derecho en la frase o en el autor.",
    "Saved on this device only.": "Guardado solo en este dispositivo.",
    "Auto follows the language of your browser.": "En automático, el sitio sigue el idioma de tu navegador.",
    "Every quote is translated by hand, to carry its meaning rather than its words.": "Cada frase está traducida a mano, para transmitir su sentido y no solo sus palabras.",
    "One quote a day": "Una frase al día",
    "A new quote about overcoming appears every day at midnight, in your own time zone. The old one drops away and the new one comes down from above.": "Cada día a medianoche, en tu propia zona horaria, aparece una nueva frase sobre superación. La anterior cae y desaparece, y la nueva baja desde arriba.",
    "Click or tap the quote to copy it, together with its author. You can copy the quote alone in Settings.": "Haz clic o toca la frase para copiarla junto con su autor. En Ajustes puedes copiar solo la frase.",
    "Search": "Buscar",
    "Right-click the quote to search for it on the web, or right-click the author to look them up. Pick the search engine in Settings.": "Haz clic derecho en la frase para buscarla en la web, o en el autor para saber más de él. El buscador se elige en Ajustes.",
    "The Share tab here sends the quote to WhatsApp, Facebook, X, Telegram, Discord, email or your Instagram story, and Save image turns it into a square picture.": "La pestaña Compartir envía la frase a WhatsApp, Facebook, X, Telegram, Discord, correo o a tu historia de Instagram, y Guardar imagen la convierte en una imagen cuadrada.",
    "Past days": "Días anteriores",
    "Press ← and → on a keyboard, or swipe left and right on a phone, to walk back through every day since Day 1.": "Usa ← y → en el teclado, o desliza el dedo hacia los lados en el móvil, para recorrer todos los días desde el Día 1.",
    "The day counter": "El contador de días",
    "The number in the corner counts the days since the first one. Open it to read every quote so far. Hover over it to see how long until the next.": "El número de la esquina cuenta los días desde el primero. Ábrelo para leer todas las frases hasta hoy. Pasa el cursor por encima para ver cuánto falta para la siguiente.",
    "Night": "Noche",
    "From 9 p.m. to 6 a.m. the page turns white on black, and back again in the morning. Settings can keep it light or dark all the time.": "De 21:00 a 6:00 la página se vuelve blanca sobre negro, y vuelve a la normalidad por la mañana. En Ajustes puedes dejarla siempre clara u oscura.",
    "Offline": "Sin conexión",
    "Once you have visited, the site keeps working without a connection.": "Después de la primera visita, el sitio sigue funcionando sin conexión.",
    "Underneath": "Por dentro",
    "Every quote, and the calendar that picks them, lives inside a WebAssembly module written by hand:": "Todas las frases, y el calendario que las elige, viven dentro de un módulo WebAssembly escrito a mano:",
    ", scheduled for the next four hundred years.": ", programadas para los próximos cuatrocientos años.",
    "Send the quote on screen, with a link back here.": "Envía la frase que está en pantalla, con un enlace hasta aquí.",
    "Email": "Correo",
    "Copy link": "Copiar enlace",
    "Save image": "Guardar imagen",
    "Discord has no share link, so its button copies a message ready to paste. Instagram stories need a picture: on a phone the share sheet opens with the image; on a computer it is saved for you to post.": "Discord no tiene enlace para compartir, así que su botón copia un mensaje listo para pegar. Las historias de Instagram necesitan una imagen: en el móvil, el menú de compartir se abre con ella; en el ordenador, se guarda para que la publiques.",
    "Made by": "Hecho por",
    "Typeset in": "Tipografía",
    "Cormorant Garamond, by Christian Thalmann": "Cormorant Garamond, de Christian Thalmann",
    "Icons": "Iconos",
    "App logos from": "Logos de las apps de",
    "Engine": "Motor",
    "Hand-written WebAssembly, SQLite and Python": "WebAssembly escrito a mano, SQLite y Python",
    "Words": "Palabras",
    "Every quote belongs to its author": "Cada frase pertenece a su autor",
    "Source": "Código fuente",
    "© 2026 · Since Day 1": "© 2026 · Desde el Día 1",
    "Day {n}": "Día {n}",
    "Next in {t}": "Siguiente en {t}",
    "The next one arrives in {t}.": "La siguiente llega en {t}.",
    "{q} quotes by {a} authors": "{q} frases de {a} autores",
    "A quote for you": "Una frase para ti",
    "Copied": "Copiado",
    "Could not copy": "No se pudo copiar",
    "Could not share": "No se pudo compartir",
    "Link copied": "Enlace copiado",
    "Copied for Discord": "Copiado para Discord",
    "Image saved": "Imagen guardada",
    "Image saved for your story": "Imagen guardada para tu historia",
  },
  "fr": {
    "Settings": "Réglages",
    "Sections": "Sections",
    "Language": "Langue",
    "How it works": "Comment ça marche",
    "Share": "Partager",
    "Credits": "Crédits",
    "Close": "Fermer",
    "Every day so far": "Tous les jours jusqu'ici",
    "Theme": "Thème",
    "Auto": "Automatique",
    "Light": "Clair",
    "Dark": "Sombre",
    "Auto turns the page dark from 9 p.m. to 6 a.m.": "En automatique, la page s'assombrit de 21 h à 6 h.",
    "Text size": "Taille du texte",
    "Small": "Petite",
    "Medium": "Moyenne",
    "Large": "Grande",
    "Animations": "Animations",
    "On": "Activées",
    "Off": "Désactivées",
    "Off swaps quotes instantly, without sliding.": "Désactivées, les citations changent instantanément, sans glisser.",
    "Day counter": "Compteur de jours",
    "Show": "Afficher",
    "Hide": "Masquer",
    "Copy": "Copier",
    "With author": "Avec l'auteur",
    "Quote only": "Citation seule",
    "What a click on the quote puts on your clipboard.": "Ce qu'un clic sur la citation copie dans le presse-papiers.",
    "Search with": "Rechercher avec",
    "Used when you right-click the quote or the author.": "Utilisé quand tu fais un clic droit sur la citation ou l'auteur.",
    "Saved on this device only.": "Enregistré uniquement sur cet appareil.",
    "Auto follows the language of your browser.": "En automatique, le site suit la langue de ton navigateur.",
    "Every quote is translated by hand, to carry its meaning rather than its words.": "Chaque citation est traduite à la main, pour en transmettre le sens plutôt que les mots.",
    "One quote a day": "Une citation par jour",
    "A new quote about overcoming appears every day at midnight, in your own time zone. The old one drops away and the new one comes down from above.": "Chaque jour à minuit, dans ton fuseau horaire, une nouvelle citation sur le dépassement de soi apparaît. L'ancienne descend et disparaît, la nouvelle arrive d'en haut.",
    "Click or tap the quote to copy it, together with its author. You can copy the quote alone in Settings.": "Clique ou touche la citation pour la copier avec son auteur. Dans les Réglages, tu peux copier la citation seule.",
    "Search": "Rechercher",
    "Right-click the quote to search for it on the web, or right-click the author to look them up. Pick the search engine in Settings.": "Fais un clic droit sur la citation pour la rechercher sur le web, ou sur l'auteur pour en savoir plus. Le moteur de recherche se choisit dans les Réglages.",
    "The Share tab here sends the quote to WhatsApp, Facebook, X, Telegram, Discord, email or your Instagram story, and Save image turns it into a square picture.": "L'onglet Partager envoie la citation sur WhatsApp, Facebook, X, Telegram, Discord, par e-mail ou dans ta story Instagram, et Enregistrer l'image la transforme en image carrée.",
    "Past days": "Jours précédents",
    "Press ← and → on a keyboard, or swipe left and right on a phone, to walk back through every day since Day 1.": "Utilise ← et → au clavier, ou balaie l'écran vers la gauche et la droite sur un téléphone, pour revoir chaque jour depuis le Jour 1.",
    "The day counter": "Le compteur de jours",
    "The number in the corner counts the days since the first one. Open it to read every quote so far. Hover over it to see how long until the next.": "Le nombre dans le coin compte les jours depuis le premier. Ouvre-le pour lire toutes les citations jusqu'ici. Survole-le pour voir combien de temps il reste avant la prochaine.",
    "Night": "Nuit",
    "From 9 p.m. to 6 a.m. the page turns white on black, and back again in the morning. Settings can keep it light or dark all the time.": "De 21 h à 6 h, la page passe en blanc sur noir, puis revient le matin. Dans les Réglages, tu peux la garder toujours claire ou toujours sombre.",
    "Offline": "Hors ligne",
    "Once you have visited, the site keeps working without a connection.": "Après ta première visite, le site continue de fonctionner sans connexion.",
    "Underneath": "Sous le capot",
    "Every quote, and the calendar that picks them, lives inside a WebAssembly module written by hand:": "Toutes les citations, et le calendrier qui les choisit, vivent dans un module WebAssembly écrit à la main :",
    ", scheduled for the next four hundred years.": ", programmées pour les quatre cents prochaines années.",
    "Send the quote on screen, with a link back here.": "Envoie la citation affichée, avec un lien vers ici.",
    "Email": "E-mail",
    "Copy link": "Copier le lien",
    "Save image": "Enregistrer l'image",
    "Discord has no share link, so its button copies a message ready to paste. Instagram stories need a picture: on a phone the share sheet opens with the image; on a computer it is saved for you to post.": "Discord n'a pas de lien de partage : son bouton copie un message prêt à coller. Les stories Instagram ont besoin d'une image : sur téléphone, le menu de partage s'ouvre avec elle ; sur ordinateur, elle est enregistrée pour que tu la publies.",
    "Made by": "Créé par",
    "Typeset in": "Typographie",
    "Cormorant Garamond, by Christian Thalmann": "Cormorant Garamond, de Christian Thalmann",
    "Icons": "Icônes",
    "App logos from": "Logos des applis par",
    "Engine": "Moteur",
    "Hand-written WebAssembly, SQLite and Python": "WebAssembly écrit à la main, SQLite et Python",
    "Words": "Mots",
    "Every quote belongs to its author": "Chaque citation appartient à son auteur",
    "Source": "Code source",
    "© 2026 · Since Day 1": "© 2026 · Depuis le Jour 1",
    "Day {n}": "Jour {n}",
    "Next in {t}": "Prochaine dans {t}",
    "The next one arrives in {t}.": "La prochaine arrive dans {t}.",
    "{q} quotes by {a} authors": "{q} citations de {a} auteurs",
    "A quote for you": "Une citation pour toi",
    "Copied": "Copié",
    "Could not copy": "Impossible de copier",
    "Could not share": "Impossible de partager",
    "Link copied": "Lien copié",
    "Copied for Discord": "Copié pour Discord",
    "Image saved": "Image enregistrée",
    "Image saved for your story": "Image enregistrée pour ta story",
  },
  "it": {
    "Settings": "Impostazioni",
    "Sections": "Sezioni",
    "Language": "Lingua",
    "How it works": "Come funziona",
    "Share": "Condividi",
    "Credits": "Crediti",
    "Close": "Chiudi",
    "Every day so far": "Tutti i giorni finora",
    "Theme": "Tema",
    "Auto": "Automatico",
    "Light": "Chiaro",
    "Dark": "Scuro",
    "Auto turns the page dark from 9 p.m. to 6 a.m.": "In automatico, la pagina diventa scura dalle 21 alle 6.",
    "Text size": "Dimensione del testo",
    "Small": "Piccola",
    "Medium": "Media",
    "Large": "Grande",
    "Animations": "Animazioni",
    "On": "Attive",
    "Off": "Disattivate",
    "Off swaps quotes instantly, without sliding.": "Disattivate, le frasi cambiano subito, senza scorrere.",
    "Day counter": "Contatore dei giorni",
    "Show": "Mostra",
    "Hide": "Nascondi",
    "Copy": "Copia",
    "With author": "Con autore",
    "Quote only": "Solo la frase",
    "What a click on the quote puts on your clipboard.": "Ciò che un clic sulla frase copia negli appunti.",
    "Search with": "Cerca con",
    "Used when you right-click the quote or the author.": "Usato quando fai clic destro sulla frase o sull'autore.",
    "Saved on this device only.": "Salvato solo su questo dispositivo.",
    "Auto follows the language of your browser.": "In automatico, il sito segue la lingua del tuo browser.",
    "Every quote is translated by hand, to carry its meaning rather than its words.": "Ogni frase è tradotta a mano, per trasmetterne il senso e non solo le parole.",
    "One quote a day": "Una frase al giorno",
    "A new quote about overcoming appears every day at midnight, in your own time zone. The old one drops away and the new one comes down from above.": "Ogni giorno a mezzanotte, nel tuo fuso orario, appare una nuova frase sul superare le difficoltà. Quella vecchia scende e scompare, la nuova arriva dall'alto.",
    "Click or tap the quote to copy it, together with its author. You can copy the quote alone in Settings.": "Fai clic o tocca la frase per copiarla insieme al suo autore. Nelle Impostazioni puoi copiare solo la frase.",
    "Search": "Cerca",
    "Right-click the quote to search for it on the web, or right-click the author to look them up. Pick the search engine in Settings.": "Fai clic destro sulla frase per cercarla sul web, o sull'autore per saperne di più. Il motore di ricerca si sceglie nelle Impostazioni.",
    "The Share tab here sends the quote to WhatsApp, Facebook, X, Telegram, Discord, email or your Instagram story, and Save image turns it into a square picture.": "La scheda Condividi invia la frase su WhatsApp, Facebook, X, Telegram, Discord, via e-mail o nella tua storia di Instagram, e Salva immagine la trasforma in un'immagine quadrata.",
    "Past days": "Giorni precedenti",
    "Press ← and → on a keyboard, or swipe left and right on a phone, to walk back through every day since Day 1.": "Usa ← e → sulla tastiera, o scorri a sinistra e a destra sul telefono, per rivedere ogni giorno dal Giorno 1.",
    "The day counter": "Il contatore dei giorni",
    "The number in the corner counts the days since the first one. Open it to read every quote so far. Hover over it to see how long until the next.": "Il numero nell'angolo conta i giorni dal primo. Aprilo per leggere tutte le frasi finora. Passaci sopra con il mouse per vedere quanto manca alla prossima.",
    "Night": "Notte",
    "From 9 p.m. to 6 a.m. the page turns white on black, and back again in the morning. Settings can keep it light or dark all the time.": "Dalle 21 alle 6 la pagina diventa bianca su nero, e torna normale al mattino. Nelle Impostazioni puoi tenerla sempre chiara o sempre scura.",
    "Offline": "Offline",
    "Once you have visited, the site keeps working without a connection.": "Dopo la prima visita, il sito continua a funzionare senza connessione.",
    "Underneath": "Sotto il cofano",
    "Every quote, and the calendar that picks them, lives inside a WebAssembly module written by hand:": "Tutte le frasi, e il calendario che le sceglie, vivono in un modulo WebAssembly scritto a mano:",
    ", scheduled for the next four hundred years.": ", programmate per i prossimi quattrocento anni.",
    "Send the quote on screen, with a link back here.": "Invia la frase sullo schermo, con un link a questa pagina.",
    "Email": "E-mail",
    "Copy link": "Copia link",
    "Save image": "Salva immagine",
    "Discord has no share link, so its button copies a message ready to paste. Instagram stories need a picture: on a phone the share sheet opens with the image; on a computer it is saved for you to post.": "Discord non ha un link di condivisione, quindi il suo pulsante copia un messaggio pronto da incollare. Le storie di Instagram hanno bisogno di un'immagine: sul telefono si apre il menu di condivisione con l'immagine; sul computer viene salvata perché tu possa pubblicarla.",
    "Made by": "Realizzato da",
    "Typeset in": "Carattere",
    "Cormorant Garamond, by Christian Thalmann": "Cormorant Garamond, di Christian Thalmann",
    "Icons": "Icone",
    "App logos from": "Loghi delle app da",
    "Engine": "Motore",
    "Hand-written WebAssembly, SQLite and Python": "WebAssembly scritto a mano, SQLite e Python",
    "Words": "Parole",
    "Every quote belongs to its author": "Ogni frase appartiene al suo autore",
    "Source": "Codice sorgente",
    "© 2026 · Since Day 1": "© 2026 · Dal Giorno 1",
    "Day {n}": "Giorno {n}",
    "Next in {t}": "Prossima tra {t}",
    "The next one arrives in {t}.": "La prossima arriva tra {t}.",
    "{q} quotes by {a} authors": "{q} frasi di {a} autori",
    "A quote for you": "Una frase per te",
    "Copied": "Copiato",
    "Could not copy": "Impossibile copiare",
    "Could not share": "Impossibile condividere",
    "Link copied": "Link copiato",
    "Copied for Discord": "Copiato per Discord",
    "Image saved": "Immagine salvata",
    "Image saved for your story": "Immagine salvata per la tua storia",
  },
};

/**
 * Translate `key` into `lang`, filling {placeholders} from `vars`.
 * @param {string} lang @param {string} key @param {Record<string, string | number>} [vars]
 */
export function tr(lang, key, vars = {}) {
  const template = STRINGS[lang]?.[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

/** @param {string} lang @param {{year: number, month: number, day: number}} parts */
export function formatDate(lang, { year, month, day }) {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(Date.UTC(year, month - 1, day));
}

// Text that is filled in at runtime, or is a quote, is never touched here.
const SKIP = "#quote, #day-counter, #toast, #archive-list, #info-next, #info-stats, noscript, script, style, svg";
const ATTRIBUTES = ["aria-label", "title", "data-title"];
/** @type {WeakMap<Text, string>} */
const originals = new WeakMap();

/**
 * Put every static string on the page into `lang`, remembering the English
 * source so switching back (or to another language) always starts from it.
 * @param {string} lang
 */
export function translateDocument(lang) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = /** @type {Text} */ (node);
    if (!originals.has(text)) originals.set(text, text.nodeValue ?? "");
    const source = originals.get(text) ?? "";
    const key = source.trim();
    if (!key) continue;
    text.nodeValue = source.replace(key, tr(lang, key));
  }
  for (const el of document.body.querySelectorAll(ATTRIBUTES.map((a) => `[${a}]`).join(","))) {
    if (el.closest(SKIP) && !el.matches("#day-counter")) continue;
    for (const attr of ATTRIBUTES) {
      if (!el.hasAttribute(attr)) continue;
      const store = `src${attr.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())}`;
      const element = /** @type {HTMLElement} */ (el);
      element.dataset[store] ??= element.getAttribute(attr) ?? "";
      element.setAttribute(attr, tr(lang, element.dataset[store] ?? ""));
    }
  }
}
