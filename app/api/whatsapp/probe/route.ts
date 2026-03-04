export async function GET() {
  const tests = [
    'https://app.sendapp.cloud/api/send-message?number=test&type=text&message=test&instance_id=test&access_token=test',
    'https://app.sendapp.cloud/api/v1/send-message?number=test&type=text&message=test&instance_id=test&access_token=test',
    'https://app.sendapp.cloud/send-message?number=test&type=text&message=test&instance_id=test&access_token=test',
  ]
  const results = await Promise.all(tests.map(async url => {
    try {
      const res = await fetch(url)
      const ct = res.headers.get('content-type') || ''
      const body = await res.text()
      return { url, status: res.status, contentType: ct, bodyPreview: body.substring(0, 100) }
    } catch (err: any) {
      return { url, status: 0, contentType: '', bodyPreview: `ERROR: ${err?.message}` }
    }
  }))
  return Response.json(results)
}
