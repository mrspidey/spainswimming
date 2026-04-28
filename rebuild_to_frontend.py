#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path
import pandas as pd

INPUT = Path.home() / "spain-swimming-pipeline/rebuilt_merge_output/spain_boys_2014_results_master_REBUILT_FROM_PDFS.csv"
OUTPUT = Path.home() / "spainswimming/data/spain_boys_2014_results_master_merged_clean.csv"

OUT_COLS = [
    "Swimmer","Event","Date","Time","Club","Rank","Meet","Venue","Province","Source",
    "Seconds","Distance","Gender","BirthYear","Age_Group","Stroke","Competition_Type",
    "Provincial_Rank","National_Rank","Dedupe_Key"
]

RENAME = {
    "swimmer": "Swimmer", "event_name": "Event", "meet_date": "Date", "time": "Time",
    "club": "Club", "rank": "Rank", "meet_name": "Meet", "city": "Venue", "region": "Province",
    "source_pdf": "Source", "time_seconds": "Seconds", "event_distance": "Distance",
    "gender": "Gender", "birthyear": "BirthYear", "age_group": "Age_Group", "stroke": "Stroke",
    "competition_type": "Competition_Type", "key": "Dedupe_Key",
}

CITY_FIXES = {
    "xativa": "Xativa", "xàtiva": "Xativa", "gandia": "Gandia", "benimamet": "Benimamet",
    "xirivella": "Xirivella", "torrevieja": "Torrevieja", "elda": "Elda", "sax": "Sax",
    "alcudia": "Alcudia", "alzira": "Alzira", "vinaros": "Vinaros", "castellon": "Castellon",
    "petrer": "Petrer", "san vicente": "San Vicente", "oliva": "Oliva", "sagunto": "Sagunto",
}

def clean_spaces(x):
    return re.sub(r"\s+", " ", str(x or "")).strip()

def title_from_source(src):
    s = Path(str(src)).stem
    s = re.sub(r"^\d+[_\-]?", "", s)
    s = s.replace("_", " ").replace("-", " ")
    s = re.sub(r"resultados?|merged|totales|acta", "", s, flags=re.I)
    s = clean_spaces(s)
    return s.title() if s else "FNCV Results"

def improve_meet_name(row):
    meet = clean_spaces(row.get("Meet", ""))
    src = clean_spaces(row.get("Source", ""))
    venue = clean_spaces(row.get("Venue", ""))

    bad = {"", "nan", "none", "ficha técnica de la competición", "federación de natación de la comunidad valenciana"}
    if meet.lower() in bad or meet.startswith("(") or len(meet) <= 3:
        meet = title_from_source(src)

    meet = re.sub(r"(?i)\bres(?=[a-z])", "", meet)
    meet = re.sub(r"(?i)\bval\b|\bali\b|\bcas\b|\bvlc\b", "", meet)
    meet = re.sub(r"(?i)\bmerged\b|\btotales\b|\bresultados\b", "", meet)
    meet = re.sub(r"(?i)(\d)([A-Za-zÁÉÍÓÚÑáéíóúñ])", r"\1 \2", meet)
    meet = re.sub(r"(?i)(Benjamin)(\d)", r"\1 \2", meet)
    meet = re.sub(r"(?i)(\d)(Alevin|Alevín)", r"\1 \2", meet)
    meet = clean_spaces(meet)

    if "jornada" in meet.lower() and venue and venue.lower() not in meet.lower():
        meet = f"{meet} {venue}"
    return meet or "FNCV Results"

def infer_venue(row):
    venue = clean_spaces(row.get("Venue", ""))
    src = f"{row.get('Source','')} {row.get('Meet','')}".lower()
    if venue and venue.lower() not in {"comunitat valenciana", "valencia", "alicante", "castellon"}:
        return venue.title()
    for key, val in CITY_FIXES.items():
        if key in src:
            return val
    return venue.title() if venue else ""

def infer_comp_type(row):
    t = f"{row.get('Meet','')} {row.get('Source','')}".lower()
    if "jornada" in t or "liga" in t:
        return "Liga"
    if "control" in t:
        return "Control"
    if "trofeo" in t:
        return "Trofeo"
    if "fase" in t or "campeonato" in t:
        return "Campeonato"
    return clean_spaces(row.get("Competition_Type", "")) or "Otro"

