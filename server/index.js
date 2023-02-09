require('./rollbar')

const compress = require('compression')
const express = require('express')
const http = require('http')
const pug = require('pug')
const path = require('path')
const config = require('../config')
// const { Session } = require('inspector')

var env = require('dotenv').config()
var ejs = require('ejs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);


mongoose.connect('mongodb://localhost:27017/nodeuser', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err) => {
    if (!err) {
        console.log('Mongo DB Connection Succeeded.')
    } else {
        console.log('Error in DB Connection' + err)
    }
})
var db = mongoose.connection
db.on('error' , console.error.bind(console, 'connection error'))
db.once('open', function() {})

const PORT = Number(process.argv[2]) || 4000

const app = express()
const server = http.createServer(app)

// Trust "X-Forwarded-For" and "X-Forwarded-Proto" nginx headers
app.enable('trust proxy')

// Disable "powered by express" header
app.set('x-powered-by', false)

// Use pug for templates
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')
// app.set('view engine', 'pug')
// app.engine('pug', pug.renderFile)

// Pretty print JSON
app.set('json spaces', 2)

// Use GZIP
app.use(compress())

app.use(session({
    secret: 'work hard',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db
    })
}));

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ etended: false }))

app.use(function (req, res, next) {
  // Force SSL
  if (config.isProd && req.protocol !== 'https') {
    return res.redirect('https://' + (req.hostname || 'instant.io') + req.url)
  }

  // Redirect www to non-www
  if (config.isProd && req.hostname === 'www.instant.io') {
    return res.redirect('https://instant.io' + req.url)
  }

  // Use HTTP Strict Transport Security
  // Lasts 1 year, incl. subdomains, allow browser preload list
  if (config.isProd) {
    res.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Add cross-domain header for fonts, required by spec, Firefox, and IE.
  const extname = path.extname(req.url)
  if (['.eot', '.ttf', '.otf', '.woff', '.woff2'].indexOf(extname) >= 0) {
    res.header('Access-Control-Allow-Origin', '*')
  }

  // Prevents IE and Chrome from MIME-sniffing a response. Reduces exposure to
  // drive-by download attacks on sites serving user uploaded content.
  res.header('X-Content-Type-Options', 'nosniff')

  // Prevent rendering of site within a frame.
  res.header('X-Frame-Options', 'DENY')

  // Enable the XSS filter built into most recent web browsers. It's usually
  // enabled by default anyway, so role of this headers is to re-enable for this
  // particular website if it was disabled by the user.
  res.header('X-XSS-Protection', '1; mode=block')

  // Force IE to use latest rendering engine or Chrome Frame
  res.header('X-UA-Compatible', 'IE=Edge,chrome=1')

  next()
})

app.use(express.static(path.join(__dirname, '../static')))

var index = require('../routes/index')
app.use('/', index)

// app.get('/500', (req, res, next) => {
//   next(new Error('Manually visited /500'))
// })

if (global.rollbar) app.use(global.rollbar.errorHandler())

// error handling middleware
app.use(function (err, req, res, next) {
  console.error(err.stack)
  const code = typeof err.code === 'number' ? err.code : 500
  res.status(code).render('error', {
    title: '500 Internal Server Error - Instant.io',
    message: err.message || err
  })
})

server.listen(PORT, '127.0.0.1', function () {
  console.log('listening on port %s', server.address().port)
})
