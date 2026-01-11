from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.clientes import Cliente
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para Cliente
async def create_cliente(cliente: Cliente):
    result = await db.clientes.insert_one(cliente.dict(by_alias=True))
    return result.inserted_id

async def get_clientes(q: str | None = None):
    if q:
        # case-insensitive search on nome
        regex = {"$regex": q, "$options": "i"}
        cursor = db.clientes.find({"nome": regex})
    else:
        cursor = db.clientes.find()
    return await cursor.to_list(None)

async def get_cliente_by_id(cliente_id: str):
    return await db.clientes.find_one({"_id": cliente_id})

async def update_cliente(cliente_id: str, update_data: dict):
    return await db.clientes.find_one_and_update(
        {"_id": cliente_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_cliente(cliente_id: str):
    return await db.clientes.delete_one({"_id": cliente_id})

# Agregações para Cliente
async def get_condicionais_by_cliente(cliente_id: str):
    return await db.condicional_clientes.find({"cliente_id": cliente_id}).to_list(None)

async def get_entradas_by_cliente(cliente_id: str):
    # Assumindo que entradas têm cliente_id opcional
    return await db.entradas.find({"cliente_id": cliente_id}).to_list(None)

async def get_saidas_by_cliente(cliente_id: str):
    # Assumindo que saidas têm cliente_id opcional
    return await db.saidas.find({"cliente_id": cliente_id}).to_list(None)

async def get_cliente_com_tudo(cliente_id: str):
    pipeline = [
        {"$match": {"_id": cliente_id}},
        {"$lookup": {"from": "condicional_clientes", "localField": "_id", "foreignField": "cliente_id", "as": "condicionais"}},
        {"$lookup": {"from": "entradas", "localField": "_id", "foreignField": "cliente_id", "as": "entradas"}},
        {"$lookup": {"from": "saidas", "localField": "_id", "foreignField": "cliente_id", "as": "saidas"}}
    ]
    return await db.clientes.aggregate(pipeline).to_list(None)