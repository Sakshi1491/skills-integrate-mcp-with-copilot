"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Paths for persistent storage
USERS_FILE = current_dir / "users.json"
QNA_FILE = current_dir / "qna.json"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


def load_json_file(path: Path, default):
    if path.exists():
        try:
            with path.open("r", encoding="utf-8") as file:
                return json.load(file)
        except json.JSONDecodeError:
            return default
    return default


def save_json_file(path: Path, data):
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def find_user(email: str):
    return next((user for user in users if user["email"] == email.lower()), None)


class UserCredentials(BaseModel):
    email: EmailStr
    password: str


class QnaSubmission(BaseModel):
    email: EmailStr
    question: str


class QnaItem(BaseModel):
    email: EmailStr
    question: str
    created_at: str


users = load_json_file(USERS_FILE, [])
qna_items = load_json_file(QNA_FILE, [])


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    """Unregister a student from an activity"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}


@app.post("/auth/register")
def register_user(user: UserCredentials):
    if find_user(user.email):
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = get_password_hash(user.password)
    users.append({"email": user.email.lower(), "password": hashed_password})
    save_json_file(USERS_FILE, users)
    return {"message": "User registered successfully"}


@app.post("/auth/login")
def login_user(user: UserCredentials):
    existing_user = find_user(user.email)
    if not existing_user or not verify_password(user.password, existing_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful"}


@app.get("/qna")
def get_qna():
    return qna_items


@app.post("/qna")
def submit_question(item: QnaSubmission):
    qna_entry = QnaItem(
        email=item.email.lower(),
        question=item.question,
        created_at=datetime.utcnow().isoformat() + "Z"
    ).dict()
    qna_items.append(qna_entry)
    save_json_file(QNA_FILE, qna_items)
    return {"message": "Question submitted successfully"}
