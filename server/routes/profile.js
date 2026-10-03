const express = require('express');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/me or /api/profile
router.get('/', authenticate, async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.user.userId });
    if (!profile) {
      const user = await User.findById(req.user.userId);
      profile = await Profile.create({
        userId: req.user.userId,
        fullName: user ? user.fullName : '',
        email: user ? user.email : ''
      });
    }
    res.json(profile);
  } catch (err) {
    console.error('Profile GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/profile
router.put('/', authenticate, async (req, res) => {
  try {
    const allowed = ['fullName', 'college', 'university', 'branch', 'year',
      'section', 'rollNumber', 'phone', 'bio', 'strongSubjects', 'weakSubjects'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (err) {
    console.error('Profile PUT error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/photo-base64 - store base64 encoded photo
router.post('/photo-base64', authenticate, async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ error: 'No photo data' });

    // Limit base64 size (~2MB limit for profile photo)
    if (photo.length > 2.5 * 1024 * 1024)
      return res.status(400).json({ error: 'Photo too large. Maximum 2MB.' });

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { photo } },
      { new: true, upsert: true }
    );
    res.json({ photo: profile.photo });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
