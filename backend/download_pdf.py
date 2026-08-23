import urllib.request

url = "https://backend-beta-green-44.vercel.app/api/cotizacion/1/pdf"
try:
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer test'})
    with urllib.request.urlopen(req) as response:
        with open("test_prod.pdf", "wb") as f:
            f.write(response.read())
        print("Downloaded prod PDF")
except Exception as e:
    print(f"Failed to download: {e}")
