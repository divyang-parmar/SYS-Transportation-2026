import os
import sys

here = os.path.dirname(os.path.abspath(__file__))
venv_lib = os.path.join(here, ".venv", "lib")
for entry in os.listdir(venv_lib):
    if entry.startswith("python"):
        sys.path.insert(0, os.path.join(venv_lib, entry, "site-packages"))
        break
os.chdir(here)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
