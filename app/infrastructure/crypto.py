from cryptography.fernet import Fernet, InvalidToken
import json
import base64
from app.shared.config import settings


def _get_fernet() -> Fernet:
    key = settings.FERNET_KEY
    if not key:
        raise ValueError("FERNET_KEY is not set")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_config(config_dict: dict) -> str:
    f = _get_fernet()
    json_str = json.dumps(config_dict)
    encrypted = f.encrypt(json_str.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_config(encrypted_str: str) -> dict:
    f = _get_fernet()
    encrypted = base64.urlsafe_b64decode(encrypted_str.encode())
    decrypted = f.decrypt(encrypted)
    return json.loads(decrypted.decode())
