import pandas as pd
import os
import re

INPUT = "/Users/hristosimeonov/spain-swimming-pipeline/rebuilt_merge_output/spain_boys_2014_results_master_REBUILT_FROM_PDFS.csv"
OUTPUT = "/Users/hristosimeonov/spainswimming/data/spain_boys_2014_results_master_merged_clean.csv"

print("INPUT:", INPUT)
print("OUTPUT:", OUTPUT)

df = pd.read_csv(INPUT)
print("RAW ROWS:", len(df))

df = df.rename(columns={
    "swimmer": "Swimmer",
    "event_name": "Event",
    "meet_date": "Date",
    "time": "Time",
    "club": "Club",
    "rank": "Rank",
    "meet_name": "Meet",
    "city": "Venue",
    "region": "Province",
    "source_pdf": "Source",
    "source_url": "Source_URL",
    "time_seconds": "Seconds",
    "event_distance": "Distance",
    "gender": "Gender",
    "competition_type": "Competition_Type",
    "age_group": "Age_Group",
    "stroke": "Stroke",
})

for col in ["Swimmer", "Event", "Meet", "Club", "Venue", "Province", "Source"]:
    if col not in df.columns:
        df[col] = ""
    df[col] = df[col].astype(str).str.strip()

def clean_name(name):
    name = str(name).strip()
    if not name or name.lower() == "nan":
        return ""
    if "," in name:
        left, right = name.split(",", 1)
        return f"{right.strip()} {left.strip()}".strip()
    return name

def title_name(name):
    return " ".join(part.capitalize() if part.isupper() else part for part in str(name).split())

def clean_event(event):
    e = str(event).strip()
    e = re.sub(r"\bAlev[ií]n\s+(Masculino|Femenino)\b", "", e, flags=re.I)
    e = re.sub(r"\bBenjam[ií]n\s+(Masculino|Femenino)\b", "", e, flags=re.I)
    e = re.sub(r"\bMasculino\b|\bFemenino\b|\bMasc\.?\b|\bFem\.?\b", "", e, flags=re.I)
    e = re.sub(r"\s+", " ", e).strip()
    return e

def infer_gender(row):
    g = str(row.get("Gender", "")).strip().upper()
    if g in ["M", "F"]:
        return g

    blob = " ".join([
        str(row.get("Event", "")),
        str(row.get("Meet", "")),
        str(row.get("Source", "")),
        str(row.get("Age_Group", "")),
    ]).lower()

    if re.search(r"\bfem\b|femenino|female", blob):
        return "F"
    if re.search(r"\bmasc\b|masculino|male", blob):
        return "M"

    name = str(row.get("Swimmer", "")).upper()
    female_markers = [
        " MARIA ", " ANA ", " LAURA ", " ELENA ", " MARTA ", " PAULA ",
        " SOFIA ", " LUCIA ", " CARLA ", " CLAUDIA ", " AITANA ",
        " MARTINA ", " EVA ", " NOA ", " JULIA ", " ALBA ", " CARMEN ",
        " ONA ", " BLANCA ", " ADRIANA ", " ARIADNA ", " CANDELA "
    ]
    padded = f" {name} "
    if any(marker in padded for marker in female_markers):
        return "F"

    return "M"

def clean_meet(meet):
    m = str(meet).strip()
    if not m or m.lower() == "nan":
        return "FNCV Competition"

    m = m.replace("_", " ").replace("-", " ")
    m = re.sub(r"\bFICHA T[ÉE]CNICA DE LA COMPETICI[ÓO]N\b", "", m, flags=re.I)
    m = re.sub(r"\bresultados?\b|\bmerged\b", "", m, flags=re.I)
    m = re.sub(r"\s+", " ", m).strip()

    replacements = {
        "JORNADA": "Jornada",
        "LIGA": "Liga",
        "ALEVIN": "Alevín",
        "Alevin": "Alevín",
        "BENJAMIN": "Benjamín",
        "Benjamin": "Benjamín",
        "CONTROL": "Control",
        "TROFEO": "Trofeo",
        "XIRIVELLA": "Xirivella",
        "XATIVA": "Xàtiva",
        "BENIMAMET": "Benimamet",
        "ALCUDIA": "Alcúdia",
        "ALZIRA": "Alzira",
        "GANDIA": "Gandia",
        "SAGUNTO": "Sagunto",
        "TORREVIEJA": "Torrevieja",
        "PETRER": "Petrer",
    }

    for old, new in replacements.items():
        m = m.replace(old, new)

    m = re.sub(r"(\d)Alevín", r"\1ª Alevín", m)
    m = re.sub(r"(\d)Benjamín", r"\1ª Benjamín", m)
    m = re.sub(r"\s+", " ", m).strip()

    return m or "FNCV Competition"

