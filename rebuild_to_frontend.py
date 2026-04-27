#!/usr/bin/env python3
from __future__ import annotations

import math
import re
import unicodedata
from pathlib import Path

import pandas as pd

BASE = Path.home()
INPUT = BASE / "spain-swimming-pipeline" / "rebuilt_merge_output" / "spain_boys_2014_results_master_REBUILT_FROM_PDFS.csv"
OUTPUT = BASE / "spainswimming" / "data" / "spain_boys_2014_results_master_merged_clean.csv"
SEASON = "2025/2026"

DATE_DMY_RE = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})$")
DATE_ISO_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
TIME_TOKEN_RE = re.compile(r"(?:(?:\d+:)?\d{1,2}\.\d{2})")

STROKE_MAP = {
    "libre": "Freestyle",
    "free": "Freestyle",
    "freestyle": "Freestyle",
    "espalda": "Backstroke",
    "back": "Backstroke",
    "backstroke": "Backstroke",
    "braza": "Breaststroke",
    "breast": "Breaststroke",
    "breaststroke": "Breaststroke",
    "mariposa": "Butterfly",
    "fly": "Butterfly",
    "butterfly": "Butterfly",
    "estilos": "Medley",
    "medley": "Medley",
}

REGION_NORMAL = {
    "valencia": "Valencia",
    "alicante": "Alicante",
    "castellon": "Castellon",
    "castellón": "Castellon",
}

BAD_MEET_NAMES = {
    "ficha tecnica de la competicion",
    "ficha técnica de la competición",
    "federacion de natacion de la comunidad valenciana",
    "federación de natación de la comunidad valenciana",
    "resultados",
    "totales",
    "merged",
}


def clean_text(value) -> str:
    if value is None or pd.isna(value):
        return ""
    s = str(value).replace("\u00a0", " ").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s))
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def title_words(s: str) -> str:
    s = clean_text(s)
    if not s:
        return ""
    small = {"de", "del", "la", "las", "los", "y", "e", "a", "el", "en"}
    out = []
    for w in s.split():
        raw = w.strip()
        if not raw:
            continue
        if raw.lower() in small:
            out.append(raw.lower())
        elif raw.isupper() or raw.islower():
            out.append(raw[:1].upper() + raw[1:].lower())
        else:
            out.append(raw[:1].upper() + raw[1:])
    return " ".join(out)


def title_name(name: str) -> str:
    name = clean_text(name)
    if not name:
        return ""
    if "," in name:
        surname, given = name.split(",", 1)
        name = f"{given.strip()} {surname.strip()}"
    return title_words(name)


def canonical_name(name: str) -> str:
    return strip_accents(title_name(name)).upper()


def first_value(row, names, default=""):
    for name in names:
        if name in row.index:
            v = clean_text(row.get(name, ""))
            if v:
                return v
    return default


def normalize_date(value: str) -> tuple[str, str]:
    s = clean_text(value)
    if not s:
        return "", ""
    m = DATE_ISO_RE.match(s)
    if m:
        y, mo, d = m.groups()
        return f"{y}-{mo}-{d}", f"{d}/{mo}/{y}"
    m = DATE_DMY_RE.match(s)
    if m:
        d, mo, y = m.groups()
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}", f"{d.zfill(2)}/{mo.zfill(2)}/{y}"
    return s, s


def parse_seconds(value) -> float:
    s = clean_text(value)
    if not s:
        return math.nan
    try:
        if ":" in s:
            bits = s.split(":")
            if len(bits) == 2:
                return int(bits[0]) * 60 + float(bits[1])
            if len(bits) == 3:
                return int(bits[0]) * 3600 + int(bits[1]) * 60 + float(bits[2])
        return float(s)
    except Exception:
        return math.nan


