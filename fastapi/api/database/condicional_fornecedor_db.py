from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.condicional_fornecedor import CondicionalFornecedor
from ..models.saidas import Saida
from datetime import datetime, date
import os
import logging

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para CondicionalFornecedor
async def create_condicional_fornecedor(condicional: CondicionalFornecedor):
    # Converte data_condicional para datetime para compatibilidade com BSON
    condicional_dict = condicional.dict(by_alias=True)
    if 'data_condicional' in condicional_dict and isinstance(condicional_dict['data_condicional'], date):
        condicional_dict['data_condicional'] = datetime.combine(condicional_dict['data_condicional'], datetime.min.time())
    
    result = await db.condicional_fornecedores.insert_one(condicional_dict)
    return str(result.inserted_id)

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
    max_devolucao = condicional.get("quantidade_max_devolucao")
    if max_devolucao is not None and total_devolvidos > max_devolucao:
        return {"error": "Quantidade de devolução excede o limite máximo"}

    # Aqui poderia processar entradas ou saídas, mas por simplicidade, apenas validar
    # Atualizar status ou algo similar
    await update_condicional_fornecedor(condicional_id, {"status": "baixado"})  # Assumindo campo status

    return {"status": "baixa processada"}

async def adicionar_produto_condicional_fornecedor(condicional_id: str, produto_id: str, quantidade: int):
    """
    Adiciona um produto como condicional de fornecedor.
    Cria items no produto marcados com condicional_fornecedor_id.
    """
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return {"error": "Produto não encontrado"}
    
    # Cria um novo item marcado como condicional de fornecedor
    novo_item = {
        "quantity": quantidade,
        "acquisition_date": datetime.utcnow(),
        "condicional_fornecedor_id": condicional_id,
        "condicional_cliente_id": None
    }
    
    # Adiciona o item ao produto
    await db.produtos.update_one(
        {"_id": produto_id},
        {
            "$push": {"itens": novo_item},
            "$set": {"updated_at": datetime.utcnow(), "em_condicional_fornecedor": True}
        }
    )
    
    # Atualiza a lista de produtos no condicional
    if produto_id not in condicional.get("produtos_id", []):
        await db.condicional_fornecedores.update_one(
            {"_id": condicional_id},
            {"$push": {"produtos_id": produto_id}}
        )
    
    return {"success": True, "produto_id": produto_id, "quantidade": quantidade}

async def devolver_itens_condicional_fornecedor(condicional_id: str, produto_id: str, quantidade: int):
    """
    Devolve itens de um condicional de fornecedor.
    Remove os itens do produto e cria uma saída de devolução.
    """
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return {"error": "Produto não encontrado"}
    
    # Encontra itens deste condicional
    itens_condicional = [
        item for item in produto.get("itens", [])
        if item.get("condicional_fornecedor_id") == condicional_id
    ]
    
    quantidade_disponivel = sum(item.get("quantity", 0) for item in itens_condicional)
    
    if quantidade_disponivel < quantidade:
        return {"error": f"Quantidade insuficiente para devolução. Disponível: {quantidade_disponivel}"}
    
    # Verifica limite de devolução
    quantidade_max = condicional.get("quantidade_max_devolucao")
    if quantidade_max is not None:
        # Calcula quantos já foram devolvidos
        saidas_devolucao = await db.saidas.find({
            "produtos_id": produto_id,
            "fornecedor_id": condicional.get("fornecedor_id"),
            "tipo": "devolucao"
        }).to_list(None)
        
        total_ja_devolvido = sum(s.get("quantidade", 0) for s in saidas_devolucao)
        
        if total_ja_devolvido + quantidade > quantidade_max:
            return {"error": f"Limite de devolução excedido. Máximo: {quantidade_max}, Já devolvido: {total_ja_devolvido}"}
    
    # Remove itens FIFO do condicional
    itens_ordenados = sorted(
        itens_condicional,
        key=lambda x: x.get("acquisition_date", datetime.utcnow())
    )
    
    quantidade_restante = quantidade
    itens_atualizados = list(produto.get("itens", []))
    
    for item in itens_ordenados:
        if quantidade_restante <= 0:
            break
        
        idx = next(
            (i for i, it in enumerate(itens_atualizados) 
             if it.get("acquisition_date") == item.get("acquisition_date") and
                it.get("condicional_fornecedor_id") == condicional_id),
            None
        )
        
        if idx is None:
            continue
        
        item_quantity = itens_atualizados[idx].get("quantity", 0)
        
        if item_quantity <= quantidade_restante:
            quantidade_restante -= item_quantity
            itens_atualizados.pop(idx)
        else:
            itens_atualizados[idx]["quantity"] = item_quantity - quantidade_restante
            quantidade_restante = 0
    
    # Atualiza o produto
    remaining_cond_fornecedor = sum(item.get("quantity", 0) for item in itens_atualizados if item.get("condicional_fornecedor_id"))
    await db.produtos.update_one(
        {"_id": produto_id},
        {
            "$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow(), "em_condicional_fornecedor": remaining_cond_fornecedor > 0}
        }
    )
    
    # Cria saída de devolução
    saida = Saida(
        produtos_id=produto_id,
        fornecedor_id=condicional.get("fornecedor_id"),
        quantidade=quantidade,
        tipo="devolucao",
        data_saida=datetime.utcnow(),
        observacoes=f"Devolução de condicional {condicional_id}"
    )
    
    result = await db.saidas.insert_one(saida.dict(by_alias=True))
    
    return {
        "success": True,
        "saida_id": str(result.inserted_id),
        "quantidade_devolvida": quantidade,
        "pode_devolver_ainda": quantidade_max - total_ja_devolvido - quantidade if quantidade_max is not None else None
    }

