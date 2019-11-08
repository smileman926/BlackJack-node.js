'use strict';

var express	 	= require('express');
var router 		= express.Router();
var passport 	= require('passport');
var nodemailer = require('nodemailer');
var User = require('../models/user');
var Room = require('../models/room');
var async = require('async');
var crypto = require('crypto');
// Home page
router.get('/', function(req, res, next) {
	// If user is already logged in, then redirect to rooms page
	if(req.isAuthenticated()){
		res.redirect('/rooms');
	}
	else{
		res.render('login', {
			success: req.flash('success')[0],
			errors: req.flash('error'), 
			showRegisterForm: req.flash('showRegisterForm')[0]
		});
	}
});

// Login
router.post('/login', passport.authenticate('local', { 
	successRedirect: '/rooms', 
	failureRedirect: '/',
	failureFlash: true
}));

// Register via username and password
router.post('/register', function(req, res, next) {
	console.log(req.body);
	var credentials = {'username': req.body.username, 'password': req.body.password ,'email':req.body.email};

	if(credentials.username === '' || credentials.password === ''||credentials.email===''){
		req.flash('error', 'Missing credentials');
		req.flash('showRegisterForm', true);
		res.redirect('/');
	}else{

		// Check if the username already exists for non-social account
		User.findOne({$or:[{'username': new RegExp('^' + req.body.username + '$', 'i'), 'socialId': null},{'email':req.body.email}]}, function(err, user){
			if(err) throw err;
			if(user){
				req.flash('error', 'Username or Email already exists.');
				req.flash('showRegisterForm', true);
				res.redirect('/');
			}else{
				User.create(credentials, function(err, newUser){
					if(err) throw err;
					req.flash('success', 'Your account has been created. Please log in.');
					res.redirect('/');
				});
			}
		});
	}
});
router.get('/forgot', function(req, res) {
	res.render('forgot', {
		success: req.flash('success'),
		errors: req.flash('error')
	});
  });
// Social Authentication routes
// 1. Login via Facebook
router.get('/auth/facebook', passport.authenticate('facebook',{scope:['email']}));
router.get('/auth/facebook/callback', passport.authenticate('facebook', {
		successRedirect: '/rooms',
		failureRedirect: '/',
		failureFlash: true
}));

// 2. Login via Twitter
router.get('/auth/twitter', passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/twitter/callback', passport.authenticate('google', {
		successRedirect: '/rooms',
		failureRedirect: '/',
		failureFlash: true
}));

// Rooms
router.get('/rooms', [User.isAuthenticated, function(req, res, next) {
	// Room.find(function(err, rooms){
		// if(err) throw err;
		// console.log(req.user);
		User.findMoney(req.user,function(err,money)
		{
			if(err) throw err;
			// console.log(req.user);
		
			res.render('blackjack',{user:req.user});
			// console.log(req.user);
		});
	
	// });
}]);


// Chat Room 
router.get('/chat/:id', [User.isAuthenticated, function(req, res, next) {
	var roomId = req.params.id;
	Room.findById(roomId, function(err, room){
		if(err) throw err;
		if(!room){
			return next(); 
		}
		res.render('chatroom', { user: req.user, room: room });
	});
	
}]);
router.post('/forgot', function(req, res, next) {
	async.waterfall([
	  function(done) {
		crypto.randomBytes(20, function(err, buf) {
		  var token = buf.toString('hex');
		  done(err, token);
		});
	  },
	  function(token, done) {
		User.findOne({ 'email': req.body.email,'socialId':null }, function(err, user) {
		  if (!user) {
			req.flash('errors', 'No account with that email address exists.');
			return res.render('forgot',{errors:req.flash('errors')});
		  }
  
		  user.resetPasswordToken = token;
		  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
		  user.save(function(err) {
			done(err, token, user);
		  });
		});
	  },
	  function(token, user, done) {
		var smtpTransport = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true, // use SSL
			auth: {
				user: 'smileman926@gmail.com',
				pass: 'Youngdragon123!@#'
			}
		});
		var mailOptions = {
		  to: user.email,
		  from: '"BlackJack"smileman926@gmail.com',
		  subject: ' Password Reset',
		  text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
			'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
			'http://' + req.headers.host + '/reset/' + token + '\n\n' +
			'If you did not request this, please ignore this email and your password will remain unchanged.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
		  req.flash('errors', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
		  done(err, 'done');
		});
	  }
	], function(err) {
	  if (err) return next(err);
	  res.redirect('/forgot');
	});
  });
// Logout
router.get('/reset/:token', function(req, res) {
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
	  if (!user) {
		req.flash('errors', 'Password reset token is invalid or has expired.');
		return res.redirect('/forgot');
	  }
	  res.render('reset', {
		user: req.user,errors:req.flash('errors'),token:req.params.token
	  });
	});
  });
 router.post('/reset/:token', function(req, res) {
	 console.log("POST__________");
	async.waterfall([
	  function(done) {
		User.findOne({ resetPasswordToken: req.params.token }, function(err, user) {
		  if (!user) {
			req.flash('errors', 'Password reset token is invalid or has expired.');
			 res.render('forgot',{errors:req.flash('errors')});
		  }
  
		  user.password = req.body.password;
		  user.resetPasswordToken = undefined;
		  user.resetPasswordExpires = undefined;
		  
		  user.save(function(err) {
			req.logIn(user, function(err) {
			  done(err, user);
			});
		  });
		});
	  },
	  function(user, done) {
	
	
		
		var smtpTransport = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true, // use SSL
			auth: {
				user: 'smileman926@gmail.com',
				pass: 'Youngdragon123!@#'
			}
		});
		var mailOptions = {
		  to: user.email,
		  from: '"BlackJack"smileman926@gmail.com',
		  subject: ' Password Reset',
		  text: 'Hello,\n\n' +
		  'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
		};
	
		smtpTransport.sendMail(mailOptions, function(err) {
		  req.flash('success', 'Success! Your password has been changed.');
		  done(err);
		});
	  }
	], function(err) {
	  res.redirect('/');
	});
  });
router.get('/logout', function(req, res, next) {
	// remove the req.user property and clear the login session
	req.logout();

	// destroy session data
	req.session = null;

	// redirect to homepage
	res.redirect('/');
});

module.exports = router;