#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd


INPUT = Path.home() / "spain-swimming-pipeline/rebuilt_merge_output/spain_boys_2014_results_master_REBUILT_FROM_PDFS.csv"
OUTPUT = Path.home() / "spainswimming/data/spain_boys_2014_results_master_merged_clean.csv"


OUT_COLS = [
    "Swimmer",
    "Event",
    "Date",
    "Time",
    "Club",
    "Rank",
    "Meet",
    "Venue",
    "Province",
    "Source",
    "Seconds",
    "Distance",
    "Gender",
    "Competition_Type",
    "Provincial_Rank",
    "National_Rank",
    "Dedupe_Key",
]


def clean_text(x):
    if pd.isna(x):
        return ""
    return re.sub(r"\s+", " ", str(x)).strip()


def clean_name(name):
    name = clean_text(name)
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"\s+,\s+", ", ", name)
    return name.strip()


def normalise_event(event):
    event = clean_text(event)
    event = re.sub(r"\s+", " ", event)

    event = event.replace("Libre", "Freestyle")
    event = event.replace("Espalda", "Backstroke")
    event = event.replace("Braza", "Breaststroke")
    event = event.replace("Mariposa", "Butterfly")
    event = event.replace("Estilos", "Medley")

    event = re.sub(r"\bAlevin Masculino\b", "", event, flags=re.I)
    event = re.sub(r"\bAlevin Femenino\b", "", event, flags=re.I)
    event = re.sub(r"\bBenjamin Masculino\b", "", event, flags=re.I)
    event = re.sub(r"\bBenjamin Femenino\b", "", event, flags=re.I)
    event = re.sub(r"\bMasc\.\b", "", event, flags=re.I)
    event = re.sub(r"\bFem\.\b", "", event, flags=re.I)

    event = re.sub(r"\s+", " ", event).strip()

    m = re.search(r"(\d{2,4})\s*m?\s*(Freestyle|Backstroke|Breaststroke|Butterfly|Medley)", event, re.I)
    if m:
        return f"{int(m.group(1))}m {m.group(2).title()}"

    return event


def infer_distance(event):
    event = clean_text(event)
    m = re.search(r"(\d{2,4})\s*m", event, re.I)
    if m:
        return int(m.group(1))
    return pd.NA


def seconds_from_time(t):
    t = clean_text(t)
    if not t:
        return pd.NA

    if ":" in t:
        mins, sec = t.split(":", 1)
        try:
            return round(int(mins) * 60 + float(sec), 2)
        except Exception:
            return pd.NA

    try:
        return round(float(t), 2)
    except Exception:
        return pd.NA


def infer_gender(row):
    g = clean_text(row.get("gender", ""))
    if g.upper() in {"M", "F"}:
        return g.upper()

    event = clean_text(row.get("event_name", row.get("Event", ""))).lower()
    if "fem" in event or "femenino" in event:
        return "F"
    if "masc" in event or "masculino" in event:
        return "M"

    return "M"


def competition_type(meet):
    m = clean_text(meet).lower()
    if "jornada" in m or "liga" in m:
        return "Liga"
    if "control" in m:
        return "Control"
    if "trofeo" in m:
        return "Trofeo"
    if "campeonato" in m or "auton" in m:
        return "Campeonato"
    if "fase" in m:
        return "Fase"
    return "Otro"


def sort_date_value(d):
    d = clean_text(d)
    try:
        return pd.to_datetime(d, dayfirst=True, errors="coerce")
    except Exception:
        return pd.NaT


