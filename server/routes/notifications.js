const express = require('express');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all read — must come before /:id routes to avoid param conflict
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { read: true } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear all notifications for user
router.delete('/', authenticate, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.userId });
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
