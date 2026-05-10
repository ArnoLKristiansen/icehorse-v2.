from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database, models
from routers import auth, clubs, admin

# Opret database tabeller
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Icehorse V2 API")

# CORS setup for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clubs.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Icehorse V2 API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
