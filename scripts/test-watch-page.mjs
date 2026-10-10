async function test() {
  const resp = await fetch('https://www.youtube.com/watch?v=UF8uR6Z6KLc', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  console.log('watch page status:', resp.status);
  const html = await resp.text();
  console.log('html length:', html.length);
  const match = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (match) {
    const tracks = JSON.parse(match[1]);
    console.log('found captionTracks count:', tracks.length);
    const en = tracks.find(t => t.languageCode === 'en') || tracks[0];
    console.log('Selected track baseUrl:', en.baseUrl);
    const capResp = await fetch(en.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/watch?v=UF8uR6Z6KLc'
      }
    });
    console.log('capResp status:', capResp.status);
    if (capResp.ok) {
      const xml = await capResp.text();
      console.log('xml snippet:', xml.slice(0, 300));
    }
  } else {
    console.log('captionTracks not found in watch page HTML');
  }
}
test();
