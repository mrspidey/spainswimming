#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import pandas as pd

INPUT = Path("/Users/hristosimeonov/spain-swimming-pipeline/rebuilt_merge_output/spain_boys_2014_results_master_REBUILT_FROM_PDFS.csv")
OUTPUT = Path("/Users/hristosimeonov/spainswimming/data/spain_boys_2014_results_master_merged_clean.csv")

OUT_COLS = [
    "Swimmer","Event","Date","Time","Club","Rank","Meet","Venue","Province","Source",
    "Seconds","Distance","Gender","Competition_Type","BirthYear",
    "Provincial_Rank","National_Rank","Dedupe_Key"
]

BAD_VENUE_RE = re.compile(r"ficha t[eé]cnica|clasificaci[oó]n|tiempo|pts|ninguna|resultados|sumario", re.I)

VENUE_HINTS = [
    ("gandia", "Gandía"), ("xativa", "Xativa"), ("xàtiva", "Xativa"),
    ("xirivella", "Xirivella"), ("benimamet", "Benimamet"), ("benim", "Benimamet"),
    ("valencia", "Valencia"), ("elda", "Elda"), ("torrevieja", "Torrevieja"),
    ("petrer", "Petrer"), ("san_vicente", "San Vicente"), ("san-vicente", "San Vicente"),
    ("san vicente", "San Vicente"), ("sax", "Sax"), ("alcudia", "Alcudia"),
    ("alzira", "Alzira"), ("vinaros", "Vinaros"), ("vinaroz", "Vinaros"),
    ("castellon", "Castellón"), ("castellón", "Castellón"), ("oliva", "Oliva"),
    ("sagunto", "Sagunto"), ("carpesa", "Carpesa"), ("nazaret", "Nazaret"),
    ("pilar", "Pilar de la Horadada"), ("horadada", "Pilar de la Horadada"),
    ("mutxamel", "Mutxamel"), ("betera", "Bétera"), ("bétera", "Bétera"),
]

def clean_text(x) -> str:
    if pd.isna(x):
        return ""
    return re.sub(r"\s+", " ", str(x).strip())

def norm(x) -> str:
    return (
        clean_text(x).lower()
        .replace("á","a").replace("à","a")
        .replace("é","e").replace("è","e")
        .replace("í","i").replace("ï","i")
        .replace("ó","o").replace("ò","o")
        .replace("ú","u").replace("ü","u")
        .replace("ñ","n").replace("ç","c")
    )

def fix_date(x) -> str:
    s = clean_text(x)
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
    if not m:
        return s
    return f"{int(m.group(1)):02d}/{int(m.group(2)):02d}/{m.group(3)}"

def canonical_venue(s: str) -> str:
    s = clean_text(s).strip(" ,;:-")
    if not s:
        return ""
    n = norm(s)
    for key, venue in VENUE_HINTS:
        if key == n or key in n:
            return venue
    return s.title()

def infer_venue(row) -> str:
    current = clean_text(row.get("city", row.get("Venue", ""))).strip(" ,;:-")
    if current and not BAD_VENUE_RE.search(current):
        return canonical_venue(current)

    blob = " ".join([
        clean_text(row.get("source_pdf", row.get("Source", ""))),
        clean_text(row.get("source_url", "")),
        clean_text(row.get("meet_name", row.get("Meet", ""))),
    ])
    n = norm(blob).replace("%20", " ").replace("_", " ")

    for key, venue in VENUE_HINTS:
        if key in n:
            return venue

    fallback = clean_text(row.get("region", row.get("Province", ""))).title()
    return fallback or "Unknown"

