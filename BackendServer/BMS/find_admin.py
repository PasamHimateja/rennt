import os

def find_file(name, path):
    for root, dirs, files in os.walk(path):
        if name in files:
            print(os.path.join(root, name))

find_file('admin_services.py', r'C:\Users\pasam\OneDrive\Desktop\intern-otms\BackendServer')
find_file('admin_service.py', r'C:\Users\pasam\OneDrive\Desktop\intern-otms\BackendServer')
