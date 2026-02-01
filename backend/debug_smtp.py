import smtplib
import sys
import getpass

def test_smtp_connection():
    print("--- SMTP Debug Tool ---")
    print("This script will test the connection to Gmail's SMTP server with verbose logging.")
    
    email = input("Enter your Gmail address: ").strip()
    password = getpass.getpass("Enter your App Password (hidden): ").strip()
    
    print("\n[INFO] Connecting to smtp.gmail.com:465...")
    
    try:
        # Create SMTP_SSL object
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15)
        
        # Enable debug output
        server.set_debuglevel(1)
        
        print(f"[INFO] Attempting login for {email}...")
        server.login(email, password)
        
        print("\n[SUCCESS] Authentication successful!")
        server.quit()
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n[ERROR] Authentication Failed: {e}")
        print("Possible causes:")
        print("1. Wrong email address.")
        print("2. Wrong App Password (ensure no spaces, copy strictly 16 chars).")
        print("3. Two-Factor Authentication (2FA) is NOT enabled (required for App Passwords).")
    except Exception as e:
        print(f"\n[ERROR] Connection Failed: {e}")

if __name__ == "__main__":
    test_smtp_connection()
