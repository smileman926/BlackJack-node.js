'use strict';

var userModel = require('../database').models.user;

var create = function (data, callback){
	var newUser = new userModel(data);
	// console.log(data);
	// console.log(newUser);
	newUser.save(callback);
};

var findOne = function (data, callback){
	userModel.findOne(data, callback);
}

var findById = function (id, callback){
	userModel.findById(id, callback);
}
var updatePrice=function(username,price,callback)
{
	console.log(username);
	userModel.findByIdAndUpdate(username,{price:price},callback);
}
var chargePrice=function(id,price,callback)
{	
	console.log('chargePrice',price);
	console.log(id);
	userModel.findByIdAndUpdate(id.id,{price:price,chargePrice:'0'},callback);
}

var findMoney = function (user,callback){
	console.log('_________________________________________________________');
	console.log(user.username);
	var username=user.username;
	userModel.findOne({'username':username},function(err,user)
	{	
		console.log(username);
			if(err) {return callback(err);}
			if(!user)
			{
				return callback(err);
			}
			else
			{
				var price=user.price;
				console.log('---------------------------------------------');
				console.log(price);
				return callback(err,price);
			}


	});
}
/**
 * Find a user, and create one if doesn't exist already.
 * This method is used ONLY to find user accounts registered via Social Authentication.
 *
 */
var findOrCreate = function(data, callback){
	findOne({'socialId': data.id}, function(err, user){
		if(err) { return callback(err); }
		if(user){
			return callback(err, user);
		} else {
			console.log(data);
			var userData = {
				username: data.displayName,
				socialId: data.id,
				picture: data.photos[0].value || null,
				email:data.emails[0].value
			};

			// To avoid expired Facebook CDN URLs
			// Request user's profile picture using user id 
			// @see http://stackoverflow.com/a/34593933/6649553
			if(data.provider == "facebook" && userData.picture){
				userData.picture = "http://graph.facebook.com/" + data.id + "/picture?type=large";
			}

			create(userData, function(err, newUser){
				callback(err, newUser);
			});
		}
	});
}

/**
 * A middleware allows user to get access to pages ONLY if the user is already logged in.
 *
 */
var isAuthenticated = function (req, res, next) {
	if(req.isAuthenticated()){
		next();
	}else{
		res.redirect('/');
	}
}

module.exports = { 
	create, 
	findOne, 
	findById, 
	findOrCreate, 
	isAuthenticated,
	findMoney,
	updatePrice,
	chargePrice
};
