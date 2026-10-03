const express = require('express');
const Test = require('../models/Test');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const tests = await Test.find({ userId: req.user.userId }).sort({ date: 1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, subject, date, time, totalMarks, obtainedMarks, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Test name is required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const test = await Test.create({
      userId: req.user.userId,
      name: name.trim(),
      subject: subject.trim(),
      date, time: time || '',
      totalMarks: totalMarks !== undefined && totalMarks !== '' ? Number(totalMarks) : null,
      obtainedMarks: obtainedMarks !== undefined && obtainedMarks !== '' ? Number(obtainedMarks) : null,
      notes: notes || ''
    });
    res.status(201).json(test);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const allowed = ['name', 'subject', 'date', 'time', 'totalMarks', 'obtainedMarks', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = ['totalMarks', 'obtainedMarks'].includes(key)
          ? (req.body[key] === '' ? null : Number(req.body[key]))
          : req.body[key];
      }
    }

    const updated = await Test.findOneAndUpdate(
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
    const test = await Test.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json({ message: 'Test deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
