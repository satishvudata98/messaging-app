const getConfig = (req, res) => {
  const publicDomain = process.env.PUBLIC_DOMAIN || null;
  const apiUrl = publicDomain ? `https://${publicDomain}/api` : null;
  const wsUrl = publicDomain ? `https://${publicDomain}` : null;

  const turnUrl = process.env.TURN_SERVER_URL || null;
  const turnUsername = process.env.TURN_USERNAME || null;
  const turnPassword = process.env.TURN_PASSWORD || null;

  const turnServers = turnUrl
    ? [
        {
          urls: [turnUrl],
          username: turnUsername,
          credential: turnPassword,
        },
      ]
    : [];

  res.json({ publicDomain, apiUrl, wsUrl, turnServers });
};

module.exports = { getConfig };
