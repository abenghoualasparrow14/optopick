"""
Service de parsing du fichier Excel/CSV importé par le client.
Gère les variantes de noms de colonnes (chaque entreprise a son format).
"""
import pandas as pd
from io import BytesIO

COLUMN_ALIASES = {
    "article_id":   ["article", "code article", "ref", "référence", "sku", "code_article"],
    "article_name": ["libelle", "désignation", "designation", "nom article", "description"],
    "rack":         ["rack", "allée", "allee", "location rack", "emplacement rack"],
    "column":       ["colonne", "col", "column", "col."],
    "level":        ["niveau", "level", "niv"],
    "pick_date":    ["date", "date chargement", "date_chargement", "date picking"],
    "prep_number":  ["n° prépa", "n°prépa", "prep", "preparation", "n° préparation", "bon"],
    "quantity":     ["qté", "quantite", "quantité", "qty", "qte"],
}

def normalize_columns(df: pd.DataFrame):
    cols_lower = {c.lower().strip(): c for c in df.columns}
    mapping, missing = {}, []
    for standard, aliases in COLUMN_ALIASES.items():
        found = next((cols_lower[a.lower()] for a in aliases if a.lower() in cols_lower), None)
        if found:
            mapping[standard] = found
        elif standard in ("article_id", "rack", "column"):
            missing.append(standard)
    return mapping, missing

def parse_upload(file_bytes: bytes, filename: str) -> dict:
    warnings = []
    if filename.endswith(".csv"):
        df = pd.read_csv(BytesIO(file_bytes), sep=None, engine="python")
    else:
        df = pd.read_excel(BytesIO(file_bytes))
    df.columns = df.columns.str.strip()
    mapping, missing = normalize_columns(df)
    if missing:
        raise ValueError(f"Colonnes obligatoires manquantes : {missing}. Colonnes détectées : {list(df.columns)}")
    df = df.rename(columns={v: k for k, v in mapping.items()})
    df = df.dropna(subset=["article_id", "rack", "column"])
    df["column"]   = pd.to_numeric(df["column"],  errors="coerce").fillna(0).astype(int)
    df["quantity"] = pd.to_numeric(df.get("quantity", pd.Series([1]*len(df))), errors="coerce").fillna(1)
    if "pick_date" in df.columns:
        df["pick_date"] = pd.to_datetime(df["pick_date"], errors="coerce")
        n = df["pick_date"].isna().sum()
        if n: warnings.append(f"{n} lignes avec date invalide ignorées.")
        df = df.dropna(subset=["pick_date"])
    else:
        warnings.append("Colonne date non trouvée.")
    invalid = df[df["column"] < 1]
    if len(invalid): warnings.append(f"{len(invalid)} lignes avec colonne invalide ignorées.")
    df = df[df["column"] >= 1]
    return {"rows": df.to_dict(orient="records"), "warnings": warnings}
