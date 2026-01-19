"""Script de migração: converte campos antigos
`condicional_cliente_id` / `condicional_fornecedor_id` em arrays
`condicionais_cliente` / `condicionais_fornecedor` por item.

Uso:
  python3 scripts/migrate_condicionais.py --dry-run
  python3 scripts/migrate_condicionais.py --apply

O script imprime um resumo e, com --apply, aplica as mudanças.
"""
import argparse
import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def migrate(apply: bool):
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL', 'mongodb://localhost:27017'))
    db = client['projeto_silvana']

    cursor = db.produtos.find({})
    total_products = 0
    updated_products = 0
    total_items_examined = 0
    total_items_changed = 0

    async for prod in cursor:
        total_products += 1
        items = prod.get('itens', []) or []
        new_items = []
        changed = False
        for it in items:
            total_items_examined += 1
            it_copy = dict(it)
            # Normalize existing (handle old single-id fields)
            if 'condicional_cliente_id' in it_copy and it_copy.get('condicional_cliente_id'):
                it_copy['condicionais_cliente'] = [it_copy.get('condicional_cliente_id')]
                del it_copy['condicional_cliente_id']
                changed = True
                total_items_changed += 1
            else:
                # ensure field exists
                it_copy.setdefault('condicionais_cliente', [])

            if 'condicional_fornecedor_id' in it_copy and it_copy.get('condicional_fornecedor_id'):
                it_copy['condicionais_fornecedor'] = [it_copy.get('condicional_fornecedor_id')]
                del it_copy['condicional_fornecedor_id']
                changed = True
                total_items_changed += 1
            else:
                it_copy.setdefault('condicionais_fornecedor', [])

            new_items.append(it_copy)

        if changed:
            updated_products += 1
            print(f"Product {prod.get('_id')} needs update (items changed)")
            if apply:
                await db.produtos.update_one({'_id': prod['_id']}, {'$set': {'itens': new_items}})

    print('--- Summary ---')
    print(f'Total products scanned: {total_products}')
    print(f'Total items examined: {total_items_examined}')
    print(f'Total items changed: {total_items_changed}')
    print(f'Products to update: {updated_products}' if not apply else f'Products updated: {updated_products}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Migração de condicional_ids -> condicionais arrays')
    parser.add_argument('--apply', action='store_true', help='Apply changes to DB')
    args = parser.parse_args()
    asyncio.run(migrate(args.apply))
