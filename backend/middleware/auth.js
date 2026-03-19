const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    // 1) Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Please login.' });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token. Please login again.' });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ['admin']
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to perform this action.' 
      });
    }
    next();
  };
};