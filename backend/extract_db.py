import sqlite3
import json
conn = sqlite3.connect('optopick.db')
cursor = conn.cursor()
cursor.execute("SELECT id FROM companies WHERE email = 'numilog@cev.dz'")
company = cursor.fetchone()
if company:
    cursor.execute('SELECT geometry_json, routing_json FROM warehouses WHERE company_id = ?', (company[0],))
    row = cursor.fetchone()
    if row:
        geo, rtg = row
        if geo: open('geometry_numilog.json', 'w', encoding='utf-8').write(geo)
        if rtg: open('routing_numilog.json', 'w', encoding='utf-8').write(rtg)
        print('Files created')
    else: print('No warehouse found')
else: print('Company not found')
conn.close()
