const crypto = require('crypto');

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_TOKEN_AUTH_KEY = process.env.BUNNY_TOKEN_AUTH_KEY;
const BUNNY_API_BASE = 'https://video.bunnycdn.com/library';

const headers = {
  'Content-Type': 'application/json',
  'AccessKey': BUNNY_API_KEY,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const action = event.queryStringParameters?.action;

  try {
    switch (action) {
      case 'create':
        return await createVideo(event);
      case 'status':
        return await getVideoStatus(event);
      case 'delete':
        return await deleteVideo(event);
      case 'embed-token':
        return await getEmbedToken(event);
      default:
        return respond(400, { error: 'Invalid action. Use: create, status, delete, embed-token' });
    }
  } catch (err) {
    console.error('Bunny video error:', err);
    return respond(500, { error: 'Internal server error' });
  }
};

async function createVideo(event) {
  const body = JSON.parse(event.body || '{}');
  const title = body.title || 'Untitled Video';

  // Create a video object in Bunny library
  const res = await fetch(`${BUNNY_API_BASE}/${BUNNY_LIBRARY_ID}/videos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Bunny create error:', errorText);
    return respond(res.status, { error: 'Failed to create video in Bunny' });
  }

  const video = await res.json();

  // Generate TUS auth signature for direct upload
  const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const signatureString = `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expirationTime}${video.guid}`;
  const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

  return respond(200, {
    videoId: video.guid,
    libraryId: BUNNY_LIBRARY_ID,
    tusConfig: {
      uploadUrl: `https://video.bunnycdn.com/tusupload`,
      expirationTime,
      signature,
      videoId: video.guid,
      libraryId: BUNNY_LIBRARY_ID,
    },
  });
}

async function getVideoStatus(event) {
  const videoId = event.queryStringParameters?.videoId;
  if (!videoId) {
    return respond(400, { error: 'videoId is required' });
  }

  const res = await fetch(`${BUNNY_API_BASE}/${BUNNY_LIBRARY_ID}/videos/${videoId}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    return respond(res.status, { error: 'Failed to get video status' });
  }

  const video = await res.json();

  // Bunny status codes: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
  let status = 'processing';
  if (video.status === 4) status = 'ready';
  else if (video.status === 5) status = 'error';
  else if (video.status >= 1 && video.status <= 3) status = 'processing';

  return respond(200, {
    videoId: video.guid,
    status,
    bunnyStatus: video.status,
    title: video.title,
    length: video.length,
    width: video.width,
    height: video.height,
  });
}

async function deleteVideo(event) {
  const videoId = event.queryStringParameters?.videoId;
  if (!videoId) {
    return respond(400, { error: 'videoId is required' });
  }

  const res = await fetch(`${BUNNY_API_BASE}/${BUNNY_LIBRARY_ID}/videos/${videoId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Bunny delete error:', errorText);
    return respond(res.status, { error: 'Failed to delete video' });
  }

  return respond(200, { success: true });
}

async function getEmbedToken(event) {
  const videoId = event.queryStringParameters?.videoId;
  if (!videoId) {
    return respond(400, { error: 'videoId is required' });
  }

  // Generate a signed token for the embed URL
  // Token expires in 1 hour
  const expiresTimestamp = Math.floor(Date.now() / 1000) + 3600;
  const tokenString = `${BUNNY_TOKEN_AUTH_KEY}${videoId}${expiresTimestamp}`;
  const token = crypto.createHash('sha256').update(tokenString).digest('hex');

  const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?token=${token}&expires=${expiresTimestamp}`;

  return respond(200, { embedUrl });
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
