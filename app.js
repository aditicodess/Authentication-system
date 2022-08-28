const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');
const { requireAuth, checkUser } = require('./middleware/authMiddleware');

const app = express();
const port = process.env.PORT || 3000
// middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(cookieParser());

// view engine
app.set('view engine', 'ejs');

// database connection
const dbURI = 'mongodb+srv://RitikaSingh:RitikaSingh@nodejs.ftyz5s9.mongodb.net/node-auth';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => app.listen(port))
  .catch((err) => console.log(err));

// routes
app.get('/main', checkUser);
app.get('/', (req, res) => res.render('home'));
app.get('/main', requireAuth, (req, res) => res.render('main'));
app.use(authRoutes);
