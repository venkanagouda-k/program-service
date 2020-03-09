const createError = require('http-errors')
  express = require('express')
  path = require('path')
  http = require('http')
  indexRouter = require('./routes/index')
  programsRouter = require('./routes/programRoutes')
  cookieParser = require('cookie-parser'),
  logger = require('morgan'),
  bodyParser = require('body-parser'),
  envVariables = require('./envVariables'),
  port = envVariables.port;

  const createAppServer = () => {
    const app = express();

    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization,' + 'cid, user-id, x-auth, Cache-Control, X-Requested-With, datatype, *')
      if (req.method === 'OPTIONS') res.sendStatus(200)
      else next()
    })
    app.use(bodyParser.json({ limit: '1mb' }));
    app.use(logger('dev'));
    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    require('./routes/programRoutes')(app)
    app.use(cookieParser());
    module.exports = app;
    return app;
  }

const app = createAppServer();
app.listen(port, () => console.log(`program-service is running in test env on port ${port} with ${process.pid} pid`));
