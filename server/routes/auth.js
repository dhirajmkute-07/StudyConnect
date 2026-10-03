const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword)
      return res.status(400).json({ error: 'All fields are required' });
    if (password !== confirmPassword)
      return res.status(400).json({ error: 'Passwords do not match' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email: email.toLowerCase(), passwordHash });

    // Create default profile
    await Profile.create({
      userId: user._id,
      fullName: user.fullName,
      email: user.email
    });

    // Welcome notification
    await Notification.create({
      userId: user._id,
      title: 'Welcome to StudyConnect! 🎉',
      message: 'Your account is ready. Start by adding your subjects and setting up your timetable.',
      type: 'welcome'
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email, fullName: user.fullName },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Sign In
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { userId: user._id, email: user.email, fullName: user.fullName },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Server error during signin' });
  }
});

// Verify token / get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, fullName: user.fullName, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
