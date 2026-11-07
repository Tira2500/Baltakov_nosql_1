// Підключення до бази даних
use('music_streaming');

// ==============================================================================
// Частина 3. Завдання 1: Аналіз запиту та індексація
// ==============================================================================

print("\n📊 --- 1. Аналіз запиту ДО створення індексу ---");

// Використовуємо "executionStats", щоб MongoDB реально виконала запит і заміряла час
const explainBefore = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

print("Час виконання (мс): " + explainBefore.executionStats.executionTimeMillis);
print("Переглянуто документів: " + explainBefore.executionStats.totalDocsExamined);
print("Використаний індекс: " + (explainBefore.queryPlanner.winningPlan.indexName || "COLLSCAN (Повне сканування)"));


print("\n🛠 --- 2. Створення композитного індексу ---");
// Правило ESR (Equality, Sort, Range):
// 1. Equality (точний збіг): track_genre
// 2. Sort (сортування): popularity
// 3. Range (діапазон): audio_features.danceability

db.tracks.createIndex({
  track_genre: 1,
  popularity: -1,
  "audio_features.danceability": 1
});
print("Індекс успішно створено!");


print("\n🚀 --- 3. Аналіз запиту ПІСЛЯ створення індексу ---");

const explainAfter = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

print("Час виконання (мс): " + explainAfter.executionStats.executionTimeMillis);
print("Переглянуто документів: " + explainAfter.executionStats.totalDocsExamined);
print("Використаний індекс: " + explainAfter.queryPlanner.winningPlan.inputStage.indexName);

// ==============================================================================
// Частина 3. Завдання 2: Індекс для інших полів (Фонова музика)
// ==============================================================================

print("\n🛠 --- 1. Створення індексу для фонової музики ---");
// Правило ESR (Equality, Sort, Range):
// 1. Точний збіг (Equality): explicit
// 2. Діапазони (Range): instrumentalness, speechiness

db.tracks.createIndex({
  explicit: 1,
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1
});
print("Складений індекс успішно створено!");

print("\n🚀 --- 2. Аналіз запиту ПІСЛЯ створення індексу ---");

// Виконуємо пошук за вказаними полями
const explainBg = db.tracks.find({
  explicit: false,
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 }
}).explain("executionStats");

print("Час виконання (мс): " + explainBg.executionStats.executionTimeMillis);
print("Переглянуто документів: " + explainBg.executionStats.totalDocsExamined);

// Шукаємо назву індексу (вона може бути на рівні IXSCAN під стадією FETCH)
const stage = explainBg.queryPlanner.winningPlan.inputStage;
const indexName = stage.indexName || (stage.inputStage && stage.inputStage.indexName) || "COLLSCAN";
print("Використаний індекс: " + indexName);