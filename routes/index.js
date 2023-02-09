var express = require('express');
const cors = require('cors')
var router = express.Router();
var User = require('../models/user')

let secret
try {
  secret = require('../secret')
} catch (err) {}

const CORS_WHITELIST = [
    // Favor to friends :)
    'http://rollcall.audio',
    'https://rollcall.audio'
]
  
router.get('/', function (req, res, next) {
	return res.render('index.ejs');
});


router.post('/', function(req, res, next) {
	console.log(req.body);
	var personInfo = req.body;


	if(!personInfo.email || !personInfo.username || !personInfo.password || !personInfo.passwordConf){
		res.send();
	} else {
		if (personInfo.password == personInfo.passwordConf) {

			User.findOne({email:personInfo.email},function(err,data){
				if(!data){
					var c;
					User.findOne({},function(err,data){

						if (data) {
							console.log("if");
							c = data.unique_id + 1;
						}else{
							c=1;
						}

						var newPerson = new User({
							unique_id:c,
							email:personInfo.email,
							username: personInfo.username,
							password: personInfo.password,
							passwordConf: personInfo.passwordConf
						});

						newPerson.save(function(err, Person){
							if(err)
								console.log(err);
							else
								console.log('Success');
						});

					}).sort({_id: -1}).limit(1);
					res.send({"Success":"You are regestered,You can login now."});
				}else{
					res.send({"Success":"Email is already used."});
				}

			});
		}else{
			res.send({"Success":"password is not matched"});
		}
	}
});

router.get('/login', function (req, res, next) {
	return res.render('login.ejs');
});

router.post('/login', function (req, res, next) {
	console.log(req.body);
	User.findOne({email:req.body.email},function(err,data){
		if(data){
			
			if(data.password==req.body.password){
				//console.log("Done Login");
				req.session.userId = data.unique_id;
				//console.log(req.session.userId);
				res.send({"Success":"Success!"});
				
			}else{
				res.send({"Success":"Wrong password!"});
			}
		}else{
			res.send({"Success":"This Email Is not regestered!"});
		}
	});
});

router.get('/profile', function (req, res, next) {
	console.log("profile");
	User.findOne({unique_id:req.session.userId},function(err,data){
		console.log("data");
		console.log(data);
		if(!data){
			res.redirect('/');
		}else{
			//console.log("found");
			return res.render('data.ejs', {"name":data.username,"email":data.email});
		}
	});
});

router.get('/files', function (req, res) {
    console.log("files")
    User.findOne({unique_id:req.session.userId},function(err,data){
		console.log("data");
		console.log(data);
		if(!data){
			res.redirect('/');
		}else{
			//console.log("found");
            res.render('files', {
              title: 'Instant.io - Streaming file transfer over WebTorrent'
            })
			// return res.render('data.ejs', {"name":data.username,"email":data.email});
		}
	});

  })
  
  // WARNING: This is *NOT* a public endpoint. Do not depend on it in your app.
router.get('/__rtcConfig__', cors({
    origin: function (origin, cb) {
      const allowed = CORS_WHITELIST.indexOf(origin) >= 0 ||
        /https?:\/\/localhost(:|$)/.test(origin) ||
        /https?:\/\/airtap\.local(:|$)/.test(origin)
      cb(null, allowed)
    }
  }), function (req, res) {
    // console.log('referer:', req.headers.referer, 'user-agent:', req.headers['user-agent'])
    const rtcConfig = secret.rtcConfig
  
    if (!rtcConfig) return res.status(404).send({ rtcConfig: {} })
    res.send({
      comment: 'WARNING: This is *NOT* a public endpoint. Do not depend on it in your app',
      rtcConfig: rtcConfig
    })
  })
  

router.get('/logout', function (req, res, next) {
	console.log("logout")
	if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
    	if (err) {
    		return next(err);
    	} else {
    		return res.redirect('/');
    	}
    });
}
});

router.get('/forgetpass', function (req, res, next) {
	res.render("forget.ejs");
});

router.post('/forgetpass', function (req, res, next) {
	//console.log('req.body');
	//console.log(req.body);
	User.findOne({email:req.body.email},function(err,data){
		console.log(data);
		if(!data){
			res.send({"Success":"This Email Is not regestered!"});
		}else{
			// res.send({"Success":"Success!"});
			if (req.body.password==req.body.passwordConf) {
			data.password=req.body.password;
			data.passwordConf=req.body.passwordConf;

			data.save(function(err, Person){
				if(err)
					console.log(err);
				else
					console.log('Success');
					res.send({"Success":"Password changed!"});
			});
		}else{
			res.send({"Success":"Password does not matched! Both Password should be same."});
		}
		}
	});
	
});


router.get('*', function (req, res) {
    res.status(404).render('error', {
      title: '404 Page Not Found - Instant.io',
      message: '404 Not Found'
    })
})
  

module.exports = router;