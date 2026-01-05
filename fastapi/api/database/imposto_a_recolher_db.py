from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.imposto_a_recolher import ImpostoARecolher
from datetime import datetime
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para ImpostoARecolher
async def create_imposto_a_recolher(imposto: ImpostoARecolher):
    result = await db.imposto_a_recolher.insert_one(imposto.dict(by_alias=True))
    return result.inserted_id

async def get_impostos_a_recolher():
    return await db.imposto_a_recolher.find().to_list(None)

async def get_imposto_a_recolher_by_id(imposto_id: str):
    return await db.imposto_a_recolher.find_one({"_id": imposto_id})

async def update_imposto_a_recolher(imposto_id: str, update_data: dict):
    return await db.imposto_a_recolher.find_one_and_update(
        {"_id": imposto_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_imposto_a_recolher(imposto_id: str):
    return await db.imposto_a_recolher.delete_one({"_id": imposto_id})

# Impostos pendentes
async def get_impostos_pendentes():
    return await db.imposto_a_recolher.find({"status": "pendente"}).to_list(None)

# Agregação de impostos por período
async def get_impostos_agregados_por_periodo(data_inicio: datetime, data_fim: datetime):
    pipeline = [
        {"$match": {"data_vencimento": {"$gte": data_inicio, "$lte": data_fim}}},
        {"$group": {"_id": "$tipo_imposto", "total": {"$sum": "$valor_imposto"}, "count": {"$sum": 1}}}
    ]
    return await db.imposto_a_recolher.aggregate(pipeline).to_list(None)

# Impostos pendentes por período
async def get_impostos_pendentes_por_periodo(data_inicio: datetime, data_fim: datetime):
    return await db.imposto_a_recolher.find({
        "status": "pendente",
        "data_vencimento": {"$gte": data_inicio, "$lte": data_fim}
    }).to_list(None)