def clean_meet(x, source="") -> str:
    s = clean_text(x)
    source_n = norm(source)

    s = re.sub(r"Ficha T[eé]cnica De La Competici[oó]n", "", s, flags=re.I)
    s = re.sub(r"Ficha T[eé]cnica.*$", "", s, flags=re.I)
    s = re.sub(r"\bClasificaci[oó]n\s+AN\s+Tiempo\s+Pts\b", "", s, flags=re.I)
    s = clean_text(s).strip(" -,")

    if "pitet" in source_n or "pitet" in norm(s):
        return "XVIII Trofeo Jose Mª Angel Pitet"

    if norm(s) in {"alevin masculino", "alevin femenino", "benjamin masculino", "benjamin femenino"}:
        return "FNCV Meet"

    return s or "FNCV Meet"

def clean_club(x) -> str:
    s = clean_text(x)
    s = re.sub(r"\s+\d+:\d{2}\.\d{2}\s+\d+\s+(?:\d+:\d{2}\.\d{2}|\d{1,2}\.\d{2})\s*$", "", s)
    s = re.sub(r"\s+\d{1,2}:\d{2}\.\d{2}\s+\d{1,4}\s+\d{1,2}:\d{2}\.\d{2}\s*$", "", s)
    return clean_text(s)

def comp_type(meet, source="") -> str:
    s = norm(f"{meet} {source}")
    if "trofeo" in s or "pitet" in s or "memorial" in s:
        return "Trofeo"
    if "campeonato" in s or "cto" in s or "fase" in s or "open" in s:
        return "Campeonato"
    if "control" in s:
        return "Control"
    if "jornada" in s or "liga" in s:
        return "Liga"
    return "Otro"

def swimmer_key(x) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", clean_text(x).upper()).strip()

