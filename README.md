# Cronache

Sito per leggere le storie della raccolta: una alla volta, a schermo intero,
sfogliabile con swipe (o frecce/tap) in ordine numerico.

## Come aggiungere una storia

Ogni storia è un file `.md` con questa struttura esatta:

```
# Titolo della storia
### Categoria — Storia N

*Luogo, data*

Corpo del racconto, in paragrafi separati da una riga vuota...

---

*Nota storica.* Testo della nota finale.
```

`N` è un numero romano (I, II, III, IV, V, ...): è quello a decidere
l'ordine di lettura sul sito, non il nome del file. `stories/_template.md`
è un modello vuoto pronto da copiare (inizia con `_`, quindi il build lo
ignora sempre).

1. Copia il file della storia nella cartella `stories/` del repo (anche
   direttamente da github.com, con "Add file → Upload files").
2. Fai il commit su `main`.

A quel punto la GitHub Action `Aggiorna storie` parte da sola, rigenera
`stories.json` e lo salva nel repo: il sito si aggiorna senza bisogno di
toccare altro. Basta aspettare un minuto o due e ricaricare la pagina.

`stories/_template.md` inizia con `_` apposta: il build lo ignora sempre,
quindi puoi lasciarlo lì come riferimento.

## Come pubblicare il sito (GitHub Pages)

Nel repo: **Settings → Pages → Build and deployment → Source: Deploy from a
branch**, poi branch `main`, cartella `/ (root)`. Dopo il primo salvataggio
il sito sarà su `tarzanhello.github.io/cronache/` (stesso schema del sito
del calendario).

## Sviluppo/test in locale

```
npm install
npm run build      # genera stories.json da /stories
```

Poi apri `index.html` con un piccolo server locale (es. `npx serve` oppure
l'estensione "Live Server" di VS Code) — aprendo il file direttamente dal
filesystem il `fetch("stories.json")` non funziona per via del `file://`.

## Struttura

```
index.html          pagina del lettore
style.css            stile
app.js               navigazione, segnalibro, condivisione
stories/*.md         le storie, una per file
scripts/build.mjs     genera stories.json da stories/*.md
stories.json          generato automaticamente — non modificarlo a mano
.github/workflows/build.yml   la Action che rigenera stories.json
```
