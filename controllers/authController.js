const User = require("../models/User");
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { google } = require('googleapis');
const { validationResult } = require('express-validator')


// These id's and secrets should come from .env file.
const CLIENT_ID = '220416142491-0a1rhuohk9cbjic7n2ojdkgu83p3o6ut.apps.googleusercontent.com';
const CLEINT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04oq0MqO8kCsZCgYIARAAGAQSNwF-L9IrqhGD9NComt9cNWl7qc8uLAw1kirS2Fe9EvV0quRBpjzTNia2M2EUoif6AzQKc-xk6_0';

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLEINT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });



// handle errors
const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { email: '', password: '' };

  // incorrect email
  if (err.message === 'incorrect email') {
    errors.email = 'That email is not registered';
  }

  // incorrect password
  if (err.message === 'incorrect password') {
    errors.password = 'That password is incorrect';
  }

  // duplicate email error
  if (err.code === 11000) {
    errors.email = 'that email is already registered';
    return errors;
  }

  // validation errors
  if (err.message.includes('user validation failed')) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
}

// create json web token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, 'net ninja secret', {
    expiresIn: maxAge
  });
};

// controller actions
module.exports.signup_get = (req, res) => {
  res.render('signup');
}

module.exports.login_get = (req, res) => {
  res.render('login');
}

module.exports.forgetPassword_get = (req, res, next) => {
  res.render('forgetPassword');
}

module.exports.signup_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.create({ email, password });
    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ user: user._id });
  }
  catch(err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
 
}

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json({ user: user._id });
  } 
  catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }

}

module.exports.forgetPassword_post = async (req, res, next) => {
  const { email } = req.body;

  //Make sure user exist in Database
  User.findOne({ email: email }, function (error, userData) {
    if(userData==null)
    {
        return res.status(404).json({
            success: false,
            msg: "Email is not register",
        });
    }

  const secret = userData.password + 'net ninja secret'
  const payload = {
    email: userData.email,
    id: userData.id
  }
  const token = jwt.sign(payload, secret, {expiresIn: '15m'})
  const accessToken = oAuth2Client.getAccessToken();

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: 'ritikachauhannn123@gmail.com',
      clientId: CLIENT_ID,
      clientSecret: CLEINT_SECRET,
      refreshToken: REFRESH_TOKEN,
      accessToken: accessToken,
    },
  });

  const mailOptions = {
    from: 'Noreply <ritikachauhannn123@gmail.com>',
    to: req.body.email,
    subject: 'Reset Password',
    text: 'Forget your password?',
    html: `<h1>Welcome To Kriova Infotech!</h1><p>\
          <h3>Hello</h3>\
          If You are requested to reset your password then click on below link<br/>\
          <a href='http://localhost:3000/resetPassword/${userData.id}/${token}' >Click On This Link</a>\
          </p>`,
    
  };
  transport.sendMail(mailOptions, function (error, info) {
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
  });
  res.render('sendLink');
})
},

module.exports.resetPassword_get = (req, res, next) => {
  const { id, token } = req.params;
  
  //check if this id exist in database
  User.findOne({ id: id }, function (error, userData) {
    if(userData==null)
    {
        return res.status(404).json({
            success: false,
            msg: "Invalid id.....",
        });
    }
    //We have a valid id, and we have a valid user with this id
    const secret =  userData.password + 'net ninja secret'
    try{
      const payload = jwt.verify(token, secret);
      res.render('resetPassword', { email: userData.email});
    }catch(error){
      console.log(error.message);
      res.send(error.message);
    }
  })
}

module.exports.resetPassword_post = async (req, res, next) => {
  const { id, token } = req.params;
  const { password, password2} = req.body;
  const updates = { 'password' : password };
  const options = {new: true};

  //check if this id exist in database
  User.findOne({ id: id }, async function (error, userData) {
    if(userData==null)
    {
        return res.status(404).json({
            success: false,
            msg: "Invalid id.....",
        });
    }

    const secret = userData.password + 'net ninja secret'
    try{
      const payload = jwt.verify(token, secret);
      //validate password and password2 should match
      const errors = validationResult(req)
      if(!errors.isEmpty()) {
          return res.status(422).jsonp(errors.array())
      }
      else{
        const result = await User.findOneAndUpdate( { id: payload.id }, updates, options);
        res.render('reset');
      }

    } catch(error){
      console.log(error.message + ' this is error catch');
      res.send(error.message);
    }
  })
}


module.exports.logout_get = (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}