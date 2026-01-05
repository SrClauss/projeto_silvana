from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.condicional_fornecedor import CondicionalFornecedor
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para CondicionalFornecedor
async def create_condicional_fornecedor(condicional: CondicionalFornecedor):
    result = await db.condicional_fornecedores.insert_one(condicional.dict(by_alias=True))
    return result.inserted_id

async def get_condicional_fornecedores():
    return await db.condicional_fornecedores.find().to_list(None)

async def get_condicional_fornecedor_by_id(condicional_id: str):
    return await db.condicional_fornecedores.find_one({"_id": condicional_id})

async def update_condicional_fornecedor(condicional_id: str, update_data: dict):
    return await db.condicional_fornecedores.find_one_and_update(
        {"_id": condicional_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_condicional_fornecedor(condicional_id: str):
    return await db.condicional_fornecedores.delete_one({"_id": condicional_id})

# Agregação para CondicionalFornecedor completa
async def get_condicional_fornecedor_completa(condicional_id: str):
    pipeline = [
        {"$match": {"_id": condicional_id}},
        {"$lookup": {"from": "marcas_fornecedores", "localField": "fornecedor_id", "foreignField": "_id", "as": "fornecedor"}},
        {"$unwind": {"path": "$fornecedor", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "produtos", "localField": "produtos_id", "foreignField": "_id", "as": "produtos"}}
    ]
    return await db.condicional_fornecedores.aggregate(pipeline).to_list(None)

# Produtos em condicional fornecedor
async def get_produtos_em_condicional_fornecedor():
    pipeline = [
        {"$unwind": "$produtos_id"},
        {"$group": {"_id": "$produtos_id"}},
        {"$lookup": {"from": "produtos", "localField": "_id", "foreignField": "_id", "as": "produto"}},
        {"$unwind": "$produto"},
        {"$replaceRoot": {"newRoot": "$produto"}}
    ]
    return await db.condicional_fornecedores.aggregate(pipeline).to_list(None)

# Processar baixa de condicional fornecedor
async def processar_baixa_condicional_fornecedor(condicional_id: str, produtos_devolvidos: list):
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return None

    total_devolvidos = sum(p.get("quantidade", 0) for p in produtos_devolvidos)
    if total_devolvidos > condicional.get("quantidade_max_devolucao", 0):
        return {"error": "Quantidade de devolução excede o limite máximo"}

    # Aqui poderia processar entradas ou saídas, mas por simplicidade, apenas validar
    # Atualizar status ou algo similar
    await update_condicional_fornecedor(condicional_id, {"status": "baixado"})  # Assumindo campo status

    return {"status": "baixa processada"}