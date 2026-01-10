import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def add_unique_index():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db = client["projeto_silvana"]
    # Criar índice único em descricao_case_insensitive
    await db.tags.create_index("descricao_case_insensitive", unique=True)
    print("Índice único criado em descricao_case_insensitive")

if __name__ == "__main__":
    asyncio.run(add_unique_index())