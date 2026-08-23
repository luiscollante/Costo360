from dotenv import load_dotenv
import os
import sys

# Load env vars for DB
load_dotenv("backend/.env")
load_dotenv("backend/.env.local", override=True)

try:
    from backend.db.client import db_conn
    from datetime import date
    
    c = next(db_conn())
    cur = c.cursor()
    
    year = date.today().year
    prefijo = "COT"
    
    print("Executing query...")
    cur.execute(
        "SELECT COUNT(*) FROM cotizaciones WHERE fecha LIKE %s AND numero LIKE %s",
        (f"{year}-%", f"{prefijo}-%"),
    )
    count = cur.fetchone()[0]
    print("Count:", count)
    cur.close()
    
except Exception as e:
    import traceback
    traceback.print_exc()
