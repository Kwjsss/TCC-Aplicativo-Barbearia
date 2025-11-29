from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# -------------------- Models --------------------

class LoginRequest(BaseModel):
    name: str
    role: str  # 'client' or 'pro'

class LoginResponse(BaseModel):
    success: bool
    userName: str
    role: str

class Service(BaseModel):
    id: int
    name: str
    duration: int  # minutes
    price: float

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    duration: Optional[int] = None
    price: Optional[float] = None

class Professional(BaseModel):
    id: int
    name: str

class AppointmentCreate(BaseModel):
    client: str
    proId: int
    serviceId: int
    date: str  # ISO format YYYY-MM-DD
    time: str  # HH:MM

class Appointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client: str
    proId: int
    serviceId: int
    date: str
    time: str
    status: str = "pending"  # pending, completed, cancelled

class AppointmentStatusUpdate(BaseModel):
    status: str  # pending, completed, cancelled

class AvailableSlotsRequest(BaseModel):
    date: str
    proId: int

class MonthlyReport(BaseModel):
    totalAttendance: int
    totalRevenue: float
    servicesCount: dict

# -------------------- Initialize Data --------------------

async def initialize_data():
    """Initialize database with sample data if empty"""
    
    # Check if services exist
    services_count = await db.services.count_documents({})
    if services_count == 0:
        services = [
            {"id": 1, "name": "Corte Masculino", "duration": 30, "price": 35.0},
            {"id": 2, "name": "Barba", "duration": 20, "price": 20.0},
            {"id": 3, "name": "Corte + Barba", "duration": 50, "price": 50.0}
        ]
        await db.services.insert_many(services)
        logging.info("Services initialized")
    
    # Check if professionals exist
    professionals_count = await db.professionals.count_documents({})
    if professionals_count == 0:
        professionals = [
            {"id": 1, "name": "João"},
            {"id": 2, "name": "Carlos"}
        ]
        await db.professionals.insert_many(professionals)
        logging.info("Professionals initialized")

@app.on_event("startup")
async def startup_event():
    await initialize_data()

# -------------------- Routes --------------------

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Simple login - just returns the user info"""
    return LoginResponse(
        success=True,
        userName=request.name,
        role=request.role
    )

@api_router.get("/services", response_model=List[Service])
async def get_services():
    """Get all services"""
    services = await db.services.find({}, {"_id": 0}).to_list(100)
    return services

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: int, update: ServiceUpdate):
    """Update service details (for professionals)"""
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_data:
        await db.services.update_one(
            {"id": service_id},
            {"$set": update_data}
        )
    
    updated_service = await db.services.find_one({"id": service_id}, {"_id": 0})
    return updated_service

@api_router.get("/professionals", response_model=List[Professional])
async def get_professionals():
    """Get all professionals"""
    professionals = await db.professionals.find({}, {"_id": 0}).to_list(100)
    return professionals

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment: AppointmentCreate):
    """Create a new appointment"""
    
    # Check if slot is available
    existing = await db.appointments.find_one({
        "date": appointment.date,
        "time": appointment.time,
        "proId": appointment.proId,
        "status": {"$ne": "cancelled"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Time slot already booked")
    
    new_appointment = Appointment(**appointment.model_dump())
    await db.appointments.insert_one(new_appointment.model_dump())
    
    return new_appointment

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(client: Optional[str] = None, proId: Optional[int] = None):
    """Get appointments with optional filters"""
    query = {}
    if client:
        query["client"] = client
    if proId:
        query["proId"] = proId
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(1000)
    
    # Add status field if it doesn't exist (for old appointments)
    for apt in appointments:
        if "status" not in apt:
            apt["status"] = "pending"
    
    return appointments

@api_router.patch("/appointments/{appointment_id}/status", response_model=Appointment)
async def update_appointment_status(appointment_id: str, update: AppointmentStatusUpdate):
    """Update appointment status"""
    
    if update.status not in ["pending", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": update.status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    updated = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return updated

@api_router.post("/appointments/available-slots")
async def get_available_slots(request: AvailableSlotsRequest):
    """Get available time slots for a specific date and professional"""
    
    # Get all appointments for this date and professional (excluding cancelled)
    booked = await db.appointments.find({
        "date": request.date,
        "proId": request.proId,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(100)
    
    booked_times = [apt["time"] for apt in booked]
    
    # Generate all possible slots (09:00 - 18:00, 30-min intervals)
    all_slots = []
    for hour in range(9, 18):
        for minute in [0, 30]:
            time_str = f"{hour:02d}:{minute:02d}"
            all_slots.append(time_str)
    
    available_slots = [slot for slot in all_slots if slot not in booked_times]
    
    return {"availableSlots": available_slots, "bookedSlots": booked_times}

@api_router.get("/reports/monthly/{year}/{month}", response_model=MonthlyReport)
async def get_monthly_report(year: int, month: int):
    """Get monthly report for professionals"""
    
    # Get all appointments for the specified month
    appointments = await db.appointments.find({}, {"_id": 0}).to_list(10000)
    
    # Filter by month/year and only count completed appointments
    filtered = []
    for apt in appointments:
        try:
            date_parts = apt["date"].split("-")
            apt_year = int(date_parts[0])
            apt_month = int(date_parts[1])
            status = apt.get("status", "pending")
            if apt_year == year and apt_month == month and status == "completed":
                filtered.append(apt)
        except:
            continue
    
    total_attendance = len(filtered)
    
    # Calculate revenue
    services = await db.services.find({}, {"_id": 0}).to_list(100)
    services_dict = {s["id"]: s for s in services}
    
    total_revenue = 0.0
    services_count = {}
    
    for apt in filtered:
        service = services_dict.get(apt["serviceId"])
        if service:
            total_revenue += service["price"]
            service_name = service["name"]
            services_count[service_name] = services_count.get(service_name, 0) + 1
    
    return MonthlyReport(
        totalAttendance=total_attendance,
        totalRevenue=total_revenue,
        servicesCount=services_count
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()