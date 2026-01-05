from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import api.models
from api.routers import (
    auth,
    reports,
    desejo_cliente_router,
    clientes_router,
    produtos_router,
    condicionais_fornecedor_router,
    faturamento_router,
    condicionais_cliente_router,
    desejos_cliente_router,
    users_router,
)

app = FastAPI()

# Configurar CORS via variável de ambiente ALLOWED_ORIGINS (comma-separated).
# Exemplo: ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# Use "*" para permitir todas as origens (não recomendado em produção).
raw_allowed = os.getenv("ALLOWED_ORIGINS", "")
if raw_allowed.strip() == "":
    origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
elif raw_allowed.strip() == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in raw_allowed.split(",") if o.strip()]

allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() in ("1", "true", "yes")
# if allowing all origins, browsers won't accept credentials; disable to avoid misconfiguration.
if origins == ["*"] and allow_credentials:
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Suportar ambas as rotas (com underline e com dash) e sem/ com barra final
@app.get("/say-my-name/")
@app.get("/say_my_name")
async def say_my_name():
    return {"message": "Heisenberg"}

# Incluir routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(desejo_cliente_router.router, prefix="/desejos", tags=["desejos"])
app.include_router(clientes_router.router, prefix="/clientes", tags=["clientes"])
app.include_router(produtos_router.router, prefix="/produtos", tags=["produtos"])
app.include_router(condicionais_fornecedor_router.router, prefix="/condicionais-fornecedor", tags=["condicionais-fornecedor"])
app.include_router(faturamento_router.router, prefix="/faturamento", tags=["faturamento"])
app.include_router(condicionais_cliente_router.router, prefix="/condicionais-cliente", tags=["condicionais-cliente"])
app.include_router(desejos_cliente_router.router, prefix="/desejos-cliente", tags=["desejos-cliente"])
app.include_router(users_router.router, prefix="/users", tags=["users"])