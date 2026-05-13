import os
import smtplib
from email.message import EmailMessage

SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.simply.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL") # Oftest det samme som SMTP_USERNAME

def send_judge_magic_link_email(to_email: str, judge_name: str, comp_name: str, magic_link: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD or not SMTP_FROM_EMAIL:
        # Hvis vi mangler miljøvariablerne, kaster vi en fejl
        raise Exception("Mail-opsætningen mangler på serveren. Kontakt support eller tjek dine indstillinger.")

    msg = EmailMessage()
    msg['Subject'] = f'Dit dommer-link til {comp_name}'
    msg['From'] = f"Icehorse <{SMTP_FROM_EMAIL}>"
    msg['To'] = to_email

    # Plain text version (fallback, hvis deres mail-klient ikke understøtter HTML)
    text_content = f"""Kære {judge_name},

Du er blevet tilføjet som dommer til stævnet {comp_name}.
Klik på nedenstående link på din smartphone eller tablet for at åbne dommerpanelet og starte din bedømmelse:

{magic_link}

Dette link er unikt for dig og fungerer automatisk uden kodeord. Del det ikke med andre.

Bedste hilsner,
Icehorse Teamet
"""

    # HTML version (Ser super professionel ud i en rigtig indbakke)
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">Velkommen som dommer til {comp_name}!</h2>
        <p>Kære {judge_name},</p>
        <p>Du er klar til at dømme! Vi har bygget et super nemt system, som du bare åbner direkte i browseren på din telefon.</p>
        <p>Klik på knappen nedenfor for at logge ind i dit personlige dommerpanel:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{magic_link}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Åbn Dommerpanel</a>
        </div>
        <p style="font-size: 12px; color: #666;">Virker knappen ikke? Kopiér dette link ind i din browser:<br>{magic_link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">Dette link er personligt og kræver ikke kodeord. Del det venligst ikke med andre.</p>
      </body>
    </html>
    """

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype='html')

    try:
        # Simply.com (og de fleste andre) kræver STARTTLS på port 587
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP FEJL: {e}")
        raise Exception(f"Kunne ikke sende mailen. Fejl fra udbyder: {str(e)}")

def send_password_reset_email(to_email: str, reset_link: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD or not SMTP_FROM_EMAIL:
        raise Exception("Mail-opsætningen mangler på serveren.")

    msg = EmailMessage()
    msg['Subject'] = 'Nulstil din adgangskode til Icehorse'
    msg['From'] = f"Icehorse <{SMTP_FROM_EMAIL}>"
    msg['To'] = to_email

    text_content = f"""
Du har anmodet om at nulstille din adgangskode.
Klik på linket herunder for at vælge en ny adgangskode:

{reset_link}

Hvis du ikke har anmodet om dette, kan du blot ignorere denne email.
Linket udløber om 1 time.
"""

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3b82f6;">Nulstil din adgangskode</h2>
        <p>Vi har modtaget en anmodning om at nulstille adgangskoden til din Icehorse konto.</p>
        <p>Klik på knappen nedenfor for at vælge en ny adgangskode:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Nulstil adgangskode</a>
        </div>
        <p style="font-size: 12px; color: #666;">Virker knappen ikke? Kopiér dette link ind i din browser:<br>{reset_link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">Hvis du ikke har anmodet om dette, kan du blot ignorere denne email. Linket udløber om 1 time.</p>
      </body>
    </html>
    """

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype='html')

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP FEJL: {e}")
        raise Exception(f"Kunne ikke sende mailen: {str(e)}")
