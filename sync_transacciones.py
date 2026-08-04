"""
Script de sincronización automática (pensado para GitHub Actions)
--------------------------------------------------------------------
Lee todas las credenciales de variables de entorno (nunca hardcodeadas).
Trae transacciones de Enable Banking y las guarda/actualiza en Supabase.
"""

import os
import jwt as pyjwt
import requests
from datetime import datetime

# --- CONFIGURACIÓN (desde variables de entorno) ---
EB_APPLICATION_ID = os.environ["EB_APPLICATION_ID"]
EB_PRIVATE_KEY = os.environ["EB_PRIVATE_KEY"]  # contenido del .pem, no una ruta
EB_ACCOUNT_UID = os.environ["EB_ACCOUNT_UID"]
EB_BASE_URL = "https://api.enablebanking.com"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
# -----------------------------------


def build_jwt():
    iat = int(datetime.now().timestamp())
    jwt_body = {
        "iss": "enablebanking.com",
        "aud": "api.enablebanking.com",
        "iat": iat,
        "exp": iat + 3600,
    }
    return pyjwt.encode(
        jwt_body,
        EB_PRIVATE_KEY,
        algorithm="RS256",
        headers={"kid": EB_APPLICATION_ID},
    )


def fetch_transactions():
    jwt_token = build_jwt()
    headers = {"Authorization": f"Bearer {jwt_token}"}
    r = requests.get(
        f"{EB_BASE_URL}/accounts/{EB_ACCOUNT_UID}/transactions",
        headers=headers,
    )
    r.raise_for_status()
    return r.json().get("transactions", [])


def normalizar(tx):
    entry_ref = tx.get("entry_reference")
    descripcion_partes = tx.get("remittance_information") or []
    descripcion = " - ".join(descripcion_partes) if descripcion_partes else None
    if not descripcion:
        nombre = (tx.get("creditor") or {}).get("name") or (tx.get("debtor") or {}).get("name")
        descripcion = nombre or "Sin descripción"

    fecha = tx.get("booking_date") or tx.get("value_date")

    return {
        "entry_reference": entry_ref,
        "fecha": fecha,
        "importe": float(tx["transaction_amount"]["amount"]),
        "divisa": tx["transaction_amount"]["currency"],
        "tipo": tx.get("credit_debit_indicator"),
        "descripcion": descripcion,
        "origen_raw": tx,
    }


def guardar_en_supabase(movimientos):
    if not movimientos:
        print(">> No hay movimientos nuevos que guardar.")
        return
    url = f"{SUPABASE_URL}/rest/v1/movimientos"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    r = requests.post(url, json=movimientos, headers=headers,
                       params={"on_conflict": "entry_reference"})
    if r.status_code not in (200, 201):
        print(f"Error al guardar: {r.status_code}")
        print(r.text)
        raise SystemExit(1)
    print(f">> Guardados/actualizados {len(movimientos)} movimientos en Supabase.")


def main():
    print(">> Trayendo transacciones de Enable Banking...")
    transacciones = fetch_transactions()
    print(f">> Recibidas {len(transacciones)} transacciones.")

    movimientos = [normalizar(tx) for tx in transacciones if tx.get("entry_reference")]
    print(f">> {len(movimientos)} con entry_reference válido.")

    guardar_en_supabase(movimientos)


if __name__ == "__main__":
    main()
