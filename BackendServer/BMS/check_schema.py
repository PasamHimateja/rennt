import sqlite3

def print_schema():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='HAC_owners'")
    row = cursor.fetchone()
    if row:
        print(row[0])
    else:
        print("Table HAC_owners not found.")
    conn.close()

if __name__ == "__main__":
    print_schema()
