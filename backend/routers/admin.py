from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database
from auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

# Simpel Super Admin tjek for nu. Du bør være den eneste super admin.
def get_super_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.email != "arno@alkdata.dk":
        raise HTTPException(status_code=403, detail="Not authorized as Super Admin")
    return current_user

@router.get("/clubs", response_model=List[schemas.ClubOut])
def read_all_clubs(db: Session = Depends(database.get_db), admin: models.User = Depends(get_super_admin)):
    return db.query(models.Club).all()

@router.get("/competitions", response_model=List[schemas.CompetitionOut])
def read_all_competitions(db: Session = Depends(database.get_db), admin: models.User = Depends(get_super_admin)):
    return db.query(models.Competition).all()

class DiscountCodeCreate(schemas.BaseModel):
    code: str
    discount_amount: float

@router.post("/discount-codes")
def create_discount_code(
    discount: DiscountCodeCreate, 
    db: Session = Depends(database.get_db), 
    admin: models.User = Depends(get_super_admin)
):
    db_discount = models.DiscountCode(code=discount.code, discount_amount=discount.discount_amount)
    db.add(db_discount)
    db.commit()
    db.refresh(db_discount)
    return db_discount
