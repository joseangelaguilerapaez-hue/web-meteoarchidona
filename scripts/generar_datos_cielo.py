# -*- coding: utf-8 -*-

"""
Genera los datos del mapa del cielo de la sección Luna (datos/cielo/*.json)
a partir de los ficheros de d3-celestial (Olaf Frohn, licencia BSD de tres
cláusulas; https://github.com/ofrohn/d3-celestial):

    python scripts/generar_datos_cielo.py <carpeta data de d3-celestial>

No es un paso de compilación: se ejecuta una vez y los JSON resultantes se
suben al repositorio. Coordenadas ecuatoriales J2000 en grados
(ascensión recta de 0 a 360).

- estrellas.json: [ar, dec, magnitud, índice de color B-V] hasta magnitud 5.
- nombres.json: nombre en español de las estrellas más brillantes (por HIP).
- constelaciones.json: código, nombre en español, punto donde poner el nombre y rango
  (1 las más conocidas, 3 las más pequeñas: en pantallas estrechas solo se rotulan las de 1).
- lineas.json: líneas de cada constelación.
- via-lactea.json: contornos de la Vía Láctea (tres niveles de brillo), simplificados.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


LIMITE_ESTRELLAS = 5.0

# Nombres en español de las estrellas con nombre propio más conocidas
# (el resto no se rotula).
NOMBRES_ES = {
    "Sirius": "Sirio", "Canopus": "Canopo", "Arcturus": "Arturo", "Vega": "Vega",
    "Capella": "Capela", "Rigel": "Rigel", "Procyon": "Proción", "Betelgeuse": "Betelgeuse",
    "Achernar": "Achernar", "Altair": "Altair", "Aldebaran": "Aldebarán", "Antares": "Antares",
    "Spica": "Espiga", "Pollux": "Pólux", "Fomalhaut": "Fomalhaut", "Deneb": "Deneb",
    "Regulus": "Régulo", "Castor": "Cástor", "Bellatrix": "Bellatrix", "Elnath": "Elnath",
    "Alnilam": "Alnilam", "Alnitak": "Alnitak", "Mintaka": "Mintaka", "Saiph": "Saiph",
    "Alioth": "Alioth", "Dubhe": "Dubhe", "Merak": "Merak", "Alkaid": "Alkaid", "Mizar": "Mizar",
    "Mirfak": "Mirfak", "Algol": "Algol", "Polaris": "Polar", "Kochab": "Kochab",
    "Alphard": "Alfard", "Denebola": "Denébola", "Hamal": "Hamal", "Alpheratz": "Alpheratz",
    "Mirach": "Mirach", "Almach": "Almach", "Rasalhague": "Rasalhague", "Shaula": "Shaula",
    "Nunki": "Nunki", "Kaus Australis": "Kaus Australis", "Diphda": "Difda", "Menkar": "Menkar",
    "Alhena": "Alhena", "Adhara": "Adhara", "Wezen": "Wezen", "Mirzam": "Mirzam",
    "Menkalinan": "Menkalinan", "Algieba": "Algieba", "Eltanin": "Eltanin", "Schedar": "Schedar",
    "Caph": "Caph", "Enif": "Enif", "Scheat": "Scheat", "Markab": "Markab", "Albireo": "Albireo",
    "Sadr": "Sadr", "Alderamin": "Alderamin", "Zubenelgenubi": "Zubenelgenubi", "Gacrux": "Gacrux",
}


def redondear(valor: float, cifras: int = 2) -> float:
    return round(valor, cifras)


def ar(lon: float) -> float:
    return redondear(lon % 360.0)


def main(origen: Path, destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)

    estrellas = []
    for f in json.loads((origen / "stars.6.json").read_text())["features"]:
        mag = f["properties"]["mag"]
        if mag > LIMITE_ESTRELLAS:
            continue
        lon, lat = f["geometry"]["coordinates"]
        bv = f["properties"].get("bv")
        try:
            bv = redondear(float(bv))
        except (TypeError, ValueError):
            bv = None
        estrellas.append([ar(lon), redondear(lat), redondear(mag), bv, f["id"]])
    estrellas.sort(key=lambda e: e[2])

    brillantes = {e[4] for e in estrellas}
    nombres = {}
    for hip, datos in json.loads((origen / "starnames.json").read_text()).items():
        nombre = NOMBRES_ES.get(datos.get("name") or "")
        if nombre and int(hip) in brillantes:
            nombres[hip] = nombre

    constelaciones = []
    for f in json.loads((origen / "constellations.json").read_text())["features"]:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        constelaciones.append({"c": f["id"], "n": p.get("es") or p["name"], "p": [ar(lon), redondear(lat)], "r": int(p.get("rank") or 3)})

    lineas = {}
    for f in json.loads((origen / "constellations.lines.json").read_text())["features"]:
        lineas[f["id"]] = [[[ar(lon), redondear(lat)] for lon, lat in tramo] for tramo in f["geometry"]["coordinates"]]

    via = {}
    for f in json.loads((origen / "mw.json").read_text())["features"]:
        if f["id"] not in ("ol1", "ol2", "ol3"):
            continue
        poligonos = []
        for poligono in f["geometry"]["coordinates"]:
            for anillo in poligono:
                paso = 3 if len(anillo) > 60 else 1
                puntos = [[ar(lon), redondear(lat, 1)] for lon, lat in anillo[::paso]]
                if len(puntos) >= 4:
                    poligonos.append(puntos)
        via[f["id"]] = poligonos

    escribir = lambda nombre, datos: (destino / nombre).write_text(
        json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    escribir("estrellas.json", [e[:4] for e in estrellas])
    escribir("nombres.json", {str(k): v for k, v in sorted(nombres.items(), key=lambda kv: int(kv[0]))})
    escribir("constelaciones.json", constelaciones)
    escribir("lineas.json", lineas)
    escribir("via-lactea.json", via)

    # Los nombres van por posición en estrellas.json (índice), no por HIP.
    indice = {e[4]: i for i, e in enumerate(estrellas)}
    escribir("nombres.json", {str(indice[int(h)]): n for h, n in nombres.items()})

    for fichero in sorted(destino.glob("*.json")):
        print(f"{fichero.name}: {fichero.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(__file__).resolve().parent.parent / "datos" / "cielo")


# Fin de fichero: scripts/generar_datos_cielo.py
