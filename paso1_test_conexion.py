import jwt as pyjwt
import requests
from datetime import datetime, timezone, timedelta
from pprint import pprint

# --- CONFIGURACIÓN: AJUSTA ESTO ---
APPLICATION_ID = "d2afb9d0-f8b8-4dda-a8d5-77b5b059dcc5"
PRIVATE_KEY_PATH = "d2afb9d0-f8b8-4dda-a8d5-77b5b059dcc5.pem"
REDIRECT_URL = "https://localhost:3000/callback"
BASE_URL = "https://api.enablebanking.com"
# -----------------------------------


def build_jwt():
    """Genera el JWT firmado para autenticar cada llamada a la API."""
    private_key = open(PRIVATE_KEY_PATH, "rb").read()
    iat = int(datetime.now().timestamp())
    jwt_body = {
        "iss": "enablebanking.com",
        "aud": "api.enablebanking.com",
        "iat": iat,
        "exp": iat + 3600,  # válido 1 hora
    }
    token = pyjwt.encode(
        jwt_body,
        private_key,
        algorithm="RS256",
        headers={"kid": APPLICATION_ID},
    )
    return token


def main():
    jwt_token = build_jwt()
    base_headers = {"Authorization": f"Bearer {jwt_token}"}

    # 1. Buscar bancos disponibles en España
    print(">> Buscando bancos disponibles en España...")
    r = requests.get(f"{BASE_URL}/aspsps", params={"country": "ES"}, headers=base_headers)
    r.raise_for_status()
    aspsps = r.json()["aspsps"]

    # Filtramos los que contengan "Revolut" en el nombre
    revolut_matches = [a for a in aspsps if "revolut" in a["name"].lower()]
    print("\n>> Coincidencias con 'Revolut':")
    pprint(revolut_matches)

    if not revolut_matches:
        print("\nNo se encontró Revolut en la lista. Aquí tienes todos los bancos disponibles:")
        pprint(aspsps)
        return

    bank = revolut_matches[0]
    print(f"\n>> Usando banco: {bank['name']} ({bank['country']})")

    # 2. Iniciar el proceso de autorización
    body = {
        "access": {
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
        },
        "aspsp": {
            "name": bank["name"],
            "country": bank["country"],
        },
        "state": "gastos-personal-test-1",
        "redirect_url": REDIRECT_URL,
        "psu_type": "personal",
    }
    r = requests.post(f"{BASE_URL}/auth", json=body, headers=base_headers)
    r.raise_for_status()
    auth_url = r.json()["url"]

    print("\n>> Abre esta URL en tu navegador para autorizar el acceso:")
    print(auth_url)
    print("\nTras autorizar, te redirigirá a una URL tipo:")
    print(f"{REDIRECT_URL}?code=XXXXX&state=gastos-personal-test-1")
    print("(la página dará error de conexión, es normal)")
    print("\nCopia el valor de 'code' de esa URL, lo necesitarás para el PASO 2.")


if __name__ == "__main__":
    main()
