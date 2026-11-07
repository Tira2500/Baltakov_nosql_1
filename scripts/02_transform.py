import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

# Підключення до бази
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
DB_NAME = "music_streaming"  # Використовуємо базу, куди завантажили tracks_raw

def main():
    if not MONGO_URI:
        print("❌ Помилка: MONGO_URI не знайдено.")
        return

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    print("⏳ Запуск повного агрегаційного пайплайну трансформації...")
    
    pipeline = [
        {
            # 1. Розбиваємо артистів, групуємо audio_features та обчислюємо нові поля
            "$addFields": {
                # Масив артистів
                "artists": {
                    "$map": {
                        "input": {
                            "$split": [
                                {"$toString": {"$ifNull": ["$artists", ""]}},
                                ";"
                            ]
                        },
                        "as": "artist",
                        "in": {"$trim": {"input": "$$artist"}}
                    }
                },
                # Вкладений об'єкт аудіохарактеристик
                "audio_features": {
                    "danceability": "$danceability",
                    "energy": "$energy",
                    "key": "$key",
                    "loudness": "$loudness",
                    "mode": "$mode",
                    "speechiness": "$speechiness",
                    "acousticness": "$acousticness",
                    "instrumentalness": "$instrumentalness",
                    "liveness": "$liveness",
                    "valence": "$valence",
                    "tempo": "$tempo",
                    "time_signature": "$time_signature"
                },
                # Тривалість у секундах (закруглена до 1 знака)
                "duration_sec": {
                    "$round": [{"$divide": ["$duration_ms", 1000]}, 1]
                },
                # Категорія популярності
                "popularity_tier": {
                    "$switch": {
                        "branches": [
                            {"case": {"$gte": ["$popularity", 70]}, "then": "high"},
                            {"case": {"$gte": ["$popularity", 40]}, "then": "medium"}
                        ],
                        "default": "low"
                    }
                }
            }
        },
        {
            # 2. Очищення зайвих полів, які винесені в audio_features
            "$unset": [
                "danceability", "energy", "key", "loudness", "mode", 
                "speechiness", "acousticness", "instrumentalness", 
                "liveness", "valence", "tempo", "time_signature", "Unnamed: 0"
            ]
        },
        {
            # 3. Збереження результату в колекцію 'tracks' ($out автоматично перезаписує її)
            "$out": "tracks"
        }
    ]
    
    # Виконання агрегації
    db.tracks_raw.aggregate(pipeline)
    
    # Перевірка результатів
    total_count = db.tracks.count_documents({})
    sample_doc = db.tracks.find_one({}, {"_id": 0})
    
    print(f"✅ Успішно створено колекцію 'tracks'!")
    print(f"📊 Кількість документів у колекції: {total_count}")
    print("\n🔍 Приклад перетвореного документа:")
    print(json.dumps(sample_doc, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()