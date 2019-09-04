/* eslint-disable import/no-unresolved */
const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const path = require('path');
const request = require('request');
const pg = require('pg');
const PgSession = require('connect-pg-simple')(session);

require('dotenv').config();

let { log, warn } = console;

if (process.env.IS_SERVICE) {
  // eslint-disable-next-line global-require
  const { EventLogger } = require('node-windows');
  const el = new EventLogger(process.env.SERVICE_NAME);

  log = el.log;
  warn = el.warn;
}

const isDev = process.env.DEV;

const { Client } = pg;

const client = new Client();

const app = express();

const sonarUrl = process.env.SONAR_URL;
const pgQuery = 'select u.name, gu.group_id from users as u LEFT JOIN groups_users as gu on (u.id = gu.user_id AND gu.group_id = 3) WHERE u.login LIKE $1::text';

client.connect();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Session options
const sessionOption = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
};

if (!isDev) {
  sessionOption.store = new PgSession({
    tableName: 'webserver_sessions', // Use another table-name than the default "session" one
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(sessionOption));

function checkSignIn(req, res, next) {
  if (req.session.user) {
    next(); // If session exists, proceed to page
  } else {
    res.redirect('/login');
  }
}

app.get('/', checkSignIn, (req, res) => {
  res.render('index', { user: req.session.user, sonar: process.env.SONAR_PUBLIC_URL });
});

app.get('/login', (_, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  if (!req.body.id || !req.body.password) {
    res.render('login', { message: 'Please enter both id and password' });
  } else {
    request.post({ url: `${sonarUrl}/api/authentication/login`, form: { login: req.body.id, password: req.body.password } }, async (error, response) => {
      // eslint-disable-next-line eqeqeq
      if (!error && response.statusCode == 200) {
        const user = { id: req.body.id };


        const queryResponse = await client.query(pgQuery, [req.body.id]);
        const queryUser = queryResponse.rows[0];
        user.name = queryUser.name;
        if (queryUser.group_id !== null) {
          user.dev = true;
        }

        req.session.user = user;
        warn(`login ${user.id}`);
        res.redirect('/');
      } else {
        res.render('login', { message: 'Invalid credentials!' });
        warn(`Invalid credentials!: ${req.body.id} ${req.body.password}`);
      }
    });
  }
});

app.get('/logout', (req, res) => {
  const { user } = req.session;
  req.session.destroy(() => {
    log(`${user} logged out.`);
  });
  res.redirect('/login');
});

app.use('/coverage', checkSignIn, express.static('static/coverage'));
app.use('/docs', checkSignIn, express.static('static/docs'));
app.use('/story', checkSignIn, express.static('static/story'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  warn(`404 not found ${req.urlencoded}`);
  next(createError(404));
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  err(`500 error: ${err.message}`);
  res.render('error');
});

module.exports = app;
