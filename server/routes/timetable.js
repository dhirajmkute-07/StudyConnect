const express = require('express');
const Timetable = require('../models/Timetable');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

router.get('/', authenticate, async (req, res) => {
  try {
    const entries = await Timetable.find({ userId: req.user.userId }).sort({ day: 1, startTime: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { day, subject, startTime, endTime, room, faculty } = req.body;
    if (!day || !subject || !startTime || !endTime)
      return res.status(400).json({ error: 'Day, subject, start time, and end time are required' });
    if (!DAYS.includes(day))
      return res.status(400).json({ error: 'Invalid day' });
    if (startTime >= endTime)
      return res.status(400).json({ error: 'End time must be after start time' });

    const entry = await Timetable.create({
      userId: req.user.userId,
      day, subject: subject.trim(), startTime, endTime,
      room: room || '', faculty: faculty || ''
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { day, subject, startTime, endTime, room, faculty } = req.body;
    const existing = await Timetable.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    const st = startTime || existing.startTime;
    const et = endTime || existing.endTime;
    if (st >= et) return res.status(400).json({ error: 'End time must be after start time' });

    const updates = {};
    if (day !== undefined) updates.day = day;
    if (subject !== undefined) updates.subject = subject.trim();
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (room !== undefined) updates.room = room;
    if (faculty !== undefined) updates.faculty = faculty;

    const updated = await Timetable.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: updates },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const entry = await Timetable.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
