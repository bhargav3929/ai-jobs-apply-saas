import logging
from datetime import datetime
from core.firebase import db
import uuid

class CustomLogger:
    """
    Logs to both console and Firestore
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Console handler
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def info(self, message: str, metadata: dict = None):
        self.logger.info(message)
        self._log_to_firestore("info", message, metadata)
    
    def error(self, message: str, metadata: dict = None):
        self.logger.error(message)
        self._log_to_firestore("error", message, metadata)
    
    def warning(self, message: str, metadata: dict = None):
        self.logger.warning(message)
        self._log_to_firestore("warning", message, metadata)
    
    def _log_to_firestore(self, level: str, message: str, metadata: dict):
        """Store log in Firestore"""
        if not db:
            return

        try:
            db.collection("system_logs").add({
                "logId": str(uuid.uuid4()),
                "level": level,
                "message": message,
                "metadata": metadata or {},
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            self.logger.error(f"Failed to log to Firestore: {e}")
