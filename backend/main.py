import os
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import jwt
import bcrypt
from kafka import KafkaProducer
from fastapi.middleware.cors import CORSMiddleware

from db import (
    create_user, get_user_by_email, get_user_by_id, get_all_users, 
    update_user_role, save_document_and_permissions
)
from query import ask_knowledge_base

SECRET_KEY = "super_secret_enterprise_rag_key"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

app = FastAPI(title="Enterprise Secure RAG System API")

app = FastAPI(title="Enterprise RAG Backend")

# --- ADD THIS CORS BLOCK ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def verify_password(plain, hashed):
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"email": email, "role": role}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

#Endpoints
class RegisterModel(BaseModel):
    full_name: str
    email: str
    password: str
    role_name: str = "employee"

@app.post("/auth/register", tags=["Auth"])
def register(user_data: RegisterModel):
    existing = get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user_data.password)
    user_id = create_user(user_data.full_name, user_data.email, hashed, user_data.role_name)
    return {"message": "User created successfully", "user_id": user_id}

@app.post("/auth/login", tags=["Auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"], "role": user["role_name"]})
    return {"access_token": access_token, "token_type": "bearer", "role": user["role_name"]}


@app.get("/admin/users", tags=["Admin User Management"])
def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    return get_all_users(role_filter=role, is_active_filter=is_active, search_query=search)

class RoleUpdateModel(BaseModel):
    new_role: str

@app.put("/admin/users/{user_id}/role", tags=["Admin User Management"])
def modify_role(user_id: int, data: RoleUpdateModel, admin: dict = Depends(require_admin)):
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Self-Lockout Protection
    if target_user["email"] == admin["email"]:
        raise HTTPException(status_code=400, detail="You cannot change your own admin role.")
        
    update_user_role(user_id, data.new_role)
    return {"message": f"User '{target_user['full_name']}' updated to role '{data.new_role}'"}


@app.post("/admin/upload", tags=["Admin Documents"])
async def upload_document(
    file: UploadFile = File(...),
    allowed_roles: str = Form(...),
    document_topic: str = Form(...),
    admin: dict = Depends(require_admin)
):
    doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
    os.makedirs("source/knowledge_base", exist_ok=True)
    file_path = f"source/knowledge_base/{doc_id}_{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    roles_list = [r.strip() for r in allowed_roles.split(",")]
    save_document_and_permissions(doc_id, file.filename, document_topic, roles_list)

    kafka_payload = {"doc_id": doc_id, "file_path": file_path}
    producer.send("document-ingestion", kafka_payload)
    producer.flush()

    return {"message": "Document uploaded and queued for processing", "doc_id": doc_id}


class QueryModel(BaseModel):
    question: str

@app.post("/ask", tags=["RAG Query"])
def ask_question(data: QueryModel, user: dict = Depends(get_current_user)):
    user_role = user["role"]
    answer = ask_knowledge_base(data.question, user_role=user_role)
    return {"question": data.question, "user_role": user_role, "answer": answer}