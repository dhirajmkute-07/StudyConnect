const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName:      { type: String, default: '' },
  email:         { type: String, default: '' },
  college:       { type: String, default: '' },
  university:    { type: String, default: '' },
  branch:        { type: String, default: '' },
  year:          { type: String, default: '' },
  section:       { type: String, default: '' },
  rollNumber:    { type: String, default: '' },
  phone:         { type: String, default: '' },
  bio:           { type: String, default: '' },
  strongSubjects:{ type: String, default: '' },
  weakSubjects:  { type: String, default: '' },
  photo:         { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
