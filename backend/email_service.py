import resend
import os
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Initialize Resend with API key
resend.api_key = os.getenv("RESEND_API_KEY")

def generate_appointment_reminder_html(
    client_name: str,
    appointment_date: str,
    appointment_time: str,
    service_type: str,
    provider_name: str,
    minutes_before: int
) -> str:
    """
    Generate HTML email template for appointment reminder
    """
    
    # Parse datetime for formatting
    try:
        date_obj = datetime.strptime(appointment_date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d/%m/%Y")
    except:
        formatted_date = appointment_date
    
    html_content = f"""
    <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                }}
                .header {{
                    background-color: #3b82f6;
                    color: white;
                    padding: 20px;
                    border-radius: 5px 5px 0 0;
                    text-align: center;
                }}
                .content {{
                    background-color: white;
                    padding: 20px;
                }}
                .appointment-details {{
                    background-color: #f0f0f0;
                    padding: 15px;
                    border-left: 4px solid #3b82f6;
                    margin: 15px 0;
                }}
                .detail-row {{
                    margin: 10px 0;
                }}
                .detail-label {{
                    font-weight: bold;
                    color: #555;
                }}
                .footer {{
                    background-color: #f9f9f9;
                    padding: 15px;
                    text-align: center;
                    font-size: 12px;
                    color: #888;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>⏰ Lembrete de Agendamento - AgendAI</h2>
                </div>
                <div class="content">
                    <p>Olá {client_name},</p>
                    
                    <p><strong>Seu agendamento está chegando em {minutes_before} minutos!</strong></p>
                    
                    <div class="appointment-details">
                        <div class="detail-row">
                            <span class="detail-label">Serviço:</span> {service_type}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Data:</span> {formatted_date}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Horário:</span> {appointment_time}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Profissional:</span> {provider_name}
                        </div>
                    </div>
                    
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">
                        Por favor, chegue alguns minutos mais cedo. Estamos te esperando!
                    </p>
                </div>
                <div class="footer">
                    <p>Este é um lembrete automático de agendamento.</p>
                    <p>AgendAI - Barbearia</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    return html_content

def send_appointment_reminder(
    client_email: str,
    client_name: str,
    appointment_date: str,
    appointment_time: str,
    service_type: str,
    provider_name: str,
    minutes_before: int
) -> bool:
    """
    Send appointment reminder email
    Returns True if successful, False otherwise
    """
    try:
        sender_email = os.getenv("SENDER_EMAIL", "noreply@resend.dev")
        
        html_content = generate_appointment_reminder_html(
            client_name=client_name,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            service_type=service_type,
            provider_name=provider_name,
            minutes_before=minutes_before
        )
        
        params = {
            "from": sender_email,
            "to": [client_email],
            "subject": f"⏰ Lembrete: Seu agendamento em {minutes_before} minutos - AgendAI",
            "html": html_content,
        }
        
        response = resend.Emails.send(params)
        
        if response and "id" in response:
            logger.info(f"Email reminder sent successfully to {client_email}: {response['id']}")
            return True
        else:
            logger.error(f"Failed to send email to {client_email}: {response}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending email reminder: {str(e)}")
        return False
