"""
PASO 2: Crear sesión y traer transacciones reales
---------------------------------------------------
Usa el 'code' que obtuviste tras autorizar el acceso en el navegador.
"""

import jwt as pyjwt
import requests
from datetime import datetime
from pprint import pprint

# --- CONFIGURACIÓN: AJUSTA ESTO ---
APPLICATION_ID = "d2afb9d0-f8b8-4dda-a8d5-77b5b059dcc5"
PRIVATE_KEY_PATH = "d2afb9d0-f8b8-4dda-a8d5-77b5b059dcc5.pem"  # ajusta si no está en la misma carpeta
BASE_URL = "https://api.enablebanking.com"

# Pega aquí el code que copiaste de la URL de redirección
AUTH_CODE = "821d2da8-3d85-48df-92be-d991c0e4d53c"
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


def main():
    jwt_token = build_jwt()
    base_headers = {"Authorization": f"Bearer {jwt_token}"}

    # 1. Crear la sesión con el code
    print(">> Creando sesión con el code de autorización...")
    r = requests.post(
        f"{BASE_URL}/sessions",
        json={"code": AUTH_CODE},
        headers=base_headers,
    )
    r.raise_for_status()
    session = r.json()
    print("\n>> Sesión creada:")
    pprint(session)

    accounts = session["accounts"]
    if not accounts:
        print("No hay cuentas en la sesión.")
        return

    account_uid = accounts[0]["uid"] if isinstance(accounts[0], dict) else accounts[0]
    print(f"\n>> Usando cuenta: {account_uid}")

    # 2. Traer balances
    print("\n>> Consultando balances...")
    r = requests.get(f"{BASE_URL}/accounts/{account_uid}/balances", headers=base_headers)
    r.raise_for_status()
    pprint(r.json())

    # 3. Traer transacciones
    print("\n>> Consultando transacciones...")
    r = requests.get(f"{BASE_URL}/accounts/{account_uid}/transactions", headers=base_headers)
    r.raise_for_status()
    transactions = r.json().get("transactions", [])
    print(f"\n>> Se han recibido {len(transactions)} transacciones:")
    pprint(transactions)


if __name__ == "__main__":
    main()
