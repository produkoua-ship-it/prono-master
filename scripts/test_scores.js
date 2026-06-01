require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { requireEnv } = require('./envHelper');
const ODDS_API_KEY = requireEnv('ODDS_API_KEY');

async function main() {
  try {
    const res = await axios.get(`https://api.the-odds-api.com/v4/sports/soccer_brazil_campeonato/scores/?daysFrom=3&apiKey=${ODDS_API_KEY}`);
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
}
main();
