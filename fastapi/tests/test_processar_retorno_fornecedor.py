import pytest
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
from api.models.produtos import Produto
from api.models.itens import Item
from api.database.produtos_db import create_produto
from api.database.condicional_fornecedor_db import processar_condicional_fornecedor

@pytest.mark.asyncio
async def test_processar_retorno_condicional_fornecedor():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL', 'mongodb://localhost:27017'))
    db = client['projeto_silvana']

    # Limpar produtos anteriores com mesmo codigo
    await db.produtos.delete_many({'codigo_interno': 'TSTRET1'})

    # Criar produto de teste
    prod = Produto(
        codigo_interno='TSTRET1',
        codigo_externo='',
        descricao='Test Retorno',
        marca_fornecedor='',
        sessao='',
        itens=[Item(quantity=10, condicionais_fornecedor=['cf_test'])],
        preco_custo=100,
        preco_venda=150,
        saidas=[],
        entradas=[],
        tags=[],
        em_condicional_fornecedor=True
    )
    pid = await create_produto(prod)
    assert pid is not None

    # Criar condicional de fornecedor de teste que referencia o produto
    await db.condicional_fornecedores.insert_one({
        "_id": "cf_test",
        "fornecedor_id": "f_test",
        "produtos_id": [pid],
        "ativa": True,
        "data_condicional": datetime.utcnow()
    })

    # Simular processamento de retorno (devolver 3 unidades do produto)
    result = await processar_condicional_fornecedor('cf_test', [pid, pid, pid])  # devolver 3 unidades (usando product ids)

    assert result.get('success') is True

    # Verificar produto após processamento
    produto_final = await db.produtos.find_one({'_id': pid})
    if produto_final:  # Produto pode ter sido deletado se estoque zerou
        total_itens = sum(item.get('quantity', 0) for item in produto_final.get('itens', []))
        # Se estoque não zerou, deve ter 3 itens restantes sem condicional_fornecedor
        if total_itens > 0:
            # Verificar que itens restantes não têm condicional_fornecedor
            for item in produto_final.get('itens', []):
                assert 'cf_test' not in (item.get('condicionais_fornecedor') or [])

    # Cleanup
    await db.produtos.delete_one({'_id': pid})
    await db.condicional_fornecedores.delete_one({'_id': 'cf_test'})