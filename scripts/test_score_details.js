require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { requireEnv } = require('./envHelper');
const ODDS_API_KEY = requireEnv('ODDS_API_KEY');

async function main() {
  const res = await axios.get(`https://api.the-odds-api.com/v4/sports/soccer_brazil_serie_b/scores/?daysFrom=3&apiKey=${ODDS_API_KEY}`);
  const match = res.data.find(m => m.id === '8d82fd202f46ac383453784935982106');
  if(match) console.log(match.scores);
  else console.log("Not found");
}
main();
