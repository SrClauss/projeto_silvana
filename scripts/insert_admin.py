import os
import sys
import asyncio

# Adicionar o caminho para importar módulos do FastAPI
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi'))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from api.models.users import User, Role

# Contexto de hash de senha (igual ao usado em auth.py)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def main():
    # Conectar ao MongoDB (usa a variável de ambiente MONGODB_URL ou padrão)
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongodb_url)
    db = client["projeto_silvana"]
    
    # Hash da senha fornecida
    hashed_password = get_password_hash("dy213y1984")
    
    # Criar o usuário admin (usando "admin" como email, já que o modelo usa email em vez de username)
    user = User(
        name="Admin",
        email="admin",  # Usado como username
        hashed_password=hashed_password,
        role=Role.ADMIN
    )
    
    # Inserir no banco de dados
    result = await db.users.insert_one(user.dict(by_alias=True))
    print(f"Usuário admin inserido com sucesso! ID: {result.inserted_id}")
    
    # Fechar conexão
    client.close()

if __name__ == "__main__":
    asyncio.run(main())