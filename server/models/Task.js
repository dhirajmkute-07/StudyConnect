const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  subject:     { type: String, default: '' },
  dueDate:     { type: String, default: null },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status:      { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
