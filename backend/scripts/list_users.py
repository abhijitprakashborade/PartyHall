import psycopg2

conn = psycopg2.connect(
    dbname='partyhub_db', user='partyhub',
    password='partyhub_pass', host='127.0.0.1', port=5433,
)
cur = conn.cursor()
cur.execute("SELECT email, full_name, role, is_active FROM users ORDER BY role, email;")
for r in cur.fetchall():
    print(f"{r[1]:<25} {r[0]:<35} role={r[2]:<12} active={r[3]}")
cur.close()
conn.close()
