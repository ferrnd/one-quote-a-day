/**
 * Generate android/app/src/main/java/com/ferrnd/quotes/Strings.kt.
 *
 * The app speaks the same seven languages as the site. Strings the two share
 * are read from web/i18n.js, so a translation fixed there is fixed here on the
 * next run; strings only the app needs (taps instead of clicks, notifications)
 * are translated below. Run from the repository root:
 *
 *   node android/tools/strings.mjs
 */

import { writeFileSync } from "node:fs";
import { tr } from "../../web/i18n.js";

const LANGS = ["pt-BR", "es", "fr", "it", "de", "nl", "ja", "zh-CN", "ko"];

/** Shared with the site: translations come from web/i18n.js. */
const SHARED = [
  "Settings", "Language", "How it works", "Share", "Favorites", "Credits", "Close", "Every day so far",
  "Theme", "Auto", "Light", "Dark", "Auto turns the page dark from 9 p.m. to 6 a.m.",
  "Text size", "Small", "Medium", "Large", "Animations", "On", "Off",
  "Off swaps quotes instantly, without sliding.", "Day counter", "Show", "Hide", "Copy", "With author",
  "Quote only", "Search with", "Saved on this device only.",
  "Every quote is translated by hand, to carry its meaning rather than its words.",
  "One quote a day",
  "A new quote about overcoming appears every day at midnight, in your own time zone. The old one drops away and the new one comes down from above.",
  "Search", "Past days", "The day counter", "Night", "Offline",
  "Made by", "Typeset in", "Cormorant Garamond, by Christian Thalmann", "Engine", "Words",
  "Every quote belongs to its author", "Source", "© 2026 · Since Day 1",
  "Day {n}", "Next in {t}", "The next one arrives in {t}.", "{q} quotes by {a} authors",
  "A quote for you", "Copied", "Could not share", "Link copied", "Image saved", "No favorites yet.",
  "Remove", "Added to favorites", "Removed from favorites", "My favorite quotes", "Save image", "Copy link",
];

