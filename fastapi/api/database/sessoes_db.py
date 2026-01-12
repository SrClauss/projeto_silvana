from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.sessoes import Sessao
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para Sessão
async def create_sessao(sessao: Sessao):
    result = await db.sessoes.insert_one(sessao.dict(by_alias=True))
    return result.inserted_id

async def get_sessoes():
    return await db.sessoes.find().to_list(None)

async def get_sessao_by_id(sessao_id: str):
    return await db.sessoes.find_one({"_id": sessao_id})

async def update_sessao(sessao_id: str, update_data: dict):
    return await db.sessoes.find_one_and_update(
        {"_id": sessao_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_sessao(sessao_id: str):
    return await db.sessoes.delete_one({"_id": sessao_id})
