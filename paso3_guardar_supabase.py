"""
PASO 3: Traer transacciones y guardarlas en Supabase
-------------------------------------------------------
Reutiliza la sesión ya creada en el Paso 2 (no hace falta re-autorizar
mientras la sesión siga viva, hasta la fecha 'valid_until' que viste).
"""

import jwt as pyjwt
import requests
from datetime import datetime
from pprint import pprint

# --- CONFIGURACIÓN ENABLE BANKING ---
APPLICATION_ID = "d2afb9d0-f8b8-4dda-a8d5-77b5b059dcc5"
PRIVATE_KEY_PATH = "d2afb9d0-f8b8-4dda-a8d5-77b5b059dcc5.pem"
EB_BASE_URL = "https://api.enablebanking.com"
ACCOUNT_UID = "7daea553-a61f-4642-baac-3f1c7d596b79"  # la cuenta que ya autorizaste

# --- CONFIGURACIÓN SUPABASE ---
SUPABASE_URL = "https://uemmoteygbimensliylh.supabase.co"
SUPABASE_KEY = "sb_publishable_w3L9vs3bdijmHj_XMFtuUQ_J9zOzihH"
# -----------------------------------


def build_jwt():
    private_key = open(PRIVATE_KEY_PATH, "rb").read()
    iat = int(datetime.now().timestamp())
    jwt_body = {
        "iss": "enablebanking.com",
        "aud": "api.enablebanking.com",
        "iat": iat,
        "exp": iat + 3600,
    }
    return pyjwt.encode(
        jwt_body,
        private_key,
        algorithm="RS256",
        headers={"kid": APPLICATION_ID},
    )


def fetch_transactions():
    """Trae las transacciones desde Enable Banking."""
    jwt_token = build_jwt()
    headers = {"Authorization": f"Bearer {jwt_token}"}
    r = requests.get(
        f"{EB_BASE_URL}/accounts/{ACCOUNT_UID}/transactions",
        headers=headers,
    )
    r.raise_for_status()
    return r.json().get("transactions", [])


def normalizar(tx):
    """Convierte una transacción de Enable Banking al formato de nuestra tabla."""
    # entry_reference es el identificador único que usamos para evitar duplicados
    entry_ref = tx.get("entry_reference")

    # Descripción: cogemos remittance_information o el nombre de creditor/debtor
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
    """Inserta movimientos en Supabase. Usa upsert para evitar duplicados
    gracias a la restricción UNIQUE en entry_reference."""
    url = f"{SUPABASE_URL}/rest/v1/movimientos"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",  # upsert
    }
    r = requests.post(url, json=movimientos, headers=headers,
                       params={"on_conflict": "entry_reference"})
    if r.status_code not in (200, 201):
        print(f"Error al guardar: {r.status_code}")
        print(r.text)
    else:
        print(f">> Guardados/actualizados {len(movimientos)} movimientos en Supabase.")


def main():
    print(">> Trayendo transacciones de Enable Banking...")
    transacciones = fetch_transactions()
    print(f">> Recibidas {len(transacciones)} transacciones.")

    # Filtramos las que no tienen entry_reference (no podríamos evitar duplicados)
    movimientos = []
    for tx in transacciones:
        if not tx.get("entry_reference"):
            continue
        movimientos.append(normalizar(tx))

    print(f">> {len(movimientos)} tienen entry_reference válido, guardando...")
    pprint(movimientos[:2])  # muestra un par de ejemplo antes de guardar

    guardar_en_supabase(movimientos)


if __name__ == "__main__":
    main()