/** Only in the app. */
const APP = {
  "Daily notification": {
    "pt-BR": "Notificação diária",
    "es": "Notificación diaria",
    "fr": "Notification quotidienne",
    "it": "Notifica giornaliera",
    "de": "Tägliche Benachrichtigung",
    "nl": "Dagelijkse melding",
  },
  "Each day's quote, delivered to your phone.": {
    "pt-BR": "A frase de cada dia, direto no seu celular.",
    "es": "La frase de cada día, directo en tu teléfono.",
    "fr": "La citation de chaque jour, directement sur votre téléphone.",
    "it": "La frase di ogni giorno, direttamente sul tuo telefono.",
    "de": "Das Zitat des Tages, direkt auf dein Handy.",
    "nl": "Het citaat van elke dag, rechtstreeks op je telefoon.",
  },
  "Notify at": {
    "pt-BR": "Notificar às",
    "es": "Notificar a las",
    "fr": "Notifier à",
    "it": "Notifica alle",
    "de": "Benachrichtigen um",
    "nl": "Melden om",
  },
  "Quote of the day": {
    "pt-BR": "Frase do dia",
    "es": "Frase del día",
    "fr": "Citation du jour",
    "it": "Frase del giorno",
    "de": "Zitat des Tages",
    "nl": "Citaat van de dag",
  },
  "notify:on": {
    en: "On", "pt-BR": "Ligada", es: "Activada", fr: "Activée", it: "Attiva", de: "An", nl: "Aan",
  },
  "notify:off": {
    en: "Off", "pt-BR": "Desligada", es: "Desactivada", fr: "Désactivée", it: "Disattiva", de: "Aus", nl: "Uit",
  },
  "What a tap on the quote puts on your clipboard.": {
    "pt-BR": "O que um toque na frase coloca na sua área de transferência.",
    es: "Lo que un toque en la frase copia al portapapeles.",
    fr: "Ce qu'un toucher sur la citation copie dans le presse-papiers.",
    it: "Cosa copia negli appunti un tocco sulla frase.",
    de: "Was ein Tippen auf das Zitat in die Zwischenablage legt.",
    nl: "Wat een tik op het citaat naar je klembord kopieert.",
  },
  "Used when you tap the author.": {
    "pt-BR": "Usado quando você toca no autor.",
    es: "Se usa cuando tocas el autor.",
    fr: "Utilisé quand vous touchez l'auteur.",
    it: "Usato quando tocchi l'autore.",
    de: "Wird verwendet, wenn du auf den Autor tippst.",
    nl: "Gebruikt als je op de auteur tikt.",
  },
  "Auto follows the language of your phone.": {
    "pt-BR": "No automático, o app segue o idioma do seu celular.",
    es: "En automático, la app sigue el idioma de tu teléfono.",
    fr: "En automatique, l'application suit la langue de votre téléphone.",
    it: "In automatico, l'app segue la lingua del tuo telefono.",
    de: "Automatisch folgt die App der Sprache deines Handys.",
    nl: "Automatisch volgt de app de taal van je telefoon.",
  },
  "Tap the quote to copy it, together with its author. You can copy the quote alone in Settings.": {
    "pt-BR": "Toque na frase para copiá-la junto com o autor. Nas Configurações, dá para copiar só a frase.",
    es: "Toca la frase para copiarla junto con su autor. En Ajustes puedes copiar solo la frase.",
    fr: "Touchez la citation pour la copier avec son auteur. Dans les Réglages, vous pouvez copier la citation seule.",
    it: "Tocca la frase per copiarla insieme all'autore. Nelle Impostazioni puoi copiare solo la frase.",
    de: "Tippe auf das Zitat, um es samt Autor zu kopieren. In den Einstellungen kannst du nur das Zitat kopieren.",
    nl: "Tik op het citaat om het samen met de auteur te kopiëren. In Instellingen kun je alleen het citaat kopiëren.",
  },
  "Tap the author to look them up on the web. Pick the search engine in Settings.": {
    "pt-BR": "Toque no autor para pesquisá-lo na web. O buscador é escolhido nas Configurações.",
    es: "Toca el autor para buscarlo en la web. Elige el buscador en Ajustes.",
    fr: "Touchez l'auteur pour le rechercher sur le web. Choisissez le moteur de recherche dans les Réglages.",
    it: "Tocca l'autore per cercarlo sul web. Scegli il motore di ricerca nelle Impostazioni.",
    de: "Tippe auf den Autor, um ihn im Web nachzuschlagen. Die Suchmaschine wählst du in den Einstellungen.",
    nl: "Tik op de auteur om die op te zoeken op het web. Kies de zoekmachine in Instellingen.",
  },
  "Swipe left and right to walk back through every day since Day 1.": {
    "pt-BR": "Deslize o dedo para os lados para rever todos os dias desde o Dia 1.",
    es: "Desliza a izquierda y derecha para recorrer todos los días desde el Día 1.",
    fr: "Balayez vers la gauche et la droite pour revoir chaque jour depuis le Jour 1.",
    it: "Scorri a sinistra e a destra per ripercorrere ogni giorno dal Giorno 1.",
    de: "Wische nach links und rechts, um jeden Tag seit Tag 1 noch einmal zu sehen.",
    nl: "Veeg naar links en rechts om elke dag sinds Dag 1 terug te zien.",
  },
  "The number in the corner counts the days since the first one. Tap it to read every quote so far, and to see how long until the next.": {
    "pt-BR": "O número no canto conta os dias desde o primeiro. Toque nele para ler todas as frases até hoje e ver quanto falta para a próxima.",
    es: "El número de la esquina cuenta los días desde el primero. Tócalo para leer todas las frases hasta hoy y ver cuánto falta para la siguiente.",
    fr: "Le nombre dans le coin compte les jours depuis le premier. Touchez-le pour lire toutes les citations jusqu'ici et voir dans combien de temps arrive la suivante.",
    it: "Il numero nell'angolo conta i giorni dal primo. Toccalo per leggere tutte le frasi finora e vedere quanto manca alla prossima.",
    de: "Die Zahl in der Ecke zählt die Tage seit dem ersten. Tippe darauf, um alle bisherigen Zitate zu lesen und zu sehen, wann das nächste kommt.",
    nl: "Het getal in de hoek telt de dagen sinds de eerste. Tik erop om alle citaten tot nu toe te lezen en te zien hoe lang het nog duurt tot het volgende.",
  },
  "Long-press the quote to save it as a favorite; do it again to remove it. The Favorites tab lists them all and takes you back to their day.": {
    "pt-BR": "Segure a frase para favoritá-la; repita para remover. A aba Favoritos lista todas e leva você de volta ao dia de cada uma.",
    es: "Mantén pulsada la frase para guardarla como favorita; repite para quitarla. La pestaña Favoritos las reúne todas y te lleva de vuelta a su día.",
    fr: "Appuyez longuement sur la citation pour l'ajouter aux favoris ; recommencez pour la retirer. L'onglet Favoris les liste toutes et vous ramène à leur jour.",
    it: "Tieni premuta la frase per salvarla tra i preferiti; ripeti per toglierla. La scheda Preferiti le elenca tutte e ti riporta al loro giorno.",
    de: "Halte das Zitat gedrückt, um es als Favorit zu speichern; noch einmal entfernt es. Der Tab Favoriten listet alle auf und bringt dich zu ihrem Tag zurück.",
    nl: "Houd het citaat ingedrukt om het als favoriet te bewaren; nog een keer haalt het weg. Het tabblad Favorieten toont ze allemaal en brengt je terug naar hun dag.",
  },
  "Long-press the quote to save it here. Do it again to remove it.": {
    "pt-BR": "Segure a frase para salvá-la aqui. Repita para remover.",
    es: "Mantén pulsada la frase para guardarla aquí. Repite para quitarla.",
    fr: "Appuyez longuement sur la citation pour l'enregistrer ici. Recommencez pour la retirer.",
    it: "Tieni premuta la frase per salvarla qui. Ripeti per toglierla.",
    de: "Halte das Zitat gedrückt, um es hier zu speichern. Noch einmal entfernt es.",
    nl: "Houd het citaat ingedrukt om het hier te bewaren. Nog een keer haalt het weg.",
  },
  "Notifications": {
    "pt-BR": "Notificações", es: "Notificaciones", fr: "Notifications", it: "Notifiche",
    de: "Benachrichtigungen", nl: "Meldingen",
  },
  "Every day, at the time you choose in Settings, the day's quote arrives as a notification, in your language.": {
    "pt-BR": "Todo dia, no horário que você escolher nas Configurações, a frase do dia chega como notificação, no seu idioma.",
    es: "Cada día, a la hora que elijas en Ajustes, la frase del día llega como notificación, en tu idioma.",
    fr: "Chaque jour, à l'heure choisie dans les Réglages, la citation du jour arrive en notification, dans votre langue.",
    it: "Ogni giorno, all'ora che scegli nelle Impostazioni, la frase del giorno arriva come notifica, nella tua lingua.",
    de: "Jeden Tag kommt zur Uhrzeit, die du in den Einstellungen wählst, das Zitat des Tages als Benachrichtigung, in deiner Sprache.",
    nl: "Elke dag komt het citaat van de dag als melding binnen, op het tijdstip dat je in Instellingen kiest, in jouw taal.",
  },
  "From 9 p.m. to 6 a.m. the screen turns white on black, and back again in the morning. Settings can keep it light or dark all the time.": {
    "pt-BR": "Das 21h às 6h, a tela fica branca sobre preto e volta ao normal de manhã. Nas Configurações, dá para deixá-la sempre clara ou sempre escura.",
    es: "De 21:00 a 6:00 la pantalla pasa a blanco sobre negro, y vuelve por la mañana. En Ajustes puedes dejarla siempre clara u oscura.",
    fr: "De 21 h à 6 h, l'écran passe en blanc sur noir, puis revient le matin. Les Réglages peuvent le garder toujours clair ou sombre.",
    it: "Dalle 21 alle 6 lo schermo diventa bianco su nero, e torna com'era al mattino. Nelle Impostazioni puoi tenerlo sempre chiaro o scuro.",
    de: "Von 21 bis 6 Uhr wird der Bildschirm weiß auf schwarz und morgens wieder hell. In den Einstellungen kannst du ihn immer hell oder dunkel lassen.",
    nl: "Van 21.00 tot 6.00 uur wordt het scherm wit op zwart, en 's ochtends weer licht. In Instellingen kun je het altijd licht of donker houden.",
  },
  "Everything works offline: every quote, in every language, lives inside the app.": {
    "pt-BR": "Tudo funciona sem internet: todas as frases, em todos os idiomas, ficam dentro do app.",
    es: "Todo funciona sin conexión: cada frase, en cada idioma, vive dentro de la app.",
    fr: "Tout fonctionne hors ligne : chaque citation, dans chaque langue, est dans l'application.",
    it: "Tutto funziona offline: ogni frase, in ogni lingua, vive dentro l'app.",
    de: "Alles funktioniert offline: Jedes Zitat in jeder Sprache steckt in der App.",
    nl: "Alles werkt offline: elk citaat, in elke taal, zit in de app.",
  },
  "Send the quote on screen, as a picture or as text, with a link to the site.": {
    "pt-BR": "Envie a frase que está na tela, como imagem ou texto, com um link para o site.",
    es: "Envía la frase de la pantalla, como imagen o como texto, con un enlace al sitio.",
    fr: "Envoyez la citation à l'écran, en image ou en texte, avec un lien vers le site.",
    it: "Invia la frase sullo schermo, come immagine o come testo, con un link al sito.",
    de: "Sende das Zitat auf dem Bildschirm als Bild oder Text, mit einem Link zur Website.",
    nl: "Stuur het citaat op het scherm, als afbeelding of als tekst, met een link naar de site.",
  },
  "Share image": {
    "pt-BR": "Compartilhar imagem", es: "Compartir imagen", fr: "Partager l'image", it: "Condividi immagine",
    de: "Bild teilen", nl: "Afbeelding delen",
  },
  "Share text": {
    "pt-BR": "Compartilhar texto", es: "Compartir texto", fr: "Partager le texte", it: "Condividi testo",
    de: "Text teilen", nl: "Tekst delen",
  },
  "Share all": {
    "pt-BR": "Compartilhar todos", es: "Compartir todos", fr: "Tout partager", it: "Condividi tutti",
    de: "Alle teilen", nl: "Alles delen",
  },
  "Notifications are blocked. Allow them in the phone's settings.": {
    "pt-BR": "As notificações estão bloqueadas. Permita nas configurações do celular.",
    es: "Las notificaciones están bloqueadas. Permítelas en los ajustes del teléfono.",
    fr: "Les notifications sont bloquées. Autorisez-les dans les réglages du téléphone.",
    it: "Le notifiche sono bloccate. Consentile nelle impostazioni del telefono.",
    de: "Benachrichtigungen sind blockiert. Erlaube sie in den Einstellungen des Handys.",
    nl: "Meldingen zijn geblokkeerd. Sta ze toe in de instellingen van je telefoon.",
  },
  "Open settings": {
    "pt-BR": "Abrir configurações", es: "Abrir ajustes", fr: "Ouvrir les réglages", it: "Apri impostazioni",
    de: "Einstellungen öffnen", nl: "Instellingen openen",
  },
  "Native Android, in Kotlin and Jetpack Compose": {
    "pt-BR": "Android nativo, em Kotlin e Jetpack Compose",
    es: "Android nativo, en Kotlin y Jetpack Compose",
    fr: "Android natif, en Kotlin et Jetpack Compose",
    it: "Android nativo, in Kotlin e Jetpack Compose",
    de: "Natives Android, in Kotlin und Jetpack Compose",
    nl: "Native Android, in Kotlin en Jetpack Compose",
  },
};

