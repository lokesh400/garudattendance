// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Access denied. Admin privileges required.' });
}

// Middleware to check if user is admin or verifier
function isVerifier(req, res, next) {
  if (req.isAuthenticated() && (req.user.role === 'admin' || req.user.role === 'verifier')) {
    return next();
  }
  res.status(403).json({ error: 'Access denied. Verifier or Admin privileges required.' });
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isVerifier
};
