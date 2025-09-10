const Pusher = require('pusher');
const dotenv = require('dotenv');

dotenv.config({ path: './.env', quiet: true });

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY, // Note: Use APP_KEY here, not just KEY
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

module.exports = pusher;