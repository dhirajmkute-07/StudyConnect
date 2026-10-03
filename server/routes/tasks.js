const express = require('express');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, subject, dueDate, priority, status } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const task = await Task.create({
      userId: req.user.userId,
      title: title.trim(),
      description: description || '',
      subject: subject || '',
      dueDate: dueDate || null,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      status: ['pending', 'in_progress', 'completed'].includes(status) ? status : 'pending'
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const allowed = ['title', 'description', 'subject', 'dueDate', 'priority', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.status === 'completed' && task.status !== 'completed') {
      updates.completedAt = new Date();
    } else if (updates.status && updates.status !== 'completed') {
      updates.completedAt = null;
    }

    const updated = await Task.findOneAndUpdate(
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
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
