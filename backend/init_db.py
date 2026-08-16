import mysql.connector
import bcrypt
import os

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": f"{os.getenv('MY_DB_PASSWORD')}",  # Update to match your MySQL password
    "database": "rag_knowledge_base"
}


def init_database():
    conn = mysql.connector.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"]
    )
    cursor = conn.cursor()
    
    # Create Database
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']};")
    cursor.execute(f"USE {DB_CONFIG['database']};")
    
    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_name VARCHAR(50) NOT NULL DEFAULT 'employee',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Documents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        doc_id VARCHAR(50) PRIMARY KEY,
        document_topic VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Document Permissions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doc_id VARCHAR(50),
        role_name VARCHAR(50) NOT NULL,
        FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
    );
    """)

    #4. `chat_history` Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    """)

    # Create Initial Default Admin Account
    admin_email = "admin@company.com"
    cursor.execute("SELECT * FROM users WHERE email = %s", (admin_email,))
    if not cursor.fetchone():
        hashed_pw = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')        
        cursor.execute("""
            INSERT INTO users (full_name, email, password_hash, role_name)
            VALUES (%s, %s, %s, %s)
        """, ("System Admin", admin_email, hashed_pw, "admin"))
        print("Default Admin created: admin@company.com / admin123")

    conn.commit()
    cursor.close()
    conn.close()
    print("Database schema successfully initialized!")

if __name__ == "__main__":
    init_database()