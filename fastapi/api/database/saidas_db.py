from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.saidas import Saida
from ..models.faturamento_item import FaturamentoItem
from ..models.despesas import Despesa
from ..models.imposto_a_recolher import ImpostoARecolher
from datetime import datetime, timedelta
from fastapi import HTTPException
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# Função auxiliar para calcular estoque
async def get_estoque_atual(produto_id: str):
    pipeline = [
        {"$match": {"_id": produto_id}},
        {"$lookup": {"from": "entradas", "localField": "_id", "foreignField": "produtos_id", "as": "entradas"}},
        {"$lookup": {"from": "saidas", "localField": "_id", "foreignField": "produtos_id", "as": "saidas"}},
        {"$addFields": {
            "total_entradas": {"$sum": "$entradas.quantidade"},
            "total_saidas": {"$sum": "$saidas.quantidade"},
            "estoque": {"$subtract": ["$total_entradas", "$total_saidas"]}
        }},
        {"$project": {"estoque": 1}}
    ]
    result = await db.produtos.aggregate(pipeline).to_list(None)
    return result[0]["estoque"] if result else 0

# CRUD para Saida
async def create_saida(saida: Saida):
    # Validação: verificar estoque
    estoque = await get_estoque_atual(saida.produtos_id)
    if estoque < saida.quantidade:
        raise HTTPException(status_code=400, detail="Estoque insuficiente")
    
    result = await db.saidas.insert_one(saida.dict(by_alias=True))
    return result.inserted_id

async def get_saidas():
    return await db.saidas.find().to_list(None)

async def get_saida_by_id(saida_id: str):
    return await db.saidas.find_one({"_id": saida_id})

async def update_saida(saida_id: str, update_data: dict):
    return await db.saidas.find_one_and_update(
        {"_id": saida_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_saida(saida_id: str):
    return await db.saidas.delete_one({"_id": saida_id})

# Agregação para Saida
async def get_saida_com_produto(saida_id: str):
    pipeline = [
        {"$match": {"_id": saida_id}},
        {"$lookup": {"from": "produtos", "localField": "produtos_id", "foreignField": "_id", "as": "produto"}}
    ]
    return await db.saidas.aggregate(pipeline).to_list(None)

# Processar venda: cria faturamento e despesas se taxa
async def processar_venda(saida_id: str, modalidade_id: str, impostos_adicionais: list = None, desconto: float = 0):
    saida = await get_saida_by_id(saida_id)
    modalidade = await db.modalidade_pagamento.find_one({"_id": modalidade_id})
    if not saida or not modalidade:
        return None

    # Aplicar desconto
    valor_base = saida.get("valor_total", 0) - desconto
    if valor_base < 0:
        valor_base = 0

    # Criar faturamento
    faturamento = FaturamentoItem(
        saida_id=saida_id,
        valor=valor_base,
        justificativa=f"Venda via {modalidade['nome']}"
    )
    fat_id = await db.faturamento_item.insert_one(faturamento.dict(by_alias=True))

    # Calcular taxa
    if modalidade["tipo_taxa"] == "percentual":
        taxa = valor_base * (modalidade["valor_taxa"] / 100)
    else:
        taxa = modalidade["valor_taxa"]

    if taxa > 0:
        despesa = Despesa(
            descricao=f"Taxa {modalidade['nome']} para venda {saida_id}",
            valor=taxa
        )
        await db.despesas.insert_one(despesa.dict(by_alias=True))

    # Impostos da modalidade
    impostos = modalidade.get("impostos", [])
    if impostos_adicionais:
        impostos.extend(impostos_adicionais)

    # Criar imposto a recolher para cada imposto
    for imp in impostos:
        valor_imposto = valor_base * (imp["percentual"] / 100)
        imposto = ImpostoARecolher(
            saida_id=saida_id,
            valor_imposto=valor_imposto,
            tipo_imposto=imp["tipo"],
            data_vencimento=datetime.utcnow() + timedelta(days=30)
        )
        await db.imposto_a_recolher.insert_one(imposto.dict(by_alias=True))

    return {"faturamento_id": fat_id.inserted_id}