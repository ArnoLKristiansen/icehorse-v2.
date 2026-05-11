from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import crud, models, schemas, database

router = APIRouter(tags=["scores"])

def get_judge_by_uuid(uuid: str, db: Session):
    judge = db.query(models.CompetitionJudge).filter(models.CompetitionJudge.magic_link_uuid == uuid).first()
    if not judge:
        raise HTTPException(status_code=401, detail="Ugyldigt Magic Link")
    return judge

# --- MAGIC LINK / JUDGE AUTH ---
@router.get("/magic/{uuid}", response_model=schemas.CompetitionJudgeOut)
def get_magic_link_session(uuid: str, db: Session = Depends(database.get_db)):
    """Validates magic link and returns judge details including assigned posts."""
    judge = get_judge_by_uuid(uuid, db)
    return judge

# --- JUDGE SCORING ENDPOINTS ---
@router.post("/magic/{uuid}/scores", response_model=schemas.ScoreOut)
def submit_score(uuid: str, score: schemas.ScoreCreate, db: Session = Depends(database.get_db)):
    judge = get_judge_by_uuid(uuid, db)
    
    # Verify that the judge is actually allowed to judge this post
    assigned_post_ids = [p.id for p in judge.club_posts]
    if score.club_post_id not in assigned_post_ids:
        raise HTTPException(status_code=403, detail="Du er ikke tildelt denne post.")
        
    # Optional: Check if score already exists for this rider by this judge on this post
    existing_score = db.query(models.Score).filter(
        models.Score.competition_rider_id == score.competition_rider_id,
        models.Score.club_post_id == score.club_post_id,
        models.Score.competition_judge_id == judge.id
    ).first()
    if existing_score:
        raise HTTPException(status_code=400, detail="Du har allerede givet point til denne rytter på denne post.")
        
    return crud.create_score(db=db, score=score, judge_id=judge.id)

@router.put("/magic/{uuid}/scores/{score_id}", response_model=schemas.ScoreOut)
def update_score(uuid: str, score_id: int, score_update: schemas.ScoreUpdate, db: Session = Depends(database.get_db)):
    judge = get_judge_by_uuid(uuid, db)
    updated_score = crud.update_score(db=db, score_id=score_id, score_update=score_update, judge_id=judge.id)
    if not updated_score:
        raise HTTPException(status_code=404, detail="Score ikke fundet eller du har ikke rettigheder til at rette den.")
    return updated_score

# --- PUBLIC LEADERBOARD ---
@router.get("/public/competitions/{comp_id}/leaderboard")
def get_public_leaderboard(comp_id: int, db: Session = Depends(database.get_db)):
    """Returns the leaderboard with total scores and individual post details for a competition."""
    comp = db.query(models.Competition).filter(models.Competition.id == comp_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
        
    total_posts_in_comp = db.query(models.JudgePost).join(models.CompetitionJudge).filter(models.CompetitionJudge.competition_id == comp_id).distinct(models.JudgePost.club_post_id).count()
    # Alternatively, you could just count total assigned posts.
    
    riders = db.query(models.CompetitionRider).filter(models.CompetitionRider.competition_id == comp_id).all()
    
    leaderboard = []
    for rider in riders:
        total_points = 0.0
        post_details = []
        
        for score in rider.scores:
            total_points += score.points
            post_details.append({
                "score_id": score.id,
                "points": score.points,
                "comment": score.comment,
                "post_name": score.club_post.name if score.club_post else "Ukendt Post",
                "post_id": score.club_post_id,
                "judge_name": score.competition_judge.club_judge.name if score.competition_judge and score.competition_judge.club_judge else "Ukendt Dommer",
                "judge_id": score.competition_judge.id
            })
            
        leaderboard.append({
            "rider_id": rider.id,
            "start_number": rider.start_number,
            "rider_name": rider.club_rider.name,
            "horse_name": rider.horse.name,
            "total_score": round(total_points, 2),
            "posts_completed": len(rider.scores),
            "details": post_details
        })
        
    # Sort by total_score descending
    leaderboard.sort(key=lambda x: x["total_score"], reverse=True)
    
    return {
        "competition_name": comp.name,
        "total_expected_posts_per_rider": total_posts_in_comp,
        "leaderboard": leaderboard
    }
