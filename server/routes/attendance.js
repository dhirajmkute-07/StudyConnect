const express = require('express');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['present', 'absent', 'cancelled', 'not_marked'];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

// GET all attendance records for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error('Attendance GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST mark/upsert attendance
// Formula: present / (present + absent) * 100
// cancelled and not_marked are EXCLUDED from the denominator.
router.post('/', authenticate, async (req, res) => {
  try {
    const { timetableId, subject, date, status } = req.body;

    // Validate required fields
    if (!subject || !subject.trim())
      return res.status(400).json({ error: 'Subject is required' });
    if (!date)
      return res.status(400).json({ error: 'Date is required' });
    if (!status)
      return res.status(400).json({ error: 'Status is required' });
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ error: 'Invalid status. Must be: present, absent, cancelled, not_marked' });

    // Validate timetableId is a real MongoDB ObjectId before letting Mongoose touch it
    if (timetableId) {
      if (!isValidObjectId(timetableId)) {
        return res.status(400).json({ error: 'Invalid timetableId format' });
      }
      // Verify the timetable entry belongs to this user
      const ttEntry = await Timetable.findOne({ _id: timetableId, userId: req.user.userId });
      if (!ttEntry) {
        return res.status(404).json({ error: 'Timetable entry not found or not yours' });
      }
    }

    let record;
    if (timetableId) {
      // Upsert by (userId, timetableId, date) — prevents duplicates
      record = await Attendance.findOneAndUpdate(
        { userId: req.user.userId, timetableId: new mongoose.Types.ObjectId(timetableId), date },
        { $set: { subject: subject.trim(), status } },
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      // Manual entry (no timetable slot): upsert by (userId, subject, date)
      record = await Attendance.findOneAndUpdate(
        { userId: req.user.userId, timetableId: null, subject: subject.trim(), date },
        { $set: { status } },
        { new: true, upsert: true, runValidators: true }
      );
    }

    res.status(200).json(record);
  } catch (err) {
    console.error('Attendance POST error:', err.name, err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: `Invalid value for field: ${err.path}` });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update attendance status by record id
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ error: 'Invalid record id' });

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { status } },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE attendance record
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ error: 'Invalid record id' });

    const record = await Attendance.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