def main():
    print(f"INPUT: {INPUT}")
    print(f"OUTPUT: {OUTPUT}")

    if not INPUT.exists():
        raise FileNotFoundError(f"Input file not found: {INPUT}")

    raw = pd.read_csv(INPUT, dtype="string")
    print(f"RAW ROWS: {len(raw)}")

    colmap = {
        "Swimmer": "swimmer",
        "Event": "event_name",
        "Date": "meet_date",
        "Time": "time",
        "Club": "club",
        "Rank": "rank",
        "Meet": "meet_name",
        "Venue": "city",
        "Province": "region",
        "Source": "source_pdf",
        "Seconds": "time_seconds",
        "Distance": "event_distance",
        "Gender": "gender",
        "Competition_Type": "competition_type",
        "Dedupe_Key": "key",
    }

    df = pd.DataFrame()

    for out_col, in_col in colmap.items():
        if in_col in raw.columns:
            df[out_col] = raw[in_col]
        else:
            df[out_col] = ""

    df["Swimmer"] = df["Swimmer"].map(clean_name)
    df["Event"] = df["Event"].map(normalise_event)
    df["Date"] = df["Date"].map(clean_text)
    df["Time"] = df["Time"].map(clean_text)
    df["Club"] = df["Club"].map(clean_text)
    df["Meet"] = df["Meet"].map(clean_text)
    df["Venue"] = df["Venue"].map(clean_text)
    df["Province"] = df["Province"].map(lambda x: clean_text(x).lower())
    df["Source"] = df["Source"].map(clean_text)

    df["Seconds"] = pd.to_numeric(df["Seconds"], errors="coerce")
    missing_seconds = df["Seconds"].isna()
    df.loc[missing_seconds, "Seconds"] = df.loc[missing_seconds, "Time"].map(seconds_from_time)

    df["Distance"] = pd.to_numeric(df["Distance"], errors="coerce")
    missing_distance = df["Distance"].isna()
    df.loc[missing_distance, "Distance"] = df.loc[missing_distance, "Event"].map(infer_distance)

    df["Rank"] = pd.to_numeric(df["Rank"], errors="coerce")

    df["Gender"] = raw.apply(infer_gender, axis=1)

    if "competition_type" in raw.columns:
        df["Competition_Type"] = raw["competition_type"].fillna("").map(clean_text)
        df.loc[df["Competition_Type"].eq(""), "Competition_Type"] = df.loc[
            df["Competition_Type"].eq(""), "Meet"
        ].map(competition_type)
    else:
        df["Competition_Type"] = df["Meet"].map(competition_type)

    # Remove unusable rows only.
    df = df[
        df["Swimmer"].ne("")
        & df["Event"].ne("")
        & df["Time"].ne("")
        & df["Seconds"].notna()
        & df["Distance"].notna()
    ].copy()

    # Guard against event/distance leakage, e.g. 100m result being labelled as 200m.
    # 200m under 2:20 for this age group is suspicious in this dataset.
    bad_200 = (df["Distance"].astype(float) == 200) & (df["Seconds"].astype(float) < 140)
    if bad_200.any():
        print(f"Dropping suspicious 200m rows under 2:20: {int(bad_200.sum())}")
        df = df[~bad_200].copy()

    # Guard against obviously broken long-distance values.
    bad_400 = (df["Distance"].astype(float) == 400) & (df["Seconds"].astype(float) < 240)
    if bad_400.any():
        print(f"Dropping suspicious 400m rows under 4:00: {int(bad_400.sum())}")
        df = df[~bad_400].copy()

    # Dedupe.
    df["Dedupe_Key"] = (
        df["Swimmer"].str.upper()
        + "|"
        + df["Event"].str.upper()
        + "|"
        + df["Date"].astype(str)
        + "|"
        + df["Seconds"].round(2).astype(str)
        + "|"
        + df["Gender"].astype(str)
    )

    df = df.drop_duplicates(subset=["Dedupe_Key"]).copy()

    # Ranks by gender + event.
    df["Provincial_Rank"] = pd.NA
    df["National_Rank"] = pd.NA

    for (_, event, gender), group in df.groupby(["Province", "Event", "Gender"], dropna=False):
        order = group.sort_values(["Seconds", "Date"], ascending=[True, True])
        df.loc[order.index, "Provincial_Rank"] = list(range(1, len(order) + 1))

    for (event, gender), group in df.groupby(["Event", "Gender"], dropna=False):
        order = group.sort_values(["Seconds", "Date"], ascending=[True, True])
        df.loc[order.index, "National_Rank"] = list(range(1, len(order) + 1))

    # Sort homepage/front-end stable: newest first, then meet, event, gender, time.
    df["_date_sort"] = df["Date"].map(sort_date_value)
    df = df.sort_values(
        ["_date_sort", "Meet", "Event", "Gender", "Seconds"],
        ascending=[False, True, True, True, True],
        na_position="last",
    ).drop(columns=["_date_sort"])

    # Format numeric columns safely.
    df["Seconds"] = pd.to_numeric(df["Seconds"], errors="coerce").round(2)
    df["Distance"] = pd.to_numeric(df["Distance"], errors="coerce").astype("Int64")
    df["Rank"] = pd.to_numeric(df["Rank"], errors="coerce").astype("Int64")
    df["Provincial_Rank"] = pd.to_numeric(df["Provincial_Rank"], errors="coerce").astype("Int64")
    df["National_Rank"] = pd.to_numeric(df["National_Rank"], errors="coerce").astype("Int64")

    for col in OUT_COLS:
        if col not in df.columns:
            df[col] = ""

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
