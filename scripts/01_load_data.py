import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
from tqdm import tqdm

# Завантажуємо рядок підключення з файлу .env
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")

# Назви бази даних та колекції
DB_NAME = "music_streaming"
COLLECTION_NAME = "tracks_raw"
CSV_FILE = "spotify_tracks.csv"

def main():
    if not MONGO_URI:
        print("❌ Помилка: MONGO_URI не знайдено у файлі .env")
        return

    print("🔌 Підключення до MongoDB Atlas...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    print(f"📖 Зчитування даних з {CSV_FILE}...")
    try:
        df = pd.read_csv(CSV_FILE)
    except FileNotFoundError:
        print(f"❌ Помилка: Файл {CSV_FILE} не знайдено в папці проєкту.")
        return

    # Перетворюємо таблицю pandas на список словників (документів BSON)
    records = df.to_dict(orient="records")
    total_records = len(records)
    
    print(f"🚀 Знайдено {total_records} треків. Починаємо завантаження батчами...")
    
    # Видаляємо старі дані, якщо скрипт запускається не вперше
    collection.delete_many({})
    
    # Завантаження пакетами по 10 000 записів
    batch_size = 10000
    for i in tqdm(range(0, total_records, batch_size), desc="Завантаження"):
        batch = records[i:i+batch_size]
        collection.insert_many(batch)
        
    print(f"✅ Успішно завантажено {collection.count_documents({})} документів у колекцію {COLLECTION_NAME}!")

if __name__ == "__main__":
    main()