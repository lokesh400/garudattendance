const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['admin', 'verifier'],
    default: 'verifier',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add passport-local-mongoose plugin
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
