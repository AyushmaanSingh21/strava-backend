const { getModel, ROAST_SYSTEM_PROMPT } = require('../config/gemini');
const axios = require('axios');
const stravaConfig = require('../config/strava');

// Generate roast based on Strava data
async function generateRoast(req, res) {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Fetch athlete profile
    const profileResponse = await axios.get(
      `${stravaConfig.apiBaseUrl}/athlete`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const profile = profileResponse.data;

    // Fetch athlete stats
    const statsResponse = await axios.get(
      `${stravaConfig.apiBaseUrl}/athletes/${profile.id}/stats`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const stats = statsResponse.data;

    // Fetch recent activities (last 100)
    const activitiesResponse = await axios.get(
      `${stravaConfig.apiBaseUrl}/athlete/activities`,
      { headers: { Authorization: `Bearer ${accessToken}` }, params: { per_page: 100 } }
    );
    const activities = activitiesResponse.data;

    // Analyze data
    const analysis = analyzeRunningData(activities, stats, profile);

    // Generate roast with Gemini
    const model = getModel();
    const prompt = `${ROAST_SYSTEM_PROMPT}

USER DATA TO ROAST:

Name: ${profile.firstname}
${JSON.stringify(analysis, null, 2)}

Generate a funny, witty roast based on this data. Remember: be honest but not mean, funny but constructive.`;

    console.log('[ROAST] Generating roast with Gemini...');
    const result = await model.generateContent(prompt);
    console.log('[ROAST] Gemini response:', result);
    const roastText = result.response.text();
    console.log('[ROAST] Roast text:', roastText);

    res.json({
      success: true,
      roast: roastText,
      stats: analysis,
      athlete: {
        name: `${profile.firstname} ${profile.lastname}`,
        photo: profile.profile_medium || profile.profile,
        location: [profile.city, profile.state].filter(Boolean).join(', '),
      },
    });
  } catch (error) {
    console.error('[ROAST] Error generating roast:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate roast', message: error.message });
  }
}

// Analyze running data for roasting
function analyzeRunningData(activities, stats, profile) {
  const runs = (activities || []).filter((a) => a.type === 'Run');
  if (runs.length === 0) {
    return { totalActivities: 0, message: 'No running data found. Go run first!' };
  }

  const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0) / 1000; // km
  const totalTime = runs.reduce((sum, r) => sum + r.moving_time, 0) / 3600; // hours
  const avgDistance = totalDistance / runs.length;

  // Pace analysis
  const paces = runs
    .map((r) => {
      const min = r.moving_time / 60;
      const km = r.distance / 1000;
      return km > 0 ? min / km : null;
    })
    .filter((p) => typeof p === 'number' && p > 0 && p < 20);

  const avgPace = paces.reduce((s, p) => s + p, 0) / paces.length;
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const paceVariance = maxPace - minPace;

  // Distance analysis
  const distances = runs.map((r) => r.distance / 1000);
  const longestRun = Math.max(...distances);
  const shortestRun = Math.min(...distances);
  const shortRuns = runs.filter((r) => r.distance / 1000 < 5).length;
  const mediumRuns = runs.filter((r) => r.distance / 1000 >= 5 && r.distance / 1000 < 10).length;
  const longRuns = runs.filter((r) => r.distance / 1000 >= 10).length;

  // Frequency analysis
  const now = new Date();
  const lastWeekRuns = runs.filter((r) => (now.getTime() - new Date(r.start_date_local).getTime()) / 86400000 <= 7).length;
  const lastMonthRuns = runs.filter((r) => (now.getTime() - new Date(r.start_date_local).getTime()) / 86400000 <= 30).length;

  // Time of day analysis
  const morningRuns = runs.filter((r) => {
    const hour = new Date(r.start_date_local).getHours();
    return hour >= 5 && hour < 12;
  }).length;
  const eveningRuns = runs.filter((r) => {
    const hour = new Date(r.start_date_local).getHours();
    return hour >= 17 && hour < 22;
  }).length;

  // Elevation
  const totalElevation = runs.reduce((sum, r) => sum + (r.total_elevation_gain || 0), 0);
  const avgElevation = totalElevation / runs.length;
  const flatRuns = runs.filter((r) => (r.total_elevation_gain || 0) < 50).length;

  const consistencyScore = calculateConsistencyScore(runs);

  return {
    totalActivities: runs.length,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalTime: Math.round(totalTime * 10) / 10,
    avgDistance: Math.round(avgDistance * 10) / 10,
    avgPace: formatPace(avgPace),
    fastestPace: formatPace(minPace),
    slowestPace: formatPace(maxPace),
    paceVariance: Math.round(paceVariance * 10) / 10,
    longestRun: Math.round(longestRun * 10) / 10,
    shortestRun: Math.round(shortestRun * 10) / 10,
    shortRuns,
    mediumRuns,
    longRuns,
    lastWeekRuns,
    lastMonthRuns,
    morningRuns,
    eveningRuns,
    totalElevation: Math.round(totalElevation),
    avgElevation: Math.round(avgElevation),
    flatRuns,
    consistencyScore,
    insights: generateInsights(runs, avgDistance, paceVariance, consistencyScore),
  };
}

function calculateConsistencyScore(runs) {
  if (runs.length < 5) return 3;
  const dates = runs.map((r) => new Date(r.start_date_local)).sort((a, b) => a.getTime() - b.getTime());
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / 86400000);
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const variance = Math.sqrt(gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length);
  let score = 10 - Math.min(variance / 2, 7);
  return Math.round(Math.max(1, Math.min(10, score)));
}

function generateInsights(runs, avgDistance, paceVariance, consistencyScore) {
  const insights = [];
  if (avgDistance < 5) insights.push('Prefers short runs');
  if (avgDistance > 15) insights.push('Distance enthusiast');
  if (paceVariance > 2) insights.push('Inconsistent pacing');
  if (consistencyScore < 5) insights.push('Sporadic training schedule');
  if (consistencyScore > 8) insights.push('Very consistent runner');
  return insights;
}

function formatPace(pace) {
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Chat with AI about running
async function chatWithAI(req, res) {
  try {
    const { message, conversationHistory, userData } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const model = getModel();
    const prompt = `You are a knowledgeable and friendly running coach AI. You're chatting with a runner about their training.

USER'S RUNNING DATA:
${JSON.stringify(userData, null, 2)}

CONVERSATION HISTORY:
${(conversationHistory || []).map((m) => `${m.role}: ${m.content}`).join('\n')}

USER'S CURRENT MESSAGE: ${message}

Respond helpfully, providing specific advice based on their data. Be encouraging but honest. Keep responses concise (2-3 paragraphs max). Use their actual stats when relevant.`;
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    res.json({ success: true, response });
  } catch (error) {
    console.error('[CHAT] Error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to process chat', message: error.message });
  }
}

module.exports = { generateRoast, chatWithAI };