def format_time(value: str) -> str:
    s = clean_text(value)
    if not s:
        return ""
    if re.fullmatch(r"\d{1,2}\.\d{2}", s):
        return "00:" + s.zfill(5)
    if re.fullmatch(r"\d+:\d{1,2}\.\d{2}", s):
        mins, rest = s.split(":", 1)
        return mins.zfill(2) + ":" + rest.zfill(5)
    return s


def detect_gender(row) -> str:
    explicit = first_value(row, ["Gender", "gender", "event_gender", "sex", "Sex"])
    e = strip_accents(explicit).lower().strip()
    if e in {"m", "male", "men", "boy", "boys", "masc", "masculino"}:
        return "M"
    if e in {"f", "female", "women", "girl", "girls", "fem", "femenino"}:
        return "F"

    # Look across the row, because some extractor versions store the full header in a different column.
    text = " | ".join(clean_text(v) for v in row.values if clean_text(v))
    t = strip_accents(text).lower()
    if re.search(r"\b(fem\.?|femenino|femenina|female|girls?)\b", t):
        return "F"
    if re.search(r"\b(masc\.?|masculino|male|boys?)\b", t):
        return "M"
    return "Unknown"


def clean_event(raw_event: str) -> tuple[str, str, str]:
    raw = clean_text(raw_event)
    e = strip_accents(raw).lower()
    e = re.sub(r"\b(masc\.?|fem\.?|masculino|femenino|alevin[o]?|benjamin|infantil|mayores|anos?|años|\d+\s*anos|\d+\s*años)\b", " ", e)
    e = re.sub(r"[^a-z0-9 ]+", " ", e)
    e = re.sub(r"\s+", " ", e).strip()

    dm = re.search(r"\b(25|50|100|200|400|800|1500)\b", e)
    distance = dm.group(1) if dm else ""

    stroke = ""
    for key, value in STROKE_MAP.items():
        if re.search(rf"\b{re.escape(key)}\b", e):
            stroke = value
            break

    if distance and stroke:
        event = f"{distance}m {stroke}"
    else:
        event = title_words(raw)

    return event, (f"{distance}m" if distance else ""), stroke


def valid_event_time(distance: str, seconds: float) -> bool:
    if pd.isna(seconds) or not math.isfinite(float(seconds)) or float(seconds) <= 0:
        return False
    m = re.search(r"\d+", clean_text(distance))
    if not m:
        return False
    d = int(m.group(0))
    ranges = {
        25: (10, 80),
        50: (15, 80),
        100: (45, 180),
        200: (95, 420),
        400: (190, 900),
        800: (430, 1800),
        1500: (850, 3200),
    }
    lo, hi = ranges.get(d, (5, 4000))
    return lo <= float(seconds) <= hi


def competition_type_from_text(text: str) -> str:
    t = strip_accents(clean_text(text)).lower()
    if "trofeo" in t:
        return "Trofeo"
    if "control" in t:
        return "Control"
    if "liga" in t or "jornada" in t:
        return "Liga"
    if "fase" in t or "autonom" in t or "provincial" in t:
        return "Campeonato"
    return "Otro"


def clean_meet_from_filename(source_file: str, fallback: str, venue: str) -> str:
    raw = clean_text(fallback)
    raw_norm = strip_accents(raw).lower()
    if raw and raw_norm not in BAD_MEET_NAMES and len(raw) > 4 and not raw_norm.startswith("ficha tecnica"):
        return raw

    name = Path(clean_text(source_file)).stem
    name = re.sub(r"%[0-9A-Fa-f]{2}", " ", name)
    name = name.replace("_", " ").replace("-", " ")
    name = re.sub(r"\b(resultados?|merged|totales|acta|res)\b", " ", name, flags=re.I)
    name = re.sub(r"\b\d{3,5}\b", " ", name)
    name = re.sub(r"\b(ali|val|vlc|cas|2025|2026)\b", " ", name, flags=re.I)
    name = re.sub(r"\s+", " ", name).strip()

    # Common glued words from filenames.
    fixes = [
        (r"(\d)Jornada", r"\1ª Jornada"),
        (r"(\d)Liga", r"\1ª Liga"),
        (r"jornadaliga", "Jornada Liga"),
        (r"ligabenjamin", "Liga Benjamin"),
        (r"ligaalevin", "Liga Alevin"),
        (r"benjaminalevin", "Benjamin Alevin"),
        (r"benjamin(\d)", r"Benjamin \1"),
        (r"(\d)alevin", r"\1 Alevin"),
        (r"preb", "PreBenjamin"),
    ]
    for pat, rep in fixes:
        name = re.sub(pat, rep, name, flags=re.I)
    name = re.sub(r"\s+", " ", name).strip()

    if not name:
        name = raw or venue or "Meet"
    return title_words(name)


