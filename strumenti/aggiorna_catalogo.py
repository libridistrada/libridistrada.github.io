#!/usr/bin/env python3
"""Porta il catalogo dall'HP al sito (da lanciare sul PC prima di pubblicare).

- legge /var/lib/hplab/libri/catalogo.json e le copertine dall'HP (via SSH)
- scrive data/catalogo.json in forma compatta (solo quello che serve al sito)
- converte le copertine in WebP leggeri (copertine/<id>.webp)
- copia in riserva/ gli ePub dei libri più importanti (si leggono anche se l'HP dorme)

Uso: python strumenti/aggiorna_catalogo.py [--riserva 300] [--riserva-mb 180]
"""
import argparse
import datetime as dt
import io
import json
import os
import subprocess
import sys
import tarfile

from PIL import Image

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOME = os.path.expanduser("~")
SSH = ["ssh", "-F", "none", "-i", os.path.join(HOME, ".ssh", "hplab_ed25519"), "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
       "-o", "UserKnownHostsFile=" + os.path.join(HOME, ".ssh", "hplab_known_hosts"), "hplab@192.168.1.176"]
SERVER = "https://hplab.taile5469d.ts.net/libri"
STATO = "/var/lib/hplab/libri"
LIBRI = "/srv/nas/Libri"


def slug(s):
    """come scarica_libri.slug: deve dare lo stesso nome di file"""
    import re
    s = s.lower()
    for x, y in (("àáâä", "a"), ("èéêë", "e"), ("ìíîï", "i"), ("òóôö", "o"), ("ùúûü", "u")):
        s = re.sub(f"[{x}]", y, s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:80]


