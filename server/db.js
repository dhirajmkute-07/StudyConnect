const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

const defaultDB = {
  users: [],
  profiles: [],
  subjects: [],
  timetable: [],
  attendance: [],
  tasks: [],
  tests: [],
  notifications: []
};

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeDB(defaultDB);
      return JSON.parse(JSON.stringify(defaultDB));
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(raw);
    // Ensure all collections exist
    for (const key of Object.keys(defaultDB)) {
      if (!data[key]) data[key] = [];
    }
    return data;
  } catch (e) {
    console.error('DB read error:', e.message);
    return JSON.parse(JSON.stringify(defaultDB));
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('DB write error:', e.message);
    return false;
  }
}

function getCollection(name) {
  const db = readDB();
  return db[name] || [];
}

function saveCollection(name, data) {
  const db = readDB();
  db[name] = data;
  return writeDB(db);
}

function findOne(collection, predicate) {
  return getCollection(collection).find(predicate) || null;
}

function findMany(collection, predicate) {
  const items = getCollection(collection);
  return predicate ? items.filter(predicate) : items;
}

function insertOne(collection, item) {
  const db = readDB();
  if (!db[collection]) db[collection] = [];
  db[collection].push(item);
  writeDB(db);
  return item;
}

function updateOne(collection, predicate, updates) {
  const db = readDB();
  if (!db[collection]) db[collection] = [];
  const idx = db[collection].findIndex(predicate);
  if (idx === -1) return null;
  db[collection][idx] = { ...db[collection][idx], ...updates };
  writeDB(db);
  return db[collection][idx];
}

function deleteOne(collection, predicate) {
  const db = readDB();
  if (!db[collection]) return false;
  const idx = db[collection].findIndex(predicate);
  if (idx === -1) return false;
  db[collection].splice(idx, 1);
  writeDB(db);
  return true;
}

module.exports = {
  readDB, writeDB, getCollection, saveCollection,
  findOne, findMany, insertOne, updateOne, deleteOne
};
