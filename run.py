import os
import sys
import uvicorn

# Ensure the backend directory is in sys.path and PYTHONPATH for reloader subprocesses
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

current_pythonpath = os.environ.get("PYTHONPATH", "")
if backend_dir not in current_pythonpath:
    os.environ["PYTHONPATH"] = (backend_dir + os.pathsep + current_pythonpath).rstrip(os.pathsep)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=backend_dir)