/** The app-only strings in Japanese, Simplified Chinese and Korean: [ja, zh-CN, ko]. */
const CJK = {
  "notify:on": ["オン", "开", "켜기"],
  "notify:off": ["オフ", "关", "끄기"],
  "Daily notification": ["毎日の通知", "每日通知", "매일 알림"],
  "Each day's quote, delivered to your phone.": ["毎日の言葉を、あなたのスマートフォンへ。", "每天的名言，直接送到你的手机。", "매일의 문장을 당신의 휴대폰으로 보내 드립니다."],
  "Notify at": ["通知の時刻", "通知时间", "알림 시간"],
  "Quote of the day": ["今日の言葉", "每日名言", "오늘의 문장"],
  "What a tap on the quote puts on your clipboard.": ["言葉をタップしたときにクリップボードにコピーされる内容です。", "轻触名言时复制到剪贴板的内容。", "문장을 탭했을 때 클립보드에 복사되는 내용입니다."],
  "Used when you tap the author.": ["作者をタップしたときに使われます。", "轻触作者时使用。", "작가를 탭할 때 사용됩니다."],
  "Auto follows the language of your phone.": ["自動では、スマートフォンの言語に合わせます。", "自动模式下，跟随手机的语言。", "자동으로 두면 휴대폰의 언어를 따릅니다."],
  "Tap the quote to copy it, together with its author. You can copy the quote alone in Settings.": ["言葉をタップすると、作者と一緒にコピーできます。設定で言葉だけをコピーすることもできます。", "轻触名言，即可连同作者一起复制。在设置中也可以只复制名言。", "문장을 탭하면 작가와 함께 복사됩니다. 설정에서 문장만 복사할 수도 있습니다."],
  "Tap the author to look them up on the web. Pick the search engine in Settings.": ["作者をタップすると、ウェブでその人について調べられます。検索エンジンは設定で選べます。", "轻触作者，即可在网上了解此人。搜索引擎可在设置中选择。", "작가를 탭하면 웹에서 그 사람에 대해 찾아볼 수 있습니다. 검색 엔진은 설정에서 고를 수 있습니다."],
  "Swipe left and right to walk back through every day since Day 1.": ["左右にスワイプすると、1日目からのすべての日をさかのぼれます。", "左右滑动，就能回顾从第1天以来的每一天。", "좌우로 밀면 1일째부터의 모든 날을 되돌아볼 수 있습니다."],
  "The number in the corner counts the days since the first one. Tap it to read every quote so far, and to see how long until the next.": ["隅の数字は、最初の日から数えた日数です。タップすると、これまでのすべての言葉と、次の言葉までの時間がわかります。", "角落里的数字记录着从第一天起的天数。轻触它，可以阅读迄今为止的所有名言，并看到距离下一句还有多久。", "구석의 숫자는 첫날부터 센 날수입니다. 탭하면 지금까지의 모든 문장을 읽고, 다음 문장까지 남은 시간도 볼 수 있습니다."],
  "Long-press the quote to save it as a favorite; do it again to remove it. The Favorites tab lists them all and takes you back to their day.": ["言葉を長押しするとお気に入りに保存され、もう一度すると削除されます。「お気に入り」タブにはすべてが並び、その日に戻ることができます。", "长按名言即可收藏，再长按一次即可取消。“收藏”标签会列出所有收藏，并带你回到对应的那一天。", "문장을 길게 누르면 즐겨찾기에 저장되고, 한 번 더 누르면 삭제됩니다. '즐겨찾기' 탭에서 모두 볼 수 있고 그날로 돌아갈 수 있습니다."],
  "Long-press the quote to save it here. Do it again to remove it.": ["言葉を長押しすると、ここに保存されます。もう一度すると削除されます。", "长按名言即可保存到这里，再长按一次即可取消。", "문장을 길게 누르면 이곳에 저장됩니다. 한 번 더 누르면 삭제됩니다."],
  "Notifications": ["通知", "通知", "알림"],
  "Every day, at the time you choose in Settings, the day's quote arrives as a notification, in your language.": ["毎日、設定で選んだ時刻に、その日の言葉があなたの言語で通知として届きます。", "每天在你于设置中选择的时间，当天的名言会以你的语言作为通知送达。", "매일 설정에서 고른 시간에, 그날의 문장이 당신의 언어로 알림이 되어 찾아옵니다."],
  "From 9 p.m. to 6 a.m. the screen turns white on black, and back again in the morning. Settings can keep it light or dark all the time.": ["午後9時から午前6時までは、画面が黒地に白になり、朝になると元に戻ります。設定で、いつも明るく、またはいつも暗くしておくこともできます。", "从晚上9点到早上6点，屏幕变为黑底白字，早上再恢复。在设置中可以让它一直保持浅色或深色。", "밤 9시부터 아침 6시까지는 화면이 검은 바탕에 흰 글씨로 바뀌고, 아침이면 다시 돌아옵니다. 설정에서 늘 밝게 또는 늘 어둡게 둘 수 있습니다."],
  "Everything works offline: every quote, in every language, lives inside the app.": ["すべてオフラインで動きます。すべての言葉が、すべての言語で、アプリの中に入っています。", "一切都可以离线使用：每一句名言、每一种语言，都在应用之中。", "모든 것이 오프라인으로 작동합니다. 모든 문장이 모든 언어로 앱 안에 들어 있습니다."],
  "Send the quote on screen, as a picture or as text, with a link to the site.": ["画面の言葉を、画像またはテキストで、サイトへのリンクと一緒に送りましょう。", "把屏幕上的名言以图片或文字的形式，连同网站链接一起发送出去。", "화면의 문장을 이미지나 텍스트로, 사이트 링크와 함께 보내 보세요."],
  "Share image": ["画像で共有", "分享图片", "이미지 공유"],
  "Share text": ["テキストで共有", "分享文字", "텍스트 공유"],
  "Share all": ["すべて共有", "全部分享", "모두 공유"],
  "Notifications are blocked. Allow them in the phone's settings.": ["通知がブロックされています。スマートフォンの設定で許可してください。", "通知已被屏蔽。请在手机设置中允许通知。", "알림이 차단되어 있습니다. 휴대폰 설정에서 허용해 주세요."],
  "Open settings": ["設定を開く", "打开设置", "설정 열기"],
  "Native Android, in Kotlin and Jetpack Compose": ["KotlinとJetpack Composeで書かれたネイティブAndroidアプリ", "原生Android，使用Kotlin和Jetpack Compose编写", "Kotlin과 Jetpack Compose로 만든 네이티브 Android 앱"],
};
for (const [key, [ja, zh, ko]] of Object.entries(CJK)) Object.assign(APP[key], { ja, "zh-CN": zh, ko });

