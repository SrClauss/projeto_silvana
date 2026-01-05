from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.despesas import Despesa
from datetime import datetime
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para Despesa
async def create_despesa(despesa: Despesa):
    result = await db.despesas.insert_one(despesa.dict(by_alias=True))
    return result.inserted_id

async def get_despesas():
    return await db.despesas.find().to_list(None)

async def get_despesa_by_id(despesa_id: str):
    return await db.despesas.find_one({"_id": despesa_id})

async def update_despesa(despesa_id: str, update_data: dict):
    return await db.despesas.find_one_and_update(
        {"_id": despesa_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_despesa(despesa_id: str):
    return await db.despesas.delete_one({"_id": despesa_id})

# Despesas por mês
async def get_despesas_por_mes(mes: int, ano: int):
    start_date = datetime(ano, mes, 1)
    if mes == 12:
        end_date = datetime(ano + 1, 1, 1)
    else:
        end_date = datetime(ano, mes + 1, 1)
    
    return await db.despesas.find({
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(None)