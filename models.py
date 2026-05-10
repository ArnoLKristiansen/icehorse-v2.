from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    clubs = relationship("Club", back_populates="user", cascade="all, delete-orphan")

class Club(Base):
    __tablename__ = "clubs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    
    contact_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    city = Column(String, nullable=True)

    logo_url = Column(String, nullable=True)
    facebook_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)

    user = relationship("User", back_populates="clubs")
    competitions = relationship("Competition", back_populates="club", cascade="all, delete-orphan")
    club_riders = relationship("ClubRider", back_populates="club", cascade="all, delete-orphan")
    club_judges = relationship("ClubJudge", back_populates="club", cascade="all, delete-orphan")
    club_posts = relationship("ClubPost", back_populates="club", cascade="all, delete-orphan")

class DiscountCode(Base):
    __tablename__ = "discount_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    discount_amount = Column(Float)
    is_active = Column(Boolean, default=True)

class Competition(Base):
    __tablename__ = "competitions"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    name = Column(String, index=True)
    date = Column(DateTime)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    location = Column(String)
    
    is_active = Column(Boolean, default=False)
    active_until = Column(DateTime, nullable=True)
    price_paid = Column(Float, nullable=True)

    club = relationship("Club", back_populates="competitions")
    competition_judges = relationship("CompetitionJudge", back_populates="competition", cascade="all, delete-orphan")
    competition_riders = relationship("CompetitionRider", back_populates="competition", cascade="all, delete-orphan")

class ClubPost(Base):
    __tablename__ = "club_posts"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    name = Column(String)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)

    club = relationship("Club", back_populates="club_posts")
    scores = relationship("Score", back_populates="club_post", cascade="all, delete-orphan")
    competition_judges = relationship("CompetitionJudge", secondary="judge_posts", back_populates="club_posts")

class ClubRider(Base):
    __tablename__ = "club_riders"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    name = Column(String)
    email = Column(String) # Required
    phone = Column(String, nullable=True)

    club = relationship("Club", back_populates="club_riders")
    horses = relationship("Horse", back_populates="club_rider", cascade="all, delete-orphan")
    competitions_participated = relationship("CompetitionRider", back_populates="club_rider", cascade="all, delete-orphan")

class Horse(Base):
    __tablename__ = "horses"
    id = Column(Integer, primary_key=True, index=True)
    club_rider_id = Column(Integer, ForeignKey("club_riders.id"))
    name = Column(String)

    club_rider = relationship("ClubRider", back_populates="horses")
    competitions_participated = relationship("CompetitionRider", back_populates="horse", cascade="all, delete-orphan")

class ClubJudge(Base):
    __tablename__ = "club_judges"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    name = Column(String)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    club = relationship("Club", back_populates="club_judges")
    competitions_participated = relationship("CompetitionJudge", back_populates="club_judge", cascade="all, delete-orphan")

class CompetitionRider(Base):
    __tablename__ = "competition_riders"
    id = Column(Integer, primary_key=True, index=True)
    competition_id = Column(Integer, ForeignKey("competitions.id"))
    club_rider_id = Column(Integer, ForeignKey("club_riders.id"))
    horse_id = Column(Integer, ForeignKey("horses.id"))
    
    start_number = Column(Integer, nullable=True)
    magic_link_uuid = Column(String, unique=True, index=True)

    competition = relationship("Competition", back_populates="competition_riders")
    club_rider = relationship("ClubRider", back_populates="competitions_participated")
    horse = relationship("Horse", back_populates="competitions_participated")
    scores = relationship("Score", back_populates="competition_rider", cascade="all, delete-orphan")

class CompetitionJudge(Base):
    __tablename__ = "competition_judges"
    id = Column(Integer, primary_key=True, index=True)
    competition_id = Column(Integer, ForeignKey("competitions.id"))
    club_judge_id = Column(Integer, ForeignKey("club_judges.id"))
    
    role = Column(String)
    magic_link_uuid = Column(String, unique=True, index=True)

    competition = relationship("Competition", back_populates="competition_judges")
    club_judge = relationship("ClubJudge", back_populates="competitions_participated")
    club_posts = relationship("ClubPost", secondary="judge_posts", back_populates="competition_judges")
    scores = relationship("Score", back_populates="competition_judge", cascade="all, delete-orphan")

class JudgePost(Base):
    __tablename__ = "judge_posts"
    competition_judge_id = Column(Integer, ForeignKey("competition_judges.id"), primary_key=True)
    club_post_id = Column(Integer, ForeignKey("club_posts.id"), primary_key=True)

class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    club_post_id = Column(Integer, ForeignKey("club_posts.id"))
    competition_judge_id = Column(Integer, ForeignKey("competition_judges.id"))
    competition_rider_id = Column(Integer, ForeignKey("competition_riders.id"))
    
    points = Column(Float)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    club_post = relationship("ClubPost", back_populates="scores")
    competition_judge = relationship("CompetitionJudge", back_populates="scores")
    competition_rider = relationship("CompetitionRider", back_populates="scores")
