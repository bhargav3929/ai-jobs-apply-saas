from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
from core.settings import ENCRYPTION_SECRET

class PasswordEncryption:
    """
    AES-256 encryption for SMTP passwords
    """
    
    def __init__(self):
        # Derive key from secret
        secret = ENCRYPTION_SECRET.encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=os.getenv("ENCRYPTION_SALT", "jobagent_salt_change_in_production").encode(),
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
