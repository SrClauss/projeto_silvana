from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.entradas import Entrada
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para Entrada
async def create_entrada(entrada: Entrada):
    result = await db.entradas.insert_one(entrada.dict(by_alias=True))
    return result.inserted_id

async def get_entradas():
    return await db.entradas.find().to_list(None)

async def get_entrada_by_id(entrada_id: str):
    return await db.entradas.find_one({"_id": entrada_id})

async def update_entrada(entrada_id: str, update_data: dict):
    return await db.entradas.find_one_and_update(
        {"_id": entrada_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_entrada(entrada_id: str):
    return await db.entradas.delete_one({"_id": entrada_id})

# Agregação para Entrada
async def get_entrada_com_produto(entrada_id: str):
    pipeline = [
        {"$match": {"_id": entrada_id}},
        {"$lookup": {"from": "produtos", "localField": "produtos_id", "foreignField": "_id", "as": "produto"}}
    ]
    return await db.entradas.aggregate(pipeline).to_list(None)