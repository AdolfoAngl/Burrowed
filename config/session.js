import session from 'express-session';

export default session({
  secret: 'labapp_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 } // 2 horas
});
