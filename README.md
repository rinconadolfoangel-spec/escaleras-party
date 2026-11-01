# 🎲 Escaleras Party

Serpientes y escaleras con minijuegos al estilo Mario Party. Cada vez que **todos** los jugadores terminan su turno, se abre un minijuego para todos a la vez. Los mejores avanzan casillas extra (🥇 +3, 🥈 +2, 🥉 +1). El primero en llegar a la casilla 40 gana.

También incluye un **Salón de minijuegos** para jugarlos solo, con récord guardado en tu navegador.

## Cómo jugar en LAN (misma red WiFi)

Solo necesitas [Node.js](https://nodejs.org) 18 o más nuevo. No hay nada que instalar con npm.

```bash
node server.js
```

La terminal te muestra dos direcciones:

```
En esta compu:   http://localhost:3000
Para tus amigos: http://192.168.1.50:3000
```

1. Tú abres la primera, pones tu nombre y le das **Crear sala**.
2. Tus amigos abren la segunda en el navegador de su celular o compu, ponen su nombre y el **código de 4 letras**.
3. Tú le das **¡Empezar partida!** (hasta 6 jugadores).

Si no conectan: revisa que estén en la misma red y que el firewall de tu compu permita el puerto 3000 (Windows suele preguntar la primera vez; di que sí en redes privadas).

## Cómo jugar online

El juego ya funciona por internet, solo falta que el servidor sea alcanzable desde afuera. Dos formas:

- **Rápida (sin subir nada):** deja `node server.js` corriendo y abre un túnel, por ejemplo con `cloudflared tunnel --url http://localhost:3000` o `ngrok http 3000`. Pasa la liga https que te den; el código de sala funciona igual.
- **Permanente:** súbelo a un hosting que corra Node (Render, Railway, Fly.io…). El comando de inicio es `node server.js` y respeta la variable `PORT`.

## Jugar desde el teléfono (app instalable)

El juego ya es una **app instalable (PWA)**: en Android se instala desde Chrome con su icono y en pantalla completa, sin barra del navegador. No es un `.apk`, pero se usa igual.

**Importante:** la app siempre necesita el servidor corriendo (ahí vive la partida). Hay tres formas de tenerlo:

1. **En tu compu**, con `node server.js` (todos en la misma WiFi). Es lo más fácil.
2. **En tu propio teléfono** con Termux, sin compu (pasos abajo).
3. **En internet**, con un túnel o un hosting (ver "Cómo jugar online").

### Instalarla como app

Chrome solo permite instalar apps si la dirección es **HTTPS** (o `localhost`). Eso cambia según cómo juegues:

- **Con túnel o hosting (HTTPS):** abre la liga en Chrome. Verás el botón **📲 Instalar app** en el menú del juego, o usa el menú ⋮ de Chrome → *Instalar app*. Queda un icono en tu pantalla de inicio.
- **En LAN con `http://192.168...` (sin HTTPS):** Chrome no deja instalarla como app. Puedes usar ⋮ → *Agregar a la pantalla de inicio* para tener un acceso directo, pero se abre como página normal.
- **iPhone:** Safari → Compartir → *Agregar a inicio* (también requiere HTTPS para verse como app).

### Servidor dentro del teléfono (Termux)

1. Instala **Termux desde F-Droid** (la versión de Play Store está desactualizada).
2. Descarga `escaleras-party.zip` en el teléfono (queda en Descargas).
3. En Termux:
   ```bash
   pkg update
   pkg install nodejs unzip
   termux-setup-storage
   unzip ~/storage/downloads/escaleras-party.zip -d ~
   cd ~/escaleras-party
   node server.js
   ```
4. Tus amigos se conectan a tu teléfono: o están en la misma WiFi, o se conectan al **hotspot** de tu teléfono. Ellos abren `http://IP-DE-TU-TELEFONO:3000` (la IP la ves en Ajustes → WiFi → tu red, o en la pantalla de Termux si aparece), y tú abres `http://localhost:3000`.
5. Si Android duerme Termux y se corta la partida, activa *Acquire wakelock* en la notificación de Termux y no apagues la pantalla.

## Generar el APK con GitHub

GitHub compila el `.apk` por ti (gratis); no necesitas Android Studio. El proyecto ya incluye todo: la carpeta `mobile/` y el workflow `.github/workflows/build-apk.yml`.

1. **Crea un repositorio** en [github.com/new](https://github.com/new), por ejemplo `escaleras-party`. Si quieres compartir el APK con una liga pública para tus amigos, hazlo **público**.
2. **Sube todo el contenido de esta carpeta** (incluida `.github`):
   ```bash
   cd escaleras-party
   git init -b main
   git add .
   git commit -m "Escaleras Party"
   git remote add origin https://github.com/TU-USUARIO/escaleras-party.git
   git push -u origin main
   ```
   Sin git: en tu repositorio usa *Add file → Upload files* y arrastra el contenido. Si la carpeta oculta `.github` no se sube, crea el archivo con *Add file → Create new file*, nómbralo `.github/workflows/build-apk.yml` y pega ahí su contenido.
3. Entra a la pestaña **Actions**. El workflow **Compilar APK** arranca solo al subir los archivos (también puedes lanzarlo con *Run workflow*). Tarda unos 5 a 10 minutos.
4. Cuando salga la palomita verde, descarga `escaleras-party.apk` desde **Releases → "APK más reciente"** (a la derecha de la página del repositorio). También queda en la ejecución, en *Artifacts*.
5. **Instálalo** en el teléfono: pásalo por WhatsApp, Drive o con la liga de Releases y acepta *Instalar apps de origen desconocido* cuando Android lo pida. Es un APK de prueba (debug), así que Android puede mostrar un aviso de seguridad.

Cada vez que subas cambios al repositorio, el APK se vuelve a compilar y se reemplaza.

### Usar el APK

El APK trae el juego adentro, pero **la partida vive en el servidor**, así que al abrirlo aparece un campo **Servidor**:

- Misma WiFi con la compu corriendo `node server.js`: escribe la dirección que muestra la compu, por ejemplo `192.168.1.50:3000`.
- Servidor en tu propio teléfono (Termux): `localhost:3000`. Tus amigos escriben la IP de tu teléfono y `:3000`.
- Online con túnel o hosting: pega la liga `https://...`.

El **Salón de minijuegos** funciona sin servidor ni internet. La dirección queda guardada para la próxima vez.

Si el workflow falla, abre la ejecución en Actions, copia el error que sale en rojo y mándamelo para corregirlo.

## Monedas y personajes

- Ganas 🪙 **en partida**: tras cada minijuego, 🥇 15, 🥈 10, 🥉 7 y los demás 5. Al terminar la partida, el ganador recibe 40 y los demás 10.
- Ganas 🪙 **en el Salón** (modo solo): 3 por jugar y 5 extra si rompes tu récord.
- Con las monedas compras personajes en la **Tienda** (21 en total, de 30 a 300 monedas; el gato y el perro son gratis). El personaje que eliges aparece como tu ficha en el tablero.
- Tipos de personaje: **emojis**, **pixel art** (Guerrera de la aguja y los guerreros Aqua, Magma y Nova) y **personajes de bloques 3D** (Cubo, Calavera y Robot voxel), con cabeza, cuerpo, dos brazos y dos piernas.

## Animaciones

- Al tirar el dado, la ficha **camina casilla por casilla** (un paso cada 0.3 s) y se voltea hacia donde va. Si cae en serpiente o escalera, termina de caminar y luego se **desliza** hasta su destino.
- Los guerreros en pixel art mueven las piernas (dos cuadros que se alternan). Los personajes de bloques giran de lado y balancean brazos y piernas al caminar. Los emojis se balancean y brincan.
- En la **Tienda**, pasa el mouse sobre un personaje para verlo caminar.
- El servidor espera lo que dura la caminata antes de dar el turno al siguiente, así que nadie se pisa.

## Vista 3D

El tablero se ve inclinado en 3D y las fichas se paran sobre él (hechas con CSS 3D, sin librerías, así que funciona sin internet en la LAN). Si en algún dispositivo se ve raro o lento, el botón **Vista: 3D / 2D** debajo del dado cambia a vista plana, y se recuerda para la próxima vez.
- Las monedas y los personajes se guardan **en el navegador de cada quien** (no en el servidor). Si borras los datos del navegador o cambias de dispositivo, empiezas de cero.

## Minijuegos incluidos (10)

| Juego | Qué hay que hacer |
|---|---|
| 👆 ¡Machaca! | Tocar lo más rápido posible durante 10 s |
| ⚡ Reflejos | Tocar cuando la pantalla se pone verde (antes = 0 puntos) |
| 🧺 Atrapa monedas | Mover la canasta 25 s: monedas suman, bombas restan |
| 🧮 Mates relámpago | Resolver operaciones en 30 s |
| 🧠 Simón dice | Repetir una secuencia de colores cada vez más larga |
| 🎯 Tiro al blanco | Tocar los blancos antes de que desaparezcan (20 s) |
| ☄️ Esquiva | Mover la nave y esquivar meteoritos; gana quien aguante más (máx. 30 s) |
| 🎨 Color trampa | Tocar el color de la tinta, no el de la palabra (20 s) |
| 🎚️ Punto exacto | Detener la barra en el centro, 5 intentos |
| 🃏 Memorama | Encontrar las 6 parejas lo más rápido posible |

Todos los jugadores reciben **la misma semilla**, así que el reto (monedas, preguntas, secuencia) es idéntico para todos y gana quien lo haga mejor.

## Agregar un minijuego nuevo

1. En `public/index.html`, dentro del objeto `GAMES`, agrega una entrada con `name`, `emoji`, `desc`, `fmt(score)` y `start(area, seed, terminar)`. `start` dibuja el juego en `area`, llama `terminar(puntos)` una sola vez (más puntos = mejor) y devuelve una función de limpieza. Usa `rng(seed)` para todo lo aleatorio.
2. En `server.js`, agrega su id y duración en milisegundos al objeto `MINIGAMES`.

Con eso aparece solo en las partidas y en el Salón.

## Agregar un personaje nuevo

1. En `public/index.html`, agrega una línea al arreglo `CHARS` con `id`, `e` (emoji), `n` (nombre) y `p` (precio). Eso basta para un personaje de emoji.
2. Para **pixel art**, agrega además `kind: 'sprite'`, `rows` (un mapa de letras, 12 columnas por fila; `.` es transparente), `pal` (el color de cada letra) y `aura` (color del brillo). Opcional: `rows2`, un segundo cuadro con las piernas abiertas para la animación de caminar (usa `frameB`). Mira `NEEDLE_ROWS` y `WARRIOR_ROWS` como ejemplo.
3. Para un **personaje de bloques**, agrega `kind: 'cube'`, `face` (mapa de 8x8 para la cara), `fpal` (colores de la cara), `head` (color de la cabeza), `body` (cuerpo), y opcionalmente `arms` (brazos), `legs` (piernas) y `bodyFront` (un fondo CSS para el pecho, por ejemplo rayas o una luz).
4. En `server.js`, agrega el mismo `id` a `CHAR_IDS`.

## Ajustes rápidos (`server.js`)

- `BOARD_END`, `SNAKES`, `LADDERS`: tamaño y posición de serpientes y escaleras (si cambias el tamaño del tablero, ajusta también `COLS` y `ROWS` en el cliente).
- `BONUS`: casillas extra por lugar en el minijuego.
- `MAX_PLAYERS`: jugadores por sala.

## Archivos

```
server.js        servidor: salas, turnos, tablero, rondas de minijuegos
mini-ws.js       WebSocket mínimo sin dependencias
public/index.html  todo el cliente: menú, lobby, tablero, minijuegos, salón
```

## Limitaciones del prototipo

- Si alguien se desconecta no puede volver a entrar a la misma partida (el juego sigue sin esa persona).
- No hay trampa-protección: los puntajes de los minijuegos los reporta cada navegador, y las monedas viven en el navegador (se pueden editar). Está pensado para jugar con amigos.
- El 3D es "ligero": tablero inclinado y personajes de pie, sin cámara libre ni sombras reales. Para 3D completo habría que usar una librería como Three.js, que obliga a que todos los jugadores tengan internet o a incluir la librería en el proyecto.
