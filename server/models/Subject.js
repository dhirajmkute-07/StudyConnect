const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  code:     { type: String, default: '' },
  color:    { type: String, default: '#6366f1' },
  chapters: [chapterSchema]
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