def row_is_bad(swimmer: str, club: str, event: str, time: str, distance: str, seconds: float) -> bool:
    sw = clean_text(swimmer)
    cl = clean_text(club)
    if not sw or sw.lower() in {"nan", "none", "null"}:
        return True
    if not cl or cl.lower() in {"nan", "none", "null"}:
        return True
    if not event or not time:
        return True
    if TIME_TOKEN_RE.search(sw) or TIME_TOKEN_RE.search(cl):
        return True
    if re.search(r"\b(dsq|baja|np|dns|dq)\b", sw.lower()):
        return True
    return not valid_event_time(distance, seconds)


def main():
    df = pd.read_csv(INPUT)

    rows = []
    for _, r in df.iterrows():
        swimmer = title_name(first_value(r, ["swimmer", "Swimmer", "name", "Name"]))
        club = clean_text(first_value(r, ["club", "Club"]))
        raw_event = first_value(r, ["event_name", "Event", "event", "raw_event", "event_header"])
        event, distance, stroke = clean_event(raw_event)

        time_raw = first_value(r, ["time", "Time"])
        time = format_time(time_raw)
        sec_raw = first_value(r, ["time_seconds", "Time_Seconds", "seconds", "Seconds"])
        seconds = float(sec_raw) if sec_raw not in {"", None} else parse_seconds(time_raw)

        if row_is_bad(swimmer, club, event, time, distance, seconds):
            continue

        gender = detect_gender(r)
        age_group = first_value(r, ["age_group", "Age_Group", "category", "Category"])
        birth_year = first_value(r, ["birthyear", "Birth_Year", "year", "Year"])
        if not birth_year and age_group in {"14", "2014"}:
            birth_year = "2014"

        date_iso, date_display = normalize_date(first_value(r, ["meet_date", "Date_ISO", "Date", "date"]))
        region_raw = first_value(r, ["region", "Region", "province", "Province"])
        region = REGION_NORMAL.get(strip_accents(region_raw).lower(), title_words(region_raw))
        province = region
        venue = title_words(first_value(r, ["city", "venue", "Venue", "City"]))
        source_file = first_value(r, ["source_pdf", "Source_File", "source_file"])
        source_url = first_value(r, ["source_url", "Source_URL"])
        meet_fallback = first_value(r, ["meet_name", "Meet", "competition", "Competition"])
        meet_name = clean_meet_from_filename(source_file, meet_fallback, venue)
        comp_type = first_value(r, ["competition_type", "Competition_Type"])
        if not comp_type or comp_type.lower() in {"otro", "unknown"}:
            comp_type = competition_type_from_text(" ".join([meet_name, source_file, meet_fallback]))

        rows.append({
            "Country": "Spain",
            "Region": region,
            "Province": province,
            "Competition_Type": comp_type,
            "Competition_Level": "Regional",
            "Gender": gender,
            "Age_Group": age_group,
            "Birth_Year": birth_year,
            "Season": SEASON,
            "Date_ISO": date_iso,
            "Date": date_display,
            "Meet": meet_name,
            "Venue": venue,
            "Event": event,
            "Distance": distance,
            "Stroke": stroke,
            "Rank": first_value(r, ["rank", "Rank"]),
            "Computed_Rank": "",
            "Canonical_Swimmer": canonical_name(swimmer),
            "Swimmer": swimmer,
            "Match_Score": 100,
            "Manual_Match": True,
            "Club": club,
            "Time": time,
            "Time_Seconds": round(seconds, 2),
            "FINA_Points": first_value(r, ["points", "FINA_Points", "Pts"]),
            "Source_URL": source_url,
            "Source_File": source_file,
        })

    out = pd.DataFrame(rows)
    if out.empty:
        raise SystemExit("No rows survived cleaning. Check input file.")

    # Drop exact duplicate rows from repeated PDF pages/chunks.
    dedupe_cols = ["Country", "Date_ISO", "Meet", "Venue", "Event", "Gender", "Canonical_Swimmer", "Club", "Time"]
    out = out.drop_duplicates(subset=dedupe_cols, keep="first").copy()
    out["_ts"] = pd.to_numeric(out["Time_Seconds"], errors="coerce")
    out["_event_key"] = out["Event"].str.lower().str.replace(r"\s+", " ", regex=True).str.strip()

    # National rank: best time per swimmer, per gender + event.
    out["_national_scope"] = out["Country"] + "|" + out["Season"] + "|" + out["Gender"].fillna("Unknown") + "|" + out["_event_key"]
    ranked_parts = []
    for _, g in out.groupby("_national_scope", dropna=False):
        g = g.sort_values(["_ts", "Swimmer"], na_position="last").copy()
        best = g.drop_duplicates("Canonical_Swimmer", keep="first").copy()
        best["Computed_Rank"] = range(1, len(best) + 1)
        rank_map = dict(zip(best["Canonical_Swimmer"], best["Computed_Rank"]))
        g["Computed_Rank"] = g["Canonical_Swimmer"].map(rank_map)
        ranked_parts.append(g)
    out = pd.concat(ranked_parts, ignore_index=True)

    # Provincial rank as its own field for frontend click-throughs.
    out["_province_scope"] = out["Country"] + "|" + out["Season"] + "|" + out["Province"].fillna("") + "|" + out["Gender"].fillna("Unknown") + "|" + out["_event_key"]
    out["Provincial_Rank"] = ""
    for _, idxs in out.groupby("_province_scope", dropna=False).groups.items():
        g = out.loc[list(idxs)].sort_values(["_ts", "Swimmer"], na_position="last").copy()
        best = g.drop_duplicates("Canonical_Swimmer", keep="first").copy()
        best["Provincial_Rank"] = range(1, len(best) + 1)
        rank_map = dict(zip(best["Canonical_Swimmer"], best["Provincial_Rank"]))
        out.loc[list(idxs), "Provincial_Rank"] = out.loc[list(idxs), "Canonical_Swimmer"].map(rank_map)

    out = out.sort_values(["Date_ISO", "Meet", "Gender", "Event", "_ts", "Swimmer"], na_position="last")

    cols = [
        "Country", "Region", "Province", "Competition_Type", "Competition_Level", "Gender", "Age_Group", "Birth_Year",
        "Season", "Date_ISO", "Date", "Meet", "Venue", "Event", "Distance", "Stroke", "Rank", "Computed_Rank", "Provincial_Rank",
        "Canonical_Swimmer", "Swimmer", "Match_Score", "Manual_Match", "Club", "Time", "Time_Seconds",
        "FINA_Points", "Source_URL", "Source_File",
    ]
    out = out[cols]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT, index=False)

    print("INPUT:", INPUT)
    print("OUTPUT:", OUTPUT)
    print("ROWS:", len(out))
    print("Competition types:")
    print(out["Competition_Type"].value_counts(dropna=False).to_string())
    print("Gender values:")
    print(out["Gender"].replace("", "Unknown").value_counts(dropna=False).to_string())


if __name__ == "__main__":
    main()
