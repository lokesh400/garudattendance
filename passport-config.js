const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');

// Configure passport-local to use User model for authentication
passport.use(new LocalStrategy(User.authenticate()));

// Serialize and deserialize user
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

module.exports = passport;