def ssh_tar(base, paths):
    """scarica file dall'HP come archivio tar, in memoria"""
    if not paths:
        return {}
    cmd = SSH + [f"cd {base} && tar -cf - --ignore-failed-read -T - 2>/dev/null"]
    r = subprocess.run(cmd, input="\n".join(paths).encode(), capture_output=True, timeout=1800)
    out = {}
    with tarfile.open(fileobj=io.BytesIO(r.stdout)) as t:
        for m in t.getmembers():
            if m.isfile():
                out[m.name] = t.extractfile(m).read()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--riserva", type=int, default=300)
    ap.add_argument("--riserva-mb", type=int, default=180)
    a = ap.parse_args()

    cat = json.loads(subprocess.run(SSH + [f"cat {STATO}/catalogo.json"], capture_output=True, timeout=120).stdout or b'{"libri":{}}')
    libri = list(cat.get("libri", {}).values())
    print(f"{len(libri)} libri nel catalogo dell'HP")

    # copertine
    os.makedirs(os.path.join(QUI, "copertine"), exist_ok=True)
    elenco = subprocess.run(SSH + [f"ls {STATO}/copertine 2>/dev/null"], capture_output=True, timeout=60).stdout.decode().split()
    autori_slug = {slug(a) for b in libri for a in (b.get("autori") or [])}
    serve = [f for f in elenco if f[:-4] in {b["id"] for b in libri} or (f.startswith("autore-") and f[7:-4] in autori_slug)]
    manca = [f for f in serve if not os.path.exists(os.path.join(QUI, "copertine", f[:-4] + ".webp"))]
    for nome, data in ssh_tar(f"{STATO}/copertine", manca).items():
        try:
            im = Image.open(io.BytesIO(data)).convert("RGB")
            # tagliata in verticale 2:3 come una locandina, centrata un po' in alto
            w, h = im.size
            if w / h > 2 / 3:
                nw = int(h * 2 / 3); x = (w - nw) // 2; im = im.crop((x, 0, x + nw, h))
            else:
                nh = int(w * 3 / 2); y = int((h - nh) * .3); im = im.crop((0, y, w, y + nh))
            im = im.resize((360, 540), Image.LANCZOS)
            im.save(os.path.join(QUI, "copertine", os.path.basename(nome)[:-4] + ".webp"), "WEBP", quality=72, method=6)
        except Exception as e:   # immagine rovinata: resta la copertina disegnata
            print("copertina saltata", nome, e)
    con_cop = {f[:-5] for f in os.listdir(os.path.join(QUI, "copertine")) if f.endswith(".webp")}

    # riserva: i più importanti, entro il tetto di spazio
    imp = sorted([b for b in libri if b.get("epub")], key=lambda b: (not b.get("sezioni"), not b.get("canone"), -(b.get("letture") or 0)))
    scelti, tot = [], 0
    for b in imp:
        if len(scelti) >= a.riserva:
            break
        if tot + (b.get("epub_byte") or 0) > a.riserva_mb * 1e6:
            continue
        scelti.append(b); tot += b.get("epub_byte") or 0
    os.makedirs(os.path.join(QUI, "riserva"), exist_ok=True)
    gia = {f[:-5] for f in os.listdir(os.path.join(QUI, "riserva")) if f.endswith(".epub")}
    voglio = {b["id"] for b in scelti}
    for f in gia - voglio:
        os.remove(os.path.join(QUI, "riserva", f + ".epub"))
    da_prendere = [b for b in scelti if b["id"] not in gia]
    dati = ssh_tar(LIBRI, [b["epub"] for b in da_prendere])
    for b in da_prendere:
        if b["epub"] in dati:
            with open(os.path.join(QUI, "riserva", b["id"] + ".epub"), "wb") as f:
                f.write(dati[b["epub"]])
    in_riserva = {f[:-5] for f in os.listdir(os.path.join(QUI, "riserva")) if f.endswith(".epub")}
    print(f"riserva: {len(in_riserva)} ePub, {tot / 1e6:.0f} MB")

    oggi = dt.date.today()
    out = []
    for b in libri:
        tr = b.get("trama") or {}
        agg = b.get("aggiunto") or ""
        nuovo = bool(b.get("moderno")) and agg and (oggi - dt.date.fromisoformat(agg)).days < 45
        v = {"id": b["id"], "t": b["titolo"], "a": b.get("autori") or [], "c": b.get("categoria"), "s": b.get("sezioni") or [], "sf": b.get("scaffali") or [], "w": b.get("parole"),
             "y": b.get("anno"), "n": b.get("autore_nato"), "m": b.get("autore_morto"), "k": 1 if b.get("canone") else 0,
             "v": b.get("letture") or 0, "e": b.get("epub"), "eb": b.get("epub_byte") or 0, "p": b.get("pdf"), "pb": b.get("pdf_byte") or 0,
             "f": b.get("fonte"), "fn": b.get("fonte_nome"), "l": b.get("licenza"), "agg": agg}
        if tr.get("testo"):
            v["tr"], v["trf"] = tr["testo"], tr.get("fonte")
        elif b.get("incipit"):
            v["inc"] = b["incipit"]
        if b["id"] in con_cop:
            v["cov"] = 1
        else:   # niente immagine del libro: il ritratto dell'autore, se c'è
            r = next(("autore-" + slug(x) for x in (b.get("autori") or []) if "autore-" + slug(x) in con_cop), None)
            if r:
                v["cov"] = r
        if b["id"] in in_riserva: v["r"] = 1
        if b.get("scansione"): v["sc"] = 1
        if b.get("edizione_nostra"): v["nostra"] = 1
        if nuovo: v["nuovo"] = 1
        out.append({k: x for k, x in v.items() if x not in (None, "", [], 0) or k in ("id", "t", "a", "c")})
    os.makedirs(os.path.join(QUI, "data"), exist_ok=True)
    with open(os.path.join(QUI, "data", "catalogo.json"), "w", encoding="utf-8") as f:
        json.dump({"aggiornato": dt.datetime.now().isoformat(timespec="minutes"), "server": SERVER, "libri": out}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"data/catalogo.json: {len(out)} libri, {os.path.getsize(os.path.join(QUI, 'data', 'catalogo.json')) / 1e3:.0f} KB")


if __name__ == "__main__":
    sys.exit(main())
