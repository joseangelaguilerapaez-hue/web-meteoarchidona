         const API_BASE = "https://api-meteoarchidona.onrender.com";
         const RADAR_ACTIVO = "AHR",
             PRODUCTO = "PPI";
         const URL_LOCALIDADES = new URL(
             "../datos/localidades-radar.geojson",
             window.location.href,
         ).href;
         const RADAR_AHR = [36.6133333, -4.6591667],
             RADAR_SE = [37.6875, -6.3344444];
         const ENCUADRE_REGIONAL = [
             [35.6, -7.2],
             [38.6, -3.1],
         ];
         const ALCANCE_NOMINAL_KM = 240;

         let mapa = null,
             capaRadar = null,
             capaAnillos = null,
             capaLocalidades = null;
         let localidades = [],
             fotogramas = [],
             indice = 0,
             reproduciendo = false,
             temporizador = null,
             opacidad = 0.82;

         function elemento(id) {
             return document.getElementById(id);
         }
         function texto(id, v) {
             const n = elemento(id);
             if (n) n.textContent = v;
         }
         function fechaValida(v) {
             const f = new Date(v);
             return Number.isNaN(f.getTime()) ? null : f;
         }
         function hora(v) {
             const f = fechaValida(v);
             return f
                 ? f.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                 : "--:--";
         }
         function fecha(v) {
             const f = fechaValida(v);
             return f
                 ? f.toLocaleDateString("es-ES", {
                       day: "2-digit",
                       month: "2-digit",
                       year: "numeric",
                   })
                 : "--";
         }
         function urlAbsoluta(u) {
             if (!u) return null;
             if (/^https?:\/\//.test(u)) return u;
             if (u.startsWith("/")) return API_BASE + u;
             return `${API_BASE}/${u}`;
         }
         function establecerEstado(m, t = null) {
             const e = elemento("estado");
             texto("estado-texto", m);
             e.classList.remove("correcto", "error");
             if (t) e.classList.add(t);
         }
         function mostrarMensaje(m, error = false) {
             const n = elemento("mensaje");
             if (!m) {
                 n.classList.remove("visible", "error");
                 n.textContent = "";
                 return;
             }
             n.textContent = m;
             n.classList.toggle("error", error);
             n.classList.add("visible");
         }

         function puntoDestino(o, km, rumbo) {
             const r = 6371.0088,
                 lat1 = (o[0] * Math.PI) / 180,
                 lon1 = (o[1] * Math.PI) / 180,
                 b = (rumbo * Math.PI) / 180,
                 d = km / r;
             const lat2 = Math.asin(
                 Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
             );
             const lon2 =
                 lon1 +
                 Math.atan2(
                     Math.sin(b) * Math.sin(d) * Math.cos(lat1),
                     Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
                 );
             return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
         }

         function crearPanelesMapa() {
             for (const [n, z] of [
                 ["radarPane", 350],
                 ["anillosPane", 520],
                 ["localidadesPane", 620],
                 ["radaresPane", 630],
             ]) {
                 mapa.createPane(n);
                 mapa.getPane(n).style.zIndex = z;
                 mapa.getPane(n).style.pointerEvents = "none";
             }
             mapa.getPane("tooltipPane").style.zIndex = "700";
         }

         /* Anillos adaptativos */
         function escalaAnillosParaZoom(z) {
             if (z <= 6) return [25, 50, 75, 100];
             if (z === 7) return [20, 40, 60, 80];
             if (z === 8) return [15, 30, 45, 60];
             if (z === 9) return [10, 20, 30, 40];
             if (z === 10) return [5, 10, 15, 20];
             return [2, 4, 6, 8, 10];
         }

         function iconoEtiquetaAnillo(codigo, km) {
             return L.divIcon({
                 className: "etiqueta-anillo-radar",
                 html: `<span>${codigo} · ${km} km</span>`,
                 iconSize: [72, 18],
                 iconAnchor: [36, 9],
             });
         }

         function crearAnillosRadar(codigo, centro, rumbo, distancias) {
             distancias.forEach((km) => {
                 capaAnillos.addLayer(
                     L.circle(centro, {
                         pane: "anillosPane",
                         radius: km * 1000,
                         fill: false,
                         color: "#111",
                         weight: 2.4,
                         opacity: 0.92,
                         interactive: false,
                     }),
                 );
                 capaAnillos.addLayer(
                     L.marker(puntoDestino(centro, km, rumbo), {
                         pane: "anillosPane",
                         icon: iconoEtiquetaAnillo(codigo, km),
                         interactive: false,
                         keyboard: false,
                     }),
                 );
             });
         }

         /* El alcance nominal NO recorta la imagen radar.
Es únicamente una referencia cartográfica. */
         function crearAlcanceNominal(centro) {
             capaAnillos.addLayer(
                 L.circle(centro, {
                     pane: "anillosPane",
                     radius: ALCANCE_NOMINAL_KM * 1000,
                     fill: false,
                     color: "#111",
                     weight: 1.4,
                     opacity: 0.58,
                     dashArray: "9 8",
                     interactive: false,
                 }),
             );
         }

         function renderizarAnillos() {
             if (!mapa || !capaAnillos) return;
             capaAnillos.clearLayers();

             const zoom = mapa.getZoom();
             const d = escalaAnillosParaZoom(zoom);

             crearAnillosRadar("AHR", RADAR_AHR, 90, d);
             crearAnillosRadar("SE", RADAR_SE, 270, d);

             /* Visible en vistas regionales, incluida la vista inicial móvil. */
             if (zoom <= 7) {
                 crearAlcanceNominal(RADAR_AHR);
                 crearAlcanceNominal(RADAR_SE);
             }

             texto("dato-cobertura", d.join(" · ") + " km");
         }

         function crearCentroRadar(codigo, nombre, centro, direccion) {
             L.circleMarker(centro, {
                 pane: "radaresPane",
                 radius: 5,
                 color: "#fff",
                 weight: 2,
                 fill: true,
                 fillColor: "#111",
                 fillOpacity: 1,
                 opacity: 1,
                 interactive: false,
             })
                 .addTo(mapa)
                 .bindTooltip(`${codigo} · ${nombre}`, {
                     permanent: true,
                     direction: direccion,
                     offset: direccion === "top" ? [0, -8] : [0, 8],
                     className: "etiqueta-radar",
                 });
         }

         /* Localidades */
         function prioridadLocalidad(f) {
             const v = Number(f?.properties?.prioridad);
             return Number.isFinite(v) ? v : 99;
         }
         function zoomMinimoLocalidad(f) {
             const v = Number(f?.properties?.zoom_min);
             return Number.isFinite(v) ? v : 5;
         }
         function claseEtiquetaLocalidad(tipo) {
             const p = ["capital", "ciudad", "municipio", "pedania", "cabecera", "estacion"];
             return `etiqueta-localidad etiqueta-${p.includes(tipo) ? tipo : "municipio"}`;
         }
         function estiloPuntoLocalidad(p) {
             if (p.tipo === "capital")
                 return {
                     radius: 4.5,
                     color: "#fff",
                     weight: 1.5,
                     fill: true,
                     fillColor: "#a8325a",
                     fillOpacity: 1,
                     opacity: 1,
                 };
             if (p.tipo === "ciudad" || p.tipo === "cabecera")
                 return {
                     radius: 4,
                     color: "#fff",
                     weight: 1.4,
                     fill: true,
                     fillColor: "#a8325a",
                     fillOpacity: 1,
                     opacity: 1,
                 };
             if (p.tipo === "estacion")
                 return {
                     radius: 4,
                     color: "#fff",
                     weight: 1.5,
                     fill: true,
                     fillColor: "#3b9eff",
                     fillOpacity: 1,
                     opacity: 1,
                 };
             if (p.tipo === "pedania")
                 return {
                     radius: 2.8,
                     color: "#fff",
                     weight: 1,
                     fill: true,
                     fillColor: "#36d5ff",
                     fillOpacity: 1,
                     opacity: 1,
                 };
             return {
                 radius: 3,
                 color: "#fff",
                 weight: 1,
                 fill: true,
                 fillColor: "#111",
                 fillOpacity: 1,
                 opacity: 1,
             };
         }
         function direccionEtiquetaLocalidad(p) {
             return p.tipo === "estacion" ? "right" : "top";
         }
         function offsetEtiquetaLocalidad(p) {
             if (p.tipo === "estacion") return [7, 0];
             return [0, -7];
         }
         function nombreEtiquetaLocalidad(p) {
             return p.nombre || "";
         }

         function renderizarLocalidades() {
             if (!mapa || !capaLocalidades) return;
             capaLocalidades.clearLayers();
             const zoom = mapa.getZoom();
             const visibles = localidades
                 .filter((f) => zoom >= zoomMinimoLocalidad(f))
                 .sort((a, b) => prioridadLocalidad(b) - prioridadLocalidad(a));

             visibles.forEach((f) => {
                 const g = f.geometry,
                     p = f.properties || {};
                 if (
                     !g ||
                     g.type !== "Point" ||
                     !Array.isArray(g.coordinates) ||
                     g.coordinates.length < 2
                 )
                     return;
                 const lon = Number(g.coordinates[0]),
                     lat = Number(g.coordinates[1]);
                 if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
                 const punto = L.circleMarker([lat, lon], {
                     pane: "localidadesPane",
                     ...estiloPuntoLocalidad(p),
                     interactive: false,
                 });
                 punto.bindTooltip(nombreEtiquetaLocalidad(p), {
                     permanent: true,
                     direction: direccionEtiquetaLocalidad(p),
                     offset: offsetEtiquetaLocalidad(p),
                     className: claseEtiquetaLocalidad(p.tipo),
                 });
                 capaLocalidades.addLayer(punto);
             });
         }

         async function cargarLocalidades() {
             try {
                 const r = await fetch(URL_LOCALIDADES, { cache: "no-store" });
                 if (!r.ok) throw new Error(`HTTP ${r.status}`);
                 const d = await r.json();
                 if (d.type !== "FeatureCollection" || !Array.isArray(d.features))
                     throw new Error("GeoJSON de localidades inválido.");
                 localidades = d.features.filter(
                     (f) => f && f.geometry && f.geometry.type === "Point",
                 );
                 texto("dato-localidades", localidades.length);
                 renderizarLocalidades();
             } catch (e) {
                 console.error("No se ha podido cargar la capa de localidades:", e);
                 localidades = [];
                 texto("dato-localidades", "No disponible");
             }
         }

         /* Mapa */
         function crearMapa() {
             if (typeof L === "undefined") {
                 establecerEstado("Leaflet no disponible", "error");
                 mostrarMensaje("No se ha podido cargar la librería del mapa.", true);
                 return;
             }

             mapa = L.map("mapa-radar", {
                 center: [37.1, -5.15],
                 zoom: 7,
                 minZoom: 5,
                 maxZoom: 16,
                 zoomControl: true,
             });
             crearPanelesMapa();

             L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                 maxZoom: 19,
                 attribution: "&copy; OpenStreetMap contributors",
             }).addTo(mapa);

             capaAnillos = L.layerGroup().addTo(mapa);
             capaLocalidades = L.layerGroup().addTo(mapa);

             crearCentroRadar("AHR", "Málaga", RADAR_AHR, "bottom");
             crearCentroRadar("SE", "Cañada Alta", RADAR_SE, "top");

             L.control
                 .scale({ metric: true, imperial: false, position: "bottomright" })
                 .addTo(mapa);
             mapa.fitBounds(ENCUADRE_REGIONAL, { padding: [4, 4] });

             mapa.on("zoomend", () => {
                 renderizarAnillos();
                 renderizarLocalidades();
             });

             renderizarAnillos();
             reajustarMapa();
         }

         function reajustarMapa() {
             if (!mapa) return;
             requestAnimationFrame(() => mapa.invalidateSize({ animate: false, pan: false }));
         }

         window.addEventListener("resize", reajustarMapa);
         window.addEventListener("orientationchange", () => setTimeout(reajustarMapa, 150));
         if (window.visualViewport)
             window.visualViewport.addEventListener("resize", reajustarMapa);

         /* Radar */
         function bounds(f) {
             if (!f || !f.limites) return null;
             const o = Number(f.limites.oeste),
                 s = Number(f.limites.sur),
                 e = Number(f.limites.este),
                 n = Number(f.limites.norte);
             if (![o, s, e, n].every(Number.isFinite)) return null;
             return [
                 [s, o],
                 [n, e],
             ];
         }

         function actualizarControles() {
             const a = fotogramas[indice];
             texto("timeline-posicion", a ? hora(a.observado_en) : "--:--");
             if (fotogramas.length) {
                 texto("timeline-inicio", hora(fotogramas[0].observado_en));
                 texto("timeline-fin", hora(fotogramas[fotogramas.length - 1].observado_en));
             } else {
                 texto("timeline-inicio", "--");
                 texto("timeline-fin", "--");
             }
             const s = elemento("timeline-slider");
             s.max = Math.max(0, fotogramas.length - 1);
             s.value = indice;
         }

         function mostrarFotograma(nuevoIndice) {
             if (!mapa || !fotogramas.length) return;

             indice = Math.max(0, Math.min(nuevoIndice, fotogramas.length - 1));

             const f = fotogramas[indice],
                 b = bounds(f),
                 u = urlAbsoluta(f.url_imagen);

             if (!b || !u) {
                 mostrarMensaje("El fotograma no contiene bounds o URL válidos.", true);
                 return;
             }

             if (capaRadar) {
                 mapa.removeLayer(capaRadar);
                 capaRadar = null;
             }

             const url =
                 u + (u.includes("?") ? "&" : "?") + "_=" + encodeURIComponent(f.observado_en);

             /* Reflectividad completa dentro de los bounds originales del producto.
Los anillos no actúan como máscara ni realizan ningún recorte. */
             capaRadar = L.imageOverlay(url, b, {
                 pane: "radarPane",
                 opacity: opacidad,
                 interactive: false,
             }).addTo(mapa);

             texto("instante-hora", hora(f.observado_en));
             texto("instante-fecha", fecha(f.observado_en));

             actualizarControles();
             mostrarMensaje("");
             reajustarMapa();
         }

         async function cargarTimeline() {
             detener();
             establecerEstado("Cargando");
             mostrarMensaje("Cargando timeline AHR...");

             try {
                 const r = await fetch(
                     `${API_BASE}/radar/${RADAR_ACTIVO}/timeline?producto=${PRODUCTO}`,
                     { cache: "no-store" },
                 );
                 if (!r.ok) throw new Error(`HTTP ${r.status}`);

                 const d = await r.json();

                 if (!Array.isArray(d.fotogramas)) {
                     throw new Error("Timeline inválida.");
                 }

                 fotogramas = d.fotogramas
                     .slice()
                     .sort((a, b) => new Date(a.observado_en) - new Date(b.observado_en));

                 if (!fotogramas.length) {
                     throw new Error("No existen fotogramas.");
                 }

                 indice = fotogramas.length - 1;
                 texto("dato-fotogramas", fotogramas.length);
                 establecerEstado("AHR operativo", "correcto");
                 mostrarFotograma(indice);
             } catch (e) {
                 console.error(e);
                 fotogramas = [];
                 establecerEstado("No disponible", "error");
                 mostrarMensaje("No se ha podido cargar AHR: " + e.message, true);
             }
         }

         /* Animación */
         function actualizarBotonPlay() {
             elemento("reproducir").textContent = reproduciendo ? "Ⅱ" : "▶";
         }
         function detener() {
             if (temporizador) {
                 clearInterval(temporizador);
                 temporizador = null;
             }
             reproduciendo = false;
             actualizarBotonPlay();
         }
         function reproducir() {
             if (fotogramas.length < 2) return;
             detener();
             reproduciendo = true;
             actualizarBotonPlay();
             temporizador = setInterval(
                 () => mostrarFotograma(indice + 1 >= fotogramas.length ? 0 : indice + 1),
                 850,
             );
         }

         /* Eventos */
         function instalarEventos() {
             elemento("anterior").addEventListener("click", () => {
                 detener();
                 mostrarFotograma(indice - 1);
             });
             elemento("siguiente").addEventListener("click", () => {
                 detener();
                 mostrarFotograma(indice + 1);
             });
             elemento("reproducir").addEventListener("click", () =>
                 reproduciendo ? detener() : reproducir(),
             );
             elemento("recargar").addEventListener("click", cargarTimeline);
             elemento("timeline-slider").addEventListener("input", (e) => {
                 detener();
                 mostrarFotograma(Number(e.target.value));
             });
             elemento("opacidad-slider").addEventListener("input", (e) => {
                 opacidad = Number(e.target.value) / 100;
                 texto("opacidad-valor", `${e.target.value} %`);
                 if (capaRadar) capaRadar.setOpacity(opacidad);
             });
         }

         /*
         Ajustar el mapa sí necesita que la página esté pintada:
         invalidateSize mide el contenedor, y en una pestaña de
         fondo el navegador no pinta, así que mediría 0. Se vuelve
         a ajustar en cuanto la pestaña se muestra.
         */
         function reajustarMapaCuandoSeVea() {
             reajustarMapa();

             if (!document.hidden) {
                 return;
             }

             document.addEventListener("visibilitychange", function alVolver() {
                 if (document.hidden) {
                     return;
                 }

                 document.removeEventListener("visibilitychange", alVolver);
                 reajustarMapa();
             });
         }

         function iniciar() {
             crearMapa();
             instalarEventos();

             /*
             Los datos no se piden dentro de un requestAnimationFrame:
             no dependen de que se pinte nada, y en una pestaña de
             fondo el navegador no llama a rAF, así que el visor se
             quedaba sin localidades y sin timeline hasta que alguien
             mirase la pestaña.
             */
             cargarLocalidades();
             cargarTimeline();

             reajustarMapaCuandoSeVea();
         }

         if (document.readyState === "loading") {
             document.addEventListener("DOMContentLoaded", iniciar, { once: true });
         } else {
             iniciar();
         }

/*
Cabecera, pie, navegación y reloj comunes del sitio. Los monta
js/pagina.js, que se carga antes que este archivo. Dentro del
panel "Observaciones" de index.html esta página va en un iframe,
así que no se vuelve a poner la cabecera.
*/
montarCabeceraYPie("observaciones");