def seconds_to_time(sec):
    try:
        sec = float(sec)
        mins = int(sec // 60)
        rem = sec - (mins * 60)
        if mins > 0:
            return f"{mins}:{rem:05.2f}"
        return f"{rem:.2f}"
    except Exception:
        return ""

df["Swimmer"] = df["Swimmer"].apply(clean_name).apply(title_name)
df["Event"] = df["Event"].apply(clean_event)
df["Meet"] = df["Meet"].apply(clean_meet)

df["Seconds"] = pd.to_numeric(df["Seconds"], errors="coerce")
df = df[df["Seconds"].notna()].copy()

df["Gender"] = df.apply(infer_gender, axis=1)

if "Competition_Type" not in df.columns:
    df["Competition_Type"] = "Otro"
df["Competition_Type"] = df["Competition_Type"].fillna("Otro").astype(str).str.strip()
df.loc[df["Competition_Type"].eq("") | df["Competition_Type"].str.lower().eq("nan"), "Competition_Type"] = "Otro"

df["Time"] = df["Seconds"].apply(seconds_to_time)

df = df[
    (df["Swimmer"].astype(str).str.len() > 2) &
    (df["Event"].astype(str).str.len() > 2) &
    (df["Seconds"] > 0)
].copy()

df = df[~((df["Event"].str.contains("50m", case=False, na=False)) & (df["Seconds"] > 90))]
df = df[~((df["Event"].str.contains("100m", case=False, na=False)) & (df["Seconds"] > 180))]
df = df[~((df["Event"].str.contains("200m", case=False, na=False)) & (df["Seconds"] < 90))]
df = df[~((df["Event"].str.contains("200m", case=False, na=False)) & (df["Seconds"] > 360))]
df = df[~((df["Event"].str.contains("400m", case=False, na=False)) & (df["Seconds"] > 700))]

df["Dedupe_Key"] = (
    df["Swimmer"].str.upper().str.strip() + "|" +
    df["Event"].str.upper().str.strip() + "|" +
    df["Date"].astype(str).str.strip() + "|" +
    df["Seconds"].round(2).astype(str)
)

df = df.drop_duplicates(subset=["Dedupe_Key"]).copy()

df["National_Rank"] = ""
for _, group in df.groupby(["Event", "Gender"]):
    idx = group.sort_values("Seconds").index
    df.loc[idx, "National_Rank"] = range(1, len(idx) + 1)

df["Provincial_Rank"] = ""
for _, group in df.groupby(["Event", "Gender", "Province"]):
    idx = group.sort_values("Seconds").index
    df.loc[idx, "Provincial_Rank"] = range(1, len(idx) + 1)

df["Rank"] = df["National_Rank"]

for col in ["Source_URL", "Age_Group", "Stroke"]:
    if col not in df.columns:
        df[col] = ""

final_cols = [
    "Swimmer", "Event", "Date", "Time", "Club", "Rank",
    "Meet", "Venue", "Province", "Source", "Source_URL",
    "Seconds", "Distance", "Stroke", "Gender", "Age_Group",
    "Competition_Type", "Provincial_Rank", "National_Rank", "Dedupe_Key"
]

df = df[final_cols]

print("FINAL ROWS:", len(df))
print("\nGender values:")
print(df["Gender"].value_counts(dropna=False))
print("\nCompetition types:")
print(df["Competition_Type"].value_counts(dropna=False))

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
df.to_csv(OUTPUT, index=False)

print("\nWROTE:", OUTPUT)