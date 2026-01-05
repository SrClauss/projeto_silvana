from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.faturamento_item import FaturamentoItem
from datetime import datetime
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para FaturamentoItem
async def create_faturamento_item(faturamento: FaturamentoItem):
    result = await db.faturamento_item.insert_one(faturamento.dict(by_alias=True))
    return result.inserted_id

async def get_faturamento_itens():
    return await db.faturamento_item.find().to_list(None)

async def get_faturamento_item_by_id(faturamento_id: str):
    return await db.faturamento_item.find_one({"_id": faturamento_id})

async def update_faturamento_item(faturamento_id: str, update_data: dict):
    return await db.faturamento_item.find_one_and_update(
        {"_id": faturamento_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_faturamento_item(faturamento_id: str):
    return await db.faturamento_item.delete_one({"_id": faturamento_id})

# Agregação para FaturamentoItem com saída
async def get_faturamento_item_com_saida(faturamento_id: str):
    pipeline = [
        {"$match": {"_id": faturamento_id}},
        {"$lookup": {"from": "saidas", "localField": "saida_id", "foreignField": "_id", "as": "saida"}},
        {"$unwind": {"path": "$saida", "preserveNullAndEmptyArrays": True}}
    ]
    return await db.faturamento_item.aggregate(pipeline).to_list(None)

# Faturamento por mês
async def get_faturamento_itens_por_mes(mes: int, ano: int):
    start_date = datetime(ano, mes, 1)
    if mes == 12:
        end_date = datetime(ano + 1, 1, 1)
    else:
        end_date = datetime(ano, mes + 1, 1)
    
    return await db.faturamento_item.find({
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(None)