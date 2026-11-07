// Підключення до бази даних
use('music_streaming');

// ==============================================================================
// Завдання 1. Треки для вечірки
// ==============================================================================

print("\n🎉 --- Завдання 1: Треки для вечірки ---");

// Зберігаємо результат у змінну, обмежуємо вивід до 5 штук і перетворюємо на масив
const partyTracks = db.tracks.find(
  {
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    "duration_sec": { $gte: 180, $lte: 300 }
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1,
    duration_sec: 1
  }
).limit(5).toArray(); 

// Друкуємо результат у термінал
printjson(partyTracks);

// ==============================================================================
// Завдання 2. Виконавці, у яких усі треки популярні
// ==============================================================================

print("\n🌟 --- Завдання 2: Топ-20 стабільно популярних артистів ---");

const popularArtists = db.tracks.aggregate([
  { 
    // Крок 1: Розгортаємо масив артистів, щоб кожен артист отримав свій окремий документ
    $unwind: "$artists" 
  },
  { 
    // Крок 2: Групуємо за ім'ям артиста та рахуємо статистику
    $group: {
      _id: "$artists",
      total_tracks: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  { 
    // Крок 3: Фільтруємо за умовами (мінімум 3 треки, мінімальна популярність >= 60)
    $match: {
      total_tracks: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  { 
    // Крок 4: Форматуємо вивід (перейменовуємо _id на artist, округлюємо середнє до 1 знака)
    $project: {
      _id: 0,
      artist: "$_id",
      total_tracks: 1,
      min_popularity: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  { 
    // Крок 5: Сортуємо (найбільша середня популярність + найбільше треків)
    $sort: { avg_popularity: -1, total_tracks: -1 } 
  },
  { 
    // Крок 6: Беремо лише топ-20
    $limit: 20 
  }
]).toArray();

printjson(popularArtists);

// ==============================================================================
// Завдання 3. Нетипові треки (Outliers)
// ==============================================================================

// ==============================================================================
// Завдання 3. Нетипові треки (Outliers)
// ==============================================================================

print("\n🎸 --- Завдання 3: Нетипові треки з екстремальним темпом ---");

const outlierTracks = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      stdDev: { $stdDevPop: "$audio_features.tempo" },
      all_tracks: {
        $push: {
          _id: "$_id",
          track_name: "$track_name",
          popularity: "$popularity",
          artists: "$artists",
          audio_features: { tempo: "$audio_features.tempo" }
        }
      }
    }
  },
  {
    $addFields: {
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: [2, "$stdDev"] }]
      }
    }
  },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 1] }, 
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_tracks: {
        // Додаємо $slice, щоб виводити лише 3 приклади треків замість сотень
        $slice: [
          {
            $filter: {
              input: "$all_tracks",
              as: "track",
              cond: { $gt: ["$$track.audio_features.tempo", "$outlier_threshold"] }
            }
          },
          3 
        ]
      }
    }
  },
  {
    $match: {
      "outlier_tracks.0": { $exists: true }
    }
  },
  {
    $sort: { genre: 1 }
  },
  {
    $limit: 2
  }
]).toArray();

print(EJSON.stringify(outlierTracks, null, 2));

// ==============================================================================
// Завдання 4. Треки для фонової роботи
// ==============================================================================

print("\n🎧 --- Завдання 4: Треки для фонової роботи ---");

const backgroundTracks = db.tracks.find(
  {
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    "explicit": false
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    "audio_features.loudness": 1,
    "audio_features.speechiness": 1,
    "audio_features.instrumentalness": 1,
    explicit: 1
  }
).limit(5).toArray(); // Обмежуємо вивід до 5 треків, щоб не забивати термінал

printjson(backgroundTracks);