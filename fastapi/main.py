from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import api.models
from passlib.context import CryptContext
from api.models.users import User, Role
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
    marcas_fornecedores_router,
    sessoes_router,
    vendas_router,
    imposto_config_router,
    impostos_router,
    despesas_router,
)

app = FastAPI()

# Contexto de hash de senha
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

@app.on_event("startup")
async def startup_event():
    # Conectar ao MongoDB
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/projeto_silvana")
    client = AsyncIOMotorClient(mongodb_url)
    db = client.get_database("projeto_silvana")
    
    # Verificar se o usuário admin existe
    admin_user = await db.users.find_one({"email": "admin"})
    if not admin_user:
        # Criar o usuário admin
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "dy213y1984")
        hashed_password = get_password_hash(admin_password)
        user = User(
            name="Admin",
            email="admin",
            hashed_password=hashed_password,
            role=Role.ADMIN
        )
        await db.users.insert_one(user.dict(by_alias=True))
        print("Usuário admin criado com sucesso!")
    else:
        print("Usuário admin já existe.")

    # Garantir índices
    try:
        await db.produtos.create_index("codigo_interno", unique=True)
        print("Índice único para codigo_interno garantido.")
    except Exception as e:
        print("Falha ao criar índice de codigo_interno:", e)
    
    # Fechar conexão (opcional, pois Motor gerencia conexões)
    # client.close()

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
app.include_router(marcas_fornecedores_router.router, prefix="/marcas-fornecedores", tags=["marcas-fornecedores"])
app.include_router(sessoes_router.router, prefix="/sessoes", tags=["sessoes"])
app.include_router(users_router.router, prefix="/users", tags=["users"])
app.include_router(vendas_router.router, prefix="/vendas", tags=["vendas"])
app.include_router(imposto_config_router.router, prefix="/impostos-config", tags=["impostos-config"])
app.include_router(impostos_router.router, prefix="/impostos", tags=["impostos"])
app.include_router(despesas_router.router, prefix="/despesas", tags=["despesas"])