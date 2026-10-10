async function fetchYouTubeTranscript(videoId, lang = 'en') {
  const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)'
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '20.10.38'
        }
      },
      videoId
    })
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(captionTracks) || captionTracks.length === 0) return null;

  const track = captionTracks.find(t => t.languageCode === lang || t.languageCode.startsWith(lang)) || captionTracks[0];
  console.log('Selected track:', track?.name, track?.languageCode, 'baseUrl:', track?.baseUrl);
  const capResp = await fetch(track.baseUrl);
  const xml = await capResp.text();
  console.log('capResp status:', capResp.status, 'xml length:', xml.length);
  const bodyIdx = xml.indexOf('<body>');
  console.log('Body snippet:', xml.slice(bodyIdx, bodyIdx + 600));

  // Match <p t="(\d+)" d="(\d+)"[^>]*>(.*?)</p>
  const pRegex = /<p t="(\d+)"(?: d="(\d+)")?[^>]*>(.*?)<\/p>/gs;
  const segments = [];
  let pMatch;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(pMatch[1], 10);
    const durMs = pMatch[2] ? parseInt(pMatch[2], 10) : 3000;
    // Strip XML tags like <s>...</s>
    let rawText = pMatch[3]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    if (rawText && !rawText.startsWith('[') && rawText.length > 1) {
      const startTime = Math.round((startMs / 1000) * 10) / 10;
      const endTime = Math.round(((startMs + durMs) / 1000) * 10) / 10;
      segments.push({
        id: `seg-${segments.length + 1}`,
        startTime,
        endTime: endTime > startTime ? endTime : startTime + 3.0,
        text: rawText
      });
    }
  }

  return segments;
}

fetchYouTubeTranscript('UF8uR6Z6KLc').then(res => {
  console.log('Total extracted sentences:', res?.length);
  console.log('First 6 extracted sentences:');
  console.log(res?.slice(0, 6));
});
