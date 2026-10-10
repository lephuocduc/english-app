async function test() {
  const videoId = 'UF8uR6Z6KLc';
  const pageRes = await fetch('https://www.youtube.com/watch?v=' + videoId, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const html = await pageRes.text();
  
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;

  // Extract INNERTUBE_CONTEXT cleanly
  const ctxIdx = html.indexOf('"INNERTUBE_CONTEXT":');
  let context = null;
  if (ctxIdx !== -1) {
    const start = ctxIdx + '"INNERTUBE_CONTEXT":'.length;
    let depth = 0;
    let end = start;
    for (let i = start; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    try {
      context = JSON.parse(html.slice(start, end));
    } catch (e) {
      console.error('Failed to parse context:', e);
    }
  }

  const transcriptParamsMatch = html.match(/"getTranscriptEndpoint":\{"params":"([^"]+)"/);
  const transcriptParams = transcriptParamsMatch ? transcriptParamsMatch[1] : null;

  console.log('apiKey:', apiKey ? 'Found' : 'Not found');
  console.log('context parsed:', Boolean(context), 'clientName:', context?.client?.clientName);
  console.log('transcriptParams:', transcriptParams ? 'Found' : 'Not found');

  if (apiKey && transcriptParams && context) {
    const postRes = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        context,
        params: transcriptParams
      })
    });
    console.log('Innertube response status:', postRes.status);
    const data = await postRes.json();
    if (data.error) {
      console.log('Data error:', JSON.stringify(data.error));
    } else {
      console.log('SUCCESS! Parsing segments...');
      const actions = data?.actions || [];
      const cues = actions[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;
      console.log('InitialSegments count:', cues?.length);
      if (cues && cues.length > 0) {
        const parsed = cues.map((c, i) => {
          const seg = c.transcriptSegmentRenderer;
          const startMs = parseInt(seg.startMs, 10);
          const endMs = parseInt(seg.endMs, 10);
          const text = seg.snippet?.runs?.map(r => r.text).join('').trim() || '';
          return {
            id: `seg-${i + 1}`,
            startTime: startMs / 1000,
            endTime: endMs / 1000,
            text
          };
        }).filter(s => s.text);
        console.log('First 5 parsed segments:');
        console.log(parsed.slice(0, 5));
      }
    }
  }
}

test();
