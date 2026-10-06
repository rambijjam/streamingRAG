import os
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, List
import glob

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import jwt
import bcrypt
from kafka import KafkaProducer
from fastapi.middleware.cors import CORSMiddleware

from db import (
    create_user, delete_document_record, get_admin_feedback_logs, get_all_documents, get_chat_history_by_user_id, get_user_by_email, get_user_by_id, get_all_users, save_chat_message, toggle_user_status, update_chat_feedback, update_document_roles, 
    update_user_role, save_document_and_permissions
)
from query import ask_knowledge_base

SECRET_KEY = os.getenv("SECRET")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

app = FastAPI(title="Enterprise Secure RAG System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8') #this function runs automatically on 
    # every message's raw dict, dict -> json.dumps -> encode string -> raw bytes
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
        user_id: int = payload.get("user_id")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "email": email, "role": role}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

class RegisterModel(BaseModel):
    full_name: str
    email: str
    password: str
    role_name: str = "employee"

class QueryModel(BaseModel):
    question: str

class RoleUpdateModel(BaseModel):
    new_role: str

class UserStatusUpdateModel(BaseModel):
    email: str
    is_active: bool

class UpdatePermissionsModel(BaseModel):
    allowed_roles: List[str]

class FeedbackUpdateModel(BaseModel):
    score: int
    text: Optional[str] = None
#Endpoints

@app.post("/auth/register", tags=["Auth"])
def register(user_data: RegisterModel, admin : dict = Depends(require_admin)):
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
    
    if not user.get("is_active"):
        raise HTTPException(
            status_code=401, 
            detail="Account is deactivated. Please contact an Administrator."
        )
    
    access_token = create_access_token(
        data={
            "sub": user["email"], 
            "role": user["role_name"],
            "user_id": user["user_id"]
        }
    )

    return {"access_token": access_token, "token_type": "bearer", "role": user["role_name"]}


@app.get("/admin/users", tags=["Admin User Management"])
def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    return get_all_users(role_filter=role, is_active_filter=is_active, search_query=search)


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

@app.put("/admin/users/status", tags=["Admin User Management"])
def update_user_status(data: UserStatusUpdateModel, admin: dict = Depends(require_admin)):

    # Self-deactivation protection
    if data.email == admin["email"]:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own admin account.")

    success = toggle_user_status(data.email, data.is_active)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or status unchanged")
    
    status_text = "activated" if data.is_active else "deactivated"
    return {"message": f"User {data.email} has been {status_text}."}

@app.post("/admin/upload", tags=["Admin Documents"])
async def upload_document(
    file: UploadFile = File(...), # get the file from the File field in the form-data
    allowed_roles: str = Form(...), # get the allowed_roles from the Form field in the form-data
    document_topic: str = Form(...), # get the document_topic from the Form field in the form-data
    admin: dict = Depends(require_admin)
):
    doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
    os.makedirs("source/knowledge_base", exist_ok=True)
    file_path = f"source/knowledge_base/{doc_id}_{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    roles_list = [r.strip() for r in allowed_roles.split(",")]  # strip removes leading and trailing spaces
    save_document_and_permissions(doc_id, file.filename, document_topic, roles_list)

    kafka_payload = {"doc_id": doc_id, "file_path": file_path}
    producer.send("document-ingestion", kafka_payload)
    producer.flush() # blocks the event loop thread 

    return {"message": "Document uploaded and queued for processing", "doc_id": doc_id}

@app.post("/ask", tags=["RAG Query"])
def ask_question(data: QueryModel, user: dict = Depends(get_current_user)):
    user_role = user["role"]
    answer = ask_knowledge_base(data.question, user_role=user_role)

    chat_id = None
    if user.get("user_id"):
        chat_id = save_chat_message(user["user_id"], data.question, answer)
        
    return {
        "question": data.question, 
        "chat_id": chat_id,
        "user_role": user_role, 
        "answer": answer
    }

@app.get("/chat/history", tags=["RAG Query"])
def get_user_history(limit: int = 50, user: dict = Depends(get_current_user)):

    user_id = user["user_id"]

    history = get_chat_history_by_user_id(user_id=user_id, limit=limit)
    return {"history": history}

@app.get("/admin/documents", tags=["Admin Documents"])
def list_documents(admin: dict = Depends(require_admin)):
    docs = get_all_documents()

    for doc in docs:
        doc['uploaded_at'] = doc['uploaded_at'].isoformat() + 'Z'   

    return {"documents": docs}

@app.put("/admin/documents/{doc_id}/permissions", tags=["Admin Documents"])
def modify_document_permissions(doc_id: str, data: UpdatePermissionsModel, admin: dict = Depends(require_admin)):
    update_document_roles(doc_id, data.allowed_roles)
    return {"message": f"Permissions successfully updated for {doc_id}"}

@app.delete("/admin/documents/{doc_id}", tags=["Admin Documents"])
def delete_document(doc_id: str, admin: dict = Depends(require_admin)):
    delete_document_record(doc_id)
    
    file_path = f"source/knowledge_base/{doc_id}_*" # You might need exact filename, or use glob/os module to find and remove
    for f in glob.glob(file_path):
        os.remove(f)

    kafka_payload = {"doc_id": doc_id, "action": "delete"}
    producer.send("document-ingestion", kafka_payload)
    producer.flush()

    return {"message": f"Document {doc_id} completely removed from the system."}

@app.put("/chat/{chat_id}/feedback", tags=["RAG Query"])
def submit_feedback(chat_id: int, data: FeedbackUpdateModel, user: dict = Depends(get_current_user)):
    if not user.get("user_id"):
        raise HTTPException(status_code=400, detail="User ID missing from token")
        
    success = update_chat_feedback(chat_id, user["user_id"], data.score, data.text)
    
    if not success:
        raise HTTPException(status_code=404, detail="Chat message not found or unauthorized")
        
    return {"message": "Feedback saved successfully"}

@app.get("/admin/feedback", tags=["Admin Panel"])
def view_feedback_logs(admin: dict = Depends(require_admin)):
    logs = get_admin_feedback_logs()

    for log in logs:
        if log.get('created_at') is not None:
            log['created_at'] = log['created_at'].isoformat() + 'Z'

    return {"feedback_logs": logs}