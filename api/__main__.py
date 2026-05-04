import uvicorn


if __name__ == "__main__":
    uvicorn.run("api.app:app", host="localhost", port=8765, reload=False)
