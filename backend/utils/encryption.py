from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import logging
import os
from core.settings import ENCRYPTION_SECRET

logger = logging.getLogger("encryption")

_DEFAULT_SECRET = "default_secret_please_change_me_32chars"
_DEFAULT_SALT = "jobagent_salt_change_in_production"

class PasswordEncryption:
    """
    AES-256 encryption for SMTP passwords
    """

    def __init__(self):
        # Warn if using insecure defaults
        salt = os.getenv("ENCRYPTION_SALT", _DEFAULT_SALT)
        if ENCRYPTION_SECRET == _DEFAULT_SECRET or salt == _DEFAULT_SALT:
            logger.warning("ENCRYPTION_SECRET or ENCRYPTION_SALT is using insecure defaults. Set proper values in production!")

        # Derive key from secret
        secret = ENCRYPTION_SECRET.encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt.encode(),
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret))
        self.cipher = Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt password"""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt password"""
        return self.cipher.decrypt(ciphertext.encode()).decode()

encryptor = PasswordEncryption()
