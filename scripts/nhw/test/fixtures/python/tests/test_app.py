from fastapi import FastAPI

app = FastAPI()


@app.on_event("startup")
def fake_test_startup() -> None:
    pass
