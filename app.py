"""Site web interactif – Accès aux services publics dans les communes du Togo (Flask + pandas)."""
import json
from pathlib import Path
import pandas as pd
from flask import Flask, jsonify, render_template, send_from_directory

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
app = Flask(__name__)

# Polygones ADM2 (découpage ~2010) -> unité harmonisée 2010 utilisée dans communes.csv
RAW = {"Lome Commune": "DAGL_2010", "Golfe": "DAGL_2010", "Plaine de Mô": "Sotouboua+Mô",
       "Sotouboua": "Sotouboua+Mô", "Ave": "Avé", "Keran": "Kéran", "Tandjouare": "Tandjoaré",
       "Tone": "Tône", "Kpendjal": "Kpendjal+Ouest", "Oti": "Oti+Sud"}
LABELS = {"DAGL_2010": "Grand Lomé", "Sotouboua+Mô": "Sotouboua + Mô",
          "Kpendjal+Ouest": "Kpendjal + Kpendjal-Ouest", "Oti+Sud": "Oti + Oti-Sud"}
COLS = ["region", "prefecture", "commune", "cle_2010", "pop_2022", "pop_2010_est", "hommes_2022", "femmes_2022",
        "rapport_masculinite", "nb_ceet", "nb_tde", "taux_elec_est", "taux_elec_region", "tcam_pct", "taux_cni_est"]


def records(df):
    return json.loads(df.to_json(orient="records", force_ascii=False))


def build():
    rd = lambda f: pd.read_csv(DATA / f, encoding="utf-8-sig")
    geo = json.loads((DATA / "togo_adm2.geojson").read_text(encoding="utf-8"))
    polys = [{"poly": f["properties"]["shapeName"],
              "cle": RAW.get(f["properties"]["shapeName"], f["properties"]["shapeName"])} for f in geo["features"]]
    return {"communes": records(rd("communes.csv")[COLS]), "naissances": records(rd("naissances_national.csv")),
            "identite": records(rd("identite_nationale.csv")), "polys": polys, "labels": LABELS}, geo


DB, GEO = build()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/data")
def api_data():
    return jsonify(DB)


@app.route("/api/geojson")
def api_geojson():
    return jsonify(GEO)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
