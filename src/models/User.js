const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  stravaId: { type: String, required: true, unique: true },
  firstname: String,
  lastname: String,
  profile: String,
  joinedAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