def main():
    print("INPUT:", INPUT)
    print("OUTPUT:", OUTPUT)

    df = pd.read_csv(INPUT)
    print("RAW ROWS:", len(df))

    out = pd.DataFrame()
    out["Swimmer"] = df.get("swimmer", "")
    out["Event"] = df.get("event_name", "")
    out["Date"] = df.get("meet_date", "")
    out["Time"] = df.get("time", "")
    out["Club"] = df.get("club", "")
    out["Rank"] = pd.to_numeric(df.get("rank", ""), errors="coerce")
    out["Meet"] = [
        clean_meet(m, s)
        for m, s in zip(df.get("meet_name", ""), df.get("source_pdf", ""))
    ]
    out["Venue"] = df.apply(infer_venue, axis=1)
    out["Province"] = df.get("region", "")
    out["Source"] = df.get("source_pdf", "")
    out["Seconds"] = pd.to_numeric(df.get("time_seconds", ""), errors="coerce")
    out["Distance"] = pd.to_numeric(df.get("event_distance", ""), errors="coerce")
    out["Gender"] = df.get("gender", "")
    out["BirthYear"] = pd.to_numeric(df.get("birthyear", ""), errors="coerce").astype("Int64")
    out["Competition_Type"] = [
        clean_text(c) or comp_type(m, s)
        for c, m, s in zip(df.get("competition_type", ""), out["Meet"], out["Source"])
    ]

    out["Swimmer"] = out["Swimmer"].map(clean_text)
    out["Event"] = out["Event"].map(clean_text)
    out["Date"] = out["Date"].map(fix_date)
    out["Time"] = out["Time"].map(clean_text)
    out["Club"] = out["Club"].map(clean_club)
    out["Venue"] = out["Venue"].map(canonical_venue)
    out["Province"] = out["Province"].map(lambda x: clean_text(x).lower())
    out["Source"] = out["Source"].map(clean_text)
    out["Gender"] = out["Gender"].map(lambda x: clean_text(x).upper())
    out["Competition_Type"] = [
        comp_type(m, s) if norm(c) in {"otro", ""} and ("pitet" in norm(s) or "trofeo" in norm(m)) else (clean_text(c) or comp_type(m, s))
        for c, m, s in zip(out["Competition_Type"], out["Meet"], out["Source"])
    ]

    out = out[
        out["Swimmer"].ne("")
        & out["Event"].ne("")
        & out["Time"].ne("")
        & out["Club"].ne("")
        & out["Gender"].isin(["M", "F"])
        & out["Seconds"].notna()
        & out["BirthYear"].eq(2014)
    ].copy()

    out = out[~((out["Distance"].eq(200)) & (out["Seconds"].lt(140)))].copy()
    out = out[~((out["Distance"].eq(400)) & (out["Seconds"].lt(240)))].copy()

    out["SwimmerKey"] = out["Swimmer"].map(swimmer_key)

    out["Dedupe_Key"] = (
        out["SwimmerKey"] + "|" +
        out["Event"].str.upper() + "|" +
        out["Date"].astype(str) + "|" +
        out["Seconds"].round(2).astype(str) + "|" +
        out["Gender"] + "|" +
        out["BirthYear"].astype(str)
    )

    before = len(out)
    out = out.drop_duplicates(subset=["Dedupe_Key"]).copy()
    print("Dropped duplicate rows:", before - len(out))

    out["Provincial_Rank"] = pd.Series([pd.NA] * len(out), index=out.index, dtype="Int64")
    out["National_Rank"] = pd.Series([pd.NA] * len(out), index=out.index, dtype="Int64")

    for (gender, birthyear, event), group in out.groupby(["Gender", "BirthYear", "Event"], dropna=False):
        best_idx = (
            group.sort_values(["Seconds", "Date", "Swimmer"])
            .groupby("SwimmerKey", as_index=False)
            .head(1)
            .index
        )
        best = out.loc[best_idx].sort_values(["Seconds", "Swimmer"])
        swimmer_to_rank = {out.loc[idx, "SwimmerKey"]: rank for rank, idx in enumerate(best.index, start=1)}

        mask = out["Gender"].eq(gender) & out["BirthYear"].eq(birthyear) & out["Event"].eq(event)
        out.loc[mask, "National_Rank"] = out.loc[mask, "SwimmerKey"].map(swimmer_to_rank)

    for (gender, birthyear, event, province), group in out.groupby(["Gender", "BirthYear", "Event", "Province"], dropna=False):
        best_idx = (
            group.sort_values(["Seconds", "Date", "Swimmer"])
            .groupby("SwimmerKey", as_index=False)
            .head(1)
            .index
        )
        best = out.loc[best_idx].sort_values(["Seconds", "Swimmer"])
        swimmer_to_rank = {out.loc[idx, "SwimmerKey"]: rank for rank, idx in enumerate(best.index, start=1)}

        mask = (
            out["Gender"].eq(gender)
            & out["BirthYear"].eq(birthyear)
            & out["Event"].eq(event)
            & out["Province"].eq(province)
        )
        out.loc[mask, "Provincial_Rank"] = out.loc[mask, "SwimmerKey"].map(swimmer_to_rank)

    bad_venues = out["Venue"].astype(str).str.contains(r"Ficha|Clasificación|Tiempo|Pts|Ninguna", case=False, na=False).sum()
    bad_clubs = out["Club"].astype(str).str.contains(r"\d+:\d+|\d+\.\d{2}\s+\d+", regex=True, na=False).sum()

    print("Bad venues remaining:", int(bad_venues))
    print("Bad club rows remaining:", int(bad_clubs))
    print("\nBirthYear values:")
    print(out["BirthYear"].value_counts(dropna=False).head())
    print("\nGender values:")
    print(out["Gender"].value_counts(dropna=False))
    print("\nCompetition types:")
    print(out["Competition_Type"].value_counts(dropna=False))

    jack = out[out["Swimmer"].str.contains("SIMEONOV, Jack Hristov|Jack Hristov", case=False, na=False)]
    print("\nJack check:")
    print(jack[["Swimmer","Event","Time","Gender","BirthYear","Rank","Meet","Venue","Province","Provincial_Rank","National_Rank"]].to_string(index=False) if len(jack) else "No Jack rows found")

    out = out[OUT_COLS].copy()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT, index=False)

    print("\nFINAL ROWS:", len(out))
    print("WROTE:", OUTPUT)

if __name__ == "__main__":
    main()
