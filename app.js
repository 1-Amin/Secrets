require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const YandexStrategy = require('passport-yandex').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(session({
  secret: 'My little Secret.',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

main().catch((err) => {
  console.log(err);
});
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/regDB");
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  google_YandexID: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
  
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ google_YandexID: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

passport.use(new YandexStrategy({
  clientID: process.env.YANDEX_CLIENT_ID,
  clientSecret: process.env.YANDEX_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/yandex/secrets"
},
function(accessToken, refreshToken, profile, done) {
  console.log(profile);
  User.findOrCreate({ google_YandexID: profile.id }, function (err, user) {
    return done(err, user);
  });
}
));


app.get("/", function (req, res) {
  res.render("home");
});
//GOOGLE
app.get("/auth/google", 
  // passport.authenticate("google", {scope: ["profile"]});
  passport.authenticate('google', { scope: ['profile'] }  )
  
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });

//YANDEX
app.get("/auth/yandex", passport.authenticate('yandex'),function(req, res){

});

app.get("/auth/yandex/secrets",
passport.authenticate('yandex', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  }
);

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/login", function(req, res){
    res.render('login');
});

app.get('/secrets', function(req, res){
  if(req.isAuthenticated()){
    res.render('secrets');
  }else{
    res.redirect('/login');
  }
});

app.get('/logout', function(req, res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }
    res.redirect('/');
  })
})

app.post("/register", function (req, res) {
User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    res.redirect('/register');
  }else{
    passport.authenticate('local')(req, res, function(){
      res.redirect("/secrets")
    });
  }
});



});

app.post('/login', function(req, res){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
 req.login(user, function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate('local')(req, res, function(){
      res.redirect('/secrets'); 
    });
  }
 });    

  
});

app.listen(3000, function () {
  console.log("Sever runs on port 3000");
});