async def get_status_devolucao_condicional_fornecedor(condicional_id: str, produto_id: str = None):
    """
    Retorna o status de devolução de um condicional fornecedor.
    Mostra quantos itens ainda podem ser devolvidos.
    """
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    quantidade_max = condicional.get("quantidade_max_devolucao")
    
    # Calcula total já devolvido
    query = {
        "fornecedor_id": condicional.get("fornecedor_id"),
        "tipo": "devolucao"
    }
    
    if produto_id:
        query["produtos_id"] = produto_id
    
    saidas_devolucao = await db.saidas.find(query).to_list(None)
    total_devolvido = sum(s.get("quantidade", 0) for s in saidas_devolucao)
    
    # Calcula total em condicional
    total_em_condicional = 0
    for prod_id in condicional.get("produtos_id", []):
        if produto_id and prod_id != produto_id:
            continue
        
        produto = await db.produtos.find_one({"_id": prod_id})
        if produto:
            for item in produto.get("itens", []):
                if item.get("condicional_fornecedor_id") == condicional_id:
                    total_em_condicional += item.get("quantity", 0)

    # Calcula total vendido originado desta condicional (procura saídas que tiveram condicional_fornecedor_id)
    vendas_condicional = await db.saidas.find({"condicional_fornecedor_id": condicional_id, "tipo": "venda"}).to_list(None)
    total_vendido = sum(s.get("quantidade", 0) for s in vendas_condicional)
    
    return {
        "condicional_id": condicional_id,
        "quantidade_max_devolucao": quantidade_max,
        "quantidade_devolvida": total_devolvido,
        "quantidade_pode_devolver": quantidade_max - total_devolvido if quantidade_max is not None else None,
        "quantidade_em_condicional": total_em_condicional,
        "quantidade_vendida": total_vendido
    }


# Função auxiliar: cria uma condicional e vários produtos associados em lote
async def create_condicional_with_produtos(condicional_data: dict, produtos: list):
    """
    Cria uma condicional fornecedor e insere múltiplos produtos associados em uma única operação lógica.
    Retorna (condicional_id, [produto_ids]) em caso de sucesso. Em caso de erro, tenta rollback das inserções parciais.
    """

    print("create_condicional_with_produtos called")
    print("Condicional data:", condicional_data)
    print("Produtos count:", len(produtos or []))

    print("primeiro produto:", produtos[0] if produtos else "nenhum produto")
    inserted_produto_ids = []
    condicional_id = None
    logging.info('create_condicional_with_produtos called')
    logging.info('Condicional data: %s', condicional_data)
    logging.info('Produtos count: %d', len(produtos or []))
    try:
        # Criar condicional
        from ..models.condicional_fornecedor import CondicionalFornecedor as CFModel
        cf = CFModel(**condicional_data)
        condicional_id = await create_condicional_fornecedor(cf)
        logging.info('Created condicional_id: %s', condicional_id)

        # Inserir produtos com referencia a condicional
        from ..models.produtos import Produto as ProdutoModel
        # import create_produto localmente to avoid circular imports at module load
        from ..database.produtos_db import create_produto
        for idx, prod in enumerate(produtos):
            logging.info('Processing produto %d: %s', idx, prod.get('codigo_interno') if isinstance(prod, dict) else str(prod))
            # Garantir que itens têm condicional_fornecedor_id
            itens = prod.get('itens') or []
            if not itens:
                # cria um item default
                itens = [{'quantity': 1}]
            # marcar itens com condicional id
            itens = [dict(**itm, condicional_fornecedor_id=condicional_id) for itm in itens]
            prod['itens'] = itens
            # garantir campos obrigatórios que o modelo pode esperar
            prod.setdefault('entradas', [])
            prod.setdefault('saidas', [])
            # criar produto (usa a lógica existente que normaliza tags/entradas)
            produto_obj = ProdutoModel(**prod)
            produto_id = await create_produto(produto_obj)
            logging.info('Inserted produto_id: %s', str(produto_id))
            inserted_produto_ids.append(produto_id)

        # Atualizar condicional com os produtos criados
        await db.condicional_fornecedores.update_one(
            {"_id": condicional_id},
            {"$set": {"produtos_id": inserted_produto_ids, "updated_at": datetime.utcnow()}}
        )
        logging.info('Updated condicional with produtos_id')

        return {"condicional_id": condicional_id, "produto_ids": inserted_produto_ids}
    except Exception as e:
        # Em caso de erro, tentar rollback: remover produtos inseridos e a condicional criada
        try:
            if inserted_produto_ids:
                await db.produtos.delete_many({"_id": {"$in": inserted_produto_ids}})
            if condicional_id:
                await db.condicional_fornecedores.delete_one({"_id": condicional_id})
        except Exception:
            logging.exception('Error during rollback after create_condicional_with_produtos failure')
            pass
        raise e




async def listar_produtos_em_condicional_fornecedor(condicional_id: str):
    """
    Lista todos os produtos associados a um condicional de fornecedor específico.
    """
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    produtos = []
    for prod_id in condicional.get("produtos_id", []):
        produto = await db.produtos.find_one({"_id": prod_id})
        if produto:
            produtos.append(produto)
    
    return produtos