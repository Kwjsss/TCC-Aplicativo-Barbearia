from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import pytz
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from email_service import send_appointment_reminder

logger = logging.getLogger(__name__)

# Scheduler instance
scheduler = BackgroundScheduler()

# MongoDB connection for scheduler
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

def get_db():
    """Get database connection"""
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]

async def check_and_send_reminders():
    """
    Check for appointments that need reminders
    Runs every check (configured in cron)
    """
    try:
        db = get_db()
        now = datetime.now()
        
        logger.info(f"Checking for appointment reminders at {now}")
        
        # Calculate time window for 10 minutes from now
        target_time = now + timedelta(minutes=10)
        target_date = target_time.strftime("%Y-%m-%d")
        target_hour = target_time.strftime("%H:%M")
        
        # Find appointments that:
        # 1. Are scheduled for today
        # 2. Have a time around target_hour (within a window)
        # 3. Have status = pending
        # 4. Haven't had reminder sent yet
        
        # Create time window (5 minutes before and after target)
        target_minutes = target_time.hour * 60 + target_time.minute
        window_start = target_minutes - 5
        window_end = target_minutes + 5
        
        # Get all pending appointments for today - optimized with projection and limit
        appointments = await db.appointments.find(
            {
                "date": target_date,
                "status": "pending"
            }, 
            {
                "_id": 0, 
                "id": 1, 
                "time": 1, 
                "client": 1, 
                "clientEmail": 1, 
                "serviceId": 1, 
                "proId": 1, 
                "reminder_sent": 1,
                "date": 1
            }
        ).limit(500).to_list(500)
        
        for appointment in appointments:
            try:
                # Parse appointment time
                apt_time_str = appointment.get("time", "00:00")
                apt_hour, apt_minute = map(int, apt_time_str.split(":"))
                apt_minutes = apt_hour * 60 + apt_minute
                
                # Check if appointment is within reminder window
                if window_start <= apt_minutes <= window_end:
                    # Check if reminder already sent
                    if appointment.get("reminder_sent"):
                        continue
                    
                    # Get client email
                    client_email = appointment.get("clientEmail")
                    if not client_email:
                        logger.warning(f"Appointment {appointment['id']} has no email")
                        continue
                    
                    # Get service details
                    service = await db.services.find_one(
                        {"id": appointment["serviceId"]},
                        {"_id": 0}
                    )
                    
                    # Get professional details
                    pro = await db.professionals.find_one(
                        {"id": appointment["proId"]},
                        {"_id": 0}
                    )
                    
                    if not service or not pro:
                        logger.warning(f"Service or Pro not found for appointment {appointment['id']}")
                        continue
                    
                    # Send reminder
                    success = send_appointment_reminder(
                        client_email=client_email,
                        client_name=appointment["client"],
                        appointment_date=appointment["date"],
                        appointment_time=appointment["time"],
                        service_type=service["name"],
                        provider_name=pro["name"],
                        minutes_before=10
                    )
                    
                    if success:
                        # Mark reminder as sent
                        await db.appointments.update_one(
                            {"id": appointment["id"]},
                            {"$set": {"reminder_sent": True, "reminder_sent_at": now.isoformat()}}
                        )
                        logger.info(f"Reminder sent for appointment {appointment['id']}")
                    else:
                        logger.error(f"Failed to send reminder for appointment {appointment['id']}")
                        
            except Exception as e:
                logger.error(f"Error processing appointment {appointment.get('id')}: {str(e)}")
                continue
                
    except Exception as e:
        logger.error(f"Error in check_and_send_reminders: {str(e)}")

def check_reminders_sync():
    """Synchronous wrapper for async reminder check"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(check_and_send_reminders())
        loop.close()
    except Exception as e:
        logger.error(f"Error in sync wrapper: {str(e)}")

def start_scheduler():
    """
    Start the appointment reminder scheduler
    Checks every 30 minutes starting at 7:50
    """
    try:
        # Schedule to run every 30 minutes at :20 and :50
        # This catches appointments scheduled on the hour and half-hour
        scheduler.add_job(
            check_reminders_sync,
            CronTrigger(minute="20,50"),  # Runs at XX:20 and XX:50
            id="appointment_reminder_check",
            name="Check for appointment reminders",
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Appointment reminder scheduler started (runs at XX:20 and XX:50)")
        
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}")

def stop_scheduler():
    """Stop the scheduler"""
    try:
        scheduler.shutdown()
        logger.info("Appointment reminder scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")
