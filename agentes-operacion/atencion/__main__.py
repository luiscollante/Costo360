import uvicorn
from .main import create_app

uvicorn.run(create_app(), host='127.0.0.1', port=8012, access_log=False)
