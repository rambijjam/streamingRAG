import mysql.connector
from typing import Optional
import os

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": f"{os.getenv('MY_DB_PASSWORD')}", 
    "database": "rag_knowledge_base"
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def create_user(full_name: str, email: str, password_hash: str, role_name: str = "employee"):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = "INSERT INTO users (full_name, email, password_hash, role_name) VALUES (%s, %s, %s, %s)"
    cursor.execute(query, (full_name, email, password_hash, role_name.lower()))
    conn.commit()
    user_id = cursor.lastrowid

    cursor.close()
    conn.close()
    return user_id

def get_user_by_email(email: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()
    return user

def get_user_by_id(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()
    return user

def get_all_users(role_filter : Optional[str] = None, 
                  is_active_filter : Optional[bool] = None,
                  search_query : Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary = True)

    query = "SELECT user_id, full_name, email, role_name, is_active, created_at FROM users WHERE 1=1"
    params = []

    if role_filter:
        query += " AND role_name = %s"
        params.append(role_filter.strip().lower())

    if is_active_filter is not None:
        query += " AND is_active = %s"
        params.append(is_active_filter)

    if search_query:
        query += " AND ( full_name LIKE %s OR email LIKE %s )"
        search_pattern = f"%{search_query.strip()}%"
        params.extend([search_pattern, search_pattern])

    query += " ORDER BY created_at DESC"

    cursor.execute(query, tuple(params))
    users = cursor.fetchall()

    cursor.close()
    conn.close()

    return users

def update_user_role(user_id : int, new_role : str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("UPDATE users SET role_name = %s WHERE user_id = %s", (new_role.lower(), user_id))
    conn.commit()

    cursor.close()
    conn.close()

def update_user_status(user_id: int, is_active: bool):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "UPDATE users SET is_active = %s WHERE user_id = %s"
    cursor.execute(query, (is_active, user_id))
    conn.commit()
    
    cursor.close()
    conn.close()

def toggle_user_status(user_email: str, new_status: bool):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "UPDATE users SET is_active = %s WHERE email = %s"
    
    cursor.execute(query, (new_status, user_email))
    conn.commit()

    success = cursor.rowcount > 0

    cursor.close()
    conn.close()

    return success

def save_chat_message(user_id: int, question: str, answer: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "INSERT INTO chat_history (user_id, question, answer) VALUES (%s, %s, %s)"
    cursor.execute(query, (user_id, question, answer))
    conn.commit()

    cursor.close()
    conn.close()

def get_chat_history_by_user_id(user_id: int, limit: int = 50) -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT id, question, answer, created_at 
        FROM chat_history 
        WHERE user_id = %s 
        ORDER BY created_at ASC 
        LIMIT %s
    """
    cursor.execute(query, (user_id, limit))
    history = cursor.fetchall()

    cursor.close()
    conn.close()
    return history

def save_document_and_permissions(doc_id:str, filename:str, topic:str, allowed_roles: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO documents (doc_id, document_topic, filename) VALUES (%s, %s, %s)",
        (doc_id, topic, filename)
    )

    for role in allowed_roles:
        cursor.execute(
            "INSERT INTO document_permissions (doc_id, role_name) VALUES (%s, %s)",
            (doc_id, role.strip().lower())
        )

    conn.commit()
    cursor.close()
    conn.close()

def get_allowed_doc_ids(user_role: str) -> list[str]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT DISTINCT doc_id FROM document_permissions WHERE role_name = %s"
        cursor.execute(query, (user_role.lower(),))
        results = cursor.fetchall()

        cursor.close()
        conn.close()
        
        return [row[0] for row in results]
        
    except Exception as e:
        print(f"[!] Database error: {e}")
        return []

