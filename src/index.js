const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const connectToDatabase = require('./middleware/connect-db');

dotenv.config({ path: './.env', quiet: true });
const env = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

const app = express();

app.use(compression());
if (env === 'development') {
  app.use(morgan('dev'));
}
app.use(cors());
app.use(express.json());
app.use(connectToDatabase);

const v1Routes = require('./routes/v1');

app.use('/api/v1', v1Routes);
app.get('/', (req, res) => {
  res.send('Ridemate API is running...');
});
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

app.listen(PORT, console.info(`Server running in ${env} mode on port ${PORT}`));

module.exports = app;
