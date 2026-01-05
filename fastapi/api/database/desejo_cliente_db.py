from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.desejo_cliente import DesejoCliente
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para DesejoCliente
async def create_desejo_cliente(desejo: DesejoCliente):
    result = await db.desejos_clientes.insert_one(desejo.dict(by_alias=True))
    return result.inserted_id

async def get_desejos_clientes():
    return await db.desejos_clientes.find().to_list(None)

async def get_desejo_cliente_by_id(desejo_id: str):
    return await db.desejos_clientes.find_one({"_id": desejo_id})

async def update_desejo_cliente(desejo_id: str, update_data: dict):
    return await db.desejos_clientes.find_one_and_update(
        {"_id": desejo_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_desejo_cliente(desejo_id: str):
    return await db.desejos_clientes.delete_one({"_id": desejo_id})

# Desejos por cliente
async def get_desejos_by_cliente(cliente_id: str):
    return await db.desejos_clientes.find({"cliente_id": cliente_id}).to_list(None)