const table = { en: {} };
for (const lang of LANGS) table[lang] = {};
for (const key of SHARED) {
  table.en[key] = key;
  for (const lang of LANGS) {
    const value = tr(lang, key);
    if (value === key && !/^(Auto|Email|Notifications|Search|Engine|Source|Offline|Copy|Favorites|Credits|Animations)$/.test(key)) {
      console.warn(`warning: ${lang} has no translation for "${key}"`);
    }
    table[lang][key] = value;
  }
}
for (const [key, byLang] of Object.entries(APP)) {
  table.en[key] = byLang.en ?? key;
  for (const lang of LANGS) {
    if (!byLang[lang]) throw new Error(`${lang} missing "${key}"`);
    table[lang][key] = byLang[lang];
  }
}

const kt = (s) => JSON.stringify(s).replace(/\$/g, "\\$");
let out = `package com.ferrnd.quotes

// Generated by android/tools/strings.mjs from web/i18n.js. Do not edit.

object Strings {
    private val table: Map<String, Map<String, String>> = mapOf(
`;
for (const [lang, entries] of Object.entries(table)) {
  out += `        ${kt(lang)} to mapOf(\n`;
  for (const [k, v] of Object.entries(entries)) out += `            ${kt(k)} to ${kt(v)},\n`;
  out += `        ),\n`;
}
out += `    )

    /** The string for key in lang, with {name} placeholders filled in. */
    fun t(lang: String, key: String, vararg vars: Pair<String, Any>): String {
        var s = table[lang]?.get(key) ?: table.getValue("en")[key] ?: key
        for ((name, value) in vars) s = s.replace("{$name}", value.toString())
        return s
    }
}
`;
const target = new URL("../app/src/main/java/com/ferrnd/quotes/Strings.kt", import.meta.url);
writeFileSync(target, out);
console.log(`wrote Strings.kt: ${Object.keys(table.en).length} strings x ${Object.keys(table).length} languages`);
