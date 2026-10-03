const express = require('express');
const Subject = require('../models/Subject');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET all subjects
router.get('/', authenticate, async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user.userId }).sort({ createdAt: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create subject
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, code, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Subject name is required' });

    const subject = await Subject.create({
      userId: req.user.userId,
      name: name.trim(),
      code: code || '',
      color: color || '#6366f1',
      chapters: []
    });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update subject
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, code, color } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (code !== undefined) updates.code = code;
    if (color !== undefined) updates.color = color;

    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: updates },
      { new: true }
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE subject
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST add chapter
router.post('/:id/chapters', authenticate, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Chapter title is required' });

    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    subject.chapters.push({ title: title.trim(), completed: false });
    await subject.save();
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update chapter
router.put('/:id/chapters/:chapterId', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const chapter = subject.chapters.id(req.params.chapterId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const { title, completed } = req.body;
    if (title !== undefined) chapter.title = title.trim();
    if (completed !== undefined) chapter.completed = completed;

    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE chapter
router.delete('/:id/chapters/:chapterId', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    subject.chapters.pull(req.params.chapterId);
    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