def norm_gender(g, event=""):
    g = str(g or "").strip().upper()
    if g in {"M", "F"}:
        return g
    e = str(event).lower()
    if "fem" in e:
        return "F"
    if "masc" in e:
        return "M"
    return ""

def fmt_date(d):
    if pd.isna(d) or str(d).strip() == "":
        return ""
    try:
        dt = pd.to_datetime(str(d), dayfirst=True, errors="coerce")
        if pd.isna(dt):
            return str(d)
        return f"{dt.day}/{dt.month}/{dt.year}"
    except Exception:
        return str(d)

def main():
    print(f"INPUT: {INPUT}")
    print(f"OUTPUT: {OUTPUT}")
    if not INPUT.exists():
        raise FileNotFoundError(INPUT)
    df = pd.read_csv(INPUT)
    print(f"RAW ROWS: {len(df)}")
    df = df.rename(columns={k:v for k,v in RENAME.items() if k in df.columns})

    for c in OUT_COLS:
        if c not in df.columns:
            df[c] = ""

    df["Swimmer"] = df["Swimmer"].map(clean_spaces)
    df["Event"] = df["Event"].map(lambda x: clean_spaces(str(x).replace("Alevin Masculino", "").replace("Alevin Femenino", "")))
    df["Date"] = df["Date"].map(fmt_date)
    df["Time"] = df["Time"].map(clean_spaces)
    df["Club"] = df["Club"].map(clean_spaces)
    df["Venue"] = df.apply(infer_venue, axis=1)
    df["Meet"] = df.apply(improve_meet_name, axis=1)
    df["Province"] = df["Province"].map(lambda x: clean_spaces(x).lower())
    df["Competition_Type"] = df.apply(infer_comp_type, axis=1)
    df["Gender"] = df.apply(lambda r: norm_gender(r.get("Gender"), r.get("Event")), axis=1)
    df["BirthYear"] = pd.to_numeric(df["BirthYear"], errors="coerce").fillna(2014).astype(int)
    df["Seconds"] = pd.to_numeric(df["Seconds"], errors="coerce")
    df["Distance"] = pd.to_numeric(df["Distance"], errors="coerce")
    df["Rank"] = pd.to_numeric(df["Rank"], errors="coerce")

    # Remove impossible rows caused by inherited event context/split parsing.
    df = df[~((df["Distance"] == 200) & (df["Seconds"] < 130))]
    df = df[~((df["Distance"] == 400) & (df["Seconds"] < 250))]
    df = df[df["Swimmer"].ne("") & df["Event"].ne("") & df["Seconds"].notna()]

    # Dedupe exact repeats.
    df["Dedupe_Key"] = (
        df["Swimmer"].str.upper() + "|" + df["Event"].str.upper() + "|" + df["Date"].astype(str) + "|" +
        df["Seconds"].round(2).astype(str) + "|" + df["Gender"].astype(str)
    )
    df = df.drop_duplicates(subset=["Dedupe_Key"], keep="first")

    # Ranks are gender-aware and event-aware. Provincial rank = within province; national rank = all provinces.
    df["Provincial_Rank"] = ""
    df["National_Rank"] = ""
    for (gender, event), g in df.groupby(["Gender", "Event"], dropna=False):
        order = g.sort_values(["Seconds", "Date", "Swimmer"], ascending=[True, True, True])
        df.loc[order.index, "National_Rank"] = range(1, len(order) + 1)
        for province, pg in g.groupby("Province", dropna=False):
            po = pg.sort_values(["Seconds", "Date", "Swimmer"], ascending=[True, True, True])
            df.loc[po.index, "Provincial_Rank"] = range(1, len(po) + 1)

    df = df[OUT_COLS]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT, index=False)
    print(f"FINAL ROWS: {len(df)}")
    print("\nGender values:")
    print(df["Gender"].value_counts(dropna=False))
    print("\nCompetition types:")
    print(df["Competition_Type"].value_counts(dropna=False))
    print(f"\nWROTE: {OUTPUT}")

if __name__ == "__main__":
    main()
