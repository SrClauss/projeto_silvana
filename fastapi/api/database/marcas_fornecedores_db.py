from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.marcas_fornecedores import MarcaFornecedor
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para MarcaFornecedor
async def create_marca_fornecedor(marca: MarcaFornecedor):
    result = await db.marcas_fornecedores.insert_one(marca.dict(by_alias=True))
    return result.inserted_id

async def get_marcas_fornecedores():
    return await db.marcas_fornecedores.find().to_list(None)

async def get_marca_fornecedor_by_id(marca_id: str):
    return await db.marcas_fornecedores.find_one({"_id": marca_id})

async def update_marca_fornecedor(marca_id: str, update_data: dict):
    return await db.marcas_fornecedores.find_one_and_update(
        {"_id": marca_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_marca_fornecedor(marca_id: str):
    return await db.marcas_fornecedores.delete_one({"_id": marca_id})