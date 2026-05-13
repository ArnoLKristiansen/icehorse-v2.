from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import crud, models, schemas, database
from auth import get_current_user

router = APIRouter(prefix="/clubs", tags=["clubs"])

def get_club_if_owner(club_id: int, db: Session, current_user: models.User):
    club = db.query(models.Club).filter(models.Club.id == club_id, models.Club.user_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or not owned by user")
    return club

def get_competition_if_owner(comp_id: int, club_id: int, db: Session, current_user: models.User):
    # First verify club ownership
    get_club_if_owner(club_id, db, current_user)
    comp = db.query(models.Competition).filter(models.Competition.id == comp_id, models.Competition.club_id == club_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
    return comp

# --- CLUB MANAGEMENT ---

@router.get("/me", response_model=List[schemas.ClubOut])
def read_my_clubs(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_user_clubs(db=db, user_id=current_user.id)

@router.post("/", response_model=schemas.ClubOut)
def create_new_club(club: schemas.ClubCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_club(db=db, club=club, user_id=current_user.id)

@router.get("/{club_id}", response_model=schemas.ClubOut)
def read_club(club_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return get_club_if_owner(club_id, db, current_user)

@router.put("/{club_id}", response_model=schemas.ClubOut)
def update_club(
    club_id: int,
    club_update: schemas.ClubUpdate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.update_club(db=db, club_id=club_id, club_update=club_update)

# --- DIRECTORY ---
@router.get("/{club_id}/directory", response_model=schemas.DirectoryOut)
def read_global_directory(
    club_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.get_club_directory(db=db, club_id=club_id)

# --- CLUB RIDERS & HORSES ---
@router.post("/{club_id}/club_riders", response_model=schemas.ClubRiderOut)
def create_club_rider(
    club_id: int,
    rider: schemas.ClubRiderCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.create_club_rider(db=db, rider=rider, club_id=club_id)

@router.put("/{club_id}/club_riders/{rider_id}", response_model=schemas.ClubRiderOut)
def update_club_rider(
    club_id: int,
    rider_id: int,
    rider: schemas.ClubRiderCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    db_rider = db.query(models.ClubRider).filter(models.ClubRider.id == rider_id, models.ClubRider.club_id == club_id).first()
    if not db_rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    return crud.update_club_rider(db=db, rider_id=rider_id, rider_update=rider)

@router.delete("/{club_id}/club_riders/{rider_id}")
def delete_club_rider(
    club_id: int,
    rider_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    db_rider = db.query(models.ClubRider).filter(models.ClubRider.id == rider_id, models.ClubRider.club_id == club_id).first()
    if not db_rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    crud.delete_club_rider(db=db, rider_id=rider_id)
    return {"status": "success"}

@router.post("/{club_id}/club_riders/{rider_id}/horses", response_model=schemas.HorseOut)
def add_horse_to_rider(
    club_id: int,
    rider_id: int,
    horse: schemas.HorseCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    db_rider = db.query(models.ClubRider).filter(models.ClubRider.id == rider_id, models.ClubRider.club_id == club_id).first()
    if not db_rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    return crud.add_horse_to_rider(db=db, horse=horse, rider_id=rider_id)

@router.delete("/{club_id}/horses/{horse_id}")
def delete_horse(
    club_id: int,
    horse_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    horse = db.query(models.Horse).join(models.ClubRider).filter(models.Horse.id == horse_id, models.ClubRider.club_id == club_id).first()
    if not horse:
        raise HTTPException(status_code=404, detail="Horse not found")
    crud.remove_horse(db=db, horse_id=horse_id)
    return {"status": "success"}

# --- CLUB JUDGES ---
@router.post("/{club_id}/club_judges", response_model=schemas.ClubJudgeOut)
def create_club_judge(
    club_id: int,
    judge: schemas.ClubJudgeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.create_club_judge(db=db, judge=judge, club_id=club_id)

@router.put("/{club_id}/club_judges/{judge_id}", response_model=schemas.ClubJudgeOut)
def update_club_judge(
    club_id: int,
    judge_id: int,
    judge: schemas.ClubJudgeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    db_judge = db.query(models.ClubJudge).filter(models.ClubJudge.id == judge_id, models.ClubJudge.club_id == club_id).first()
    if not db_judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    return crud.update_club_judge(db=db, judge_id=judge_id, judge_update=judge)

@router.delete("/{club_id}/club_judges/{judge_id}")
def delete_club_judge(
    club_id: int,
    judge_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    db_judge = db.query(models.ClubJudge).filter(models.ClubJudge.id == judge_id, models.ClubJudge.club_id == club_id).first()
    if not db_judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    crud.delete_club_judge(db=db, judge_id=judge_id)
    return {"status": "success"}

# --- COMPETITIONS ---
@router.post("/{club_id}/competitions", response_model=schemas.CompetitionOut)
def create_competition_for_club(
    club_id: int,
    competition: schemas.CompetitionCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.create_competition(db=db, competition=competition, club_id=club_id)

@router.get("/{club_id}/competitions", response_model=List[schemas.CompetitionOut])
def read_competitions_for_club(
    club_id: int,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.get_competitions(db=db, club_id=club_id)

@router.delete("/{club_id}/competitions/{comp_id}")
def delete_competition_for_club(
    club_id: int,
    comp_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    if crud.delete_competition(db, comp_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Competition not found")

# --- COMPETITION ATTACHMENTS (RIDERS/JUDGES/POSTS) ---
@router.post("/{club_id}/competitions/{comp_id}/riders", response_model=schemas.CompetitionRiderOut)
def attach_rider_to_competition(
    club_id: int,
    comp_id: int,
    comp_rider: schemas.CompetitionRiderCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    db_rider = db.query(models.ClubRider).filter(models.ClubRider.id == comp_rider.club_rider_id, models.ClubRider.club_id == club_id).first()
    if not db_rider:
        raise HTTPException(status_code=404, detail="ClubRider not found")
    return crud.create_competition_rider(db=db, comp_rider=comp_rider, competition_id=comp_id)

@router.get("/{club_id}/competitions/{comp_id}/riders", response_model=List[schemas.CompetitionRiderOut])
def read_riders_for_competition(
    club_id: int,
    comp_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    return crud.get_competition_riders(db=db, competition_id=comp_id)

@router.delete("/{club_id}/competitions/{comp_id}/riders/{comp_rider_id}")
def remove_rider_from_competition(
    club_id: int,
    comp_id: int, 
    comp_rider_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    if crud.delete_competition_rider(db, comp_rider_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Competition Rider not found")

@router.post("/{club_id}/competitions/{comp_id}/judges", response_model=schemas.CompetitionJudgeOut)
def attach_judge_to_competition(
    club_id: int,
    comp_id: int,
    comp_judge: schemas.CompetitionJudgeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    db_judge = db.query(models.ClubJudge).filter(models.ClubJudge.id == comp_judge.club_judge_id, models.ClubJudge.club_id == club_id).first()
    if not db_judge:
        raise HTTPException(status_code=404, detail="ClubJudge not found")
    return crud.create_competition_judge(db=db, comp_judge=comp_judge, competition_id=comp_id)

@router.get("/{club_id}/competitions/{comp_id}/judges", response_model=List[schemas.CompetitionJudgeOut])
def read_judges_for_competition(
    club_id: int,
    comp_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    return crud.get_competition_judges(db=db, competition_id=comp_id)

@router.delete("/{club_id}/competitions/{comp_id}/judges/{comp_judge_id}")
def remove_judge_from_competition(
    club_id: int,
    comp_id: int, 
    comp_judge_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    if crud.delete_competition_judge(db, comp_judge_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Competition Judge not found")

@router.post("/{club_id}/competitions/{comp_id}/judges/{comp_judge_id}/send-email")
def send_magic_link_email(
    club_id: int,
    comp_id: int,
    comp_judge_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_competition_if_owner(comp_id, club_id, db, current_user)
    
    comp_judge = db.query(models.CompetitionJudge).filter(models.CompetitionJudge.id == comp_judge_id, models.CompetitionJudge.competition_id == comp_id).first()
    if not comp_judge:
        raise HTTPException(status_code=404, detail="Competition Judge not found")
        
    club_judge = comp_judge.club_judge
    if not club_judge.email:
        raise HTTPException(status_code=400, detail="Denne dommer har ingen registreret e-mailadresse.")
        
    comp = db.query(models.Competition).filter(models.Competition.id == comp_id).first()
    
    # Afsend email via Simply.com (eller anden SMTP)
    try:
        from email_service import send_judge_magic_link_email
        magic_link = f"http://localhost:5173/?magic={comp_judge.magic_link_uuid}"
        send_judge_magic_link_email(
            to_email=club_judge.email,
            judge_name=club_judge.name,
            comp_name=comp.name,
            magic_link=magic_link
        )
        return {"status": "success", "message": f"Email sendt til {club_judge.email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CLUB POSTS ---
@router.post("/{club_id}/club_posts", response_model=schemas.ClubPostOut)
def create_post_for_club(
    club_id: int,
    post: schemas.ClubPostCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.create_club_post(db=db, post=post, club_id=club_id)

@router.get("/{club_id}/club_posts", response_model=List[schemas.ClubPostOut])
def read_posts_for_club(
    club_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    return crud.get_club_posts(db=db, club_id=club_id)

@router.delete("/{club_id}/club_posts/{post_id}")
def delete_post_from_club(
    club_id: int,
    post_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    get_club_if_owner(club_id, db, current_user)
    if crud.delete_club_post(db, post_id, club_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="ClubPost not found")
