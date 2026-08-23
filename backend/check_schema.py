from dotenv import load_dotenv
load_dotenv(".env")
load_dotenv(".env.local", override=True)
from backend.db.client import db_conn

try:
    c = next(db_conn())
    cur = c.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='cotizaciones'")
    for row in cur.fetchall():
        print(row)
    cur.close()
except Exception as e:
    print("Error:", e)
